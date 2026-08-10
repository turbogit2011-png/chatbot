import '../../../intervention/domain/services/intervention_policy.dart';

/// Tryb motywu — własny enum, żeby domena nie zależała od Fluttera.
enum AppThemeMode {
  system('system', 'Jak w systemie'),
  light('light', 'Jasny'),
  dark('dark', 'Ciemny');

  const AppThemeMode(this.id, this.label);

  final String id;
  final String label;

  static AppThemeMode fromId(String? id) => AppThemeMode.values.firstWhere(
    (AppThemeMode value) => value.id == id,
    orElse: () => AppThemeMode.dark,
  );
}

/// Ustawienia aplikacji. Wszystkie trzymane lokalnie, żadne nie są wysyłane.
class AppSettings {
  const AppSettings({
    this.themeMode = AppThemeMode.dark,
    this.onboardingCompleted = false,
    this.interventionsEnabled = true,
    this.notificationsEnabled = true,
    this.backgroundEnabled = false,
    this.localModelEnabled = true,
    this.sensitivity = 0.5,
    this.cooldownMinutes = 25,
    this.dailyLimit = 6,
    this.quietStartMinutes = 22 * 60 + 30,
    this.quietEndMinutes = 7 * 60,
  });

  static const AppSettings defaults = AppSettings();

  final AppThemeMode themeMode;
  final bool onboardingCompleted;

  /// Główny wyłącznik interwencji.
  final bool interventionsEnabled;

  /// Czy doręczać powiadomieniem systemowym (poza aplikacją).
  final bool notificationsEnabled;

  /// Czy trzymać nasłuch przy życiu w tle (Android: usługa pierwszoplanowa).
  final bool backgroundEnabled;

  /// Czy używać lokalnego modelu językowego, jeśli wagi są zainstalowane.
  final bool localModelEnabled;

  /// 0 = odzywaj się rzadko i tylko przy pewnych odczytach,
  /// 1 = odzywaj się chętnie.
  final double sensitivity;

  final int cooldownMinutes;
  final int dailyLimit;
  final int quietStartMinutes;
  final int quietEndMinutes;

  /// Czułość → minimalna pewność modelu. Zakres 0,75 (ostrożnie) – 0,40 (chętnie).
  double get minConfidence => 0.75 - 0.35 * sensitivity.clamp(0.0, 1.0);

  /// Zamienia ustawienia na parametry polityki przerywania.
  PolicyConfig toPolicyConfig() => PolicyConfig(
    enabled: interventionsEnabled,
    minConfidence: minConfidence,
    cooldown: Duration(minutes: cooldownMinutes),
    dailyLimit: dailyLimit,
    quietStartMinutes: quietStartMinutes,
    quietEndMinutes: quietEndMinutes,
    deliverAsNotification: notificationsEnabled,
    useLocalModel: localModelEnabled,
  );

  AppSettings copyWith({
    AppThemeMode? themeMode,
    bool? onboardingCompleted,
    bool? interventionsEnabled,
    bool? notificationsEnabled,
    bool? backgroundEnabled,
    bool? localModelEnabled,
    double? sensitivity,
    int? cooldownMinutes,
    int? dailyLimit,
    int? quietStartMinutes,
    int? quietEndMinutes,
  }) {
    return AppSettings(
      themeMode: themeMode ?? this.themeMode,
      onboardingCompleted: onboardingCompleted ?? this.onboardingCompleted,
      interventionsEnabled: interventionsEnabled ?? this.interventionsEnabled,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      backgroundEnabled: backgroundEnabled ?? this.backgroundEnabled,
      localModelEnabled: localModelEnabled ?? this.localModelEnabled,
      sensitivity: sensitivity ?? this.sensitivity,
      cooldownMinutes: cooldownMinutes ?? this.cooldownMinutes,
      dailyLimit: dailyLimit ?? this.dailyLimit,
      quietStartMinutes: quietStartMinutes ?? this.quietStartMinutes,
      quietEndMinutes: quietEndMinutes ?? this.quietEndMinutes,
    );
  }
}
