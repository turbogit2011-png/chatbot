import 'dart:io' show Platform;
import 'dart:isolate';

import 'package:flutter_foreground_task/flutter_foreground_task.dart';

import '../../../../core/logging/app_logger.dart';

/// Utrzymywanie nasłuchu przy życiu na Androidzie.
///
/// Model działania jest celowo prosty: usługa pierwszoplanowa nie duplikuje
/// logiki próbkowania w osobnym izolacie (co oznaczałoby drugie połączenie z
/// bazą i ryzyko wyścigów), tylko **utrzymuje proces aplikacji przy życiu**,
/// żeby istniejące subskrypcje czujników i timery działały dalej. Handler w
/// izolacie usługi jest wyłącznie biciem serca.
///
/// Na iOS ta klasa jest no-opem — system nie pozwala na ciągłe próbkowanie w
/// tle, a udawanie inaczej byłoby okłamywaniem użytkownika. Tam Kairos czyta
/// sygnał na pierwszym planie i przy przebudzeniach `BGAppRefreshTask`.
///
/// ────────────────────────────────────────────────────────────────────────
/// Drugi (obok `gemma_llm_engine.dart`) plik zależny od API pluginu.
/// Jeśli rozwiązana wersja `flutter_foreground_task` różni się API, to jedyne
/// miejsce do dostosowania — aplikacja działa bez niego na pierwszym planie.
/// ────────────────────────────────────────────────────────────────────────
class BackgroundSensingService {
  const BackgroundSensingService();

  static const AppLogger _log = AppLogger('background');

  static const String channelId = 'kairos_sensing';

  bool get isSupported => Platform.isAndroid;

  /// Konfiguruje kanał i parametry usługi. Bezpieczne do wielokrotnego wywołania.
  Future<void> configure() async {
    if (!isSupported) {
      return;
    }

    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: channelId,
        channelName: 'Nasłuch Kairos',
        channelDescription:
            'Informuje, że Kairos czyta sygnał z czujników ruchu.',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
        playSound: false,
        enableVibration: false,
        showWhen: false,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: false,
        playSound: false,
      ),
      foregroundTaskOptions: const ForegroundTaskOptions(
        interval: 60000,
        isOnceEvent: false,
        autoRunOnBoot: false,
        allowWakeLock: true,
        allowWifiLock: false,
      ),
    );
  }

  /// Uruchamia usługę. Zwraca `false`, gdy platforma jej nie wspiera lub
  /// system odmówił.
  Future<bool> start({required String stateLabel}) async {
    if (!isSupported) {
      return false;
    }

    try {
      await configure();

      if (await FlutterForegroundTask.isRunningService) {
        await updateNotification(stateLabel: stateLabel);
        return true;
      }

      await FlutterForegroundTask.startService(
        notificationTitle: 'Kairos czuwa',
        notificationText: stateLabel,
        callback: startBackgroundCallback,
      );

      _log.info('Usługa pierwszoplanowa uruchomiona');
      return true;
    } on Object catch (error, stackTrace) {
      _log.error('Nie udało się uruchomić usługi w tle', error, stackTrace);
      return false;
    }
  }

  /// Aktualizuje treść stałej notyfikacji (np. bieżący stan poznawczy).
  Future<void> updateNotification({required String stateLabel}) async {
    if (!isSupported) {
      return;
    }
    try {
      if (await FlutterForegroundTask.isRunningService) {
        await FlutterForegroundTask.updateService(
          notificationTitle: 'Kairos czuwa',
          notificationText: stateLabel,
        );
      }
    } on Object catch (error) {
      _log.warning('Nie udało się zaktualizować notyfikacji usługi', error);
    }
  }

  Future<void> stop() async {
    if (!isSupported) {
      return;
    }
    try {
      if (await FlutterForegroundTask.isRunningService) {
        await FlutterForegroundTask.stopService();
        _log.info('Usługa pierwszoplanowa zatrzymana');
      }
    } on Object catch (error, stackTrace) {
      _log.error('Nie udało się zatrzymać usługi', error, stackTrace);
    }
  }
}

/// Punkt wejścia izolatu usługi. Musi być funkcją najwyższego poziomu
/// z adnotacją `@pragma('vm:entry-point')`, inaczej AOT ją usunie.
@pragma('vm:entry-point')
void startBackgroundCallback() {
  FlutterForegroundTask.setTaskHandler(_HeartbeatTaskHandler());
}

/// Bicie serca: sam fakt istnienia usługi trzyma proces aplikacji przy życiu.
class _HeartbeatTaskHandler extends TaskHandler {
  static const AppLogger _log = AppLogger('background-task');

  @override
  Future<void> onStart(DateTime timestamp, SendPort? sendPort) async {
    _log.info('Izolat usługi wystartował');
  }

  @override
  Future<void> onRepeatEvent(DateTime timestamp, SendPort? sendPort) async {
    // Świadomie pusto — próbkowanie i klasyfikacja żyją w izolacie głównym.
  }

  @override
  Future<void> onDestroy(DateTime timestamp, SendPort? sendPort) async {
    _log.info('Izolat usługi zakończony');
  }
}
