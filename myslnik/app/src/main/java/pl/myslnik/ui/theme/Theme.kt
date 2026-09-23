package pl.myslnik.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp

private val DarkColors = darkColorScheme(
    primary = Color(0xFF8AB4F8),
    onPrimary = Color(0xFF0B2545),
    secondary = Color(0xFF80CBC4),
    background = Color(0xFF101418),
    surface = Color(0xFF171C22),
    surfaceVariant = Color(0xFF232A33),
    onBackground = Color(0xFFECEFF1),
    onSurface = Color(0xFFECEFF1),
    error = Color(0xFFEF9A9A),
)

/** Wariant maksymalnie przygaszony na NOC — bez jaskrawej bieli. */
private val NightColors = darkColorScheme(
    primary = Color(0xFF8D7B5A),
    onPrimary = Color(0xFF14100A),
    secondary = Color(0xFF6E5F49),
    background = Color(0xFF0A0806),
    surface = Color(0xFF14100C),
    surfaceVariant = Color(0xFF1C1712),
    onBackground = Color(0xFF9C8C74),
    onSurface = Color(0xFF9C8C74),
    error = Color(0xFF8C5A5A),
)

val AppTypography = Typography(
    bodyLarge = TextStyle(fontSize = 18.sp),
    titleLarge = TextStyle(fontSize = 24.sp),
)

@Composable
fun MyslnikTheme(nightDim: Boolean = false, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (nightDim) NightColors else DarkColors,
        typography = AppTypography,
        content = content
    )
}
