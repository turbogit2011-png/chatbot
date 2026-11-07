package com.sonara.studio.engine

import java.io.File
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Covers the parts of the on-device pipeline that sit between the composer and the
 * encoder: WAV round-tripping, the crossfade used by Extend, the lyric writer, and
 * the memory behaviour of a long render.
 */
class EngineIntegrationTest {

    private val dir = File("build/test-audio").apply { mkdirs() }

    private fun writeTone(file: File, seconds: Float, value: Float): File {
        val writer = WavWriter(file)
        val frames = (Dsp.SR * seconds).toInt()
        val block = FloatArray(2048 * 2)
        var written = 0
        while (written < frames) {
            val take = minOf(2048, frames - written)
            for (i in 0 until take * 2) block[i] = value
            writer.write(block, take)
            written += take
        }
        writer.close()
        return file
    }

    private fun readAll(file: File): FloatArray {
        val collected = ArrayList<Float>()
        WavReader(file).use { reader ->
            val block = FloatArray(4096 * 2)
            while (true) {
                val read = reader.read(block, 4096)
                if (read <= 0) break
                for (i in 0 until read * 2) collected.add(block[i])
            }
        }
        return collected.toFloatArray()
    }

    @Test
    fun `wav round trip preserves samples and length`() {
        val file = writeTone(File(dir, "tone.wav"), 0.5f, 0.5f)
        val samples = readAll(file)
        assertEquals((Dsp.SR * 0.5f).toInt() * 2, samples.size)
        assertTrue(samples.all { abs(it - 0.5f) < 0.001f }, "sample values drifted")
    }

    @Test
    fun `crossfade joins at the cut point and blends smoothly`() {
        val head = writeTone(File(dir, "head.wav"), 6f, 0.8f)
        val tail = writeTone(File(dir, "tail.wav"), 4f, -0.8f)
        val joined = File(dir, "joined.wav")
        val writer = WavWriter(joined)
        val seconds = AudioJoin.crossfade(head, tail, cutSeconds = 3f, sink = writer, fadeSeconds = 1f)
        writer.close()

        // The blend is shared by both halves, so the result is head + tail - fade:
        // 3 s kept + 4 s of tail - 1 s of overlap.
        assertTrue(abs(seconds - 6f) < 0.05f, "joined length was $seconds s")

        val samples = readAll(joined)
        val mono = FloatArray(samples.size / 2) { samples[it * 2] }
        // before the fade we are purely head
        assertTrue(abs(mono[Dsp.SR] - 0.8f) < 0.01f)
        // after the fade we are purely tail
        assertTrue(abs(mono[(Dsp.SR * 4.0f).toInt()] + 0.8f) < 0.01f)
        // the blend crosses through zero rather than jumping
        val mid = mono[(Dsp.SR * 2.5f).toInt()]
        assertTrue(abs(mid) < 0.75f, "crossfade did not blend (value $mid)")
        // and nothing clips on the way
        assertTrue(mono.all { abs(it) <= 1.0f })
    }

    @Test
    fun `crossfade with no cut point keeps the whole head`() {
        val head = writeTone(File(dir, "head2.wav"), 2f, 0.4f)
        val tail = writeTone(File(dir, "tail2.wav"), 2f, 0.4f)
        val out = File(dir, "joined2.wav")
        val writer = WavWriter(out)
        val seconds = AudioJoin.crossfade(head, tail, cutSeconds = 0f, sink = writer, fadeSeconds = 0.5f)
        writer.close()
        assertTrue(abs(seconds - 3.5f) < 0.05f, "expected 3.5 s, got $seconds")
    }

    @Test
    fun `lyric writer returns tagged, on-topic, original lines`() {
        val result = LyricsWriter.write("leaving my hometown at night", "indie rock, anthemic", "en")
        assertTrue(result.title.isNotBlank())
        assertTrue(result.lyrics.contains("[Chorus]"))
        assertTrue(result.lyrics.contains("[Verse 1]"))
        assertTrue(result.lyrics.lines().size > 20)
        assertTrue(result.styleTags.contains("indie rock"))
        // the brief should actually show up in the words
        assertTrue(result.lyrics.contains("hometown", ignoreCase = true))
    }

    @Test
    fun `lyric writer can skip structure tags`() {
        val result = LyricsWriter.write("summer love", null, "en", structureTags = false)
        assertTrue(!result.lyrics.contains("["))
    }

    @Test
    fun `a five minute render stays within a small memory budget`() {
        // The test JVM is capped well below what an unbounded renderer would need for
        // five minutes of 44.1 kHz stereo across five buses.
        val file = File(dir, "long.wav")
        val writer = WavWriter(file)
        val result = Composer(
            SongSpec(
                style = "trap, dark, 808 bass",
                lyrics = "[Verse]\nlong nights in the same city\n[Chorus]\nwe never sleep",
                durationSeconds = 300,
                seed = 31337L,
            ),
        ).render(writer)
        writer.close()
        assertTrue(result.durationSeconds > 290f, "got ${result.durationSeconds}s")
        assertTrue(file.length() > 40_000_000, "file looks truncated: ${file.length()} bytes")
        file.delete()
    }
}
