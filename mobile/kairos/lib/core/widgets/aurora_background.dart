import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_motion.dart';

/// Tło ekranu głównego: trzy powoli dryfujące plamy światła w kolorze
/// bieżącego stanu.
///
/// Ruch jest celowo bardzo wolny (pełny obieg ~40 s) — tło ma być odczuwalne
/// peryferyjnie, a nie przyciągać wzrok. Przy włączonej redukcji animacji
/// zostaje statyczny gradient.
class AuroraBackground extends StatefulWidget {
  const AuroraBackground({
    required this.tone,
    super.key,
    this.intensity = 1,
    this.child,
  });

  /// Kolor wiodący — zwykle ton bieżącego stanu poznawczego.
  final Color tone;

  /// 0 → tło praktycznie niewidoczne, 1 → pełna intensywność.
  final double intensity;

  final Widget? child;

  @override
  State<AuroraBackground> createState() => _AuroraBackgroundState();
}

class _AuroraBackgroundState extends State<AuroraBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 40),
  );

  @override
  void initState() {
    super.initState();
    _controller.repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final AppMotion motion = AppMotion.of(context);
    final bool animate = motion.scaleFactor > 0;

    if (!animate && _controller.isAnimating) {
      _controller.stop();
    } else if (animate && !_controller.isAnimating) {
      _controller.repeat();
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (BuildContext context, Widget? child) {
        return CustomPaint(
          painter: _AuroraPainter(
            progress: animate ? _controller.value : 0.2,
            tone: widget.tone,
            secondary: palette.auroraMid,
            tertiary: palette.auroraEnd,
            background: palette.canvas,
            intensity: widget.intensity,
          ),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class _AuroraPainter extends CustomPainter {
  const _AuroraPainter({
    required this.progress,
    required this.tone,
    required this.secondary,
    required this.tertiary,
    required this.background,
    required this.intensity,
  });

  final double progress;
  final Color tone;
  final Color secondary;
  final Color tertiary;
  final Color background;
  final double intensity;

  @override
  void paint(Canvas canvas, Size size) {
    final Rect bounds = Offset.zero & size;
    canvas.drawRect(bounds, Paint()..color = background);

    final double angle = progress * 2 * math.pi;
    _blob(
      canvas,
      size,
      color: tone,
      center: Offset(
        size.width * (0.25 + 0.12 * math.cos(angle)),
        size.height * (0.18 + 0.06 * math.sin(angle)),
      ),
      radius: size.width * 0.62,
      opacity: 0.28 * intensity,
    );
    _blob(
      canvas,
      size,
      color: secondary,
      center: Offset(
        size.width * (0.82 + 0.10 * math.cos(angle + 2.1)),
        size.height * (0.34 + 0.08 * math.sin(angle + 2.1)),
      ),
      radius: size.width * 0.55,
      opacity: 0.20 * intensity,
    );
    _blob(
      canvas,
      size,
      color: tertiary,
      center: Offset(
        size.width * (0.5 + 0.16 * math.cos(angle + 4.2)),
        size.height * (0.86 + 0.05 * math.sin(angle + 4.2)),
      ),
      radius: size.width * 0.7,
      opacity: 0.14 * intensity,
    );
  }

  void _blob(
    Canvas canvas,
    Size size, {
    required Color color,
    required Offset center,
    required double radius,
    required double opacity,
  }) {
    final Paint paint = Paint()
      ..shader = RadialGradient(
        colors: <Color>[
          color.withValues(alpha: opacity),
          color.withValues(alpha: 0),
        ],
        stops: const <double>[0, 1],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, paint);
  }

  @override
  bool shouldRepaint(_AuroraPainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.tone != tone ||
      oldDelegate.intensity != intensity ||
      oldDelegate.background != background;
}
