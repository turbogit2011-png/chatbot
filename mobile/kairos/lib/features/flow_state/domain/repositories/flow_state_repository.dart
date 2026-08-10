import '../../../../core/math/signal_features.dart';
import '../../../../core/result/typedefs.dart';
import '../entities/flow_state.dart';
import '../entities/state_reading.dart';
import '../services/flow_classifier.dart';

/// Kontrakt warstwy wnioskowania o stanie poznawczym.
abstract interface class FlowStateRepository {
  /// Kolejne odczyty stanu (jeden na okno obserwacji).
  Stream<StateReading> get readings;

  /// Ostatni znany odczyt — `null`, dopóki nie zamknie się pierwsze okno.
  StateReading? get current;

  /// Liczba kroków douczania osobistego modelu.
  int get calibrationSteps;

  /// Wczytuje zapisane wagi i podpina się pod strumień okien.
  FutureUnit initialize();

  /// Historia odczytów od podanej chwili (rosnąco).
  FutureEither<List<StateReading>> history({required DateTime since});

  /// Liczba okien w każdym ze stanów od podanej chwili.
  FutureEither<Map<FlowState, int>> countsSince(DateTime since);

  /// Douczenie modelu z reakcji użytkownika i natychmiastowy zapis wag.
  FutureUnit calibrate({
    required FeatureVector features,
    required FlowState label,
    required double strength,
  });

  /// Wkład cech w bieżącą decyzję — dane dla panelu wyjaśnień.
  List<FeatureContribution> explain(StateReading reading);

  /// Przywraca wagi startowe (ustawienia → „Zapomnij, czego się nauczyłeś”).
  FutureUnit resetModel();

  Future<void> dispose();
}
