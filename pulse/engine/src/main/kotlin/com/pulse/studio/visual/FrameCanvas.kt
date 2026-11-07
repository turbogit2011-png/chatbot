package com.pulse.studio.visual

/**
 * The drawing surface the visual engine paints on.
 *
 * Deliberately small and backend-agnostic: on Android it is implemented with
 * android.graphics.Canvas, and in tests with java.awt.Graphics2D. That is what makes
 * it possible to render and inspect the real video frames without a device.
 */
interface FrameCanvas {
    val width: Int
    val height: Int

    fun clear(color: Int)
    fun fillRect(x: Float, y: Float, w: Float, h: Float, paint: Paint)
    fun fillRoundRect(x: Float, y: Float, w: Float, h: Float, radius: Float, paint: Paint)
    fun fillCircle(cx: Float, cy: Float, radius: Float, paint: Paint)
    fun fillPolygon(xs: FloatArray, ys: FloatArray, count: Int, paint: Paint)
    fun strokePolyline(xs: FloatArray, ys: FloatArray, count: Int, strokeWidth: Float, paint: Paint)
    fun drawText(text: String, x: Float, y: Float, sizePx: Float, paint: Paint, align: TextAlign, bold: Boolean = false)
    fun measureText(text: String, sizePx: Float, bold: Boolean): Float
    fun drawImage(image: ImageSource, x: Float, y: Float, w: Float, h: Float, alpha: Float, rotation: Float = 0f)

    /** Rotation in radians about (cx, cy) applied to everything drawn inside [block]. */
    fun withRotation(cx: Float, cy: Float, radians: Float, block: () -> Unit)
}

enum class TextAlign { Left, Center, Right }

/** Opaque handle to a decoded bitmap supplied by the host. */
interface ImageSource {
    val imageWidth: Int
    val imageHeight: Int
}

enum class BlendMode { Normal, Add }

sealed interface Shader {
    data class Linear(
        val x0: Float, val y0: Float, val x1: Float, val y1: Float,
        val colors: IntArray, val stops: FloatArray,
    ) : Shader

    data class Radial(
        val cx: Float, val cy: Float, val radius: Float,
        val colors: IntArray, val stops: FloatArray,
    ) : Shader
}

data class Paint(
    val color: Int = 0xFFFFFFFF.toInt(),
    val shader: Shader? = null,
    val alpha: Float = 1f,
    val blend: BlendMode = BlendMode.Normal,
)

// ------------------------------------------------------------------ colour helpers

object Col {
    fun argb(a: Int, r: Int, g: Int, b: Int): Int =
        ((a and 0xFF) shl 24) or ((r and 0xFF) shl 16) or ((g and 0xFF) shl 8) or (b and 0xFF)

    fun alpha(color: Int): Int = (color ushr 24) and 0xFF
    fun red(color: Int): Int = (color ushr 16) and 0xFF
    fun green(color: Int): Int = (color ushr 8) and 0xFF
    fun blue(color: Int): Int = color and 0xFF

    fun withAlpha(color: Int, alpha: Float): Int =
        argb((alpha.coerceIn(0f, 1f) * 255).toInt(), red(color), green(color), blue(color))

    fun lerp(a: Int, b: Int, t: Float): Int {
        val k = t.coerceIn(0f, 1f)
        return argb(
            (alpha(a) + (alpha(b) - alpha(a)) * k).toInt(),
            (red(a) + (red(b) - red(a)) * k).toInt(),
            (green(a) + (green(b) - green(a)) * k).toInt(),
            (blue(a) + (blue(b) - blue(a)) * k).toInt(),
        )
    }

    fun scale(color: Int, factor: Float): Int = argb(
        alpha(color),
        (red(color) * factor).toInt().coerceIn(0, 255),
        (green(color) * factor).toInt().coerceIn(0, 255),
        (blue(color) * factor).toInt().coerceIn(0, 255),
    )

    fun hsv(hue: Float, saturation: Float, value: Float, alpha: Float = 1f): Int {
        val h = ((hue % 360f) + 360f) % 360f
        val c = value * saturation
        val x = c * (1f - kotlin.math.abs((h / 60f) % 2f - 1f))
        val m = value - c
        val (r, g, b) = when {
            h < 60f -> Triple(c, x, 0f)
            h < 120f -> Triple(x, c, 0f)
            h < 180f -> Triple(0f, c, x)
            h < 240f -> Triple(0f, x, c)
            h < 300f -> Triple(x, 0f, c)
            else -> Triple(c, 0f, x)
        }
        return argb(
            (alpha * 255).toInt(),
            ((r + m) * 255).toInt(),
            ((g + m) * 255).toInt(),
            ((b + m) * 255).toInt(),
        )
    }
}
