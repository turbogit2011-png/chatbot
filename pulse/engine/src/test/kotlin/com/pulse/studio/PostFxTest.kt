package com.pulse.studio

import com.pulse.studio.fx.FxSettings
import com.pulse.studio.fx.PostFx
import kotlin.test.Test
import kotlin.test.assertTrue

/** The finishing chain touches every pixel of every frame; it has to stay in range. */
class PostFxTest {

    private val width = 96
    private val height = 128

    private fun frame(fill: Int = 0xFF202030.toInt()) = IntArray(width * height) { fill }

    private fun luma(pixel: Int): Int =
        (((pixel ushr 16) and 0xFF) * 77 + ((pixel ushr 8) and 0xFF) * 151 + (pixel and 0xFF) * 28) shr 8

    @Test
    fun `output stays inside the byte range and keeps full alpha`() {
        val fx = PostFx(width, height)
        val pixels = frame(0xFFFFFFFF.toInt())
        fx.apply(pixels, FxSettings.Vhs, time = 1f, beat = 1f, seed = 3)
        assertTrue(pixels.all { (it ushr 24) and 0xFF == 0xFF }, "alpha was lost")
        assertTrue(
            pixels.all { p -> listOf(16, 8, 0).all { ((p ushr it) and 0xFF) in 0..255 } },
            "a channel left the byte range",
        )
        fx.release()
    }

    @Test
    fun `vignette darkens the corners more than the centre`() {
        val fx = PostFx(width, height)
        val pixels = frame(0xFF808080.toInt())
        fx.apply(
            pixels,
            FxSettings(bloom = 0f, aberration = 0f, grain = 0f, vignette = 0.8f, contrast = 1f, saturation = 1f),
            time = 0f, beat = 0f, seed = 1,
        )
        val centre = luma(pixels[(height / 2) * width + width / 2])
        val corner = luma(pixels[0])
        assertTrue(corner < centre, "corner $corner was not darker than centre $centre")
        fx.release()
    }

    @Test
    fun `bloom brightens a highlight and leaves black alone`() {
        val fx = PostFx(width, height)
        val pixels = frame(0xFF000000.toInt())
        // a bright square in the middle
        for (y in height / 2 - 6 until height / 2 + 6) {
            for (x in width / 2 - 6 until width / 2 + 6) {
                pixels[y * width + x] = 0xFFFFFFFF.toInt()
            }
        }
        val before = luma(pixels[(height / 2 + 14) * width + width / 2])
        fx.apply(
            pixels,
            FxSettings(bloom = 1f, bloomThreshold = 0.5f, aberration = 0f, grain = 0f, vignette = 0f, contrast = 1f, saturation = 1f),
            time = 0f, beat = 0f, seed = 1,
        )
        val after = luma(pixels[(height / 2 + 14) * width + width / 2])
        assertTrue(after > before, "glow did not spread: $before -> $after")
        assertTrue(luma(pixels[0]) < 30, "bloom lit up the far corner")
        fx.release()
    }

    @Test
    fun `grain changes pixels and no grain leaves them identical`() {
        val plain = FxSettings(bloom = 0f, aberration = 0f, grain = 0f, vignette = 0f, contrast = 1f, saturation = 1f)
        val grainy = plain.copy(grain = 0.8f)

        val fxA = PostFx(width, height)
        val flat = frame()
        fxA.apply(flat, plain, time = 0f, beat = 0f, seed = 5)
        assertTrue(flat.distinct().size == 1, "a no-op chain altered a flat frame")
        fxA.release()

        val fxB = PostFx(width, height)
        val noisy = frame()
        fxB.apply(noisy, grainy, time = 0f, beat = 0f, seed = 5)
        assertTrue(noisy.distinct().size > 10, "grain produced no variation")
        fxB.release()
    }

    @Test
    fun `saturation pushes colour away from grey`() {
        val fx = PostFx(width, height)
        val pixels = frame(0xFF9060A0.toInt())
        fx.apply(
            pixels,
            FxSettings(bloom = 0f, aberration = 0f, grain = 0f, vignette = 0f, contrast = 1f, saturation = 1.8f),
            time = 0f, beat = 0f, seed = 1,
        )
        val p = pixels[0]
        val r = (p ushr 16) and 0xFF
        val g = (p ushr 8) and 0xFF
        val b = p and 0xFF
        assertTrue((r - g) > (0x90 - 0x60), "channels did not spread apart: $r/$g/$b")
        fx.release()
    }

    @Test
    fun `trails blend the previous frame into the next`() {
        val settings = FxSettings(bloom = 0f, aberration = 0f, grain = 0f, vignette = 0f, contrast = 1f, saturation = 1f, trails = 0.7f)
        val fx = PostFx(width, height)
        val white = frame(0xFFFFFFFF.toInt())
        fx.apply(white, settings, time = 0f, beat = 0f, seed = 1)
        val black = frame(0xFF000000.toInt())
        fx.apply(black, settings, time = 0.03f, beat = 0f, seed = 1)
        val value = luma(black[0])
        assertTrue(value in 80..240, "second frame should carry the first: got $value")
        fx.release()
    }

    @Test
    fun `reset clears the trail history`() {
        val settings = FxSettings(bloom = 0f, aberration = 0f, grain = 0f, vignette = 0f, contrast = 1f, saturation = 1f, trails = 0.8f)
        val fx = PostFx(width, height)
        val white = frame(0xFFFFFFFF.toInt())
        fx.apply(white, settings, time = 0f, beat = 0f, seed = 1)
        fx.reset()
        val black = frame(0xFF000000.toInt())
        fx.apply(black, settings, time = 0.03f, beat = 0f, seed = 1)
        assertTrue(luma(black[0]) < 12, "history survived a reset")
        fx.release()
    }

    @Test
    fun `glitch only fires on a transient`() {
        val settings = FxSettings(bloom = 0f, aberration = 0f, grain = 0f, vignette = 0f, contrast = 1f, saturation = 1f, glitch = 1f)
        val gradient = IntArray(width * height) { index ->
            val x = index % width
            val v = x * 255 / (width - 1)
            (0xFF shl 24) or (v shl 16) or (v shl 8) or v
        }

        val quiet = gradient.copyOf()
        val fxQuiet = PostFx(width, height)
        fxQuiet.apply(quiet, settings, time = 1f, beat = 0f, seed = 9)
        assertTrue(quiet.contentEquals(gradient), "glitch fired without a transient")
        fxQuiet.release()

        val loud = gradient.copyOf()
        val fxLoud = PostFx(width, height)
        fxLoud.apply(loud, settings, time = 1f, beat = 1f, seed = 9)
        assertTrue(!loud.contentEquals(gradient), "glitch did not fire on a transient")
        fxLoud.release()
    }
}
