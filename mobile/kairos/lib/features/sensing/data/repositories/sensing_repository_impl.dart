import 'dart:async';
import 'dart:math' as math;

import 'package:fpdart/fpdart.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../../../core/error/error_mapper.dart';
import '../../../../core/error/failure.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/math/running_stats.dart';
import '../../../../core/math/signal_features.dart';
import '../../../../core/result/typedefs.dart';
import '../../../../core/time/clock.dart';
import '../../domain/entities/feature_window.dart';
import '../../domain/repositories/sensing_repository.dart';
import '../datasources/device_state_data_source.dart';
import '../datasources/motion_data_source.dart';

/// Implementacja pozyskiwania sygnału na pierwszym planie.
///
/// Odpowiada za: subskrypcje czujników, akumulację cech, zamykanie okien co
/// [windowLength] oraz publikowanie migawek dla UI. Praca w tle (Android) używa
/// tej samej klasy w izolacie usługi — patrz `background_sensing_service.dart`.
class SensingRepositoryImpl implements SensingRepository {
  SensingRepositoryImpl({
    MotionDataSource? motion,
    DeviceStateDataSource? device,
    Clock clock = const SystemClock(),
    this.windowLength = const Duration(seconds: 30),
    this.liveInterval = const Duration(milliseconds: 500),
  }) : _motion = motion ?? const MotionDataSource(),
       _device = device ?? DeviceStateDataSource(),
       _clock = clock;

  final MotionDataSource _motion;
  final DeviceStateDataSource _device;
  final Clock _clock;

  /// Długość okna obserwacji. 30 s to kompromis: krócej → szum, dłużej →
  /// interwencja spóźnia się względem momentu dryfu.
  final Duration windowLength;

  /// Jak często odświeżamy podgląd na żywo (tylko UI, nic nie zapisujemy).
  final Duration liveInterval;

  static const AppLogger _log = AppLogger('sensing');

  final FeatureAccumulator _accumulator = FeatureAccumulator();
  final ExponentialSmoother _energySmoother = ExponentialSmoother(alpha: 0.25);
  final ExponentialSmoother _rotationSmoother = ExponentialSmoother(alpha: 0.25);

  final StreamController<FeatureWindow> _windows =
      StreamController<FeatureWindow>.broadcast();
  final StreamController<LiveSignal> _liveSignals =
      StreamController<LiveSignal>.broadcast();

  StreamSubscription<UserAccelerometerEvent>? _accelerationSubscription;
  StreamSubscription<GyroscopeEvent>? _rotationSubscription;
  StreamSubscription<AccelerometerEvent>? _orientationSubscription;
  StreamSubscription<bool>? _chargingSubscription;
  StreamSubscription<int>? _stepsSubscription;

  Timer? _windowTimer;
  Timer? _liveTimer;

  DateTime? _windowStart;
  bool _running = false;
  bool _disposed = false;

  int _liveSamples = 0;
  int _liveMicro = 0;
  int _liveStill = 0;
  int _liveSwitches = 0;
  int _stepsAtWindowStart = 0;
  int _stepsLatest = 0;
  bool _charging = false;
  LiveSignal? _lastSignal;

  @override
  Stream<FeatureWindow> get windows => _windows.stream;

  @override
  Stream<LiveSignal> get live => _liveSignals.stream;

  @override
  bool get isRunning => _running;

  @override
  LiveSignal? get lastSignal => _lastSignal;

  @override
  FutureUnit start() {
    return guard<Unit>(() async {
      if (_disposed) {
        throw StateError('Repozytorium zostało już zwolnione');
      }
      if (_running) {
        return unit;
      }

      _windowStart = _clock.now();
      _charging = await _device.isCharging();
      _accumulator.setCharging(charging: _charging);

      _accelerationSubscription = _motion.userAcceleration().listen(
        (UserAccelerometerEvent event) {
          final DateTime now = _clock.now();
          _accumulator.addUserAcceleration(event.x, event.y, event.z, now);
          _trackLiveSample(event.x, event.y, event.z);
        },
        onError: _onSensorError,
        cancelOnError: false,
      );

      _rotationSubscription = _motion.rotation().listen(
        (GyroscopeEvent event) {
          _accumulator.addRotation(event.x, event.y, event.z);
          _rotationSmoother.add(
            _magnitude(event.x, event.y, event.z).clamp(0.0, 4.0) / 4,
          );
        },
        onError: _onSensorError,
        cancelOnError: false,
      );

      _orientationSubscription = _motion.orientation().listen(
        (AccelerometerEvent event) =>
            _accumulator.addOrientation(event.x, event.y, event.z),
        onError: _onSensorError,
        cancelOnError: false,
      );

      _chargingSubscription = _device.chargingChanges().listen((bool charging) {
        _charging = charging;
        _accumulator.setCharging(charging: charging);
      });

      _stepsSubscription = _device.stepCount().listen((int steps) {
        if (_stepsAtWindowStart == 0) {
          _stepsAtWindowStart = steps;
        }
        _stepsLatest = steps;
        _accumulator.setStepCounter(steps);
      });

      _windowTimer = Timer.periodic(windowLength, (_) => _closeWindow());
      _liveTimer = Timer.periodic(liveInterval, (_) => _emitLiveSignal());

      _running = true;
      _log.info('Nasłuch czujników uruchomiony (okno: ${windowLength.inSeconds}s)');
      return unit;
    }, context: 'sensing.start');
  }

  @override
  FutureUnit stop() {
    return guard<Unit>(() async {
      if (!_running) {
        return unit;
      }

      await _cancelSubscriptions();
      _windowTimer?.cancel();
      _liveTimer?.cancel();
      _windowTimer = null;
      _liveTimer = null;

      _accumulator.resetAll();
      _energySmoother.reset();
      _rotationSmoother.reset();
      _resetLiveCounters();
      _windowStart = null;
      _running = false;

      _log.info('Nasłuch czujników zatrzymany');
      return unit;
    }, context: 'sensing.stop');
  }

  @override
  void noteForegroundSwitch() {
    if (!_running) {
      return;
    }
    _accumulator.noteForegroundSwitch();
    _liveSwitches++;
  }

  @override
  void setSessionLoad(double value) => _accumulator.setSessionLoad(value);

  @override
  Future<void> dispose() async {
    if (_disposed) {
      return;
    }
    _disposed = true;
    await stop();
    await _windows.close();
    await _liveSignals.close();
  }

  // ── Wewnętrzne ───────────────────────────────────────────────────────────

  void _closeWindow() {
    final DateTime? start = _windowStart;
    if (start == null || _windows.isClosed) {
      return;
    }

    final DateTime end = _clock.now();
    final FeatureWindow window = FeatureWindow(
      start: start,
      end: end,
      sampleCount: _accumulator.sampleCount,
      features: _accumulator.build(windowStart: start, windowEnd: end),
    );

    _windows.add(window);
    _log.debug('Zamknięto okno: ${window.sampleCount} próbek');

    _accumulator.resetWindow();
    _resetLiveCounters();
    _windowStart = end;
  }

  void _emitLiveSignal() {
    if (_liveSignals.isClosed) {
      return;
    }
    final LiveSignal signal = LiveSignal(
      at: _clock.now(),
      motionEnergy: _energySmoother.value.clamp(0.0, 1.0),
      microMovement: _liveSamples == 0 ? 0 : _liveMicro / _liveSamples,
      stillness: _liveSamples == 0 ? 0 : _liveStill / _liveSamples,
      rotation: _rotationSmoother.value.clamp(0.0, 1.0),
      sampleCount: _liveSamples,
      foregroundSwitches: _liveSwitches,
      isCharging: _charging,
      stepsInWindow: (_stepsLatest - _stepsAtWindowStart).clamp(0, 1 << 20),
    );
    _lastSignal = signal;
    _liveSignals.add(signal);
  }

  void _trackLiveSample(double x, double y, double z) {
    final double magnitude = _magnitude(x, y, z);
    _liveSamples++;
    if (magnitude < _accumulator.stillnessThreshold) {
      _liveStill++;
    } else if (magnitude < _accumulator.microUpperBound) {
      _liveMicro++;
    }
    _energySmoother.add((magnitude / 1.5).clamp(0.0, 1.0));
  }

  void _resetLiveCounters() {
    _liveSamples = 0;
    _liveMicro = 0;
    _liveStill = 0;
    _liveSwitches = 0;
    _stepsAtWindowStart = _stepsLatest;
  }

  void _onSensorError(Object error, StackTrace stackTrace) {
    _log.error('Błąd czujnika', error, stackTrace);
    if (!_windows.isClosed) {
      _windows.addError(
        SensorFailure(
          message: 'Czujnik ruchu przestał odpowiadać. Uruchom nasłuch ponownie.',
          cause: error,
          stackTrace: stackTrace,
        ),
      );
    }
  }

  Future<void> _cancelSubscriptions() async {
    await Future.wait<void>(<Future<void>>[
      if (_accelerationSubscription != null) _accelerationSubscription!.cancel(),
      if (_rotationSubscription != null) _rotationSubscription!.cancel(),
      if (_orientationSubscription != null) _orientationSubscription!.cancel(),
      if (_chargingSubscription != null) _chargingSubscription!.cancel(),
      if (_stepsSubscription != null) _stepsSubscription!.cancel(),
    ]);
    _accelerationSubscription = null;
    _rotationSubscription = null;
    _orientationSubscription = null;
    _chargingSubscription = null;
    _stepsSubscription = null;
  }

  static double _magnitude(double x, double y, double z) =>
      math.sqrt(x * x + y * y + z * z);
}
