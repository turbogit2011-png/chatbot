package com.pulse.studio.visual

import com.pulse.studio.text.Lyrics
import com.pulse.studio.text.TimedLine
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

enum class LyricStyle(val id: String, val label: String) {
    WordPop("pop", "Words punch in"),
    Karaoke("karaoke", "Karaoke highlight"),
    Stack("stack", "Lines stack up"),
    Banner("banner", "Full-bleed banner"),
    None("none", "No lyrics"),
}

/**
 * Kinetic typography.
 *
 * This is the part that makes a clip read as a 2026 music video rather than a
 * visualiser: large type, set tight, arriving in time with the words and leaving
 * before it overstays. Sizes are fitted to the frame so a long line never spills
 * and a short one never looks lost.
 */
class TypeLayer(private val style: LyricStyle) {

    private var fittedFor: String? = null
    private var fittedSize = 0f
    private var fittedRows: List<String> = emptyList()

    fun render(canvas: FrameCanvas, ctx: RenderContext) {
        if (style == LyricStyle.None || ctx.lyrics.isEmpty()) return
        when (style) {
            LyricStyle.WordPop -> renderWordPop(canvas, ctx)
            LyricStyle.Karaoke -> renderKaraoke(canvas, ctx)
            LyricStyle.Stack -> renderStack(canvas, ctx)
            LyricStyle.Banner -> renderBanner(canvas, ctx)
            LyricStyle.None -> Unit
        }
    }

    // ----------------------------------------------------------------- styles

    /** Each word lands on its own beat, scaling down into place. */
    private fun renderWordPop(canvas: FrameCanvas, ctx: RenderContext) {
        val line = ctx.currentLine() ?: return
        val maxWidth = ctx.width * 0.86f
        val size = fit(canvas, line.text, maxWidth, ctx.shortSide * 0.17f, 3)
        val rows = fittedRows
        if (rows.isEmpty()) return

        val lineHeight = size * 1.06f
        val blockHeight = rows.size * lineHeight
        var y = ctx.centreY - blockHeight / 2 + size * 0.8f
        val activeWord = line.wordAt(ctx.time)

        var wordIndex = 0
        for (row in rows) {
            val words = row.split(" ")
            val rowWidth = canvas.measureText(row, size, true)
            var x = ctx.centreX - rowWidth / 2
            val spaceWidth = canvas.measureText(" ", size, true)
            for (word in words) {
                val timing = line.words.getOrNull(wordIndex)
                val appeared = timing == null || ctx.time >= timing.start
                val sinceStart = if (timing == null) 1f else (ctx.time - timing.start).coerceAtLeast(0f)
                val pop = if (appeared) (1f - (-sinceStart * 14f).let { kotlin.math.exp(it) }) else 0f
                val wordWidth = canvas.measureText(word, size, true)

                if (appeared) {
                    val scale = 0.82f + 0.18f * pop
                    val drawSize = size * scale
                    val isActive = wordIndex == activeWord
                    val colour = if (isActive) ctx.palette.accent else Col.argb(255, 255, 255, 255)
                    val alpha = (0.35f + 0.65f * pop).coerceIn(0f, 1f)

                    // The active word gets a glow and a rule under it rather than a
                    // filled plate, which at this size reads as a highlighter pen.
                    if (isActive) {
                        canvas.fillCircle(
                            x + wordWidth / 2, y - drawSize * 0.3f,
                            wordWidth * 0.62f,
                            Paint(color = Col.withAlpha(ctx.palette.primary, 0.16f * pop), blend = BlendMode.Add),
                        )
                        canvas.fillRoundRect(
                            x, y + drawSize * 0.16f, wordWidth * pop, drawSize * 0.055f,
                            drawSize * 0.03f,
                            Paint(color = Col.withAlpha(ctx.palette.accent, 0.95f)),
                        )
                    }
                    canvas.drawText(
                        word,
                        x + wordWidth / 2,
                        y + (size - drawSize) * 0.4f,
                        drawSize,
                        Paint(color = Col.withAlpha(colour, alpha)),
                        TextAlign.Center,
                        bold = true,
                    )
                }
                x += wordWidth + spaceWidth
                wordIndex++
            }
            y += lineHeight
        }
    }

    /** The whole line is there; a colour wipe follows the singing. */
    private fun renderKaraoke(canvas: FrameCanvas, ctx: RenderContext) {
        val line = ctx.currentLine() ?: return
        val maxWidth = ctx.width * 0.86f
        val size = fit(canvas, line.text, maxWidth, ctx.shortSide * 0.13f, 3)
        val rows = fittedRows
        if (rows.isEmpty()) return

        val lineHeight = size * 1.1f
        var y = ctx.height * 0.72f - (rows.size - 1) * lineHeight
        val activeWord = line.wordAt(ctx.time)
        var wordIndex = 0

        for (row in rows) {
            val rowWidth = canvas.measureText(row, size, true)
            var x = ctx.centreX - rowWidth / 2
            val spaceWidth = canvas.measureText(" ", size, true)
            for (word in row.split(" ")) {
                val wordWidth = canvas.measureText(word, size, true)
                val sung = wordIndex <= activeWord
                val colour = if (sung) ctx.palette.accent else Col.argb(210, 235, 235, 245)
                canvas.drawText(
                    word, x + wordWidth / 2, y, size,
                    Paint(color = colour), TextAlign.Center, bold = true,
                )
                if (wordIndex == activeWord) {
                    canvas.fillRoundRect(
                        x, y + size * 0.16f, wordWidth, size * 0.07f, size * 0.035f,
                        Paint(color = ctx.palette.accent),
                    )
                }
                x += wordWidth + spaceWidth
                wordIndex++
            }
            y += lineHeight
        }
    }

    /** Lines pile up from the bottom, older ones falling back. */
    private fun renderStack(canvas: FrameCanvas, ctx: RenderContext) {
        val index = ctx.lineIndex()
        if (index < 0) return
        val size = ctx.shortSide * 0.075f
        val lineHeight = size * 1.35f
        val baseline = ctx.height * 0.74f
        val visible = 4

        for (back in 0 until visible) {
            val line = ctx.lyrics.getOrNull(index - back) ?: continue
            val age = ctx.time - line.start
            val rise = (1f - (-age * 9f).let { kotlin.math.exp(it) }).coerceIn(0f, 1f)
            val y = baseline - back * lineHeight - (1f - rise) * lineHeight * 0.5f
            val fade = (1f - back / visible.toFloat()).pow(1.6f) * rise
            val colour = if (back == 0) ctx.palette.accent else Col.argb(255, 255, 255, 255)
            val rows = Lyrics.wrap(line.text, ctx.width * 0.84f, 1) { canvas.measureText(it, size, back == 0) }
            canvas.drawText(
                rows.firstOrNull() ?: line.text,
                ctx.width * 0.08f,
                y,
                size,
                Paint(color = Col.withAlpha(colour, fade * 0.95f)),
                TextAlign.Left,
                bold = back == 0,
            )
        }
    }

    /** One line, edge to edge, stretched as large as it will go. */
    private fun renderBanner(canvas: FrameCanvas, ctx: RenderContext) {
        val line = ctx.currentLine() ?: return
        val progress = line.progress(ctx.time)
        val maxWidth = ctx.width * 0.94f
        val size = fit(canvas, line.text, maxWidth, ctx.shortSide * 0.26f, 2)
        val rows = fittedRows
        if (rows.isEmpty()) return

        val enter = (1f - (-progress * 22f).let { kotlin.math.exp(it) }).coerceIn(0f, 1f)
        val exit = (1f - ((progress - 0.88f) / 0.12f)).coerceIn(0f, 1f)
        val alpha = (enter * exit).coerceIn(0f, 1f)
        val slide = (1f - enter) * ctx.width * 0.12f

        val lineHeight = size * 0.98f
        var y = ctx.centreY - (rows.size - 1) * lineHeight / 2 + size * 0.32f
        for ((rowIndex, row) in rows.withIndex()) {
            val direction = if (rowIndex % 2 == 0) 1f else -1f
            canvas.drawText(
                row,
                ctx.centreX + slide * direction,
                y,
                size,
                Paint(color = Col.withAlpha(Col.argb(255, 255, 255, 255), alpha)),
                TextAlign.Center,
                bold = true,
            )
            y += lineHeight
        }
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Picks the largest size at which the line fits in [maxWidth] across at most
     * [maxLines] rows, capped at [ceiling]. Results are cached per line because the
     * search costs several text measurements.
     */
    private fun fit(
        canvas: FrameCanvas,
        text: String,
        maxWidth: Float,
        ceiling: Float,
        maxLines: Int,
    ): Float {
        val key = "$text|$maxWidth|$ceiling|$maxLines"
        if (fittedFor == key) return fittedSize

        var low = ceiling * 0.25f
        var high = ceiling
        var best = low
        var bestRows = listOf(text)
        repeat(7) {
            val size = (low + high) / 2f
            val rows = Lyrics.wrap(text, maxWidth, maxLines) { canvas.measureText(it, size, true) }
            val fits = rows.isNotEmpty() &&
                rows.size <= maxLines &&
                rows.all { canvas.measureText(it, size, true) <= maxWidth }
            if (fits) {
                best = size
                bestRows = rows
                low = size
            } else {
                high = size
            }
        }
        fittedFor = key
        fittedSize = best
        fittedRows = bestRows
        return best
    }
}
