import 'package:shared_preferences/shared_preferences.dart';

import '../../features/settings/domain/entities/app_settings.dart';

/// Trwałość ustawień. Świadomie oddzielona od bazy — ustawienia czyta się przy
/// starcie synchronicznie, a dane behawioralne nie.
class PreferencesStore {
  const PreferencesStore(this._prefs);

  final SharedPreferences _prefs;

  static Future<PreferencesStore> open() async =>
      PreferencesStore(await SharedPreferences.getInstance());

  static const String _themeMode = 'settings.themeMode';
  static const String _onboarding = 'settings.onboardingCompleted';
  static const String _interventions = 'settings.interventionsEnabled';
  static const String _notifications = 'settings.notificationsEnabled';
  static const String _background = 'settings.backgroundEnabled';
  static const String _localModel = 'settings.localModelEnabled';
  static const String _sensitivity = 'settings.sensitivity';
  static const String _cooldown = 'settings.cooldownMinutes';
  static const String _dailyLimit = 'settings.dailyLimit';
  static const String _quietStart = 'settings.quietStartMinutes';
  static const String _quietEnd = 'settings.quietEndMinutes';

  AppSettings read() {
    const AppSettings defaults = AppSettings.defaults;
    return AppSettings(
      themeMode: AppThemeMode.fromId(_prefs.getString(_themeMode)),
      onboardingCompleted:
          _prefs.getBool(_onboarding) ?? defaults.onboardingCompleted,
      interventionsEnabled:
          _prefs.getBool(_interventions) ?? defaults.interventionsEnabled,
      notificationsEnabled:
          _prefs.getBool(_notifications) ?? defaults.notificationsEnabled,
      backgroundEnabled:
          _prefs.getBool(_background) ?? defaults.backgroundEnabled,
      localModelEnabled:
          _prefs.getBool(_localModel) ?? defaults.localModelEnabled,
      sensitivity: _prefs.getDouble(_sensitivity) ?? defaults.sensitivity,
      cooldownMinutes: _prefs.getInt(_cooldown) ?? defaults.cooldownMinutes,
      dailyLimit: _prefs.getInt(_dailyLimit) ?? defaults.dailyLimit,
      quietStartMinutes:
          _prefs.getInt(_quietStart) ?? defaults.quietStartMinutes,
      quietEndMinutes: _prefs.getInt(_quietEnd) ?? defaults.quietEndMinutes,
    );
  }

  Future<void> write(AppSettings settings) async {
    await Future.wait<bool>(<Future<bool>>[
      _prefs.setString(_themeMode, settings.themeMode.id),
      _prefs.setBool(_onboarding, settings.onboardingCompleted),
      _prefs.setBool(_interventions, settings.interventionsEnabled),
      _prefs.setBool(_notifications, settings.notificationsEnabled),
      _prefs.setBool(_background, settings.backgroundEnabled),
      _prefs.setBool(_localModel, settings.localModelEnabled),
      _prefs.setDouble(_sensitivity, settings.sensitivity),
      _prefs.setInt(_cooldown, settings.cooldownMinutes),
      _prefs.setInt(_dailyLimit, settings.dailyLimit),
      _prefs.setInt(_quietStart, settings.quietStartMinutes),
      _prefs.setInt(_quietEnd, settings.quietEndMinutes),
    ]);
  }

  Future<void> clear() => _prefs.clear();
}
