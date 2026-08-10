import 'package:flutter/material.dart';

import '../error/failure.dart';
import '../theme/app_colors.dart';
import '../theme/app_motion.dart';

/// Widok błędu z konkretnym komunikatem i akcją naprawczą.
///
/// Każdy ekran w aplikacji ma cztery stany: ładowanie, dane, pustka i błąd.
/// Ten widżet obsługuje ostatni z nich — zawsze z czymś, co użytkownik może
/// zrobić, nigdy z samym „coś poszło nie tak”.
class ErrorView extends StatelessWidget {
  const ErrorView({
    required this.failure,
    super.key,
    this.onRetry,
    this.retryLabel = 'Spróbuj ponownie',
    this.compact = false,
  });

  final Failure failure;
  final VoidCallback? onRetry;
  final String retryLabel;
  final bool compact;

  IconData get _icon => switch (failure) {
    PermissionFailure() => Icons.lock_outline_rounded,
    SensorFailure() => Icons.sensors_off_rounded,
    ModelFailure() => Icons.memory_rounded,
    BackgroundFailure() => Icons.battery_saver_rounded,
    DatabaseFailure() => Icons.storage_rounded,
    UnknownFailure() => Icons.error_outline_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;

    return Padding(
      padding: EdgeInsets.all(
        compact ? AppGeometry.spaceMd : AppGeometry.spaceXl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(_icon, color: palette.danger, size: compact ? 20 : 26),
              const SizedBox(width: AppGeometry.spaceSm),
              Expanded(
                child: Text(
                  failure.message,
                  style: compact ? text.bodyMedium : text.titleMedium,
                ),
              ),
            ],
          ),
          if (failure is PermissionFailure &&
              (failure as PermissionFailure).permanentlyDenied) ...<Widget>[
            const SizedBox(height: AppGeometry.spaceXs),
            Text(
              'Zgodę można przywrócić w ustawieniach systemowych aplikacji.',
              style: text.bodySmall,
            ),
          ],
          if (onRetry != null) ...<Widget>[
            const SizedBox(height: AppGeometry.spaceMd),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: Text(retryLabel),
            ),
          ],
        ],
      ),
    );
  }
}

/// Widok pustki — stan „jeszcze nic nie ma”, a nie „coś się zepsuło”.
class EmptyView extends StatelessWidget {
  const EmptyView({
    required this.title,
    super.key,
    this.description,
    this.icon = Icons.hourglass_empty_rounded,
    this.action,
  });

  final String title;
  final String? description;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppGeometry.spaceLg,
        vertical: AppGeometry.spaceXl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 30, color: palette.textTertiary),
          const SizedBox(height: AppGeometry.spaceMd),
          Text(
            title,
            style: text.titleMedium,
            textAlign: TextAlign.center,
          ),
          if (description != null) ...<Widget>[
            const SizedBox(height: AppGeometry.spaceXs),
            Text(
              description!,
              style: text.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
          if (action != null) ...<Widget>[
            const SizedBox(height: AppGeometry.spaceMd),
            action!,
          ],
        ],
      ),
    );
  }
}

/// Prostokąt-zaślepka z delikatną pulsacją, używany podczas ładowania.
class ShimmerBox extends StatefulWidget {
  const ShimmerBox({
    super.key,
    this.width = double.infinity,
    this.height = 16,
    this.radius = AppGeometry.radiusSm,
  });

  final double width;
  final double height;
  final double radius;

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    return AnimatedBuilder(
      animation: _controller,
      builder: (BuildContext context, Widget? child) {
        return Opacity(
          opacity: 0.35 + 0.25 * _controller.value,
          child: child,
        );
      },
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: palette.hairline,
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}
