package com.pulse.studio.audio

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Iterative radix-2 FFT with cached twiddle factors.
 *
 * Analysing a few minutes of audio means tens of thousands of transforms, so the
 * tables are built once per size and the transform runs in place.
 */
class Fft(val size: Int) {

    init {
        require(size > 0 && (size and (size - 1)) == 0) { "FFT size must be a power of two" }
    }

    private val levels = Integer.numberOfTrailingZeros(size)
    private val cosTable = FloatArray(size / 2) { cos(2.0 * PI * it / size).toFloat() }
    private val sinTable = FloatArray(size / 2) { sin(2.0 * PI * it / size).toFloat() }
    private val reversed = IntArray(size) { Integer.reverse(it) ushr (32 - levels) }

    private val re = FloatArray(size)
    private val im = FloatArray(size)

    /** Returns the magnitude spectrum (size/2 + 1 bins) of a real windowed frame. */
    fun magnitudes(input: FloatArray, offset: Int, window: FloatArray, out: FloatArray) {
        for (i in 0 until size) {
            val index = offset + i
            re[i] = if (index in input.indices) input[index] * window[i] else 0f
            im[i] = 0f
        }
        transform()
        for (i in 0..size / 2) {
            out[i] = sqrt(re[i] * re[i] + im[i] * im[i])
        }
    }

    private fun transform() {
        for (i in 0 until size) {
            val j = reversed[i]
            if (j > i) {
                var tmp = re[i]; re[i] = re[j]; re[j] = tmp
                tmp = im[i]; im[i] = im[j]; im[j] = tmp
            }
        }
        var span = 2
        while (span <= size) {
            val half = span / 2
            val step = size / span
            var i = 0
            while (i < size) {
                var j = i
                var k = 0
                while (j < i + half) {
                    val c = cosTable[k]
                    val s = -sinTable[k]
                    val tre = re[j + half] * c - im[j + half] * s
                    val tim = re[j + half] * s + im[j + half] * c
                    re[j + half] = re[j] - tre
                    im[j + half] = im[j] - tim
                    re[j] += tre
                    im[j] += tim
                    j++
                    k += step
                }
                i += span
            }
            span = span shl 1
        }
    }

    companion object {
        fun hann(size: Int): FloatArray =
            FloatArray(size) { 0.5f - 0.5f * cos(2.0 * PI * it / size).toFloat() }
    }
}
