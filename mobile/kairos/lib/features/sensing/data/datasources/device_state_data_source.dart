import 'dart:async';

import 'package:battery_plus/battery_plus.dart';
import 'package:pedometer/pedometer.dart';

import '../../../../core/logging/app_logger.dart';

/// Stan urządzenia: ładowanie i krokomierz systemowy.
///
/// Oba źródła są opcjonalne — na urządzeniu bez krokomierza albo przy braku
/// zgody na rozpoznawanie aktywności aplikacja działa dalej, tylko z uboższym
/// wektorem cech. Dlatego każdy strumień ma tu jawną obsługę błędu, a nie
/// „poleci wyjątek i zobaczymy”.
class DeviceStateDataSource {
  DeviceStateDataSource({Battery? battery})
    : _battery = battery ?? Battery();

  final Battery _battery;

  static const AppLogger _log = AppLogger('device-state');

  /// `true`, gdy telefon jest podłączony do zasilania.
  Future<bool> isCharging() async {
    try {
      final BatteryState state = await _battery.batteryState;
      return state == BatteryState.charging || state == BatteryState.full;
    } on Object catch (error) {
      _log.warning('Nie udało się odczytać stanu baterii', error);
      return false;
    }
  }

  /// Zmiany stanu ładowania. Błąd strumienia degraduje się do „nie ładuje”.
  Stream<bool> chargingChanges() {
    return _battery.onBatteryStateChanged
        .map(
          (BatteryState state) =>
              state == BatteryState.charging || state == BatteryState.full,
        )
        .handleError((Object error) {
          _log.warning('Strumień baterii zgłosił błąd', error);
        });
  }

  /// Skumulowany licznik kroków. Zwraca pusty strumień, gdy czujnik jest
  /// niedostępny lub użytkownik nie wyraził zgody.
  Stream<int> stepCount() {
    try {
      return Pedometer.stepCountStream
          .map((StepCount event) => event.steps)
          .handleError((Object error) {
            _log.warning('Krokomierz niedostępny — pomijam cechę', error);
          });
    } on Object catch (error) {
      _log.warning('Nie udało się otworzyć krokomierza', error);
      return const Stream<int>.empty();
    }
  }
}
