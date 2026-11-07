package com.pulse.studio.render

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import com.pulse.studio.codec.YuvConverter
import java.io.File
import java.nio.ByteBuffer

/**
 * Encodes rendered frames to H.264 and muxes them with a pre-encoded audio track.
 *
 * Frames arrive as packed ARGB and are converted into the encoder's own YUV buffers,
 * honouring whatever strides it reports. Audio samples are copied in as the video
 * timeline advances so the result is properly interleaved and seeks cleanly.
 */
class VideoWriter(
    private val output: File,
    private val width: Int,
    private val height: Int,
    private val fps: Int,
    private val bitRate: Int,
    private val audioTrackFile: File?,
) {
    private val codec: MediaCodec
    private val muxer: MediaMuxer
    private val info = MediaCodec.BufferInfo()

    private var videoTrack = -1
    private var audioTrack = -1
    private var started = false
    private var framesSubmitted = 0L

    private var audioExtractor: MediaExtractor? = null
    private var audioFormat: MediaFormat? = null
    private val audioBuffer: ByteBuffer = ByteBuffer.allocate(1 shl 16)
    private val audioInfo = MediaCodec.BufferInfo()
    private var audioDone = false

    init {
        output.parentFile?.mkdirs()
        if (output.exists()) output.delete()

        val format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, width, height).apply {
            setInteger(
                MediaFormat.KEY_COLOR_FORMAT,
                MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible,
            )
            setInteger(MediaFormat.KEY_BIT_RATE, bitRate)
            setInteger(MediaFormat.KEY_FRAME_RATE, fps)
            setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 2)
        }
        codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
        codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
        codec.start()

        muxer = MediaMuxer(output.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

        if (audioTrackFile != null && audioTrackFile.exists() && audioTrackFile.length() > 0) {
            val extractor = MediaExtractor()
            extractor.setDataSource(audioTrackFile.absolutePath)
            for (i in 0 until extractor.trackCount) {
                val candidate = extractor.getTrackFormat(i)
                if (candidate.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) {
                    extractor.selectTrack(i)
                    audioExtractor = extractor
                    audioFormat = candidate
                    break
                }
            }
            if (audioFormat == null) runCatching { extractor.release() }
        }
    }

    /** Submits one rendered frame; [argb] must hold width * height packed pixels. */
    fun writeFrame(argb: IntArray) {
        while (true) {
            val index = codec.dequeueInputBuffer(TIMEOUT_US)
            if (index >= 0) {
                val image = codec.getInputImage(index)
                if (image == null) {
                    // Should not happen with a flexible colour format, but failing
                    // loudly here beats writing a green video.
                    codec.queueInputBuffer(index, 0, 0, presentationTime(), 0)
                    throw IllegalStateException("Encoder did not provide an input image")
                }
                val planes = image.planes
                YuvConverter.argbToYuv420(
                    argb = argb,
                    width = width,
                    height = height,
                    yPlane = planes[0].buffer,
                    yRowStride = planes[0].rowStride,
                    uPlane = planes[1].buffer,
                    vPlane = planes[2].buffer,
                    uvRowStride = planes[1].rowStride,
                    uvPixelStride = planes[1].pixelStride,
                )
                val size = planes[0].rowStride * height +
                    planes[1].rowStride * ((height + 1) / 2) * 2
                codec.queueInputBuffer(index, 0, size, presentationTime(), 0)
                framesSubmitted++
                break
            }
            drain(false)
        }
        drain(false)
    }

    fun finish() {
        val index = codec.dequeueInputBuffer(TIMEOUT_US * 20)
        if (index >= 0) {
            codec.queueInputBuffer(index, 0, 0, presentationTime(), MediaCodec.BUFFER_FLAG_END_OF_STREAM)
        }
        drain(true)
        copyAudio(Long.MAX_VALUE)

        runCatching { codec.stop() }
        runCatching { codec.release() }
        runCatching { if (started) muxer.stop() }
        runCatching { muxer.release() }
        runCatching { audioExtractor?.release() }
    }

    fun abort() {
        runCatching { codec.stop() }
        runCatching { codec.release() }
        runCatching { muxer.release() }
        runCatching { audioExtractor?.release() }
        runCatching { output.delete() }
    }

    private fun presentationTime(): Long = framesSubmitted * 1_000_000L / fps

    private fun drain(endOfStream: Boolean) {
        while (true) {
            val index = codec.dequeueOutputBuffer(info, TIMEOUT_US)
            when {
                index == MediaCodec.INFO_TRY_AGAIN_LATER -> if (!endOfStream) return
                index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                    if (!started) {
                        videoTrack = muxer.addTrack(codec.outputFormat)
                        audioFormat?.let { audioTrack = muxer.addTrack(it) }
                        muxer.start()
                        started = true
                    }
                }
                index >= 0 -> {
                    val buffer = codec.getOutputBuffer(index)
                    val isConfig = info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0
                    if (buffer != null && info.size > 0 && started && !isConfig) {
                        buffer.position(info.offset)
                        buffer.limit(info.offset + info.size)
                        muxer.writeSampleData(videoTrack, buffer, info)
                        copyAudio(info.presentationTimeUs)
                    }
                    codec.releaseOutputBuffer(index, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) return
                }
            }
        }
    }

    /** Copies audio samples up to the given video timestamp so the file interleaves. */
    private fun copyAudio(untilUs: Long) {
        val extractor = audioExtractor ?: return
        if (audioDone || !started || audioTrack < 0) return
        while (true) {
            val sampleTime = extractor.sampleTime
            if (sampleTime < 0) {
                audioDone = true
                return
            }
            if (sampleTime > untilUs) return
            audioBuffer.clear()
            val size = extractor.readSampleData(audioBuffer, 0)
            if (size <= 0) {
                audioDone = true
                return
            }
            audioInfo.offset = 0
            audioInfo.size = size
            audioInfo.presentationTimeUs = sampleTime
            audioInfo.flags = extractor.sampleFlags
            muxer.writeSampleData(audioTrack, audioBuffer, audioInfo)
            if (!extractor.advance()) {
                audioDone = true
                return
            }
        }
    }

    private companion object {
        const val TIMEOUT_US = 10_000L
    }
}
