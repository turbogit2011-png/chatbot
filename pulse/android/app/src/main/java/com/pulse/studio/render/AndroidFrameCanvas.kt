package com.pulse.studio.render

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint as NativePaint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader as NativeShader
import android.graphics.Typeface
import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.ImageSource
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.Shader
import com.pulse.studio.visual.TextAlign

/** Wraps a decoded bitmap so the engine can draw it without knowing about Android. */
class AndroidImage(val bitmap: Bitmap) : ImageSource {
    override val imageWidth: Int get() = bitmap.width
    override val imageHeight: Int get() = bitmap.height
}

/**
 * The engine's drawing surface backed by android.graphics.
 *
 * Mirrors the desktop backend used in development primitive for primitive, so what is
 * checked there is what renders here. One Paint and one Path are reused for the whole
 * clip: at thirty frames a second, allocation in the draw loop is what costs you.
 */
class AndroidFrameCanvas(override val width: Int, override val height: Int) : FrameCanvas {

    val bitmap: Bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    private val canvas = Canvas(bitmap)
    private val paint = NativePaint(NativePaint.ANTI_ALIAS_FLAG)
    private val path = Path()
    private val rect = RectF()
    private val addMode = PorterDuffXfermode(PorterDuff.Mode.ADD)
    private val srcRect = Rect()
    private val dstRect = RectF()
    private val matrix = Matrix()

    override fun clear(color: Int) {
        canvas.drawColor(color, PorterDuff.Mode.SRC)
    }

    override fun fillRect(x: Float, y: Float, w: Float, h: Float, paintSpec: Paint) {
        prepare(paintSpec, fill = true)
        canvas.drawRect(x, y, x + w, y + h, paint)
    }

    override fun fillRoundRect(x: Float, y: Float, w: Float, h: Float, radius: Float, paintSpec: Paint) {
        prepare(paintSpec, fill = true)
        rect.set(x, y, x + w, y + h)
        val r = radius.coerceAtMost(minOf(w, h) / 2f)
        canvas.drawRoundRect(rect, r, r, paint)
    }

    override fun fillCircle(cx: Float, cy: Float, radius: Float, paintSpec: Paint) {
        if (radius <= 0f) return
        prepare(paintSpec, fill = true)
        canvas.drawCircle(cx, cy, radius, paint)
    }

    override fun fillPolygon(xs: FloatArray, ys: FloatArray, count: Int, paintSpec: Paint) {
        if (count < 3) return
        prepare(paintSpec, fill = true)
        path.rewind()
        path.moveTo(xs[0], ys[0])
        for (i in 1 until count) path.lineTo(xs[i], ys[i])
        path.close()
        canvas.drawPath(path, paint)
    }

    override fun strokePolyline(
        xs: FloatArray,
        ys: FloatArray,
        count: Int,
        strokeWidth: Float,
        paintSpec: Paint,
    ) {
        if (count < 2) return
        prepare(paintSpec, fill = false)
        paint.strokeWidth = strokeWidth.coerceAtLeast(0.5f)
        paint.strokeCap = NativePaint.Cap.ROUND
        paint.strokeJoin = NativePaint.Join.ROUND
        path.rewind()
        path.moveTo(xs[0], ys[0])
        for (i in 1 until count) path.lineTo(xs[i], ys[i])
        canvas.drawPath(path, paint)
    }

    override fun drawText(
        text: String,
        x: Float,
        y: Float,
        sizePx: Float,
        paintSpec: Paint,
        align: TextAlign,
        bold: Boolean,
    ) {
        prepare(paintSpec, fill = true)
        paint.textSize = sizePx
        paint.typeface = if (bold) Typeface.create(Typeface.DEFAULT, Typeface.BOLD) else Typeface.DEFAULT
        paint.textAlign = when (align) {
            TextAlign.Left -> NativePaint.Align.LEFT
            TextAlign.Center -> NativePaint.Align.CENTER
            TextAlign.Right -> NativePaint.Align.RIGHT
        }
        canvas.drawText(text, x, y, paint)
        paint.textAlign = NativePaint.Align.LEFT
    }

    override fun measureText(text: String, sizePx: Float, bold: Boolean): Float {
        paint.reset()
        paint.isAntiAlias = true
        paint.textSize = sizePx
        paint.typeface = if (bold) Typeface.create(Typeface.DEFAULT, Typeface.BOLD) else Typeface.DEFAULT
        return paint.measureText(text)
    }

    override fun drawImage(
        image: ImageSource,
        x: Float,
        y: Float,
        w: Float,
        h: Float,
        alpha: Float,
        rotation: Float,
    ) {
        val source = (image as? AndroidImage)?.bitmap ?: return
        paint.reset()
        paint.isAntiAlias = true
        paint.isFilterBitmap = true
        paint.alpha = (alpha.coerceIn(0f, 1f) * 255).toInt()
        // centre-crop the source into the destination square
        val scale = maxOf(w / source.width, h / source.height)
        val cropW = (w / scale).toInt().coerceAtMost(source.width)
        val cropH = (h / scale).toInt().coerceAtMost(source.height)
        srcRect.set(
            (source.width - cropW) / 2,
            (source.height - cropH) / 2,
            (source.width + cropW) / 2,
            (source.height + cropH) / 2,
        )
        dstRect.set(x, y, x + w, y + h)
        if (rotation != 0f) {
            canvas.save()
            canvas.rotate(Math.toDegrees(rotation.toDouble()).toFloat(), x + w / 2, y + h / 2)
            canvas.drawBitmap(source, srcRect, dstRect, paint)
            canvas.restore()
        } else {
            canvas.drawBitmap(source, srcRect, dstRect, paint)
        }
    }

    override fun withRotation(cx: Float, cy: Float, radians: Float, block: () -> Unit) {
        canvas.save()
        canvas.rotate(Math.toDegrees(radians.toDouble()).toFloat(), cx, cy)
        block()
        canvas.restore()
    }

    /** Copies the frame into [out] as packed ARGB, ready for colour conversion. */
    fun readPixels(out: IntArray) {
        bitmap.getPixels(out, 0, width, 0, 0, width, height)
    }

    fun recycle() {
        if (!bitmap.isRecycled) bitmap.recycle()
    }

    private fun prepare(spec: Paint, fill: Boolean) {
        paint.reset()
        paint.isAntiAlias = true
        paint.style = if (fill) NativePaint.Style.FILL else NativePaint.Style.STROKE
        paint.xfermode = if (spec.blend == BlendMode.Add) addMode else null
        paint.shader = spec.shader?.toNative()
        if (spec.shader == null) {
            paint.color = spec.color
            if (spec.alpha < 1f) paint.alpha = (Col.alpha(spec.color) * spec.alpha).toInt().coerceIn(0, 255)
        } else if (spec.alpha < 1f) {
            paint.alpha = (spec.alpha * 255).toInt().coerceIn(0, 255)
        }
    }

    private fun Shader.toNative(): NativeShader? = when (this) {
        is Shader.Linear -> {
            if (x0 == x1 && y0 == y1) null
            else {
                val (positions, colours) = sanitise(stops, colors)
                LinearGradient(x0, y0, x1, y1, colours, positions, NativeShader.TileMode.CLAMP)
            }
        }
        is Shader.Radial -> {
            if (radius <= 0.01f) null
            else {
                val (positions, colours) = sanitise(stops, colors)
                RadialGradient(cx, cy, radius, colours, positions, NativeShader.TileMode.CLAMP)
            }
        }
    }

    /** Gradient positions must be strictly increasing; the engine may emit duplicates. */
    private fun sanitise(stops: FloatArray, colors: IntArray): Pair<FloatArray, IntArray> {
        val positions = FloatArray(stops.size)
        var previous = -1f
        for (i in stops.indices) {
            var value = stops[i].coerceIn(0f, 1f)
            if (value <= previous) value = (previous + 1e-4f).coerceAtMost(1f)
            previous = value
            positions[i] = value
        }
        return positions to colors
    }
}
