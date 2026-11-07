package com.pulse.studio

import java.io.File
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin
import kotlin.random.Random

/** Synthetic material with known ground truth, plus a reader for real WAV files. */
object TestAudio {

    const val SR = 44100

    fun clickTrack(bpm: Float, seconds: Float): FloatArray {
        val out = FloatArray((SR * seconds).toInt())
        val period = SR * 60f / bpm
        var position = 0f
        while (position < out.size) {
            val start = position.toInt()
            for (i in 0 until 1200) {
                val index = start + i
                if (index >= out.size) break
                val t = i.toFloat() / SR
                out[index] += sin(2f * PI.toFloat() * 1000f * t) * exp(-90f * t)
            }
            position += period
        }
        return out
    }

    /** Kick, hat, snare and a bass note on a 16th grid — closer to real material. */
    fun drumLoop(bpm: Float, seconds: Float, seed: Int = 1, swing: Float = 0f): FloatArray {
        val out = FloatArray((SR * seconds).toInt())
        val random = Random(seed)
        val stepSamples = SR * 60f / bpm / 4f
        val kickPattern = booleanArrayOf(true, false, false, false, false, false, true, false,
            false, false, true, false, false, false, false, false)
        val snarePattern = booleanArrayOf(false, false, false, false, true, false, false, false,
            false, false, false, false, true, false, false, false)
        val hatPattern = BooleanArray(16) { it % 2 == 0 }

        var step = 0
        while (step * stepSamples < out.size) {
            var offset = step * stepSamples
            if (swing > 0f && step % 2 == 1) offset += stepSamples * swing
            val start = offset.toInt()
            val inBar = step % 16

            if (kickPattern[inBar]) {
                for (i in 0 until 9000) {
                    val index = start + i
                    if (index >= out.size) break
                    val t = i.toFloat() / SR
                    val pitch = 55f * (1f + 5f * exp(-50f * t))
                    out[index] += sin(2f * PI.toFloat() * pitch * t) * exp(-9f * t) * 0.9f
                }
            }
            if (snarePattern[inBar]) {
                for (i in 0 until 6000) {
                    val index = start + i
                    if (index >= out.size) break
                    val t = i.toFloat() / SR
                    out[index] += (random.nextFloat() * 2f - 1f) * exp(-22f * t) * 0.6f
                }
            }
            if (hatPattern[inBar]) {
                for (i in 0 until 1800) {
                    val index = start + i
                    if (index >= out.size) break
                    val t = i.toFloat() / SR
                    out[index] += (random.nextFloat() * 2f - 1f) * exp(-70f * t) * 0.25f
                }
            }
            // a sustained bass note under every beat
            if (inBar % 4 == 0) {
                val length = (stepSamples * 3.5f).toInt()
                for (i in 0 until length) {
                    val index = start + i
                    if (index >= out.size) break
                    val t = i.toFloat() / SR
                    out[index] += sin(2f * PI.toFloat() * 82f * t) * exp(-2.5f * t) * 0.35f
                }
            }
            step++
        }
        var peak = 0f
        for (v in out) if (kotlin.math.abs(v) > peak) peak = kotlin.math.abs(v)
        if (peak > 0f) for (i in out.indices) out[i] = out[i] / peak * 0.9f
        return out
    }

    /** Reads a 16-bit PCM WAV (mono or stereo) and returns mono samples. */
    fun readWavMono(file: File): Pair<FloatArray, Int> {
        val bytes = file.readBytes()
        var offset = 12
        var channels = 2
        var sampleRate = SR
        var dataOffset = -1
        var dataSize = 0
        while (offset + 8 <= bytes.size) {
            val id = String(bytes, offset, 4, Charsets.US_ASCII)
            val size = le32(bytes, offset + 4)
            when (id) {
                "fmt " -> {
                    channels = le16(bytes, offset + 10)
                    sampleRate = le32(bytes, offset + 12)
                }
                "data" -> {
                    dataOffset = offset + 8
                    dataSize = size
                }
            }
            offset += 8 + size + (size and 1)
            if (dataOffset > 0) break
        }
        require(dataOffset > 0) { "no data chunk in ${file.name}" }
        val frames = dataSize / (2 * channels)
        val mono = FloatArray(frames)
        for (frame in 0 until frames) {
            var sum = 0f
            for (channel in 0 until channels) {
                val index = dataOffset + (frame * channels + channel) * 2
                if (index + 1 >= bytes.size) break
                sum += le16signed(bytes, index) / 32768f
            }
            mono[frame] = sum / channels
        }
        return mono to sampleRate
    }

    private fun le16(b: ByteArray, i: Int) = (b[i].toInt() and 0xFF) or ((b[i + 1].toInt() and 0xFF) shl 8)
    private fun le16signed(b: ByteArray, i: Int) = le16(b, i).toShort().toInt()
    private fun le32(b: ByteArray, i: Int) = (b[i].toInt() and 0xFF) or
        ((b[i + 1].toInt() and 0xFF) shl 8) or ((b[i + 2].toInt() and 0xFF) shl 16) or
        ((b[i + 3].toInt() and 0xFF) shl 24)
}
