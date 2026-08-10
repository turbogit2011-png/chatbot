import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/di.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../flow_state/presentation/providers/flow_state_providers.dart';
import '../../../intervention/presentation/providers/intervention_providers.dart';
import '../../domain/entities/app_settings.dart';
import '../providers/settings_providers.dart';

/// Czy plik wag lokalnego modelu jest obecny na urządzeniu.
final FutureProvider<bool> localModelInstalledProvider = FutureProvider<bool>(
  (Ref ref) => ref.watch(gemmaEngineProvider).isInstalled(),
);

/// Ustawienia — jedno miejsce, w którym użytkownik decyduje, ile Kairos może.
class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AppSettings settings = ref.watch(settingsProvider);
    final SettingsController controller = ref.read(settingsProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Ustawienia')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppGeometry.spaceLg,
          AppGeometry.spaceXs,
          AppGeometry.spaceLg,
          AppGeometry.spaceXxl,
        ),
        children: <Widget>[
          const SectionLabel('Wygląd'),
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                SegmentedButton<AppThemeMode>(
                  segments: AppThemeMode.values
                      .map(
                        (AppThemeMode mode) => ButtonSegment<AppThemeMode>(
                          value: mode,
                          label: Text(mode.label),
                        ),
                      )
                      .toList(growable: false),
                  selected: <AppThemeMode>{settings.themeMode},
                  showSelectedIcon: false,
                  onSelectionChanged: (Set<AppThemeMode> selection) =>
                      controller.setThemeMode(selection.first),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppGeometry.spaceLg),
          const SectionLabel('Interwencje'),
          GlassCard(
            child: Column(
              children: <Widget>[
                SwitchListTile(
                  value: settings.interventionsEnabled,
                  onChanged: (bool value) =>
                      controller.setInterventionsEnabled(enabled: value),
                  title: const Text('Pozwól się odzywać'),
                  subtitle: const Text(
                    'Wyłączone = Kairos tylko obserwuje i milczy.',
                  ),
                  contentPadding: EdgeInsets.zero,
                ),
                SwitchListTile(
                  value: settings.notificationsEnabled,
                  onChanged: settings.interventionsEnabled
                      ? (bool value) =>
                            controller.setNotificationsEnabled(enabled: value)
                      : null,
                  title: const Text('Powiadomienia systemowe'),
                  subtitle: const Text(
                    'Ciche, bez dźwięku i wibracji. Wyłączone = tylko w aplikacji.',
                  ),
                  contentPadding: EdgeInsets.zero,
                ),
                const Divider(),
                _SensitivitySlider(
                  value: settings.sensitivity,
                  minConfidence: settings.minConfidence,
                  onChanged: controller.setSensitivity,
                ),
                const Divider(),
                _DailyLimitRow(
                  value: settings.dailyLimit,
                  onChanged: controller.setDailyLimit,
                ),
                const Divider(),
                _QuietHoursRow(settings: settings, controller: controller),
              ],
            ),
          ),

          const SizedBox(height: AppGeometry.spaceLg),
          const SectionLabel('Praca w tle'),
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                SwitchListTile(
                  value: settings.backgroundEnabled,
                  onChanged: (bool value) =>
                      controller.setBackgroundEnabled(enabled: value),
                  title: const Text('Nasłuch poza aplikacją (Android)'),
                  subtitle: const Text(
                    'Uruchamia usługę pierwszoplanową ze stałą, cichą '
                    'notyfikacją. Bez niej Android usypia proces.',
                  ),
                  contentPadding: EdgeInsets.zero,
                ),
                Text(
                  'Na iOS system nie pozwala na ciągły nasłuch w tle — tam '
                  'Kairos czyta sygnał, gdy aplikacja jest otwarta.',
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ],
            ),
          ),

          const SizedBox(height: AppGeometry.spaceLg),
          const SectionLabel('Lokalny model językowy'),
          const _LocalModelCard(),

          const SizedBox(height: AppGeometry.spaceLg),
          const SectionLabel('Prywatność i dane'),
          const _PrivacyCard(),

          const SizedBox(height: AppGeometry.spaceLg),
          const _AboutCard(),
        ],
      ),
    );
  }
}

class _SensitivitySlider extends StatelessWidget {
  const _SensitivitySlider({
    required this.value,
    required this.minConfidence,
    required this.onChanged,
  });

  final double value;
  final double minConfidence;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text('Czułość', style: text.titleSmall),
        Text(
          'Odezwę się dopiero przy pewności ${(minConfidence * 100).round()}%.',
          style: text.bodySmall,
        ),
        Slider(
          value: value,
          onChanged: onChanged,
          divisions: 10,
          label: value < 0.34
              ? 'ostrożnie'
              : (value < 0.67 ? 'wyważenie' : 'chętnie'),
        ),
      ],
    );
  }
}

class _DailyLimitRow extends StatelessWidget {
  const _DailyLimitRow({required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return Row(
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Limit na dobę', style: text.titleSmall),
              Text('Twardy sufit, niezależny od czułości.', style: text.bodySmall),
            ],
          ),
        ),
        IconButton(
          onPressed: value > 1 ? () => onChanged(value - 1) : null,
          icon: const Icon(Icons.remove_circle_outline_rounded),
        ),
        Text('$value', style: text.titleMedium),
        IconButton(
          onPressed: value < 24 ? () => onChanged(value + 1) : null,
          icon: const Icon(Icons.add_circle_outline_rounded),
        ),
      ],
    );
  }
}

class _QuietHoursRow extends StatelessWidget {
  const _QuietHoursRow({required this.settings, required this.controller});

  final AppSettings settings;
  final SettingsController controller;

  static String _format(int minutes) {
    final int hour = minutes ~/ 60;
    final int minute = minutes % 60;
    return '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
  }

  Future<void> _pick(BuildContext context, {required bool start}) async {
    final int current = start
        ? settings.quietStartMinutes
        : settings.quietEndMinutes;

    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: current ~/ 60, minute: current % 60),
    );
    if (picked == null) {
      return;
    }

    final int minutes = picked.hour * 60 + picked.minute;
    await controller.setQuietHours(
      startMinutes: start ? minutes : settings.quietStartMinutes,
      endMinutes: start ? settings.quietEndMinutes : minutes,
    );
  }

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return Row(
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Cisza nocna', style: text.titleSmall),
              Text('W tych godzinach nie odezwę się nigdy.', style: text.bodySmall),
            ],
          ),
        ),
        TextButton(
          onPressed: () => _pick(context, start: true),
          child: Text(_format(settings.quietStartMinutes)),
        ),
        Text('–', style: text.bodySmall),
        TextButton(
          onPressed: () => _pick(context, start: false),
          child: Text(_format(settings.quietEndMinutes)),
        ),
      ],
    );
  }
}

class _LocalModelCard extends ConsumerWidget {
  const _LocalModelCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;
    final AppSettings settings = ref.watch(settingsProvider);
    final AsyncValue<bool> installed = ref.watch(localModelInstalledProvider);

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SwitchListTile(
            value: settings.localModelEnabled,
            onChanged: (bool value) =>
                ref.read(settingsProvider.notifier).setLocalModelEnabled(
                  enabled: value,
                ),
            title: const Text('Używaj modelu lokalnego'),
            subtitle: const Text(
              'Większa różnorodność zdań. Wyłączone = silnik kompozycyjny.',
            ),
            contentPadding: EdgeInsets.zero,
          ),
          const Divider(),
          Row(
            children: <Widget>[
              Icon(
                installed.valueOrNull ?? false
                    ? Icons.check_circle_outline_rounded
                    : Icons.info_outline_rounded,
                size: 18,
                color: installed.valueOrNull ?? false
                    ? palette.positive
                    : palette.textTertiary,
              ),
              const SizedBox(width: AppGeometry.spaceXs),
              Expanded(
                child: Text(
                  switch (installed) {
                    AsyncData<bool>(value: final bool value) => value
                        ? 'Wagi modelu są zainstalowane na urządzeniu.'
                        : 'Brak wag modelu — aplikacja działa na silniku '
                              'kompozycyjnym i nic nie pobiera.',
                    AsyncError<bool>() =>
                      'Nie udało się sprawdzić obecności modelu.',
                    _ => 'Sprawdzam…',
                  },
                  style: text.bodySmall,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppGeometry.spaceXs),
          Text(
            'Model instaluje się ręcznie, jednorazowo — instrukcja w '
            'DEPLOYMENT.md. Kairos nigdy nie pobiera go sam.',
            style: text.labelSmall,
          ),
        ],
      ),
    );
  }
}

class _PrivacyCard extends ConsumerWidget {
  const _PrivacyCard();

  Future<void> _confirmAndRun(
    BuildContext context, {
    required String title,
    required String message,
    required Future<void> Function() action,
  }) async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Anuluj'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Tak, usuń'),
          ),
        ],
      ),
    );

    if (confirmed ?? false) {
      await action();
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final TextTheme text = Theme.of(context).textTheme;

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Wszystkie dane — odczyty, interwencje i wagi modelu — są zapisane '
            'wyłącznie na tym urządzeniu. Aplikacja nie ma serwera ani konta.',
            style: text.bodySmall,
          ),
          const SizedBox(height: AppGeometry.spaceMd),
          OutlinedButton.icon(
            onPressed: () => _confirmAndRun(
              context,
              title: 'Zapomnieć naukę?',
              message:
                  'Model wróci do ustawień startowych. Historia odczytów '
                  'i interwencji zostanie zachowana.',
              action: () async {
                await ref.read(flowStateRepositoryProvider).resetModel();
                ref.invalidate(calibrationStepsProvider);
              },
            ),
            icon: const Icon(Icons.restart_alt_rounded, size: 18),
            label: const Text('Zapomnij, czego się nauczyłeś'),
          ),
          const SizedBox(height: AppGeometry.spaceXs),
          OutlinedButton.icon(
            onPressed: () => _confirmAndRun(
              context,
              title: 'Usunąć wszystkie dane?',
              message:
                  'Nieodwracalnie skasuje odczyty, interwencje, zamiary '
                  'i wagi modelu.',
              action: () async {
                await ref.read(databaseProvider).wipeAll();
                ref
                  ..invalidate(interventionHistoryProvider)
                  ..invalidate(lastInterventionProvider)
                  ..invalidate(intentionProvider)
                  ..invalidate(calibrationStepsProvider);
              },
            ),
            icon: const Icon(Icons.delete_outline_rounded, size: 18),
            label: const Text('Usuń wszystkie dane'),
          ),
        ],
      ),
    );
  }
}

class _AboutCard extends StatelessWidget {
  const _AboutCard();

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('Kairos', style: text.titleMedium),
          const SizedBox(height: AppGeometry.spaceXxs),
          Text(
            'Predykcyjny kopilot uwagi. Cała analiza dzieje się na urządzeniu; '
            'jedyne połączenie sieciowe w cyklu życia aplikacji to opcjonalne, '
            'ręczne wgranie wag modelu.',
            style: text.bodySmall,
          ),
        ],
      ),
    );
  }
}
