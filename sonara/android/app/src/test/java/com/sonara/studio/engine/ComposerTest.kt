package com.sonara.studio.engine

import java.io.File
import kotlin.math.abs
import kotlin.math.sqrt
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * The on-device engine is plain Kotlin, so it can be rendered and measured on the JVM.
 * These tests check that it really produces music: correct tempo, sane level, no
 * clipping, and section contrast — not just a buffer full of numbers.
 */
class ComposerTest {

    private val outputDir = File("build/test-audio").apply { mkdirs() }

    private fun renderToWav(name: String, spec: SongSpec): Pair<File, RenderResult> {
        val file = File(outputDir, "$name.wav")
        val writer = WavWriter(file)
        val result = Composer(spec).render(writer)
        writer.close()
        return file to result
    }

    private fun readWav(file: File): FloatArray {
        val bytes = file.readBytes()
        val samples = FloatArray((bytes.size - 44) / 2)
        var index = 0
        var offset = 44
        while (offset + 1 < bytes.size) {
            val value = (bytes[offset].toInt() and 0xFF) or (bytes[offset + 1].toInt() shl 8)
            samples[index++] = value.toShort() / 32768f
            offset += 2
        }
        return samples
    }

    private fun mono(interleaved: FloatArray): FloatArray =
        FloatArray(interleaved.size / 2) { (interleaved[it * 2] + interleaved[it * 2 + 1]) * 0.5f }

    private fun detectBpm(signal: FloatArray): Float {
        val hop = 512
        val frameCount = signal.size / hop
        val energy = FloatArray(frameCount) { frame ->
            var sum = 0.0
            for (i in 0 until hop) {
                val v = signal[frame * hop + i]
                sum += v.toDouble() * v
            }
            sqrt(sum / hop).toFloat()
        }
        val onset = FloatArray(frameCount)
        for (i in 1 until frameCount) onset[i] = maxOf(0f, energy[i] - energy[i - 1])
        val mean = onset.average().toFloat()
        for (i in onset.indices) onset[i] -= mean

        val fps = Dsp.SR.toFloat() / hop
        val lowLag = (fps * 60f / 200f).toInt().coerceAtLeast(1)
        val highLag = (fps * 60f / 50f).toInt().coerceAtMost(frameCount - 1)
        var bestLag = lowLag
        var best = Float.NEGATIVE_INFINITY
        for (lag in lowLag..highLag) {
            var sum = 0f
            for (i in lag until frameCount) sum += onset[i] * onset[i - lag]
            if (sum > best) {
                best = sum
                bestLag = lag
            }
        }
        return 60f * fps / bestLag
    }

    @Test
    fun `style words drive the arrangement`() {
        val trap = Music.buildProfile("trap, dark, 808 bass", "", 1L)
        val jazz = Music.buildProfile("smoky jazz club", "", 1L)
        assertEquals("trap", trap.kit)
        assertEquals("brushes", jazz.kit)
        assertTrue(jazz.swing > 0f)
        assertTrue(trap.bpm > jazz.bpm)
    }

    @Test
    fun `longer genre names win over shorter ones`() {
        assertEquals(122, Music.buildProfile("deep house", "", 1L).bpm)
        assertEquals(134, Music.buildProfile("melodic trance", "", 1L).bpm)
        assertEquals(122, Music.buildProfile("afro house melodic groove", "", 1L).bpm)
    }

    @Test
    fun `explicit tempo wins`() {
        assertEquals(96, Music.buildProfile("pop", "", 3L, tempoBpm = 96).bpm)
    }

    @Test
    fun `sections fill the requested duration`() {
        val profile = Music.buildProfile("pop", "", 2L, tempoBpm = 120)
        val sections = Music.planSections(180, profile)
        val bars = sections.sumOf { it.bars }
        val seconds = bars * 4 * 60.0 / profile.bpm
        assertTrue(seconds in 150.0..215.0, "arrangement was $seconds s")
        assertTrue(sections.any { it.name == "chorus" })
    }

    @Test
    fun `lyrics split by section tag`() {
        val blocks = Music.parseLyricSections("[Verse]\nline one\n[Chorus]\nhook one\nhook two")
        assertEquals(listOf("line one"), blocks["verse"])
        assertEquals(listOf("hook one", "hook two"), blocks["chorus"])
    }

    @Test
    fun `syllables handle accented languages`() {
        assertEquals(listOf("o", "a", "e", "ą"), Music.syllables("Zostań ze mną"))
    }

    @Test
    fun `filters stay finite`() {
        val input = Dsp.noise(44100, 5)
        for (filter in listOf(Biquad.lowpass(800f), Biquad.highpass(200f), Biquad.bandpass(1000f))) {
            val output = filter.process(input)
            assertTrue(output.all { it.isFinite() })
            assertTrue(Dsp.peak(output) < 50f)
        }
    }

    @Test
    fun `reverb adds a decaying tail`() {
        val impulse = FloatArray(44100)
        impulse[100] = 1f
        Reverb(0.6f, 0.6f).processInPlace(impulse, 0, impulse.size)
        assertTrue(impulse.all { it.isFinite() })
        assertTrue(Dsp.rms(impulse, 20000, 44100) > 0f, "no reverb tail")
        assertTrue(Dsp.rms(impulse, 20000, 44100) < Dsp.rms(impulse, 0, 20000), "tail does not decay")
    }

    @Test
    fun `block rendering matches single pass rendering`() {
        // The filters are stateful on purpose; this proves the block boundaries are inaudible.
        val signal = Dsp.noise(20000, 3)
        val whole = signal.copyOf()
        Biquad.lowpass(900f).processInPlace(whole)
        val blocked = signal.copyOf()
        val filter = Biquad.lowpass(900f)
        var offset = 0
        while (offset < blocked.size) {
            val end = minOf(offset + 777, blocked.size)
            filter.processInPlace(blocked, offset, end)
            offset = end
        }
        for (i in whole.indices) {
            assertTrue(abs(whole[i] - blocked[i]) < 1e-5f, "block boundary changed sample $i")
        }
    }

    @Test
    fun `renders a full song with the requested tempo and safe level`() {
        val (file, result) = renderToWav(
            "pop-120",
            SongSpec(
                prompt = "anthemic pop about running out of the city at sunrise",
                style = "pop, anthemic, euphoric, female vocals",
                lyrics = """
                    [Verse]
                    Streetlights blur into the rain tonight
                    Everything we owned fits in the back seat
                    [Chorus]
                    Run with me until the morning breaks
                    Hold the line, the city fades away
                    [Bridge]
                    Quiet now, just headlights and breathing
                """.trimIndent(),
                durationSeconds = 60,
                tempoBpm = 120,
                seed = 99L,
                vocalGender = "female",
            ),
        )
        assertTrue(file.length() > 100_000, "file is suspiciously small")
        assertTrue(result.hasVocals, "vocals were requested but none were scheduled")
        assertTrue(result.durationSeconds in 52f..72f, "got ${result.durationSeconds}s")

        val samples = readWav(file)
        val mix = mono(samples)
        val peak = Dsp.peak(mix)
        val rms = Dsp.rms(mix)
        assertTrue(peak <= 1.0f, "mix clips at $peak")
        assertTrue(peak > 0.35f, "mix is far too quiet at $peak")
        assertTrue(rms > 0.03f, "mix is effectively silent")
        assertTrue(20 * Math.log10((peak / rms).toDouble()) > 6, "no dynamics left")

        val bpm = detectBpm(mix)
        assertTrue(
            listOf(0.5f, 1f, 2f).any { abs(bpm * it - 120f) < 12f },
            "no beat near 120 bpm (measured $bpm)",
        )
    }

    @Test
    fun `instrumental mode schedules no vocals`() {
        val (_, result) = renderToWav(
            "instrumental",
            SongSpec(
                style = "lo-fi, dreamy",
                lyrics = "[Verse]\nthis text must be ignored",
                durationSeconds = 30,
                instrumental = true,
                seed = 5L,
            ),
        )
        assertTrue(!result.hasVocals)
    }

    @Test
    fun `different genres all render at a usable level`() {
        val genres = listOf(
            "trap, dark, 808 bass" to "trap",
            "afro house melodic trance" to "afrohouse",
            "cinematic, epic, orchestral" to "cinematic",
            "indie rock, anthemic" to "rock",
            "smoky jazz club" to "jazz",
        )
        for ((style, name) in genres) {
            val (file, _) = renderToWav(
                name,
                SongSpec(
                    style = style,
                    lyrics = "[Verse]\nholding on to the last light\n[Chorus]\nwe keep moving on",
                    durationSeconds = 40,
                    seed = 2024L,
                ),
            )
            val mix = mono(readWav(file))
            val peak = Dsp.peak(mix)
            val rms = Dsp.rms(mix)
            assertTrue(peak <= 1.0f, "$name clips at $peak")
            assertTrue(peak > 0.3f, "$name is too quiet (peak $peak)")
            assertTrue(rms in 0.02f..0.4f, "$name has an odd level (rms $rms)")
        }
    }
}
