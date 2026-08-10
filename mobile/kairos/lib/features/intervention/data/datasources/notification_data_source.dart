import 'dart:async';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../../core/logging/app_logger.dart';
import '../../domain/entities/intervention.dart';

/// Doręczanie interwencji poza aplikacją.
///
/// Powiadomienie jest ciche z założenia (bez dźwięku, bez znaczka na ikonie) —
/// aplikacja, która walczy o uwagę, nie może sama krzyczeć.
class NotificationDataSource {
  NotificationDataSource({FlutterLocalNotificationsPlugin? plugin})
    : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final FlutterLocalNotificationsPlugin _plugin;

  static const AppLogger _log = AppLogger('notifications');

  static const String channelId = 'kairos_interventions';
  static const String channelName = 'Interwencje Kairos';
  static const String channelDescription =
      'Pojedyncze zdanie w momencie, w którym uwaga zaczyna odpływać.';

  static const int _notificationId = 4201;

  final StreamController<String> _taps = StreamController<String>.broadcast();

  /// Identyfikatory interwencji, których powiadomienie dotknął użytkownik.
  Stream<String> get taps => _taps.stream;

  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) {
      return;
    }

    const AndroidInitializationSettings android = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const DarwinInitializationSettings darwin = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: darwin),
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        final String? payload = response.payload;
        if (payload != null && payload.isNotEmpty && !_taps.isClosed) {
          _taps.add(payload);
        }
      },
    );

    _initialized = true;
    _log.info('Kanał powiadomień gotowy');
  }

  /// Prosi o zgodę na powiadomienia. Zwraca `true`, gdy zgoda jest udzielona.
  Future<bool> ensurePermission() async {
    final PermissionStatus status = await Permission.notification.status;
    if (status.isGranted) {
      return true;
    }
    if (status.isPermanentlyDenied) {
      return false;
    }
    final PermissionStatus result = await Permission.notification.request();
    return result.isGranted;
  }

  Future<bool> hasPermission() async => Permission.notification.isGranted;

  Future<void> deliver(Intervention intervention) async {
    await initialize();

    const AndroidNotificationDetails android = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDescription,
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
      playSound: false,
      enableVibration: false,
      onlyAlertOnce: true,
      showWhen: true,
      category: AndroidNotificationCategory.reminder,
    );
    const DarwinNotificationDetails darwin = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: false,
      presentSound: false,
    );

    await _plugin.show(
      _notificationId,
      intervention.state.label,
      intervention.message,
      const NotificationDetails(android: android, iOS: darwin),
      payload: intervention.id,
    );
    _log.info('Doręczono interwencję ${intervention.id}');
  }

  Future<void> cancelAll() => _plugin.cancelAll();

  Future<void> dispose() async {
    await _taps.close();
  }
}
