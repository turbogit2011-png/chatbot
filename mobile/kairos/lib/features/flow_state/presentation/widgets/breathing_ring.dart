import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';

/// Sygnaturowy element interfejsu: pierścień, który oddycha.
///
/// Trzy warstwy informacji naraz:
/// * **kolor** — jaki stan poznawczy wykrył Kairos,
/// * **wypełnienie łuku** — jak bardzo jest go pewny,
/// * **rytm pulsowania** — czy stan jest ustabilizowany (spokojny oddech),
///   czy właśnie się zmienia (szybszy, płytszy).
///
/// Zmiana koloru i wypełnienia jest animowana wolno (`AppMotion.deliberate`),
/// żeby nie sprawiać wrażenia reakcji na dotyk użytkownika.
class BreathingRing extends StatefulWidget {
  const BreathingRing({
    required this.tone,
    required this.confidence,
    super.key,
    this.settled = true,
    this.active = true,
    this.size = 240,
    this.child,
  });

  final Color tone;

  /// 0–1, wypełnienie łuku.
  final double confidence;

  /// `false` → stan właśnie się zmienia (histereza jeszcze go nie potwierdziła).
  final bool settled;

  /// `false` → nasłuch wyłączony; pierścień gaśnie i przestaje oddychać.
  final bool active;

  final double size;
  final Widget? child;

  @override
  State<BreathingRing> createState() => _BreathingRingState();
}

class _BreathingRingState extends State<BreathingRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _breath = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 4200),
  );

  @override
  void initState() {
    super.initState();
    _syncBreathing();
  }

  @override
  void didUpdateWidget(BreathingRing oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active || oldWidget.settled != widget.settled) {
      _syncBreathing();
    }
  }

  void _syncBreathing() {
    if (!widget.active) {
      _breath
        ..stop()
        ..animateTo(0, duration: const Duration(milliseconds: 600));
      return;
    }
    _breath
      ..duration = Duration(milliseconds: widget.settled ? 4200 : 1800)
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final AppMotion motion = AppMotion.of(context);
    final double amplitude = motion.scaleFactor;

    // Redukcja ruchu w ustawieniach systemu zatrzymuje oddech pierścienia —
    // informacja o stanie zostaje, znika tylko ciągła animacja.
    final bool shouldBreathe = widget.active && amplitude > 0;
    if (!shouldBreathe && _breath.isAnimating) {
      _breath.stop();
    } else if (shouldBreathe && !_breath.isAnimating) {
      _breath.repeat(reverse: true);
    }

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(
          begin: 0,
          end: widget.active ? widget.confidence.clamp(0.0, 1.0) : 0.0,
        ),
        duration: motion.deliberate,
        curve: motion.emphasized,
        builder: (BuildContext context, double confidence, Widget? child) {
          return TweenAnimationBuilder<Color?>(
            tween: ColorTween(
              begin: widget.tone,
              end: widget.active ? widget.tone : palette.textTertiary,
            ),
            duration: motion.deliberate,
            builder: (BuildContext context, Color? tone, Widget? child) {
              return AnimatedBuilder(
                animation: _breath,
                builder: (BuildContext context, Widget? child) {
                  return CustomPaint(
                    painter: _RingPainter(
                      confidence: confidence,
                      tone: tone ?? widget.tone,
                      track: palette.hairline,
                      breath: _breath.value * amplitude,
                      settled: widget.settled,
                    ),
                    child: child,
                  );
                },
                child: child,
              );
            },
            child: child,
          );
        },
        child: Center(
          child: Padding(
            padding: EdgeInsets.all(widget.size * 0.18),
            child: widget.child,
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  const _RingPainter({
    required this.confidence,
    required this.tone,
    required this.track,
    required this.breath,
    required this.settled,
  });

  final double confidence;
  final Color tone;
  final Color track;

  /// 0–1, faza oddechu.
  final double breath;

  final bool settled;

  static const double _startAngle = -math.pi / 2;

  @override
  void paint(Canvas canvas, Size size) {
    final Offset center = Offset(size.width / 2, size.height / 2);
    final double stroke = size.width * 0.055;
    final double radius = (size.width - stroke) / 2 - size.width * 0.04;

    // Tor pierścienia.
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..color = track.withValues(alpha: 0.55),
    );

    if (confidence <= 0.001) {
      return;
    }

    final double sweep = 2 * math.pi * confidence;
    final Rect arcRect = Rect.fromCircle(center: center, radius: radius);

    // Poświata oddechu — to ona „żyje” w rytmie 4,2 s.
    canvas.drawArc(
      arcRect,
      _startAngle,
      sweep,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke * (1.6 + 0.5 * breath)
        ..strokeCap = StrokeCap.round
        ..color = tone.withValues(alpha: 0.18 + 0.14 * breath)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, stroke * 1.2),
    );

    // Właściwy łuk pewności.
    canvas.drawArc(
      arcRect,
      _startAngle,
      sweep,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..shader = SweepGradient(
          startAngle: _startAngle,
          endAngle: _startAngle + 2 * math.pi,
          colors: <Color>[
            tone.withValues(alpha: 0.55),
            tone,
            tone.withValues(alpha: 0.85),
          ],
          stops: const <double>[0, 0.6, 1],
          transform: GradientRotation(_startAngle),
        ).createShader(arcRect),
    );

    // Znacznik czoła łuku — drobny punkt orientacyjny.
    final double headAngle = _startAngle + sweep;
    final Offset head = Offset(
      center.dx + radius * math.cos(headAngle),
      center.dy + radius * math.sin(headAngle),
    );
    canvas.drawCircle(
      head,
      stroke * (settled ? 0.34 : 0.34 + 0.16 * breath),
      Paint()..color = tone,
    );
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) =>
      oldDelegate.confidence != confidence ||
      oldDelegate.tone != tone ||
      oldDelegate.breath != breath ||
      oldDelegate.settled != settled ||
      oldDelegate.track != track;
}
