import 'dart:async';

import 'package:fpdart/fpdart.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/error/error_mapper.dart';
import '../../../../core/error/failure.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/math/signal_features.dart';
import '../../../../core/result/typedefs.dart';
import '../../../../core/time/clock.dart';
import '../../../../data/database/daos/intervention_dao.dart';
import '../../../flow_state/domain/entities/state_reading.dart';
import '../../domain/entities/intention.dart';
import '../../domain/entities/intervention.dart';
import '../../domain/repositories/intervention_repository.dart';
import '../../domain/services/intervention_policy.dart';
import '../datasources/composition_engine.dart';
import '../datasources/intervention_engine.dart';
import '../datasources/notification_data_source.dart';

/// Implementacja modułu interwencji.
///
/// Kolejność silników jest istotna: pierwszy dostępny wygrywa, a każdy błąd
/// degraduje nas o poziom niżej. Dzięki temu brak modelu, brak pamięci GPU czy
/// dziwna odpowiedź LLM-a nigdy nie kończą się brakiem interwencji — kończą się
/// interwencją z silnika kompozycyjnego.
class InterventionRepositoryImpl implements InterventionRepository {
  InterventionRepositoryImpl({
    required InterventionDao dao,
    required NotificationDataSource notifications,
    required List<InterventionEngine> engines,
    PolicyConfig config = const PolicyConfig(),
    InterventionPolicy policy = const InterventionPolicy(),
    Clock clock = const SystemClock(),
    Uuid uuid = const Uuid(),
    this.onConfigChanged,
  }) : _dao = dao,
       _notifications = notifications,
       _engines = engines,
       _config = config,
       _policy = policy,
       _clock = clock,
       _uuid = uuid;

  final InterventionDao _dao;
  final NotificationDataSource _notifications;
  final List<InterventionEngine> _engines;
  final InterventionPolicy _policy;
  final Clock _clock;
  final Uuid _uuid;

  /// Wywoływane, gdy polityka sama zmieni cooldown po reakcji użytkownika —
  /// warstwa ustawień utrwala nową wartość.
  final void Function(PolicyConfig config)? onConfigChanged;

  static const AppLogger _log = AppLogger('intervention');

  final StreamController<Intervention> _delivered =
      StreamController<Intervention>.broadcast();

  PolicyConfig _config;
  InterventionDecision? _lastDecision;
  DateTime? _lastInterventionAt;
  bool _initialized = false;

  @override
  Stream<Intervention> get delivered => _delivered.stream;

  @override
  Stream<String> get notificationTaps => _notifications.taps;

  @override
  PolicyConfig get config => _config;

  @override
  InterventionDecision? get lastDecision => _lastDecision;

  @override
  FutureUnit initialize() {
    return guard<Unit>(() async {
      if (_initialized) {
        return unit;
      }
      await _notifications.initialize();
      _lastInterventionAt = (await _dao.last())?.at;
      _initialized = true;
      return unit;
    }, context: 'intervention.initialize');
  }

  @override
  FutureEither<Intervention?> consider(
    StateReading reading, {
    required bool signalReliable,
  }) {
    return guard<Intervention?>(() async {
      final DateTime now = _clock.now();
      final DateTime startOfDay = DateTime(now.year, now.month, now.day);

      final InterventionDecision decision = _policy.evaluate(
        reading: reading,
        config: _config,
        now: now,
        signalReliable: signalReliable,
        interventionsToday: await _dao.countSince(startOfDay),
        lastInterventionAt: _lastInterventionAt,
      );
      _lastDecision = decision;

      if (decision is! AllowIntervention) {
        return null;
      }

      final Intention? intention = await _dao.activeIntention();
      final List<String> recent = await _dao.recentMessages();
      final InterventionRequest request = InterventionRequest(
        reading: reading,
        at: now,
        intention: intention,
        recentMessages: recent,
        dominantObservation: _dominantObservation(reading),
      );

      final (String message, InterventionSource source) = await _compose(request);

      final Intervention intervention = Intervention(
        id: _uuid.v4(),
        at: now,
        state: reading.state,
        confidence: reading.confidence,
        message: message,
        source: source,
        features: reading.features,
        intentionId: intention?.id,
        intentionText: intention?.text,
      );

      await _dao.insert(intervention);
      _lastInterventionAt = now;

      if (_config.deliverAsNotification &&
          await _notifications.hasPermission()) {
        await _notifications.deliver(intervention);
      }

      if (!_delivered.isClosed) {
        _delivered.add(intervention);
      }

      _log.info(
        'Interwencja ${intervention.id} (${source.label}, ${reading.state.id})',
      );
      return intervention;
    }, context: 'intervention.consider');
  }

  @override
  FutureUnit recordFeedback({
    required Intervention intervention,
    required InterventionFeedback feedback,
  }) {
    return guard<Unit>(() async {
      final DateTime now = _clock.now();
      await _dao.saveFeedback(
        id: intervention.id,
        feedback: feedback,
        at: now,
      );

      final PolicyConfig updated = _config.withCooldownDelta(
        feedback.cooldownDelta,
      );
      if (updated.cooldown != _config.cooldown) {
        _config = updated;
        onConfigChanged?.call(updated);
        _log.info(
          'Nowy odstęp między interwencjami: ${updated.cooldown.inMinutes} min',
        );
      }
      return unit;
    }, context: 'intervention.recordFeedback');
  }

  @override
  FutureEither<List<Intervention>> history({required int limit}) {
    return guard<List<Intervention>>(
      () => _dao.recent(limit: limit),
      context: 'intervention.history',
    );
  }

  @override
  FutureEither<Intervention?> latest() {
    return guard<Intervention?>(_dao.last, context: 'intervention.latest');
  }

  @override
  FutureEither<InterventionStats> stats({required DateTime since}) {
    return guard<InterventionStats>(
      () => _dao.stats(since: since),
      context: 'intervention.stats',
    );
  }

  @override
  FutureEither<Intention?> activeIntention() {
    return guard<Intention?>(
      _dao.activeIntention,
      context: 'intervention.activeIntention',
    );
  }

  @override
  FutureEither<Intention> setIntention(String text) {
    return guard<Intention>(() async {
      final String? error = Intention.validate(text);
      if (error != null) {
        throw ArgumentError.value(text, 'text', error);
      }

      final DateTime now = _clock.now();
      await _dao.archiveAllIntentions(now);

      final Intention intention = Intention(
        id: _uuid.v4(),
        text: text.trim(),
        createdAt: now,
      );
      await _dao.insertIntention(intention);
      return intention;
    }, onError: (Object error, StackTrace stackTrace) {
      if (error is ArgumentError) {
        return UnknownFailure(
          message: error.message?.toString() ?? 'Nieprawidłowy zamiar.',
          cause: error,
          stackTrace: stackTrace,
        );
      }
      return mapError(error, stackTrace);
    }, context: 'intervention.setIntention');
  }

  @override
  FutureUnit clearIntention() {
    return guard<Unit>(() async {
      await _dao.archiveAllIntentions(_clock.now());
      return unit;
    }, context: 'intervention.clearIntention');
  }

  @override
  void updateConfig(PolicyConfig config) => _config = config;

  @override
  Future<void> dispose() async {
    for (final InterventionEngine engine in _engines) {
      await engine.dispose();
    }
    if (!_delivered.isClosed) {
      await _delivered.close();
    }
  }

  // ── Wewnętrzne ───────────────────────────────────────────────────────────

  /// Próbuje kolejnych silników; ostatnią deską ratunku jest silnik
  /// kompozycyjny, który nie może zawieść.
  Future<(String, InterventionSource)> _compose(
    InterventionRequest request,
  ) async {
    for (final InterventionEngine engine in _engines) {
      try {
        if (engine.source == InterventionSource.localModel &&
            !_config.useLocalModel) {
          continue;
        }
        if (!await engine.isAvailable()) {
          continue;
        }
        final String message = await engine.compose(request);
        if (message.isNotEmpty) {
          return (message, engine.source);
        }
      } on Object catch (error, stackTrace) {
        _log.warning(
          'Silnik ${engine.source.label} zawiódł — schodzę niżej',
          error,
        );
        _log.debug(stackTrace.toString());
      }
    }

    const CompositionEngine fallback = CompositionEngine();
    return (await fallback.compose(request), fallback.source);
  }

  /// Wybiera najmocniejszą cechę sygnału i zamienia ją na frazę po polsku.
  String? _dominantObservation(StateReading reading) {
    int bestIndex = -1;
    double bestValue = 0.35; // próg — poniżej niego nie ma o czym mówić

    for (final int index in FeatureVector.displayable) {
      final double value = reading.features[index];
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    }

    if (bestIndex == -1) {
      return null;
    }
    return CompositionEngine.signalPhrases[FeatureVector.names[bestIndex]];
  }
}
