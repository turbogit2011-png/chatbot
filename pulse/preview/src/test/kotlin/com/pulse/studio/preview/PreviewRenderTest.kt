package com.pulse.studio

import com.pulse.studio.audio.AudioAnalyzer
import com.pulse.studio.visual.AspectRatio
import com.pulse.studio.visual.ClipSpec
import com.pulse.studio.visual.Director
import com.pulse.studio.visual.Palette
import java.io.File
import kotlin.test.Test
import kotlin.test.assertTrue

/**
 * Renders the real visual engine on the JVM.
 *
 * With PULSE_PREVIEW set it writes PNG frames (and a frame sequence for a video) so
 * the output can actually be looked at. Without it, it still runs a short render to
 * prove every style draws something sensible.
 */
class PreviewRenderTest {

    private val outDir = File("build/preview").apply { mkdirs() }

    private fun features(seconds: Float = 30f) =
        AudioAnalyzer.analyze(TestAudio.drumLoop(124f, seconds, seed = 11), TestAudio.SR, "Test")

    @Test
    fun `every style renders a frame that is not blank`() {
        val audio = features(20f)
        for (scene in Director.available()) {
            val spec = ClipSpec(
                styleId = scene.id,
                paletteId = "neon",
                aspectId = "9:16",
                title = "Night Drive",
                artist = "Pulse",
                seed = 7L,
            )
            val (w, h) = AspectRatio.Portrait.sizeFor(360)
            val director = Director(audio, spec, w, h, null)
            val canvas = AwtCanvas(w, h)
            // render a few frames so smoothing and particle state settle
            for (frame in 0 until 40) director.renderFrame(canvas, frame)
            val pixels = canvas.image.getRGB(0, 0, w, h, null, 0, w)
            val distinct = pixels.toHashSet().size
            assertTrue(distinct > 500, "${scene.id} produced a nearly flat frame ($distinct colours)")
            val lit = pixels.count { (it ushr 16 and 0xFF) + (it ushr 8 and 0xFF) + (it and 0xFF) > 160 }
            assertTrue(lit > pixels.size / 200, "${scene.id} is almost entirely dark")
            canvas.dispose()
        }
    }

    @Test
    fun `frame count and duration follow the spec`() {
        val audio = features(30f)
        val spec = ClipSpec(fps = 30, startSeconds = 5f, endSeconds = 15f)
        val (w, h) = spec.aspect.sizeFor(360)
        val director = Director(audio, spec, w, h, null)
        assertTrue(director.frameCount == 300, "expected 300 frames, got ${director.frameCount}")
        assertTrue(kotlin.math.abs(director.durationSeconds - 10f) < 0.01f)
    }

    @Test
    fun `aspect ratios produce even dimensions`() {
        for (aspect in AspectRatio.entries) {
            for (shortSide in listOf(540, 720, 1080)) {
                val (w, h) = aspect.sizeFor(shortSide)
                assertTrue(w % 2 == 0 && h % 2 == 0, "$aspect at $shortSide gave ${w}x$h")
            }
        }
    }

    @Test
    fun `writes preview stills when asked`() {
        if (System.getenv("PULSE_PREVIEW") == null) return
        val audio = features(30f)
        for (scene in Director.available()) {
            for ((index, palette) in listOf(Palette.Neon, Palette.Sunset, Palette.Mint).withIndex()) {
                val spec = ClipSpec(
                    styleId = scene.id,
                    paletteId = palette.id,
                    aspectId = "9:16",
                    title = "Night Drive",
                    artist = "Pulse Studio",
                    seed = 7L,
                )
                val (w, h) = spec.aspect.sizeFor(540)
                val director = Director(audio, spec, w, h, null)
                val canvas = AwtCanvas(w, h)
                for (frame in 0 until 150) director.renderFrame(canvas, frame)
                canvas.save(File(outDir, "${scene.id}-${palette.id}.png"))
                canvas.dispose()
                if (index == 0) println("PREVIEW ${scene.id} ${w}x$h")
            }
        }
    }
}
