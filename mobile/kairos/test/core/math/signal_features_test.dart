import 'package:flutter_test/flutter_test.dart';
import 'package:kairos/core/math/signal_features.dart';

void main() {
  final DateTime start = DateTime(2026, 8, 10, 14);
  final DateTime end = start.add(const Duration(seconds: 30));

  group('FeatureAccumulator', () {
    test('bezruch daje wysoki stillnessRatio i niską energię', () {
      final FeatureAccumulator accumulator = FeatureAccumulator();

      for (int i = 0; i < 300; i++) {
        accumulator.addUserAcceleration(
          0.001,
          0.001,
          0.001,
          start.add(Duration(milliseconds: i * 100)),
        );
      }

      final FeatureVector features = accumulator.build(
        windowStart: start,
        windowEnd: end,
      );

      expect(features[FeatureVector.stillnessRatio], greaterThan(0.95));
      expect(features[FeatureVector.microMovementRate], lessThan(0.05));
      expect(features[FeatureVector.motionEnergy], lessThan(0.05));
      expect(features[FeatureVector.bias], 1);
    });

    test('wiercenie się trafia w pasmo mikroruchów', () {
      final FeatureAccumulator accumulator = FeatureAccumulator();

      for (int i = 0; i < 300; i++) {
        final double value = i.isEven ? 0.05 : 0.12;
        accumulator.addUserAcceleration(
          value,
          0,
          0,
          start.add(Duration(milliseconds: i * 100)),
        );
      }

      final FeatureVector features = accumulator.build(
        windowStart: start,
        windowEnd: end,
      );

      expect(features[FeatureVector.microMovementRate], greaterThan(0.95));
      expect(features[FeatureVector.stillnessRatio], lessThan(0.05));
    });

    test('przełączenia aplikacji i kroki trafiają do wektora', () {
      final FeatureAccumulator accumulator = FeatureAccumulator()
        ..noteForegroundSwitch()
        ..noteForegroundSwitch()
        ..noteForegroundSwitch()
        ..setStepCounter(1000)
        ..setStepCounter(1040)
        ..setCharging(charging: true);

      final FeatureVector features = accumulator.build(
        windowStart: start,
        windowEnd: end,
      );

      expect(features[FeatureVector.foregroundSwitchRate], greaterThan(0.5));
      expect(features[FeatureVector.stepRate], greaterThan(0.4));
      expect(features[FeatureVector.charging], 1);
    });

    test('zmiana orientacji ponad 15° jest liczona jako zmiana pozycji', () {
      final FeatureAccumulator accumulator = FeatureAccumulator()
        ..addOrientation(0, 0, 9.81) // telefon leży ekranem do góry
        ..addOrientation(9.81, 0, 0) // podniesiony pionowo — zmiana o 90°
        ..addOrientation(0, 0, 9.81); // z powrotem

      final FeatureVector features = accumulator.build(
        windowStart: start,
        windowEnd: end,
      );

      expect(features[FeatureVector.postureShiftRate], greaterThan(0));
    });

    test('kodowanie pory dnia jest cykliczne', () {
      final FeatureVector midnight = FeatureAccumulator().build(
        windowStart: DateTime(2026, 8, 10),
        windowEnd: DateTime(2026, 8, 10),
      );
      final FeatureVector noon = FeatureAccumulator().build(
        windowStart: DateTime(2026, 8, 10, 12),
        windowEnd: DateTime(2026, 8, 10, 12),
      );

      expect(midnight[FeatureVector.hourCos], closeTo(1, 1e-6));
      expect(noon[FeatureVector.hourCos], closeTo(-1, 1e-6));
    });

    test('resetWindow czyści statystyki okna, ale nie stan ciągły', () {
      final FeatureAccumulator accumulator = FeatureAccumulator()
        ..addUserAcceleration(0.5, 0, 0, start)
        ..setCharging(charging: true)
        ..resetWindow();

      expect(accumulator.sampleCount, 0);

      final FeatureVector features = accumulator.build(
        windowStart: start,
        windowEnd: end,
      );
      expect(features[FeatureVector.charging], 1);
    });

    test('serializacja wektora cech działa w obie strony', () {
      final FeatureAccumulator accumulator = FeatureAccumulator()
        ..addUserAcceleration(0.3, 0.2, 0.1, start);
      final FeatureVector original = accumulator.build(
        windowStart: start,
        windowEnd: end,
      );

      final FeatureVector restored = FeatureVector.fromJson(original.toJson());

      for (int i = 0; i < FeatureVector.length; i++) {
        expect(restored[i], closeTo(original[i], 1e-9));
      }
    });
  });
}
