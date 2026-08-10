import 'package:sensors_plus/sensors_plus.dart';

/// Cienka warstwa nad `sensors_plus`.
///
/// Istnieje po to, żeby repozytorium (a tym bardziej domena) nie znało typów
/// pluginu i żeby częstotliwości próbkowania były zdefiniowane w jednym
/// miejscu — mają bezpośredni wpływ na zużycie baterii.
class MotionDataSource {
  const MotionDataSource();

  /// 10 Hz — kompromis między jakością cech ruchu a poborem prądu.
  static const Duration accelerationPeriod = Duration(milliseconds: 100);

  /// 5 Hz — obroty urządzenia zmieniają się wolniej niż drgania.
  static const Duration rotationPeriod = Duration(milliseconds: 200);

  /// 2 Hz — wykrywanie zmiany orientacji nie wymaga gęstego próbkowania.
  static const Duration orientationPeriod = Duration(milliseconds: 500);

  /// Przyspieszenie z odjętą grawitacją — podstawa wszystkich cech ruchu.
  Stream<UserAccelerometerEvent> userAcceleration() =>
      userAccelerometerEventStream(samplingPeriod: accelerationPeriod);

  /// Prędkość kątowa.
  Stream<GyroscopeEvent> rotation() =>
      gyroscopeEventStream(samplingPeriod: rotationPeriod);

  /// Surowe przyspieszenie z grawitacją — służy tylko do wykrywania zmian
  /// orientacji (odłożenie telefonu, podniesienie, obrót).
  Stream<AccelerometerEvent> orientation() =>
      accelerometerEventStream(samplingPeriod: orientationPeriod);
}
