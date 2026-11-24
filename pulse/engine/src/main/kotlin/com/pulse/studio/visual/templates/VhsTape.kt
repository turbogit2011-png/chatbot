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
import kotlin.math.sin

/**
 * Tape look: chroma bleed, scanlines, a tracking band and a camcorder OSD.
 *
 * Everything here is in service of one idea — that the frame was recorded, not drawn.
 * The heavy lifting is in the finishing chain; this adds the furniture.
 */
class VhsTape : Scene {
    override val id = "vhs"
    override val displayName = "VHS"
    override val fx = FxSettings.Vhs
    override val wantsMedia = true
    override val drawsOwnCredits = true
    override val lyricStyle = LyricStyle.Karaoke

    private val photos = PhotoBackdrop(barsPerShot = 4)
    private val mesh = GradientMesh(blobs = 4)
    private var trackingY = 0f

    override fun reset(ctx: RenderContext) {
        photos.reset(ctx)
        trackingY = 0f
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        if (ctx.media.isNotEmpty()) {
            photos.render(canvas, ctx, scrim = 0.22f)
        } else {
            mesh.render(canvas, ctx, intensity = 0.95f)
        }

        // the tracking band drifting up the frame, as a worn tape does
        trackingY -= ctx.height * 0.0035f
        if (trackingY < -ctx.height * 0.1f) trackingY = ctx.height * 1.05f
        val bandHeight = ctx.height * 0.035f
        canvas.fillRect(
            0f, trackingY, ctx.width.toFloat(), bandHeight,
            Paint(color = Col.argb(26, 255, 255, 255), blend = BlendMode.Add),
        )
        canvas.fillRect(
            0f, trackingY + bandHeight * 0.4f, ctx.width.toFloat(), bandHeight * 0.14f,
            Paint(color = Col.argb(44, 180, 220, 255), blend = BlendMode.Add),
        )

        val margin = ctx.width * 0.07f
        val osd = ctx.shortSide * 0.032f
        val blink = if (sin(ctx.time * 3.2f) > -0.2f) 1f else 0.25f

        canvas.drawText(
            "● REC", margin, margin + osd, osd,
            Paint(color = Col.withAlpha(Col.argb(255, 255, 90, 90), blink)), TextAlign.Left, bold = true,
        )
        val minutes = (ctx.time / 60).toInt()
        val seconds = (ctx.time % 60).toInt()
        canvas.drawText(
            "${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:" +
                ((ctx.time * 30).toInt() % 30).toString().padStart(2, '0'),
            ctx.width - margin, margin + osd, osd,
            Paint(color = Col.argb(230, 255, 255, 255)), TextAlign.Right, bold = true,
        )
        canvas.drawText(
            "SP  AUTO", margin, ctx.height - margin, osd * 0.9f,
            Paint(color = Col.argb(200, 255, 255, 255)), TextAlign.Left, bold = true,
        )
    }
}
