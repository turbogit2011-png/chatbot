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
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

/**
 * A drifting field of lights that is pushed outward by every kick.
 *
 * Each particle carries its own drift phase and speed. An earlier version shared one
 * curl field across the whole field, which quietly herded every particle into the
 * same diagonal band — the per-particle phase is what keeps the frame evenly filled.
 */
class ParticlesScene(private val count: Int = 260) : Scene {
    override val id = "particles"
    override val displayName = "Particles"

    private lateinit var x: FloatArray
    private lateinit var y: FloatArray
    private lateinit var vx: FloatArray
    private lateinit var vy: FloatArray
    private lateinit var size: FloatArray
    private lateinit var tint: FloatArray
    private lateinit var phase: FloatArray
    private lateinit var rate: FloatArray
    private var lastBeat = -1
    private var random = Random(1)

    override fun reset(ctx: RenderContext) {
        random = Random(ctx.seed)
        x = FloatArray(count) { random.nextFloat() * ctx.width }
        y = FloatArray(count) { random.nextFloat() * ctx.height }
        vx = FloatArray(count) { (random.nextFloat() - 0.5f) * ctx.unit }
        vy = FloatArray(count) { (random.nextFloat() - 0.5f) * ctx.unit }
        size = FloatArray(count) { 0.25f + random.nextFloat() * random.nextFloat() * 1.8f }
        tint = FloatArray(count) { random.nextFloat() }
        phase = FloatArray(count) { random.nextFloat() * 2f * PI.toFloat() }
        rate = FloatArray(count) { 0.25f + random.nextFloat() * 0.9f }
        lastBeat = -1
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        val step = 1f / ctx.fps
        val cx = ctx.centreX
        val cy = ctx.centreY
        val kick = ctx.beatPulse(10f)

        val beat = ctx.beatIndex()
        val burst = beat != lastBeat
        if (burst) lastBeat = beat

        val drift = ctx.unit * (0.5f + 2.2f * ctx.mid)
        val margin = ctx.unit * 3f

        for (i in 0 until count) {
            if (burst) {
                val dx = x[i] - cx
                val dy = y[i] - cy
                val distance = sqrt(dx * dx + dy * dy).coerceAtLeast(ctx.unit)
                val push = ctx.unit * (1.6f + 7f * ctx.bass) * (ctx.shortSide * 0.35f / distance)
                vx[i] += dx / distance * push * step
                vy[i] += dy / distance * push * step
            }

            phase[i] += step * rate[i]
            vx[i] += cos(phase[i]) * drift * step
            vy[i] += sin(phase[i] * 1.3f) * drift * step

            vx[i] *= 0.94f
            vy[i] *= 0.94f
            x[i] += vx[i]
            y[i] += vy[i]

            // Re-enter on the opposite edge at a fresh random offset, so the field
            // never develops a visible seam or a preferred corner.
            if (x[i] < -margin) { x[i] = ctx.width + margin; y[i] = random.nextFloat() * ctx.height }
            if (x[i] > ctx.width + margin) { x[i] = -margin; y[i] = random.nextFloat() * ctx.height }
            if (y[i] < -margin) { y[i] = ctx.height + margin; x[i] = random.nextFloat() * ctx.width }
            if (y[i] > ctx.height + margin) { y[i] = -margin; x[i] = random.nextFloat() * ctx.width }

            val radius = ctx.unit * size[i] * (0.7f + 1.2f * ctx.level + 0.7f * kick)
            val colour = ctx.palette.ramp(tint[i])
            canvas.fillCircle(
                x[i], y[i], radius,
                Paint(color = Col.withAlpha(colour, 0.45f + 0.45f * ctx.level), blend = BlendMode.Add),
            )
            if (size[i] > 1.1f) {
                canvas.fillCircle(
                    x[i], y[i], radius * 3.4f,
                    Paint(color = Col.withAlpha(colour, 0.05f), blend = BlendMode.Add),
                )
            }
        }

        val bloom = ctx.shortSide * (0.2f + 0.3f * ctx.bass)
        canvas.fillCircle(
            cx, cy, bloom,
            Paint(
                shader = Shader.Radial(
                    cx, cy, bloom,
                    intArrayOf(
                        Col.withAlpha(ctx.palette.primary, 0.26f * (0.3f + ctx.bass)),
                        Col.withAlpha(ctx.palette.primary, 0f),
                    ),
                    floatArrayOf(0f, 1f),
                ),
                blend = BlendMode.Add,
            ),
        )
    }
}
