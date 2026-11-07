package com.sonara.studio.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.sonara.studio.di.ServiceLocator
import com.sonara.studio.util.Notifications
import kotlinx.coroutines.delay

/**
 * Watches one backend job until it reaches a terminal state, mirroring progress into Room
 * so the UI stays live even if the app was killed, and downloading finished audio.
 */
class GenerationWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val jobId = inputData.getString(KEY_JOB_ID) ?: return Result.failure()
        val parentId = inputData.getString(KEY_PARENT_ID)
        val role = inputData.getString(KEY_ROLE)
        val repo = ServiceLocator.musicRepository(applicationContext)
        val notificationId = jobId.hashCode() and 0x0FFFFFFF

        var attempt = 0
        var consecutiveErrors = 0
        var lastStage: String? = null

        while (attempt < MAX_POLLS) {
            if (isStopped) return Result.success()
            val polled = repo.pollJob(jobId)
            val response = polled.getOrNull()
            if (response == null) {
                consecutiveErrors++
                if (consecutiveErrors >= MAX_ERRORS) {
                    val message = polled.exceptionOrNull()?.message ?: "Backend unreachable"
                    repo.failJob(jobId, message)
                    Notifications.cancel(applicationContext, notificationId)
                    Notifications.done(applicationContext, notificationId, "Generation failed", message)
                    return Result.failure()
                }
                delay(backoff(consecutiveErrors))
                attempt++
                continue
            }
            consecutiveErrors = 0
            repo.updateJob(response)
            if (response.clips.isNotEmpty()) {
                repo.ingest(response, parentId = parentId, role = role)
            }

            val percent = (response.progress * 100).toInt()
            val stage = response.stage ?: response.status
            if (stage != lastStage || percent % 5 == 0) {
                lastStage = stage
                Notifications.progress(
                    applicationContext,
                    notificationId,
                    "Creating your song",
                    describe(stage, response.queuePosition),
                    percent,
                )
            }

            when (response.status) {
                "succeeded" -> {
                    val songs = repo.ingest(response, parentId = parentId, role = role)
                    Notifications.cancel(applicationContext, notificationId)
                    Notifications.done(
                        applicationContext,
                        notificationId,
                        songs.firstOrNull()?.title ?: "Song ready",
                        if (songs.size > 1) "${songs.size} versions ready to play" else "Ready to play",
                    )
                    return Result.success()
                }
                "failed", "cancelled" -> {
                    Notifications.cancel(applicationContext, notificationId)
                    Notifications.done(
                        applicationContext,
                        notificationId,
                        "Generation failed",
                        response.error ?: "The backend could not finish this job",
                    )
                    return Result.failure()
                }
            }
            delay(POLL_INTERVAL_MS)
            attempt++
        }
        repo.failJob(jobId, "Timed out waiting for the backend")
        Notifications.cancel(applicationContext, notificationId)
        return Result.failure()
    }

    private fun describe(stage: String, queuePosition: Int?): String = when (stage) {
        "queued" -> queuePosition?.let { "Queued (position $it)" } ?: "Queued"
        "running", "processing" -> "Composing audio"
        "lyrics" -> "Writing lyrics"
        "vocals" -> "Rendering vocals"
        "mixing" -> "Mixing and mastering"
        "encoding" -> "Encoding audio"
        else -> stage.replaceFirstChar { it.uppercase() }
    }

    private fun backoff(errors: Int): Long = (2000L * errors).coerceAtMost(15000L)

    companion object {
        const val TAG = "sonara-generation"
        const val KEY_JOB_ID = "job_id"
        const val KEY_PARENT_ID = "parent_id"
        const val KEY_ROLE = "role"
        private const val POLL_INTERVAL_MS = 2500L
        private const val MAX_POLLS = 400
        private const val MAX_ERRORS = 6
    }
}
