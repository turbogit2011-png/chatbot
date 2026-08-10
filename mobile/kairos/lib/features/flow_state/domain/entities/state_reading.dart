import '../../../../core/math/logistic_regression.dart';
import '../../../../core/math/signal_features.dart';
import 'flow_state.dart';

/// Pojedynczy odczyt stanu poznawczego wraz z pełnym kontekstem decyzji.
///
/// Przechowujemy cały rozkład prawdopodobieństw i wektor cech, bo bez nich
/// nie da się ani wyjaśnić decyzji użytkownikowi, ani douczyć modelu z jego
/// reakcji po fakcie.
class StateReading {
  const StateReading({
    required this.at,
    required this.state,
    required this.confidence,
    required this.probabilities,
    required this.features,
    this.id,
    this.windowId,
    this.isSettled = true,
  });

  final int? id;
  final DateTime at;
  final FlowState state;

  /// Prawdopodobieństwo przypisane [state] przez model (0–1).
  final double confidence;

  /// Pełny rozkład po wszystkich stanach, w kolejności `FlowState.values`.
  final List<double> probabilities;

  final FeatureVector features;
  final int? windowId;

  /// `false`, gdy model wskazuje już inny stan, ale histereza jeszcze go nie
  /// potwierdziła — UI sygnalizuje wtedy „stan się zmienia”.
  final bool isSettled;

  /// Niepewność modelu (0 = pewny, 1 = kompletnie niezdecydowany).
  double get uncertainty => SoftmaxClassifier.normalizedEntropy(probabilities);

  /// Drugi najbardziej prawdopodobny stan — używany w panelu wyjaśnień.
  FlowState get runnerUp {
    int best = -1;
    for (int i = 0; i < probabilities.length; i++) {
      if (i == state.index) {
        continue;
      }
      if (best == -1 || probabilities[i] > probabilities[best]) {
        best = i;
      }
    }
    return FlowState.values[best == -1 ? state.index : best];
  }

  double probabilityOf(FlowState value) =>
      value.index < probabilities.length ? probabilities[value.index] : 0;

  StateReading copyWith({
    int? id,
    DateTime? at,
    FlowState? state,
    double? confidence,
    List<double>? probabilities,
    FeatureVector? features,
    int? windowId,
    bool? isSettled,
  }) {
    return StateReading(
      id: id ?? this.id,
      at: at ?? this.at,
      state: state ?? this.state,
      confidence: confidence ?? this.confidence,
      probabilities: probabilities ?? this.probabilities,
      features: features ?? this.features,
      windowId: windowId ?? this.windowId,
      isSettled: isSettled ?? this.isSettled,
    );
  }

  @override
  String toString() =>
      'StateReading(${state.id}, ${(confidence * 100).toStringAsFixed(0)}%, $at)';
}
