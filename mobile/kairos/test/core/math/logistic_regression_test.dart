import 'package:flutter_test/flutter_test.dart';
import 'package:kairos/core/math/logistic_regression.dart';

void main() {
  group('SoftmaxClassifier', () {
    List<List<double>> zeroWeights(int classes, int features) =>
        List<List<double>>.generate(
          classes,
          (_) => List<double>.filled(features, 0),
          growable: false,
        );

    test('rozkład prawdopodobieństwa sumuje się do jedności', () {
      final SoftmaxClassifier classifier = SoftmaxClassifier(
        weights: zeroWeights(3, 4),
      );

      final List<double> probabilities = classifier.predict(
        <double>[1, 0.4, 0.9, 0.2],
      );

      expect(probabilities.length, 3);
      expect(
        probabilities.reduce((double a, double b) => a + b),
        closeTo(1, 1e-9),
      );
      // Zerowe wagi → rozkład jednostajny.
      expect(probabilities.first, closeTo(1 / 3, 1e-9));
    });

    test('uczy się rozdzielać dwie klasy po jednym kroku SGD', () {
      final SoftmaxClassifier classifier = SoftmaxClassifier(
        weights: zeroWeights(2, 2),
        learningRate: 0.5,
      );

      const List<double> sample = <double>[1, 1];
      final double before = classifier.predict(sample)[1];

      for (int i = 0; i < 20; i++) {
        classifier.update(sample, 1);
      }

      final double after = classifier.predict(sample)[1];
      expect(after, greaterThan(before));
      expect(after, greaterThan(0.8));
      expect(classifier.updateCount, 20);
    });

    test('regularyzacja L2 nie dotyka biasu', () {
      final SoftmaxClassifier classifier = SoftmaxClassifier(
        weights: <List<double>>[
          <double>[1, 5],
          <double>[0, 0],
        ],
        learningRate: 0,
        l2: 0.5,
      );

      classifier.update(<double>[1, 1], 0);

      // Krok uczący = 0, więc wagi nie mogą się zmienić mimo regularyzacji.
      expect(classifier.weights[0][0], 1);
      expect(classifier.weights[0][1], 5);
    });

    test('serializacja jest bezstratna', () {
      final SoftmaxClassifier classifier = SoftmaxClassifier(
        weights: <List<double>>[
          <double>[0.5, -1.25],
          <double>[2, 0.125],
        ],
        updateCount: 7,
      );

      final SoftmaxClassifier restored = SoftmaxClassifier.decode(
        classifier.encode(),
      );

      expect(restored.classCount, classifier.classCount);
      expect(restored.featureCount, classifier.featureCount);
      expect(restored.updateCount, 7);
      expect(restored.weights[0][1], -1.25);
      expect(restored.weights[1][0], 2);
    });

    test('odrzuca wektor cech o złej długości', () {
      final SoftmaxClassifier classifier = SoftmaxClassifier(
        weights: zeroWeights(2, 3),
      );

      expect(
        () => classifier.predict(<double>[1, 0]),
        throwsA(isA<ArgumentError>()),
      );
    });

    test('entropia znormalizowana: 1 dla rozkładu jednostajnego, 0 dla pewności', () {
      expect(
        SoftmaxClassifier.normalizedEntropy(<double>[0.25, 0.25, 0.25, 0.25]),
        closeTo(1, 1e-9),
      );
      expect(
        SoftmaxClassifier.normalizedEntropy(<double>[1, 0, 0, 0]),
        closeTo(0, 1e-9),
      );
    });
  });
}
