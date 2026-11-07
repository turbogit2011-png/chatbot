package com.sonara.studio.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.sonara.studio.di.ServiceLocator
import com.sonara.studio.engine.LocalClip
import com.sonara.studio.util.Notifications
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay

/**
 * Runs a render on the device itself.
 *
 * Same contract as the server path: the job's progress lives in Room, so the UI keeps
 * working if the app is backgrounded or killed mid-render, and a notification tracks
 * the work.
 */
class LocalRenderWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val jobId = inputData.getString(KEY_JOB_ID) ?: return Result.failure()
        val kind = inputData.getString(KEY_KIND) ?: "generate"
        val specJson = inputData.getString(KEY_SPEC) ?: return Result.failure()
        val repo = ServiceLocator.musicRepository(applicationContext)
        val engine = ServiceLocator.localEngine(applicationContext)
        val spec = engine.specFromJson(specJson) ?: return Result.failure()
        val notificationId = jobId.hashCode() and 0x0FFFFFFF

        // The renderer is a tight CPU loop, so it only publishes progress into a flow;
        // a separate coroutine persists it, which keeps database writes off that loop.
        val published = MutableStateFlow(0f to "queued")
        val progress: (Float, String) -> Unit = { value, stage -> published.value = value to stage }

        return coroutineScope {
            val reporter = launch {
                var lastPercent = -1
                while (true) {
                    val (value, stage) = published.value
                    val percent = (value * 100).toInt()
                    if (percent != lastPercent) {
                        lastPercent = percent
                        repo.updateLocalJob(jobId, value, stage)
                        Notifications.progress(
                            applicationContext,
                            notificationId,
                            when (kind) {
                                "extend" -> "Extending your song"
                                "cover" -> "Rendering a cover"
                                "stems" -> "Splitting stems"
                                else -> "Creating your song"
                            },
                            stage.replaceFirstChar { it.uppercase() },
                            percent,
                        )
                    }
                    delay(400)
                }
            }
            try {
                val clips: List<LocalClip> = when (kind) {
                "extend" -> listOf(
                    engine.extend(
                        parent = spec,
                        continueAtSeconds = inputData.getFloat(KEY_EXTEND_AT, 0f),
                        lyrics = inputData.getString(KEY_EXTEND_LYRICS).orEmpty(),
                        style = inputData.getString(KEY_EXTEND_STYLE).orEmpty(),
                        addedSeconds = inputData.getInt(KEY_EXTEND_SECONDS, 120),
                        onProgress = progress,
                    )
                )
                "cover" -> engine.cover(
                    parent = spec,
                    newStyle = inputData.getString(KEY_COVER_STYLE).orEmpty(),
                    variations = inputData.getInt(KEY_VARIATIONS, 2),
                    onProgress = progress,
                )
                "stems" -> engine.stems(spec, progress)
                else -> engine.generate(spec, inputData.getInt(KEY_VARIATIONS, 2), progress)
            }

            val stored = repo.storeLocalClips(
                jobId = jobId,
                clips = clips,
                parentId = inputData.getString(KEY_PARENT_ID),
                prompt = spec.prompt,
                style = spec.style,
            )
            Notifications.cancel(applicationContext, notificationId)
            Notifications.done(
                applicationContext,
                notificationId,
                stored.firstOrNull()?.title ?: "Song ready",
                if (stored.size > 1) "${stored.size} versions ready to play" else "Ready to play",
            )
            Result.success()
        } catch (cancellation: kotlinx.coroutines.CancellationException) {
            throw cancellation
        } catch (error: Throwable) {
            repo.failJob(jobId, error.message ?: error::class.java.simpleName)
            Notifications.cancel(applicationContext, notificationId)
            Notifications.done(
                applicationContext,
                notificationId,
                "Render failed",
                error.message ?: "The on-device engine could not finish this track",
            )
                Result.failure()
            } finally {
                reporter.cancel()
            }
        }
    }

    companion object {
        const val TAG = "sonara-local-render"
        const val KEY_JOB_ID = "job_id"
        const val KEY_KIND = "kind"
        const val KEY_SPEC = "spec"
        const val KEY_VARIATIONS = "variations"
        const val KEY_PARENT_ID = "parent_id"
        const val KEY_EXTEND_AT = "extend_at"
        const val KEY_EXTEND_LYRICS = "extend_lyrics"
        const val KEY_EXTEND_STYLE = "extend_style"
        const val KEY_EXTEND_SECONDS = "extend_seconds"
        const val KEY_COVER_STYLE = "cover_style"
    }
}
