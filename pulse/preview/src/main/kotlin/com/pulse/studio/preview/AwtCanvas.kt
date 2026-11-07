package com.pulse.studio.preview

import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.ImageSource
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.Shader
import com.pulse.studio.visual.TextAlign
import java.awt.AlphaComposite
import java.awt.BasicStroke
import java.awt.Color
import java.awt.Composite
import java.awt.CompositeContext
import java.awt.Font
import java.awt.Graphics2D
import java.awt.LinearGradientPaint
import java.awt.MultipleGradientPaint
import java.awt.RadialGradientPaint
import java.awt.RenderingHints
import java.awt.geom.AffineTransform
import java.awt.geom.Ellipse2D
import java.awt.geom.Path2D
import java.awt.geom.Rectangle2D
import java.awt.geom.RoundRectangle2D
import java.awt.image.BufferedImage
import java.awt.image.ColorModel
import java.awt.image.Raster
import java.awt.image.WritableRaster
import java.io.File
import javax.imageio.ImageIO

/**
 * A java.awt implementation of the engine's drawing surface.
 *
 * This exists so the exact frames the app will produce can be rendered, inspected and
 * encoded on a plain JVM, with no device and no emulator. It mirrors the Android
 * Canvas backend primitive for primitive.
 */
class AwtCanvas(override val width: Int, override val height: Int) : FrameCanvas {

    val image = BufferedImage(width, height, BufferedImage.TYPE_INT_RGB)
    private val g: Graphics2D = image.createGraphics()

    init {
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE)
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
    }

    override fun clear(color: Int) {
        g.composite = AlphaComposite.Src
        g.paint = Color(Col.red(color), Col.green(color), Col.blue(color))
        g.fill(Rectangle2D.Float(0f, 0f, width.toFloat(), height.toFloat()))
        g.composite = AlphaComposite.SrcOver
    }

    override fun fillRect(x: Float, y: Float, w: Float, h: Float, paint: Paint) {
        apply(paint) { g.fill(Rectangle2D.Float(x, y, w, h)) }
    }

    override fun fillRoundRect(x: Float, y: Float, w: Float, h: Float, radius: Float, paint: Paint) {
        val r = radius.coerceAtMost(minOf(w, h) / 2f)
        apply(paint) { g.fill(RoundRectangle2D.Float(x, y, w, h, r * 2, r * 2)) }
    }

    override fun fillCircle(cx: Float, cy: Float, radius: Float, paint: Paint) {
        if (radius <= 0f) return
        apply(paint) { g.fill(Ellipse2D.Float(cx - radius, cy - radius, radius * 2, radius * 2)) }
    }

    override fun fillPolygon(xs: FloatArray, ys: FloatArray, count: Int, paint: Paint) {
        if (count < 3) return
        val path = Path2D.Float()
        path.moveTo(xs[0], ys[0])
        for (i in 1 until count) path.lineTo(xs[i], ys[i])
        path.closePath()
        apply(paint) { g.fill(path) }
    }

    override fun strokePolyline(xs: FloatArray, ys: FloatArray, count: Int, strokeWidth: Float, paint: Paint) {
        if (count < 2) return
        val path = Path2D.Float()
        path.moveTo(xs[0], ys[0])
        for (i in 1 until count) path.lineTo(xs[i], ys[i])
        apply(paint) {
            g.stroke = BasicStroke(strokeWidth.coerceAtLeast(0.5f), BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND)
            g.draw(path)
        }
    }

    override fun drawText(
        text: String,
        x: Float,
        y: Float,
        sizePx: Float,
        paint: Paint,
        align: TextAlign,
        bold: Boolean,
    ) {
        g.font = Font(Font.SANS_SERIF, if (bold) Font.BOLD else Font.PLAIN, sizePx.toInt().coerceAtLeast(1))
        val measured = g.fontMetrics.stringWidth(text).toFloat()
        val drawX = when (align) {
            TextAlign.Left -> x
            TextAlign.Center -> x - measured / 2f
            TextAlign.Right -> x - measured
        }
        apply(paint) { g.drawString(text, drawX, y) }
    }

    override fun measureText(text: String, sizePx: Float, bold: Boolean): Float {
        g.font = Font(Font.SANS_SERIF, if (bold) Font.BOLD else Font.PLAIN, sizePx.toInt().coerceAtLeast(1))
        return g.fontMetrics.stringWidth(text).toFloat()
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
        val source = (image as? AwtImage)?.bitmap ?: return
        val old = g.composite
        g.composite = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, alpha.coerceIn(0f, 1f))
        val transform = AffineTransform()
        transform.translate(x.toDouble(), y.toDouble())
        if (rotation != 0f) {
            transform.rotate(rotation.toDouble(), (w / 2).toDouble(), (h / 2).toDouble())
        }
        transform.scale(w.toDouble() / source.width, h.toDouble() / source.height)
        g.drawImage(source, transform, null)
        g.composite = old
    }

    override fun withRotation(cx: Float, cy: Float, radians: Float, block: () -> Unit) {
        val old = g.transform
        g.rotate(radians.toDouble(), cx.toDouble(), cy.toDouble())
        block()
        g.transform = old
    }

    fun save(file: File) {
        file.parentFile?.mkdirs()
        ImageIO.write(image, "png", file)
    }

    fun dispose() = g.dispose()

    // -------------------------------------------------------------- internals

    private inline fun apply(paint: Paint, block: () -> Unit) {
        g.composite = if (paint.blend == BlendMode.Add) {
            AdditiveComposite(paint.alpha)
        } else {
            AlphaComposite.getInstance(AlphaComposite.SRC_OVER, paint.alpha.coerceIn(0f, 1f))
        }
        g.paint = toAwtPaint(paint)
        block()
        g.stroke = BasicStroke(1f)
        g.composite = AlphaComposite.SrcOver
    }

    private fun toAwtPaint(paint: Paint): java.awt.Paint = when (val shader = paint.shader) {
        null -> colorOf(paint.color)
        is Shader.Linear -> {
            val (fractions, colors) = sanitise(shader.stops, shader.colors)
            if (shader.x0 == shader.x1 && shader.y0 == shader.y1) colors.first()
            else LinearGradientPaint(
                java.awt.geom.Point2D.Float(shader.x0, shader.y0),
                java.awt.geom.Point2D.Float(shader.x1, shader.y1),
                fractions, colors, MultipleGradientPaint.CycleMethod.NO_CYCLE,
            )
        }
        is Shader.Radial -> {
            val (fractions, colors) = sanitise(shader.stops, shader.colors)
            if (shader.radius <= 0.01f) colors.first()
            else RadialGradientPaint(
                java.awt.geom.Point2D.Float(shader.cx, shader.cy),
                shader.radius,
                fractions, colors, MultipleGradientPaint.CycleMethod.NO_CYCLE,
            )
        }
    }

    /** Gradient stops must be strictly increasing and inside 0..1. */
    private fun sanitise(stops: FloatArray, colors: IntArray): Pair<FloatArray, Array<Color>> {
        val outStops = ArrayList<Float>(stops.size)
        val outColors = ArrayList<Color>(stops.size)
        var previous = -1f
        for (i in stops.indices) {
            var value = stops[i].coerceIn(0f, 1f)
            if (value <= previous) value = (previous + 1e-4f).coerceAtMost(1f)
            if (value <= previous) continue
            previous = value
            outStops.add(value)
            outColors.add(colorOf(colors[i]))
        }
        if (outStops.size < 2) {
            return floatArrayOf(0f, 1f) to arrayOf(colorOf(colors.first()), colorOf(colors.last()))
        }
        return outStops.toFloatArray() to outColors.toTypedArray()
    }

    private fun colorOf(argb: Int) = Color(Col.red(argb), Col.green(argb), Col.blue(argb), Col.alpha(argb))
}

class AwtImage(val bitmap: BufferedImage) : ImageSource {
    override val imageWidth: Int get() = bitmap.width
    override val imageHeight: Int get() = bitmap.height
}

/** Screen-style additive blend, matching PorterDuff.ADD on Android. */
private class AdditiveComposite(private val alpha: Float) : Composite {
    override fun createContext(
        srcColorModel: ColorModel?,
        dstColorModel: ColorModel?,
        hints: RenderingHints?,
    ): CompositeContext = object : CompositeContext {
        override fun compose(src: Raster, dstIn: Raster, dstOut: WritableRaster) {
            val width = minOf(src.width, dstIn.width)
            val height = minOf(src.height, dstIn.height)
            val srcPixel = IntArray(4)
            val dstPixel = IntArray(4)
            val outPixel = IntArray(dstOut.numBands)
            for (y in 0 until height) {
                for (x in 0 until width) {
                    src.getPixel(x, y, srcPixel)
                    dstIn.getPixel(x, y, dstPixel)
                    val srcAlpha = if (src.numBands > 3) srcPixel[3] / 255f else 1f
                    val weight = srcAlpha * alpha
                    for (band in 0 until minOf(3, dstOut.numBands)) {
                        outPixel[band] = (dstPixel[band] + srcPixel[band] * weight).toInt().coerceIn(0, 255)
                    }
                    if (dstOut.numBands > 3) outPixel[3] = 255
                    dstOut.setPixel(x, y, outPixel)
                }
            }
        }

        override fun dispose() = Unit
    }
}
