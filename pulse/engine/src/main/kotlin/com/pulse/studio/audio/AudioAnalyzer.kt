package com.pulse.studio.audio

import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

/**
 * Turns raw audio into everything the visuals need: loudness, eight frequency bands,
 * an onset envelope, tempo, a beat grid, section boundaries and accent points.
 *
 * Pure Kotlin on purpose — no Android types — so the whole analysis can be measured
 * on the JVM against real files.
 */
object AudioAnalyzer {

    const val FFT_SIZE = 2048
    const val HOP = 512
    const val BAND_COUNT = 8
    const val FINE_BAND_COUNT = 48

    private val BAND_EDGES = floatArrayOf(20f, 60f, 150f, 350f, 800f, 1800f, 3800f, 8000f, 16000f)

    fun analyze(
        mono: FloatArray,
        sampleRate: Int,
        title: String = "",
        onProgress: (Float) -> Unit = {},
    ): AudioFeatures {
        if (mono.isEmpty()) return AudioFeatures.empty()

        val fft = Fft(FFT_SIZE)
        val window = Fft.hann(FFT_SIZE)
        val frameCount = max(1, (mono.size - FFT_SIZE) / HOP + 1)
        val framesPerSecond = sampleRate.toFloat() / HOP
        val spectrum = FloatArray(FFT_SIZE / 2 + 1)
        var previous = FloatArray(FFT_SIZE / 2 + 1)

        val level = FloatArray(frameCount)
        val onset = FloatArray(frameCount)
        val bands = Array(BAND_COUNT) { FloatArray(frameCount) }
        val fine = Array(FINE_BAND_COUNT) { FloatArray(frameCount) }
        val binHz = sampleRate.toFloat() / FFT_SIZE
        val bandRanges = Array(BAND_COUNT) { band ->
            val lo = (BAND_EDGES[band] / binHz).toInt().coerceIn(1, FFT_SIZE / 2)
            val hi = (BAND_EDGES[band + 1] / binHz).toInt().coerceIn(lo + 1, FFT_SIZE / 2)
            lo..hi
        }
        // log-spaced edges from 35 Hz to 15 kHz for the fine spectrum
        val fineRanges = Array(FINE_BAND_COUNT) { band ->
            val lowHz = 35f * Math.pow(15000.0 / 35.0, band.toDouble() / FINE_BAND_COUNT).toFloat()
            val highHz = 35f * Math.pow(15000.0 / 35.0, (band + 1.0) / FINE_BAND_COUNT).toFloat()
            val lo = (lowHz / binHz).toInt().coerceIn(1, FFT_SIZE / 2 - 1)
            val hi = (highHz / binHz).toInt().coerceIn(lo + 1, FFT_SIZE / 2)
            lo..hi
        }

        for (frame in 0 until frameCount) {
            fft.magnitudes(mono, frame * HOP, window, spectrum)

            var flux = 0f
            for (bin in 1 until spectrum.size) {
                val diff = spectrum[bin] - previous[bin]
                if (diff > 0f) flux += diff
            }
            onset[frame] = flux

            var total = 0f
            for (band in 0 until BAND_COUNT) {
                var sum = 0f
                val range = bandRanges[band]
                for (bin in range) sum += spectrum[bin] * spectrum[bin]
                val energy = sqrt(sum / max(1, range.last - range.first + 1))
                bands[band][frame] = ln(1f + energy * 40f)
                total += energy
            }
            level[frame] = ln(1f + total * 6f)

            for (band in 0 until FINE_BAND_COUNT) {
                var sum = 0f
                val range = fineRanges[band]
                for (bin in range) sum += spectrum[bin] * spectrum[bin]
                val energy = sqrt(sum / max(1, range.last - range.first + 1))
                fine[band][frame] = ln(1f + energy * 40f)
            }

            val swap = previous
            previous = spectrum.copyInto(swap)
            if (frame % 512 == 0) onProgress(0.6f * frame / frameCount)
        }

        normalise(level)
        normaliseBands(bands)
        normaliseBands(fine)
        // A natural spectrum falls away with frequency, so without a tilt the top
        // two thirds of any bar display would barely move. This lifts the high end
        // towards the same working range as the low end.
        tilt(fine)
        normalise(onset)
        smooth(level, 3)

        onProgress(0.7f)
        val tempo = estimateTempo(onset, framesPerSecond)
        val beats = trackBeats(onset, framesPerSecond, tempo)
        val downbeats = findDownbeats(beats, onset, framesPerSecond)
        onProgress(0.85f)
        val sections = findSections(bands, level, framesPerSecond, downbeats)
        val peaks = findPeaks(onset, framesPerSecond)
        onProgress(1f)

        return AudioFeatures(
            durationSeconds = mono.size.toFloat() / sampleRate,
            sampleRate = sampleRate,
            framesPerSecond = framesPerSecond,
            level = level,
            bands = bands,
            fineBands = Array(FINE_BAND_COUNT) { band ->
                ByteArray(frameCount) { frame -> (fine[band][frame] * 255f).toInt().coerceIn(0, 255).toByte() }
            },
            onset = onset,
            beats = beats,
            downbeats = downbeats,
            tempo = tempo,
            sections = sections,
            peaks = peaks,
            title = title,
        )
    }

    // ------------------------------------------------------------------ helpers

    /**
     * Scales to 0..1 against a high percentile rather than the maximum, so one loud
     * transient cannot flatten the whole curve.
     */
    private fun normalise(values: FloatArray) {
        if (values.isEmpty()) return
        val sorted = values.copyOf()
        sorted.sort()
        val reference = sorted[(sorted.size * 0.98f).toInt().coerceAtMost(sorted.size - 1)]
        val floor = sorted[(sorted.size * 0.05f).toInt()]
        val span = max(1e-6f, reference - floor)
        for (i in values.indices) {
            values[i] = ((values[i] - floor) / span).coerceIn(0f, 1f)
        }
    }

    /**
     * Bands share one reference level so a bass-heavy track still reads as bass-heavy —
     * normalising each band on its own would make a pure 60 Hz tone look like hi-hats.
     * A capped per-band makeup afterwards keeps quiet high bands visible without
     * inventing energy that is not there.
     */
    private fun normaliseBands(bands: Array<FloatArray>) {
        if (bands.isEmpty() || bands[0].isEmpty()) return
        val everything = FloatArray(bands.sumOf { it.size })
        var cursor = 0
        for (band in bands) {
            band.copyInto(everything, cursor)
            cursor += band.size
        }
        everything.sort()
        val reference = everything[(everything.size * 0.99f).toInt().coerceAtMost(everything.size - 1)]
        val floor = everything[(everything.size * 0.20f).toInt()]
        val span = max(1e-4f, reference - floor)
        for (band in bands) {
            for (i in band.indices) band[i] = ((band[i] - floor) / span).coerceIn(0f, 1f)
        }
        for (band in bands) {
            val sorted = band.copyOf()
            sorted.sort()
            val loud = sorted[(sorted.size * 0.98f).toInt().coerceAtMost(sorted.size - 1)]
            if (loud > 0.02f && loud < 0.45f) {
                val gain = min(3f, 0.6f / loud)
                for (i in band.indices) band[i] = (band[i] * gain).coerceIn(0f, 1f)
            }
        }
    }

    /**
     * Gives every band a similar working range by normalising each against its own
     * loud percentile, bounded so a near-silent band is not amplified into noise.
     */
    private fun tilt(bands: Array<FloatArray>) {
        for (band in bands) {
            if (band.isEmpty()) continue
            val sorted = band.copyOf()
            sorted.sort()
            val loud = sorted[(sorted.size * 0.95f).toInt().coerceAtMost(sorted.size - 1)]
            if (loud < 0.01f) continue
            val gain = min(6f, 0.78f / loud)
            if (gain <= 1.02f) continue
            for (i in band.indices) band[i] = (band[i] * gain).coerceIn(0f, 1f)
        }
    }

    private fun smooth(values: FloatArray, radius: Int) {
        if (values.size < radius * 2 + 1) return
        val copy = values.copyOf()
        for (i in values.indices) {
            var sum = 0f
            var count = 0
            for (k in -radius..radius) {
                val index = i + k
                if (index in copy.indices) {
                    sum += copy[index]
                    count++
                }
            }
            values[i] = sum / count
        }
    }

    /**
     * Tempo by autocorrelating the onset envelope, then checking octave errors:
     * a lag only wins if it beats its own half and double.
     */
    fun estimateTempo(onset: FloatArray, framesPerSecond: Float): Float {
        if (onset.size < 64) return 120f
        val mean = onset.average().toFloat()
        val centred = FloatArray(onset.size) { onset[it] - mean }

        val minLag = (framesPerSecond * 60f / 200f).toInt().coerceAtLeast(2)
        val maxLag = (framesPerSecond * 60f / 55f).toInt().coerceAtMost(centred.size / 2)
        if (maxLag <= minLag) return 120f

        val scores = FloatArray(maxLag + 1)
        for (lag in minLag..maxLag) {
            var sum = 0f
            var i = lag
            while (i < centred.size) {
                sum += centred[i] * centred[i - lag]
                i++
            }
            scores[lag] = sum / (centred.size - lag)
        }

        var bestLag = minLag
        var bestScore = Float.NEGATIVE_INFINITY
        for (lag in minLag..maxLag) {
            // Reward lags whose multiples also line up — that is what separates a real
            // beat period from one of its harmonics.
            var score = scores[lag]
            val double = lag * 2
            val half = lag / 2
            if (double <= maxLag) score += 0.5f * scores[double]
            if (half >= minLag) score += 0.5f * scores[half]
            if (score > bestScore) {
                bestScore = score
                bestLag = lag
            }
        }

        // Parabolic refinement around the winning lag.
        val refined = if (bestLag in (minLag + 1) until maxLag) {
            val a = scores[bestLag - 1]
            val b = scores[bestLag]
            val c = scores[bestLag + 1]
            val denominator = a - 2 * b + c
            if (abs(denominator) < 1e-9f) bestLag.toFloat()
            else bestLag + 0.5f * (a - c) / denominator
        } else {
            bestLag.toFloat()
        }

        var bpm = 60f * framesPerSecond / refined
        while (bpm < 70f) bpm *= 2f
        while (bpm > 180f) bpm /= 2f
        return bpm
    }

    /**
     * Places a beat grid at the detected tempo, picking the phase that collects the
     * most onset energy, then lets each beat snap to a nearby onset peak so the grid
     * follows small tempo drift instead of sliding out of time.
     */
    fun trackBeats(onset: FloatArray, framesPerSecond: Float, tempo: Float): FloatArray {
        if (onset.isEmpty()) return FloatArray(0)
        val period = framesPerSecond * 60f / tempo
        if (period < 2f) return FloatArray(0)

        var bestOffset = 0f
        var bestScore = Float.NEGATIVE_INFINITY
        var offset = 0f
        while (offset < period) {
            var score = 0f
            var position = offset
            while (position < onset.size) {
                score += onset[position.toInt()]
                position += period
            }
            if (score > bestScore) {
                bestScore = score
                bestOffset = offset
            }
            offset += 1f
        }

        val window = max(1, (period * 0.12f).toInt())
        val beats = ArrayList<Float>((onset.size / period).toInt() + 2)
        var expected = bestOffset
        while (expected < onset.size) {
            val centre = expected.roundToInt()
            var bestFrame = centre
            var bestValue = Float.NEGATIVE_INFINITY
            for (frame in (centre - window)..(centre + window)) {
                if (frame !in onset.indices) continue
                if (onset[frame] > bestValue) {
                    bestValue = onset[frame]
                    bestFrame = frame
                }
            }
            beats.add(bestFrame / framesPerSecond)
            // Follow the music, but never let one strong off-beat drag the grid away.
            expected = (bestFrame + period) * 0.35f + (expected + period) * 0.65f
        }
        return beats.toFloatArray()
    }

    private fun findDownbeats(beats: FloatArray, onset: FloatArray, framesPerSecond: Float): FloatArray {
        if (beats.size < 4) return beats.copyOf()
        var bestPhase = 0
        var bestScore = Float.NEGATIVE_INFINITY
        for (phase in 0 until 4) {
            var score = 0f
            var index = phase
            while (index < beats.size) {
                val frame = (beats[index] * framesPerSecond).toInt()
                if (frame in onset.indices) score += onset[frame]
                index += 4
            }
            if (score > bestScore) {
                bestScore = score
                bestPhase = phase
            }
        }
        val out = ArrayList<Float>(beats.size / 4 + 1)
        var index = bestPhase
        while (index < beats.size) {
            out.add(beats[index])
            index += 4
        }
        return out.toFloatArray()
    }

    /**
     * Sections come from spectral novelty: how different the average spectrum of the
     * next few seconds is from the last few. Boundaries snap to the nearest downbeat
     * so scene changes land on the music rather than between beats.
     */
    private fun findSections(
        bands: Array<FloatArray>,
        level: FloatArray,
        framesPerSecond: Float,
        downbeats: FloatArray,
    ): FloatArray {
        val frames = level.size
        val windowFrames = (framesPerSecond * 3f).toInt().coerceAtLeast(8)
        if (frames < windowFrames * 3) return floatArrayOf(0f)

        val novelty = FloatArray(frames)
        for (frame in windowFrames until frames - windowFrames) {
            var distance = 0f
            for (band in bands.indices) {
                var before = 0f
                var after = 0f
                for (k in 1..windowFrames) {
                    before += bands[band][frame - k]
                    after += bands[band][frame + k]
                }
                distance += abs(after - before) / windowFrames
            }
            novelty[frame] = distance
        }
        normalise(novelty)
        smooth(novelty, (framesPerSecond * 0.5f).toInt().coerceAtLeast(1))

        val minGapFrames = (framesPerSecond * 12f).toInt()
        val boundaries = ArrayList<Float>()
        boundaries.add(0f)
        var frame = windowFrames
        while (frame < frames - windowFrames) {
            if (novelty[frame] > 0.55f) {
                var peak = frame
                var limit = min(frames - windowFrames - 1, frame + minGapFrames / 2)
                for (candidate in frame..limit) {
                    if (novelty[candidate] > novelty[peak]) peak = candidate
                }
                val seconds = peak / framesPerSecond
                val snapped = downbeats.minByOrNull { abs(it - seconds) } ?: seconds
                val chosen = if (abs(snapped - seconds) < 1.2f) snapped else seconds
                if (boundaries.none { abs(it - chosen) < 10f }) boundaries.add(chosen)
                frame = peak + minGapFrames
            } else {
                frame++
            }
        }
        boundaries.sort()
        return boundaries.toFloatArray()
    }

    private fun findPeaks(onset: FloatArray, framesPerSecond: Float): FloatArray {
        if (onset.isEmpty()) return FloatArray(0)
        val minGap = (framesPerSecond * 4f).toInt().coerceAtLeast(1)
        val candidates = onset.indices.sortedByDescending { onset[it] }
        val chosen = ArrayList<Int>()
        for (frame in candidates) {
            if (onset[frame] < 0.7f) break
            if (chosen.none { abs(it - frame) < minGap }) chosen.add(frame)
            if (chosen.size >= 24) break
        }
        chosen.sort()
        return FloatArray(chosen.size) { chosen[it] / framesPerSecond }
    }
}
