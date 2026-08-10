import 'package:flutter_test/flutter_test.dart';
import 'package:kairos/core/math/signal_features.dart';
import 'package:kairos/features/flow_state/domain/entities/flow_state.dart';
import 'package:kairos/features/flow_state/domain/entities/state_reading.dart';
import 'package:kairos/features/intervention/data/datasources/composition_engine.dart';
import 'package:kairos/features/intervention/data/datasources/intervention_engine.dart';
import 'package:kairos/features/intervention/domain/entities/intention.dart';

void main() {
  const CompositionEngine engine = CompositionEngine();
  final DateTime at = DateTime(2026, 8, 10, 15, 12);

  StateReading readingFor(FlowState state) => StateReading(
    at: at,
    state: state,
    confidence: 0.78,
    probabilities: List<double>.filled(FlowState.values.length, 0.1),
    features: FeatureVector.empty(),
  );

  InterventionRequest requestFor(
    FlowState state, {
    String? intentionText,
    List<String> recent = const <String>[],
    String? observation,
    DateTime? moment,
  }) {
    return InterventionRequest(
      reading: readingFor(state),
      at: moment ?? at,
      intention: intentionText == null
          ? null
          : Intention(
              id: 'i1',
              text: intentionText,
              createdAt: at.subtract(const Duration(hours: 1)),
            ),
      recentMessages: recent,
      dominantObservation: observation,
    );
  }

  group('CompositionEngine', () {
    test('jest zawsze dostępny — to silnik ostatniej instancji', () async {
      expect(await engine.isAvailable(), isTrue);
      expect(engine.source.id, 'composition');
    });

    test('trzyma się limitu długości i zasad tonu', () async {
      for (final FlowState state in FlowState.values) {
        final String message = await engine.compose(requestFor(state));

        expect(message.length, lessThanOrEqualTo(InterventionText.maxLength));
        expect(message, isNot(contains('!')));
        expect(message.toLowerCase(), isNot(contains('powinieneś')));
        expect(message.toLowerCase(), isNot(contains('musisz')));
        expect(InterventionText.isAcceptable(message), isTrue);
        expect(message[0], message[0].toUpperCase());
      }
    });

    test('wplata zamiar użytkownika w treść', () async {
      final String message = await engine.compose(
        requestFor(FlowState.drift, intentionText: 'Kończę rozdział 3'),
      );

      expect(message.toLowerCase(), contains('rozdział 3'));
    });

    test('używa dominującej obserwacji z sygnału', () async {
      final String message = await engine.compose(
        requestFor(
          FlowState.drift,
          observation: 'sporo przeskakiwania między aplikacjami',
        ),
      );

      expect(message.toLowerCase(), contains('przeskakiwania'));
    });

    test('jest deterministyczny w obrębie tej samej minuty', () async {
      final String first = await engine.compose(requestFor(FlowState.restless));
      final String second = await engine.compose(requestFor(FlowState.restless));

      expect(first, second);
    });

    test('unika powtórzenia zdania z historii', () async {
      final String original = await engine.compose(
        requestFor(FlowState.drift),
      );

      final String next = await engine.compose(
        requestFor(FlowState.drift, recent: <String>[original]),
      );

      expect(next, isNot(original));
    });

    test('działa bez zamiaru — wtedy kroki są ogólne', () async {
      final String message = await engine.compose(requestFor(FlowState.fatigue));

      expect(message, isNotEmpty);
      expect(message, isNot(contains('{cel}')));
    });
  });

  group('InterventionText', () {
    test('usuwa cudzysłowy, markdown i nadmiarowe białe znaki', () {
      expect(
        InterventionText.sanitize('  "**Wróć   do zadania**"  '),
        'Wróć do zadania',
      );
    });

    test('obcina zbyt długie zdania na granicy słowa', () {
      final String long = 'a' * 20 + ' ' + 'b' * 200;
      final String result = InterventionText.sanitize(long);

      expect(result.length, lessThanOrEqualTo(InterventionText.maxLength));
    });

    test('odrzuca krzyk i moralizowanie', () {
      expect(InterventionText.isAcceptable('Weź się do roboty!'), isFalse);
      expect(
        InterventionText.isAcceptable('Powinieneś wrócić do pracy teraz'),
        isFalse,
      );
      expect(InterventionText.isAcceptable('Za krótkie'), isFalse);
      expect(
        InterventionText.isAcceptable('Wróć na dwie minuty do jednego zdania'),
        isTrue,
      );
    });
  });
}
