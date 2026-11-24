package com.pulse.studio.visual

import com.pulse.studio.audio.AudioFeatures
import com.pulse.studio.fx.FxSettings
import com.pulse.studio.fx.PostFx
import com.pulse.studio.text.Lyrics
import com.pulse.studio.visual.templates.Bloomscape
import com.pulse.studio.visual.templates.Editorial
import com.pulse.studio.visual.templates.LyricSlam
import com.pulse.studio.visual.templates.PhotoCut
import com.pulse.studio.visual.templates.SplitGrid
import com.pulse.studio.visual.templates.Strobe
import com.pulse.studio.visual.templates.VhsTape
import kotlin.math.max
import kotlin.random.Random

/**
 * Turns a track plus the user's choices into a sequence of finished frames.
 *
 * Each frame is built in four passes — backdrop and template, typography, overlays,
 * then the finishing chain over the pixels. Splitting it that way is what lets the
 * same template carry lyrics or not, and lets one grade apply across all of them.
 */
class Director(
    private val features: AudioFeatures,
    private val spec: ClipSpec,
    val width: Int,
    val height: Int,
    cover: ImageSource?,
    media: List<ImageSource> = emptyList(),
) {
    private val palette = spec.palette
    private val seed = if (spec.seed != 0L) spec.seed else features.hashCode().toLong()

    private val timedLyrics = if (spec.hasLyrics) {
        Lyrics.align(spec.lyrics, features, spec.lyricOffsetSeconds)
    } else {
        emptyList()
    }

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
        media = media,
        lyrics = timedLyrics,
    )

    private val sceneBySection: List<Scene>
    private var activeScene: Scene? = null
    private var sinceCut = 10f

    private val postFx = PostFx(width, height)
    private val pixels = IntArray(width * height)
    private var typeLayer: TypeLayer? = null

    init {
        val catalogue = available().filter { it.wantsMedia == false || media.isNotEmpty() }
            .ifEmpty { available() }
        sceneBySection = if (spec.styleId != "auto") {
            val chosen = available().firstOrNull { it.id == spec.styleId } ?: catalogue.first()
            List(max(1, features.sections.size)) { chosen }
        } else {
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
            typeLayer = TypeLayer(resolveLyricStyle(scene))
            postFx.reset()
        } else {
            sinceCut += 1f / spec.fps
        }

        scene.render(canvas, ctx)
        typeLayer?.render(canvas, ctx)
        drawCut(canvas)
        if (spec.showText && !scene.drawsOwnCredits) drawText(canvas)
        if (spec.showProgress) drawProgress(canvas)

        val fx = resolveFx(scene)
        if (fx !== FxSettings.None) {
            canvas.snapshot(pixels)
            postFx.apply(pixels, fx, time, ctx.beatPulse(9f), seed.toInt())
            canvas.blit(pixels)
        }
    }

    private fun resolveFx(scene: Scene): FxSettings = spec.look.settings ?: scene.fx

    private fun resolveLyricStyle(scene: Scene): LyricStyle {
        if (timedLyrics.isEmpty()) return LyricStyle.None
        if (spec.lyricStyleId == "auto") return scene.lyricStyle
        return LyricStyle.entries.firstOrNull { it.id == spec.lyricStyleId } ?: scene.lyricStyle
    }

    /** A short bloom right after a template change, so cuts feel intentional. */
    private fun drawCut(canvas: FrameCanvas) {
        if (sinceCut > 0.4f) return
        val strength = (1f - sinceCut / 0.4f).coerceIn(0f, 1f)
        canvas.fillRect(
            0f, 0f, width.toFloat(), height.toFloat(),
            Paint(color = Col.withAlpha(palette.accent, 0.4f * strength * strength), blend = BlendMode.Add),
        )
    }

    private fun drawText(canvas: FrameCanvas) {
        if (spec.title.isBlank() && spec.artist.isBlank()) return
        // With lyrics on screen the credit steps aside so the two never fight.
        val hasLyricsNow = timedLyrics.isNotEmpty() && ctx.currentLine() != null
        val alpha = if (hasLyricsNow) 0.45f else 1f
        val kick = ctx.beatPulse(11f)
        val margin = width * 0.06f
        val bottom = height * (if (spec.aspect == AspectRatio.Landscape) 0.88f else 0.925f)
        val titleSize = ctx.shortSide * 0.046f * (1f + 0.02f * kick)
        val artistSize = ctx.shortSide * 0.028f

        if (spec.artist.isNotBlank()) {
            canvas.drawText(
                spec.artist.uppercase(), margin, bottom, artistSize,
                Paint(color = Col.withAlpha(palette.accent, 0.85f * alpha)), TextAlign.Left,
            )
        }
        if (spec.title.isNotBlank()) {
            val y = if (spec.artist.isBlank()) bottom else bottom - artistSize * 1.6f
            canvas.drawText(
                spec.title, margin, y, titleSize,
                Paint(color = Col.withAlpha(Col.argb(255, 255, 255, 255), 0.96f * alpha)),
                TextAlign.Left, bold = true,
            )
        }
    }

    private fun drawProgress(canvas: FrameCanvas) {
        val barHeight = ctx.unit * 0.3f
        val y = height - barHeight * 3f
        val margin = width * 0.06f
        val full = width - margin * 2
        val played = full * ((ctx.time - startSeconds) / durationSeconds).coerceIn(0f, 1f)

        canvas.fillRoundRect(
            margin, y, full, barHeight, barHeight / 2,
            Paint(color = Col.argb(60, 255, 255, 255)),
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
    }

    companion object {
        fun available(): List<Scene> = listOf(
            LyricSlam(),
            PhotoCut(),
            VhsTape(),
            Bloomscape(),
            Editorial(),
            Strobe(),
            SplitGrid(),
        )

        fun styleOptions(): List<Pair<String, String>> =
            listOf("auto" to "Auto (changes with the song)") +
                available().map { it.id to it.displayName }
    }
}
