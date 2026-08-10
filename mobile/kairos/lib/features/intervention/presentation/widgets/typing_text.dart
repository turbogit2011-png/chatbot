import 'package:flutter/material.dart';

import '../../../../core/theme/app_motion.dart';

/// Tekst pojawiający się znak po znaku, z migającym kursorem.
///
/// Nie jest to ozdobnik: zdanie interwencji ma być *przeczytane*, a nie
/// zobaczone jako blok. Wolniejsze pojawianie się wymusza tempo czytania.
/// Przy włączonej redukcji animacji tekst pokazuje się od razu w całości.
class TypingText extends StatefulWidget {
  const TypingText({
    required this.text,
    super.key,
    this.style,
    this.charactersPerSecond = 34,
    this.onCompleted,
  });

  final String text;
  final TextStyle? style;
  final double charactersPerSecond;
  final VoidCallback? onCompleted;

  @override
  State<TypingText> createState() => _TypingTextState();
}

class _TypingTextState extends State<TypingText>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _completed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: _durationFor(widget.text))
      ..addStatusListener(_onStatus);
  }

  @override
  void didUpdateWidget(TypingText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) {
      _completed = false;
      _controller
        ..stop()
        ..duration = _durationFor(widget.text)
        ..forward(from: 0);
    }
  }

  Duration _durationFor(String text) => Duration(
    milliseconds:
        (text.length / widget.charactersPerSecond * 1000).clamp(200, 6000).round(),
  );

  void _onStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed && !_completed) {
      _completed = true;
      widget.onCompleted?.call();
    }
  }

  @override
  void dispose() {
    _controller
      ..removeStatusListener(_onStatus)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AppMotion motion = AppMotion.of(context);

    if (motion.scaleFactor == 0) {
      return Text(widget.text, style: widget.style);
    }

    if (!_controller.isAnimating && !_completed) {
      _controller.forward(from: 0);
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (BuildContext context, Widget? child) {
        final int visible = (widget.text.length * _controller.value)
            .floor()
            .clamp(0, widget.text.length);
        final bool showCursor =
            _controller.value < 1 && (_controller.value * 20).floor().isEven;

        return Text.rich(
          TextSpan(
            children: <InlineSpan>[
              TextSpan(text: widget.text.substring(0, visible)),
              if (showCursor)
                TextSpan(
                  text: '▌',
                  style: (widget.style ?? const TextStyle()).copyWith(
                    color: (widget.style?.color ?? Colors.white).withValues(
                      alpha: 0.45,
                    ),
                  ),
                ),
            ],
          ),
          style: widget.style,
        );
      },
    );
  }
}
