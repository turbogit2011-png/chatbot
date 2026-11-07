package com.sonara.studio.engine

import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

/** Everything the composer needs to render one track. Stored with each song so
 * extend, cover and stems can reproduce the original bit for bit. */
@kotlinx.serialization.Serializable
data class SongSpec(
    val prompt: String = "",
    val style: String = "",
    val lyrics: String = "",
    val title: String? = null,
    val durationSeconds: Int = 180,
    val instrumental: Boolean = false,
    val weirdness: Float = 0.35f,
    val styleWeight: Float = 0.6f,
    val lyricsWeight: Float = 0.6f,
    val tempoBpm: Int? = null,
    val vocalGender: String? = null,
    val seed: Long = 0L,
    val variant: Int = 1,
)

/** Receives finished interleaved stereo audio, block by block. */
interface PcmSink {
    fun write(interleaved: FloatArray, frames: Int)
}

data class RenderResult(
    val title: String,
    val durationSeconds: Float,
    val bpm: Int,
    val tags: List<String>,
    val hasVocals: Boolean,
)

/**
 * The on-device arranger and performer.
 *
 * A whole song never exists in memory at once: the arrangement is turned into a list
 * of scheduled voice events, and the renderer walks the timeline a few bars at a time,
 * carrying filter state and note tails across block boundaries. Peak memory is a
 * handful of megabytes regardless of track length, which is what makes a ten-minute
 * render safe on a phone.
 */
class Composer(private val spec: SongSpec) {

    private val profile = Music.buildProfile(
        style = spec.style,
        prompt = spec.prompt,
        seed = spec.seed,
        tempoBpm = spec.tempoBpm,
        weirdness = spec.weirdness,
        instrumental = spec.instrumental,
        vocalGender = spec.vocalGender,
    )

    private val sections = Music.planSections(spec.durationSeconds, profile)
    private val barSamples = (4.0 * 60.0 / profile.bpm * Dsp.SR).toInt()
    private val stepSamples = barSamples / 16f
    private val totalBars = sections.sumOf { it.bars }
    private val tailSamples = (Dsp.SR * 3.5f).toInt()
    private val totalSamples = totalBars * barSamples + tailSamples

    private val cache = HashMap<String, FloatArray>(512)
    private val events = ArrayList<Event>(16_384)

    /**
     * Per-bus level estimate.
     *
     * A streaming renderer cannot normalise a finished buffer, so levels are worked out
     * from the arrangement instead: every scheduled voice adds its own peak into coarse
     * time buckets, and the high percentile of those buckets is a stable upper bound on
     * how loud the bus will get. A single empirical factor converts that bound (which
     * assumes every voice peaks in phase) into a realistic level.
     */
    private val bucketSamples = Dsp.SR / 100
    private val buckets = Array(BUS_COUNT) { FloatArray(totalSamples / bucketSamples + 2) }

    private class Event(val bus: Int, val start: Int, val sample: FloatArray, val gain: Float)

    private fun schedule(bus: Int, start: Int, sample: FloatArray, gain: Float) {
        if (start >= totalSamples || gain <= 0f) return
        events.add(Event(bus, start, sample, gain))
        val contribution = Dsp.peak(sample) * gain
        if (contribution <= 0f) return
        val first = start / bucketSamples
        val last = min(buckets[bus].size - 1, (start + sample.size) / bucketSamples)
        for (b in max(0, first)..last) buckets[bus][b] += contribution
    }

    private fun busGains(): FloatArray {
        val targets = floatArrayOf(0.82f, 0.62f, 0.72f, 0.68f, 0.85f)
        return FloatArray(BUS_COUNT) { bus ->
            val values = buckets[bus].filter { it > 0f }.sorted()
            if (values.isEmpty()) return@FloatArray 1f
            val estimate = values[(values.size * 0.995f).toInt().coerceAtMost(values.size - 1)] *
                COHERENCE
            if (estimate <= 1e-6f) 1f else (targets[bus] / estimate).coerceIn(0.05f, 40f)
        }
    }

    private companion object {
        const val BUS_DRUMS = 0
        const val BUS_BASS = 1
        const val BUS_HARMONY = 2
        const val BUS_LEAD = 3
        const val BUS_VOCALS = 4
        const val BUS_COUNT = 5
        val BUS_NAMES = arrayOf("drums", "bass", "harmony", "lead", "vocals")

        /** Voices rarely peak in phase; calibrated against full renders across genres. */
        const val COHERENCE = 0.45f
    }

    val bpm: Int get() = profile.bpm
    val tags: List<String> get() = profile.tags.toList()

    // ------------------------------------------------------------------ public

    fun render(
        sink: PcmSink,
        stemSink: ((String, FloatArray, Int) -> Unit)? = null,
        onProgress: (Float) -> Unit = {},
    ): RenderResult {
        arrange()
        onProgress(0.08f)

        events.sortBy { it.start }
        val hasVocals = events.any { it.bus == BUS_VOCALS }

        val chunkBars = max(1, min(4, totalBars))
        val chunkSamples = chunkBars * barSamples
        val bufferSize = chunkSamples + tailSamples
        val buses = Array(BUS_COUNT) { FloatArray(bufferSize) }
        val stereo = FloatArray(chunkSamples * 2)

        val chains = Chains(profile, hasVocals, busGains())
        var eventIndex = 0
        var position = 0
        val fadeOutStart = totalSamples - (Dsp.SR * 2.2f).toInt()

        while (position < totalSamples) {
            val span = min(chunkSamples, totalSamples - position)
            val chunkEnd = position + chunkSamples

            while (eventIndex < events.size && events[eventIndex].start < chunkEnd) {
                val event = events[eventIndex]
                Dsp.addAt(buses[event.bus], event.sample, event.start - position, event.gain)
                eventIndex++
            }

            chains.process(buses, span, stereo, position, fadeOutStart, totalSamples)
            sink.write(stereo, span)
            stemSink?.let { emit ->
                for (bus in 0 until BUS_COUNT) emit(BUS_NAMES[bus], buses[bus], span)
            }

            for (bus in buses) {
                System.arraycopy(bus, span, bus, 0, bufferSize - span)
                java.util.Arrays.fill(bus, bufferSize - span, bufferSize, 0f)
            }
            position += span
            onProgress(0.08f + 0.9f * position.toFloat() / totalSamples)
        }

        onProgress(1f)
        return RenderResult(
            title = (spec.title?.trim()?.takeIf { it.isNotEmpty() })
                ?: Music.titleFrom(spec.prompt, spec.lyrics, spec.seed),
            durationSeconds = totalSamples.toFloat() / Dsp.SR,
            bpm = profile.bpm,
            tags = profile.tags.take(8),
            hasVocals = hasVocals,
        )
    }

    // ----------------------------------------------------------------- arrange

    private fun arrange() {
        val random = Random(spec.seed)
        val lyricBlocks = Music.parseLyricSections(spec.lyrics)
        val kit = Kits.forName(profile.kit)
        val bassPattern = Kits.bassFor(profile.kit)
        val cursor = HashMap<String, Int>()

        for (section in sections) {
            for (bar in 0 until section.bars) {
                val absoluteBar = section.startBar + bar
                val barStart = absoluteBar * barSamples
                val degree = profile.progression[absoluteBar % profile.progression.size]
                val chord = Music.chordNotes(profile, degree, profile.kit in setOf("brushes", "boombap"))

                scheduleDrums(kit, barStart, section.energy, absoluteBar)
                scheduleBass(bassPattern, barStart, chord, section.energy)
                scheduleHarmony(barStart, chord, section.energy)
                if (section.energy >= 0.6f || section.name in setOf("chorus", "bridge", "intro")) {
                    scheduleLead(barStart, chord, section.energy, absoluteBar)
                }
            }
            if (!profile.instrumental) {
                scheduleVocals(section, lyricBlocks, cursor)
            }
        }
        if (profile.instrumental) events.removeAll { it.bus == BUS_VOCALS }
    }

    private fun voice(key: String, build: () -> FloatArray): FloatArray =
        cache.getOrPut(key, build)

    private fun scheduleDrums(kit: Map<String, FloatArray>, barStart: Int, energy: Float, barIndex: Int) {
        if (kit.isEmpty()) return
        val hatSub = profile.kit == "trap" && energy > 0.7f
        for ((name, pattern) in kit) {
            for (step in pattern.indices) {
                val velocity = pattern[step]
                if (velocity <= 0f) continue
                var offset = step * stepSamples
                if (profile.swing > 0f && step % 2 == 1) offset += stepSamples * profile.swing
                val position = barStart + offset.toInt()
                val gain = velocity * (0.55f + 0.5f * energy)
                val sample = drumVoice(name)
                schedule(BUS_DRUMS, position, sample, gain)
                if (name == "hat" && hatSub) {
                    schedule(BUS_DRUMS, position + (stepSamples / 2).toInt(), sample, gain * 0.55f)
                }
            }
        }
        if (energy >= 0.6f && (barIndex + 1) % 8 == 0) {
            val fill = drumVoice("tom")
            for (i in 0 until 4) {
                schedule(BUS_DRUMS, barStart + ((12 + i) * stepSamples).toInt(), fill, 0.5f + 0.12f * i)
            }
        }
        if (energy >= 0.9f && barIndex % 16 == 0) {
            schedule(BUS_DRUMS, barStart, drumVoice("crash"), 0.6f)
        }
    }

    private fun drumVoice(name: String): FloatArray = voice("drum:$name:${profile.kit}:${profile.bright}") {
        when (name) {
            "kick" -> {
                val trap = profile.kit == "trap"
                // ~44 Hz for trap, ~55 Hz otherwise: a kick's fundamental belongs in the sub,
                // not two octaves above it.
                Dsp.kick((Dsp.SR * if (trap) 0.75f else 0.42f).toInt(), if (trap) 29f else 33f)
            }
            "snare" -> Dsp.snare((Dsp.SR * 0.30f).toInt(), profile.bright)
            "clap" -> Dsp.clap((Dsp.SR * 0.30f).toInt())
            "hat" -> Dsp.hat((Dsp.SR * 0.08f).toInt())
            "ohat" -> Dsp.hat((Dsp.SR * 0.30f).toInt(), open = true)
            "tom" -> Dsp.tom((Dsp.SR * 0.30f).toInt(), 66f)
            "crash" -> Dsp.crash((Dsp.SR * 1.6f).toInt())
            else -> FloatArray(1)
        }
    }

    private fun scheduleBass(pattern: FloatArray, barStart: Int, chord: IntArray, energy: Float) {
        val root = chord[0] - 24
        val sub = profile.kit in setOf("trap", "electronic", "fourfloor", "dembow")
        for (step in pattern.indices) {
            val velocity = pattern[step]
            if (velocity <= 0f) continue
            val length = (stepSamples * if (sub) 3.4f else 2.2f).toInt()
            val freq = Dsp.midiToHz(root.toFloat())
            val sample = voice("bass:$sub:${freq.toInt()}:$length") {
                val tone: FloatArray
                val env: FloatArray
                if (sub) {
                    val sine = Dsp.sine(freq, length)
                    val saw = Dsp.saw(freq, length)
                    tone = FloatArray(length) { sine[it] * 0.9f + saw[it] * 0.18f }
                    Biquad.lowpass(180f, 0.9f).processInPlace(tone)
                    env = Dsp.adsr(length, 0.004f, 0.05f, 0.85f, 0.28f)
                } else {
                    // Acoustic-style basses still need a sine under the harmonics,
                    // otherwise the mix has no weight below 80 Hz.
                    val saw = Dsp.saw(freq, length)
                    val sq = Dsp.square(freq, length, 0.45f)
                    val sub = Dsp.sine(freq, length)
                    tone = FloatArray(length) { saw[it] * 0.5f + sq[it] * 0.22f + sub[it] * 0.55f }
                    Biquad.lowpass(520f, 1.1f).processInPlace(tone)
                    env = Dsp.adsr(length, 0.006f, 0.08f, 0.6f, 0.12f)
                }
                FloatArray(length) { tone[it] * env[it] }
            }
            schedule(BUS_BASS, barStart + (step * stepSamples).toInt(), sample, velocity * (0.5f + 0.5f * energy))
        }
    }

    private fun scheduleHarmony(barStart: Int, chord: IntArray, energy: Float) {
        if (profile.pad == "none" && profile.kit == "rock") {
            for (step in intArrayOf(0, 4, 8, 12)) {
                for (note in chord) {
                    val freq = Dsp.midiToHz(note.toFloat())
                    val length = barSamples / 8
                    val sample = voice("stab:${freq.toInt()}:$length") {
                        val saw = Dsp.saw(freq, length)
                        val sq = Dsp.square(freq, length)
                        val tone = FloatArray(length) { saw[it] * 0.5f + sq[it] * 0.2f }
                        Biquad.lowpass(2600f * profile.bright, 0.9f).processInPlace(tone)
                        val env = Dsp.adsr(length, 0.005f, 0.05f, 0.4f, 0.12f)
                        FloatArray(length) { (Math.tanh(tone[it] * 2.2).toFloat() * 0.6f) * env[it] }
                    }
                    schedule(BUS_HARMONY, barStart + (step * stepSamples).toInt(), sample, 0.22f * (0.5f + energy))
                }
            }
            return
        }

        val length = (barSamples * 1.05f).toInt()
        for (note in chord) {
            val freq = Dsp.midiToHz(note.toFloat())
            val sample = voice("pad:${profile.pad}:${freq.toInt()}:$length:${profile.bright}") {
                val tone: FloatArray
                val cutoff: Float
                when (profile.pad) {
                    "analog" -> {
                        tone = Dsp.supersaw(freq, length, 7, 0.016f)
                        cutoff = 1500f * profile.bright
                    }
                    "strings" -> {
                        val a = Dsp.saw(freq, length)
                        val b = Dsp.saw(freq, length, 0.004f)
                        val c = Dsp.triangle(freq * 2, length)
                        tone = FloatArray(length) { a[it] * 0.4f + b[it] * 0.35f + c[it] * 0.15f }
                        cutoff = 2400f * profile.bright
                    }
                    "dark" -> {
                        val a = Dsp.saw(freq / 2, length)
                        val b = Dsp.sine(freq, length)
                        tone = FloatArray(length) { a[it] * 0.5f + b[it] * 0.3f }
                        cutoff = 900f * profile.bright
                    }
                    else -> {
                        val a = Dsp.fmBell(freq, length, 1f, 1.4f)
                        val b = Dsp.triangle(freq, length)
                        tone = FloatArray(length) { a[it] * 0.5f + b[it] * 0.35f }
                        cutoff = 1900f * profile.bright
                    }
                }
                Biquad.lowpass(cutoff, 0.8f).processInPlace(tone)
                val env = Dsp.adsr(length, 0.18f, 0.3f, 0.75f, 0.5f)
                FloatArray(length) { tone[it] * env[it] }
            }
            schedule(BUS_HARMONY, barStart, sample, 0.26f * (0.45f + 0.6f * energy))
        }

        if (profile.kit in setOf("fourfloor", "electronic") && energy > 0.6f) {
            for (step in intArrayOf(2, 6, 10, 14)) {
                for (i in 1 until chord.size) {
                    val freq = Dsp.midiToHz((chord[i] + 12).toFloat())
                    val length = barSamples / 10
                    val sample = voice("pluckstab:${freq.toInt()}:$length") {
                        val tone = Dsp.supersaw(freq, length, 5, 0.01f)
                        Biquad.lowpass(3200f, 1f).processInPlace(tone)
                        val env = Dsp.adsr(length, 0.004f, 0.04f, 0.3f, 0.08f)
                        FloatArray(length) { tone[it] * env[it] }
                    }
                    schedule(BUS_HARMONY, barStart + (step * stepSamples).toInt(), sample, 0.14f * energy)
                }
            }
        }
    }

    private fun scheduleLead(barStart: Int, chord: IntArray, energy: Float, barIndex: Int) {
        val arpeggio = profile.lead in setOf("supersaw", "bell", "square") ||
            profile.kit in setOf("fourfloor", "electronic")
        val notes = IntArray(chord.size + 1) { if (it < chord.size) chord[it] + 12 else chord[0] + 24 }
        if (arpeggio) {
            val pattern = intArrayOf(0, 1, 2, 1, 3, 2, 1, 0)
            val length = (stepSamples * 1.1f).toInt()
            for (step in 0 until 16) {
                val note = notes[pattern[step % pattern.size] % notes.size]
                val sample = leadVoice(Dsp.midiToHz(note.toFloat()), length)
                schedule(BUS_LEAD, barStart + (step * stepSamples).toInt(), sample, 0.2f * energy)
            }
        } else {
            val random = Random(barIndex * 31L + profile.bpm)
            var step = 0
            while (step < 16) {
                val durationSteps = intArrayOf(2, 2, 4, 3)[random.nextInt(4)]
                val degree = intArrayOf(0, 2, 4, 5, 7)[random.nextInt(5)]
                val note = Music.scaleNote(profile, degree + 7)
                val length = (stepSamples * durationSteps * 0.95f).toInt()
                val sample = leadVoice(Dsp.midiToHz(note.toFloat()), length)
                schedule(BUS_LEAD, barStart + (step * stepSamples).toInt(), sample, 0.22f * energy)
                step += durationSteps
            }
        }
    }

    private fun leadVoice(freq: Float, length: Int): FloatArray =
        voice("lead:${profile.lead}:${freq.toInt()}:$length") {
            val tone: FloatArray
            val env: FloatArray
            when (profile.lead) {
                "supersaw" -> {
                    tone = Dsp.supersaw(freq, length, 7, 0.014f)
                    Biquad.lowpass(4200f * profile.bright, 1.1f).processInPlace(tone)
                    env = Dsp.adsr(length, 0.01f, 0.08f, 0.65f, 0.2f)
                }
                "bell" -> {
                    tone = Dsp.fmBell(freq, length, 3f, 4f)
                    env = Dsp.adsr(length, 0.002f, 0.12f, 0.3f, 0.3f)
                }
                "square" -> {
                    tone = Dsp.square(freq, length, 0.35f)
                    env = Dsp.adsr(length, 0.004f, 0.05f, 0.6f, 0.1f)
                }
                "piano" -> {
                    val a = Dsp.fmBell(freq, length, 1f, 2.2f)
                    val b = Dsp.triangle(freq, length)
                    tone = FloatArray(length) { a[it] * 0.6f + b[it] * 0.3f }
                    env = Dsp.adsr(length, 0.004f, 0.25f, 0.35f, 0.35f)
                }
                "guitar" -> {
                    tone = Dsp.pluck(freq, length, 0.9955f)
                    Biquad.lowpass(3600f * profile.bright).processInPlace(tone)
                    for (i in tone.indices) tone[i] = Math.tanh(tone[i] * 2.0).toFloat() * 0.7f
                    env = Dsp.adsr(length, 0.004f, 0.1f, 0.6f, 0.2f)
                }
                "strings" -> {
                    val a = Dsp.saw(freq, length)
                    val b = Dsp.saw(freq, length, 0.005f)
                    tone = FloatArray(length) { a[it] * 0.4f + b[it] * 0.4f }
                    Biquad.lowpass(3000f * profile.bright, 0.8f).processInPlace(tone)
                    env = Dsp.adsr(length, 0.12f, 0.2f, 0.8f, 0.4f)
                }
                "growl" -> {
                    val saw = Dsp.saw(freq, length)
                    tone = FloatArray(length) {
                        val lfo = 1f + 0.6f * kotlin.math.sin(2f * Math.PI.toFloat() * 5.5f * it / Dsp.SR)
                        Math.tanh((saw[it] * lfo * 3f).toDouble()).toFloat() * 0.6f
                    }
                    Biquad.lowpass(2200f, 2f).processInPlace(tone)
                    env = Dsp.adsr(length, 0.01f, 0.06f, 0.8f, 0.12f)
                }
                "stab" -> {
                    val saw = Dsp.saw(freq, length)
                    val sq = Dsp.square(freq, length)
                    tone = FloatArray(length) { saw[it] * 0.5f + sq[it] * 0.3f }
                    Biquad.lowpass(2800f, 1.4f).processInPlace(tone)
                    env = Dsp.adsr(length, 0.003f, 0.04f, 0.25f, 0.1f)
                }
                else -> {
                    tone = Dsp.pluck(freq, length)
                    env = Dsp.adsr(length, 0.003f, 0.1f, 0.5f, 0.2f)
                }
            }
            FloatArray(length) { tone[it] * env[it] }
        }

    private fun scheduleVocals(
        section: Music.Section,
        blocks: Map<String, List<String>>,
        cursor: HashMap<String, Int>,
    ) {
        val key = when {
            blocks.containsKey(section.name) -> section.name
            section.name in setOf("intro", "outro") -> return
            blocks.containsKey("verse") -> "verse"
            else -> return
        }
        val lines = blocks[key].orEmpty()
        if (lines.isEmpty()) return

        val singableBars = max(1, section.bars - 1)
        val start = cursor[key] ?: 0
        val linesToSing = max(1, min(lines.size, singableBars / 2))
        val chosen = List(linesToSing) { lines[(start + it) % lines.size] }
        cursor[key] = (start + linesToSing) % max(1, lines.size)

        val melodyRandom = Random(section.name.hashCode().toLong() * 31 + profile.root)
        val contour = intArrayOf(0, 2, 4, 2, 5, 4, 2, 0)
        val barsPerLine = max(1, singableBars / chosen.size)

        chosen.forEachIndexed { lineIndex, line ->
            val sylls = Music.syllables(line)
            if (sylls.isEmpty()) return@forEachIndexed
            val lineStart = (section.startBar + lineIndex * barsPerLine) * barSamples
            val span = barsPerLine * barSamples
            val noteLength = max((Dsp.SR * 0.16f).toInt(), span / max(1, sylls.size))
            sylls.forEachIndexed { i, vowel ->
                var degree = contour[(i + lineIndex) % contour.size] + if (section.name == "chorus") 7 else 0
                if (melodyRandom.nextFloat() < 0.22f) degree += intArrayOf(-2, -1, 1, 2)[melodyRandom.nextInt(4)]
                val note = Music.scaleNote(profile, degree + 7) + 12 * (1 + profile.vocalOctave)
                val freq = Dsp.midiToHz(note.toFloat())
                val length = min(
                    (noteLength * if (i == sylls.size - 1) 1.25f else 0.96f).toInt(),
                    tailSamples,
                )
                val sample = voice("voice:$vowel:${freq.toInt()}:$length:${profile.bright}") {
                    Music.sing(freq, length, vowel, profile.bright)
                }
                val position = lineStart + i * noteLength
                val gain = if (section.name == "chorus") 0.5f else 0.42f
                schedule(BUS_VOCALS, position, sample, gain)
                if (section.name == "chorus") {
                    val harmonyFreq = Dsp.midiToHz((note + 4).toFloat())
                    val harmony = voice("voice:$vowel:${harmonyFreq.toInt()}:$length:${profile.bright}") {
                        Music.sing(harmonyFreq, length, vowel, profile.bright)
                    }
                    schedule(BUS_VOCALS, position, harmony, gain * 0.45f)
                }
            }
        }
    }
}

/** 16th-note grids per drum kit, and the bass rhythm that goes with each. */
private object Kits {
    private fun grid(vararg v: Float) = floatArrayOf(*v)

    private val KITS: Map<String, Map<String, FloatArray>> = mapOf(
        "acoustic" to mapOf(
            "kick" to grid(1f,0f,0f,0f, 0f,0f,.6f,0f, 0f,0f,1f,0f, 0f,0f,0f,0f),
            "snare" to grid(0f,0f,0f,0f, 1f,0f,0f,0f, 0f,0f,0f,0f, 1f,0f,0f,.5f),
            "hat" to grid(.6f,.3f,.7f,.3f, .6f,.3f,.7f,.3f, .6f,.3f,.7f,.3f, .6f,.3f,.7f,.45f),
        ),
        "rock" to mapOf(
            "kick" to grid(1f,0f,0f,0f, 0f,0f,0f,0f, 1f,0f,.7f,0f, 0f,0f,0f,0f),
            "snare" to grid(0f,0f,0f,0f, 1f,0f,0f,0f, 0f,0f,0f,0f, 1f,0f,0f,.6f),
            "hat" to grid(.8f,0f,.5f,0f, .8f,0f,.5f,0f, .8f,0f,.5f,0f, .8f,0f,.5f,.4f),
        ),
        "fourfloor" to mapOf(
            "kick" to grid(1f,0f,0f,0f, 1f,0f,0f,0f, 1f,0f,0f,0f, 1f,0f,0f,0f),
            "clap" to grid(0f,0f,0f,0f, 1f,0f,0f,0f, 0f,0f,0f,0f, 1f,0f,0f,0f),
            "hat" to grid(0f,0f,.8f,0f, 0f,0f,.8f,0f, 0f,0f,.8f,0f, 0f,0f,.8f,0f),
            "ohat" to grid(0f,0f,0f,0f, 0f,0f,0f,.5f, 0f,0f,0f,0f, 0f,0f,0f,.6f),
        ),
        "electronic" to mapOf(
            "kick" to grid(1f,0f,0f,0f, 0f,0f,.5f,0f, 1f,0f,0f,0f, 0f,0f,.4f,0f),
            "clap" to grid(0f,0f,0f,0f, 1f,0f,0f,0f, 0f,0f,0f,0f, 1f,0f,0f,0f),
            "hat" to grid(.5f,.4f,.7f,.4f, .5f,.4f,.7f,.4f, .5f,.4f,.7f,.4f, .5f,.4f,.7f,.5f),
        ),
        "trap" to mapOf(
            "kick" to grid(1f,0f,0f,0f, 0f,0f,1f,0f, 0f,0f,.8f,0f, 0f,1f,0f,0f),
            "clap" to grid(0f,0f,0f,0f, 0f,0f,0f,0f, 1f,0f,0f,0f, 0f,0f,0f,0f),
            "hat" to grid(.7f,.5f,.7f,.5f, .7f,.5f,.7f,.5f, .7f,.5f,.7f,.5f, .7f,.5f,.7f,.5f),
        ),
        "boombap" to mapOf(
            "kick" to grid(1f,0f,0f,.5f, 0f,0f,1f,0f, 0f,0f,.6f,0f, 0f,0f,0f,0f),
            "snare" to grid(0f,0f,0f,0f, 1f,0f,0f,0f, 0f,.4f,0f,0f, 1f,0f,0f,0f),
            "hat" to grid(.6f,0f,.5f,0f, .6f,0f,.5f,0f, .6f,0f,.5f,0f, .6f,0f,.5f,.4f),
        ),
        "breaks" to mapOf(
            "kick" to grid(1f,0f,0f,0f, 0f,0f,.7f,0f, 0f,.6f,0f,0f, 0f,0f,0f,0f),
            "snare" to grid(0f,0f,0f,0f, 1f,0f,0f,.4f, 0f,0f,1f,0f, 0f,0f,.5f,0f),
            "hat" to grid(.5f,.4f,.6f,.4f, .5f,.4f,.6f,.4f, .5f,.4f,.6f,.4f, .5f,.4f,.6f,.4f),
        ),
        "brushes" to mapOf(
            "kick" to grid(.7f,0f,0f,0f, 0f,0f,.4f,0f, .6f,0f,0f,0f, 0f,0f,0f,0f),
            "snare" to grid(.3f,.2f,.5f,.2f, .3f,.2f,.5f,.2f, .3f,.2f,.5f,.2f, .3f,.2f,.5f,.3f),
            "hat" to grid(.4f,0f,0f,0f, .5f,0f,0f,0f, .4f,0f,0f,0f, .5f,0f,0f,.3f),
        ),
        "dembow" to mapOf(
            "kick" to grid(1f,0f,0f,0f, 0f,0f,0f,1f, 0f,0f,1f,0f, 0f,0f,0f,0f),
            "snare" to grid(0f,0f,0f,.6f, 0f,0f,1f,0f, 0f,0f,0f,.6f, 0f,0f,1f,0f),
            "hat" to grid(.5f,.3f,.5f,.3f, .5f,.3f,.5f,.3f, .5f,.3f,.5f,.3f, .5f,.3f,.5f,.3f),
        ),
        "cinematic" to mapOf(
            "kick" to grid(1f,0f,0f,0f, 0f,0f,0f,0f, 1f,0f,0f,0f, 0f,0f,0f,0f),
            "tom" to grid(0f,0f,1f,0f, 0f,0f,.7f,0f, 0f,0f,1f,0f, 0f,.6f,0f,.8f),
        ),
        "none" to emptyMap(),
    )

    private val BASS: Map<String, FloatArray> = mapOf(
        "fourfloor" to grid(1f,0f,0f,0f, 1f,0f,0f,0f, 1f,0f,0f,0f, 1f,0f,0f,0f),
        "trap" to grid(1f,0f,0f,0f, 0f,0f,1f,0f, 0f,0f,.8f,0f, 0f,1f,0f,0f),
        "rock" to grid(1f,0f,.6f,0f, 1f,0f,.6f,0f, 1f,0f,.6f,0f, 1f,0f,.6f,.5f),
        "boombap" to grid(1f,0f,0f,0f, 0f,.6f,0f,0f, 1f,0f,0f,0f, 0f,.6f,0f,0f),
        "acoustic" to grid(1f,0f,0f,0f, .7f,0f,0f,0f, 1f,0f,0f,0f, .7f,0f,0f,.4f),
        "brushes" to grid(1f,0f,0f,0f, .6f,0f,0f,0f, 1f,0f,0f,0f, .6f,0f,0f,0f),
        "electronic" to grid(1f,0f,0f,.5f, 1f,0f,0f,.5f, 1f,0f,0f,.5f, 1f,0f,0f,.5f),
        "breaks" to grid(1f,0f,0f,.6f, 0f,0f,1f,0f, 0f,.6f,0f,0f, 1f,0f,0f,0f),
        "dembow" to grid(1f,0f,0f,0f, 0f,0f,0f,1f, 0f,0f,1f,0f, 0f,0f,0f,0f),
        "cinematic" to grid(1f,0f,0f,0f, 0f,0f,0f,0f, 1f,0f,0f,0f, 0f,0f,0f,0f),
        "none" to grid(1f,0f,0f,0f, 0f,0f,0f,0f, 1f,0f,0f,0f, 0f,0f,0f,0f),
    )

    fun forName(name: String): Map<String, FloatArray> = KITS[name] ?: KITS.getValue("acoustic")
    fun bassFor(name: String): FloatArray = BASS[name] ?: BASS.getValue("acoustic")
}
