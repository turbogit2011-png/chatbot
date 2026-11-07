package com.sonara.studio.player

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Bundle
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.MoreExecutors
import com.sonara.studio.data.local.SongEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

data class PlaybackState(
    val currentId: String? = null,
    val title: String = "",
    val subtitle: String = "",
    val artworkUri: String? = null,
    val isPlaying: Boolean = false,
    val isBuffering: Boolean = false,
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val repeatOne: Boolean = false,
    val shuffle: Boolean = false,
    val queueSize: Int = 0,
    val queueIndex: Int = 0,
) {
    val progress: Float
        get() = if (durationMs > 0) (positionMs.toFloat() / durationMs).coerceIn(0f, 1f) else 0f
}

/**
 * Thin wrapper over the Media3 session so Compose can observe playback as state
 * without any screen holding a Player reference directly.
 */
class PlayerController(private val context: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val _state = MutableStateFlow(PlaybackState())
    val state: StateFlow<PlaybackState> = _state.asStateFlow()

    private var controller: MediaController? = null
    private var pendingQueue: List<SongEntity>? = null
    private var pendingIndex: Int = 0
    private var pendingPlay: Boolean = false
    private var onSongStarted: ((String) -> Unit)? = null

    private val listener = object : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) = publish()
    }

    fun setOnSongStarted(block: (String) -> Unit) {
        onSongStarted = block
    }

    fun connect() {
        if (controller != null) return
        val token = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        val future = MediaController.Builder(context, token).buildAsync()
        future.addListener({
            runCatching { future.get() }.onSuccess { media ->
                controller = media
                media.addListener(listener)
                pendingQueue?.let { queue ->
                    submit(queue, pendingIndex, pendingPlay)
                    pendingQueue = null
                }
                publish()
                startTicker()
            }
        }, MoreExecutors.directExecutor())
    }

    fun release() {
        controller?.removeListener(listener)
        controller?.release()
        controller = null
    }

    private fun startTicker() {
        scope.launch {
            while (controller != null) {
                publish()
                delay(500)
            }
        }
    }

    fun play(song: SongEntity, queue: List<SongEntity> = listOf(song)) {
        val index = queue.indexOfFirst { it.id == song.id }.coerceAtLeast(0)
        val media = controller
        if (media == null) {
            pendingQueue = queue
            pendingIndex = index
            pendingPlay = true
            connect()
            return
        }
        submit(queue, index, true)
    }

    private fun submit(queue: List<SongEntity>, index: Int, playNow: Boolean) {
        val media = controller ?: return
        val items = queue.mapNotNull { it.toMediaItem() }
        if (items.isEmpty()) return
        media.setMediaItems(items, index.coerceIn(0, items.lastIndex), 0L)
        media.prepare()
        media.playWhenReady = playNow
        queue.getOrNull(index)?.let { onSongStarted?.invoke(it.id) }
        publish()
    }

    fun togglePlayPause() {
        val media = controller ?: return
        if (media.isPlaying) media.pause() else media.play()
        publish()
    }

    fun pause() = controller?.pause().also { publish() }

    fun seekTo(ms: Long) {
        controller?.seekTo(ms.coerceAtLeast(0))
        publish()
    }

    fun seekBy(deltaMs: Long) {
        val media = controller ?: return
        media.seekTo((media.currentPosition + deltaMs).coerceIn(0, maxOf(media.duration, 0)))
        publish()
    }

    fun next() {
        controller?.seekToNextMediaItem()
        publish()
    }

    fun previous() {
        val media = controller ?: return
        if (media.currentPosition > 3000) media.seekTo(0) else media.seekToPreviousMediaItem()
        publish()
    }

    fun toggleRepeat() {
        val media = controller ?: return
        media.repeatMode = if (media.repeatMode == Player.REPEAT_MODE_ONE) {
            Player.REPEAT_MODE_OFF
        } else {
            Player.REPEAT_MODE_ONE
        }
        publish()
    }

    fun toggleShuffle() {
        val media = controller ?: return
        media.shuffleModeEnabled = !media.shuffleModeEnabled
        publish()
    }

    fun stop() {
        controller?.stop()
        controller?.clearMediaItems()
        _state.value = PlaybackState()
    }

    private fun publish() {
        val media = controller
        if (media == null) {
            return
        }
        val item = media.currentMediaItem
        val metadata = item?.mediaMetadata
        _state.value = PlaybackState(
            currentId = item?.mediaId,
            title = metadata?.title?.toString() ?: "",
            subtitle = metadata?.artist?.toString() ?: "",
            artworkUri = metadata?.artworkUri?.toString(),
            isPlaying = media.isPlaying,
            isBuffering = media.playbackState == Player.STATE_BUFFERING,
            positionMs = media.currentPosition.coerceAtLeast(0),
            durationMs = media.duration.takeIf { it > 0 } ?: 0L,
            repeatOne = media.repeatMode == Player.REPEAT_MODE_ONE,
            shuffle = media.shuffleModeEnabled,
            queueSize = media.mediaItemCount,
            queueIndex = media.currentMediaItemIndex,
        )
    }
}

fun SongEntity.toMediaItem(): MediaItem? {
    val source = localPath?.takeIf { File(it).exists() }?.let { Uri.fromFile(File(it)) }
        ?: remoteAudioUrl?.let(Uri::parse)
        ?: return null
    val artwork = localCoverPath?.takeIf { File(it).exists() }?.let { Uri.fromFile(File(it)) }
        ?: coverUrl?.let(Uri::parse)
    val metadata = MediaMetadata.Builder()
        .setTitle(title)
        .setArtist(if (tagLine.isNotBlank()) tagLine else "Sonara Studio")
        .setAlbumTitle("Sonara Studio")
        .setArtworkUri(artwork)
        .setIsBrowsable(false)
        .setIsPlayable(true)
        .setExtras(Bundle().apply { putString("song_id", id) })
        .build()
    return MediaItem.Builder()
        .setMediaId(id)
        .setUri(source)
        .setMediaMetadata(metadata)
        .build()
}
