package com.sonara.studio.engine

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.sin
import kotlin.random.Random

/**
 * Musical knowledge for the on-device composer: scales, chord progressions, the
 * style table that maps words in a prompt onto a real arrangement, section planning,
 * lyric parsing and the formant voice that sings them.
 */
object Music {

    val MAJOR = intArrayOf(0, 2, 4, 5, 7, 9, 11)
    val MINOR = intArrayOf(0, 2, 3, 5, 7, 8, 10)
    val DORIAN = intArrayOf(0, 2, 3, 5, 7, 9, 10)
    val PHRYGIAN = intArrayOf(0, 1, 3, 5, 7, 8, 10)
    val PENTA_MINOR = intArrayOf(0, 3, 5, 7, 10)
    val PENTA_MAJOR = intArrayOf(0, 2, 4, 7, 9)

    private val PROGRESSIONS: Map<String, List<IntArray>> = mapOf(
        "pop" to listOf(intArrayOf(0, 5, 3, 4), intArrayOf(0, 4, 5, 3), intArrayOf(5, 3, 0, 4)),
        "sad" to listOf(intArrayOf(5, 3, 0, 4), intArrayOf(0, 3, 5, 4), intArrayOf(5, 2, 3, 4)),
        "epic" to listOf(intArrayOf(0, 5, 1, 4), intArrayOf(5, 3, 4, 0), intArrayOf(0, 4, 1, 5)),
        "jazz" to listOf(intArrayOf(1, 4, 0, 5), intArrayOf(2, 5, 0, 3), intArrayOf(1, 4, 0, 0)),
        "edm" to listOf(intArrayOf(5, 3, 0, 4), intArrayOf(0, 4, 5, 3), intArrayOf(3, 4, 0, 5)),
        "trap" to listOf(intArrayOf(5, 5, 3, 4), intArrayOf(5, 3, 5, 4), intArrayOf(0, 5, 3, 3)),
        "blues" to listOf(intArrayOf(0, 0, 3, 0), intArrayOf(3, 0, 4, 0)),
        "folk" to listOf(intArrayOf(0, 4, 5, 3), intArrayOf(0, 3, 4, 4)),
        "gospel" to listOf(intArrayOf(0, 3, 4, 0), intArrayOf(0, 5, 3, 4)),
        "cinematic" to listOf(intArrayOf(5, 3, 0, 4), intArrayOf(0, 5, 4, 4)),
    )

    private data class Genre(
        val bpm: Int,
        val scale: IntArray,
        val progression: String,
        val kit: String,
        val lead: String,
        val pad: String,
    )

    private val GENRES: Map<String, Genre> = linkedMapOf(
        "pop" to Genre(112, MAJOR, "pop", "acoustic", "pluck", "warm"),
        "synthwave" to Genre(108, MINOR, "sad", "electronic", "supersaw", "analog"),
        "edm" to Genre(128, MINOR, "edm", "electronic", "supersaw", "analog"),
        "house" to Genre(124, MINOR, "edm", "fourfloor", "stab", "analog"),
        "deep house" to Genre(122, DORIAN, "edm", "fourfloor", "stab", "warm"),
        "afro house" to Genre(122, DORIAN, "edm", "dembow", "pluck", "warm"),
        "techno" to Genre(132, PHRYGIAN, "trap", "fourfloor", "stab", "dark"),
        "trance" to Genre(138, MINOR, "edm", "fourfloor", "supersaw", "analog"),
        "melodic trance" to Genre(134, MINOR, "edm", "fourfloor", "supersaw", "analog"),
        "progressive house" to Genre(126, MINOR, "edm", "fourfloor", "supersaw", "analog"),
        "dnb" to Genre(174, MINOR, "edm", "breaks", "supersaw", "dark"),
        "dubstep" to Genre(140, PHRYGIAN, "trap", "electronic", "growl", "dark"),
        "trap" to Genre(142, PENTA_MINOR, "trap", "trap", "bell", "dark"),
        "drill" to Genre(144, PHRYGIAN, "trap", "trap", "bell", "dark"),
        "phonk" to Genre(130, PHRYGIAN, "trap", "trap", "bell", "dark"),
        "hip hop" to Genre(92, PENTA_MINOR, "trap", "boombap", "pluck", "warm"),
        "lo-fi" to Genre(82, DORIAN, "jazz", "boombap", "piano", "warm"),
        "jazz" to Genre(104, DORIAN, "jazz", "brushes", "piano", "warm"),
        "swing" to Genre(150, MAJOR, "jazz", "brushes", "piano", "warm"),
        "blues" to Genre(88, PENTA_MINOR, "blues", "brushes", "guitar", "warm"),
        "soul" to Genre(96, MAJOR, "gospel", "acoustic", "piano", "warm"),
        "funk" to Genre(108, DORIAN, "jazz", "acoustic", "stab", "warm"),
        "r&b" to Genre(88, MINOR, "sad", "boombap", "piano", "warm"),
        "disco polo" to Genre(128, MAJOR, "pop", "fourfloor", "supersaw", "analog"),
        "disco" to Genre(120, MAJOR, "pop", "fourfloor", "stab", "analog"),
        "reggaeton" to Genre(94, MINOR, "trap", "dembow", "stab", "warm"),
        "reggae" to Genre(76, MINOR, "pop", "acoustic", "stab", "warm"),
        "afrobeats" to Genre(104, MAJOR, "pop", "dembow", "pluck", "warm"),
        "amapiano" to Genre(112, DORIAN, "edm", "dembow", "pluck", "warm"),
        "latin" to Genre(100, MINOR, "pop", "dembow", "guitar", "warm"),
        "bossa nova" to Genre(96, DORIAN, "jazz", "brushes", "guitar", "warm"),
        "indie rock" to Genre(124, MAJOR, "pop", "rock", "guitar", "warm"),
        "rock" to Genre(132, MAJOR, "pop", "rock", "guitar", "none"),
        "punk" to Genre(168, MAJOR, "pop", "rock", "guitar", "none"),
        "metalcore" to Genre(160, PHRYGIAN, "trap", "rock", "guitar", "dark"),
        "metal" to Genre(150, PHRYGIAN, "trap", "rock", "guitar", "dark"),
        "grunge" to Genre(118, MINOR, "sad", "rock", "guitar", "none"),
        "country" to Genre(110, MAJOR, "folk", "acoustic", "guitar", "none"),
        "bluegrass" to Genre(140, MAJOR, "folk", "brushes", "pluck", "none"),
        "folk" to Genre(96, MAJOR, "folk", "brushes", "guitar", "none"),
        "gospel" to Genre(88, MAJOR, "gospel", "acoustic", "piano", "warm"),
        "classical" to Genre(84, MAJOR, "epic", "none", "strings", "strings"),
        "orchestral" to Genre(90, MINOR, "epic", "cinematic", "strings", "strings"),
        "cinematic" to Genre(86, MINOR, "cinematic", "cinematic", "strings", "strings"),
        "ambient" to Genre(68, DORIAN, "sad", "none", "bell", "analog"),
        "chillout" to Genre(92, DORIAN, "jazz", "electronic", "bell", "warm"),
        "k-pop" to Genre(120, MAJOR, "pop", "electronic", "supersaw", "analog"),
        "j-pop" to Genre(126, MAJOR, "pop", "electronic", "pluck", "analog"),
        "hyperpop" to Genre(160, MAJOR, "edm", "electronic", "supersaw", "analog"),
        "chiptune" to Genre(150, MAJOR, "pop", "electronic", "square", "none"),
        "opera" to Genre(78, MINOR, "epic", "none", "strings", "strings"),
        "musical theatre" to Genre(104, MAJOR, "epic", "acoustic", "piano", "strings"),
    )

    private data class Mood(
        val scale: IntArray? = null,
        val bpmDelta: Int = 0,
        val reverb: Float? = null,
        val bright: Float? = null,
    )

    private val MOODS: Map<String, Mood> = mapOf(
        "dark" to Mood(PHRYGIAN, -4, 0.30f, 0.80f),
        "melancholic" to Mood(MINOR, -8, 0.34f, 0.85f),
        "sad" to Mood(MINOR, -10, 0.35f, 0.80f),
        "euphoric" to Mood(MAJOR, 6, 0.26f, 1.15f),
        "epic" to Mood(null, 2, 0.40f, 1.10f),
        "aggressive" to Mood(PHRYGIAN, 10, 0.16f, 1.20f),
        "dreamy" to Mood(null, -6, 0.45f, 0.95f),
        "nostalgic" to Mood(null, -4, 0.38f, 0.90f),
        "romantic" to Mood(MAJOR, -6, 0.34f, 1.00f),
        "anthemic" to Mood(null, 4, 0.30f, 1.12f),
        "hypnotic" to Mood(null, 0, 0.32f, 0.95f),
        "triumphant" to Mood(MAJOR, 4, 0.35f, 1.15f),
        "haunting" to Mood(PHRYGIAN, -10, 0.50f, 0.80f),
        "intimate" to Mood(null, -10, 0.22f, 0.90f),
        "uplifting" to Mood(MAJOR, 5, 0.30f, 1.12f),
        "playful" to Mood(PENTA_MAJOR, 6, 0.24f, 1.10f),
        "gritty" to Mood(null, 2, 0.18f, 1.05f),
        "cold" to Mood(null, -2, 0.40f, 0.85f),
        "warm" to Mood(null, -2, 0.28f, 0.95f),
    )

    class Profile(
        var bpm: Int = 112,
        var scale: IntArray = MAJOR,
        var root: Int = 57,
        var progression: IntArray = intArrayOf(0, 5, 3, 4),
        var kit: String = "acoustic",
        var lead: String = "pluck",
        var pad: String = "warm",
        var reverb: Float = 0.30f,
        var bright: Float = 1.0f,
        var swing: Float = 0f,
        var tags: MutableList<String> = mutableListOf(),
        var vocalOctave: Int = 0,
        var instrumental: Boolean = false,
    )

    fun buildProfile(
        style: String,
        prompt: String,
        seed: Long,
        tempoBpm: Int? = null,
        weirdness: Float = 0.35f,
        instrumental: Boolean = false,
        vocalGender: String? = null,
    ): Profile {
        val random = Random(seed)
        val text = ("$style $prompt").lowercase()
        val profile = Profile(instrumental = instrumental)

        // Longest genre name first so "deep house" beats "house" and "melodic trance"
        // beats "trance".
        val matchedName = GENRES.keys.sortedByDescending { it.length }.firstOrNull { text.contains(it) } ?: "pop"
        val genre = GENRES.getValue(matchedName)
        profile.bpm = genre.bpm
        profile.scale = genre.scale
        profile.kit = genre.kit
        profile.lead = genre.lead
        profile.pad = genre.pad
        val pool = PROGRESSIONS.getValue(genre.progression)
        profile.progression = pool[random.nextInt(pool.size)]
        profile.tags.add(matchedName)

        for ((name, mood) in MOODS) {
            if (!text.contains(name)) continue
            profile.tags.add(name)
            mood.scale?.let { profile.scale = it }
            profile.bpm += mood.bpmDelta
            mood.reverb?.let { profile.reverb = it }
            mood.bright?.let { profile.bright = it }
        }

        tempoBpm?.let { profile.bpm = it }
        profile.bpm = profile.bpm.coerceIn(48, 200)

        if (matchedName in setOf("jazz", "swing", "blues", "lo-fi", "bossa nova")) profile.swing = 0.22f

        profile.root = 52 + random.nextInt(12)
        if (weirdness > 0.6f) {
            profile.progression = IntArray(4) { random.nextInt(6) }
        }
        profile.reverb = (profile.reverb + (weirdness - 0.35f) * 0.2f).coerceIn(0.08f, 0.55f)

        profile.vocalOctave = when (vocalGender) {
            "male" -> -1
            else -> 0
        }

        for (token in style.lowercase().split(",", ";", "/").map { it.trim() }) {
            if (token.isNotEmpty() && token !in profile.tags && profile.tags.size < 8) {
                profile.tags.add(token)
            }
        }
        return profile
    }

    fun chordNotes(profile: Profile, degree: Int, extended: Boolean): IntArray {
        val scale = profile.scale
        val picks = if (extended) intArrayOf(0, 2, 4, 6) else intArrayOf(0, 2, 4)
        return IntArray(picks.size) { i ->
            val index = degree + picks[i]
            val octave = Math.floorDiv(index, scale.size)
            profile.root + scale[Math.floorMod(index, scale.size)] + 12 * octave
        }
    }

    fun scaleNote(profile: Profile, step: Int): Int {
        val scale = profile.scale
        val octave = Math.floorDiv(step, scale.size)
        return profile.root + scale[Math.floorMod(step, scale.size)] + 12 * octave
    }

    // ------------------------------------------------------------------ sections

    data class Section(val name: String, val bars: Int, val startBar: Int, val energy: Float)

    private val LONG = listOf(
        "intro" to 8, "verse" to 16, "pre" to 8, "chorus" to 16,
        "verse" to 16, "pre" to 8, "chorus" to 16, "bridge" to 8,
        "chorus" to 16, "outro" to 8,
    )
    private val MID = listOf(
        "intro" to 4, "verse" to 16, "chorus" to 16, "verse" to 16, "chorus" to 16, "outro" to 8,
    )
    private val SHORT = listOf("intro" to 4, "verse" to 8, "chorus" to 16, "outro" to 4)

    private val ENERGY = mapOf(
        "intro" to 0.35f, "verse" to 0.60f, "pre" to 0.72f,
        "chorus" to 1.0f, "bridge" to 0.55f, "outro" to 0.40f,
    )

    fun planSections(durationSeconds: Int, profile: Profile): List<Section> {
        val secondsPerBar = 4 * 60.0 / profile.bpm
        val targetBars = Math.max(8, Math.round(durationSeconds / secondsPerBar).toInt())
        val template = when {
            targetBars >= 72 -> LONG
            targetBars >= 40 -> MID
            else -> SHORT
        }
        val totalTemplate = template.sumOf { it.second }
        val factor = targetBars.toDouble() / totalTemplate
        val out = mutableListOf<Section>()
        var cursor = 0
        for ((name, bars) in template) {
            val scaled = Math.max(2, (Math.round(bars * factor / 2.0) * 2).toInt())
            out.add(Section(name, scaled, cursor, ENERGY[name] ?: 0.6f))
            cursor += scaled
        }
        return out
    }

    // -------------------------------------------------------------------- lyrics

    private val TAG_RE = Regex("^\\[([^\\]]+)\\]")
    private val WORD_RE = Regex("[\\p{L}']+")
    private val VOWEL_RE = Regex("[aeiouyąęó]+", RegexOption.IGNORE_CASE)

    fun parseLyricSections(lyrics: String): Map<String, List<String>> {
        val blocks = LinkedHashMap<String, MutableList<String>>()
        var current = "verse"
        for (raw in lyrics.lines()) {
            val line = raw.trim()
            if (line.isEmpty()) continue
            val tag = TAG_RE.find(line)
            if (tag != null) {
                val label = tag.groupValues[1].lowercase()
                current = when {
                    label.contains("chorus") || label.contains("hook") || label.contains("drop") -> "chorus"
                    label.contains("pre") -> "pre"
                    label.contains("bridge") -> "bridge"
                    label.contains("intro") -> "intro"
                    label.contains("outro") -> "outro"
                    else -> "verse"
                }
                blocks.getOrPut(current) { mutableListOf() }
                val rest = line.substring(tag.value.length).trim()
                if (rest.isNotEmpty()) blocks.getValue(current).add(rest)
                continue
            }
            blocks.getOrPut(current) { mutableListOf() }.add(line)
        }
        return blocks
    }

    /** Rough syllable nuclei: enough to drive one sung note per syllable. */
    fun syllables(line: String): List<String> {
        val out = mutableListOf<String>()
        for (word in WORD_RE.findAll(line).map { it.value }) {
            val found = VOWEL_RE.findAll(word).map { it.value.first().lowercaseChar().toString() }.toList()
            if (found.isEmpty()) out.add("a") else out.addAll(found)
            if (out.size >= 48) break
        }
        return out.take(48)
    }

    private val FORMANTS = mapOf(
        "a" to Triple(730f, 1090f, 2440f),
        "e" to Triple(530f, 1840f, 2480f),
        "i" to Triple(270f, 2290f, 3010f),
        "o" to Triple(570f, 840f, 2410f),
        "u" to Triple(300f, 870f, 2240f),
        "y" to Triple(440f, 1020f, 2240f),
        "ą" to Triple(690f, 1100f, 2400f),
        "ę" to Triple(560f, 1700f, 2450f),
        "ó" to Triple(330f, 880f, 2250f),
    )

    /**
     * Formant singing voice: a glottal-style harmonic source shaped by three
     * resonances, with vibrato and a short pitch scoop into each note.
     */
    fun sing(noteHz: Float, length: Int, vowel: String, bright: Float): FloatArray {
        val source = FloatArray(length)
        var phase = 0f
        val breath = Dsp.noise(length, (noteHz.toInt() % 997))
        for (i in 0 until length) {
            val t = i.toFloat() / Dsp.SR
            val vibrato = 1f + 0.012f * sin(2f * PI.toFloat() * 4.5f * t) * minOf(1f, t * 3f)
            val scoop = 1f + 0.03f * exp(-14f * t)
            phase += 2f * PI.toFloat() * noteHz * vibrato * scoop / Dsp.SR
            source[i] = (
                sin(phase) + 0.5f * sin(2 * phase) + 0.33f * sin(3 * phase) +
                    0.22f * sin(4 * phase) + 0.15f * sin(5 * phase)
                ) + breath[i] * 0.12f
        }
        val (f1, f2, f3) = FORMANTS[vowel] ?: FORMANTS.getValue("a")
        val a = Biquad.bandpass(f1 * bright, 4f).process(source)
        val b = Biquad.bandpass(f2 * bright, 6f).process(source)
        val c = Biquad.bandpass(f3 * bright, 8f).process(source)
        val env = Dsp.adsr(length, 0.035f, 0.09f, 0.78f, 0.14f)
        return FloatArray(length) { (a[it] + b[it] * 0.55f + c[it] * 0.28f) * env[it] }
    }

    fun titleFrom(prompt: String, lyrics: String, seed: Long): String {
        for (line in lyrics.lines()) {
            val clean = line.replace(Regex("^\\[[^\\]]*\\]\\s*"), "").trim(' ', ',', '.', '-', '!', '?')
            if (clean.length in 8..44) {
                return clean.split(" ").joinToString(" ") { word ->
                    word.replaceFirstChar { it.uppercaseChar() }
                }
            }
        }
        val words = Regex("[\\p{L}]{4,}").findAll(prompt).map { it.value }.take(3).toList()
        if (words.isNotEmpty()) {
            return words.joinToString(" ") { it.replaceFirstChar { c -> c.uppercaseChar() } }
        }
        val random = Random(seed)
        val left = listOf("Neon", "Midnight", "Paper", "Glass", "Velvet", "Static", "Golden", "Hollow", "Silver", "Wild")
        val right = listOf("Hours", "Signal", "Avenue", "Echoes", "Daylight", "Machines", "Weather", "Mirrors", "Rivers", "Fever")
        return "${left[random.nextInt(left.size)]} ${right[random.nextInt(right.size)]}"
    }
}
