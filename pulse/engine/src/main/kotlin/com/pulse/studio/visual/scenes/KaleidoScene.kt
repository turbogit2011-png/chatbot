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

/**
 * A mirrored flower of petals that turns with the music.
 *
 * Petals are smooth closed curves whose radius is modulated by the spectrum, mirrored
 * around the centre. An earlier version drew three-point shards, which read as arrows
 * rather than as a kaleidoscope.
 */
class KaleidoScene(private val petalResolution: Int = 26) : Scene {
    override val id = "kaleido"
    override val displayName = "Kaleidoscope"

    private var rotation = 0f
    private var snap = 0f
    private var lastBeat = -1
    private val xs = FloatArray(petalResolution * 2 + 2)
    private val ys = FloatArray(petalResolution * 2 + 2)
    private var smoothed = FloatArray(8)

    override fun reset(ctx: RenderContext) {
        rotation = 0f
        snap = 0f
        lastBeat = -1
        smoothed = FloatArray(8)
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        val step = 1f / ctx.fps
        rotation += step * (0.12f + 0.75f * ctx.mid)
        val beat = ctx.beatIndex()
        if (beat != lastBeat) {
            lastBeat = beat
            snap = (PI.toFloat() / 18f) * (if (beat % 2 == 0) 1f else -1f)
        }
        snap *= 0.85f

        for (band in 0 until 8) {
            val target = ctx.band(band)
            smoothed[band] += (target - smoothed[band]) * (if (target > smoothed[band]) 0.5f else 0.11f)
        }

        val petals = 6 + (ctx.features.sectionIndex(ctx.time) % 3) * 2
        val cx = ctx.centreX
        val cy = ctx.centreY
        val kick = ctx.beatPulse(9f)
        val reach = ctx.shortSide * 0.46f

        // three nested rings of petals, each following a different part of the spectrum
        for (ring in 2 downTo 0) {
            val ringScale = 0.42f + ring * 0.29f
            val energy = smoothed[ring * 3 + 1]
            val spin = rotation * (if (ring % 2 == 0) 1f else -0.65f) + snap
            val colour = ctx.palette.ramp(ring / 2f)
            val alpha = 0.16f + 0.30f * energy

            for (petal in 0 until petals) {
                val base = petal * 2f * PI.toFloat() / petals + spin
                buildPetal(ctx, cx, cy, base, reach * ringScale * (1f + 0.22f * energy + 0.1f * kick), petals)
                canvas.fillPolygon(
                    xs, ys, petalResolution * 2,
                    Paint(color = Col.withAlpha(colour, alpha), blend = BlendMode.Add),
                )
            }
        }

        val core = ctx.shortSide * (0.05f + 0.09f * ctx.bass)
        canvas.fillCircle(
            cx, cy, core * 2.4f,
            Paint(
                shader = Shader.Radial(
                    cx, cy, core * 2.4f,
                    intArrayOf(
                        Col.withAlpha(ctx.palette.accent, 0.55f + 0.35f * kick),
                        Col.withAlpha(ctx.palette.accent, 0f),
                    ),
                    floatArrayOf(0f, 1f),
                ),
                blend = BlendMode.Add,
            ),
        )
    }

    /** A teardrop outline: out along one edge of the wedge and back along the other. */
    private fun buildPetal(
        ctx: RenderContext,
        cx: Float,
        cy: Float,
        baseAngle: Float,
        length: Float,
        petals: Int,
    ) {
        val halfWidth = (PI.toFloat() / petals) * 0.82f
        var index = 0
        for (i in 0 until petalResolution) {
            val t = i.toFloat() / (petalResolution - 1)
            val spectrum = ctx.spectrum(t * 0.85f)
            val radius = length * (0.18f + t * (0.82f + 0.25f * spectrum))
            // widest a third of the way out, tapering to a point
            val width = halfWidth * sin(t * PI.toFloat()).let { it * it.coerceAtLeast(0.15f) }
            val angle = baseAngle - width
            xs[index] = cx + cos(angle) * radius
            ys[index] = cy + sin(angle) * radius
            index++
        }
        for (i in petalResolution - 1 downTo 0) {
            val t = i.toFloat() / (petalResolution - 1)
            val spectrum = ctx.spectrum(t * 0.85f)
            val radius = length * (0.18f + t * (0.82f + 0.25f * spectrum))
            val width = halfWidth * sin(t * PI.toFloat()).let { it * it.coerceAtLeast(0.15f) }
            val angle = baseAngle + width
            xs[index] = cx + cos(angle) * radius
            ys[index] = cy + sin(angle) * radius
            index++
        }
    }
}
