package com.pulse.studio.work

import android.content.Context
import android.net.Uri
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.pulse.studio.di.ServiceLocator
import com.pulse.studio.render.ClipRenderer
import com.pulse.studio.render.RenderStage
import com.pulse.studio.util.Notifications
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

/**
 * Renders one clip in the background.
 *
 * Progress is published into a flow by the render loop and persisted by a separate
 * coroutine, so database writes never stall the frame loop. State lives in Room, so
 * a render that is interrupted shows up as failed rather than as a clip stuck at 40%.
 */
class RenderWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val clipId = inputData.getString(KEY_CLIP_ID) ?: return Result.failure()
        val repo = ServiceLocator.clipRepository(applicationContext)
        val clip = repo.clip(clipId) ?: return Result.failure()
        val spec = repo.specOf(clip)
        val notificationId = clipId.hashCode() and 0x0FFFFFFF

        val published = MutableStateFlow(RenderStage.Decoding to 0f)

        return coroutineScope {
            val reporter = launch {
                var lastPercent = -1
                while (true) {
                    val (stage, value) = published.value
                    val overall = overallProgress(stage, value)
                    val percent = (overall * 100).toInt()
                    if (percent != lastPercent) {
                        lastPercent = percent
                        repo.markRendering(clipId, stage.name.lowercase(), overall)
                        Notifications.progress(
                            applicationContext,
                            notificationId,
                            clip.title.ifBlank { "Your clip" },
                            describe(stage),
                            percent,
                        )
                    }
                    delay(400)
                }
            }
            try {
                val rendered = ClipRenderer(applicationContext).render(
                    audioUri = Uri.parse(clip.sourceUri),
                    spec = spec,
                    coverBitmap = if (spec.useCover) repo.loadCover(clip.coverPath) else null,
                    output = repo.outputFileFor(clipId),
                    onProgress = { stage, value -> published.value = stage to value },
                )
                repo.markReady(
                    id = clipId,
                    file = rendered.file,
                    thumb = rendered.thumbnail,
                    width = rendered.width,
                    height = rendered.height,
                    duration = rendered.durationSeconds,
                    tempo = rendered.tempo,
                    beats = rendered.beats,
                    sections = rendered.sections,
                )
                Notifications.cancel(applicationContext, notificationId)
                Notifications.done(
                    applicationContext,
                    notificationId,
                    clip.title.ifBlank { "Clip ready" },
                    "${rendered.width}x${rendered.height} · " +
                        "${rendered.durationSeconds.toInt()}s · ${rendered.tempo.toInt()} bpm",
                )
                Result.success()
            } catch (cancellation: CancellationException) {
                repo.markFailed(clipId, "Render cancelled")
                Notifications.cancel(applicationContext, notificationId)
                throw cancellation
            } catch (error: Throwable) {
                repo.markFailed(clipId, error.message ?: error::class.java.simpleName)
                Notifications.cancel(applicationContext, notificationId)
                Notifications.done(
                    applicationContext,
                    notificationId,
                    "Render failed",
                    error.message ?: "Something went wrong while making this clip",
                )
                Result.failure()
            } finally {
                reporter.cancel()
            }
        }
    }

    /** Weighted so the bar moves at a believable rate across the three real stages. */
    private fun overallProgress(stage: RenderStage, value: Float): Float = when (stage) {
        RenderStage.Decoding -> value * 0.12f
        RenderStage.Analysing -> 0.12f + value * 0.10f
        RenderStage.Rendering -> 0.22f + value * 0.74f
        RenderStage.Finishing -> 0.96f + value * 0.04f
    }

    private fun describe(stage: RenderStage): String = when (stage) {
        RenderStage.Decoding -> "Reading the audio"
        RenderStage.Analysing -> "Finding the beat"
        RenderStage.Rendering -> "Painting frames"
        RenderStage.Finishing -> "Writing the video"
    }

    companion object {
        const val TAG = "pulse-render"
        const val KEY_CLIP_ID = "clip_id"
    }
}
