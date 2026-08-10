import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';
import '../../domain/entities/intervention.dart';

/// Pasek reakcji na interwencję.
///
/// To jedyny moment, w którym aplikacja o cokolwiek prosi — dlatego ma trzy
/// opcje, wszystkie jednym kliknięciem, bez pola tekstowego i bez skali 1–5.
/// Każda z nich niesie inny sygnał uczący (patrz [InterventionFeedback]).
class FeedbackBar extends StatelessWidget {
  const FeedbackBar({
    required this.onFeedback,
    super.key,
    this.selected,
    this.enabled = true,
  });

  final ValueChanged<InterventionFeedback> onFeedback;
  final InterventionFeedback? selected;
  final bool enabled;

  static const List<InterventionFeedback> _options = <InterventionFeedback>[
    InterventionFeedback.helped,
    InterventionFeedback.notNow,
    InterventionFeedback.wrongMoment,
  ];

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final AppMotion motion = AppMotion.of(context);

    if (selected != null) {
      return Row(
        children: <Widget>[
          Icon(Icons.check_rounded, size: 16, color: palette.positive),
          const SizedBox(width: AppGeometry.spaceXs),
          Text(
            _confirmationFor(selected!),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      );
    }

    return Wrap(
      spacing: AppGeometry.spaceXs,
      runSpacing: AppGeometry.spaceXs,
      children: _options.map((InterventionFeedback option) {
        final Color tone = switch (option) {
          InterventionFeedback.helped => palette.positive,
          InterventionFeedback.notNow => palette.textSecondary,
          InterventionFeedback.wrongMoment => palette.warning,
          InterventionFeedback.ignored => palette.textTertiary,
        };

        return AnimatedOpacity(
          duration: motion.quick,
          opacity: enabled ? 1 : 0.4,
          child: OutlinedButton(
            onPressed: enabled
                ? () {
                    unawaited(HapticFeedback.selectionClick());
                    onFeedback(option);
                  }
                : null,
            style: OutlinedButton.styleFrom(
              foregroundColor: tone,
              side: BorderSide(color: tone.withValues(alpha: 0.4)),
              padding: const EdgeInsets.symmetric(
                horizontal: AppGeometry.spaceMd,
                vertical: AppGeometry.spaceXs,
              ),
              minimumSize: const Size(0, 44),
            ),
            child: Text(option.label),
          ),
        );
      }).toList(growable: false),
    );
  }

  static String _confirmationFor(InterventionFeedback feedback) =>
      switch (feedback) {
        InterventionFeedback.helped => 'Zapamiętane — będę czujniejszy w takich chwilach.',
        InterventionFeedback.notNow => 'Rozumiem, odezwę się rzadziej.',
        InterventionFeedback.wrongMoment => 'Zapamiętane — następnym razem odpuszczę.',
        InterventionFeedback.ignored => 'Bez reakcji.',
      };
}
