package com.sonara.studio.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

val Violet = Color(0xFF8B5CF6)
val Fuchsia = Color(0xFFD946EF)
val Cyan = Color(0xFF22D3EE)
val Indigo = Color(0xFF6366F1)
val Amber = Color(0xFFFBBF24)
val Rose = Color(0xFFFB7185)
val Ink = Color(0xFF070711)
val InkRaised = Color(0xFF101024)
val InkCard = Color(0xFF15152E)

private val SonaraDark = darkColorScheme(
    primary = Violet,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF2B1B52),
    onPrimaryContainer = Color(0xFFE9DDFF),
    secondary = Cyan,
    onSecondary = Color(0xFF00252C),
    secondaryContainer = Color(0xFF123A42),
    onSecondaryContainer = Color(0xFFB8F1FB),
    tertiary = Fuchsia,
    onTertiary = Color.White,
    background = Ink,
    onBackground = Color(0xFFEDEBF8),
    surface = Ink,
    onSurface = Color(0xFFEDEBF8),
    surfaceVariant = InkCard,
    onSurfaceVariant = Color(0xFFB9B5CE),
    surfaceContainer = InkRaised,
    surfaceContainerHigh = InkCard,
    surfaceContainerHighest = Color(0xFF1C1C38),
    outline = Color(0xFF3A3A5C),
    outlineVariant = Color(0xFF26263F),
    error = Color(0xFFFF6B6B),
    onError = Color.White,
)

private val SonaraLight = lightColorScheme(
    primary = Color(0xFF6D3BE4),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFEADDFF),
    onPrimaryContainer = Color(0xFF24005B),
    secondary = Color(0xFF0E7490),
    tertiary = Color(0xFFA21CAF),
    background = Color(0xFFFBF8FF),
    onBackground = Color(0xFF14121C),
    surface = Color(0xFFFBF8FF),
    onSurface = Color(0xFF14121C),
    surfaceVariant = Color(0xFFEDE7F6),
    onSurfaceVariant = Color(0xFF4A4458),
)

val SonaraTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Black,
        fontSize = 32.sp,
        lineHeight = 38.sp,
        letterSpacing = (-0.6).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 26.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.4).sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 21.sp,
        lineHeight = 27.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 19.sp,
    ),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 17.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 12.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 0.4.sp),
)

val AuroraBrush: Brush
    get() = Brush.linearGradient(listOf(Violet, Fuchsia, Cyan))

val AuroraVertical: Brush
    get() = Brush.verticalGradient(
        listOf(
            Violet.copy(alpha = 0.35f),
            Indigo.copy(alpha = 0.12f),
            Color.Transparent,
        )
    )

val CardElevation = 0.dp

@Composable
fun SonaraTheme(
    dynamicColor: Boolean = false,
    darkTheme: Boolean = true,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val useDark = darkTheme || isSystemInDarkTheme()
    val scheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (useDark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        useDark -> SonaraDark
        else -> SonaraLight
    }
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !useDark
        }
    }
    MaterialTheme(colorScheme = scheme, typography = SonaraTypography, content = content)
}
