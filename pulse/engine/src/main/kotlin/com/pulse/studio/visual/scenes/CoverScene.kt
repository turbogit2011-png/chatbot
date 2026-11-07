package com.pulse.studio.visual.scenes

import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.RenderContext
import com.pulse.studio.visual.Scene
import com.pulse.studio.visual.Shader
import kotlin.math.pow

/**
 * Artwork front and centre, breathing on the beat, with a slim spectrum under it.
 * Without a cover image the frame falls back to a gradient card, so the style is
 * always usable.
 */
class CoverScene(private val barCount: Int = 44) : Scene {
    override val id = "cover"
    override val displayName = "Artwork"
    override val usesCover = true

    private var heights = FloatArray(barCount)

    override fun reset(ctx: RenderContext) {
        heights = FloatArray(barCount)
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        val kick = ctx.beatPulse(9f)
        val side = ctx.shortSide * 0.62f * (1f + 0.035f * kick + 0.02f * ctx.bass)
        val cx = ctx.centreX
        val cy = ctx.height * 0.44f

        // soft colour wash behind the artwork
        canvas.fillCircle(
            cx, cy, side * 0.95f,
            Paint(
                shader = Shader.Radial(
                    cx, cy, side * 0.95f,
                    intArrayOf(
                        Col.withAlpha(ctx.palette.primary, 0.35f * (0.4f + ctx.level)),
                        Col.withAlpha(ctx.palette.secondary, 0.10f),
                        Col.withAlpha(ctx.palette.secondary, 0f),
                    ),
                    floatArrayOf(0f, 0.6f, 1f),
                ),
                blend = BlendMode.Add,
            ),
        )

        val cover = ctx.cover
        if (cover != null) {
            canvas.drawImage(cover, cx - side / 2, cy - side / 2, side, side, 1f)
        } else {
            canvas.fillRoundRect(
                cx - side / 2, cy - side / 2, side, side, side * 0.06f,
                Paint(
                    shader = Shader.Linear(
                        cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2,
                        intArrayOf(
                            Col.scale(ctx.palette.primary, 0.55f),
                            Col.scale(ctx.palette.secondary, 0.45f),
                            Col.scale(ctx.palette.backgroundDeep, 1.6f),
                        ),
                        floatArrayOf(0f, 0.5f, 1f),
                    ),
                ),
            )
            // concentric arcs so the placeholder reads as artwork, not a flat swatch
            for (ring in 1..5) {
                val radius = side * (0.08f + ring * 0.085f) * (1f + 0.05f * ctx.band(ring % 8))
                canvas.fillCircle(
                    cx, cy, radius,
                    Paint(
                        shader = Shader.Radial(
                            cx, cy, radius,
                            intArrayOf(
                                Col.withAlpha(ctx.palette.ramp(ring / 5f), 0f),
                                Col.withAlpha(ctx.palette.ramp(ring / 5f), 0f),
                                Col.withAlpha(ctx.palette.ramp(ring / 5f), 0.5f),
                            ),
                            floatArrayOf(0f, 0.86f, 1f),
                        ),
                        blend = BlendMode.Add,
                    ),
                )
            }
            val initial = (ctx.title.trim().firstOrNull() ?: 'P').uppercase()
            canvas.drawText(
                initial, cx, cy + side * 0.16f, side * 0.42f,
                Paint(color = Col.withAlpha(ctx.palette.accent, 0.9f)),
                com.pulse.studio.visual.TextAlign.Center, bold = true,
            )
        }

        // thin frame
        val border = ctx.unit * 0.22f
        val frame = Paint(color = Col.withAlpha(ctx.palette.accent, 0.35f + 0.4f * kick))
        canvas.fillRect(cx - side / 2, cy - side / 2 - border, side, border, frame)
        canvas.fillRect(cx - side / 2, cy + side / 2, side, border, frame)
        canvas.fillRect(cx - side / 2 - border, cy - side / 2 - border, border, side + border * 2, frame)
        canvas.fillRect(cx + side / 2, cy - side / 2 - border, border, side + border * 2, frame)

        // spectrum strip underneath
        val baseline = ctx.height * 0.80f
        val gap = ctx.width * 0.004f
        val barWidth = (ctx.width * 0.86f - gap * (barCount - 1)) / barCount
        val left = ctx.width * 0.07f
        for (i in 0 until barCount) {
            val position = i.toFloat() / (barCount - 1)
            val target = ctx.spectrum(position)
            heights[i] += (target - heights[i]) * (if (target > heights[i]) 0.5f else 0.13f)
            val h = ctx.height * 0.014f + heights[i] * ctx.height * 0.10f
            val x = left + i * (barWidth + gap)
            canvas.fillRoundRect(
                x, baseline - h / 2, barWidth, h, barWidth * 0.5f,
                Paint(color = Col.withAlpha(ctx.palette.ramp(position), 0.55f + 0.45f * heights[i])),
            )
        }
    }
}
