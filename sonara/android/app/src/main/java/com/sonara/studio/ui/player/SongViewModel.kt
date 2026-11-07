package com.sonara.studio.ui.player

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.sonara.studio.data.local.SongEntity
import com.sonara.studio.data.remote.CoverRequest
import com.sonara.studio.data.remote.ExtendRequest
import com.sonara.studio.data.repo.MusicRepository
import com.sonara.studio.di.ServiceLocator
import com.sonara.studio.player.PlaybackState
import com.sonara.studio.player.PlayerController
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File

data class SongScreenState(
    val busy: Boolean = false,
    val message: String? = null,
    val exportedUri: String? = null,
    val sheet: SongSheet = SongSheet.None,
)

enum class SongSheet { None, Extend, Cover, Stems }

class SongViewModel(
    private val songId: String,
    private val repo: MusicRepository,
    private val player: PlayerController,
) : ViewModel() {

    val song: StateFlow<SongEntity?> = repo.observeSong(songId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val siblings: StateFlow<List<SongEntity>> = repo.observeLibrary()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val stems: StateFlow<List<SongEntity>> = repo.observeStems(songId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val playback: StateFlow<PlaybackState> = player.state

    private val _ui = MutableStateFlow(SongScreenState())
    val ui: StateFlow<SongScreenState> = _ui.asStateFlow()

    fun openSheet(sheet: SongSheet) {
        _ui.value = _ui.value.copy(sheet = sheet)
    }

    fun closeSheet() {
        _ui.value = _ui.value.copy(sheet = SongSheet.None)
    }

    fun consumeMessage() {
        _ui.value = _ui.value.copy(message = null)
    }

    fun playPause() {
        val current = song.value ?: return
        if (playback.value.currentId == current.id) {
            player.togglePlayPause()
        } else {
            viewModelScope.launch {
                val ready = repo.ensureDownloaded(current) ?: current
                if (ready.playbackUri == null) {
                    _ui.value = _ui.value.copy(message = "No audio available for this track yet.")
                    return@launch
                }
                player.play(ready, siblings.value.ifEmpty { listOf(ready) })
            }
        }
    }

    fun seekFraction(fraction: Float) {
        val duration = playback.value.durationMs
        if (duration > 0) player.seekTo((duration * fraction).toLong())
    }

    fun skipForward() = player.seekBy(15_000)
    fun skipBack() = player.seekBy(-15_000)
    fun next() = player.next()
    fun previous() = player.previous()
    fun toggleRepeat() = player.toggleRepeat()
    fun toggleShuffle() = player.toggleShuffle()

    fun toggleFavorite() {
        val current = song.value ?: return
        viewModelScope.launch { repo.toggleFavorite(current) }
    }

    fun rename(title: String) {
        viewModelScope.launch { repo.rename(songId, title) }
    }

    fun delete(onDone: () -> Unit) {
        val current = song.value ?: return
        viewModelScope.launch {
            repo.delete(current)
            onDone()
        }
    }

    fun download() {
        val current = song.value ?: return
        _ui.value = _ui.value.copy(busy = true)
        viewModelScope.launch {
            val result = repo.ensureDownloaded(current)
            _ui.value = _ui.value.copy(
                busy = false,
                message = if (result?.isDownloaded == true) "Saved for offline playback" else "Download failed",
            )
        }
    }

    fun exportToMusic() {
        val current = song.value ?: return
        _ui.value = _ui.value.copy(busy = true)
        viewModelScope.launch {
            val ready = repo.ensureDownloaded(current) ?: current
            val uri: Uri? = repo.exportToMusic(ready)
            _ui.value = _ui.value.copy(
                busy = false,
                exportedUri = uri?.toString(),
                message = if (uri != null) "Exported to Music/Sonara" else "Export failed",
            )
        }
    }

    fun localFile(): File? = song.value?.let { repo.localFileFor(it) }

    fun extend(continueAtSeconds: Float, lyrics: String, style: String, duration: Int) {
        val current = song.value ?: return
        _ui.value = _ui.value.copy(busy = true, sheet = SongSheet.None)
        viewModelScope.launch {
            repo.submitExtend(
                ExtendRequest(
                    clipId = current.id,
                    continueAtSeconds = continueAtSeconds,
                    lyrics = lyrics.ifBlank { null },
                    style = style.ifBlank { current.style },
                    durationSeconds = duration,
                    model = current.model ?: "sonara-v1",
                )
            ).onSuccess {
                _ui.value = _ui.value.copy(busy = false, message = "Extension queued")
            }.onFailure {
                _ui.value = _ui.value.copy(busy = false, message = it.message ?: "Could not extend")
            }
        }
    }

    fun cover(style: String, keepVocals: Boolean) {
        val current = song.value ?: return
        _ui.value = _ui.value.copy(busy = true, sheet = SongSheet.None)
        viewModelScope.launch {
            repo.submitCover(
                CoverRequest(
                    clipId = current.id,
                    style = style,
                    lyrics = current.lyrics,
                    keepVocals = keepVocals,
                    model = current.model ?: "sonara-v1",
                )
            ).onSuccess {
                _ui.value = _ui.value.copy(busy = false, message = "Cover queued")
            }.onFailure {
                _ui.value = _ui.value.copy(busy = false, message = it.message ?: "Could not create cover")
            }
        }
    }

    fun splitStems(mode: String) {
        val current = song.value ?: return
        _ui.value = _ui.value.copy(busy = true, sheet = SongSheet.None)
        viewModelScope.launch {
            repo.submitStems(current.id, mode)
                .onSuccess { _ui.value = _ui.value.copy(busy = false, message = "Stem split queued") }
                .onFailure {
                    _ui.value = _ui.value.copy(
                        busy = false,
                        message = it.message ?: "This engine cannot split stems",
                    )
                }
        }
    }

    companion object {
        fun factory(context: Context, songId: String): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                SongViewModel(
                    songId = songId,
                    repo = ServiceLocator.musicRepository(context),
                    player = ServiceLocator.playerController(context),
                )
            }
        }
    }
}
