import 'dart:ui' show FontFeature, FontVariation;

import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Typografia Kairos.
///
/// Trzy rodziny, każda z jasno przypisaną rolą:
/// * **Sora** — nagłówki i liczby-bohaterowie (geometryczny, techniczny sznyt),
/// * **Inter** — treść interfejsu (najlepsza czytelność w małych rozmiarach),
/// * **JetBrains Mono** — dane pomiarowe i znaczniki czasu (cyfry tabularne).
///
/// Wszystkie trzy są fontami zmiennymi dołączonymi jako pojedynczy plik na
/// rodzinę, dlatego grubość ustawiamy jednocześnie przez `fontWeight`
/// (dla logiki Fluttera i ewentualnego fallbacku systemowego) oraz przez
/// `fontVariations` (oś `wght` fontu zmiennego — to ona realnie rysuje kształt).
abstract final class AppTypography {
  static const String display = 'Sora';
  static const String body = 'Inter';
  static const String mono = 'JetBrainsMono';

  /// Cyfry o stałej szerokości — liczniki nie „drgają” przy aktualizacji.
  static const List<FontFeature> tabular = <FontFeature>[
    FontFeature.tabularFigures(),
  ];

  /// Ustawienie osi `wght` fontu zmiennego.
  static List<FontVariation> wght(double weight) => <FontVariation>[
    FontVariation('wght', weight),
  ];

  static TextStyle _style({
    required String family,
    required double size,
    required double height,
    required double weight,
    required Color color,
    double letterSpacing = 0,
    bool tabularFigures = false,
  }) {
    return TextStyle(
      fontFamily: family,
      fontSize: size,
      height: height,
      letterSpacing: letterSpacing,
      color: color,
      fontWeight: FontWeight.values[((weight ~/ 100) - 1).clamp(0, 8)],
      fontVariations: wght(weight),
      fontFeatures: tabularFigures ? tabular : null,
    );
  }

  static TextTheme build(KairosPalette palette) {
    final Color primary = palette.textPrimary;
    final Color secondary = palette.textSecondary;
    final Color tertiary = palette.textTertiary;

    return TextTheme(
      displayLarge: _style(
        family: display,
        size: 56,
        height: 1.04,
        weight: 700,
        letterSpacing: -1.6,
        color: primary,
        tabularFigures: true,
      ),
      displayMedium: _style(
        family: display,
        size: 44,
        height: 1.06,
        weight: 700,
        letterSpacing: -1.2,
        color: primary,
        tabularFigures: true,
      ),
      displaySmall: _style(
        family: display,
        size: 34,
        height: 1.12,
        weight: 600,
        letterSpacing: -0.8,
        color: primary,
      ),
      headlineLarge: _style(
        family: display,
        size: 28,
        height: 1.18,
        weight: 600,
        letterSpacing: -0.6,
        color: primary,
      ),
      headlineMedium: _style(
        family: display,
        size: 23,
        height: 1.22,
        weight: 600,
        letterSpacing: -0.4,
        color: primary,
      ),
      headlineSmall: _style(
        family: display,
        size: 20,
        height: 1.26,
        weight: 600,
        letterSpacing: -0.2,
        color: primary,
      ),
      titleLarge: _style(
        family: body,
        size: 18,
        height: 1.3,
        weight: 600,
        color: primary,
      ),
      titleMedium: _style(
        family: body,
        size: 16,
        height: 1.34,
        weight: 600,
        color: primary,
      ),
      titleSmall: _style(
        family: body,
        size: 14,
        height: 1.36,
        weight: 600,
        color: secondary,
      ),
      bodyLarge: _style(
        family: body,
        size: 16,
        height: 1.52,
        weight: 400,
        color: primary,
      ),
      bodyMedium: _style(
        family: body,
        size: 14.5,
        height: 1.52,
        weight: 400,
        color: secondary,
      ),
      bodySmall: _style(
        family: body,
        size: 13,
        height: 1.46,
        weight: 400,
        color: tertiary,
      ),
      labelLarge: _style(
        family: body,
        size: 15,
        height: 1.2,
        weight: 600,
        letterSpacing: 0.1,
        color: primary,
      ),
      labelMedium: _style(
        family: body,
        size: 13,
        height: 1.2,
        weight: 600,
        letterSpacing: 0.2,
        color: secondary,
      ),
      labelSmall: _style(
        family: mono,
        size: 11.5,
        height: 1.2,
        weight: 400,
        letterSpacing: 0.8,
        color: tertiary,
        tabularFigures: true,
      ),
    );
  }

  /// Styl dla wartości pomiarowych (np. „73%”, „12:04”).
  static TextStyle metric(Color color, {double size = 15}) => _style(
    family: mono,
    size: size,
    height: 1.1,
    weight: 700,
    letterSpacing: -0.2,
    color: color,
    tabularFigures: true,
  );

  /// Wersalikowa etykieta sekcji.
  static TextStyle overline(Color color) => _style(
    family: body,
    size: 11,
    height: 1.2,
    weight: 600,
    letterSpacing: 1.4,
    color: color,
  );
}
