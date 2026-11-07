package com.pulse.studio.visual.scenes

import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.RenderContext
import com.pulse.studio.visual.Scene
import com.pulse.studio.visual.Shader
import kotlin.math.max
import kotlin.math.pow

/**
 * Mirrored spectrum bars standing on a reflective floor — the classic music-video
 * look. Bar heights are smoothed over time so the motion reads as musical rather
 * than jittery.
 */
class SpectrumScene(private val barCount: Int = 56) : Scene {
    override val id = "spectrum"
    override val displayName = "Spectrum"

    private var heights = FloatArray(barCount)
    private var velocity = FloatArray(barCount)

    override fun reset(ctx: RenderContext) {
        heights = FloatArray(barCount)
        velocity = FloatArray(barCount)
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        val baseline = ctx.height * 0.60f
        val maxHeight = ctx.height * 0.30f
        val gap = ctx.width * 0.0035f
        val barWidth = (ctx.width * 0.90f - gap * (barCount - 1)) / barCount
        val left = ctx.width * 0.05f
        val kick = ctx.beatPulse(9f)

        for (i in 0 until barCount) {
            val position = i.toFloat() / (barCount - 1)
            val target = ctx.spectrum(position).pow(0.85f).coerceIn(0f, 1.2f)

            // critically-damped follower: fast attack, musical release
            val stiffness = if (target > heights[i]) 0.55f else 0.14f
            velocity[i] = velocity[i] * 0.55f + (target - heights[i]) * stiffness
            heights[i] = (heights[i] + velocity[i]).coerceIn(0f, 1.3f)
        }

        for (i in 0 until barCount) {
            val h = max(ctx.unit * 0.8f, heights[i] * maxHeight * (1f + 0.12f * kick))
            val x = left + i * (barWidth + gap)
            val colour = ctx.palette.ramp(i.toFloat() / (barCount - 1))

            val paint = Paint(
                shader = Shader.Linear(
                    x, baseline - h, x, baseline,
                    intArrayOf(Col.withAlpha(colour, 1f), Col.withAlpha(Col.scale(colour, 0.55f), 0.85f)),
                    floatArrayOf(0f, 1f),
                ),
            )
            canvas.fillRoundRect(x, baseline - h, barWidth, h, barWidth * 0.45f, paint)

            // reflection
            val reflection = Paint(
                shader = Shader.Linear(
                    x, baseline, x, baseline + h * 0.6f,
                    intArrayOf(Col.withAlpha(colour, 0.28f), Col.withAlpha(colour, 0f)),
                    floatArrayOf(0f, 1f),
                ),
            )
            canvas.fillRoundRect(x, baseline, barWidth, h * 0.6f, barWidth * 0.45f, reflection)

            // glow on the loudest bars
            if (heights[i] > 0.55f) {
                val glow = Paint(
                    color = Col.withAlpha(colour, 0.16f * (heights[i] - 0.5f)),
                    blend = BlendMode.Add,
                )
                canvas.fillCircle(x + barWidth / 2, baseline - h, barWidth * 2.4f, glow)
            }
        }

        // floor line that flashes on the beat
        val lineAlpha = 0.18f + 0.5f * kick
        canvas.fillRect(
            ctx.width * 0.05f, baseline - ctx.unit * 0.12f, ctx.width * 0.90f, ctx.unit * 0.25f,
            Paint(color = Col.withAlpha(ctx.palette.accent, lineAlpha)),
        )
    }
}
