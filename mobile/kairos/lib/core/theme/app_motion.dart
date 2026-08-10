import 'package:flutter/material.dart';

/// Tokeny ruchu Kairos.
///
/// Zasada projektowa: animacja niesie informację o stanie systemu, nigdy nie
/// jest ozdobnikiem. Wszystkie czasy trwania są dostępne przez motyw, aby
/// respektować `MediaQuery.disableAnimations` (dostępność) w jednym miejscu —
/// patrz [AppMotion.of].
@immutable
class AppMotion extends ThemeExtension<AppMotion> {
  const AppMotion({
    required this.instant,
    required this.quick,
    required this.base,
    required this.slow,
    required this.deliberate,
    required this.ambient,
    required this.breath,
    required this.enter,
    required this.exit,
    required this.emphasized,
    required this.spring,
    required this.scaleFactor,
  });

  /// Domyślny zestaw tokenów.
  static const AppMotion standard = AppMotion(
    instant: Duration(milliseconds: 90),
    quick: Duration(milliseconds: 160),
    base: Duration(milliseconds: 240),
    slow: Duration(milliseconds: 380),
    deliberate: Duration(milliseconds: 620),
    ambient: Duration(milliseconds: 1200),
    breath: Duration(milliseconds: 4200),
    enter: Curves.easeOutCubic,
    exit: Curves.easeInCubic,
    emphasized: Curves.easeInOutCubicEmphasized,
    spring: Curves.elasticOut,
    scaleFactor: 1,
  );

  /// Wariant dla użytkowników z włączoną redukcją ruchu — czasy skracamy do
  /// zera, krzywe upraszczamy, ale nie usuwamy przejść stanu (cross-fade).
  static const AppMotion reduced = AppMotion(
    instant: Duration.zero,
    quick: Duration.zero,
    base: Duration(milliseconds: 80),
    slow: Duration(milliseconds: 80),
    deliberate: Duration(milliseconds: 120),
    ambient: Duration(milliseconds: 120),
    breath: Duration(milliseconds: 120),
    enter: Curves.linear,
    exit: Curves.linear,
    emphasized: Curves.linear,
    spring: Curves.linear,
    scaleFactor: 0,
  );

  /// Mikro-feedback dotyku (podświetlenie, zmiana ikony).
  final Duration instant;

  /// Reakcja na gest (skala przycisku, ripple).
  final Duration quick;

  /// Domyślne przejście komponentu.
  final Duration base;

  /// Wejście karty, rozwinięcie sekcji.
  final Duration slow;

  /// Zmiana stanu poznawczego — celowo powolna, żeby nie płoszyć skupienia.
  final Duration deliberate;

  /// Przejścia ekranów, sekwencje onboardingu.
  final Duration ambient;

  /// Pełny cykl „oddechu” pierścienia na ekranie głównym.
  final Duration breath;

  final Curve enter;
  final Curve exit;
  final Curve emphasized;
  final Curve spring;

  /// 1 = pełna amplituda animacji, 0 = ruch zredukowany (dostępność).
  final double scaleFactor;

  /// Zwraca tokeny ruchu z uwzględnieniem ustawień dostępności systemu.
  static AppMotion of(BuildContext context) {
    final AppMotion tokens =
        Theme.of(context).extension<AppMotion>() ?? AppMotion.standard;
    return MediaQuery.maybeOf(context)?.disableAnimations ?? false
        ? AppMotion.reduced
        : tokens;
  }

  /// Skaluje przesunięcie/amplitudę zgodnie z [scaleFactor].
  double amplitude(double value) => value * scaleFactor;

  @override
  AppMotion copyWith({
    Duration? instant,
    Duration? quick,
    Duration? base,
    Duration? slow,
    Duration? deliberate,
    Duration? ambient,
    Duration? breath,
    Curve? enter,
    Curve? exit,
    Curve? emphasized,
    Curve? spring,
    double? scaleFactor,
  }) {
    return AppMotion(
      instant: instant ?? this.instant,
      quick: quick ?? this.quick,
      base: base ?? this.base,
      slow: slow ?? this.slow,
      deliberate: deliberate ?? this.deliberate,
      ambient: ambient ?? this.ambient,
      breath: breath ?? this.breath,
      enter: enter ?? this.enter,
      exit: exit ?? this.exit,
      emphasized: emphasized ?? this.emphasized,
      spring: spring ?? this.spring,
      scaleFactor: scaleFactor ?? this.scaleFactor,
    );
  }

  @override
  AppMotion lerp(ThemeExtension<AppMotion>? other, double t) {
    if (other is! AppMotion) {
      return this;
    }
    Duration mix(Duration a, Duration b) => Duration(
      microseconds:
          (a.inMicroseconds + (b.inMicroseconds - a.inMicroseconds) * t).round(),
    );
    return AppMotion(
      instant: mix(instant, other.instant),
      quick: mix(quick, other.quick),
      base: mix(base, other.base),
      slow: mix(slow, other.slow),
      deliberate: mix(deliberate, other.deliberate),
      ambient: mix(ambient, other.ambient),
      breath: mix(breath, other.breath),
      enter: t < 0.5 ? enter : other.enter,
      exit: t < 0.5 ? exit : other.exit,
      emphasized: t < 0.5 ? emphasized : other.emphasized,
      spring: t < 0.5 ? spring : other.spring,
      scaleFactor: scaleFactor + (other.scaleFactor - scaleFactor) * t,
    );
  }
}

/// Tokeny geometrii — promienie, odstępy, grubości linii.
abstract final class AppGeometry {
  static const double radiusXs = 8;
  static const double radiusSm = 12;
  static const double radiusMd = 18;
  static const double radiusLg = 26;
  static const double radiusXl = 34;
  static const double radiusPill = 999;

  static const double spaceXxs = 4;
  static const double spaceXs = 8;
  static const double spaceSm = 12;
  static const double spaceMd = 16;
  static const double spaceLg = 24;
  static const double spaceXl = 32;
  static const double spaceXxl = 48;

  static const double hairline = 1;
  static const double ringStroke = 14;

  static const BorderRadius cardRadius = BorderRadius.all(
    Radius.circular(radiusLg),
  );
  static const BorderRadius sheetRadius = BorderRadius.vertical(
    top: Radius.circular(radiusXl),
  );
  static const BorderRadius chipRadius = BorderRadius.all(
    Radius.circular(radiusPill),
  );
}
