import 'package:flutter_test/flutter_test.dart';
import 'package:kairos/core/math/signal_features.dart';
import 'package:kairos/features/flow_state/domain/entities/flow_state.dart';
import 'package:kairos/features/flow_state/domain/entities/state_reading.dart';
import 'package:kairos/features/flow_state/domain/services/flow_classifier.dart';

/// Buduje wektor cech z podanych wartości (reszta = 0, bias = 1).
FeatureVector vector(Map<int, double> values) {
  final List<double> raw = List<double>.filled(FeatureVector.length, 0);
  raw[FeatureVector.bias] = 1;
  values.forEach((int index, double value) => raw[index] = value);
  return FeatureVector(raw);
}

void main() {
  final DateTime at = DateTime(2026, 8, 10, 15, 30);

  final FeatureVector deepFocusSignal = vector(<int, double>{
    FeatureVector.stillnessRatio: 0.9,
    FeatureVector.microMovementRate: 0.05,
    FeatureVector.motionVariability: 0.05,
    FeatureVector.sessionLoad: 0.3,
  });

  final FeatureVector driftSignal = vector(<int, double>{
    FeatureVector.foregroundSwitchRate: 0.8,
    FeatureVector.microMovementRate: 0.6,
    FeatureVector.motionVariability: 0.5,
    FeatureVector.rotationEnergy: 0.4,
    FeatureVector.stillnessRatio: 0.1,
    FeatureVector.motionEnergy: 0.2,
    FeatureVector.jerkRate: 0.2,
    FeatureVector.sessionLoad: 0.6,
  });

  final FeatureVector restlessSignal = vector(<int, double>{
    FeatureVector.microMovementRate: 0.8,
    FeatureVector.jerkRate: 0.7,
    FeatureVector.motionVariability: 0.8,
    FeatureVector.postureShiftRate: 0.6,
    FeatureVector.stillnessRatio: 0.05,
    FeatureVector.foregroundSwitchRate: 0.3,
    FeatureVector.motionEnergy: 0.4,
    FeatureVector.sessionLoad: 0.3,
  });

  final FeatureVector fatigueSignal = vector(<int, double>{
    FeatureVector.sessionLoad: 1,
    FeatureVector.stillnessRatio: 0.6,
    FeatureVector.motionEnergy: 0.1,
    FeatureVector.jerkRate: 0.05,
    FeatureVector.microMovementRate: 0.2,
    FeatureVector.foregroundSwitchRate: 0.2,
    FeatureVector.motionVariability: 0.2,
    FeatureVector.hourCos: 0.9,
  });

  final FeatureVector recoverySignal = vector(<int, double>{
    FeatureVector.stepRate: 0.7,
    FeatureVector.motionEnergy: 0.8,
    FeatureVector.stillnessRatio: 0.05,
    FeatureVector.microMovementRate: 0.2,
    FeatureVector.motionVariability: 0.4,
    FeatureVector.jerkRate: 0.4,
    FeatureVector.foregroundSwitchRate: 0.1,
    FeatureVector.sessionLoad: 0.2,
  });

  group('FlowClassifier — wagi startowe', () {
    test('rozpoznaje prototypowe sygnatury bez żadnego uczenia', () {
      expect(
        FlowClassifier().classify(deepFocusSignal, at: at).state,
        FlowState.deepFocus,
      );
      expect(
        FlowClassifier().classify(driftSignal, at: at).state,
        FlowState.drift,
      );
      expect(
        FlowClassifier().classify(restlessSignal, at: at).state,
        FlowState.restless,
      );
      expect(
        FlowClassifier().classify(fatigueSignal, at: at).state,
        FlowState.fatigue,
      );
      expect(
        FlowClassifier().classify(recoverySignal, at: at).state,
        FlowState.recovery,
      );
    });

    test('pewność mieści się w przedziale (0,1] i wskazuje wybrany stan', () {
      final StateReading reading = FlowClassifier().classify(
        driftSignal,
        at: at,
      );

      expect(reading.confidence, greaterThan(0));
      expect(reading.confidence, lessThanOrEqualTo(1));
      expect(reading.probabilityOf(FlowState.drift), reading.confidence);
      expect(reading.probabilities.length, FlowState.values.length);
    });
  });

  group('FlowClassifier — histereza', () {
    test('pojedyncze okno nie przełącza stanu', () {
      final FlowClassifier classifier = FlowClassifier();
      classifier.classify(deepFocusSignal, at: at);

      final StateReading afterOne = classifier.classify(
        driftSignal,
        at: at.add(const Duration(seconds: 30)),
      );

      expect(afterOne.state, FlowState.deepFocus);
      expect(afterOne.isSettled, isFalse);
    });

    test('dwa kolejne okna potwierdzają zmianę', () {
      final FlowClassifier classifier = FlowClassifier();
      classifier.classify(deepFocusSignal, at: at);
      classifier.classify(driftSignal, at: at.add(const Duration(seconds: 30)));

      final StateReading afterTwo = classifier.classify(
        driftSignal,
        at: at.add(const Duration(seconds: 60)),
      );

      expect(afterTwo.state, FlowState.drift);
      expect(afterTwo.isSettled, isTrue);
    });

    test('przerwana seria kandydata zeruje licznik', () {
      final FlowClassifier classifier = FlowClassifier();
      classifier.classify(deepFocusSignal, at: at);
      classifier.classify(driftSignal, at: at.add(const Duration(seconds: 30)));
      classifier.classify(
        deepFocusSignal,
        at: at.add(const Duration(seconds: 60)),
      );

      final StateReading afterInterruption = classifier.classify(
        driftSignal,
        at: at.add(const Duration(seconds: 90)),
      );

      expect(afterInterruption.state, FlowState.deepFocus);
      expect(afterInterruption.isSettled, isFalse);
    });
  });

  group('FlowClassifier — douczanie', () {
    test('korekta przesuwa prawdopodobieństwo we wskazanym kierunku', () {
      final FlowClassifier classifier = FlowClassifier();
      final double before = classifier
          .classify(driftSignal, at: at)
          .probabilityOf(FlowState.deepFocus);

      for (int i = 0; i < 30; i++) {
        classifier.calibrate(
          features: driftSignal,
          label: FlowState.deepFocus,
        );
      }

      final double after = FlowClassifier(model: classifier.model)
          .classify(driftSignal, at: at)
          .probabilityOf(FlowState.deepFocus);

      expect(after, greaterThan(before));
      expect(classifier.calibrationSteps, 30);
    });

    test('wyjaśnienie zwraca cechy posortowane po sile wpływu', () {
      final FlowClassifier classifier = FlowClassifier();
      final StateReading reading = classifier.classify(driftSignal, at: at);

      final List<FeatureContribution> contributions = classifier.explain(
        reading,
      );

      expect(contributions, isNotEmpty);
      for (int i = 1; i < contributions.length; i++) {
        expect(
          contributions[i - 1].contribution.abs(),
          greaterThanOrEqualTo(contributions[i].contribution.abs()),
        );
      }
    });
  });
}
