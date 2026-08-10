import 'package:flutter/material.dart';

/// Wizualny ton odpowiadający stanowi poznawczemu wykrytemu przez silnik
/// Kairos. Warstwa prezentacji mapuje encję domenową `FlowState` na ten enum,
/// dzięki czemu motyw nie zależy od warstwy domeny.
enum FlowTone {
  /// Głęboka koncentracja — chronimy ją, nie przerywamy.
  deepFocus,

  /// Płynna praca, wysoka spójność sygnału.
  flow,

  /// Dryf uwagi — moment przed rozproszeniem (kluczowy dla interwencji).
  drift,

  /// Niepokój ruchowy: mikroruchy, częste wybudzenia ekranu.
  restless,

  /// Zmęczenie poznawcze — spadek tempa i wzrost bezwładności.
  fatigue,

  /// Regeneracja — świadoma przerwa, ruch, odejście od ekranu.
  recovery,
}

/// Surowe wartości kolorów. Nie używaj ich bezpośrednio w widżetach —
/// korzystaj z [KairosPalette] pobranej z motywu.
abstract final class KairosRaw {
  // Neutralne — tryb ciemny
  static const Color ink000 = Color(0xFF06080B);
  static const Color ink100 = Color(0xFF0B0E13);
  static const Color ink200 = Color(0xFF11151C);
  static const Color ink300 = Color(0xFF161B24);
  static const Color ink400 = Color(0xFF1F2632);
  static const Color ink500 = Color(0xFF2B3442);

  // Neutralne — tryb jasny
  static const Color paper000 = Color(0xFFF7F8FA);
  static const Color paper100 = Color(0xFFFFFFFF);
  static const Color paper200 = Color(0xFFF1F3F7);
  static const Color paper300 = Color(0xFFE4E8EF);
  static const Color paper400 = Color(0xFFD3D9E3);

  // Tekst
  static const Color textOnDarkPrimary = Color(0xFFF2F5F9);
  static const Color textOnDarkSecondary = Color(0xFFA8B3C4);
  static const Color textOnDarkTertiary = Color(0xFF6C788B);
  static const Color textOnLightPrimary = Color(0xFF0C1017);
  static const Color textOnLightSecondary = Color(0xFF4A5567);
  static const Color textOnLightTertiary = Color(0xFF7C8798);

  // Tony stanów
  static const Color deepFocus = Color(0xFF22D3EE);
  static const Color flow = Color(0xFF4ADE80);
  static const Color drift = Color(0xFFF59E0B);
  static const Color restless = Color(0xFFFB7185);
  static const Color fatigue = Color(0xFFA78BFA);
  static const Color recovery = Color(0xFF60A5FA);

  // Semantyczne
  static const Color positive = Color(0xFF34D399);
  static const Color warning = Color(0xFFFBBF24);
  static const Color danger = Color(0xFFF43F5E);

  // Aurora (sygnaturowy gradient marki)
  static const Color auroraStart = Color(0xFF22D3EE);
  static const Color auroraMid = Color(0xFF818CF8);
  static const Color auroraEnd = Color(0xFFF472B6);
}

/// Pełna paleta semantyczna Kairos, wpięta w [ThemeData] jako rozszerzenie.
///
/// Dostęp w widżecie:
/// ```dart
/// final palette = Theme.of(context).extension<KairosPalette>()!;
/// ```
/// lub przez skrót [KairosPaletteX.palette] na `BuildContext`.
@immutable
class KairosPalette extends ThemeExtension<KairosPalette> {
  const KairosPalette({
    required this.canvas,
    required this.surface,
    required this.surfaceElevated,
    required this.surfaceSunken,
    required this.hairline,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.deepFocus,
    required this.flow,
    required this.drift,
    required this.restless,
    required this.fatigue,
    required this.recovery,
    required this.positive,
    required this.warning,
    required this.danger,
    required this.auroraStart,
    required this.auroraMid,
    required this.auroraEnd,
    required this.glassTint,
    required this.glassBorder,
    required this.shadow,
  });

  final Color canvas;
  final Color surface;
  final Color surfaceElevated;
  final Color surfaceSunken;
  final Color hairline;

  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;

  final Color deepFocus;
  final Color flow;
  final Color drift;
  final Color restless;
  final Color fatigue;
  final Color recovery;

  final Color positive;
  final Color warning;
  final Color danger;

  final Color auroraStart;
  final Color auroraMid;
  final Color auroraEnd;

  final Color glassTint;
  final Color glassBorder;
  final Color shadow;

  /// Paleta trybu ciemnego (domyślna dla Kairos — aplikacja bywa używana
  /// wieczorem, przy niskiej luminancji otoczenia).
  static const KairosPalette dark = KairosPalette(
    canvas: KairosRaw.ink000,
    surface: KairosRaw.ink200,
    surfaceElevated: KairosRaw.ink300,
    surfaceSunken: KairosRaw.ink100,
    hairline: KairosRaw.ink500,
    textPrimary: KairosRaw.textOnDarkPrimary,
    textSecondary: KairosRaw.textOnDarkSecondary,
    textTertiary: KairosRaw.textOnDarkTertiary,
    deepFocus: KairosRaw.deepFocus,
    flow: KairosRaw.flow,
    drift: KairosRaw.drift,
    restless: KairosRaw.restless,
    fatigue: KairosRaw.fatigue,
    recovery: KairosRaw.recovery,
    positive: KairosRaw.positive,
    warning: KairosRaw.warning,
    danger: KairosRaw.danger,
    auroraStart: KairosRaw.auroraStart,
    auroraMid: KairosRaw.auroraMid,
    auroraEnd: KairosRaw.auroraEnd,
    glassTint: Color(0x14FFFFFF),
    glassBorder: Color(0x1FFFFFFF),
    shadow: Color(0x8A000000),
  );

  /// Paleta trybu jasnego — te same tony stanów, przyciemnione dla kontrastu
  /// na jasnym tle (WCAG AA dla tekstu i ikon o rozmiarze ≥ 18 px).
  static const KairosPalette light = KairosPalette(
    canvas: KairosRaw.paper000,
    surface: KairosRaw.paper100,
    surfaceElevated: KairosRaw.paper100,
    surfaceSunken: KairosRaw.paper200,
    hairline: KairosRaw.paper300,
    textPrimary: KairosRaw.textOnLightPrimary,
    textSecondary: KairosRaw.textOnLightSecondary,
    textTertiary: KairosRaw.textOnLightTertiary,
    deepFocus: Color(0xFF0E7490),
    flow: Color(0xFF15803D),
    drift: Color(0xFFB45309),
    restless: Color(0xFFBE123C),
    fatigue: Color(0xFF6D28D9),
    recovery: Color(0xFF1D4ED8),
    positive: Color(0xFF047857),
    warning: Color(0xFFB45309),
    danger: Color(0xFFBE123C),
    auroraStart: Color(0xFF0891B2),
    auroraMid: Color(0xFF6366F1),
    auroraEnd: Color(0xFFDB2777),
    glassTint: Color(0x0A0C1017),
    glassBorder: Color(0x140C1017),
    shadow: Color(0x1A0C1017),
  );

  /// Kolor bazowy dla danego tonu stanu.
  Color toneColor(FlowTone tone) => switch (tone) {
    FlowTone.deepFocus => deepFocus,
    FlowTone.flow => flow,
    FlowTone.drift => drift,
    FlowTone.restless => restless,
    FlowTone.fatigue => fatigue,
    FlowTone.recovery => recovery,
  };

  /// Miękki wariant tonu — tła plakietek, wypełnienia kart, „ghost buttons”.
  Color toneSoft(FlowTone tone, {double opacity = 0.14}) =>
      toneColor(tone).withValues(alpha: opacity);

  /// Gradient tonu używany m.in. przez pierścień oddechu na ekranie głównym.
  LinearGradient toneGradient(FlowTone tone) {
    final Color base = toneColor(tone);
    return LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: <Color>[
        Color.lerp(base, auroraMid, 0.35) ?? base,
        base,
        Color.lerp(base, canvas, 0.45) ?? base,
      ],
      stops: const <double>[0.0, 0.55, 1.0],
    );
  }

  /// Sygnaturowy gradient marki (splash, onboarding, nagłówki).
  LinearGradient get aurora => LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: <Color>[auroraStart, auroraMid, auroraEnd],
    stops: const <double>[0.0, 0.5, 1.0],
  );

  /// Delikatna poświata pod kartami stanu.
  List<BoxShadow> toneGlow(FlowTone tone, {double intensity = 1}) {
    final Color base = toneColor(tone);
    return <BoxShadow>[
      BoxShadow(
        color: base.withValues(alpha: 0.22 * intensity),
        blurRadius: 42 * intensity,
        spreadRadius: -6,
        offset: const Offset(0, 12),
      ),
      BoxShadow(
        color: shadow,
        blurRadius: 24,
        spreadRadius: -12,
        offset: const Offset(0, 8),
      ),
    ];
  }

  @override
  KairosPalette copyWith({
    Color? canvas,
    Color? surface,
    Color? surfaceElevated,
    Color? surfaceSunken,
    Color? hairline,
    Color? textPrimary,
    Color? textSecondary,
    Color? textTertiary,
    Color? deepFocus,
    Color? flow,
    Color? drift,
    Color? restless,
    Color? fatigue,
    Color? recovery,
    Color? positive,
    Color? warning,
    Color? danger,
    Color? auroraStart,
    Color? auroraMid,
    Color? auroraEnd,
    Color? glassTint,
    Color? glassBorder,
    Color? shadow,
  }) {
    return KairosPalette(
      canvas: canvas ?? this.canvas,
      surface: surface ?? this.surface,
      surfaceElevated: surfaceElevated ?? this.surfaceElevated,
      surfaceSunken: surfaceSunken ?? this.surfaceSunken,
      hairline: hairline ?? this.hairline,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textTertiary: textTertiary ?? this.textTertiary,
      deepFocus: deepFocus ?? this.deepFocus,
      flow: flow ?? this.flow,
      drift: drift ?? this.drift,
      restless: restless ?? this.restless,
      fatigue: fatigue ?? this.fatigue,
      recovery: recovery ?? this.recovery,
      positive: positive ?? this.positive,
      warning: warning ?? this.warning,
      danger: danger ?? this.danger,
      auroraStart: auroraStart ?? this.auroraStart,
      auroraMid: auroraMid ?? this.auroraMid,
      auroraEnd: auroraEnd ?? this.auroraEnd,
      glassTint: glassTint ?? this.glassTint,
      glassBorder: glassBorder ?? this.glassBorder,
      shadow: shadow ?? this.shadow,
    );
  }

  @override
  KairosPalette lerp(ThemeExtension<KairosPalette>? other, double t) {
    if (other is! KairosPalette) {
      return this;
    }
    Color mix(Color a, Color b) => Color.lerp(a, b, t) ?? a;
    return KairosPalette(
      canvas: mix(canvas, other.canvas),
      surface: mix(surface, other.surface),
      surfaceElevated: mix(surfaceElevated, other.surfaceElevated),
      surfaceSunken: mix(surfaceSunken, other.surfaceSunken),
      hairline: mix(hairline, other.hairline),
      textPrimary: mix(textPrimary, other.textPrimary),
      textSecondary: mix(textSecondary, other.textSecondary),
      textTertiary: mix(textTertiary, other.textTertiary),
      deepFocus: mix(deepFocus, other.deepFocus),
      flow: mix(flow, other.flow),
      drift: mix(drift, other.drift),
      restless: mix(restless, other.restless),
      fatigue: mix(fatigue, other.fatigue),
      recovery: mix(recovery, other.recovery),
      positive: mix(positive, other.positive),
      warning: mix(warning, other.warning),
      danger: mix(danger, other.danger),
      auroraStart: mix(auroraStart, other.auroraStart),
      auroraMid: mix(auroraMid, other.auroraMid),
      auroraEnd: mix(auroraEnd, other.auroraEnd),
      glassTint: mix(glassTint, other.glassTint),
      glassBorder: mix(glassBorder, other.glassBorder),
      shadow: mix(shadow, other.shadow),
    );
  }
}

/// Skróty dostępowe do motywu — ograniczają szum w widżetach.
extension KairosPaletteX on BuildContext {
  KairosPalette get palette =>
      Theme.of(this).extension<KairosPalette>() ?? KairosPalette.dark;

  TextTheme get text => Theme.of(this).textTheme;

  ColorScheme get colors => Theme.of(this).colorScheme;

  bool get isDark => Theme.of(this).brightness == Brightness.dark;
}
