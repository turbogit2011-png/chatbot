package com.pulse.studio

import com.pulse.studio.audio.AudioAnalyzer
import java.io.File
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertTrue

/**
 * The visuals are only as good as the beat grid under them, so the analyser is
 * measured against material whose tempo is known exactly.
 */
class AudioAnalyzerTest {

    private fun tempoMatches(measured: Float, expected: Float, tolerance: Float = 3f): Boolean =
        listOf(0.5f, 1f, 2f).any { abs(measured * it - expected) < tolerance }

    @Test
    fun `finds the tempo of a click track`() {
        for (bpm in listOf(90f, 128f, 174f)) {
            val audio = TestAudio.clickTrack(bpm, 30f)
            val features = AudioAnalyzer.analyze(audio, TestAudio.SR)
            assertTrue(
                tempoMatches(features.tempo, bpm),
                "click track at $bpm bpm measured ${features.tempo}",
            )
        }
    }

    @Test
    fun `finds the tempo of a drum loop`() {
        for (bpm in listOf(100f, 128f, 140f)) {
            val audio = TestAudio.drumLoop(bpm, 40f)
            val features = AudioAnalyzer.analyze(audio, TestAudio.SR)
            assertTrue(
                tempoMatches(features.tempo, bpm),
                "drum loop at $bpm bpm measured ${features.tempo}",
            )
        }
    }

    @Test
    fun `beats land on the actual beats`() {
        val bpm = 120f
        val audio = TestAudio.drumLoop(bpm, 40f)
        val features = AudioAnalyzer.analyze(audio, TestAudio.SR)
        val period = 60f / bpm

        assertTrue(features.beats.size > 60, "only ${features.beats.size} beats found")
        // every detected beat should sit close to a true beat position
        var worst = 0f
        for (beat in features.beats) {
            val nearest = Math.round(beat / period) * period
            worst = maxOf(worst, abs(beat - nearest))
        }
        assertTrue(worst < 0.06f, "worst beat error was ${worst * 1000} ms")
    }

    @Test
    fun `beat grid follows a tempo change`() {
        val first = TestAudio.drumLoop(120f, 20f, seed = 2)
        val second = TestAudio.drumLoop(132f, 20f, seed = 3)
        val audio = first + second
        val features = AudioAnalyzer.analyze(audio, TestAudio.SR)
        val late = features.beats.filter { it > 22f && it < 38f }
        assertTrue(late.size > 20, "not enough beats in the faster half: ${late.size}")
        val gaps = late.zipWithNext { a, b -> b - a }.sorted()
        val medianGap = gaps[gaps.size / 2]
        val expected = 60f / 132f
        assertTrue(
            abs(medianGap - expected) < 0.04f || abs(medianGap - expected * 2) < 0.06f,
            "median gap after the change was $medianGap s, expected about $expected s",
        )
    }

    @Test
    fun `bands separate low from high content`() {
        val bass = FloatArray(TestAudio.SR * 5) {
            kotlin.math.sin(2f * Math.PI.toFloat() * 60f * it / TestAudio.SR) * 0.8f
        }
        val hiss = FloatArray(TestAudio.SR * 5) {
            kotlin.math.sin(2f * Math.PI.toFloat() * 9000f * it / TestAudio.SR) * 0.8f
        }
        val lowFeatures = AudioAnalyzer.analyze(bass, TestAudio.SR)
        val highFeatures = AudioAnalyzer.analyze(hiss, TestAudio.SR)
        assertTrue(lowFeatures.bass(2.5f) > lowFeatures.treble(2.5f), "60 Hz tone read as treble")
        assertTrue(highFeatures.treble(2.5f) > highFeatures.bass(2.5f), "9 kHz tone read as bass")
    }

    @Test
    fun `level and onset stay inside their range`() {
        val audio = TestAudio.drumLoop(128f, 20f)
        val features = AudioAnalyzer.analyze(audio, TestAudio.SR)
        assertTrue(features.level.all { it in 0f..1f })
        assertTrue(features.onset.all { it in 0f..1f })
        assertTrue(features.level.average() > 0.05f, "level curve is flat")
        assertTrue(features.onset.max() > 0.8f, "no strong onsets detected")
    }

    @Test
    fun `sections start at zero and stay apart`() {
        // quiet intro, loud body, quiet outro
        val intro = TestAudio.drumLoop(124f, 20f, seed = 5).map { it * 0.25f }.toFloatArray()
        val body = TestAudio.drumLoop(124f, 30f, seed = 6)
        val outro = TestAudio.drumLoop(124f, 20f, seed = 7).map { it * 0.2f }.toFloatArray()
        val features = AudioAnalyzer.analyze(intro + body + outro, TestAudio.SR)
        assertTrue(features.sections.isNotEmpty())
        assertTrue(features.sections[0] == 0f)
        val gaps = features.sections.toList().zipWithNext { a, b -> b - a }
        assertTrue(gaps.all { it >= 9.9f }, "sections too close together: ${features.sections.toList()}")
        assertTrue(features.sections.size >= 2, "no section change found in an obviously structured track")
    }

    @Test
    fun `sampling by time is safe at the edges`() {
        val features = AudioAnalyzer.analyze(TestAudio.drumLoop(120f, 10f), TestAudio.SR)
        for (time in listOf(-5f, 0f, 5f, 9.99f, 1000f)) {
            features.levelAt(time)
            features.bandAt(0, time)
            features.beatPulse(time)
            features.sectionIndex(time)
        }
    }

    @Test
    fun `analyses a real file when one is provided`() {
        val path = System.getenv("PULSE_TEST_WAV") ?: return
        val file = File(path)
        if (!file.exists()) return
        val (mono, sampleRate) = TestAudio.readWavMono(file)
        val features = AudioAnalyzer.analyze(mono, sampleRate, title = file.name)
        println(
            "REAL ${file.name}: ${"%.1f".format(features.durationSeconds)}s " +
                "tempo=${"%.1f".format(features.tempo)} beats=${features.beats.size} " +
                "sections=${features.sections.size} peaks=${features.peaks.size}",
        )
        assertTrue(features.beats.size > features.durationSeconds / 2, "suspiciously few beats")
        assertTrue(features.level.max() > 0.5f)
    }
}
