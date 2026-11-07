package com.sonara.studio.engine

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/** Single-tap delay line used for stereo widening; keeps state across blocks. */
class DelayLine(samples: Int) {
    private val line = FloatArray(max(1, samples))
    private var index = 0

    fun step(x: Float): Float {
        val out = line[index]
        line[index] = x
        index++
        if (index >= line.size) index = 0
        return out
    }
}

/**
 * The mix and master chain, held as state so a song rendered block by block sounds
 * exactly like one rendered in a single pass.
 *
 * Levels come from the composer's per-bus gain estimate rather than from normalising
 * a finished buffer — a streaming renderer never has the whole track to look at.
 */
class Chains(
    private val profile: Music.Profile,
    private val hasVocals: Boolean,
    private val busGain: FloatArray,
) {
    private val drumsEq = Biquad.peak(5200f, 0.8f, 2.5f)
    private val drumsComp = Compressor(0.40f, 3.0f, 8f, 140f)

    private val bassHp = Biquad.highpass(38f, 0.7f)
    private val bassLp = Biquad.lowpass(2600f)
    private val bassBody = Biquad.peak(130f, 0.8f, 3.0f)
    private val bassComp = Compressor(0.30f, 4.0f, 12f, 160f)

    private val harmonyHp = Biquad.highpass(180f)
    private val harmonyEq = Biquad.peak(2600f, 0.9f, 2.0f)
    private val harmonyVerb = Reverb(0.6f, profile.reverb * 0.9f)

    private val leadHp = Biquad.highpass(220f)
    private val leadVerb = Reverb(0.5f, profile.reverb * 0.7f)

    private val vocalHp = Biquad.highpass(120f)
    private val vocalPresence = Biquad.peak(3200f, 0.9f, 4.0f)
    private val vocalAir = Biquad.peak(8000f, 0.8f, 2.5f)
    private val vocalComp = Compressor(0.22f, 4.5f, 6f, 120f)
    private val vocalVerb = Reverb(0.45f, min(0.32f, profile.reverb))

    private val masterHp = Biquad.highpass(32f, 0.7f)
    private val masterSub = Biquad.peak(60f, 0.7f, 1.5f)
    private val masterBody = Biquad.peak(150f, 0.55f, 1.5f)
    private val masterMid = Biquad.peak(2800f, 0.7f, 0.5f)
    private val masterAir = Biquad.peak(9000f, 0.55f, 7.0f)
    private val masterTop = Biquad.peak(14000f, 0.6f, 6.0f)
    private val masterComp = Compressor(0.42f, 2.6f, 14f, 180f)

    private val haas = DelayLine((Dsp.SR * 0.011f).toInt())
    private var duckEnvelope = 0f
    private var mono = FloatArray(0)

    fun process(
        buses: Array<FloatArray>,
        span: Int,
        stereoOut: FloatArray,
        position: Int,
        fadeOutStart: Int,
        totalSamples: Int,
    ) {
        if (mono.size < span) mono = FloatArray(span)

        val drums = buses[0]
        val bass = buses[1]
        val harmony = buses[2]
        val lead = buses[3]
        val vocals = buses[4]

        applyGain(drums, span, busGain[0])
        drumsComp.processInPlace(drums, 0, span)
        drumsEq.processInPlace(drums, 0, span)

        applyGain(bass, span, busGain[1])
        bassHp.processInPlace(bass, 0, span)
        bassLp.processInPlace(bass, 0, span)
        bassBody.processInPlace(bass, 0, span)
        bassComp.processInPlace(bass, 0, span)

        applyGain(harmony, span, busGain[2])
        harmonyHp.processInPlace(harmony, 0, span)
        harmonyEq.processInPlace(harmony, 0, span)
        harmonyVerb.processInPlace(harmony, 0, span)

        applyGain(lead, span, busGain[3])
        leadHp.processInPlace(lead, 0, span)
        leadVerb.processInPlace(lead, 0, span)

        if (hasVocals) {
            applyGain(vocals, span, busGain[4])
            vocalHp.processInPlace(vocals, 0, span)
            vocalPresence.processInPlace(vocals, 0, span)
            vocalAir.processInPlace(vocals, 0, span)
            vocalComp.processInPlace(vocals, 0, span)
            vocalVerb.processInPlace(vocals, 0, span)
        }

        val fadeInSamples = (Dsp.SR * 0.05f).toInt()
        val fadeOutSamples = max(1, totalSamples - fadeOutStart)

        for (i in 0 until span) {
            var value = drums[i] * 0.92f + bass[i] * 0.80f + lead[i] * 0.62f
            var harmonyValue = harmony[i] * 0.80f
            if (hasVocals) {
                // Gentle ducking so the vocal always sits on top of the music.
                val level = abs(vocals[i])
                duckEnvelope = if (level > duckEnvelope) {
                    0.002f * duckEnvelope + 0.998f * level
                } else {
                    0.9995f * duckEnvelope
                }
                val duck = 1f - 0.22f * min(1f, duckEnvelope * 2.2f)
                harmonyValue *= duck
                value = value * (0.82f + 0.18f * duck) + vocals[i] * 1.0f
            }
            mono[i] = value + harmonyValue
        }

        masterHp.processInPlace(mono, 0, span)
        masterSub.processInPlace(mono, 0, span)
        masterBody.processInPlace(mono, 0, span)
        masterMid.processInPlace(mono, 0, span)
        masterAir.processInPlace(mono, 0, span)
        masterTop.processInPlace(mono, 0, span)
        masterComp.processInPlace(mono, 0, span)

        for (i in 0 until span) {
            val absolute = position + i
            var gain = 1f
            if (absolute < fadeInSamples) gain *= absolute.toFloat() / fadeInSamples
            if (absolute >= fadeOutStart) {
                gain *= (1f - (absolute - fadeOutStart).toFloat() / fadeOutSamples).coerceIn(0f, 1f)
            }
            val value = mono[i] * MASTER_TRIM * gain
            val delayed = haas.step(value)
            val mid = (value + delayed) * 0.5f
            val side = (value - delayed) * 0.5f * 0.45f
            stereoOut[i * 2] = Dsp.softLimit(mid + side, CEILING)
            stereoOut[i * 2 + 1] = Dsp.softLimit(mid - side, CEILING)
        }
    }

    private fun applyGain(buffer: FloatArray, span: Int, gain: Float) {
        if (gain == 1f) return
        for (i in 0 until span) buffer[i] *= gain
    }

    private companion object {
        /** Drives the limiter for a competitive level while leaving true-peak headroom. */
        const val MASTER_TRIM = 1.45f
        const val CEILING = 0.89f
    }
}
