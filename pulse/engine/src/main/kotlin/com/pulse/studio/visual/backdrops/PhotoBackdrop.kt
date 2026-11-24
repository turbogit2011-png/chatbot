package com.pulse.studio.visual.backdrops

import com.pulse.studio.visual.BlendMode
import com.pulse.studio.visual.Col
import com.pulse.studio.visual.FrameCanvas
import com.pulse.studio.visual.ImageSource
import com.pulse.studio.visual.Paint
import com.pulse.studio.visual.RenderContext
import com.pulse.studio.visual.Shader
import kotlin.math.abs
import kotlin.math.max
import kotlin.random.Random

/**
 * The user's own photos, cut to the music.
 *
 * Shots change on downbeats rather than on a timer, and each one gets its own slow
 * push so a still never sits dead on screen. A short scale punch on the cut is what
 * makes the edit feel deliberate instead of like a slideshow.
 */
class PhotoBackdrop(private val barsPerShot: Int = 2) {

    private var shotIndex = -1
    private var shotStart = 0f
    private var nextCut = 0f
    private var zoomIn = true
    private var panX = 0f
    private var panY = 0f
    private var random = Random(1)

    fun reset(ctx: RenderContext) {
        random = Random(ctx.seed)
        shotIndex = -1
        shotStart = 0f
        nextCut = 0f
        pickMove()
    }

    private fun pickMove() {
        zoomIn = random.nextBoolean()
        panX = (random.nextFloat() - 0.5f) * 0.10f
        panY = (random.nextFloat() - 0.5f) * 0.10f
    }

    /** @return the strength of the cut that just happened, 0..1, for the caller to react to */
    fun render(canvas: FrameCanvas, ctx: RenderContext, scrim: Float = 0.35f): Float {
        val media = ctx.media
        if (media.isEmpty()) return 0f

        if (shotIndex < 0 || ctx.time >= nextCut) {
            shotIndex = if (shotIndex < 0) 0 else (shotIndex + 1) % media.size
            shotStart = ctx.time
            nextCut = nextDownbeat(ctx, ctx.time)
            pickMove()
        }

        val image = media[shotIndex % media.size]
        val sinceCut = ctx.time - shotStart
        val span = max(0.4f, nextCut - shotStart)
        val through = (sinceCut / span).coerceIn(0f, 1f)

        // slow push plus a short punch right after the cut
        val drift = if (zoomIn) 1.04f + through * 0.14f else 1.18f - through * 0.14f
        val punch = kotlin.math.exp(-sinceCut * 9f) * 0.05f
        val scale = drift + punch
        val drawWidth = ctx.width * scale
        val drawHeight = ctx.height * scale
        val x = (ctx.width - drawWidth) / 2 + panX * ctx.width * through
        val y = (ctx.height - drawHeight) / 2 + panY * ctx.height * through

        canvas.clear(ctx.palette.backgroundDeep)
        canvas.drawImage(image, x, y, drawWidth, drawHeight, 1f)

        if (scrim > 0f) {
            canvas.fillRect(
                0f, 0f, ctx.width.toFloat(), ctx.height.toFloat(),
                Paint(
                    shader = Shader.Linear(
                        0f, 0f, 0f, ctx.height.toFloat(),
                        intArrayOf(
                            Col.argb((190 * scrim).toInt(), 0, 0, 0),
                            Col.argb((40 * scrim).toInt(), 0, 0, 0),
                            Col.argb((225 * scrim).toInt(), 0, 0, 0),
                        ),
                        floatArrayOf(0f, 0.45f, 1f),
                    ),
                ),
            )
        }

        return kotlin.math.exp(-sinceCut * 12f)
    }

    /** Tints the frame towards two palette colours — a quick way to make mixed photos agree. */
    fun duotone(canvas: FrameCanvas, ctx: RenderContext, amount: Float) {
        if (amount <= 0f) return
        canvas.fillRect(
            0f, 0f, ctx.width.toFloat(), ctx.height.toFloat(),
            Paint(color = Col.withAlpha(ctx.palette.primary, 0.42f * amount), blend = BlendMode.Add),
        )
        canvas.fillRect(
            0f, 0f, ctx.width.toFloat(), ctx.height.toFloat(),
            Paint(
                shader = Shader.Linear(
                    0f, 0f, ctx.width.toFloat(), ctx.height.toFloat(),
                    intArrayOf(
                        Col.withAlpha(ctx.palette.backgroundDeep, 0.55f * amount),
                        Col.withAlpha(ctx.palette.secondary, 0.30f * amount),
                    ),
                    floatArrayOf(0f, 1f),
                ),
            ),
        )
    }

    private fun nextDownbeat(ctx: RenderContext, after: Float): Float {
        val grid = if (ctx.features.downbeats.size > 2) ctx.features.downbeats else ctx.features.beats
        if (grid.isEmpty()) return after + 2f
        var crossed = 0
        for (value in grid) {
            if (value > after + 0.15f) {
                crossed++
                if (crossed >= barsPerShot) return value
            }
        }
        return after + 2f
    }
}
