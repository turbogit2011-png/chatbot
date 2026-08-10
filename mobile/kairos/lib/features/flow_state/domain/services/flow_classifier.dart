import '../../../../core/math/logistic_regression.dart';
import '../../../../core/math/signal_features.dart';
import '../entities/flow_state.dart';
import '../entities/state_reading.dart';

/// Serwis domenowy: zamienia wektor cech w [StateReading].
///
/// Odpowiada za trzy rzeczy, których nie ma w samym klasyfikatorze:
/// 1. **wagi startowe** — wiedza ekspercka zakodowana wprost, dzięki czemu
///    aplikacja działa sensownie od pierwszej minuty, bez fazy „zbierania danych”,
/// 2. **histereza** — stan zmienia się dopiero, gdy przewaga nowego kandydata
///    utrzyma się przez kilka okien; bez tego UI migotałby co 30 sekund,
/// 3. **douczanie** — jeden krok SGD z reakcji użytkownika.
class FlowClassifier {
  FlowClassifier({
    SoftmaxClassifier? model,
    this.switchMargin = 0.06,
    this.requiredStreak = 2,
  }) : _model = model ?? priorModel();

  SoftmaxClassifier _model;

  /// O ile nowy kandydat musi wyprzedzić stan bieżący, żeby w ogóle liczyć się
  /// do zmiany.
  final double switchMargin;

  /// Ile kolejnych okien kandydat musi wygrywać, zanim przejmie stan.
  final int requiredStreak;

  FlowState? _current;
  FlowState? _candidate;
  int _candidateStreak = 0;

  SoftmaxClassifier get model => _model;

  FlowState? get currentState => _current;

  /// Liczba kroków douczania — miara „jak dobrze Kairos Cię zna”.
  int get calibrationSteps => _model.updateCount;

  /// Podmienia model (np. po wczytaniu wag z bazy) i zeruje histerezę.
  void replaceModel(SoftmaxClassifier model) {
    _model = model;
    _candidate = null;
    _candidateStreak = 0;
  }

  /// Klasyfikuje okno obserwacji.
  StateReading classify(
    FeatureVector features, {
    required DateTime at,
    int? windowId,
  }) {
    final List<double> probabilities = _model.predict(features.values);
    final FlowState predicted = FlowState.values[_model.argmax(probabilities)];
    final FlowState? current = _current;

    FlowState effective;
    bool settled;

    if (current == null) {
      effective = predicted;
      settled = true;
      _candidate = null;
      _candidateStreak = 0;
    } else if (predicted == current) {
      effective = current;
      settled = true;
      _candidate = null;
      _candidateStreak = 0;
    } else {
      final double advantage =
          probabilities[predicted.index] - probabilities[current.index];

      if (advantage < switchMargin) {
        effective = current;
        settled = true;
        _candidate = null;
        _candidateStreak = 0;
      } else {
        if (_candidate == predicted) {
          _candidateStreak++;
        } else {
          _candidate = predicted;
          _candidateStreak = 1;
        }

        if (_candidateStreak >= requiredStreak) {
          effective = predicted;
          settled = true;
          _candidate = null;
          _candidateStreak = 0;
        } else {
          effective = current;
          settled = false;
        }
      }
    }

    _current = effective;

    return StateReading(
      at: at,
      state: effective,
      confidence: probabilities[effective.index],
      probabilities: probabilities,
      features: features,
      windowId: windowId,
      isSettled: settled,
    );
  }

  /// Douczenie z reakcji użytkownika. [strength] < 1 dla sygnałów słabych
  /// (np. zignorowana interwencja), 1 dla wprost wskazanego stanu.
  void calibrate({
    required FeatureVector features,
    required FlowState label,
    double strength = 1.0,
  }) {
    _model.update(features.values, label.index, sampleWeight: strength.clamp(0.05, 2.0));
  }

  /// Wkład poszczególnych cech w wynik dla danego stanu — dane dla panelu
  /// „dlaczego tak uważam”. Zwraca posortowaną listę (największy wpływ pierwszy).
  List<FeatureContribution> explain(StateReading reading) {
    final List<double> row = _model.weights[reading.state.index];
    final List<FeatureContribution> contributions = <FeatureContribution>[];

    for (final int index in FeatureVector.displayable) {
      contributions.add(
        FeatureContribution(
          featureIndex: index,
          label: FeatureVector.labels[index] ?? FeatureVector.names[index],
          value: reading.features[index],
          contribution: row[index] * reading.features[index],
        ),
      );
    }

    contributions.sort(
      (FeatureContribution a, FeatureContribution b) =>
          b.contribution.abs().compareTo(a.contribution.abs()),
    );
    return contributions;
  }

  /// Wagi startowe: zakodowana wiedza ekspercka o tym, jak wyglądają sygnały
  /// poszczególnych stanów. Model rusza z tego punktu i dopiero się dostraja.
  static SoftmaxClassifier priorModel() {
    final List<List<double>> weights = List<List<double>>.generate(
      FlowState.values.length,
      (_) => List<double>.filled(FeatureVector.length, 0),
      growable: false,
    );

    void w(FlowState state, int feature, double value) {
      weights[state.index][feature] = value;
    }

    // Głębokie skupienie: bezruch, brak przełączeń, długie okno.
    w(FlowState.deepFocus, FeatureVector.bias, 0.20);
    w(FlowState.deepFocus, FeatureVector.stillnessRatio, 2.20);
    w(FlowState.deepFocus, FeatureVector.microMovementRate, -1.20);
    w(FlowState.deepFocus, FeatureVector.motionVariability, -1.40);
    w(FlowState.deepFocus, FeatureVector.foregroundSwitchRate, -1.60);
    w(FlowState.deepFocus, FeatureVector.rotationEnergy, -1.00);
    w(FlowState.deepFocus, FeatureVector.stepRate, -1.00);
    w(FlowState.deepFocus, FeatureVector.sessionLoad, 0.40);

    // Płynna praca: spokojnie, ale nie w bezruchu.
    w(FlowState.flow, FeatureVector.bias, 0.10);
    w(FlowState.flow, FeatureVector.stillnessRatio, 1.20);
    w(FlowState.flow, FeatureVector.motionEnergy, 0.20);
    w(FlowState.flow, FeatureVector.microMovementRate, -0.40);
    w(FlowState.flow, FeatureVector.foregroundSwitchRate, -0.80);
    w(FlowState.flow, FeatureVector.sessionLoad, 0.20);

    // Dryf: rosnące przełączanie i mikroruchy przy zachowanej pozycji.
    w(FlowState.drift, FeatureVector.bias, 0.00);
    w(FlowState.drift, FeatureVector.microMovementRate, 1.60);
    w(FlowState.drift, FeatureVector.foregroundSwitchRate, 1.80);
    w(FlowState.drift, FeatureVector.rotationEnergy, 0.90);
    w(FlowState.drift, FeatureVector.motionVariability, 1.00);
    w(FlowState.drift, FeatureVector.stillnessRatio, -0.80);
    w(FlowState.drift, FeatureVector.sessionLoad, 0.60);

    // Rozbieganie: szarpnięcia, zmiany pozycji, wysoka zmienność.
    w(FlowState.restless, FeatureVector.bias, -0.10);
    w(FlowState.restless, FeatureVector.microMovementRate, 2.00);
    w(FlowState.restless, FeatureVector.jerkRate, 1.60);
    w(FlowState.restless, FeatureVector.motionVariability, 1.50);
    w(FlowState.restless, FeatureVector.postureShiftRate, 1.20);
    w(FlowState.restless, FeatureVector.stillnessRatio, -1.50);

    // Zmęczenie: długa sesja, mało energii, późna pora (hourCos ≈ 1 nocą).
    w(FlowState.fatigue, FeatureVector.bias, -0.20);
    w(FlowState.fatigue, FeatureVector.sessionLoad, 1.80);
    w(FlowState.fatigue, FeatureVector.motionEnergy, -0.80);
    w(FlowState.fatigue, FeatureVector.jerkRate, -0.60);
    w(FlowState.fatigue, FeatureVector.stillnessRatio, 0.80);
    w(FlowState.fatigue, FeatureVector.hourCos, 0.90);

    // Regeneracja: kroki i realny ruch, brak wpatrywania się w ekran.
    w(FlowState.recovery, FeatureVector.bias, -0.20);
    w(FlowState.recovery, FeatureVector.stepRate, 2.40);
    w(FlowState.recovery, FeatureVector.motionEnergy, 1.20);
    w(FlowState.recovery, FeatureVector.stillnessRatio, -1.60);
    w(FlowState.recovery, FeatureVector.foregroundSwitchRate, -0.60);
    w(FlowState.recovery, FeatureVector.charging, -0.20);

    return SoftmaxClassifier(weights: weights);
  }
}

/// Wkład pojedynczej cechy w decyzję modelu.
class FeatureContribution {
  const FeatureContribution({
    required this.featureIndex,
    required this.label,
    required this.value,
    required this.contribution,
  });

  final int featureIndex;
  final String label;

  /// Znormalizowana wartość cechy w tym oknie (0–1).
  final double value;

  /// waga × wartość — dodatnia „za”, ujemna „przeciw”.
  final double contribution;
}
