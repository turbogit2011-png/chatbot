package com.pulse.studio.audio

import kotlin.math.max
import kotlin.math.min

/**
 * Everything the visual engine needs to know about a track.
 *
 * Frame-rate data is stored on the analysis grid (about 86 frames per second) and
 * sampled by time, so the visuals stay in step whatever frame rate the video uses.
 */
data class AudioFeatures(
    val durationSeconds: Float,
    val sampleRate: Int,
    val framesPerSecond: Float,
    /** Overall loudness per frame, normalised to 0..1. */
    val level: FloatArray,
    /** Eight log-spaced band energies per frame, each normalised to 0..1. */
    val bands: Array<FloatArray>,
    /**
     * A finer log-spaced spectrum for anything that draws bars or spokes.
     * Stored as bytes because a ten-minute track would otherwise cost tens of
     * megabytes on a phone; the accessor hands back 0..1 floats.
     */
    val fineBands: Array<ByteArray>,
    /** Half-wave rectified spectral flux, normalised to 0..1. */
    val onset: FloatArray,
    /** Beat times in seconds. */
    val beats: FloatArray,
    /** Beat times that start a bar. */
    val downbeats: FloatArray,
    val tempo: Float,
    /** Section boundaries in seconds, always starting at 0. */
    val sections: FloatArray,
    /** Loudest moments, useful for drops and accents. */
    val peaks: FloatArray,
    val title: String = "",
) {
    val bandCount: Int get() = bands.size
    val fineBandCount: Int get() = fineBands.size

    private fun frameAt(seconds: Float): Int =
        (seconds * framesPerSecond).toInt().coerceIn(0, max(0, level.size - 1))

    fun levelAt(seconds: Float): Float = if (level.isEmpty()) 0f else level[frameAt(seconds)]

    fun onsetAt(seconds: Float): Float = if (onset.isEmpty()) 0f else onset[frameAt(seconds)]

    /** One bar of the fine spectrum, 0..1. */
    fun fineAt(band: Int, seconds: Float): Float {
        if (fineBands.isEmpty()) return 0f
        val row = fineBands[band.coerceIn(0, fineBands.size - 1)]
        if (row.isEmpty()) return 0f
        return (row[frameAt(seconds)].toInt() and 0xFF) / 255f
    }

    /**
     * Samples the fine spectrum at a fractional position across the whole range,
     * which is what bar and spoke layouts actually want.
     */
    fun spectrumAt(position: Float, seconds: Float): Float {
        if (fineBands.isEmpty()) return 0f
        val scaled = position.coerceIn(0f, 1f) * (fineBands.size - 1)
        val lower = scaled.toInt()
        val upper = (lower + 1).coerceAtMost(fineBands.size - 1)
        val blend = scaled - lower
        return fineAt(lower, seconds) * (1f - blend) + fineAt(upper, seconds) * blend
    }

    fun bandAt(band: Int, seconds: Float): Float {
        if (bands.isEmpty()) return 0f
        val row = bands[band.coerceIn(0, bands.size - 1)]
        return if (row.isEmpty()) 0f else row[frameAt(seconds)]
    }

    /** Low / mid / high summary, handy for most visual styles. */
    fun bass(seconds: Float): Float = (bandAt(0, seconds) + bandAt(1, seconds)) * 0.5f
    fun mid(seconds: Float): Float = (bandAt(3, seconds) + bandAt(4, seconds)) * 0.5f
    fun treble(seconds: Float): Float = (bandAt(6, seconds) + bandAt(7, seconds)) * 0.5f

    /** 1 right on a beat, decaying to 0 before the next one. */
    fun beatPulse(seconds: Float, decay: Float = 6f): Float {
        val since = secondsSinceBeat(seconds) ?: return 0f
        return kotlin.math.exp(-decay * since)
    }

    fun secondsSinceBeat(seconds: Float): Float? {
        if (beats.isEmpty()) return null
        var low = 0
        var high = beats.size - 1
        var best = -1
        while (low <= high) {
            val mid = (low + high) / 2
            if (beats[mid] <= seconds) {
                best = mid
                low = mid + 1
            } else {
                high = mid - 1
            }
        }
        if (best < 0) return null
        return seconds - beats[best]
    }

    /** Index of the beat the given time falls on. */
    fun beatIndex(seconds: Float): Int {
        if (beats.isEmpty()) return 0
        var low = 0
        var high = beats.size - 1
        var best = 0
        while (low <= high) {
            val mid = (low + high) / 2
            if (beats[mid] <= seconds) {
                best = mid
                low = mid + 1
            } else {
                high = mid - 1
            }
        }
        return best
    }

    fun sectionIndex(seconds: Float): Int {
        var index = 0
        for (i in sections.indices) {
            if (sections[i] <= seconds) index = i else break
        }
        return index
    }

    /** Progress through the track, 0..1. */
    fun progress(seconds: Float): Float =
        if (durationSeconds <= 0f) 0f else (seconds / durationSeconds).coerceIn(0f, 1f)

    override fun equals(other: Any?): Boolean = this === other
    override fun hashCode(): Int = System.identityHashCode(this)

    companion object {
        /**
         * Plausible synthetic features, used to draw style previews in the picker
         * before any track has been chosen. Cheap enough to build on the main thread.
         */
        fun demo(seconds: Float = 16f, tempo: Float = 124f, seed: Int = 3): AudioFeatures {
            val fps = 86f
            val frames = (seconds * fps).toInt().coerceAtLeast(2)
            val random = kotlin.random.Random(seed)
            fun curve(speed: Float, floor: Float): FloatArray = FloatArray(frames) { i ->
                val t = i / fps
                val value = 0.5f + 0.5f * kotlin.math.sin(t * speed + random.nextFloat() * 0.001f)
                (floor + (1f - floor) * value).coerceIn(0f, 1f)
            }
            val beatPeriod = 60f / tempo
            val beats = FloatArray((seconds / beatPeriod).toInt().coerceAtLeast(1)) { it * beatPeriod }
            val onset = FloatArray(frames) { i ->
                val sinceBeat = (i / fps) % beatPeriod
                kotlin.math.exp(-18f * sinceBeat)
            }
            val fine = Array(48) { band ->
                val tilt = 1f - band / 60f
                ByteArray(frames) { i ->
                    val t = i / fps
                    val wobble = 0.5f + 0.5f * kotlin.math.sin(t * (1.2f + band * 0.21f) + band)
                    val pulse = kotlin.math.exp(-9f * ((i / fps) % beatPeriod)) * (1f - band / 80f)
                    (((wobble * 0.55f + pulse * 0.5f) * tilt * 255f)).toInt().coerceIn(0, 255).toByte()
                }
            }
            return AudioFeatures(
                durationSeconds = seconds,
                sampleRate = 44100,
                framesPerSecond = fps,
                level = curve(2.1f, 0.35f),
                bands = Array(8) { band -> curve(1.1f + band * 0.4f, 0.2f) },
                fineBands = fine,
                onset = onset,
                beats = beats,
                downbeats = FloatArray(beats.size / 4 + 1) { it * beatPeriod * 4 },
                tempo = tempo,
                sections = floatArrayOf(0f),
                peaks = FloatArray(0),
                title = "Preview",
            )
        }

        fun empty(duration: Float = 0f) = AudioFeatures(
            durationSeconds = duration,
            sampleRate = 44100,
            framesPerSecond = 86f,
            level = FloatArray(0),
            bands = Array(8) { FloatArray(0) },
            fineBands = Array(48) { ByteArray(0) },
            onset = FloatArray(0),
            beats = FloatArray(0),
            downbeats = FloatArray(0),
            tempo = 120f,
            sections = floatArrayOf(0f),
            peaks = FloatArray(0),
        )
    }
}
