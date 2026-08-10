import 'dart:async';

import 'package:fpdart/fpdart.dart';

import '../../../../core/error/error_mapper.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/math/logistic_regression.dart';
import '../../../../core/math/signal_features.dart';
import '../../../../core/result/typedefs.dart';
import '../../../../core/time/clock.dart';
import '../../../../data/database/daos/model_dao.dart';
import '../../../../data/database/daos/sensing_dao.dart';
import '../../../../data/database/daos/state_dao.dart';
import '../../../sensing/domain/entities/feature_window.dart';
import '../../../sensing/domain/repositories/sensing_repository.dart';
import '../../domain/entities/flow_state.dart';
import '../../domain/entities/state_reading.dart';
import '../../domain/repositories/flow_state_repository.dart';
import '../../domain/services/flow_classifier.dart';

/// Spina strumień okien z klasyfikatorem i trwałością.
///
/// Dodatkowo domyka pętlę sprzężenia zwrotnego: wylicza „obciążenie sesji”
/// (czas od ostatniej realnej regeneracji) i wstrzykuje je z powrotem do
/// akumulatora cech, bo bez tego stan `fatigue` nie miałby czym się karmić.
class FlowStateRepositoryImpl implements FlowStateRepository {
  FlowStateRepositoryImpl({
    required SensingRepository sensing,
    required StateDao stateDao,
    required SensingDao sensingDao,
    required ModelDao modelDao,
    FlowClassifier? classifier,
    Clock clock = const SystemClock(),
    this.sessionSaturation = const Duration(minutes: 120),
  }) : _sensing = sensing,
       _stateDao = stateDao,
       _sensingDao = sensingDao,
       _modelDao = modelDao,
       _classifier = classifier ?? FlowClassifier(),
       _clock = clock;

  final SensingRepository _sensing;
  final StateDao _stateDao;
  final SensingDao _sensingDao;
  final ModelDao _modelDao;
  final FlowClassifier _classifier;
  final Clock _clock;

  /// Po jakim czasie nieprzerwanej pracy obciążenie sesji osiąga maksimum.
  final Duration sessionSaturation;

  static const AppLogger _log = AppLogger('flow-state');

  final StreamController<StateReading> _readings =
      StreamController<StateReading>.broadcast();

  StreamSubscription<FeatureWindow>? _windowSubscription;
  StateReading? _current;
  DateTime? _sessionStart;
  bool _initialized = false;

  @override
  Stream<StateReading> get readings => _readings.stream;

  @override
  StateReading? get current => _current;

  @override
  int get calibrationSteps => _classifier.calibrationSteps;

  @override
  FutureUnit initialize() {
    return guard<Unit>(() async {
      if (_initialized) {
        return unit;
      }

      final SoftmaxClassifier? stored = await _modelDao.load();
      if (stored != null) {
        _classifier.replaceModel(stored);
        _log.info('Wczytano osobisty model (${stored.updateCount} korekt)');
      } else {
        _log.info('Startuję z wagami priorytetowymi');
      }

      _current = await _stateDao.latest();
      _sessionStart = _clock.now();

      _windowSubscription = _sensing.windows.listen(
        _onWindow,
        onError: (Object error, StackTrace stackTrace) {
          _log.error('Błąd strumienia okien', error, stackTrace);
          if (!_readings.isClosed) {
            _readings.addError(mapError(error, stackTrace), stackTrace);
          }
        },
        cancelOnError: false,
      );

      _initialized = true;
      return unit;
    }, context: 'flow.initialize');
  }

  @override
  FutureEither<List<StateReading>> history({required DateTime since}) {
    return guard<List<StateReading>>(
      () => _stateDao.since(since),
      context: 'flow.history',
    );
  }

  @override
  FutureEither<Map<FlowState, int>> countsSince(DateTime since) {
    return guard<Map<FlowState, int>>(
      () => _stateDao.countsSince(since),
      context: 'flow.countsSince',
    );
  }

  @override
  FutureUnit calibrate({
    required FeatureVector features,
    required FlowState label,
    required double strength,
  }) {
    return guard<Unit>(() async {
      _classifier.calibrate(
        features: features,
        label: label,
        strength: strength,
      );
      await _modelDao.save(_classifier.model, at: _clock.now());
      _log.info(
        'Douczono model: ${label.id} (siła ${strength.toStringAsFixed(2)}), '
        'łącznie ${_classifier.calibrationSteps} korekt',
      );
      return unit;
    }, context: 'flow.calibrate');
  }

  @override
  List<FeatureContribution> explain(StateReading reading) =>
      _classifier.explain(reading);

  @override
  FutureUnit resetModel() {
    return guard<Unit>(() async {
      await _modelDao.reset();
      _classifier.replaceModel(FlowClassifier.priorModel());
      return unit;
    }, context: 'flow.resetModel');
  }

  @override
  Future<void> dispose() async {
    await _windowSubscription?.cancel();
    _windowSubscription = null;
    if (!_readings.isClosed) {
      await _readings.close();
    }
  }

  // ── Wewnętrzne ───────────────────────────────────────────────────────────

  Future<void> _onWindow(FeatureWindow window) async {
    try {
      final int windowId = await _sensingDao.insertWindow(window);
      final StateReading reading = _classifier.classify(
        window.features,
        at: window.end,
        windowId: windowId,
      );

      final int id = await _stateDao.insert(reading);
      final StateReading stored = reading.copyWith(id: id);

      _current = stored;
      _updateSessionLoad(stored);

      if (!_readings.isClosed) {
        _readings.add(stored);
      }
    } on Object catch (error, stackTrace) {
      _log.error('Nie udało się przetworzyć okna', error, stackTrace);
      if (!_readings.isClosed) {
        _readings.addError(mapError(error, stackTrace), stackTrace);
      }
    }
  }

  /// Regeneracja zeruje licznik sesji; każdy inny stan go nabija.
  void _updateSessionLoad(StateReading reading) {
    if (reading.state == FlowState.recovery) {
      _sessionStart = reading.at;
      _sensing.setSessionLoad(0);
      return;
    }

    final DateTime start = _sessionStart ??= reading.at;
    final double elapsed = reading.at.difference(start).inSeconds.toDouble();
    final double saturation = sessionSaturation.inSeconds.toDouble();
    _sensing.setSessionLoad(
      saturation <= 0 ? 0 : (elapsed / saturation).clamp(0.0, 1.0),
    );
  }
}
