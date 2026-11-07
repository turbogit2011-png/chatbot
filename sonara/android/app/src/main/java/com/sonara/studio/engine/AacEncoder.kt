package com.sonara.studio.engine

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import java.io.File
import java.nio.ByteBuffer

/**
 * Streaming AAC encoder writing an .m4a container.
 *
 * Android has no built-in MP3 encoder, but AAC-LC is guaranteed on every device since
 * API 16 and plays everywhere, so that is what the on-device engine produces. Audio is
 * fed in as it is rendered, so a ten-minute track never sits in memory.
 */
class AacEncoder(
    private val file: File,
    private val sampleRate: Int = Dsp.SR,
    bitRate: Int = 192_000,
) : PcmSink {

    private val codec: MediaCodec
    private val muxer: MediaMuxer
    private var trackIndex = -1
    private var muxerStarted = false
    private var presentationFrames = 0L
    private val bufferInfo = MediaCodec.BufferInfo()
    private var pcmBytes = ByteArray(0)
    private var closed = false

    init {
        file.parentFile?.mkdirs()
        if (file.exists()) file.delete()
        val format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, 2).apply {
            setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
            setInteger(MediaFormat.KEY_BIT_RATE, bitRate)
            setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, MAX_INPUT)
        }
        codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
        codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
        codec.start()
        muxer = MediaMuxer(file.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    }

    override fun write(interleaved: FloatArray, frames: Int) {
        val needed = frames * 2 * 2
        if (pcmBytes.size < needed) pcmBytes = ByteArray(needed)
        var offset = 0
        for (i in 0 until frames * 2) {
            val value = (interleaved[i].coerceIn(-1f, 1f) * 32767f).toInt()
            pcmBytes[offset++] = (value and 0xFF).toByte()
            pcmBytes[offset++] = ((value shr 8) and 0xFF).toByte()
        }
        var written = 0
        while (written < needed) {
            val chunk = minOf(MAX_INPUT, needed - written)
            feed(pcmBytes, written, chunk)
            written += chunk
        }
    }

    private fun feed(data: ByteArray, offset: Int, length: Int) {
        while (true) {
            val index = codec.dequeueInputBuffer(TIMEOUT_US)
            if (index >= 0) {
                val input: ByteBuffer = codec.getInputBuffer(index) ?: continue
                input.clear()
                input.put(data, offset, length)
                val timestamp = presentationFrames * 1_000_000L / sampleRate
                codec.queueInputBuffer(index, 0, length, timestamp, 0)
                presentationFrames += length / 4
                break
            }
            drain(endOfStream = false)
        }
        drain(endOfStream = false)
    }

    private fun drain(endOfStream: Boolean) {
        while (true) {
            val index = codec.dequeueOutputBuffer(bufferInfo, TIMEOUT_US)
            when {
                index == MediaCodec.INFO_TRY_AGAIN_LATER -> if (!endOfStream) return
                index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                    if (!muxerStarted) {
                        trackIndex = muxer.addTrack(codec.outputFormat)
                        muxer.start()
                        muxerStarted = true
                    }
                }
                index >= 0 -> {
                    val output = codec.getOutputBuffer(index)
                    if (output != null && bufferInfo.size > 0 && muxerStarted &&
                        (bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) == 0
                    ) {
                        output.position(bufferInfo.offset)
                        output.limit(bufferInfo.offset + bufferInfo.size)
                        muxer.writeSampleData(trackIndex, output, bufferInfo)
                    }
                    codec.releaseOutputBuffer(index, false)
                    if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) return
                }
            }
        }
    }

    fun close() {
        if (closed) return
        closed = true
        runCatching {
            val index = codec.dequeueInputBuffer(TIMEOUT_US * 10)
            if (index >= 0) {
                codec.queueInputBuffer(index, 0, 0, presentationFrames * 1_000_000L / sampleRate,
                    MediaCodec.BUFFER_FLAG_END_OF_STREAM)
            }
            drain(endOfStream = true)
        }
        runCatching { codec.stop() }
        runCatching { codec.release() }
        runCatching { if (muxerStarted) muxer.stop() }
        runCatching { muxer.release() }
    }

    private companion object {
        const val TIMEOUT_US = 10_000L
        const val MAX_INPUT = 1 shl 14
    }
}
