package com.pulse.studio.visual.templates

import com.pulse.studio.fx.FxSettings
import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.LyricStyle
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.RenderContext
import com.pulse.studio.visual.Scene
import com.pulse.studio.visual.backdrops.GradientMesh
import com.pulse.studio.visual.backdrops.PhotoBackdrop

/**
 * Big type over colour. The default for anyone who pastes lyrics.
 *
 * The backdrop reacts, the type does the talking, and a colour bar on the downbeat
 * gives the frame a pulse you can feel without a single spectrum bar.
 */
class LyricSlam : Scene {
    override val id = "slam"
    override val displayName = "Lyric Slam"
    override val fx = FxSettings.Hard
    override val wantsMedia = false
    override val lyricStyle = LyricStyle.WordPop

    private val mesh = GradientMesh(blobs = 5)
    private val photos = PhotoBackdrop(barsPerShot = 4)

    override fun reset(ctx: RenderContext) {
        photos.reset(ctx)
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        if (ctx.media.isNotEmpty()) {
            photos.render(canvas, ctx, scrim = 0.55f)
            photos.duotone(canvas, ctx, 0.55f)
        } else {
            mesh.render(canvas, ctx, intensity = 1.15f)
        }

        // a wide bar that snaps across the frame on each downbeat
        val bar = ctx.beatPulse(5f)
        if (bar > 0.02f) {
            val height = ctx.height * 0.0075f * (0.5f + bar)
            canvas.fillRect(
                0f, ctx.centreY - height / 2, ctx.width.toFloat(), height,
                Paint(color = Col.withAlpha(ctx.palette.accent, 0.5f * bar), blend = BlendMode.Add),
            )
        }

        // corner marks, the cheapest way to make a frame look designed
        val margin = ctx.width * 0.06f
        val mark = ctx.shortSide * 0.045f
        val thickness = ctx.shortSide * 0.006f
        val markColour = Col.withAlpha(ctx.palette.accent, 0.7f)
        canvas.fillRect(margin, margin, mark, thickness, Paint(color = markColour))
        canvas.fillRect(margin, margin, thickness, mark, Paint(color = markColour))
        canvas.fillRect(ctx.width - margin - mark, ctx.height - margin - thickness, mark, thickness, Paint(color = markColour))
        canvas.fillRect(ctx.width - margin - thickness, ctx.height - margin - mark, thickness, mark, Paint(color = markColour))
    }
}
