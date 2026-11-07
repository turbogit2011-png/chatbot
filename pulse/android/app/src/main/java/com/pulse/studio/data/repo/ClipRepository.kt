package com.pulse.studio.data.repo

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.pulse.studio.audio.AudioDecoder
import com.pulse.studio.data.local.ClipDao
import com.pulse.studio.data.local.ClipEntity
import com.pulse.studio.visual.ClipSpec
import com.pulse.studio.work.RenderWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.io.File
import java.util.UUID

/** The single place that owns clips: the database, the files and the render queue. */
class ClipRepository(
    private val context: Context,
    private val dao: ClipDao,
) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    private val clipsDir: File get() = File(context.filesDir, "clips").apply { mkdirs() }
    private val coversDir: File get() = File(context.filesDir, "covers").apply { mkdirs() }

    fun observeAll(): Flow<List<ClipEntity>> = dao.observeAll()
    fun observeFavorites(): Flow<List<ClipEntity>> = dao.observeFavorites()
    fun observeWorking(): Flow<List<ClipEntity>> = dao.observeWorking()
    fun observeClip(id: String): Flow<ClipEntity?> = dao.observeById(id)
    fun readyCount(): Flow<Int> = dao.readyCount()

    suspend fun clip(id: String): ClipEntity? = dao.byId(id)
    suspend fun toggleFavorite(clip: ClipEntity) = dao.setFavorite(clip.id, !clip.favorite)
    suspend fun rename(id: String, title: String) = dao.rename(id, title.trim().ifBlank { "Untitled clip" })

    suspend fun delete(clip: ClipEntity) {
        clip.filePath?.let { runCatching { File(it).delete() } }
        clip.thumbPath?.let { runCatching { File(it).delete() } }
        clip.coverPath?.let { runCatching { File(it).delete() } }
        dao.delete(clip.id)
    }

    fun specOf(clip: ClipEntity): ClipSpec =
        runCatching { json.decodeFromString(ClipSpec.serializer(), clip.specJson) }.getOrElse { ClipSpec() }

    /** Reads tags and embedded artwork so the create screen can prefill itself. */
    suspend fun inspect(uri: Uri): Triple<String, String, Bitmap?> = withContext(Dispatchers.IO) {
        val (title, artist) = AudioDecoder.readTags(context, uri)
        val cover = AudioDecoder.readCoverArt(context, uri)
        Triple(title, artist, cover)
    }

    suspend fun saveCover(bitmap: Bitmap, id: String): File? = withContext(Dispatchers.IO) {
        runCatching {
            val file = File(coversDir, "$id.jpg")
            // 1024 px is plenty for a square on a 1080p frame and keeps memory sane
            val side = minOf(1024, maxOf(bitmap.width, bitmap.height))
            val scaled = Bitmap.createScaledBitmap(bitmap, side, side * bitmap.height / bitmap.width, true)
            file.outputStream().use { scaled.compress(Bitmap.CompressFormat.JPEG, 90, it) }
            if (scaled !== bitmap) scaled.recycle()
            file
        }.getOrNull()
    }

    fun loadCover(path: String?): Bitmap? =
        path?.takeIf { File(it).exists() }?.let { BitmapFactory.decodeFile(it) }

    suspend fun enqueue(
        sourceUri: Uri,
        spec: ClipSpec,
        coverFile: File?,
    ): String {
        val id = "clip-" + UUID.randomUUID().toString().take(10)
        dao.upsert(
            ClipEntity(
                id = id,
                title = spec.title.ifBlank { "Untitled clip" },
                artist = spec.artist,
                sourceUri = sourceUri.toString(),
                specJson = json.encodeToString(ClipSpec.serializer(), spec),
                coverPath = coverFile?.absolutePath,
                status = ClipEntity.STATUS_QUEUED,
                stage = "queued",
            )
        )
        val request = OneTimeWorkRequestBuilder<RenderWorker>()
            .setInputData(workDataOf(RenderWorker.KEY_CLIP_ID to id))
            .addTag(RenderWorker.TAG)
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork("pulse-render-$id", ExistingWorkPolicy.KEEP, request)
        return id
    }

    fun outputFileFor(id: String): File = File(clipsDir, "$id.mp4")

    suspend fun markRendering(id: String, stage: String, progress: Float) {
        dao.updateProgress(id, ClipEntity.STATUS_RENDERING, stage, progress.coerceIn(0f, 1f), null)
    }

    suspend fun markFailed(id: String, message: String) {
        dao.updateProgress(id, ClipEntity.STATUS_FAILED, "failed", 0f, message)
    }

    suspend fun markReady(
        id: String,
        file: File,
        thumb: File?,
        width: Int,
        height: Int,
        duration: Float,
        tempo: Float,
        beats: Int,
        sections: Int,
    ) {
        val existing = dao.byId(id) ?: return
        dao.upsert(
            existing.copy(
                filePath = file.absolutePath,
                thumbPath = thumb?.absolutePath,
                width = width,
                height = height,
                durationSeconds = duration,
                tempo = tempo,
                beats = beats,
                sections = sections,
                status = ClipEntity.STATUS_READY,
                stage = "done",
                progress = 1f,
                error = null,
            )
        )
    }

    fun storageBytes(): Long = (clipsDir.walkTopDown() + coversDir.walkTopDown())
        .filter { it.isFile }
        .sumOf { it.length() }

    /** Copies a finished clip into the device's Movies folder so the gallery sees it. */
    suspend fun exportToGallery(clip: ClipEntity): Uri? = withContext(Dispatchers.IO) {
        val source = clip.filePath?.let(::File)?.takeIf { it.exists() } ?: return@withContext null
        val safeTitle = clip.title.replace(Regex("[^\\p{L}\\p{N} _.-]"), "").trim().ifBlank { "Pulse clip" }
        val values = ContentValues().apply {
            put(MediaStore.Video.Media.DISPLAY_NAME, "$safeTitle.mp4")
            put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
            put(MediaStore.Video.Media.TITLE, clip.title)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/Pulse")
                put(MediaStore.Video.Media.IS_PENDING, 1)
            }
        }
        val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        } else {
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI
        }
        val resolver = context.contentResolver
        val uri = resolver.insert(collection, values) ?: return@withContext null
        runCatching {
            resolver.openOutputStream(uri)?.use { out -> source.inputStream().use { it.copyTo(out) } }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear()
                values.put(MediaStore.Video.Media.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
            }
            uri
        }.getOrElse {
            runCatching { resolver.delete(uri, null, null) }
            null
        }
    }
}
