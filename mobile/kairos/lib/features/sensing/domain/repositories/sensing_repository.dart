import '../../../../core/result/typedefs.dart';
import '../entities/feature_window.dart';

/// Kontrakt warstwy pozyskiwania sygnału.
///
/// Domena nie wie nic o `sensors_plus`, izolatach ani usłudze
/// pierwszoplanowej — widzi wyłącznie strumień gotowych okien cech.
abstract interface class SensingRepository {
  /// Zamknięte okna obserwacji (domyślnie co 30 s).
  Stream<FeatureWindow> get windows;

  /// Ulotny podgląd sygnału dla UI.
  Stream<LiveSignal> get live;

  bool get isRunning;

  /// Ostatnia migawka — pozwala narysować ekran natychmiast po wejściu,
  /// bez czekania na pierwsze zdarzenie ze strumienia.
  LiveSignal? get lastSignal;

  /// Uruchamia nasłuch czujników. Idempotentne.
  FutureUnit start();

  /// Zatrzymuje nasłuch i zwalnia subskrypcje. Idempotentne.
  FutureUnit stop();

  /// Zgłasza powrót aplikacji na pierwszy plan (cecha `foregroundSwitchRate`).
  void noteForegroundSwitch();

  /// Ustawia obciążenie sesji (0–1) wyliczane przez warstwę wyżej.
  void setSessionLoad(double value);

  Future<void> dispose();
}
