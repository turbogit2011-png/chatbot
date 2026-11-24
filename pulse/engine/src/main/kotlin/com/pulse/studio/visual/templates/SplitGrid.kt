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
import com.pulse.studio.visual.TextAlign
import kotlin.math.max
import kotlin.random.Random

/**
 * A grid of the user's photos where one cell swaps on every beat.
 *
 * Swapping a single cell rather than the whole grid is what gives it rhythm: the eye
 * has somewhere stable to rest while the frame still moves with the track. Without
 * photos the cells become colour fields, so the template never looks broken.
 */
class SplitGrid : Scene {
    override val id = "grid"
    override val displayName = "Split Grid"
    override val fx = FxSettings.Film
    override val wantsMedia = true
    override val lyricStyle = LyricStyle.Banner

    private var columns = 2
    private var rows = 3
    private lateinit var cellMedia: IntArray
    private lateinit var cellChanged: FloatArray
    private var lastBeat = -1
    private var random = Random(1)

    override fun reset(ctx: RenderContext) {
        random = Random(ctx.seed)
        columns = if (ctx.width > ctx.height) 3 else 2
        rows = if (ctx.width > ctx.height) 2 else 3
        val count = columns * rows
        cellMedia = IntArray(count) { it }
        cellChanged = FloatArray(count) { -10f }
        lastBeat = -1
    }

    override fun render(canvas: FrameCanvas, ctx: RenderContext) {
        canvas.clear(ctx.palette.backgroundDeep)

        val beat = ctx.beatIndex()
        if (beat != lastBeat) {
            lastBeat = beat
            val cell = random.nextInt(cellMedia.size)
            cellMedia[cell] = if (ctx.media.isEmpty()) {
                random.nextInt(8)
            } else {
                (cellMedia[cell] + 1 + random.nextInt(max(1, ctx.media.size - 1))) % ctx.media.size
            }
            cellChanged[cell] = ctx.time
        }

        val gap = ctx.shortSide * 0.012f
        val cellWidth = (ctx.width - gap * (columns + 1)) / columns
        val cellHeight = (ctx.height - gap * (rows + 1)) / rows

        for (row in 0 until rows) {
            for (column in 0 until columns) {
                val index = row * columns + column
                val x = gap + column * (cellWidth + gap)
                val y = gap + row * (cellHeight + gap)
                val since = ctx.time - cellChanged[index]
                val pop = kotlin.math.exp(-since * 10f).coerceIn(0f, 1f)
                val inset = cellWidth * 0.02f * pop

                if (ctx.media.isNotEmpty()) {
                    val image = ctx.media[cellMedia[index] % ctx.media.size]
                    val zoom = 1.05f + 0.06f * pop
                    val drawWidth = cellWidth * zoom
                    val drawHeight = cellHeight * zoom
                    canvas.drawImage(
                        image,
                        x - (drawWidth - cellWidth) / 2 + inset,
                        y - (drawHeight - cellHeight) / 2 + inset,
                        drawWidth - inset * 2,
                        drawHeight - inset * 2,
                        1f,
                    )
                } else {
                    val colour = ctx.palette.ramp((cellMedia[index] % 8) / 8f)
                    canvas.fillRect(
                        x, y, cellWidth, cellHeight,
                        Paint(
                            shader = Shader.Linear(
                                x, y, x + cellWidth, y + cellHeight,
                                intArrayOf(Col.scale(colour, 0.9f), Col.scale(colour, 0.35f)),
                                floatArrayOf(0f, 1f),
                            ),
                        ),
                    )
                }

                // the freshly swapped cell flashes its edge
                if (pop > 0.02f) {
                    val edge = ctx.shortSide * 0.004f
                    val tint = Paint(color = Col.withAlpha(ctx.palette.accent, pop), blend = BlendMode.Add)
                    canvas.fillRect(x, y, cellWidth, edge, tint)
                    canvas.fillRect(x, y + cellHeight - edge, cellWidth, edge, tint)
                    canvas.fillRect(x, y, edge, cellHeight, tint)
                    canvas.fillRect(x + cellWidth - edge, y, edge, cellHeight, tint)
                }
            }
        }

        // darken the middle band so the banner type has somewhere to sit
        canvas.fillRect(
            0f, ctx.height * 0.34f, ctx.width.toFloat(), ctx.height * 0.32f,
            Paint(
                shader = Shader.Linear(
                    0f, ctx.height * 0.34f, 0f, ctx.height * 0.66f,
                    intArrayOf(
                        Col.argb(0, 0, 0, 0),
                        Col.argb(170, 0, 0, 0),
                        Col.argb(0, 0, 0, 0),
                    ),
                    floatArrayOf(0f, 0.5f, 1f),
                ),
            ),
        )

        // Metadata sits at the top so it never collides with the credit the director
        // places at the bottom left.
        val margin = ctx.width * 0.05f
        val small = ctx.shortSide * 0.025f
        canvas.drawText(
            "${cellMedia.size} FRAMES · ${ctx.features.tempo.toInt()} BPM",
            margin, margin + small, small,
            Paint(color = Col.argb(190, 255, 255, 255)), TextAlign.Left, bold = true,
        )
    }
}
