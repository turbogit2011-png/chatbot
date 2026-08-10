import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/di.dart';
import '../../../../app/router/app_router.dart';
import '../../../../core/error/failure.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/aurora_background.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/status_views.dart';
import '../../../flow_state/domain/entities/flow_state.dart';
import '../../../flow_state/domain/entities/state_reading.dart';
import '../../../flow_state/presentation/flow_tone.dart';
import '../../../flow_state/presentation/providers/flow_state_providers.dart';
import '../../../flow_state/presentation/widgets/breathing_ring.dart';
import '../../../flow_state/presentation/widgets/state_timeline.dart';
import '../../../intervention/domain/entities/intervention.dart';
import '../../../intervention/presentation/pages/intervention_sheet.dart';
import '../../../intervention/presentation/providers/intervention_providers.dart';
import '../../../sensing/presentation/providers/sensing_providers.dart';
import '../widgets/intention_card.dart';
import '../widgets/next_step_card.dart';
import '../widgets/signal_strip.dart';

/// Ekran główny „Puls”.
///
/// Hierarchia informacji jest ustawiona pod jedno pytanie, które użytkownik
/// zadaje sobie, odblokowując telefon: *w jakim jestem stanie i co z tym zrobić*.
/// Stąd kolejność: pierścień stanu → zamiar → ostatnie zdanie → surowy sygnał.
class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage>
    with WidgetsBindingObserver {
  bool _sheetVisible = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Powrót aplikacji na pierwszy plan to jedna z cech sygnału — proxy
    // zachowania „sprawdzania telefonu”.
    if (state == AppLifecycleState.resumed) {
      ref.read(kairosEngineProvider).noteForegroundSwitch();
    }
  }

  Future<void> _openSheet(Intervention intervention) async {
    if (_sheetVisible || !mounted) {
      return;
    }
    _sheetVisible = true;
    await InterventionSheet.show(context, intervention: intervention);
    _sheetVisible = false;
  }

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;

    final StateReading? reading = ref.watch(lastKnownReadingProvider);
    final AsyncValue<StateReading> readingAsync = ref.watch(
      currentReadingProvider,
    );
    final SensingUiState sensing = ref.watch(sensingProvider);

    final FlowState state = reading?.state ?? FlowState.flow;
    final Color tone = palette.toneColor(state.tone);

    // Nowa interwencja w trakcie korzystania z aplikacji → pokaż arkusz.
    ref.listen<AsyncValue<Intervention>>(interventionFeedProvider, (
      AsyncValue<Intervention>? previous,
      AsyncValue<Intervention> next,
    ) {
      final Intervention? intervention = next.valueOrNull;
      if (intervention != null) {
        unawaited(_openSheet(intervention));
      }
    });

    // Otwarcie z powiadomienia systemowego.
    ref.listen<AsyncValue<String>>(notificationTapProvider, (
      AsyncValue<String>? previous,
      AsyncValue<String> next,
    ) {
      final String? id = next.valueOrNull;
      final Intervention? last = ref.read(lastInterventionProvider).valueOrNull;
      if (id != null && last != null && last.id == id) {
        unawaited(_openSheet(last));
      }
    });

    return Scaffold(
      body: AuroraBackground(
        tone: tone,
        intensity: sensing.isRunning ? 1 : 0.45,
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: () async {
              ref
                ..invalidate(lastInterventionProvider)
                ..invalidate(intentionProvider);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                AppGeometry.spaceLg,
                AppGeometry.spaceMd,
                AppGeometry.spaceLg,
                AppGeometry.spaceXxl,
              ),
              children: <Widget>[
                const _Header(),
                const SizedBox(height: AppGeometry.spaceLg),

                Center(
                  child: BreathingRing(
                    tone: tone,
                    confidence: reading?.confidence ?? 0,
                    settled: reading?.isSettled ?? true,
                    active: sensing.isRunning,
                    size: 244,
                    child: _RingCenter(
                      reading: reading,
                      active: sensing.isRunning,
                    ),
                  ),
                ),

                const SizedBox(height: AppGeometry.spaceMd),
                Center(
                  child: Text(
                    reading?.state.description ??
                        'Włącz nasłuch, żeby zacząć czytać sygnał.',
                    style: text.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ),

                const SizedBox(height: AppGeometry.spaceLg),
                _SensingButton(state: sensing),

                if (sensing.failure != null) ...<Widget>[
                  const SizedBox(height: AppGeometry.spaceSm),
                  GlassCard(
                    child: ErrorView(
                      failure: sensing.failure!,
                      compact: true,
                      onRetry: () => ref.read(sensingProvider.notifier).start(),
                    ),
                  ),
                ],

                if (sensing.notificationsBlocked) ...<Widget>[
                  const SizedBox(height: AppGeometry.spaceSm),
                  const _NotificationsBlockedNotice(),
                ],

                const SizedBox(height: AppGeometry.spaceLg),
                const SectionLabel('Zamiar'),
                const IntentionCard(),

                const SizedBox(height: AppGeometry.spaceLg),
                const SectionLabel('Ostatnie zdanie'),
                const NextStepCard(),

                const SizedBox(height: AppGeometry.spaceLg),
                const SectionLabel('Sygnał na żywo'),
                const SignalStrip(),

                const SizedBox(height: AppGeometry.spaceLg),
                const SectionLabel('Ostatnie dwie godziny'),
                const _RecentTimeline(),

                if (readingAsync.hasError) ...<Widget>[
                  const SizedBox(height: AppGeometry.spaceLg),
                  GlassCard(
                    child: ErrorView(
                      failure: readingAsync.error is Failure
                          ? readingAsync.error! as Failure
                          : const UnknownFailure(),
                      compact: true,
                      onRetry: () => ref.read(sensingProvider.notifier).start(),
                      retryLabel: 'Uruchom nasłuch ponownie',
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;
    final int steps = ref.watch(calibrationStepsProvider);

    return Row(
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Kairos', style: text.headlineMedium),
              const SizedBox(height: 2),
              Text(
                steps == 0
                    ? 'Uczę się Ciebie od zera'
                    : '$steps ${_correctionWord(steps)} — tyle o Tobie wiem',
                style: text.labelSmall,
              ),
            ],
          ),
        ),
        IconButton(
          onPressed: () => AppRouter.goInsights(context),
          icon: const Icon(Icons.insights_rounded),
          tooltip: 'Wgląd',
          color: palette.textSecondary,
        ),
        IconButton(
          onPressed: () => AppRouter.goSettings(context),
          icon: const Icon(Icons.tune_rounded),
          tooltip: 'Ustawienia',
          color: palette.textSecondary,
        ),
      ],
    );
  }

  static String _correctionWord(int count) {
    final int mod10 = count % 10;
    final int mod100 = count % 100;
    if (count == 1) {
      return 'korekta';
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return 'korekty';
    }
    return 'korekt';
  }
}

class _RingCenter extends StatelessWidget {
  const _RingCenter({required this.reading, required this.active});

  final StateReading? reading;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;
    final AppMotion motion = AppMotion.of(context);

    if (reading == null) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Icon(
            active ? Icons.hourglass_top_rounded : Icons.play_arrow_rounded,
            color: palette.textTertiary,
            size: 26,
          ),
          const SizedBox(height: AppGeometry.spaceXs),
          Text(
            active ? 'Zbieram sygnał…' : 'Uśpiony',
            style: text.titleSmall,
            textAlign: TextAlign.center,
          ),
          if (active) ...<Widget>[
            const SizedBox(height: 2),
            Text(
              'pierwszy odczyt po 30 s',
              style: text.labelSmall,
              textAlign: TextAlign.center,
            ),
          ],
        ],
      );
    }

    final StateReading value = reading!;
    final Color tone = palette.toneColor(value.state.tone);

    return AnimatedSwitcher(
      duration: motion.deliberate,
      switchInCurve: motion.enter,
      child: Column(
        key: ValueKey<String>('${value.state.id}-${value.isSettled}'),
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Icon(value.state.icon, color: tone, size: 24),
          const SizedBox(height: AppGeometry.spaceXs),
          Text(
            value.state.shortLabel,
            style: text.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppGeometry.spaceXxs),
          Text(
            '${(value.confidence * 100).round()}%',
            style: AppTypography.metric(tone, size: 20),
          ),
          if (!value.isSettled) ...<Widget>[
            const SizedBox(height: AppGeometry.spaceXxs),
            Text(
              'stan się zmienia',
              style: text.labelSmall,
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ).animate().fadeIn(duration: motion.base),
    );
  }
}

class _SensingButton extends ConsumerWidget {
  const _SensingButton({required this.state});

  final SensingUiState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool running = state.isRunning;

    return SizedBox(
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: state.isBusy
            ? null
            : () {
                unawaited(HapticFeedback.selectionClick());
                unawaited(ref.read(sensingProvider.notifier).toggle());
              },
        icon: state.isBusy
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Icon(running ? Icons.stop_rounded : Icons.play_arrow_rounded),
        label: Text(running ? 'Zatrzymaj nasłuch' : 'Włącz nasłuch'),
        style: FilledButton.styleFrom(
          backgroundColor: running
              ? context.palette.surfaceElevated
              : context.palette.deepFocus,
          foregroundColor: running
              ? context.palette.textPrimary
              : context.palette.canvas,
        ),
      ),
    );
  }
}

class _NotificationsBlockedNotice extends StatelessWidget {
  const _NotificationsBlockedNotice();

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;
    return GlassCard(
      padding: const EdgeInsets.all(AppGeometry.spaceMd),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(
            Icons.notifications_paused_outlined,
            size: 18,
            color: context.palette.warning,
          ),
          const SizedBox(width: AppGeometry.spaceSm),
          Expanded(
            child: Text(
              'System blokuje powiadomienia — interwencje zobaczysz tylko '
              'wewnątrz aplikacji.',
              style: text.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

class _RecentTimeline extends ConsumerWidget {
  const _RecentTimeline();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<StateReading>> history = ref.watch(
      stateHistoryProvider(const Duration(hours: 2)),
    );

    return GlassCard(
      child: history.when(
        loading: () => const ShimmerBox(height: 72),
        error: (Object error, StackTrace stackTrace) => ErrorView(
          failure: error is Failure ? error : const UnknownFailure(),
          compact: true,
          onRetry: () =>
              ref.invalidate(stateHistoryProvider(const Duration(hours: 2))),
        ),
        data: (List<StateReading> readings) => readings.isEmpty
            ? const EmptyView(
                title: 'Jeszcze nie ma czego pokazać',
                description:
                    'Pierwsze słupki pojawią się po kilku oknach obserwacji.',
                icon: Icons.timeline_rounded,
              )
            : StateTimeline(readings: readings),
      ),
    );
  }
}
