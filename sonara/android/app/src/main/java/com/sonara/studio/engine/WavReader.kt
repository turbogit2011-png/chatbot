package com.sonara.studio.engine

import java.io.BufferedInputStream
import java.io.File

/**
 * Minimal reader for the 16-bit stereo WAV files this engine writes.
 * Reads sequentially so joining two long tracks never needs them both in memory.
 */
class WavReader(file: File) : AutoCloseable {

    private val stream = BufferedInputStream(file.inputStream(), 1 shl 16)
    private val bytes = ByteArray(1 shl 16)
    val totalFrames: Long = ((file.length() - HEADER) / 4).coerceAtLeast(0)

    init {
        stream.skip(HEADER)
    }

    /** Fills [out] with interleaved stereo samples; returns the number of frames read. */
    fun read(out: FloatArray, frames: Int): Int {
        val wanted = frames * 4
        var filled = 0
        var produced = 0
        while (filled < wanted) {
            val read = stream.read(bytes, 0, minOf(bytes.size, wanted - filled))
            if (read <= 0) break
            var i = 0
            while (i + 1 < read) {
                val value = ((bytes[i].toInt() and 0xFF) or (bytes[i + 1].toInt() shl 8)).toShort()
                out[produced++] = value / 32768f
                i += 2
            }
            filled += read
        }
        return produced / 2
    }

    fun skipFrames(frames: Long) {
        var remaining = frames * 4
        while (remaining > 0) {
            val skipped = stream.skip(remaining)
            if (skipped <= 0) break
            remaining -= skipped
        }
    }

    override fun close() {
        runCatching { stream.close() }
    }

    private companion object {
        const val HEADER = 44L
    }
}
