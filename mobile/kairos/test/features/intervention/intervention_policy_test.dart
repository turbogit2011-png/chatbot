import 'package:flutter_test/flutter_test.dart';
import 'package:kairos/core/math/signal_features.dart';
import 'package:kairos/features/flow_state/domain/entities/flow_state.dart';
import 'package:kairos/features/flow_state/domain/entities/state_reading.dart';
import 'package:kairos/features/intervention/domain/services/intervention_policy.dart';

StateReading reading({
  required FlowState state,
  double confidence = 0.8,
  bool settled = true,
  DateTime? at,
}) {
  final List<double> probabilities = List<double>.filled(
    FlowState.values.length,
    (1 - confidence) / (FlowState.values.length - 1),
  );
  probabilities[state.index] = confidence;

  return StateReading(
    at: at ?? DateTime(2026, 8, 10, 15),
    state: state,
    confidence: confidence,
    probabilities: probabilities,
    features: FeatureVector.empty(),
    isSettled: settled,
  );
}

void main() {
  const InterventionPolicy policy = InterventionPolicy();
  const PolicyConfig config = PolicyConfig();
  final DateTime midday = DateTime(2026, 8, 10, 15);

  InterventionDecision evaluate({
    required StateReading value,
    PolicyConfig? override,
    DateTime? now,
    bool signalReliable = true,
    int interventionsToday = 0,
    DateTime? lastInterventionAt,
  }) {
    return policy.evaluate(
      reading: value,
      config: override ?? config,
      now: now ?? midday,
      signalReliable: signalReliable,
      interventionsToday: interventionsToday,
      lastInterventionAt: lastInterventionAt,
    );
  }

  group('InterventionPolicy — kiedy wolno przerwać', () {
    test('dryf przy pewnym odczycie otwiera drogę do interwencji', () {
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.drift),
      );

      expect(decision, isA<AllowIntervention>());
      expect(decision.isAllowed, isTrue);
    });

    test('głębokie skupienie jest chronione bezwarunkowo', () {
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.deepFocus, confidence: 0.99),
      );

      expect(decision, isA<SuppressIntervention>());
      expect(
        (decision as SuppressIntervention).reason,
        SuppressReason.protectedState,
      );
    });

    test('regeneracja nie wymaga reakcji', () {
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.recovery),
      );

      expect(
        (decision as SuppressIntervention).reason,
        SuppressReason.notInterruptible,
      );
    });

    test('niepotwierdzona zmiana stanu wstrzymuje interwencję', () {
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.drift, settled: false),
      );

      expect(
        (decision as SuppressIntervention).reason,
        SuppressReason.unsettled,
      );
    });

    test('słaby sygnał z czujników wstrzymuje interwencję', () {
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.drift),
        signalReliable: false,
      );

      expect(
        (decision as SuppressIntervention).reason,
        SuppressReason.unreliableSignal,
      );
    });

    test('zbyt niska pewność modelu zamyka usta', () {
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.drift, confidence: 0.3),
      );

      expect(
        (decision as SuppressIntervention).reason,
        SuppressReason.lowConfidence,
      );
    });

    test('wyłączone interwencje mają pierwszeństwo przed wszystkim', () {
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.drift),
        override: const PolicyConfig(enabled: false),
      );

      expect(
        (decision as SuppressIntervention).reason,
        SuppressReason.disabled,
      );
    });
  });

  group('InterventionPolicy — odstępy i limity', () {
    test('cooldown blokuje i zwraca czas do końca', () {
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.drift),
        lastInterventionAt: midday.subtract(const Duration(minutes: 10)),
      );

      final SuppressIntervention suppressed = decision as SuppressIntervention;
      expect(suppressed.reason, SuppressReason.cooldown);
      expect(suppressed.retryAfter, const Duration(minutes: 15));
    });

    test('po upływie cooldownu droga jest wolna', () {
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.drift),
        lastInterventionAt: midday.subtract(const Duration(minutes: 26)),
      );

      expect(decision, isA<AllowIntervention>());
    });

    test('limit dobowy zatrzymuje nawet pewny odczyt', () {
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.drift, confidence: 0.95),
        interventionsToday: 6,
      );

      expect(
        (decision as SuppressIntervention).reason,
        SuppressReason.dailyLimit,
      );
    });
  });

  group('InterventionPolicy — cisza nocna', () {
    test('obejmuje godziny przechodzące przez północ', () {
      final DateTime night = DateTime(2026, 8, 10, 23, 30);
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.fatigue, at: night),
        now: night,
      );

      final SuppressIntervention suppressed = decision as SuppressIntervention;
      expect(suppressed.reason, SuppressReason.quietHours);
      expect(suppressed.retryAfter, const Duration(minutes: 450));
    });

    test('nad ranem, po jej końcu, przestaje obowiązywać', () {
      final DateTime morning = DateTime(2026, 8, 10, 7, 30);
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.fatigue, at: morning),
        now: morning,
      );

      expect(decision, isA<AllowIntervention>());
    });

    test('okno w środku dnia działa bez przechodzenia przez północ', () {
      const PolicyConfig lunchBreak = PolicyConfig(
        quietStartMinutes: 13 * 60,
        quietEndMinutes: 14 * 60,
      );

      final DateTime lunch = DateTime(2026, 8, 10, 13, 20);
      final InterventionDecision decision = evaluate(
        value: reading(state: FlowState.drift, at: lunch),
        override: lunchBreak,
        now: lunch,
      );

      expect(
        (decision as SuppressIntervention).reason,
        SuppressReason.quietHours,
      );
      expect(decision.retryAfter, const Duration(minutes: 40));
    });
  });

  group('PolicyConfig — adaptacja odstępu', () {
    test('skraca się po pomocnej interwencji, ale nie poniżej minimum', () {
      PolicyConfig current = const PolicyConfig(
        cooldown: Duration(minutes: 17),
      );

      current = current.withCooldownDelta(const Duration(minutes: -5));
      expect(current.cooldown, const Duration(minutes: 15));

      current = current.withCooldownDelta(const Duration(minutes: -5));
      expect(current.cooldown, PolicyConfig.minCooldown);
    });

    test('wydłuża się po odrzuceniu, ale nie ponad maksimum', () {
      PolicyConfig current = const PolicyConfig(
        cooldown: Duration(minutes: 80),
      );

      current = current.withCooldownDelta(const Duration(minutes: 25));
      expect(current.cooldown, PolicyConfig.maxCooldown);
    });
  });
}
