import 'dart:convert';
import 'dart:math' as math;

/// Wieloklasowa regresja logistyczna (softmax) uczona przyrostowo na urządzeniu.
///
/// Dlaczego akurat ona, a nie sieć neuronowa:
/// * **audytowalność** — wagi są liczbami, które można pokazać użytkownikowi
///   („co wpłynęło na tę decyzję”), co jest wprost częścią obietnicy produktu,
/// * **uczenie online** — jeden krok SGD po każdej reakcji użytkownika, bez
///   zbierania zbioru treningowego i bez wysyłania czegokolwiek na serwer,
/// * **zero zależności natywnych** — działa w każdym izolacie, także w tle.
class SoftmaxClassifier {
  SoftmaxClassifier({
    required List<List<double>> weights,
    this.learningRate = 0.06,
    this.l2 = 0.002,
    this.updateCount = 0,
  }) : assert(weights.isNotEmpty, 'Macierz wag nie może być pusta'),
       _weights = weights
           .map((List<double> row) => List<double>.of(row))
           .toList(growable: false);

  factory SoftmaxClassifier.fromJson(Map<String, Object?> json) {
    final Object? rawWeights = json['weights'];
    if (rawWeights is! List) {
      throw const FormatException('Brak macierzy wag w zapisanym modelu');
    }
    final List<List<double>> weights = rawWeights.map((Object? row) {
      if (row is! List) {
        throw const FormatException('Nieprawidłowy wiersz macierzy wag');
      }
      return row
          .map((Object? value) => value is num ? value.toDouble() : 0.0)
          .toList(growable: false);
    }).toList(growable: false);

    final int rowLength = weights.first.length;
    if (weights.any((List<double> row) => row.length != rowLength)) {
      throw const FormatException('Niespójne wymiary macierzy wag');
    }

    return SoftmaxClassifier(
      weights: weights,
      learningRate: (json['learningRate'] as num?)?.toDouble() ?? 0.06,
      l2: (json['l2'] as num?)?.toDouble() ?? 0.002,
      updateCount: (json['updateCount'] as num?)?.toInt() ?? 0,
    );
  }

  final List<List<double>> _weights;
  final double learningRate;
  final double l2;

  /// Liczba wykonanych kroków uczenia — służy do wygaszania kroku uczącego
  /// oraz do pokazania użytkownikowi „jak dobrze mnie już zna”.
  int updateCount;

  int get classCount => _weights.length;

  int get featureCount => _weights.first.length;

  /// Kopia wag do inspekcji (UI wyjaśnialności, testy).
  List<List<double>> get weights => _weights
      .map(List<double>.unmodifiable)
      .toList(growable: false);

  /// Zwraca rozkład prawdopodobieństwa po klasach.
  List<double> predict(List<double> features) {
    _assertFeatureLength(features);

    final List<double> logits = List<double>.filled(classCount, 0);
    for (int c = 0; c < classCount; c++) {
      final List<double> row = _weights[c];
      double sum = 0;
      for (int f = 0; f < featureCount; f++) {
        sum += row[f] * features[f];
      }
      logits[c] = sum;
    }
    return _softmax(logits);
  }

  /// Indeks klasy o najwyższym prawdopodobieństwie.
  int argmax(List<double> probabilities) {
    int best = 0;
    for (int i = 1; i < probabilities.length; i++) {
      if (probabilities[i] > probabilities[best]) {
        best = i;
      }
    }
    return best;
  }

  /// Jeden krok SGD na pojedynczej obserwacji.
  ///
  /// [sampleWeight] pozwala odróżnić sygnał mocny (użytkownik wprost wskazał
  /// stan) od słabego (zignorował powiadomienie).
  void update(List<double> features, int label, {double sampleWeight = 1.0}) {
    _assertFeatureLength(features);
    if (label < 0 || label >= classCount) {
      throw RangeError.index(label, _weights, 'label');
    }

    final List<double> probabilities = predict(features);
    // Wygaszanie kroku uczącego: stabilizuje model, gdy reakcji jest już dużo.
    final double step =
        learningRate * sampleWeight / (1 + updateCount / 200);

    for (int c = 0; c < classCount; c++) {
      final double error = probabilities[c] - (c == label ? 1.0 : 0.0);
      final List<double> row = _weights[c];
      for (int f = 0; f < featureCount; f++) {
        // Bias (indeks 0) celowo bez regularyzacji.
        final double penalty = f == 0 ? 0 : l2 * row[f];
        row[f] -= step * (error * features[f] + penalty);
      }
    }
    updateCount++;
  }

  /// Entropia rozkładu znormalizowana do [0,1] — miara niepewności modelu.
  /// 0 = pełna pewność, 1 = rozkład jednostajny.
  static double normalizedEntropy(List<double> probabilities) {
    if (probabilities.length < 2) {
      return 0;
    }
    double entropy = 0;
    for (final double p in probabilities) {
      if (p > 1e-12) {
        entropy -= p * math.log(p);
      }
    }
    return (entropy / math.log(probabilities.length)).clamp(0.0, 1.0);
  }

  Map<String, Object?> toJson() => <String, Object?>{
    'weights': _weights,
    'learningRate': learningRate,
    'l2': l2,
    'updateCount': updateCount,
  };

  String encode() => jsonEncode(toJson());

  static SoftmaxClassifier decode(String source) {
    final Object? decoded = jsonDecode(source);
    if (decoded is! Map<String, Object?>) {
      throw const FormatException('Zapisany model ma nieoczekiwany kształt');
    }
    return SoftmaxClassifier.fromJson(decoded);
  }

  void _assertFeatureLength(List<double> features) {
    if (features.length != featureCount) {
      throw ArgumentError.value(
        features.length,
        'features',
        'Oczekiwano $featureCount cech',
      );
    }
  }

  static List<double> _softmax(List<double> logits) {
    double maxLogit = logits.first;
    for (final double value in logits) {
      if (value > maxLogit) {
        maxLogit = value;
      }
    }

    double sum = 0;
    final List<double> exponentials = List<double>.filled(logits.length, 0);
    for (int i = 0; i < logits.length; i++) {
      final double value = math.exp(logits[i] - maxLogit);
      exponentials[i] = value;
      sum += value;
    }

    if (sum <= 0 || sum.isNaN) {
      return List<double>.filled(logits.length, 1 / logits.length);
    }
    for (int i = 0; i < exponentials.length; i++) {
      exponentials[i] /= sum;
    }
    return exponentials;
  }
}
