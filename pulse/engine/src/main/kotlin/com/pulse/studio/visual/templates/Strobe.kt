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
import com.pulse.studio.visual.backdrops.PhotoBackdrop
import kotlin.math.abs

/**
 * Hard-edged and loud: the frame changes colour on the beat, type is set enormous
 * and the grid snaps rather than eases.
 *
 * Built for drops. Colours come from the palette so it stays harsh without turning
 * into a seizure test — the flash lands on the downbeat and clears before the next.
 */
class Strobe : Scene {
    override val id = "strobe"
    override val displayName = "Strobe"
    override val fx = FxSettings.Hard
    override val wantsMedia = true
    override val drawsOwnCredits = true
    override val lyricStyle = LyricStyle.Banner

    private val photos = PhotoBackdrop(barsPerShot = 1)
    private var lastBeat = -1
    private var colourIndex = 0

    override fun reset(ctx: RenderContext) {
        photos.reset(ctx)
        lastBeat = -1
        colourIndex = 0
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        val beat = ctx.beatIndex()
        if (beat != lastBeat) {
            lastBeat = beat
            colourIndex++
        }
        val pulse = ctx.beatPulse(7f)
        val base = when (colourIndex % 4) {
            0 -> ctx.palette.primary
            1 -> ctx.palette.backgroundDeep
            2 -> ctx.palette.secondary
            else -> ctx.palette.backgroundDeep
        }

        canvas.clear(Col.scale(base, 0.35f + 0.4f * pulse))

        if (ctx.media.isNotEmpty()) {
            photos.render(canvas, ctx, scrim = 0.1f)
            canvas.fillRect(
                0f, 0f, ctx.width.toFloat(), ctx.height.toFloat(),
                Paint(color = Col.withAlpha(base, 0.35f + 0.25f * pulse), blend = BlendMode.Add),
            )
        }

        // blocky bars that jump a quarter of the frame on every beat
        val blocks = 5
        val blockHeight = ctx.height / blocks.toFloat()
        for (i in 0 until blocks) {
            val energy = ctx.spectrum(i.toFloat() / (blocks - 1))
            if (energy < 0.25f) continue
            val width = ctx.width * (0.18f + 0.62f * energy)
            val fromLeft = (i + colourIndex) % 2 == 0
            val x = if (fromLeft) 0f else ctx.width - width
            canvas.fillRect(
                x, i * blockHeight + blockHeight * 0.18f, width, blockHeight * 0.1f,
                Paint(color = Col.withAlpha(ctx.palette.accent, 0.35f + 0.5f * energy), blend = BlendMode.Add),
            )
        }

        val margin = ctx.width * 0.06f
        val small = ctx.shortSide * 0.03f
        canvas.drawText(
            (ctx.artist.ifBlank { "PULSE" }).uppercase(),
            margin, margin + small, small,
            Paint(color = Col.argb(235, 255, 255, 255)), TextAlign.Left, bold = true,
        )
        canvas.drawText(
            "${abs(ctx.features.tempo).toInt()} BPM",
            ctx.width - margin, margin + small, small,
            Paint(color = Col.argb(235, 255, 255, 255)), TextAlign.Right, bold = true,
        )
    }
}
