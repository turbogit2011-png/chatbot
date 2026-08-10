import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/logging/app_logger.dart';
import '../data/database/kairos_database.dart';
import '../data/preferences/preferences_store.dart';
import 'di.dart';
import 'kairos_app.dart';

const AppLogger _log = AppLogger('bootstrap');

/// Start aplikacji.
///
/// Baza i ustawienia są otwierane **przed** pierwszą klatką i wstrzykiwane
/// jako nadpisania providerów — dzięki temu żaden ekran nie musi obsługiwać
/// stanu „fundamenty się ładują”, a repozytoria dostają zależności
/// synchronicznie.
Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    _log.error('Błąd Fluttera', details.exception, details.stack);
  };

  PlatformDispatcher.instance.onError = (Object error, StackTrace stackTrace) {
    _log.error('Nieobsłużony błąd', error, stackTrace);
    return true;
  };

  await SystemChrome.setPreferredOrientations(<DeviceOrientation>[
    DeviceOrientation.portraitUp,
  ]);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  final KairosDatabase database = await KairosDatabase.open();
  // Higiena danych przy każdym starcie: surowe okna cech nie mają prawa
  // zalegać na urządzeniu dłużej niż to potrzebne.
  unawaited(database.applyRetentionPolicy());

  final PreferencesStore preferences = await PreferencesStore.open();

  runApp(
    ProviderScope(
      overrides: <Override>[
        databaseProvider.overrideWithValue(database),
        preferencesProvider.overrideWithValue(preferences),
      ],
      child: const KairosApp(),
    ),
  );
}
