package com.sonara.studio.data.repo

import android.content.Context
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.sonara.studio.data.audio.AudioStore
import com.sonara.studio.data.local.JobDao
import com.sonara.studio.data.local.JobEntity
import com.sonara.studio.data.local.SongDao
import com.sonara.studio.data.local.SongEntity
import com.sonara.studio.data.prefs.SettingsRepository
import com.sonara.studio.data.remote.ClipDto
import com.sonara.studio.data.remote.CoverRequest
import com.sonara.studio.data.remote.ExtendRequest
import com.sonara.studio.data.remote.GenerateRequest
import com.sonara.studio.data.remote.HealthResponse
import com.sonara.studio.data.remote.JobResponse
import com.sonara.studio.data.remote.LyricsRequest
import com.sonara.studio.data.remote.LyricsResponse
import com.sonara.studio.data.remote.ModelDto
import com.sonara.studio.data.remote.SonaraApi
import com.sonara.studio.data.remote.StemsRequest
import com.sonara.studio.data.remote.parseServerUrl
import com.sonara.studio.work.GenerationWorker
import kotlinx.coroutines.flow.Flow
import java.io.File

class MusicRepository(
    private val context: Context,
    private val api: SonaraApi,
    private val songDao: SongDao,
    private val jobDao: JobDao,
    private val audioStore: AudioStore,
    private val settings: SettingsRepository,
) {

    // ---------------- library ----------------

    fun observeLibrary(): Flow<List<SongEntity>> = songDao.observeAll()
    fun observeFavorites(): Flow<List<SongEntity>> = songDao.observeFavorites()
    fun observeDownloaded(): Flow<List<SongEntity>> = songDao.observeDownloaded()
    fun search(query: String): Flow<List<SongEntity>> = songDao.search(query)
    fun observeSong(id: String): Flow<SongEntity?> = songDao.observeById(id)
    fun observeJobSongs(jobId: String): Flow<List<SongEntity>> = songDao.observeByJob(jobId)
    fun observeStems(parentId: String): Flow<List<SongEntity>> = songDao.observeStems(parentId)
    fun observeActiveJobs(): Flow<List<JobEntity>> = jobDao.observeActive()
    fun observeRecentJobs(): Flow<List<JobEntity>> = jobDao.observeRecent()
    fun libraryCount(): Flow<Int> = songDao.count()

    suspend fun song(id: String): SongEntity? = songDao.byId(id)
    suspend fun toggleFavorite(song: SongEntity) = songDao.setFavorite(song.id, !song.favorite)
    suspend fun rename(id: String, title: String) = songDao.rename(id, title.trim().ifBlank { "Untitled" })
    suspend fun markPlayed(id: String) = songDao.markPlayed(id)

    suspend fun delete(song: SongEntity) {
        audioStore.deleteLocal(song)
        songDao.delete(song.id)
    }

    suspend fun exportToMusic(song: SongEntity) = audioStore.exportToMusic(song)

    fun localFileFor(song: SongEntity): File? = song.localPath?.let(::File)?.takeIf { it.exists() }

    suspend fun ensureDownloaded(song: SongEntity): SongEntity? {
        if (song.isDownloaded && File(song.localPath!!).exists()) return song
        val url = song.remoteAudioUrl ?: return null
        val file = audioStore.downloadAudio(absolute(url), song.id) ?: return null
        songDao.setLocalPath(song.id, file.absolutePath)
        return songDao.byId(song.id)
    }

    fun cacheBytes(): Long = audioStore.cacheBytes()

    suspend fun clearCache() {
        audioStore.clearCache()
        songDao.observeDownloaded()
        // local paths are no longer valid
        songDao.observeAll()
    }

    // ---------------- backend ----------------

    suspend fun health(): Result<HealthResponse> = runCatching { api.health() }

    suspend fun models(): Result<List<ModelDto>> = runCatching { api.models().models }

    suspend fun writeLyrics(prompt: String, language: String, style: String?): Result<LyricsResponse> =
        runCatching { api.lyrics(LyricsRequest(prompt = prompt, language = language, style = style)) }

    suspend fun submitGenerate(request: GenerateRequest): Result<String> = runCatching {
        val response = api.generate(request)
        jobDao.insert(
            JobEntity(
                id = response.id,
                status = response.status,
                progress = response.progress,
                stage = response.stage,
                title = request.title,
                prompt = request.prompt,
                style = request.style,
                lyrics = request.lyrics,
                instrumental = request.instrumental,
                model = request.model,
                kind = "generate",
            )
        )
        ingest(response)
        enqueueWatcher(response.id)
        response.id
    }

    suspend fun submitExtend(request: ExtendRequest): Result<String> = runCatching {
        val response = api.extend(request)
        jobDao.insert(
            JobEntity(
                id = response.id,
                status = response.status,
                progress = response.progress,
                title = "Extension",
                style = request.style,
                lyrics = request.lyrics,
                model = request.model,
                kind = "extend",
            )
        )
        ingest(response, parentId = request.clipId, role = "extension")
        enqueueWatcher(response.id, parentId = request.clipId, role = "extension")
        response.id
    }

    suspend fun submitCover(request: CoverRequest): Result<String> = runCatching {
        val response = api.cover(request)
        jobDao.insert(
            JobEntity(
                id = response.id,
                status = response.status,
                progress = response.progress,
                title = "Cover",
                style = request.style,
                lyrics = request.lyrics,
                model = request.model,
                kind = "cover",
            )
        )
        ingest(response, parentId = request.clipId)
        enqueueWatcher(response.id, parentId = request.clipId)
        response.id
    }

    suspend fun submitStems(clipId: String, mode: String): Result<String> = runCatching {
        val response = api.stems(StemsRequest(clipId = clipId, mode = mode))
        jobDao.insert(
            JobEntity(
                id = response.id,
                status = response.status,
                progress = response.progress,
                title = "Stems",
                kind = "stems",
            )
        )
        ingest(response, parentId = clipId, role = "stem")
        enqueueWatcher(response.id, parentId = clipId, role = "stem")
        response.id
    }

    suspend fun pollJob(id: String): Result<JobResponse> = runCatching { api.job(id) }

    suspend fun updateJob(response: JobResponse) {
        jobDao.updateProgress(
            id = response.id,
            status = response.status,
            progress = response.progress,
            stage = response.stage,
            error = response.error,
        )
    }

    suspend fun failJob(id: String, message: String) {
        jobDao.updateProgress(id, "failed", 0f, null, message)
    }

    suspend fun dismissJob(id: String) = jobDao.delete(id)

    suspend fun pruneJobs() = jobDao.pruneOlderThan(System.currentTimeMillis() - 7L * 24 * 3600 * 1000)

    suspend fun activeJobIds(): List<String> = jobDao.activeNow().map { it.id }

    /** Persists whatever clips the backend has produced so far; downloads audio when enabled. */
    suspend fun ingest(
        response: JobResponse,
        parentId: String? = null,
        role: String? = null,
    ): List<SongEntity> {
        if (response.clips.isEmpty()) return emptyList()
        val job = jobDao.byId(response.id)
        val autoDownload = settings.snapshot().autoDownload
        val entities = response.clips.map { clip ->
            val existing = songDao.byId(clip.id)
            clip.toEntity(
                jobId = response.id,
                prompt = job?.prompt,
                parentId = parentId ?: existing?.parentId,
                role = role ?: clip.role,
                existing = existing,
            )
        }
        songDao.upsert(entities)
        if (autoDownload) {
            entities.forEach { entity ->
                val url = entity.remoteAudioUrl ?: return@forEach
                if (entity.isDownloaded && File(entity.localPath!!).exists()) return@forEach
                val file = audioStore.downloadAudio(absolute(url), entity.id)
                if (file != null) songDao.setLocalPath(entity.id, file.absolutePath)
                entity.coverUrl?.let { cover ->
                    audioStore.downloadCover(absolute(cover), entity.id)?.let {
                        songDao.setLocalCover(entity.id, it.absolutePath)
                    }
                }
            }
        }
        return entities.mapNotNull { songDao.byId(it.id) }
    }

    /** Resolves relative URLs returned by the backend against the configured server. */
    suspend fun absolute(url: String): String {
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) return url
        val base = parseServerUrl(settings.snapshot().serverUrl) ?: return url
        return base.newBuilder().encodedPath("/" + url.trimStart('/')).build().toString()
    }

    private fun enqueueWatcher(jobId: String, parentId: String? = null, role: String? = null) {
        val request = OneTimeWorkRequestBuilder<GenerationWorker>()
            .setInputData(
                workDataOf(
                    GenerationWorker.KEY_JOB_ID to jobId,
                    GenerationWorker.KEY_PARENT_ID to parentId,
                    GenerationWorker.KEY_ROLE to role,
                )
            )
            .addTag(GenerationWorker.TAG)
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork("sonara-job-$jobId", ExistingWorkPolicy.KEEP, request)
    }
}

private fun ClipDto.toEntity(
    jobId: String,
    prompt: String?,
    parentId: String?,
    role: String,
    existing: SongEntity?,
): SongEntity = SongEntity(
    id = id,
    jobId = jobId,
    title = title.ifBlank { existing?.title ?: "Untitled" },
    prompt = prompt ?: existing?.prompt,
    lyrics = lyrics ?: existing?.lyrics,
    style = style ?: existing?.style,
    styleTags = if (styleTags.isNotEmpty()) styleTags else existing?.styleTags.orEmpty(),
    model = model ?: existing?.model,
    durationSeconds = if (durationSeconds > 0f) durationSeconds else existing?.durationSeconds ?: 0f,
    instrumental = instrumental,
    variant = variant,
    role = role,
    parentId = parentId,
    remoteAudioUrl = audioUrl ?: streamUrl ?: existing?.remoteAudioUrl,
    localPath = existing?.localPath,
    coverUrl = imageUrl ?: existing?.coverUrl,
    localCoverPath = existing?.localCoverPath,
    seed = seed ?: existing?.seed,
    createdAt = existing?.createdAt ?: System.currentTimeMillis(),
    favorite = existing?.favorite ?: false,
    playCount = existing?.playCount ?: 0,
    lastPlayedAt = existing?.lastPlayedAt,
)
