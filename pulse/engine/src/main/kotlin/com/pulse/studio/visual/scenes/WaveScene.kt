package com.pulse.studio.visual.scenes

import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.RenderContext
import com.pulse.studio.visual.Scene
import kotlin.math.PI
import kotlin.math.sin

/**
 * Stacked flowing ribbons. Each layer is a sum of sines whose amplitude follows a
 * different frequency band, which makes the motion read as the music rather than as
 * a generic screensaver.
 */
class WaveScene(private val layers: Int = 5, private val resolution: Int = 160) : Scene {
    override val id = "wave"
    override val displayName = "Waves"

    private val xs = FloatArray(resolution + 4)
    private val ys = FloatArray(resolution + 4)
    private var smoothed = FloatArray(8)

    override fun reset(ctx: RenderContext) {
        smoothed = FloatArray(8)
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        for (band in 0 until 8) {
            val target = ctx.band(band)
            smoothed[band] += (target - smoothed[band]) * (if (target > smoothed[band]) 0.45f else 0.1f)
        }
        val kick = ctx.beatPulse(8f)

        for (layer in 0 until layers) {
            val depth = layer.toFloat() / (layers - 1)
            val baseY = ctx.height * (0.32f + depth * 0.36f)
            val band = (depth * 6f).toInt().coerceIn(0, 7)
            val amplitude = ctx.height * (0.03f + 0.12f * smoothed[band]) * (1f + 0.3f * kick)
            val speed = 0.5f + depth * 1.4f
            val colour = ctx.palette.ramp(1f - depth)

            for (i in 0..resolution) {
                val t = i.toFloat() / resolution
                val px = t * ctx.width
                val phase = ctx.time * speed
                val wave =
                    sin(t * 6.3f * (1f + depth) + phase) * 0.6f +
                        sin(t * 11.7f - phase * 1.3f + layer) * 0.3f +
                        sin(t * 23.1f + phase * 0.7f) * 0.12f * smoothed[7]
                xs[i] = px
                ys[i] = baseY + wave * amplitude
            }
            // close the ribbon into the bottom of the frame
            xs[resolution + 1] = ctx.width.toFloat()
            ys[resolution + 1] = ctx.height.toFloat()
            xs[resolution + 2] = 0f
            ys[resolution + 2] = ctx.height.toFloat()

            val fill = Paint(
                shader = com.pulse.studio.visual.Shader.Linear(
                    0f, baseY - amplitude, 0f, ctx.height.toFloat(),
                    intArrayOf(
                        Col.withAlpha(colour, 0.34f - depth * 0.05f),
                        Col.withAlpha(colour, 0.02f),
                    ),
                    floatArrayOf(0f, 1f),
                ),
            )
            canvas.fillPolygon(xs, ys, resolution + 3, fill)

            canvas.strokePolyline(
                xs, ys, resolution + 1,
                ctx.unit * (0.45f - depth * 0.18f) + ctx.unit * 0.6f * kick,
                Paint(color = Col.withAlpha(colour, 0.9f - depth * 0.35f), blend = BlendMode.Add),
            )
        }
    }
}
