import 'dart:async';

import 'package:fpdart/fpdart.dart';

import '../core/error/failure.dart';
import '../core/logging/app_logger.dart';
import '../core/result/typedefs.dart';
import '../features/flow_state/domain/entities/state_reading.dart';
import '../features/flow_state/domain/repositories/flow_state_repository.dart';
import '../features/intervention/domain/entities/intervention.dart';
import '../features/intervention/domain/repositories/intervention_repository.dart';
import '../features/intervention/domain/services/intervention_policy.dart';
import '../features/sensing/domain/entities/feature_window.dart';
import '../features/sensing/domain/repositories/sensing_repository.dart';

/// Spina trzy moduły w jedną pętlę produktu:
/// czujniki → stan → (polityka) → interwencja → reakcja → douczenie.
///
/// Nie zawiera logiki decyzyjnej — ta siedzi w `InterventionPolicy` i
/// `FlowClassifier`. Tutaj jest wyłącznie orkiestracja i cykl życia.
class KairosEngine {
  KairosEngine({
    required SensingRepository sensing,
    required FlowStateRepository flow,
    required InterventionRepository interventions,
  }) : _sensing = sensing,
       _flow = flow,
       _interventions = interventions;

  final SensingRepository _sensing;
  final FlowStateRepository _flow;
  final InterventionRepository _interventions;

  static const AppLogger _log = AppLogger('engine');

  StreamSubscription<StateReading>? _readingSubscription;
  StreamSubscription<FeatureWindow>? _windowSubscription;

  bool _lastWindowReliable = false;
  bool _initialized = false;

  Stream<StateReading> get readings => _flow.readings;

  Stream<Intervention> get interventions => _interventions.delivered;

  Stream<LiveSignal> get liveSignal => _sensing.live;

  Stream<String> get notificationTaps => _interventions.notificationTaps;

  StateReading? get currentReading => _flow.current;

  LiveSignal? get lastSignal => _sensing.lastSignal;

  InterventionDecision? get lastDecision => _interventions.lastDecision;

  int get calibrationSteps => _flow.calibrationSteps;

  bool get isSensing => _sensing.isRunning;

  /// Przygotowuje moduły. Nie uruchamia czujników — to świadoma decyzja
  /// użytkownika, nie efekt uboczny otwarcia aplikacji.
  FutureUnit initialize() async {
    if (_initialized) {
      return Right<Failure, Unit>(unit);
    }

    final Either<Failure, Unit> flowResult = await _flow.initialize();
    if (flowResult.isLeft()) {
      return flowResult;
    }

    final Either<Failure, Unit> interventionResult =
        await _interventions.initialize();
    if (interventionResult.isLeft()) {
      return interventionResult;
    }

    _windowSubscription = _sensing.windows.listen(
      (FeatureWindow window) => _lastWindowReliable = window.isReliable,
      onError: (Object error) =>
          _log.warning('Strumień okien zgłosił błąd', error),
      cancelOnError: false,
    );

    _readingSubscription = _flow.readings.listen(
      _onReading,
      onError: (Object error) =>
          _log.warning('Strumień odczytów zgłosił błąd', error),
      cancelOnError: false,
    );

    _initialized = true;
    _log.info('Silnik gotowy');
    return Right<Failure, Unit>(unit);
  }

  FutureUnit startSensing() => _sensing.start();

  FutureUnit stopSensing() => _sensing.stop();

  void noteForegroundSwitch() => _sensing.noteForegroundSwitch();

  /// Reakcja użytkownika: zapis + natychmiastowe douczenie modelu.
  FutureUnit submitFeedback({
    required Intervention intervention,
    required InterventionFeedback feedback,
  }) async {
    final Either<Failure, Unit> saved = await _interventions.recordFeedback(
      intervention: intervention,
      feedback: feedback,
    );
    if (saved.isLeft()) {
      return saved;
    }

    return _flow.calibrate(
      features: intervention.features,
      label: feedback.calibrationLabel ?? intervention.state,
      strength: feedback.strength,
    );
  }

  /// Zwalnia wyłącznie własne subskrypcje. Cyklem życia repozytoriów zarządzają
  /// ich providery — podwójne zwalnianie byłoby proszeniem się o wyścigi.
  Future<void> dispose() async {
    await _readingSubscription?.cancel();
    await _windowSubscription?.cancel();
    _readingSubscription = null;
    _windowSubscription = null;
    _initialized = false;
  }

  Future<void> _onReading(StateReading reading) async {
    final Either<Failure, Intervention?> result = await _interventions.consider(
      reading,
      signalReliable: _lastWindowReliable,
    );

    result.match(
      (Failure failure) => _log.warning('Nie udało się ocenić odczytu', failure),
      (Intervention? intervention) {
        if (intervention == null) {
          final InterventionDecision? decision = _interventions.lastDecision;
          if (decision is SuppressIntervention) {
            _log.debug('Milczę: ${decision.reason.name}');
          }
        }
      },
    );
  }
}
