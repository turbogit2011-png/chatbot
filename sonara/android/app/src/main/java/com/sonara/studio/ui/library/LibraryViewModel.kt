package com.sonara.studio.ui.library

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.sonara.studio.data.local.SongEntity
import com.sonara.studio.data.repo.MusicRepository
import com.sonara.studio.di.ServiceLocator
import com.sonara.studio.player.PlayerController
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class LibraryFilter { All, Favorites, Downloaded }

data class LibraryUiState(
    val query: String = "",
    val filter: LibraryFilter = LibraryFilter.All,
    val message: String? = null,
)

class LibraryViewModel(
    private val repo: MusicRepository,
    private val player: PlayerController,
) : ViewModel() {

    private val _ui = MutableStateFlow(LibraryUiState())
    val ui: StateFlow<LibraryUiState> = _ui.asStateFlow()

    @OptIn(ExperimentalCoroutinesApi::class)
    val songs: StateFlow<List<SongEntity>> = _ui
        .flatMapLatest { state ->
            val source = when (state.filter) {
                LibraryFilter.All -> repo.observeLibrary()
                LibraryFilter.Favorites -> repo.observeFavorites()
                LibraryFilter.Downloaded -> repo.observeDownloaded()
            }
            if (state.query.isBlank()) {
                source
            } else {
                combine(source, repo.search(state.query)) { all, matches ->
                    val ids = matches.map { it.id }.toSet()
                    all.filter { ids.contains(it.id) }
                }
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setQuery(value: String) {
        _ui.value = _ui.value.copy(query = value)
    }

    fun setFilter(filter: LibraryFilter) {
        _ui.value = _ui.value.copy(filter = filter)
    }

    fun consumeMessage() {
        _ui.value = _ui.value.copy(message = null)
    }

    fun play(song: SongEntity) {
        viewModelScope.launch {
            val ready = repo.ensureDownloaded(song) ?: song
            if (ready.playbackUri == null) {
                _ui.value = _ui.value.copy(message = "This track has no audio yet.")
                return@launch
            }
            val queue = songs.value.ifEmpty { listOf(ready) }
            player.play(ready, queue)
        }
    }

    fun toggleFavorite(song: SongEntity) {
        viewModelScope.launch { repo.toggleFavorite(song) }
    }

    fun delete(song: SongEntity) {
        viewModelScope.launch {
            repo.delete(song)
            _ui.value = _ui.value.copy(message = "Deleted \"${song.title}\"")
        }
    }

    companion object {
        fun factory(context: Context): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                LibraryViewModel(
                    repo = ServiceLocator.musicRepository(context),
                    player = ServiceLocator.playerController(context),
                )
            }
        }
    }
}
