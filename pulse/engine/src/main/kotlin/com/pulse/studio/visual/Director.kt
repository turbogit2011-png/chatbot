package com.pulse.studio.visual

import com.pulse.studio.audio.AudioFeatures
import com.pulse.studio.visual.scenes.CoverScene
import com.pulse.studio.visual.scenes.KaleidoScene
import com.pulse.studio.visual.scenes.ParticlesScene
import com.pulse.studio.visual.scenes.RadialScene
import com.pulse.studio.visual.scenes.SpectrumScene
import com.pulse.studio.visual.scenes.WaveScene
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin
import kotlin.random.Random

/**
 * Turns a track plus the user's choices into a sequence of frames.
 *
 * The director owns the background, decides which style plays over which section,
 * handles the cut between them and paints the text and progress overlays. Scenes
 * only have to draw themselves.
 */
class Director(
    private val features: AudioFeatures,
    private val spec: ClipSpec,
    val width: Int,
    val height: Int,
    cover: ImageSource?,
) {
    private val palette = spec.palette
    private val seed = if (spec.seed != 0L) spec.seed else features.hashCode().toLong()
    private val ctx = RenderContext(
        features = features,
        palette = palette,
        width = width,
        height = height,
        fps = spec.fps.toFloat(),
        title = spec.title,
        artist = spec.artist,
        cover = if (spec.useCover) cover else null,
        seed = seed,
    )

    private val noise = Noise(seed)
    private val sceneBySection: List<Scene>
    private var activeScene: Scene? = null
    private var sinceCut = 10f

    init {
        val catalogue = available()
        sceneBySection = if (spec.styleId != "auto") {
            val chosen = catalogue.firstOrNull { it.id == spec.styleId } ?: catalogue.first()
            List(max(1, features.sections.size)) { chosen }
        } else {
            // Shuffle once per track so two clips of the same song differ, but the
            // same seed always gives the same cut list.
            val shuffled = catalogue.shuffled(Random(seed))
            List(max(1, features.sections.size)) { shuffled[it % shuffled.size] }
        }
    }

    val startSeconds: Float = spec.startSeconds.coerceAtLeast(0f)
    val endSeconds: Float =
        if (spec.endSeconds > spec.startSeconds) spec.endSeconds else features.durationSeconds
    val durationSeconds: Float = (endSeconds - startSeconds).coerceAtLeast(0.1f)
    val frameCount: Int = (durationSeconds * spec.fps).toInt().coerceAtLeast(1)

    fun renderFrame(canvas: FrameCanvas, frameIndex: Int) {
        val time = startSeconds + frameIndex / spec.fps.toFloat()
        ctx.advanceTo(time, frameIndex)

        val section = features.sectionIndex(time)
        val scene = sceneBySection[section.coerceIn(0, sceneBySection.size - 1)]
        if (scene !== activeScene) {
            scene.reset(ctx)
            activeScene = scene
            sinceCut = 0f
        } else {
            sinceCut += 1f / spec.fps
        }

        drawBackground(canvas)
        scene.render(canvas, ctx)
        drawCut(canvas)
        drawVignette(canvas)
        if (spec.showText) drawText(canvas)
        if (spec.showProgress) drawProgress(canvas)
    }

    // ------------------------------------------------------------- background

    private fun drawBackground(canvas: FrameCanvas) {
        canvas.clear(palette.backgroundDeep)
        canvas.fillRect(
            0f, 0f, width.toFloat(), height.toFloat(),
            Paint(
                shader = Shader.Linear(
                    0f, 0f, 0f, height.toFloat(),
                    intArrayOf(palette.background, palette.backgroundDeep),
                    floatArrayOf(0f, 1f),
                ),
            ),
        )

        // two slow blobs that breathe with the track
        val t = ctx.time
        val blobs = arrayOf(
            Triple(
                width * (0.3f + 0.22f * sin(t * 0.21f).toFloat()),
                height * (0.3f + 0.18f * cos(t * 0.17f).toFloat()),
                palette.primary,
            ),
            Triple(
                width * (0.7f + 0.2f * cos(t * 0.13f + 1.7f).toFloat()),
                height * (0.68f + 0.16f * sin(t * 0.19f + 0.6f).toFloat()),
                palette.secondary,
            ),
        )
        for ((bx, by, colour) in blobs) {
            val radius = ctx.shortSide * (0.45f + 0.25f * ctx.level)
            canvas.fillCircle(
                bx, by, radius,
                Paint(
                    shader = Shader.Radial(
                        bx, by, radius,
                        intArrayOf(Col.withAlpha(colour, 0.16f), Col.withAlpha(colour, 0f)),
                        floatArrayOf(0f, 1f),
                    ),
                    blend = BlendMode.Add,
                ),
            )
        }
    }

    /** A short bloom right after a style change, so cuts feel intentional. */
    private fun drawCut(canvas: FrameCanvas) {
        if (sinceCut > 0.45f) return
        val strength = (1f - sinceCut / 0.45f).coerceIn(0f, 1f)
        canvas.fillRect(
            0f, 0f, width.toFloat(), height.toFloat(),
            Paint(color = Col.withAlpha(palette.accent, 0.35f * strength * strength), blend = BlendMode.Add),
        )
    }

    private fun drawVignette(canvas: FrameCanvas) {
        val radius = max(width, height) * 0.78f
        canvas.fillRect(
            0f, 0f, width.toFloat(), height.toFloat(),
            Paint(
                shader = Shader.Radial(
                    width * 0.5f, height * 0.5f, radius,
                    intArrayOf(
                        Col.argb(0, 0, 0, 0),
                        Col.argb(0, 0, 0, 0),
                        Col.argb(150, 0, 0, 0),
                    ),
                    floatArrayOf(0f, 0.55f, 1f),
                ),
            ),
        )
    }

    // ----------------------------------------------------------------- overlay

    private fun drawText(canvas: FrameCanvas) {
        if (spec.title.isBlank() && spec.artist.isBlank()) return
        val kick = ctx.beatPulse(11f)
        val margin = width * 0.07f
        val bottom = height * (if (spec.aspect == AspectRatio.Landscape) 0.86f else 0.90f)

        val titleSize = ctx.shortSide * 0.062f * (1f + 0.025f * kick)
        val artistSize = ctx.shortSide * 0.034f

        if (spec.artist.isNotBlank()) {
            canvas.drawText(
                spec.artist.uppercase(), margin, bottom, artistSize,
                Paint(color = Col.withAlpha(palette.accent, 0.85f)), TextAlign.Left,
            )
        }
        if (spec.title.isNotBlank()) {
            val y = if (spec.artist.isBlank()) bottom else bottom - artistSize * 1.5f
            canvas.drawText(
                spec.title, margin, y, titleSize,
                Paint(color = Col.argb(245, 255, 255, 255)), TextAlign.Left, bold = true,
            )
        }
    }

    private fun drawProgress(canvas: FrameCanvas) {
        val barHeight = ctx.unit * 0.45f
        val y = height - barHeight * 2.2f
        val margin = width * 0.07f
        val full = width - margin * 2
        val played = full * ((ctx.time - startSeconds) / durationSeconds).coerceIn(0f, 1f)

        canvas.fillRoundRect(
            margin, y, full, barHeight, barHeight / 2,
            Paint(color = Col.argb(70, 255, 255, 255)),
        )
        canvas.fillRoundRect(
            margin, y, played, barHeight, barHeight / 2,
            Paint(
                shader = Shader.Linear(
                    margin, y, margin + full, y,
                    intArrayOf(palette.primary, palette.secondary, palette.accent),
                    floatArrayOf(0f, 0.5f, 1f),
                ),
            ),
        )
        canvas.fillCircle(
            margin + played, y + barHeight / 2, barHeight * 1.5f,
            Paint(color = Col.withAlpha(palette.accent, 0.95f)),
        )
    }

    companion object {
        fun available(): List<Scene> = listOf(
            SpectrumScene(),
            RadialScene(),
            ParticlesScene(),
            WaveScene(),
            KaleidoScene(),
            CoverScene(),
        )

        fun styleOptions(): List<Pair<String, String>> =
            listOf("auto" to "Auto (changes with the song)") +
                available().map { it.id to it.displayName }
    }
}
