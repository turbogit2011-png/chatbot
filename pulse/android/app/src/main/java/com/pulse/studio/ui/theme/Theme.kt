package com.pulse.studio.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

val Magenta = Color(0xFFFF4D8B)
val Tangerine = Color(0xFFFF7A4D)
val Amber = Color(0xFFFFC24D)
val Aqua = Color(0xFF4DD2FF)
val Violet = Color(0xFF9B6BFF)
val Ink = Color(0xFF07070D)
val InkRaised = Color(0xFF101019)
val InkCard = Color(0xFF15151F)

private val PulseScheme = darkColorScheme(
    primary = Magenta,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF3A0F23),
    onPrimaryContainer = Color(0xFFFFD9E4),
    secondary = Aqua,
    onSecondary = Color(0xFF00242E),
    tertiary = Amber,
    onTertiary = Color(0xFF2A1C00),
    background = Ink,
    onBackground = Color(0xFFECEAF2),
    surface = Ink,
    onSurface = Color(0xFFECEAF2),
    surfaceVariant = InkCard,
    onSurfaceVariant = Color(0xFFB3B0C2),
    surfaceContainer = InkRaised,
    surfaceContainerHigh = InkCard,
    surfaceContainerHighest = Color(0xFF1C1C28),
    outline = Color(0xFF3A3A4C),
    outlineVariant = Color(0xFF26262F),
    error = Color(0xFFFF6B6B),
)

val PulseTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Black,
        fontSize = 32.sp, lineHeight = 38.sp, letterSpacing = (-0.6).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.ExtraBold,
        fontSize = 26.sp, lineHeight = 32.sp, letterSpacing = (-0.4).sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold,
        fontSize = 21.sp, lineHeight = 27.sp,
    ),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp),
    titleSmall = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 19.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 17.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 12.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 0.4.sp),
)

val PulseBrush: Brush get() = Brush.linearGradient(listOf(Magenta, Violet, Aqua))

@Composable
fun PulseTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            (view.context as? Activity)?.window?.let { window ->
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
            }
        }
    }
    MaterialTheme(colorScheme = PulseScheme, typography = PulseTypography, content = content)
}
