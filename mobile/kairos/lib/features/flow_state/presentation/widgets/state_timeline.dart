import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';
import '../../../../core/time/pl_format.dart';
import '../../domain/entities/state_reading.dart';
import '../flow_tone.dart';

/// Oś czasu stanów: każdy odczyt to jeden słupek, wysokość = pewność modelu.
///
/// Świadomie bez biblioteki wykresów — to nie jest wykres analityczny, tylko
/// „taśma” do odczytania jednym rzutem oka, która ma wtapiać się w tło.
class StateTimeline extends StatelessWidget {
  const StateTimeline({
    required this.readings,
    super.key,
    this.height = 72,
    this.showAxis = true,
  });

  final List<StateReading> readings;
  final double height;
  final bool showAxis;

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;

    if (readings.isEmpty) {
      return SizedBox(
        height: height,
        child: Center(
          child: Text('Brak danych z tego okresu', style: text.bodySmall),
        ),
      );
    }

    final List<_Bar> bars = readings
        .map(
          (StateReading reading) => _Bar(
            confidence: reading.confidence.clamp(0.0, 1.0),
            color: palette.toneColor(reading.state.tone),
          ),
        )
        .toList(growable: false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        SizedBox(
          height: height,
          child: CustomPaint(
            painter: _TimelinePainter(bars: bars, track: palette.hairline),
          ),
        ),
        if (showAxis) ...<Widget>[
          const SizedBox(height: AppGeometry.spaceXs),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text(PlFormat.time(readings.first.at), style: text.labelSmall),
              Text(PlFormat.time(readings.last.at), style: text.labelSmall),
            ],
          ),
        ],
      ],
    );
  }
}

class _Bar {
  const _Bar({required this.confidence, required this.color});

  final double confidence;
  final Color color;
}

class _TimelinePainter extends CustomPainter {
  const _TimelinePainter({required this.bars, required this.track});

  final List<_Bar> bars;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    if (bars.isEmpty) {
      return;
    }

    canvas.drawLine(
      Offset(0, size.height),
      Offset(size.width, size.height),
      Paint()
        ..color = track.withValues(alpha: 0.6)
        ..strokeWidth = 1,
    );

    final double slot = size.width / bars.length;
    final double barWidth = math.max(math.min(slot - 1.5, 10), 1.5);

    for (int i = 0; i < bars.length; i++) {
      final _Bar bar = bars[i];
      final double barHeight =
          (size.height - 4) * math.max(bar.confidence, 0.12);
      final double left = i * slot + (slot - barWidth) / 2;

      final RRect shape = RRect.fromRectAndRadius(
        Rect.fromLTWH(left, size.height - barHeight, barWidth, barHeight),
        Radius.circular(barWidth / 2),
      );

      canvas.drawRRect(
        shape,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
            colors: <Color>[bar.color.withValues(alpha: 0.5), bar.color],
          ).createShader(shape.outerRect),
      );
    }
  }

  @override
  bool shouldRepaint(_TimelinePainter oldDelegate) =>
      oldDelegate.bars != bars || oldDelegate.track != track;
}
