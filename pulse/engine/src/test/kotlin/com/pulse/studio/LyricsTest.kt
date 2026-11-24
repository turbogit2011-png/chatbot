package com.pulse.studio

import com.pulse.studio.audio.AudioAnalyzer
import com.pulse.studio.text.Lyrics
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Typography only reads as cut to the music if the timing is right. */
class LyricsTest {

    private fun features(seconds: Float = 60f, bpm: Float = 120f) =
        AudioAnalyzer.analyze(TestAudio.drumLoop(bpm, seconds, seed = 21), TestAudio.SR)

    @Test
    fun `timestamped lyrics are used exactly as written`() {
        val raw = """
            [00:05.00]First line here
            [00:09.50]Second line here
            [00:14.25]Third line here
        """.trimIndent()
        assertTrue(Lyrics.hasTimestamps(raw))
        val lines = Lyrics.align(raw, features(), offsetSeconds = 0f)
        assertEquals(3, lines.size)
        assertTrue(abs(lines[0].start - 5f) < 0.01f, "got ${lines[0].start}")
        assertTrue(abs(lines[1].start - 9.5f) < 0.01f)
        assertTrue(abs(lines[2].start - 14.25f) < 0.01f)
        // each line runs up to the next one
        assertTrue(abs(lines[0].end - lines[1].start) < 0.01f)
    }

    @Test
    fun `the nudge shifts every line`() {
        val raw = "[00:05.00]One\n[00:10.00]Two"
        val shifted = Lyrics.align(raw, features(), offsetSeconds = 1.5f)
        assertTrue(abs(shifted[0].start - 6.5f) < 0.01f, "got ${shifted[0].start}")
        assertTrue(abs(shifted[1].start - 11.5f) < 0.01f)
    }

    @Test
    fun `plain lyrics land on the beat grid`() {
        val audio = features(60f, 120f)
        val raw = (1..8).joinToString("\n") { "Line number $it of the song" }
        val lines = Lyrics.align(raw, audio)
        assertTrue(lines.size >= 6, "only ${lines.size} lines placed")
        assertTrue(lines.zipWithNext().all { (a, b) -> b.start >= a.start }, "lines out of order")

        // every line should start within a beat of an actual beat
        val period = 60f / 120f
        for (line in lines) {
            val nearest = audio.beats.minByOrNull { abs(it - line.start) } ?: continue
            assertTrue(
                abs(nearest - line.start) < period * 0.6f,
                "line at ${line.start}s is ${abs(nearest - line.start)}s from the nearest beat",
            )
        }
    }

    @Test
    fun `section tags are not sung`() {
        val raw = "[Verse]\nReal words here\n[Chorus]\nMore real words"
        val lines = Lyrics.align(raw, features())
        assertTrue(lines.none { it.text.startsWith("[") }, "a section tag was treated as a lyric")
        assertEquals(2, lines.size)
    }

    @Test
    fun `words are spread across the line and stay inside it`() {
        val raw = "[00:04.00]one two three four five\n[00:08.00]next"
        val line = Lyrics.align(raw, features()).first()
        assertEquals(5, line.words.size)
        assertTrue(line.words.first().start >= line.start - 0.001f)
        assertTrue(line.words.last().end <= line.end + 0.001f)
        assertTrue(
            line.words.zipWithNext().all { (a, b) -> b.start >= a.start },
            "word timings are out of order",
        )
    }

    @Test
    fun `the sung word advances through the line`() {
        val raw = "[00:00.00]alpha bravo charlie delta\n[00:08.00]next"
        val line = Lyrics.align(raw, features()).first()
        assertEquals(-1, line.wordAt(-1f))
        assertEquals(0, line.wordAt(0.01f))
        val late = line.wordAt(line.words.last().start + 0.01f)
        assertEquals(line.words.size - 1, late)
    }

    @Test
    fun `wrapping respects the width and the line budget`() {
        // a measurer where every character is exactly ten units wide
        val measure: (String) -> Float = { it.length * 10f }
        val rows = Lyrics.wrap("aaa bbb ccc ddd eee", maxWidth = 70f, maxLines = 2, measure = measure)
        assertTrue(rows.size <= 2)
        assertTrue(rows.all { measure(it) <= 70f }, "a row overflowed: $rows")
        assertTrue(rows.first().startsWith("aaa"))
    }

    @Test
    fun `a word longer than the line still gets a row`() {
        val measure: (String) -> Float = { it.length * 10f }
        val rows = Lyrics.wrap("supercalifragilistic", maxWidth = 50f, maxLines = 2, measure = measure)
        assertEquals(1, rows.size)
        assertEquals("supercalifragilistic", rows.first())
    }

    @Test
    fun `empty input produces nothing`() {
        assertTrue(Lyrics.align("", features()).isEmpty())
        assertTrue(Lyrics.align("   \n\n ", features()).isEmpty())
    }
}
