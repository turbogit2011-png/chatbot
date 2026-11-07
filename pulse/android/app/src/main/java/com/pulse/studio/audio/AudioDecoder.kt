package com.pulse.studio.audio

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import java.io.BufferedOutputStream
import java.io.File
import java.nio.ByteOrder

/** What a decode produced: mono samples for analysis plus the raw PCM on disk. */
class DecodedAudio(
    val mono: FloatArray,
    val sampleRate: Int,
    val channels: Int,
    val pcmFile: File,
    val durationSeconds: Float,
)

/**
 * Decodes any audio Android can read (MP3, M4A, WAV, FLAC, OGG…) into PCM.
 *
 * The interleaved stream is written to a scratch file so the AAC encoder can reuse it
 * later instead of decoding the track twice, while a mono copy stays in memory for
 * analysis. Ten minutes of mono floats is about 25 MB, which is affordable; keeping
 * the interleaved original in memory as well would not be.
 */
object AudioDecoder {

    private const val TIMEOUT_US = 10_000L

    fun decode(
        context: Context,
        uri: Uri,
        scratch: File,
        onProgress: (Float) -> Unit = {},
    ): DecodedAudio {
        val extractor = MediaExtractor()
        extractor.setDataSource(context, uri, null)

        var trackIndex = -1
        var format: MediaFormat? = null
        for (i in 0 until extractor.trackCount) {
            val candidate = extractor.getTrackFormat(i)
            if (candidate.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) {
                trackIndex = i
                format = candidate
                break
            }
        }
        require(trackIndex >= 0 && format != null) { "No audio track in this file" }
        extractor.selectTrack(trackIndex)

        val mime = format.getString(MediaFormat.KEY_MIME)!!
        val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        val channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        val durationUs = if (format.containsKey(MediaFormat.KEY_DURATION)) {
            format.getLong(MediaFormat.KEY_DURATION)
        } else {
            0L
        }

        val codec = MediaCodec.createDecoderByType(mime)
        codec.configure(format, null, null, 0)
        codec.start()

        scratch.parentFile?.mkdirs()
        val pcmOut = BufferedOutputStream(scratch.outputStream(), 1 shl 16)
        val monoChunks = ArrayList<FloatArray>()
        var monoTotal = 0
        val info = MediaCodec.BufferInfo()
        var inputDone = false
        var outputDone = false

        try {
            while (!outputDone) {
                if (!inputDone) {
                    val index = codec.dequeueInputBuffer(TIMEOUT_US)
                    if (index >= 0) {
                        val buffer = codec.getInputBuffer(index)!!
                        val size = extractor.readSampleData(buffer, 0)
                        if (size < 0) {
                            codec.queueInputBuffer(index, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            inputDone = true
                        } else {
                            codec.queueInputBuffer(index, 0, size, extractor.sampleTime, 0)
                            if (durationUs > 0) {
                                onProgress((extractor.sampleTime.toFloat() / durationUs).coerceIn(0f, 1f))
                            }
                            extractor.advance()
                        }
                    }
                }

                val outIndex = codec.dequeueOutputBuffer(info, TIMEOUT_US)
                if (outIndex >= 0) {
                    if (info.size > 0) {
                        val buffer = codec.getOutputBuffer(outIndex)!!
                        buffer.position(info.offset)
                        buffer.limit(info.offset + info.size)

                        val raw = ByteArray(info.size)
                        buffer.get(raw)
                        pcmOut.write(raw)

                        buffer.position(info.offset)
                        val shorts = buffer.order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
                        val frames = shorts.remaining() / channels
                        val chunk = FloatArray(frames)
                        var frame = 0
                        while (frame < frames) {
                            var sum = 0f
                            for (channel in 0 until channels) sum += shorts.get() / 32768f
                            chunk[frame] = sum / channels
                            frame++
                        }
                        monoChunks.add(chunk)
                        monoTotal += frames
                    }
                    codec.releaseOutputBuffer(outIndex, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) outputDone = true
                }
            }
        } finally {
            pcmOut.flush()
            pcmOut.close()
            runCatching { codec.stop() }
            runCatching { codec.release() }
            runCatching { extractor.release() }
        }

        val mono = FloatArray(monoTotal)
        var cursor = 0
        for (chunk in monoChunks) {
            chunk.copyInto(mono, cursor)
            cursor += chunk.size
        }
        onProgress(1f)

        return DecodedAudio(
            mono = mono,
            sampleRate = sampleRate,
            channels = channels,
            pcmFile = scratch,
            durationSeconds = if (sampleRate > 0) monoTotal.toFloat() / sampleRate else 0f,
        )
    }

    /** Title and artist tags, used to prefill the clip's text. */
    fun readTags(context: Context, uri: Uri): Pair<String, String> {
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(context, uri)
            val title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE).orEmpty()
            val artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST).orEmpty()
            title to artist
        } catch (error: Throwable) {
            "" to ""
        } finally {
            runCatching { retriever.release() }
        }
    }

    /** Embedded cover art, when the file has any. */
    fun readCoverArt(context: Context, uri: Uri): Bitmap? {
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(context, uri)
            retriever.embeddedPicture?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
        } catch (error: Throwable) {
            null
        } finally {
            runCatching { retriever.release() }
        }
    }
}
