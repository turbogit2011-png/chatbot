import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kairos/core/math/signal_features.dart';
import 'package:kairos/core/theme/app_theme.dart';
import 'package:kairos/features/flow_state/domain/entities/flow_state.dart';
import 'package:kairos/features/flow_state/domain/entities/state_reading.dart';
import 'package:kairos/features/flow_state/presentation/widgets/breathing_ring.dart';
import 'package:kairos/features/flow_state/presentation/widgets/state_timeline.dart';

Widget wrap(Widget child, {bool disableAnimations = false}) {
  return MaterialApp(
    theme: AppTheme.dark(),
    home: MediaQuery(
      data: MediaQueryData(disableAnimations: disableAnimations),
      child: Scaffold(body: Center(child: child)),
    ),
  );
}

void main() {
  group('BreathingRing', () {
    testWidgets('rysuje treść środka i nie rzuca przy braku danych', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        wrap(
          const BreathingRing(
            tone: Color(0xFF22D3EE),
            confidence: 0.72,
            child: Text('Skupienie'),
          ),
        ),
      );

      expect(find.text('Skupienie'), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 700));
      expect(tester.takeException(), isNull);
    });

    testWidgets('nie animuje przy włączonej redukcji ruchu', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        wrap(
          const BreathingRing(
            tone: Color(0xFF4ADE80),
            confidence: 0.4,
            child: Text('Płynność'),
          ),
          disableAnimations: true,
        ),
      );

      // Brak trwających animacji → pumpAndSettle kończy się natychmiast.
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      expect(find.text('Płynność'), findsOneWidget);
    });
  });

  group('StateTimeline', () {
    testWidgets('pokazuje komunikat, gdy nie ma odczytów', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(wrap(const StateTimeline(readings: <StateReading>[])));

      expect(find.text('Brak danych z tego okresu'), findsOneWidget);
    });

    testWidgets('rysuje oś czasu z godzinami skrajnych odczytów', (
      WidgetTester tester,
    ) async {
      final DateTime start = DateTime(2026, 8, 10, 9, 15);
      final List<StateReading> readings = List<StateReading>.generate(
        6,
        (int index) => StateReading(
          at: start.add(Duration(minutes: index * 30)),
          state: FlowState.values[index % FlowState.values.length],
          confidence: 0.4 + index * 0.08,
          probabilities: List<double>.filled(FlowState.values.length, 0.16),
          features: FeatureVector.empty(),
        ),
      );

      await tester.pumpWidget(wrap(StateTimeline(readings: readings)));

      expect(find.text('09:15'), findsOneWidget);
      expect(find.text('11:45'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
