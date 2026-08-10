import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_motion.dart';

/// Podstawowy kontener treści: półprzezroczysta tafla z rozmyciem tła,
/// włosową ramką i opcjonalną poświatą w kolorze stanu.
class GlassCard extends StatelessWidget {
  const GlassCard({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(AppGeometry.spaceLg),
    this.tone,
    this.onTap,
    this.borderRadius = AppGeometry.cardRadius,
    this.glow = false,
    this.blur = 18,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  /// Kolor akcentu — zwykle ton bieżącego stanu.
  final Color? tone;

  final VoidCallback? onTap;
  final BorderRadius borderRadius;

  /// Czy dodać miękką poświatę w kolorze [tone].
  final bool glow;

  final double blur;

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    final Color accent = tone ?? palette.hairline;

    final Widget content = ClipRRect(
      borderRadius: borderRadius,
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: borderRadius,
            color: palette.glassTint,
            border: Border.all(
              color: tone == null
                  ? palette.glassBorder
                  : accent.withValues(alpha: 0.35),
              width: AppGeometry.hairline,
            ),
          ),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );

    final Widget decorated = glow && tone != null
        ? DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: borderRadius,
              boxShadow: <BoxShadow>[
                BoxShadow(
                  color: accent.withValues(alpha: 0.18),
                  blurRadius: 36,
                  spreadRadius: -10,
                  offset: const Offset(0, 14),
                ),
              ],
            ),
            child: content,
          )
        : content;

    if (onTap == null) {
      return decorated;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: borderRadius,
        splashColor: accent.withValues(alpha: 0.08),
        highlightColor: accent.withValues(alpha: 0.04),
        child: decorated,
      ),
    );
  }
}

/// Etykieta sekcji — wersaliki, rozstrzelone, w kolorze trzeciorzędnym.
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.trailing});

  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;
    return Padding(
      padding: const EdgeInsets.only(
        left: AppGeometry.spaceXxs,
        bottom: AppGeometry.spaceXs,
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Text(
              text.toUpperCase(),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: palette.textTertiary,
                letterSpacing: 1.4,
              ),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
