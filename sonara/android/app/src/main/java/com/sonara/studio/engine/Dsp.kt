package com.sonara.studio.engine

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.tanh
import kotlin.random.Random

/**
 * Pure-Kotlin DSP toolbox for the on-device engine.
 *
 * Nothing here touches the Android framework, so the whole renderer can also run on a
 * plain JVM — which is how it is unit tested. Every filter that spans chunk boundaries
 * is a stateful object rather than a function, because the composer renders a long song
 * in short blocks and must not restart its filters at every block.
 */
object Dsp {

    const val SR = 44100

    fun midiToHz(note: Float): Float = (440.0 * Math.pow(2.0, (note - 69.0) / 12.0)).toFloat()

    // ----------------------------------------------------------------- envelopes

    fun adsr(
        length: Int,
        attack: Float = 0.01f,
        decay: Float = 0.1f,
        sustain: Float = 0.7f,
        release: Float = 0.2f,
    ): FloatArray {
        val out = FloatArray(length)
        val a = max(1, (attack * SR).toInt())
        val d = max(1, (decay * SR).toInt())
        val r = max(1, (release * SR).toInt())
        val s = max(0, length - a - d - r)
        var i = 0
        while (i < length) {
            val value = when {
                i < a -> i.toFloat() / a
                i < a + d -> 1f + (sustain - 1f) * (i - a).toFloat() / d
                i < a + d + s -> sustain
                else -> {
                    val k = (i - a - d - s).toFloat() / r
                    sustain * (1f - k).coerceAtLeast(0f)
                }
            }
            out[i] = value
            i++
        }
        return out
    }

    // --------------------------------------------------------------- oscillators

    fun sine(freq: Float, length: Int, detune: Float = 0f): FloatArray {
        val out = FloatArray(length)
        val step = (2.0 * PI * freq * (1.0 + detune) / SR).toFloat()
        var phase = 0f
        for (i in 0 until length) {
            out[i] = sin(phase)
            phase += step
        }
        return out
    }

    fun saw(freq: Float, length: Int, detune: Float = 0f): FloatArray {
        val out = FloatArray(length)
        val step = (freq * (1.0 + detune) / SR).toFloat()
        var phase = 0f
        for (i in 0 until length) {
            out[i] = 2f * phase - 1f
            phase += step
            if (phase >= 1f) phase -= 1f
        }
        return out
    }

    fun square(freq: Float, length: Int, duty: Float = 0.5f, detune: Float = 0f): FloatArray {
        val out = FloatArray(length)
        val step = (freq * (1.0 + detune) / SR).toFloat()
        var phase = 0f
        for (i in 0 until length) {
            out[i] = if (phase < duty) 1f else -1f
            phase += step
            if (phase >= 1f) phase -= 1f
        }
        return out
    }

    fun triangle(freq: Float, length: Int, detune: Float = 0f): FloatArray {
        val out = FloatArray(length)
        val step = (freq * (1.0 + detune) / SR).toFloat()
        var phase = 0f
        for (i in 0 until length) {
            out[i] = 4f * abs(phase - 0.5f) - 1f
            phase += step
            if (phase >= 1f) phase -= 1f
        }
        return out
    }

    fun supersaw(freq: Float, length: Int, voices: Int = 7, spread: Float = 0.014f): FloatArray {
        val out = FloatArray(length)
        val half = (voices - 1) / 2f
        for (v in 0 until voices) {
            val detune = if (half == 0f) 0f else (v - half) / half * spread
            val step = (freq * (1.0 + detune) / SR).toFloat()
            var phase = v * 0.13f % 1f
            for (i in 0 until length) {
                out[i] += 2f * phase - 1f
                phase += step
                if (phase >= 1f) phase -= 1f
            }
        }
        val gain = 1f / voices
        for (i in 0 until length) out[i] *= gain
        return out
    }

    fun fmBell(freq: Float, length: Int, ratio: Float = 2f, index: Float = 3f): FloatArray {
        val out = FloatArray(length)
        for (i in 0 until length) {
            val t = i.toFloat() / SR
            val mod = sin(2f * PI.toFloat() * freq * ratio * t) * index * exp(-3f * t)
            out[i] = sin(2f * PI.toFloat() * freq * t + mod)
        }
        return out
    }

    /** Karplus-Strong string, advanced one delay-line period at a time. */
    fun pluck(freq: Float, length: Int, damping: Float = 0.996f): FloatArray {
        val period = max(2, (SR / max(1f, freq)).toInt())
        val random = Random((freq * 100).toInt())
        var buffer = FloatArray(period) { random.nextFloat() * 2f - 1f }
        val out = FloatArray(length)
        var written = 0
        while (written < length) {
            val take = min(period, length - written)
            System.arraycopy(buffer, 0, out, written, take)
            written += take
            val next = FloatArray(period)
            for (i in 0 until period) {
                next[i] = damping * 0.5f * (buffer[i] + buffer[(i + 1) % period])
            }
            buffer = next
        }
        return out
    }

    fun noise(length: Int, seed: Int): FloatArray {
        val random = Random(seed)
        return FloatArray(length) { (random.nextFloat() * 2f - 1f) }
    }

    // -------------------------------------------------------------------- drums

    fun kick(length: Int, tune: Float = 33f, punch: Float = 1f): FloatArray {
        val out = FloatArray(length)
        val base = midiToHz(tune)
        var phase = 0f
        val click = noise(length, 7)
        for (i in 0 until length) {
            val t = i.toFloat() / SR
            val pitch = base * (1f + 6f * exp(-55f * t))
            phase += 2f * PI.toFloat() * pitch / SR
            out[i] = sin(phase) * exp(-11f * t) * punch + click[i] * exp(-260f * t) * 0.35f
        }
        return out
    }

    fun snare(length: Int, bright: Float = 1f): FloatArray {
        val n = Biquad.highpass(950f * bright).process(noise(length, 11))
        val out = FloatArray(length)
        for (i in 0 until length) {
            val t = i.toFloat() / SR
            val tone = sin(2f * PI.toFloat() * 185f * t) * 0.6f + sin(2f * PI.toFloat() * 278f * t) * 0.4f
            out[i] = (n[i] * 0.85f + tone * 0.35f) * exp(-24f * t)
        }
        return out
    }

    fun clap(length: Int): FloatArray {
        val n = Biquad.bandpass(1600f, 0.8f).process(noise(length, 13))
        val env = FloatArray(length)
        for ((offset, amp) in listOf(0f to 1f, 0.008f to 0.8f, 0.016f to 0.6f, 0.025f to 0.45f)) {
            val start = (offset * SR).toInt()
            if (start >= length) break
            for (i in start until length) {
                env[i] += exp(-55f * (i - start).toFloat() / SR) * amp
            }
        }
        return FloatArray(length) { n[it] * env[it] * 0.9f }
    }

    fun hat(length: Int, open: Boolean = false): FloatArray {
        val n = Biquad.highpass(7200f).process(noise(length, 17))
        val decay = if (open) 14f else 70f
        return FloatArray(length) { n[it] * exp(-decay * it.toFloat() / SR) * 0.5f }
    }

    fun tom(length: Int, tune: Float = 72f): FloatArray {
        val out = FloatArray(length)
        val base = midiToHz(tune)
        var phase = 0f
        for (i in 0 until length) {
            val t = i.toFloat() / SR
            phase += 2f * PI.toFloat() * base * (1f + 1.6f * exp(-30f * t)) / SR
            out[i] = sin(phase) * exp(-13f * t)
        }
        return out
    }

    fun crash(length: Int): FloatArray {
        val n = Biquad.highpass(4200f).process(noise(length, 23))
        return FloatArray(length) { n[it] * exp(-2.6f * it.toFloat() / SR) * 0.7f }
    }

    // ------------------------------------------------------------------ helpers

    fun addAt(target: FloatArray, sample: FloatArray, start: Int, gain: Float) {
        if (gain == 0f || start >= target.size) return
        var i = max(0, -start)
        val end = min(sample.size, target.size - start)
        while (i < end) {
            target[start + i] += sample[i] * gain
            i++
        }
    }

    fun peak(x: FloatArray, from: Int = 0, to: Int = x.size): Float {
        var m = 0f
        for (i in from until to) {
            val v = abs(x[i])
            if (v > m) m = v
        }
        return m
    }

    fun rms(x: FloatArray, from: Int = 0, to: Int = x.size): Float {
        var sum = 0.0
        for (i in from until to) sum += x[i].toDouble() * x[i]
        val n = (to - from).coerceAtLeast(1)
        return Math.sqrt(sum / n).toFloat()
    }

    fun softLimit(value: Float, ceiling: Float = 0.95f): Float = tanh(value / ceiling) * ceiling
}

/**
 * Direct-form-I biquad that keeps its state between calls, so a song rendered in
 * blocks sounds identical to the same song rendered in one pass.
 */
class Biquad(
    private val b0: Float,
    private val b1: Float,
    private val b2: Float,
    private val a1: Float,
    private val a2: Float,
) {
    private var x1 = 0f
    private var x2 = 0f
    private var y1 = 0f
    private var y2 = 0f

    fun reset() {
        x1 = 0f; x2 = 0f; y1 = 0f; y2 = 0f
    }

    fun processInPlace(buffer: FloatArray, from: Int = 0, to: Int = buffer.size) {
        for (i in from until to) {
            val x = buffer[i]
            val y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2 = x1; x1 = x
            y2 = y1; y1 = y
            buffer[i] = y
        }
    }

    fun process(input: FloatArray): FloatArray {
        val out = input.copyOf()
        processInPlace(out)
        return out
    }

    companion object {
        private fun make(kind: String, freq: Float, q: Float, gainDb: Float): Biquad {
            val f = freq.coerceIn(20f, Dsp.SR / 2f - 100f)
            val w0 = 2.0 * PI * f / Dsp.SR
            val alpha = sin(w0) / (2 * q)
            val cosw = cos(w0)
            val b: DoubleArray
            val a: DoubleArray
            when (kind) {
                "lowpass" -> {
                    b = doubleArrayOf((1 - cosw) / 2, 1 - cosw, (1 - cosw) / 2)
                    a = doubleArrayOf(1 + alpha, -2 * cosw, 1 - alpha)
                }
                "highpass" -> {
                    b = doubleArrayOf((1 + cosw) / 2, -(1 + cosw), (1 + cosw) / 2)
                    a = doubleArrayOf(1 + alpha, -2 * cosw, 1 - alpha)
                }
                "bandpass" -> {
                    b = doubleArrayOf(alpha, 0.0, -alpha)
                    a = doubleArrayOf(1 + alpha, -2 * cosw, 1 - alpha)
                }
                else -> { // peak
                    val amp = Math.pow(10.0, gainDb / 40.0)
                    b = doubleArrayOf(1 + alpha * amp, -2 * cosw, 1 - alpha * amp)
                    a = doubleArrayOf(1 + alpha / amp, -2 * cosw, 1 - alpha / amp)
                }
            }
            val norm = a[0]
            return Biquad(
                (b[0] / norm).toFloat(), (b[1] / norm).toFloat(), (b[2] / norm).toFloat(),
                (a[1] / norm).toFloat(), (a[2] / norm).toFloat(),
            )
        }

        fun lowpass(freq: Float, q: Float = 0.707f) = make("lowpass", freq, q, 0f)
        fun highpass(freq: Float, q: Float = 0.707f) = make("highpass", freq, q, 0f)
        fun bandpass(freq: Float, q: Float = 0.707f) = make("bandpass", freq, q, 0f)
        fun peak(freq: Float, q: Float = 0.707f, gainDb: Float = 0f) = make("peak", freq, q, gainDb)
    }
}

/** Feedback comb with a persistent delay line: y[n] = x[n] + fb * y[n-delay]. */
class Comb(delaySamples: Int, private val feedback: Float) {
    private val line = FloatArray(max(1, delaySamples))
    private var index = 0

    fun step(x: Float): Float {
        val value = x + feedback * line[index]
        line[index] = value
        index++
        if (index >= line.size) index = 0
        return value
    }
}

/** Allpass stage: y[n] = -g*x[n] + x[n-delay] + g*y[n-delay]. */
class Allpass(delaySamples: Int, private val gain: Float) {
    private val inLine = FloatArray(max(1, delaySamples))
    private val outLine = FloatArray(max(1, delaySamples))
    private var index = 0

    fun step(x: Float): Float {
        val y = -gain * x + inLine[index] + gain * outLine[index]
        inLine[index] = x
        outLine[index] = y
        index++
        if (index >= inLine.size) index = 0
        return y
    }
}

/**
 * Schroeder reverb: four parallel combs into two allpass stages. All delay lines are
 * instance state, so rendering a song in blocks produces exactly the same tail as
 * rendering it in one pass.
 */
class Reverb(size: Float, private val amount: Float) {
    private val feedback = 0.55f + 0.4f * size
    private val combs = arrayOf(
        Comb((Dsp.SR * 0.0297f * (0.5f + size)).toInt(), 0.805f * feedback),
        Comb((Dsp.SR * 0.0371f * (0.5f + size)).toInt(), 0.827f * feedback),
        Comb((Dsp.SR * 0.0411f * (0.5f + size)).toInt(), 0.783f * feedback),
        Comb((Dsp.SR * 0.0437f * (0.5f + size)).toInt(), 0.764f * feedback),
    )
    private val allpassA = Allpass((Dsp.SR * 0.0053f).toInt(), 0.7f)
    private val allpassB = Allpass((Dsp.SR * 0.0017f).toInt(), 0.7f)
    private val damp = Biquad.lowpass(6500f)
    private var scratch = FloatArray(0)

    fun processInPlace(buffer: FloatArray, from: Int, to: Int) {
        if (amount <= 0f) return
        val span = to - from
        if (span <= 0) return
        if (scratch.size < span) scratch = FloatArray(span)
        for (i in 0 until span) {
            val x = buffer[from + i]
            var wet = 0f
            for (comb in combs) wet += comb.step(x)
            wet *= 0.25f
            scratch[i] = allpassB.step(allpassA.step(wet))
        }
        damp.processInPlace(scratch, 0, span)
        val dry = 1f - amount
        for (i in 0 until span) {
            buffer[from + i] = buffer[from + i] * dry + scratch[i] * amount * 1.4f
        }
    }
}

/** Soft-knee compressor with an envelope follower that survives block boundaries. */
class Compressor(
    private val threshold: Float,
    private val ratio: Float,
    attackMs: Float,
    releaseMs: Float,
) {
    private val attack = exp(-1f / (Dsp.SR * attackMs / 1000f))
    private val release = exp(-1f / (Dsp.SR * releaseMs / 1000f))
    private var envelope = 0f

    fun processInPlace(buffer: FloatArray, from: Int, to: Int) {
        val slope = 1f / ratio - 1f
        for (i in from until to) {
            val level = abs(buffer[i])
            val coeff = if (level > envelope) attack else release
            envelope = coeff * envelope + (1 - coeff) * level
            val over = envelope / threshold
            if (over > 1f) {
                buffer[i] *= Math.pow(over.toDouble(), slope.toDouble()).toFloat()
            }
        }
    }
}
