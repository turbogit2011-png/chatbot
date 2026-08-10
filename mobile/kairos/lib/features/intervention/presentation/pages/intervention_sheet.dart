import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/math/signal_features.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';
import '../../../../core/time/pl_format.dart';
import '../../../flow_state/domain/entities/state_reading.dart';
import '../../../flow_state/domain/services/flow_classifier.dart';
import '../../../flow_state/presentation/flow_tone.dart';
import '../../../flow_state/presentation/providers/flow_state_providers.dart';
import '../../domain/entities/intervention.dart';
import '../providers/intervention_providers.dart';
import '../widgets/feedback_bar.dart';
import '../widgets/typing_text.dart';

/// Arkusz z pojedynczą interwencją — kluczowy moduł funkcjonalny aplikacji.
///
/// Konstrukcja jest celowo minimalna: jedno zdanie, trzy przyciski i —
/// dla ciekawskich — rozwijane wyjaśnienie „dlaczego to widzę”. Nic więcej,
/// bo każdy dodatkowy element to kolejna sekunda skradziona z uwagi.
class InterventionSheet extends ConsumerStatefulWidget {
  const InterventionSheet({required this.intervention, super.key});

  final Intervention intervention;

  /// Otwiera arkusz i zwraca, gdy użytkownik go zamknie.
  static Future<void> show(
    BuildContext context, {
    required Intervention intervention,
  }) {
    unawaited(HapticFeedback.mediumImpact());
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (BuildContext context) =>
          InterventionSheet(intervention: intervention),
    );
  }

  @override
  ConsumerState<InterventionSheet> createState() => _InterventionSheetState();
}

class _InterventionSheetState extends ConsumerState<InterventionSheet> {
  bool _explanationVisible = false;
  bool _typingDone = false;

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final AppMotion motion = AppMotion.of(context);
    final TextTheme text = Theme.of(context).textTheme;

    final Intervention intervention =
        ref.watch(lastInterventionProvider).valueOrNull?.id ==
            widget.intervention.id
        ? ref.watch(lastInterventionProvider).valueOrNull!
        : widget.intervention;

    final Color tone = palette.toneColor(intervention.state.tone);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppGeometry.spaceLg,
          AppGeometry.spaceXs,
          AppGeometry.spaceLg,
          AppGeometry.spaceLg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.all(AppGeometry.spaceXs),
                  decoration: BoxDecoration(
                    color: tone.withValues(alpha: 0.14),
                    borderRadius: AppGeometry.chipRadius,
                  ),
                  child: Icon(intervention.state.icon, color: tone, size: 18),
                ),
                const SizedBox(width: AppGeometry.spaceSm),
                Expanded(
                  child: Text(
                    intervention.state.label,
                    style: text.titleSmall?.copyWith(color: tone),
                  ),
                ),
                Text(
                  PlFormat.time(intervention.at),
                  style: text.labelSmall,
                ),
              ],
            ),
            const SizedBox(height: AppGeometry.spaceLg),

            TypingText(
              text: intervention.message,
              style: text.headlineSmall?.copyWith(height: 1.35),
              onCompleted: () => setState(() => _typingDone = true),
            ),

            if (intervention.intentionText != null) ...<Widget>[
              const SizedBox(height: AppGeometry.spaceMd),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Icon(
                    Icons.flag_outlined,
                    size: 15,
                    color: palette.textTertiary,
                  ),
                  const SizedBox(width: AppGeometry.spaceXs),
                  Expanded(
                    child: Text(
                      intervention.intentionText!,
                      style: text.bodySmall,
                    ),
                  ),
                ],
              ),
            ],

            const SizedBox(height: AppGeometry.spaceLg),

            AnimatedOpacity(
              duration: motion.base,
              opacity: _typingDone ? 1 : 0.35,
              child: FeedbackBar(
                selected: intervention.feedback,
                enabled: _typingDone,
                onFeedback: (InterventionFeedback feedback) async {
                  await ref
                      .read(lastInterventionProvider.notifier)
                      .submitFeedback(feedback);
                  if (context.mounted) {
                    Navigator.of(context).maybePop();
                  }
                },
              ),
            ),

            const SizedBox(height: AppGeometry.spaceMd),
            const Divider(height: AppGeometry.spaceLg),

            _ExplanationToggle(
              expanded: _explanationVisible,
              onToggle: () =>
                  setState(() => _explanationVisible = !_explanationVisible),
            ),
            AnimatedCrossFade(
              duration: motion.slow,
              sizeCurve: motion.emphasized,
              crossFadeState: _explanationVisible
                  ? CrossFadeState.showSecond
                  : CrossFadeState.showFirst,
              firstChild: const SizedBox(width: double.infinity),
              secondChild: _Explanation(intervention: intervention),
            ),
          ],
        ),
      ),
    );
  }
}

class _ExplanationToggle extends StatelessWidget {
  const _ExplanationToggle({required this.expanded, required this.onToggle});

  final bool expanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onToggle,
      icon: Icon(
        expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
        size: 18,
      ),
      label: const Text('Dlaczego to widzę'),
      style: TextButton.styleFrom(
        foregroundColor: context.palette.textSecondary,
        padding: EdgeInsets.zero,
      ),
    );
  }
}

/// Panel wyjaśnialności — pokazuje, które cechy sygnału zaważyły na decyzji.
class _Explanation extends ConsumerWidget {
  const _Explanation({required this.intervention});

  final Intervention intervention;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;

    final StateReading reading = StateReading(
      at: intervention.at,
      state: intervention.state,
      confidence: intervention.confidence,
      probabilities: const <double>[],
      features: intervention.features,
    );

    final List<FeatureContribution> contributions = ref
        .watch(explainReadingProvider)(reading)
        .take(4)
        .toList(growable: false);

    if (contributions.isEmpty) {
      return Text('Brak zapisanych cech dla tej interwencji.', style: text.bodySmall);
    }

    final double maxAbs = contributions.first.contribution.abs().clamp(0.01, 100);

    return Padding(
      padding: const EdgeInsets.only(top: AppGeometry.spaceXs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Pewność ${(intervention.confidence * 100).round()}%. '
            'Największy wpływ na ten odczyt:',
            style: text.bodySmall,
          ),
          const SizedBox(height: AppGeometry.spaceSm),
          ...contributions.map((FeatureContribution contribution) {
            final bool positive = contribution.contribution >= 0;
            final Color color = positive ? palette.deepFocus : palette.textTertiary;
            final double ratio =
                (contribution.contribution.abs() / maxAbs).clamp(0.05, 1.0);

            return Padding(
              padding: const EdgeInsets.only(bottom: AppGeometry.spaceXs),
              child: Row(
                children: <Widget>[
                  SizedBox(
                    width: 132,
                    child: Text(contribution.label, style: text.bodySmall),
                  ),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(AppGeometry.radiusXs),
                      child: LinearProgressIndicator(
                        value: ratio,
                        minHeight: 6,
                        backgroundColor: palette.hairline,
                        valueColor: AlwaysStoppedAnimation<Color>(color),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppGeometry.spaceXs),
                  SizedBox(
                    width: 40,
                    child: Text(
                      '${(contribution.value * 100).round()}%',
                      style: text.labelSmall,
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: AppGeometry.spaceXs),
          Text(
            'Wartości są znormalizowane (0–100%) i pochodzą wyłącznie z tego '
            'urządzenia. Cechy: ${FeatureVector.schemaVersion == 1 ? 'schemat v1' : 'schemat '
                '${FeatureVector.schemaVersion}'}.',
            style: text.labelSmall,
          ),
        ],
      ),
    );
  }
}
