package com.pulse.studio.visual.templates

import com.pulse.studio.fx.FxSettings
import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.LyricStyle
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.RenderContext
import com.pulse.studio.visual.Scene
import com.pulse.studio.visual.Shader
import com.pulse.studio.visual.backdrops.GradientMesh
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Soft, saturated, out of focus — the look of an animated album canvas.
 *
 * There is almost nothing drawn here: a colour mesh, a slow ring of light and a
 * breathing core. The finishing chain's bloom and trails do the rest, which is the
 * point — restraint plus a good grade beats a busy frame.
 */
class Bloomscape : Scene {
    override val id = "bloom"
    override val displayName = "Bloomscape"
    override val fx = FxSettings.Dream
    override val lyricStyle = LyricStyle.Banner

    private val mesh = GradientMesh(blobs = 6)

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        mesh.render(canvas, ctx, intensity = 1.25f)

        val cx = ctx.centreX
        val cy = ctx.centreY
        val kick = ctx.beatPulse(5f)
        val radius = ctx.shortSide * (0.22f + 0.1f * ctx.level + 0.05f * kick)

        // a ring of soft points that turns with the mids
        val points = 42
        val spin = ctx.time * 0.22f
        for (i in 0 until points) {
            val angle = i * 2f * PI.toFloat() / points + spin
            val wobble = 1f + 0.18f * sin(angle * 3f + ctx.time * 1.4f) * (0.4f + ctx.mid)
            val r = radius * 1.55f * wobble
            val x = cx + cos(angle) * r
            val y = cy + sin(angle) * r
            val size = ctx.shortSide * (0.012f + 0.02f * ctx.spectrum(i.toFloat() / points))
            canvas.fillCircle(
                x, y, size,
                Paint(
                    color = Col.withAlpha(ctx.palette.ramp(i.toFloat() / points), 0.85f),
                    blend = BlendMode.Add,
                ),
            )
        }

        canvas.fillCircle(
            cx, cy, radius,
            Paint(
                shader = Shader.Radial(
                    cx, cy, radius,
                    intArrayOf(
                        Col.withAlpha(ctx.palette.accent, 0.95f),
                        Col.withAlpha(ctx.palette.primary, 0.45f),
                        Col.withAlpha(ctx.palette.primary, 0f),
                    ),
                    floatArrayOf(0f, 0.55f, 1f),
                ),
                blend = BlendMode.Add,
            ),
        )

        ctx.cover?.let { art ->
            val side = radius * 1.1f
            canvas.drawImage(art, cx - side / 2, cy - side / 2, side, side, 0.92f)
        }
    }
}
