import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/di.dart';
import '../../domain/entities/app_settings.dart';

/// Stan ustawień aplikacji. Każda zmiana jest natychmiast utrwalana —
/// nie ma przycisku „Zapisz”, bo nie ma czego potwierdzać.
class SettingsController extends Notifier<AppSettings> {
  @override
  AppSettings build() => ref.read(preferencesProvider).read();

  Future<void> _persist(AppSettings next) async {
    state = next;
    await ref.read(preferencesProvider).write(next);
  }

  Future<void> setThemeMode(AppThemeMode mode) =>
      _persist(state.copyWith(themeMode: mode));

  Future<void> setInterventionsEnabled({required bool enabled}) =>
      _persist(state.copyWith(interventionsEnabled: enabled));

  Future<void> setNotificationsEnabled({required bool enabled}) =>
      _persist(state.copyWith(notificationsEnabled: enabled));

  Future<void> setBackgroundEnabled({required bool enabled}) =>
      _persist(state.copyWith(backgroundEnabled: enabled));

  Future<void> setLocalModelEnabled({required bool enabled}) =>
      _persist(state.copyWith(localModelEnabled: enabled));

  Future<void> setSensitivity(double value) =>
      _persist(state.copyWith(sensitivity: value.clamp(0.0, 1.0)));

  Future<void> setDailyLimit(int value) =>
      _persist(state.copyWith(dailyLimit: value.clamp(1, 24)));

  Future<void> setQuietHours({required int startMinutes, required int endMinutes}) =>
      _persist(
        state.copyWith(
          quietStartMinutes: startMinutes % (24 * 60),
          quietEndMinutes: endMinutes % (24 * 60),
        ),
      );

  /// Wywoływane przez repozytorium interwencji, gdy polityka sama dostosuje
  /// odstęp na podstawie reakcji użytkownika.
  Future<void> setCooldownMinutes(int minutes) =>
      _persist(state.copyWith(cooldownMinutes: minutes));

  Future<void> completeOnboarding() =>
      _persist(state.copyWith(onboardingCompleted: true));

  Future<void> resetToDefaults() => _persist(
    AppSettings.defaults.copyWith(
      onboardingCompleted: state.onboardingCompleted,
    ),
  );
}

final NotifierProvider<SettingsController, AppSettings> settingsProvider =
    NotifierProvider<SettingsController, AppSettings>(SettingsController.new);

/// Tryb motywu przetłumaczony na typ Fluttera — jedyne miejsce styku.
final Provider<ThemeMode> themeModeProvider = Provider<ThemeMode>((Ref ref) {
  final AppThemeMode mode = ref.watch(
    settingsProvider.select((AppSettings settings) => settings.themeMode),
  );
  return switch (mode) {
    AppThemeMode.system => ThemeMode.system,
    AppThemeMode.light => ThemeMode.light,
    AppThemeMode.dark => ThemeMode.dark,
  };
});
