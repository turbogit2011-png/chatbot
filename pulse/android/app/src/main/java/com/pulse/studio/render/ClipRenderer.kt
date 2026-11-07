package com.pulse.studio.render

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import com.pulse.studio.audio.AudioDecoder
import com.pulse.studio.audio.AudioAnalyzer
import com.pulse.studio.visual.ClipSpec
import com.pulse.studio.visual.Director
import kotlinx.coroutines.ensureActive
import java.io.File
import kotlin.coroutines.coroutineContext

/** What a finished render produced. */
class RenderedClip(
    val file: File,
    val thumbnail: File?,
    val width: Int,
    val height: Int,
    val durationSeconds: Float,
    val tempo: Float,
    val beats: Int,
    val sections: Int,
)

/** Progress stages, reported so the UI can say something more useful than a number. */
enum class RenderStage { Decoding, Analysing, Rendering, Finishing }

/**
 * Runs the whole pipeline for one clip: decode the audio, analyse it, draw every
 * frame and encode the result next to the original soundtrack.
 *
 * The frame loop never holds more than a single bitmap and one pixel buffer, so
 * memory does not grow with the length of the song.
 */
class ClipRenderer(private val context: Context) {

    suspend fun render(
        audioUri: Uri,
        spec: ClipSpec,
        coverBitmap: Bitmap?,
        output: File,
        onProgress: (RenderStage, Float) -> Unit,
    ): RenderedClip {
        val scratchDir = File(context.cacheDir, "render").apply { mkdirs() }
        val pcmFile = File(scratchDir, "source-${System.currentTimeMillis()}.pcm")
        val audioFile = File(scratchDir, "audio-${System.currentTimeMillis()}.m4a")

        try {
            onProgress(RenderStage.Decoding, 0f)
            val decoded = AudioDecoder.decode(context, audioUri, pcmFile) { value ->
                onProgress(RenderStage.Decoding, value)
            }
            coroutineContext.ensureActive()

            onProgress(RenderStage.Analysing, 0f)
            val features = AudioAnalyzer.analyze(decoded.mono, decoded.sampleRate, spec.title) { value ->
                onProgress(RenderStage.Analysing, value)
            }
            coroutineContext.ensureActive()

            val (width, height) = spec.aspect.sizeFor(spec.quality.shortSide)
            val cover = coverBitmap?.let { AndroidImage(it) }
            val director = Director(features, spec, width, height, cover)

            AudioTrackEncoder.encode(
                pcm = pcmFile,
                sampleRate = decoded.sampleRate,
                channels = decoded.channels,
                startSeconds = director.startSeconds,
                durationSeconds = director.durationSeconds,
                output = audioFile,
            )
            coroutineContext.ensureActive()

            val canvas = AndroidFrameCanvas(width, height)
            val pixels = IntArray(width * height)
            val writer = VideoWriter(
                output = output,
                width = width,
                height = height,
                fps = spec.fps,
                bitRate = spec.quality.bitRate,
                audioTrackFile = audioFile,
            )

            var thumbnail: File? = null
            try {
                for (frame in 0 until director.frameCount) {
                    coroutineContext.ensureActive()
                    director.renderFrame(canvas, frame)
                    canvas.readPixels(pixels)
                    writer.writeFrame(pixels)

                    // a frame from a quarter of the way in makes a better poster than
                    // the first frame, which is usually still fading in
                    if (thumbnail == null && frame == director.frameCount / 4) {
                        thumbnail = saveThumbnail(canvas.bitmap, output)
                    }
                    if (frame % 10 == 0) {
                        onProgress(RenderStage.Rendering, frame.toFloat() / director.frameCount)
                    }
                }
                onProgress(RenderStage.Finishing, 0.9f)
                writer.finish()
            } catch (error: Throwable) {
                writer.abort()
                throw error
            } finally {
                canvas.recycle()
            }

            onProgress(RenderStage.Finishing, 1f)
            return RenderedClip(
                file = output,
                thumbnail = thumbnail,
                width = width,
                height = height,
                durationSeconds = director.durationSeconds,
                tempo = features.tempo,
                beats = features.beats.size,
                sections = features.sections.size,
            )
        } finally {
            pcmFile.delete()
            audioFile.delete()
        }
    }

    private fun saveThumbnail(bitmap: Bitmap, clip: File): File? = runCatching {
        val dir = File(context.filesDir, "thumbs").apply { mkdirs() }
        val file = File(dir, clip.nameWithoutExtension + ".jpg")
        val scaled = Bitmap.createScaledBitmap(bitmap, bitmap.width / 2, bitmap.height / 2, true)
        file.outputStream().use { scaled.compress(Bitmap.CompressFormat.JPEG, 85, it) }
        scaled.recycle()
        file
    }.getOrNull()
}
