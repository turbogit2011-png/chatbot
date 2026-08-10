import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/error/failure.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';
import '../../../../core/time/pl_format.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/status_views.dart';
import '../../../flow_state/presentation/flow_tone.dart';
import '../../../intervention/domain/entities/intervention.dart';
import '../../../intervention/domain/services/intervention_policy.dart';
import '../../../intervention/presentation/pages/intervention_sheet.dart';
import '../../../intervention/presentation/providers/intervention_providers.dart';
import '../../../intervention/presentation/widgets/feedback_bar.dart';

/// Karta „ostatnie zdanie” — to, co Kairos powiedział, i miejsce na reakcję.
///
/// Gdy nie powiedział nic, karta tłumaczy dlaczego. Milczenie z uzasadnieniem
/// jest funkcją, nie brakiem treści.
class NextStepCard extends ConsumerWidget {
  const NextStepCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<Intervention?> last = ref.watch(lastInterventionProvider);

    return last.when(
      loading: () => const GlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            ShimmerBox(height: 14, width: 90),
            SizedBox(height: AppGeometry.spaceSm),
            ShimmerBox(height: 20),
            SizedBox(height: AppGeometry.spaceXs),
            ShimmerBox(height: 20, width: 220),
          ],
        ),
      ),
      error: (Object error, StackTrace stackTrace) => GlassCard(
        child: ErrorView(
          failure: error is Failure ? error : const UnknownFailure(),
          compact: true,
          onRetry: () => ref.invalidate(lastInterventionProvider),
        ),
      ),
      data: (Intervention? intervention) => intervention == null
          ? const _NoInterventionYet()
          : _InterventionSummary(intervention: intervention),
    );
  }
}

class _InterventionSummary extends ConsumerWidget {
  const _InterventionSummary({required this.intervention});

  final Intervention intervention;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;
    final Color tone = palette.toneColor(intervention.state.tone);

    return GlassCard(
      tone: tone,
      glow: intervention.awaitsFeedback,
      onTap: () =>
          InterventionSheet.show(context, intervention: intervention),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(intervention.state.icon, size: 15, color: tone),
              const SizedBox(width: AppGeometry.spaceXs),
              Text(
                intervention.state.label,
                style: text.labelMedium?.copyWith(color: tone),
              ),
              const Spacer(),
              Text(
                PlFormat.relative(intervention.at, now: DateTime.now()),
                style: text.labelSmall,
              ),
            ],
          ),
          const SizedBox(height: AppGeometry.spaceSm),
          Text(intervention.message, style: text.titleMedium?.copyWith(height: 1.4)),
          const SizedBox(height: AppGeometry.spaceMd),
          FeedbackBar(
            selected: intervention.feedback,
            onFeedback: (InterventionFeedback feedback) => ref
                .read(lastInterventionProvider.notifier)
                .submitFeedback(feedback),
          ),
          const SizedBox(height: AppGeometry.spaceXs),
          Text(
            'źródło: ${intervention.source.label}',
            style: text.labelSmall,
          ),
        ],
      ),
    );
  }
}

class _NoInterventionYet extends ConsumerWidget {
  const _NoInterventionYet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final TextTheme text = Theme.of(context).textTheme;
    final InterventionDecision? decision = ref.watch(lastDecisionProvider);

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(
                Icons.notifications_off_outlined,
                size: 16,
                color: context.palette.textTertiary,
              ),
              const SizedBox(width: AppGeometry.spaceXs),
              Text('Cisza', style: text.labelMedium),
            ],
          ),
          const SizedBox(height: AppGeometry.spaceSm),
          Text(
            'Nie mam Ci nic do powiedzenia — i to jest stan domyślny.',
            style: text.bodyMedium,
          ),
          if (decision is SuppressIntervention) ...<Widget>[
            const SizedBox(height: AppGeometry.spaceXs),
            SilenceReason(decision: decision),
          ],
        ],
      ),
    );
  }
}

/// Wiersz z powodem milczenia — przezroczystość zamiast czarnej skrzynki.
class SilenceReason extends StatelessWidget {
  const SilenceReason({required this.decision, super.key});

  final SuppressIntervention decision;

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;
    final Duration? retry = decision.retryAfter;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Icon(Icons.shield_outlined, size: 14, color: palette.textTertiary),
        const SizedBox(width: AppGeometry.spaceXs),
        Expanded(
          child: Text(
            retry == null
                ? decision.explanation
                : '${decision.explanation} (${PlFormat.duration(retry)})',
            style: text.bodySmall,
          ),
        ),
      ],
    );
  }
}
