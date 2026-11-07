package com.pulse.studio.visual.scenes

import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.RenderContext
import com.pulse.studio.visual.Scene
import com.pulse.studio.visual.Shader
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin

/**
 * A spectrum wrapped into a ring around the artwork, with rings thrown outward on
 * every beat. Works equally well with or without a cover image.
 */
class RadialScene(private val spokes: Int = 120) : Scene {
    override val id = "radial"
    override val displayName = "Radial"
    override val usesCover = true

    private var smoothed = FloatArray(spokes)
    private val rings = ArrayDeque<Ring>()
    private var lastBeat = -1

    private class Ring(var radius: Float, var alpha: Float, val colour: Int)

    override fun reset(ctx: RenderContext) {
        smoothed = FloatArray(spokes)
        rings.clear()
        lastBeat = -1
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        val cx = ctx.centreX
        val cy = ctx.centreY
        val inner = ctx.shortSide * 0.21f
        val kick = ctx.beatPulse(8f)
        val rotation = ctx.time * 0.12f + ctx.progress * 0.8f

        // beat rings
        val beat = ctx.beatIndex()
        if (beat != lastBeat) {
            lastBeat = beat
            rings.addLast(Ring(inner * 1.05f, 0.5f + 0.4f * ctx.bass, ctx.palette.ramp((beat % 8) / 8f)))
            if (rings.size > 10) rings.removeFirst()
        }
        val step = 1f / ctx.fps
        for (ring in rings) {
            ring.radius += ctx.shortSide * 0.55f * step
            ring.alpha -= 0.65f * step
        }
        while (rings.isNotEmpty() && rings.first().alpha <= 0f) rings.removeFirst()
        for (ring in rings) {
            if (ring.alpha <= 0f) continue
            val thickness = ctx.unit * (0.6f + 2.2f * ring.alpha)
            canvas.fillCircle(
                cx, cy, ring.radius,
                Paint(
                    shader = Shader.Radial(
                        cx, cy, ring.radius,
                        intArrayOf(
                            Col.withAlpha(ring.colour, 0f),
                            Col.withAlpha(ring.colour, 0f),
                            Col.withAlpha(ring.colour, ring.alpha * 0.55f),
                            Col.withAlpha(ring.colour, 0f),
                        ),
                        floatArrayOf(0f, (1f - thickness / ring.radius).coerceIn(0f, 0.98f), 0.99f, 1f),
                    ),
                    blend = BlendMode.Add,
                ),
            )
        }

        // artwork or a glowing disc in the middle
        val coverSize = inner * 1.78f * (1f + 0.05f * kick)
        val cover = ctx.cover
        if (cover != null) {
            canvas.drawImage(cover, cx - coverSize / 2, cy - coverSize / 2, coverSize, coverSize, 1f)
        } else {
            canvas.fillCircle(
                cx, cy, inner * 0.92f * (1f + 0.04f * kick),
                Paint(
                    shader = Shader.Radial(
                        cx, cy, inner,
                        intArrayOf(
                            Col.withAlpha(ctx.palette.primary, 0.85f),
                            Col.withAlpha(ctx.palette.secondary, 0.35f),
                            Col.withAlpha(ctx.palette.secondary, 0f),
                        ),
                        floatArrayOf(0f, 0.7f, 1f),
                    ),
                ),
            )
        }

        // spectrum spokes
        val xs = FloatArray(4)
        val ys = FloatArray(4)
        for (i in 0 until spokes) {
            val position = i.toFloat() / spokes
            // mirror the spectrum so both halves of the ring match
            val mirrored = if (position < 0.5f) position * 2f else (1f - position) * 2f
            val target = ctx.spectrum(mirrored).pow(0.8f)
            smoothed[i] += (target - smoothed[i]) * (if (target > smoothed[i]) 0.5f else 0.12f)

            val length = ctx.shortSide * (0.035f + 0.21f * smoothed[i] * (1f + 0.25f * kick))
            val angle = position * 2f * PI.toFloat() + rotation
            val c = cos(angle)
            val s = sin(angle)
            val r0 = inner * 1.02f
            val r1 = r0 + length
            val halfWidth = ctx.shortSide * 0.0042f

            xs[0] = cx + c * r0 - s * halfWidth
            ys[0] = cy + s * r0 + c * halfWidth
            xs[1] = cx + c * r0 + s * halfWidth
            ys[1] = cy + s * r0 - c * halfWidth
            xs[2] = cx + c * r1 + s * halfWidth
            ys[2] = cy + s * r1 - c * halfWidth
            xs[3] = cx + c * r1 - s * halfWidth
            ys[3] = cy + s * r1 + c * halfWidth

            val colour = ctx.palette.ramp(mirrored)
            canvas.fillPolygon(xs, ys, 4, Paint(color = Col.withAlpha(colour, 0.55f + 0.45f * smoothed[i])))
        }

        // halo behind everything
        canvas.fillCircle(
            cx, cy, inner * (2.0f + 1.4f * ctx.level),
            Paint(
                shader = Shader.Radial(
                    cx, cy, inner * (2.0f + 1.4f * ctx.level),
                    intArrayOf(
                        Col.withAlpha(ctx.palette.primary, 0.20f * (0.3f + ctx.level)),
                        Col.withAlpha(ctx.palette.primary, 0f),
                    ),
                    floatArrayOf(0f, 1f),
                ),
                blend = BlendMode.Add,
            ),
        )
    }
}
