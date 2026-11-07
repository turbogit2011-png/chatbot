package com.sonara.studio.engine

import java.io.BufferedOutputStream
import java.io.File
import java.io.OutputStream
import java.io.RandomAccessFile

/**
 * Streaming 16-bit PCM WAV writer.
 *
 * The header is written with placeholder sizes and patched when the stream closes,
 * so audio can be written out as it is rendered instead of being buffered whole.
 */
class WavWriter(private val file: File, private val sampleRate: Int = Dsp.SR) : PcmSink {

    private val stream: OutputStream = BufferedOutputStream(file.outputStream(), 1 shl 16)
    private var frames = 0L
    private var scratch = ByteArray(0)

    init {
        file.parentFile?.mkdirs()
        stream.write(header(0))
    }

    override fun write(interleaved: FloatArray, frames: Int) {
        val bytes = frames * 2 * 2
        if (scratch.size < bytes) scratch = ByteArray(bytes)
        var offset = 0
        for (i in 0 until frames * 2) {
            val clamped = interleaved[i].coerceIn(-1f, 1f)
            val value = (clamped * 32767f).toInt()
            scratch[offset++] = (value and 0xFF).toByte()
            scratch[offset++] = ((value shr 8) and 0xFF).toByte()
        }
        stream.write(scratch, 0, bytes)
        this.frames += frames
    }

    fun close() {
        stream.flush()
        stream.close()
        RandomAccessFile(file, "rw").use { raf ->
            raf.write(header(frames))
        }
    }

    val durationSeconds: Float get() = frames.toFloat() / sampleRate

    private fun header(frames: Long): ByteArray {
        val dataBytes = (frames * 2 * 2).toInt()
        val byteRate = sampleRate * 2 * 2
        val out = java.io.ByteArrayOutputStream(44)
        fun ascii(text: String) = out.write(text.toByteArray(Charsets.US_ASCII))
        fun int32(value: Int) {
            out.write(value and 0xFF)
            out.write((value shr 8) and 0xFF)
            out.write((value shr 16) and 0xFF)
            out.write((value shr 24) and 0xFF)
        }
        fun int16(value: Int) {
            out.write(value and 0xFF)
            out.write((value shr 8) and 0xFF)
        }
        ascii("RIFF"); int32(36 + dataBytes); ascii("WAVE")
        ascii("fmt "); int32(16); int16(1); int16(2)
        int32(sampleRate); int32(byteRate); int16(4); int16(16)
        ascii("data"); int32(dataBytes)
        return out.toByteArray()
    }
}
