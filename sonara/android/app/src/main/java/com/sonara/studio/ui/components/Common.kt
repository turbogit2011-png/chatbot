package com.sonara.studio.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.sonara.studio.ui.theme.AuroraBrush
import java.io.File
import kotlin.math.abs
import kotlin.math.sin

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier, trailing: (@Composable () -> Unit)? = null) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = text.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            letterSpacing = 1.2.sp,
            fontWeight = FontWeight.Bold,
        )
        trailing?.invoke()
    }
}

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    val shape = RoundedCornerShape(22.dp)
    Surface(
        modifier = modifier
            .clip(shape)
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier),
        shape = shape,
        color = MaterialTheme.colorScheme.surfaceContainer,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Box(Modifier.padding(16.dp)) { content() }
    }
}

@Composable
fun GradientButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: (@Composable () -> Unit)? = null,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(18.dp)
    Box(
        modifier = modifier
            .height(56.dp)
            .clip(shape)
            .background(if (enabled) AuroraBrush else Brush.linearGradient(listOf(Color(0xFF2A2A40), Color(0xFF24243A))))
            .clickable(enabled = enabled && !loading) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
            if (loading) {
                PulsingDots()
                Spacer(Modifier.width(10.dp))
            } else if (icon != null) {
                icon()
                Spacer(Modifier.width(8.dp))
            }
            Text(
                text = text,
                style = MaterialTheme.typography.labelLarge,
                color = Color.White.copy(alpha = if (enabled) 1f else 0.5f),
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
            )
        }
    }
}

@Composable
fun PulsingDots(color: Color = Color.White) {
    val transition = rememberInfiniteTransition(label = "dots")
    Row(verticalAlignment = Alignment.CenterVertically) {
        repeat(3) { index ->
            val scale by transition.animateFloat(
                initialValue = 0.4f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(560, delayMillis = index * 160, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse,
                ),
                label = "dot$index",
            )
            Box(
                Modifier
                    .padding(horizontal = 2.dp)
                    .size(6.dp)
                    .alpha(scale)
                    .background(color, CircleShape)
            )
        }
    }
}

@Composable
fun TagChip(
    text: String,
    selected: Boolean = false,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
) {
    val background by animateColorAsState(
        if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.22f)
        else MaterialTheme.colorScheme.surfaceContainerHigh,
        label = "chipBg",
    )
    val border by animateColorAsState(
        if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
        label = "chipBorder",
    )
    Box(
        modifier = modifier
            .clip(CircleShape)
            .background(background)
            .border(1.dp, border, CircleShape)
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(horizontal = 14.dp, vertical = 9.dp),
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
        )
    }
}

@Composable
fun SliderRow(
    label: String,
    value: Float,
    valueLabel: String,
    modifier: Modifier = Modifier,
    range: ClosedFloatingPointRange<Float> = 0f..1f,
    steps: Int = 0,
    onChange: (Float) -> Unit,
) {
    Column(modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodyMedium)
            Text(
                valueLabel,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold,
            )
        }
        Slider(
            value = value,
            onValueChange = onChange,
            valueRange = range,
            steps = steps,
            colors = SliderDefaults.colors(
                thumbColor = MaterialTheme.colorScheme.primary,
                activeTrackColor = MaterialTheme.colorScheme.primary,
                inactiveTrackColor = MaterialTheme.colorScheme.outlineVariant,
            ),
        )
    }
}

/**
 * Deterministic cover art: a real image when the backend produced one, otherwise a
 * gradient derived from the song id so every track keeps a stable identity offline.
 */
@Composable
fun CoverArt(
    id: String,
    title: String,
    localPath: String?,
    remoteUrl: String?,
    size: Dp,
    modifier: Modifier = Modifier,
    corner: Dp = 18.dp,
) {
    val shape = RoundedCornerShape(corner)
    val palette = remember(id) { gradientFor(id) }
    val local = remember(localPath) { localPath?.let(::File)?.takeIf { it.exists() } }
    Box(
        modifier = Modifier
            .size(size)
            .then(modifier)
            .clip(shape)
            .background(Brush.linearGradient(palette)),
        contentAlignment = Alignment.Center,
    ) {
        when {
            local != null -> AsyncImage(
                model = local,
                contentDescription = title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
            !remoteUrl.isNullOrBlank() -> AsyncImage(
                model = remoteUrl,
                contentDescription = title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
            else -> Icon(
                Icons.Filled.GraphicEq,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.85f),
                modifier = Modifier.size(size / 2.6f),
            )
        }
    }
}

fun gradientFor(seed: String): List<Color> {
    val hash = abs(seed.hashCode())
    val base = (hash % 360).toFloat()
    fun hsl(h: Float, s: Float, l: Float): Color {
        val hh = ((h % 360) + 360) % 360
        val c = (1 - abs(2 * l - 1)) * s
        val x = c * (1 - abs((hh / 60f) % 2 - 1))
        val m = l - c / 2
        val (r, g, b) = when {
            hh < 60 -> Triple(c, x, 0f)
            hh < 120 -> Triple(x, c, 0f)
            hh < 180 -> Triple(0f, c, x)
            hh < 240 -> Triple(0f, x, c)
            hh < 300 -> Triple(x, 0f, c)
            else -> Triple(c, 0f, x)
        }
        return Color(r + m, g + m, b + m)
    }
    return listOf(
        hsl(base, 0.72f, 0.56f),
        hsl(base + 42f, 0.68f, 0.42f),
        hsl(base + 86f, 0.62f, 0.30f),
    )
}

/** Static but song-specific waveform that doubles as a seek bar. */
@Composable
fun Waveform(
    seed: String,
    progress: Float,
    modifier: Modifier = Modifier,
    barCount: Int = 56,
    activeColor: Color = MaterialTheme.colorScheme.primary,
    inactiveColor: Color = MaterialTheme.colorScheme.outlineVariant,
) {
    val amplitudes = remember(seed, barCount) { amplitudesFor(seed, barCount) }
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        amplitudes.forEachIndexed { index, amp ->
            val played = index.toFloat() / amplitudes.size <= progress
            Box(
                Modifier
                    .weight(1f)
                    .height((6 + amp * 34).dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(if (played) activeColor else inactiveColor)
            )
        }
    }
}

fun amplitudesFor(seed: String, count: Int): List<Float> {
    val h = abs(seed.hashCode()).toFloat()
    return (0 until count).map { i ->
        val a = sin(i * 0.45f + h % 7f)
        val b = sin(i * 0.17f + h % 13f)
        val c = sin(i * 0.9f + h % 29f)
        ((a + b * 0.6f + c * 0.35f + 2f) / 4f).coerceIn(0.08f, 1f)
    }
}

@Composable
fun EmptyState(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null,
) {
    Column(
        modifier = modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(Brush.linearGradient(gradientFor(title))),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.GraphicEq, null, tint = Color.White, modifier = Modifier.size(32.dp))
        }
        Spacer(Modifier.height(16.dp))
        Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(6.dp))
        Text(
            subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )
        if (action != null) {
            Spacer(Modifier.height(18.dp))
            action()
        }
    }
}

@Composable
fun ProgressLine(progress: Float, modifier: Modifier = Modifier, height: Dp = 4.dp) {
    Box(
        modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(50))
            .background(MaterialTheme.colorScheme.outlineVariant)
    ) {
        Box(
            Modifier
                .fillMaxWidth(progress.coerceIn(0f, 1f))
                .height(height)
                .clip(RoundedCornerShape(50))
                .background(AuroraBrush)
        )
    }
}

val BarCap = StrokeCap.Round
