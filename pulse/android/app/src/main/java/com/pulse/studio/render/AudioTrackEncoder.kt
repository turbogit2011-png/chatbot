package com.pulse.studio.render

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import java.io.File
import java.io.RandomAccessFile

/**
 * Encodes a slice of raw PCM into a temporary AAC/.m4a file.
 *
 * Doing audio as its own pass keeps the final mux simple: by the time the video
 * encoder produces its format, the audio format is already known, so both tracks can
 * be added before the muxer starts — which MediaMuxer requires.
 */
object AudioTrackEncoder {

    private const val TIMEOUT_US = 10_000L
    private const val CHUNK_BYTES = 8192

    fun encode(
        pcm: File,
        sampleRate: Int,
        channels: Int,
        startSeconds: Float,
        durationSeconds: Float,
        output: File,
        bitRate: Int = 192_000,
    ): File {
        val format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channels).apply {
            setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
            setInteger(MediaFormat.KEY_BIT_RATE, bitRate)
            setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, CHUNK_BYTES * 2)
        }
        val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
        codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
        codec.start()

        output.parentFile?.mkdirs()
        if (output.exists()) output.delete()
        val muxer = MediaMuxer(output.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
        var trackIndex = -1
        var started = false

        val bytesPerFrame = 2 * channels
        val source = RandomAccessFile(pcm, "r")
        val startByte = (startSeconds * sampleRate).toLong() * bytesPerFrame
        val wantedBytes = if (durationSeconds > 0f) {
            (durationSeconds * sampleRate).toLong() * bytesPerFrame
        } else {
            source.length() - startByte
        }
        val endByte = (startByte + wantedBytes).coerceAtMost(source.length())
        source.seek(startByte.coerceIn(0, source.length()))

        val info = MediaCodec.BufferInfo()
        val chunk = ByteArray(CHUNK_BYTES)
        var written = 0L
        var framesQueued = 0L
        var inputDone = false

        try {
            while (true) {
                if (!inputDone) {
                    val index = codec.dequeueInputBuffer(TIMEOUT_US)
                    if (index >= 0) {
                        val remaining = endByte - source.filePointer
                        val toRead = minOf(CHUNK_BYTES.toLong(), remaining).toInt()
                        if (toRead <= 0) {
                            codec.queueInputBuffer(
                                index, 0, 0,
                                framesQueued * 1_000_000L / sampleRate,
                                MediaCodec.BUFFER_FLAG_END_OF_STREAM,
                            )
                            inputDone = true
                        } else {
                            val read = source.read(chunk, 0, toRead)
                            if (read <= 0) {
                                codec.queueInputBuffer(
                                    index, 0, 0,
                                    framesQueued * 1_000_000L / sampleRate,
                                    MediaCodec.BUFFER_FLAG_END_OF_STREAM,
                                )
                                inputDone = true
                            } else {
                                val buffer = codec.getInputBuffer(index)!!
                                buffer.clear()
                                buffer.put(chunk, 0, read)
                                codec.queueInputBuffer(
                                    index, 0, read,
                                    framesQueued * 1_000_000L / sampleRate, 0,
                                )
                                framesQueued += read / bytesPerFrame
                                written += read
                            }
                        }
                    }
                }

                val outIndex = codec.dequeueOutputBuffer(info, TIMEOUT_US)
                when {
                    outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                        trackIndex = muxer.addTrack(codec.outputFormat)
                        muxer.start()
                        started = true
                    }
                    outIndex >= 0 -> {
                        val buffer = codec.getOutputBuffer(outIndex)
                        if (buffer != null && info.size > 0 && started &&
                            info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG == 0
                        ) {
                            buffer.position(info.offset)
                            buffer.limit(info.offset + info.size)
                            muxer.writeSampleData(trackIndex, buffer, info)
                        }
                        codec.releaseOutputBuffer(outIndex, false)
                        if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) break
                    }
                    outIndex == MediaCodec.INFO_TRY_AGAIN_LATER && inputDone -> {
                        // keep draining; the encoder will emit end-of-stream shortly
                    }
                }
            }
        } finally {
            runCatching { source.close() }
            runCatching { codec.stop() }
            runCatching { codec.release() }
            runCatching { if (started) muxer.stop() }
            runCatching { muxer.release() }
        }
        return output
    }
}
