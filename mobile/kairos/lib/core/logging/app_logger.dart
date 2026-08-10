import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';

/// Poziom istotności wpisu.
enum LogLevel { debug, info, warning, error }

/// Minimalny logger oparty na `dart:developer`.
///
/// Świadomie bez zewnętrznej zależności i bez jakiegokolwiek kanału zdalnego —
/// logi nie opuszczają urządzenia, tak samo jak dane użytkownika. W buildzie
/// release wpisy poniżej [LogLevel.warning] są odrzucane.
class AppLogger {
  const AppLogger(this.scope);

  /// Nazwa modułu, np. `sensing`, `flow`, `intervention`.
  final String scope;

  static const int _debugLevelId = 500;
  static const int _infoLevelId = 800;
  static const int _warningLevelId = 900;
  static const int _errorLevelId = 1000;

  void debug(String message) => _log(LogLevel.debug, message);

  void info(String message) => _log(LogLevel.info, message);

  void warning(String message, [Object? error]) =>
      _log(LogLevel.warning, message, error);

  void error(String message, [Object? error, StackTrace? stackTrace]) =>
      _log(LogLevel.error, message, error, stackTrace);

  void _log(
    LogLevel level,
    String message, [
    Object? error,
    StackTrace? stackTrace,
  ]) {
    if (kReleaseMode && level.index < LogLevel.warning.index) {
      return;
    }
    developer.log(
      message,
      name: 'kairos.$scope',
      level: switch (level) {
        LogLevel.debug => _debugLevelId,
        LogLevel.info => _infoLevelId,
        LogLevel.warning => _warningLevelId,
        LogLevel.error => _errorLevelId,
      },
      error: error,
      stackTrace: stackTrace,
    );
  }
}
