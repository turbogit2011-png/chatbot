package com.pulse.studio.visual.backdrops

import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.RenderContext
import com.pulse.studio.visual.Shader
import kotlin.math.cos
import kotlin.math.sin

/**
 * A slow mesh of coloured light.
 *
 * Six large soft blobs drifting on different periods, drawn additively. On its own it
 * is unremarkable; run through bloom and grading it gives the saturated, out-of-focus
 * backdrop that modern music visuals are built on.
 */
class GradientMesh(private val blobs: Int = 6) {

    fun render(canvas: FrameCanvas, ctx: RenderContext, intensity: Float = 1f) {
        canvas.clear(ctx.palette.backgroundDeep)
        canvas.fillRect(
            0f, 0f, ctx.width.toFloat(), ctx.height.toFloat(),
            Paint(
                shader = Shader.Linear(
                    0f, 0f, 0f, ctx.height.toFloat(),
                    intArrayOf(ctx.palette.background, ctx.palette.backgroundDeep),
                    floatArrayOf(0f, 1f),
                ),
            ),
        )

        val t = ctx.time
        val breathe = 0.78f + 0.5f * ctx.level + 0.25f * ctx.beatPulse(6f)
        for (i in 0 until blobs) {
            val phase = i * 1.37f
            val speedX = 0.11f + i * 0.021f
            val speedY = 0.09f + i * 0.017f
            val x = ctx.width * (0.5f + 0.42f * sin(t * speedX + phase))
            val y = ctx.height * (0.5f + 0.40f * cos(t * speedY + phase * 1.7f))
            val radius = ctx.shortSide * (0.34f + 0.20f * sin(t * 0.23f + phase)) * breathe
            val colour = ctx.palette.ramp((i.toFloat() / blobs + t * 0.03f) % 1f)
            canvas.fillCircle(
                x, y, radius,
                Paint(
                    shader = Shader.Radial(
                        x, y, radius,
                        intArrayOf(
                            Col.withAlpha(colour, 0.38f * intensity),
                            Col.withAlpha(colour, 0.14f * intensity),
                            Col.withAlpha(colour, 0f),
                        ),
                        floatArrayOf(0f, 0.45f, 1f),
                    ),
                    blend = BlendMode.Add,
                ),
            )
        }
    }
}
