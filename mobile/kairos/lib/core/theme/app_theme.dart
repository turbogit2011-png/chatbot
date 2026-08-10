import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_colors.dart';
import 'app_motion.dart';
import 'app_typography.dart';

/// Fabryka motywów aplikacji.
///
/// Cały wygląd wynika z [KairosPalette] + [AppTypography] + [AppMotion];
/// żaden widżet nie definiuje własnych, „luźnych” kolorów ani czasów animacji.
abstract final class AppTheme {
  static ThemeData dark() => _build(
    palette: KairosPalette.dark,
    brightness: Brightness.dark,
    overlay: SystemUiOverlayStyle.light.copyWith(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.light,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
    ),
  );

  static ThemeData light() => _build(
    palette: KairosPalette.light,
    brightness: Brightness.light,
    overlay: SystemUiOverlayStyle.dark.copyWith(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.dark,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
    ),
  );

  static ThemeData _build({
    required KairosPalette palette,
    required Brightness brightness,
    required SystemUiOverlayStyle overlay,
  }) {
    final bool isDark = brightness == Brightness.dark;
    final TextTheme textTheme = AppTypography.build(palette);

    final ColorScheme scheme = ColorScheme(
      brightness: brightness,
      primary: palette.deepFocus,
      onPrimary: isDark ? KairosRaw.ink000 : Colors.white,
      primaryContainer: palette.deepFocus.withValues(alpha: isDark ? 0.18 : 0.12),
      onPrimaryContainer: palette.textPrimary,
      secondary: palette.auroraMid,
      onSecondary: isDark ? KairosRaw.ink000 : Colors.white,
      secondaryContainer: palette.auroraMid.withValues(alpha: isDark ? 0.18 : 0.12),
      onSecondaryContainer: palette.textPrimary,
      tertiary: palette.recovery,
      onTertiary: isDark ? KairosRaw.ink000 : Colors.white,
      error: palette.danger,
      onError: Colors.white,
      errorContainer: palette.danger.withValues(alpha: isDark ? 0.18 : 0.12),
      onErrorContainer: palette.textPrimary,
      surface: palette.surface,
      onSurface: palette.textPrimary,
      surfaceContainerLowest: palette.canvas,
      surfaceContainerLow: palette.surfaceSunken,
      surfaceContainer: palette.surface,
      surfaceContainerHigh: palette.surfaceElevated,
      surfaceContainerHighest: palette.surfaceElevated,
      onSurfaceVariant: palette.textSecondary,
      outline: palette.hairline,
      outlineVariant: palette.hairline.withValues(alpha: 0.6),
      shadow: palette.shadow,
      scrim: Colors.black.withValues(alpha: isDark ? 0.72 : 0.42),
      inverseSurface: isDark ? KairosRaw.paper100 : KairosRaw.ink200,
      onInverseSurface: isDark
          ? KairosRaw.textOnLightPrimary
          : KairosRaw.textOnDarkPrimary,
      inversePrimary: palette.auroraMid,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: palette.canvas,
      canvasColor: palette.canvas,
      textTheme: textTheme,
      primaryTextTheme: textTheme,
      splashFactory: InkSparkle.splashFactory,
      visualDensity: VisualDensity.standard,
      extensions: <ThemeExtension<dynamic>>[palette, AppMotion.standard],

      pageTransitionsTheme: const PageTransitionsTheme(
        builders: <TargetPlatform, PageTransitionsBuilder>{
          TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
        },
      ),

      appBarTheme: AppBarTheme(
        backgroundColor: palette.canvas,
        surfaceTintColor: Colors.transparent,
        foregroundColor: palette.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        systemOverlayStyle: overlay,
        titleTextStyle: textTheme.headlineSmall,
        iconTheme: IconThemeData(color: palette.textSecondary, size: 22),
      ),

      cardTheme: CardThemeData(
        color: palette.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: AppGeometry.cardRadius,
          side: BorderSide(color: palette.hairline, width: AppGeometry.hairline),
        ),
      ),

      dividerTheme: DividerThemeData(
        color: palette.hairline,
        thickness: AppGeometry.hairline,
        space: AppGeometry.spaceLg,
      ),

      iconTheme: IconThemeData(color: palette.textSecondary, size: 22),

      filledButtonTheme: FilledButtonThemeData(
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith<Color>((
            Set<WidgetState> states,
          ) {
            if (states.contains(WidgetState.disabled)) {
              return palette.hairline;
            }
            return scheme.primary;
          }),
          foregroundColor: WidgetStateProperty.resolveWith<Color>((
            Set<WidgetState> states,
          ) {
            if (states.contains(WidgetState.disabled)) {
              return palette.textTertiary;
            }
            return scheme.onPrimary;
          }),
          textStyle: WidgetStatePropertyAll<TextStyle?>(textTheme.labelLarge),
          minimumSize: const WidgetStatePropertyAll<Size>(Size(64, 52)),
          padding: const WidgetStatePropertyAll<EdgeInsetsGeometry>(
            EdgeInsets.symmetric(horizontal: AppGeometry.spaceLg),
          ),
          shape: const WidgetStatePropertyAll<OutlinedBorder>(
            RoundedRectangleBorder(borderRadius: AppGeometry.chipRadius),
          ),
          elevation: const WidgetStatePropertyAll<double>(0),
          overlayColor: WidgetStatePropertyAll<Color>(
            scheme.onPrimary.withValues(alpha: 0.08),
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: ButtonStyle(
          foregroundColor: WidgetStatePropertyAll<Color>(palette.textPrimary),
          textStyle: WidgetStatePropertyAll<TextStyle?>(textTheme.labelLarge),
          minimumSize: const WidgetStatePropertyAll<Size>(Size(64, 52)),
          padding: const WidgetStatePropertyAll<EdgeInsetsGeometry>(
            EdgeInsets.symmetric(horizontal: AppGeometry.spaceLg),
          ),
          side: WidgetStatePropertyAll<BorderSide>(
            BorderSide(color: palette.hairline, width: AppGeometry.hairline),
          ),
          shape: const WidgetStatePropertyAll<OutlinedBorder>(
            RoundedRectangleBorder(borderRadius: AppGeometry.chipRadius),
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: ButtonStyle(
          foregroundColor: WidgetStatePropertyAll<Color>(scheme.primary),
          textStyle: WidgetStatePropertyAll<TextStyle?>(textTheme.labelMedium),
          padding: const WidgetStatePropertyAll<EdgeInsetsGeometry>(
            EdgeInsets.symmetric(
              horizontal: AppGeometry.spaceSm,
              vertical: AppGeometry.spaceXs,
            ),
          ),
          shape: const WidgetStatePropertyAll<OutlinedBorder>(
            RoundedRectangleBorder(borderRadius: AppGeometry.chipRadius),
          ),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: palette.surfaceSunken,
        hintStyle: textTheme.bodyMedium?.copyWith(color: palette.textTertiary),
        labelStyle: textTheme.labelMedium,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppGeometry.spaceMd,
          vertical: AppGeometry.spaceMd,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppGeometry.radiusMd),
          borderSide: BorderSide(color: palette.hairline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppGeometry.radiusMd),
          borderSide: BorderSide(color: palette.hairline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppGeometry.radiusMd),
          borderSide: BorderSide(color: scheme.primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppGeometry.radiusMd),
          borderSide: BorderSide(color: scheme.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppGeometry.radiusMd),
          borderSide: BorderSide(color: scheme.error, width: 1.6),
        ),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: palette.surfaceSunken,
        selectedColor: scheme.primaryContainer,
        side: BorderSide(color: palette.hairline),
        labelStyle: textTheme.labelMedium ?? const TextStyle(),
        secondaryLabelStyle: textTheme.labelMedium ?? const TextStyle(),
        padding: const EdgeInsets.symmetric(
          horizontal: AppGeometry.spaceSm,
          vertical: AppGeometry.spaceXs,
        ),
        shape: const RoundedRectangleBorder(
          borderRadius: AppGeometry.chipRadius,
        ),
        showCheckmark: false,
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: palette.surfaceSunken,
        surfaceTintColor: Colors.transparent,
        indicatorColor: scheme.primary.withValues(alpha: 0.16),
        elevation: 0,
        height: 68,
        labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
        labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>((
          Set<WidgetState> states,
        ) {
          final TextStyle? base = textTheme.labelSmall?.copyWith(
            fontFamily: AppTypography.body,
            letterSpacing: 0.2,
          );
          return states.contains(WidgetState.selected)
              ? base?.copyWith(
                  color: palette.textPrimary,
                  fontWeight: FontWeight.w600,
                )
              : base?.copyWith(color: palette.textTertiary);
        }),
        iconTheme: WidgetStateProperty.resolveWith<IconThemeData>((
          Set<WidgetState> states,
        ) {
          return IconThemeData(
            size: 24,
            color: states.contains(WidgetState.selected)
                ? scheme.primary
                : palette.textTertiary,
          );
        }),
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: palette.surface,
        surfaceTintColor: Colors.transparent,
        modalBackgroundColor: palette.surface,
        modalBarrierColor: scheme.scrim,
        elevation: 0,
        showDragHandle: true,
        dragHandleColor: palette.hairline,
        shape: const RoundedRectangleBorder(
          borderRadius: AppGeometry.sheetRadius,
        ),
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: palette.surfaceElevated,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        titleTextStyle: textTheme.headlineSmall,
        contentTextStyle: textTheme.bodyMedium,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppGeometry.radiusLg),
          side: BorderSide(color: palette.hairline),
        ),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: palette.surfaceElevated,
        contentTextStyle: textTheme.bodyMedium?.copyWith(
          color: palette.textPrimary,
        ),
        actionTextColor: scheme.primary,
        behavior: SnackBarBehavior.floating,
        elevation: 0,
        insetPadding: const EdgeInsets.all(AppGeometry.spaceMd),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppGeometry.radiusMd),
          side: BorderSide(color: palette.hairline),
        ),
      ),

      listTileTheme: ListTileThemeData(
        iconColor: palette.textSecondary,
        textColor: palette.textPrimary,
        titleTextStyle: textTheme.titleMedium,
        subtitleTextStyle: textTheme.bodySmall,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppGeometry.spaceMd,
          vertical: AppGeometry.spaceXxs,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppGeometry.radiusMd),
        ),
      ),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith<Color>((
          Set<WidgetState> states,
        ) {
          return states.contains(WidgetState.selected)
              ? scheme.onPrimary
              : palette.textTertiary;
        }),
        trackColor: WidgetStateProperty.resolveWith<Color>((
          Set<WidgetState> states,
        ) {
          return states.contains(WidgetState.selected)
              ? scheme.primary
              : palette.surfaceSunken;
        }),
        trackOutlineColor: WidgetStatePropertyAll<Color>(palette.hairline),
      ),

      sliderTheme: SliderThemeData(
        activeTrackColor: scheme.primary,
        inactiveTrackColor: palette.hairline,
        thumbColor: scheme.primary,
        overlayColor: scheme.primary.withValues(alpha: 0.12),
        trackHeight: 6,
        valueIndicatorTextStyle: textTheme.labelSmall,
      ),

      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: scheme.primary,
        linearTrackColor: palette.hairline,
        circularTrackColor: palette.hairline,
        linearMinHeight: 4,
      ),

      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: palette.surfaceElevated,
          borderRadius: BorderRadius.circular(AppGeometry.radiusSm),
          border: Border.all(color: palette.hairline),
        ),
        textStyle: textTheme.bodySmall?.copyWith(color: palette.textPrimary),
        padding: const EdgeInsets.symmetric(
          horizontal: AppGeometry.spaceSm,
          vertical: AppGeometry.spaceXs,
        ),
      ),

      tabBarTheme: TabBarThemeData(
        labelColor: palette.textPrimary,
        unselectedLabelColor: palette.textTertiary,
        labelStyle: textTheme.labelLarge,
        unselectedLabelStyle: textTheme.labelMedium,
        indicatorColor: scheme.primary,
        indicatorSize: TabBarIndicatorSize.label,
        dividerColor: Colors.transparent,
      ),
    );
  }
}
