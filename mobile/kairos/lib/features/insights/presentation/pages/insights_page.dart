import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/error/failure.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/time/pl_format.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/status_views.dart';
import '../../../flow_state/domain/entities/flow_state.dart';
import '../../../flow_state/domain/entities/state_reading.dart';
import '../../../flow_state/presentation/flow_tone.dart';
import '../../../flow_state/presentation/providers/flow_state_providers.dart';
import '../../../flow_state/presentation/widgets/state_timeline.dart';
import '../../../intervention/domain/entities/intervention.dart';
import '../../../intervention/presentation/providers/intervention_providers.dart';

/// Ekran „Wgląd”: co się działo i czy interwencje w ogóle pomagają.
///
/// Świadomie bez „streaków”, punktów i innych mechanik nagradzających —
/// aplikacja mierzy własną skuteczność, a nie dyscyplinę użytkownika.
class InsightsPage extends ConsumerWidget {
  const InsightsPage({super.key});

  static const Duration _day = Duration(hours: 24);
  static const Duration _week = Duration(days: 7);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Wgląd')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppGeometry.spaceLg,
          AppGeometry.spaceXs,
          AppGeometry.spaceLg,
          AppGeometry.spaceXxl,
        ),
        children: const <Widget>[
          SectionLabel('Ostatnie 24 godziny'),
          _DayTimeline(),
          SizedBox(height: AppGeometry.spaceLg),
          SectionLabel('Rozkład stanów (7 dni)'),
          _StateDistribution(),
          SizedBox(height: AppGeometry.spaceLg),
          SectionLabel('Skuteczność interwencji (7 dni)'),
          _EffectivenessCard(),
          SizedBox(height: AppGeometry.spaceLg),
          SectionLabel('Historia'),
          _InterventionHistory(),
        ],
      ),
    );
  }
}

class _DayTimeline extends ConsumerWidget {
  const _DayTimeline();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<StateReading>> history = ref.watch(
      stateHistoryProvider(InsightsPage._day),
    );

    return GlassCard(
      child: history.when(
        loading: () => const ShimmerBox(height: 96),
        error: (Object error, StackTrace stackTrace) => ErrorView(
          failure: error is Failure ? error : const UnknownFailure(),
          compact: true,
          onRetry: () =>
              ref.invalidate(stateHistoryProvider(InsightsPage._day)),
        ),
        data: (List<StateReading> readings) => readings.isEmpty
            ? const EmptyView(
                title: 'Brak odczytów z ostatniej doby',
                description: 'Włącz nasłuch na ekranie głównym.',
                icon: Icons.timeline_rounded,
              )
            : StateTimeline(readings: readings, height: 96),
      ),
    );
  }
}

class _StateDistribution extends ConsumerWidget {
  const _StateDistribution();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;
    final AsyncValue<Map<FlowState, int>> distribution = ref.watch(
      stateDistributionProvider(InsightsPage._week),
    );

    return GlassCard(
      child: distribution.when(
        loading: () => const ShimmerBox(height: 120),
        error: (Object error, StackTrace stackTrace) => ErrorView(
          failure: error is Failure ? error : const UnknownFailure(),
          compact: true,
          onRetry: () =>
              ref.invalidate(stateDistributionProvider(InsightsPage._week)),
        ),
        data: (Map<FlowState, int> counts) {
          final int total = counts.values.fold<int>(
            0,
            (int sum, int value) => sum + value,
          );
          if (total == 0) {
            return const EmptyView(
              title: 'Za mało danych',
              description: 'Rozkład pojawi się po pierwszych sesjach nasłuchu.',
              icon: Icons.pie_chart_outline_rounded,
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              // Okno obserwacji trwa 30 s — stąd przeliczenie na czas.
              Text(
                'Łącznie ${PlFormat.duration(Duration(seconds: total * 30))} '
                'obserwacji',
                style: text.bodySmall,
              ),
              const SizedBox(height: AppGeometry.spaceMd),
              ...FlowState.values.map((FlowState state) {
                final int count = counts[state] ?? 0;
                final double ratio = count / total;
                final Color tone = palette.toneColor(state.tone);

                return Padding(
                  padding: const EdgeInsets.only(bottom: AppGeometry.spaceSm),
                  child: Row(
                    children: <Widget>[
                      Icon(state.icon, size: 15, color: tone),
                      const SizedBox(width: AppGeometry.spaceXs),
                      SizedBox(
                        width: 104,
                        child: Text(state.shortLabel, style: text.bodySmall),
                      ),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(
                            AppGeometry.radiusXs,
                          ),
                          child: LinearProgressIndicator(
                            value: ratio,
                            minHeight: 6,
                            backgroundColor: palette.hairline,
                            valueColor: AlwaysStoppedAnimation<Color>(tone),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppGeometry.spaceXs),
                      SizedBox(
                        width: 42,
                        child: Text(
                          '${(ratio * 100).round()}%',
                          style: AppTypography.metric(
                            palette.textSecondary,
                            size: 12,
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          );
        },
      ),
    );
  }
}

class _EffectivenessCard extends ConsumerWidget {
  const _EffectivenessCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;
    final AsyncValue<InterventionStats> stats = ref.watch(
      interventionStatsProvider(InsightsPage._week),
    );

    return GlassCard(
      child: stats.when(
        loading: () => const ShimmerBox(height: 80),
        error: (Object error, StackTrace stackTrace) => ErrorView(
          failure: error is Failure ? error : const UnknownFailure(),
          compact: true,
          onRetry: () =>
              ref.invalidate(interventionStatsProvider(InsightsPage._week)),
        ),
        data: (InterventionStats value) {
          if (value.total == 0) {
            return const EmptyView(
              title: 'Jeszcze nic nie powiedziałem',
              description:
                  'To normalne — domyślnie milczę i odzywam się rzadko.',
              icon: Icons.forum_outlined,
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: <Widget>[
                  Text(
                    '${(value.hitRate * 100).round()}%',
                    style: AppTypography.metric(palette.positive, size: 34),
                  ),
                  const SizedBox(width: AppGeometry.spaceXs),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('trafień', style: text.bodySmall),
                  ),
                ],
              ),
              const SizedBox(height: AppGeometry.spaceSm),
              Text(
                '${value.total} ${PlFormat.plural(value.total, one: 'interwencja', few: 'interwencje', many: 'interwencji')}, '
                '${value.helped} pomogło, ${value.notNow} odrzuconych, '
                '${value.wrongMoment} w złym momencie, ${value.ignored} bez reakcji.',
                style: text.bodySmall,
              ),
              const SizedBox(height: AppGeometry.spaceSm),
              Text(
                'Każda reakcja to jeden krok douczania modelu na tym urządzeniu.',
                style: text.labelSmall,
              ),
            ],
          );
        },
      ),
    );
  }
}

class _InterventionHistory extends ConsumerWidget {
  const _InterventionHistory();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;
    final AsyncValue<List<Intervention>> history = ref.watch(
      interventionHistoryProvider,
    );

    return history.when(
      loading: () => const GlassCard(child: ShimmerBox(height: 60)),
      error: (Object error, StackTrace stackTrace) => GlassCard(
        child: ErrorView(
          failure: error is Failure ? error : const UnknownFailure(),
          compact: true,
          onRetry: () => ref.invalidate(interventionHistoryProvider),
        ),
      ),
      data: (List<Intervention> items) {
        if (items.isEmpty) {
          return const GlassCard(
            child: EmptyView(
              title: 'Historia jest pusta',
              icon: Icons.history_rounded,
            ),
          );
        }

        return Column(
          children: items.map((Intervention intervention) {
            final Color tone = palette.toneColor(intervention.state.tone);
            return Padding(
              padding: const EdgeInsets.only(bottom: AppGeometry.spaceSm),
              child: GlassCard(
                padding: const EdgeInsets.all(AppGeometry.spaceMd),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Icon(intervention.state.icon, size: 14, color: tone),
                        const SizedBox(width: AppGeometry.spaceXs),
                        Text(
                          intervention.state.shortLabel,
                          style: text.labelSmall?.copyWith(color: tone),
                        ),
                        const Spacer(),
                        Text(
                          PlFormat.relative(
                            intervention.at,
                            now: DateTime.now(),
                          ),
                          style: text.labelSmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: AppGeometry.spaceXs),
                    Text(intervention.message, style: text.bodyMedium),
                    if (intervention.feedback != null) ...<Widget>[
                      const SizedBox(height: AppGeometry.spaceXs),
                      Text(
                        'reakcja: ${intervention.feedback!.label.toLowerCase()}',
                        style: text.labelSmall,
                      ),
                    ],
                  ],
                ),
              ),
            );
          }).toList(growable: false),
        );
      },
    );
  }
}
