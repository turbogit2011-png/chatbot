package com.pulse.studio.visual.templates

import com.pulse.studio.fx.FxSettings
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.LyricStyle
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.RenderContext
import com.pulse.studio.visual.Scene
import com.pulse.studio.visual.TextAlign
import com.pulse.studio.visual.backdrops.PhotoBackdrop
import kotlin.math.pow

/**
 * Print-inspired: a strict grid, hairline rules, metadata set small, and one
 * element allowed to move.
 *
 * The restraint is the design. The only reactive element is a thin spectrum rule,
 * which here is a typographic device rather than a toy.
 */
class Editorial : Scene {
    override val id = "editorial"
    override val displayName = "Editorial"
    override val fx = FxSettings.Clean
    override val wantsMedia = true
    override val drawsOwnCredits = true
    override val lyricStyle = LyricStyle.Stack

    private val photos = PhotoBackdrop(barsPerShot = 8)
    private var heights = FloatArray(64)

    override fun reset(ctx: RenderContext) {
        photos.reset(ctx)
        heights = FloatArray(64)
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        canvas.clear(Col.argb(255, 9, 9, 11))
        if (ctx.media.isNotEmpty()) {
            photos.render(canvas, ctx, scrim = 0.55f)
            photos.duotone(canvas, ctx, 0.3f)
        }

        val margin = ctx.width * 0.08f
        val hairline = (ctx.shortSide * 0.0022f).coerceAtLeast(1f)
        val rule = Paint(color = Col.argb(90, 255, 255, 255))

        canvas.fillRect(margin, ctx.height * 0.14f, ctx.width - margin * 2, hairline, rule)
        canvas.fillRect(margin, ctx.height * 0.86f, ctx.width - margin * 2, hairline, rule)

        val small = ctx.shortSide * 0.024f
        canvas.drawText(
            (ctx.artist.ifBlank { "PULSE" }).uppercase(),
            margin, ctx.height * 0.14f - small * 0.6f, small,
            Paint(color = Col.argb(200, 255, 255, 255)), TextAlign.Left, bold = true,
        )
        canvas.drawText(
            "${ctx.features.tempo.toInt()} BPM",
            ctx.width - margin, ctx.height * 0.14f - small * 0.6f, small,
            Paint(color = Col.withAlpha(ctx.palette.accent, 0.95f)), TextAlign.Right, bold = true,
        )

        // the one moving element: a spectrum set as a rule
        val bars = heights.size
        val gap = ctx.width * 0.0025f
        val barWidth = (ctx.width - margin * 2 - gap * (bars - 1)) / bars
        val baseline = ctx.height * 0.86f
        val maxHeight = ctx.height * 0.10f
        for (i in 0 until bars) {
            val target = ctx.spectrum(i.toFloat() / (bars - 1)).pow(0.9f)
            heights[i] += (target - heights[i]) * (if (target > heights[i]) 0.5f else 0.12f)
            val h = (hairline + heights[i] * maxHeight)
            canvas.fillRect(
                margin + i * (barWidth + gap), baseline - h, barWidth, h,
                Paint(color = Col.withAlpha(ctx.palette.accent, 0.5f + 0.5f * heights[i])),
            )
        }

        canvas.drawText(
            ctx.title.uppercase(),
            margin, ctx.height * 0.86f + small * 2.0f, small,
            Paint(color = Col.argb(220, 255, 255, 255)), TextAlign.Left, bold = true,
        )
        canvas.drawText(
            "${(ctx.progress * 100).toInt().toString().padStart(2, '0')} / 100",
            ctx.width - margin, ctx.height * 0.86f + small * 2.0f, small,
            Paint(color = Col.argb(150, 255, 255, 255)), TextAlign.Right, bold = false,
        )
    }
}
