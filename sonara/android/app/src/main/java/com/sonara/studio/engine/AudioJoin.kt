package com.sonara.studio.engine

import java.io.File
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * Stream-level audio surgery: copying and joining rendered WAV files.
 *
 * Kept free of Android types so the join can be unit tested on the JVM — it is the one
 * piece of the extend feature where an off-by-one would be audible.
 */
object AudioJoin {

    private const val BLOCK = 8192

    /** Copies a WAV file into any sink; returns its length in seconds. */
    fun stream(source: File, sink: PcmSink): Float {
        WavReader(source).use { reader ->
            val block = FloatArray(BLOCK * 2)
            var frames = 0L
            while (true) {
                val read = reader.read(block, BLOCK)
                if (read <= 0) break
                sink.write(block, read)
                frames += read
            }
            return frames.toFloat() / Dsp.SR
        }
    }

    /**
     * Writes [head] up to [cutSeconds], equal-power crossfades into [tail], then writes
     * the rest of the tail. Both files are read sequentially, so joining two long tracks
     * costs a couple of megabytes however long they are.
     */
    fun crossfade(
        head: File,
        tail: File,
        cutSeconds: Float,
        sink: PcmSink,
        fadeSeconds: Float = 1.8f,
    ): Float {
        val fadeFrames = (Dsp.SR * fadeSeconds).toInt()
        var written = 0L

        WavReader(head).use { headReader ->
            val requested = (cutSeconds.coerceAtLeast(0f) * Dsp.SR).toLong()
            val keep = if (requested <= 0) headReader.totalFrames else min(requested, headReader.totalFrames)
            val straight = (keep - fadeFrames).coerceAtLeast(0)

            val block = FloatArray(BLOCK * 2)
            var remaining = straight
            while (remaining > 0) {
                val want = min(BLOCK.toLong(), remaining).toInt()
                val read = headReader.read(block, want)
                if (read <= 0) break
                sink.write(block, read)
                written += read
                remaining -= read
            }

            val overlap = (keep - straight).toInt().coerceAtLeast(0)
            val headTail = FloatArray(maxOf(1, overlap) * 2)
            val headGot = if (overlap > 0) headReader.read(headTail, overlap) else 0

            WavReader(tail).use { tailReader ->
                val tailHead = FloatArray(maxOf(1, headGot) * 2)
                val tailGot = if (headGot > 0) tailReader.read(tailHead, headGot) else 0
                val blend = min(headGot, tailGot)
                if (blend > 0) {
                    val mixed = FloatArray(blend * 2)
                    for (i in 0 until blend) {
                        val k = i.toFloat() / blend
                        val out = cos(k * PI.toFloat() / 2f)
                        val into = sin(k * PI.toFloat() / 2f)
                        mixed[i * 2] = headTail[i * 2] * out + tailHead[i * 2] * into
                        mixed[i * 2 + 1] = headTail[i * 2 + 1] * out + tailHead[i * 2 + 1] * into
                    }
                    sink.write(mixed, blend)
                    written += blend
                }
                val block2 = FloatArray(BLOCK * 2)
                while (true) {
                    val read = tailReader.read(block2, BLOCK)
                    if (read <= 0) break
                    sink.write(block2, read)
                    written += read
                }
            }
        }
        return written.toFloat() / Dsp.SR
    }
}
