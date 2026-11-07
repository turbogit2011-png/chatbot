package com.sonara.studio.data.repo

import android.content.Context
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.sonara.studio.data.audio.AudioStore
import com.sonara.studio.data.local.JobDao
import com.sonara.studio.data.local.JobEntity
import com.sonara.studio.data.local.SongDao
import com.sonara.studio.data.local.SongEntity
import com.sonara.studio.data.prefs.EngineMode
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
import com.sonara.studio.data.remote.ModelsResponse
import com.sonara.studio.data.remote.parseServerUrl
import com.sonara.studio.engine.LocalClip
import com.sonara.studio.engine.LocalEngine
import com.sonara.studio.engine.SongSpec
import com.sonara.studio.work.GenerationWorker
import com.sonara.studio.work.LocalRenderWorker
import kotlinx.coroutines.flow.Flow
import java.io.File

class MusicRepository(
    private val context: Context,
    private val api: SonaraApi,
    private val songDao: SongDao,
    private val jobDao: JobDao,
    private val audioStore: AudioStore,
    private val settings: SettingsRepository,
    private val localEngine: LocalEngine,
) {

    private suspend fun onDevice(): Boolean = settings.snapshot().engineMode == EngineMode.Device

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

    /**
     * Frees space without destroying work.
     *
     * Only tracks that came from a server are removed, because those can be fetched
     * again. Songs rendered on this device exist nowhere else, so they are kept.
     */
    suspend fun clearDownloads(): Int {
        var removed = 0
        for (song in songDao.all()) {
            if (song.remoteAudioUrl.isNullOrBlank()) continue
            audioStore.deleteLocal(song)
            songDao.setLocalPath(song.id, null)
            songDao.setLocalCover(song.id, null)
            removed++
        }
        return removed
    }

    suspend fun deviceSongCount(): Int = songDao.all().count { it.remoteAudioUrl.isNullOrBlank() }

    // ---------------- backend ----------------

    suspend fun health(): Result<HealthResponse> {
        if (onDevice()) {
            return Result.success(
                HealthResponse(
                    status = "ok",
                    engine = "on-device",
                    version = "1.1.0",
                    device = android.os.Build.MODEL ?: "this phone",
                    queueDepth = jobDao.activeNow().size,
                )
            )
        }
        return runCatching { api.health() }
    }

    suspend fun models(): Result<List<ModelDto>> {
        if (onDevice()) return Result.success(listOf(DEVICE_MODEL))
        return runCatching { api.models().models }
    }

    suspend fun writeLyrics(prompt: String, language: String, style: String?): Result<LyricsResponse> {
        if (onDevice()) {
            val written = localEngine.writeLyrics(prompt, style, language)
            return Result.success(
                LyricsResponse(
                    title = written.title,
                    lyrics = written.lyrics,
                    styleTags = written.styleTags,
                )
            )
        }
        return runCatching { api.lyrics(LyricsRequest(prompt = prompt, language = language, style = style)) }
    }

    suspend fun submitGenerate(request: GenerateRequest): Result<String> = runCatching {
        if (onDevice()) {
            val spec = request.toSpec()
            return@runCatching startLocalJob(
                kind = "generate",
                spec = spec,
                title = request.title,
                prompt = request.prompt,
                style = request.style,
                lyrics = request.lyrics,
                instrumental = request.instrumental,
                variations = request.numVariations,
            )
        }
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
        if (onDevice()) {
            val parent = songDao.byId(request.clipId)
            val spec = localEngine.specFromJson(parent?.specJson)
                ?: throw IllegalStateException("This track was not made on this device, so it cannot be extended here")
            return@runCatching startLocalJob(
                kind = "extend",
                spec = spec,
                title = "Extension",
                prompt = parent?.prompt,
                style = request.style,
                lyrics = request.lyrics,
                instrumental = spec.instrumental,
                variations = 1,
                parentId = request.clipId,
                extras = mapOf(
                    LocalRenderWorker.KEY_EXTEND_AT to request.continueAtSeconds,
                    LocalRenderWorker.KEY_EXTEND_LYRICS to request.lyrics.orEmpty(),
                    LocalRenderWorker.KEY_EXTEND_STYLE to request.style.orEmpty(),
                    LocalRenderWorker.KEY_EXTEND_SECONDS to request.durationSeconds,
                ),
            )
        }
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
        if (onDevice()) {
            val parent = request.clipId?.let { songDao.byId(it) }
            val spec = localEngine.specFromJson(parent?.specJson)
                ?: throw IllegalStateException("This track was not made on this device, so it cannot be covered here")
            return@runCatching startLocalJob(
                kind = "cover",
                spec = spec,
                title = "Cover",
                prompt = request.style,
                style = request.style,
                lyrics = request.lyrics,
                instrumental = spec.instrumental,
                variations = request.numVariations,
                parentId = request.clipId,
                extras = mapOf(LocalRenderWorker.KEY_COVER_STYLE to request.style),
            )
        }
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
        if (onDevice()) {
            val parent = songDao.byId(clipId)
            val spec = localEngine.specFromJson(parent?.specJson)
                ?: throw IllegalStateException("This track was not made on this device, so its stems are not available")
            return@runCatching startLocalJob(
                kind = "stems",
                spec = spec,
                title = "Stems",
                prompt = parent?.prompt,
                style = parent?.style,
                lyrics = null,
                instrumental = true,
                variations = 1,
                parentId = clipId,
            )
        }
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

    /** Server-side jobs only; on-device renders are owned by their worker. */
    suspend fun activeJobIds(): List<String> =
        jobDao.activeNow().map { it.id }.filterNot { it.startsWith("local-") }

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

    // ------------------------------------------------- on-device rendering

    private suspend fun startLocalJob(
        kind: String,
        spec: SongSpec,
        title: String?,
        prompt: String?,
        style: String?,
        lyrics: String?,
        instrumental: Boolean,
        variations: Int,
        parentId: String? = null,
        extras: Map<String, Any> = emptyMap(),
    ): String {
        val jobId = "local-" + java.util.UUID.randomUUID().toString().take(12)
        jobDao.insert(
            JobEntity(
                id = jobId,
                status = "running",
                progress = 0f,
                stage = "queued",
                title = title,
                prompt = prompt,
                style = style,
                lyrics = lyrics,
                instrumental = instrumental,
                model = DEVICE_MODEL.id,
                kind = kind,
            )
        )
        val builder = Data.Builder()
            .putString(LocalRenderWorker.KEY_JOB_ID, jobId)
            .putString(LocalRenderWorker.KEY_KIND, kind)
            .putString(LocalRenderWorker.KEY_SPEC, localEngine.specToJson(spec))
            .putInt(LocalRenderWorker.KEY_VARIATIONS, variations.coerceIn(1, 4))
            .putString(LocalRenderWorker.KEY_PARENT_ID, parentId)
        extras.forEach { (key, value) ->
            when (value) {
                is Int -> builder.putInt(key, value)
                is Float -> builder.putFloat(key, value)
                is String -> builder.putString(key, value)
            }
        }
        val request = OneTimeWorkRequestBuilder<LocalRenderWorker>()
            .setInputData(builder.build())
            .addTag(LocalRenderWorker.TAG)
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork("sonara-local-$jobId", ExistingWorkPolicy.KEEP, request)
        return jobId
    }

    suspend fun updateLocalJob(jobId: String, progress: Float, stage: String) {
        jobDao.updateProgress(jobId, "running", progress.coerceIn(0f, 1f), stage, null)
    }

    suspend fun storeLocalClips(
        jobId: String,
        clips: List<LocalClip>,
        parentId: String?,
        prompt: String?,
        style: String?,
    ): List<SongEntity> {
        val entities = clips.map { clip ->
            SongEntity(
                id = clip.id,
                jobId = jobId,
                title = clip.title,
                prompt = prompt,
                lyrics = clip.lyrics,
                style = style,
                styleTags = clip.tags,
                model = DEVICE_MODEL.id,
                durationSeconds = clip.durationSeconds,
                instrumental = clip.instrumental,
                variant = clip.variant,
                role = clip.role,
                parentId = parentId,
                remoteAudioUrl = null,
                localPath = clip.file.absolutePath,
                coverUrl = null,
                localCoverPath = clip.coverFile?.absolutePath,
                seed = clip.seed,
                specJson = clip.specJson,
            )
        }
        songDao.upsert(entities)
        jobDao.updateProgress(jobId, "succeeded", 1f, "done", null)
        return entities
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

    private fun GenerateRequest.toSpec(): SongSpec = SongSpec(
        prompt = prompt.orEmpty(),
        style = style.orEmpty(),
        lyrics = if (instrumental) "" else lyrics.orEmpty(),
        title = title,
        durationSeconds = durationSeconds.coerceIn(20, DEVICE_MODEL.maxDurationSeconds),
        instrumental = instrumental,
        weirdness = weirdness,
        styleWeight = styleWeight,
        lyricsWeight = lyricsWeight,
        tempoBpm = tempoBpm,
        vocalGender = vocalGender,
        seed = seed ?: 0L,
    )

    companion object {
        val DEVICE_MODEL = ModelDto(
            id = "sonara-device-v1",
            name = "On-device engine",
            description = "Renders on this phone — no server, no internet, works offline",
            maxDurationSeconds = 600,
            supportsVocals = true,
            supportsExtend = true,
            supportsStems = true,
            engine = "on-device",
        )
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
