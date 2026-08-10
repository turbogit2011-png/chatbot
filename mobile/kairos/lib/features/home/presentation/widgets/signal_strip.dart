import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/status_views.dart';
import '../../../sensing/domain/entities/feature_window.dart';
import '../../../sensing/presentation/providers/sensing_providers.dart';

/// Pasek sygnału na żywo — cztery liczby, które użytkownik może sam
/// zweryfikować, poruszając telefonem.
///
/// To element budowania zaufania: „widzę dokładnie to, co widzi aplikacja”.
class SignalStrip extends ConsumerWidget {
  const SignalStrip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<LiveSignal> signal = ref.watch(liveSignalProvider);
    final bool sensing = ref.watch(sensingProvider).isRunning;

    return GlassCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppGeometry.spaceMd,
        vertical: AppGeometry.spaceMd,
      ),
      child: signal.when(
        loading: () => const _SignalSkeleton(),
        error: (Object error, StackTrace stackTrace) => Text(
          'Sygnał niedostępny.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        data: (LiveSignal value) => sensing
            ? _SignalRow(signal: value)
            : const _SignalIdle(),
      ),
    );
  }
}

class _SignalRow extends StatelessWidget {
  const _SignalRow({required this.signal});

  final LiveSignal signal;

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;

    return Row(
      children: <Widget>[
        Expanded(
          child: _Metric(
            label: 'Energia',
            value: signal.motionEnergy,
            color: palette.recovery,
          ),
        ),
        Expanded(
          child: _Metric(
            label: 'Mikroruchy',
            value: signal.microMovement,
            color: palette.drift,
          ),
        ),
        Expanded(
          child: _Metric(
            label: 'Bezruch',
            value: signal.stillness,
            color: palette.deepFocus,
          ),
        ),
        Expanded(
          child: _Metric(
            label: 'Próbki',
            value: (signal.sampleCount / FeatureWindow.reliableSampleCount)
                .clamp(0.0, 1.0),
            color: palette.flow,
            display: '${signal.sampleCount}',
          ),
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.label,
    required this.value,
    required this.color,
    this.display,
  });

  final String label;
  final double value;
  final Color color;
  final String? display;

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final AppMotion motion = AppMotion.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(label, style: AppTypography.overline(palette.textTertiary)),
        const SizedBox(height: AppGeometry.spaceXs),
        TweenAnimationBuilder<double>(
          tween: Tween<double>(begin: 0, end: value.clamp(0.0, 1.0)),
          duration: motion.base,
          curve: motion.enter,
          builder: (BuildContext context, double animated, Widget? child) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  display ?? '${(animated * 100).round()}%',
                  style: AppTypography.metric(palette.textPrimary, size: 16),
                ),
                const SizedBox(height: AppGeometry.spaceXs),
                ClipRRect(
                  borderRadius: BorderRadius.circular(AppGeometry.radiusXs),
                  child: LinearProgressIndicator(
                    value: animated,
                    minHeight: 4,
                    backgroundColor: palette.hairline,
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                  ),
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _SignalIdle extends StatelessWidget {
  const _SignalIdle();

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;
    return Row(
      children: <Widget>[
        Icon(
          Icons.sensors_off_rounded,
          size: 18,
          color: context.palette.textTertiary,
        ),
        const SizedBox(width: AppGeometry.spaceSm),
        Expanded(
          child: Text(
            'Czujniki są wyłączone. Nic nie jest mierzone ani zapisywane.',
            style: text.bodySmall,
          ),
        ),
      ],
    );
  }
}

class _SignalSkeleton extends StatelessWidget {
  const _SignalSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: <Widget>[
        Expanded(child: ShimmerBox(height: 34)),
        SizedBox(width: AppGeometry.spaceSm),
        Expanded(child: ShimmerBox(height: 34)),
        SizedBox(width: AppGeometry.spaceSm),
        Expanded(child: ShimmerBox(height: 34)),
        SizedBox(width: AppGeometry.spaceSm),
        Expanded(child: ShimmerBox(height: 34)),
      ],
    );
  }
}
