package com.pulse.studio.visual.templates

import com.pulse.studio.fx.FxSettings
import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.LyricStyle
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.RenderContext
import com.pulse.studio.visual.Scene
import com.pulse.studio.visual.TextAlign
import com.pulse.studio.visual.backdrops.GradientMesh
import com.pulse.studio.visual.backdrops.PhotoBackdrop

/**
 * The user's photos, cut on the downbeat, graded like film.
 *
 * This is the format people actually post: their own pictures, moving, in time. The
 * frame counter and shot marks are there because a plain slideshow reads as a
 * screensaver, and a few production marks read as an edit.
 */
class PhotoCut : Scene {
    override val id = "photocut"
    override val displayName = "Photo Cut"
    override val fx = FxSettings.Film
    override val wantsMedia = true
    override val lyricStyle = LyricStyle.Stack

    private val photos = PhotoBackdrop(barsPerShot = 2)
    private val mesh = GradientMesh(blobs = 4)
    private var shotCount = 0
    private var lastFlash = 0f

    override fun reset(ctx: RenderContext) {
        photos.reset(ctx)
        shotCount = 0
        lastFlash = 0f
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        val cut: Float
        if (ctx.media.isEmpty()) {
            mesh.render(canvas, ctx, intensity = 0.9f)
            cut = ctx.beatPulse(12f)
        } else {
            cut = photos.render(canvas, ctx, scrim = 0.30f)
            photos.duotone(canvas, ctx, 0.18f)
        }

        if (cut > 0.6f && ctx.time - lastFlash > 0.2f) {
            lastFlash = ctx.time
            shotCount++
        }

        // white flash frame on the cut
        if (cut > 0.05f) {
            canvas.fillRect(
                0f, 0f, ctx.width.toFloat(), ctx.height.toFloat(),
                Paint(color = Col.argb((70 * cut).toInt(), 255, 255, 255), blend = BlendMode.Add),
            )
        }

        val margin = ctx.width * 0.06f
        val small = ctx.shortSide * 0.026f

        // shot counter, top right
        canvas.drawText(
            "SHOT ${(shotCount + 1).toString().padStart(2, '0')}",
            ctx.width - margin, margin + small, small,
            Paint(color = Col.withAlpha(ctx.palette.accent, 0.85f)), TextAlign.Right, bold = true,
        )

        // side rule that fills with the track
        val ruleHeight = ctx.height * 0.28f
        val ruleY = ctx.centreY - ruleHeight / 2
        canvas.fillRect(
            margin, ruleY, ctx.shortSide * 0.004f, ruleHeight,
            Paint(color = Col.argb(70, 255, 255, 255)),
        )
        canvas.fillRect(
            margin, ruleY, ctx.shortSide * 0.004f, ruleHeight * ctx.progress,
            Paint(color = ctx.palette.accent),
        )
    }
}
