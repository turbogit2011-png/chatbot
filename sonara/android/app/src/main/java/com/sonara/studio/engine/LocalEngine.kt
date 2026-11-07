package com.sonara.studio.engine

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.io.File
import kotlin.coroutines.coroutineContext
import kotlin.random.Random

/** A track produced on the device. */
data class LocalClip(
    val id: String,
    val title: String,
    val file: File,
    val coverFile: File?,
    val durationSeconds: Float,
    val tags: List<String>,
    val lyrics: String?,
    val instrumental: Boolean,
    val variant: Int,
    val seed: Long,
    val role: String,
    val specJson: String,
)

/**
 * Runs the composer on the device and turns its output into playable files.
 *
 * Rendering, encoding and cover art all happen here with no network and no server:
 * audio is streamed straight from the composer into the AAC encoder, so memory stays
 * flat however long the track is.
 */
class LocalEngine(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val songsDir: File get() = File(context.filesDir, "songs").apply { mkdirs() }
    private val coversDir: File get() = File(context.filesDir, "covers").apply { mkdirs() }
    private val workDir: File get() = File(context.cacheDir, "render").apply { mkdirs() }

    val modelId = "sonara-device-v1"
    val modelName = "On-device engine"

    suspend fun generate(
        spec: SongSpec,
        variations: Int,
        onProgress: (Float, String) -> Unit,
    ): List<LocalClip> = withContext(Dispatchers.Default) {
        val baseSeed = if (spec.seed != 0L) spec.seed else Random.nextLong(1, Long.MAX_VALUE)
        val count = variations.coerceIn(1, 4)
        val clips = ArrayList<LocalClip>(count)
        for (index in 0 until count) {
            coroutineContext.ensureActive()
            val variantSpec = spec.copy(seed = baseSeed + index * 7919L, variant = index + 1)
            val from = index.toFloat() / count
            val to = (index + 1).toFloat() / count
            clips += renderOne(variantSpec, role = "song") { value, stage ->
                onProgress(from + (to - from) * value, stage)
            }
        }
        clips
    }

    suspend fun cover(
        parent: SongSpec,
        newStyle: String,
        variations: Int,
        onProgress: (Float, String) -> Unit,
    ): List<LocalClip> {
        val spec = parent.copy(
            style = newStyle,
            prompt = newStyle,
            title = null,
            seed = Random.nextLong(1, Long.MAX_VALUE),
        )
        return generate(spec, variations, onProgress)
    }

    /**
     * Renders the original from its stored spec, keeps everything up to the cut point
     * and crossfades a freshly rendered continuation onto it. Both halves are streamed
     * from disk, so joining two long tracks costs a couple of megabytes of memory.
     */
    suspend fun extend(
        parent: SongSpec,
        continueAtSeconds: Float,
        lyrics: String,
        style: String,
        addedSeconds: Int,
        onProgress: (Float, String) -> Unit,
    ): LocalClip = withContext(Dispatchers.Default) {
        val headFile = File(workDir, "head-${System.currentTimeMillis()}.wav")
        val tailFile = File(workDir, "tail-${System.currentTimeMillis()}.wav")
        try {
            onProgress(0.02f, "rebuilding the original")
            renderWav(parent, headFile) { value, _ -> onProgress(0.02f + value * 0.38f, "rebuilding the original") }

            val continuation = parent.copy(
                lyrics = lyrics.ifBlank { "" },
                style = style.ifBlank { parent.style },
                instrumental = parent.instrumental || lyrics.isBlank(),
                durationSeconds = addedSeconds.coerceIn(10, 600),
                title = null,
                seed = Random.nextLong(1, Long.MAX_VALUE),
            )
            onProgress(0.42f, "writing the new section")
            renderWav(continuation, tailFile) { value, _ -> onProgress(0.42f + value * 0.4f, "writing the new section") }

            onProgress(0.85f, "joining sections")
            val id = "ext-" + java.util.UUID.randomUUID().toString().take(10)
            val (target, duration) = encodeOrWav(id) { sink ->
                joinWithCrossfade(headFile, tailFile, continueAtSeconds, sink)
            }

            val title = (parent.title ?: "Extended") + " (extended)"
            val cover = CoverArtist.render(File(coversDir, "$id.jpg"), title, id, parent.style.split(",").map { it.trim() })
            onProgress(1f, "done")
            LocalClip(
                id = id,
                title = title,
                file = target,
                coverFile = cover,
                durationSeconds = duration,
                tags = parent.style.split(",").map { it.trim() }.filter { it.isNotEmpty() }.take(8),
                lyrics = (parent.lyrics + "\n" + lyrics).trim().ifBlank { null },
                instrumental = parent.instrumental,
                variant = 1,
                seed = continuation.seed,
                role = "extension",
                specJson = json.encodeToString(SongSpec.serializer(), continuation),
            )
        } finally {
            headFile.delete()
            tailFile.delete()
        }
    }

    /** Re-renders the song and keeps each mixer bus as its own file. */
    suspend fun stems(
        parent: SongSpec,
        onProgress: (Float, String) -> Unit,
    ): List<LocalClip> = withContext(Dispatchers.Default) {
        val id = "stem-" + java.util.UUID.randomUUID().toString().take(8)
        val writers = LinkedHashMap<String, WavWriter>()
        val files = LinkedHashMap<String, File>()
        val scratch = HashMap<String, FloatArray>()

        val silentSink = object : PcmSink {
            override fun write(interleaved: FloatArray, frames: Int) = Unit
        }
        val composer = Composer(parent)
        onProgress(0.05f, "separating buses")
        val result = composer.render(
            sink = silentSink,
            stemSink = { name, buffer, frames ->
                val writer = writers.getOrPut(name) {
                    val file = File(workDir, "$id-$name.wav")
                    files[name] = file
                    WavWriter(file)
                }
                val stereo = scratch.getOrPut(name) { FloatArray(frames * 2) }
                    .let { if (it.size < frames * 2) FloatArray(frames * 2).also { a -> scratch[name] = a } else it }
                for (i in 0 until frames) {
                    val value = buffer[i].coerceIn(-1f, 1f)
                    stereo[i * 2] = value
                    stereo[i * 2 + 1] = value
                }
                writer.write(stereo, frames)
            },
            onProgress = { value -> onProgress(0.05f + value * 0.75f, "separating buses") },
        )
        writers.values.forEach { it.close() }

        val clips = ArrayList<LocalClip>()
        var index = 0
        for ((name, wav) in files) {
            coroutineContext.ensureActive()
            index++
            onProgress(0.8f + 0.2f * index / files.size, "encoding $name")
            val stemId = "$id-$name"
            val (target, duration) = encodeOrWav(stemId) { sink -> streamWav(wav, sink) }
            wav.delete()
            if (duration <= 0.5f) {
                target.delete()
                continue
            }
            clips += LocalClip(
                id = stemId,
                title = name.replaceFirstChar { it.uppercase() },
                file = target,
                coverFile = null,
                durationSeconds = duration,
                tags = listOf(name),
                lyrics = null,
                instrumental = name != "vocals",
                variant = 1,
                seed = parent.seed,
                role = "stem",
                specJson = json.encodeToString(SongSpec.serializer(), parent),
            )
        }
        onProgress(1f, "done")
        clips.ifEmpty { throw IllegalStateException("This track produced no separable buses") }
        clips
    }

    fun writeLyrics(prompt: String, style: String?, language: String): LyricsWriter.Result =
        LyricsWriter.write(prompt, style, language)

    fun specFromJson(raw: String?): SongSpec? =
        raw?.takeIf { it.isNotBlank() }?.let {
            runCatching { json.decodeFromString(SongSpec.serializer(), it) }.getOrNull()
        }

    fun specToJson(spec: SongSpec): String = json.encodeToString(SongSpec.serializer(), spec)

    // ------------------------------------------------------------------ internals

    private suspend fun renderOne(
        spec: SongSpec,
        role: String,
        onProgress: (Float, String) -> Unit,
    ): LocalClip {
        coroutineContext.ensureActive()
        val id = "dev-" + java.util.UUID.randomUUID().toString().take(10)
        val rendered = renderToFile(id, spec) { value -> onProgress(value * 0.94f, "rendering") }
        val target = rendered.first
        val result = rendered.second
        onProgress(0.96f, "cover art")
        val cover = CoverArtist.render(File(coversDir, "$id.jpg"), result.title, id, result.tags)
        onProgress(1f, "done")
        return LocalClip(
            id = id,
            title = result.title,
            file = target,
            coverFile = cover,
            durationSeconds = result.durationSeconds,
            tags = result.tags,
            lyrics = if (result.hasVocals) spec.lyrics.ifBlank { null } else null,
            instrumental = !result.hasVocals,
            variant = spec.variant,
            seed = spec.seed,
            role = role,
            specJson = specToJson(spec),
        )
    }

    /**
     * Encodes to AAC/.m4a, which every Android device can produce and play.
     *
     * If the hardware encoder refuses the stream — some devices are fussy about
     * configuration — the track is re-rendered to an uncompressed .wav rather than
     * failing the job. A larger file is a much better outcome than no song.
     */
    private fun renderToFile(
        id: String,
        spec: SongSpec,
        onProgress: (Float) -> Unit,
    ): Pair<File, RenderResult> {
        val m4a = File(songsDir, "$id.m4a")
        try {
            val encoder = AacEncoder(m4a)
            val result = try {
                Composer(spec).render(sink = encoder, onProgress = onProgress)
            } finally {
                encoder.close()
            }
            if (m4a.length() > 1024) return m4a to result
            m4a.delete()
        } catch (error: Throwable) {
            if (error is kotlinx.coroutines.CancellationException) throw error
            m4a.delete()
        }
        val wav = File(songsDir, "$id.wav")
        val writer = WavWriter(wav)
        val result = try {
            Composer(spec).render(sink = writer, onProgress = onProgress)
        } finally {
            writer.close()
        }
        return wav to result
    }

    private fun renderWav(spec: SongSpec, file: File, onProgress: (Float, String) -> Unit): Float {
        val writer = WavWriter(file)
        try {
            Composer(spec).render(sink = writer, onProgress = { onProgress(it, "rendering") })
        } finally {
            writer.close()
        }
        return writer.durationSeconds
    }

    /** Runs [produce] into an AAC encoder, falling back to .wav if that encoder fails. */
    private fun encodeOrWav(id: String, produce: (PcmSink) -> Float): Pair<File, Float> {
        val m4a = File(songsDir, "$id.m4a")
        try {
            val encoder = AacEncoder(m4a)
            val seconds = try {
                produce(encoder)
            } finally {
                encoder.close()
            }
            if (m4a.length() > 1024) return m4a to seconds
            m4a.delete()
        } catch (error: Throwable) {
            if (error is kotlinx.coroutines.CancellationException) throw error
            m4a.delete()
        }
        val wav = File(songsDir, "$id.wav")
        val writer = WavWriter(wav)
        val seconds = try {
            produce(writer)
        } finally {
            writer.close()
        }
        return wav to seconds
    }

    private fun streamWav(source: File, sink: PcmSink): Float = AudioJoin.stream(source, sink)

    private fun joinWithCrossfade(head: File, tail: File, cutSeconds: Float, sink: PcmSink): Float =
        AudioJoin.crossfade(head, tail, cutSeconds, sink)

    private companion object {
        const val BLOCK = 8192
    }
}
