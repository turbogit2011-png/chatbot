package com.pulse.studio.ui.create

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.pulse.studio.data.local.ClipEntity
import com.pulse.studio.data.prefs.SettingsRepository
import com.pulse.studio.data.repo.ClipRepository
import com.pulse.studio.di.ServiceLocator
import com.pulse.studio.visual.AspectRatio
import com.pulse.studio.visual.ClipSpec
import com.pulse.studio.visual.Quality
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File

data class CreateUiState(
    val audioUri: String? = null,
    val audioName: String = "",
    val durationSeconds: Float = 0f,
    val title: String = "",
    val artist: String = "",
    val styleId: String = "auto",
    val paletteId: String = "neon",
    val aspectId: String = "9:16",
    val qualityId: String = "720",
    val fps: Int = 30,
    val showText: Boolean = true,
    val showProgress: Boolean = true,
    val useCover: Boolean = true,
    val hasCover: Boolean = false,
    val wholeTrack: Boolean = true,
    val clipSeconds: Int = 30,
    val inspecting: Boolean = false,
    val submitting: Boolean = false,
    val message: String? = null,
) {
    val ready: Boolean get() = audioUri != null && !inspecting && !submitting
    val aspect: AspectRatio get() = AspectRatio.byId(aspectId)
    val quality: Quality get() = Quality.byId(qualityId)
    val renderSeconds: Float
        get() = if (wholeTrack || durationSeconds <= 0f) durationSeconds
        else minOf(durationSeconds, clipSeconds.toFloat())
}

class CreateViewModel(
    private val context: Context,
    private val repo: ClipRepository,
    private val settings: SettingsRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CreateUiState())
    val state: StateFlow<CreateUiState> = _state.asStateFlow()

    private var coverFile: File? = null

    val working: StateFlow<List<ClipEntity>> = repo.observeWorking()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        viewModelScope.launch {
            val config = settings.snapshot()
            _state.value = _state.value.copy(
                styleId = config.styleId,
                paletteId = config.paletteId,
                aspectId = config.aspectId,
                qualityId = config.qualityId,
                fps = config.fps,
                showText = config.showText,
                showProgress = config.showProgress,
                useCover = config.useCover,
            )
        }
    }

    fun pickAudio(uri: Uri) {
        _state.value = _state.value.copy(inspecting = true, audioUri = uri.toString(), message = null)
        viewModelScope.launch {
            // Hold onto read access: the render runs later, in a worker.
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri,
                    android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION,
                )
            }
            val name = displayName(uri)
            val (title, artist, cover) = repo.inspect(uri)
            val duration = durationOf(uri)
            coverFile = cover?.let { repo.saveCover(it, "pick-" + System.currentTimeMillis()) }
            cover?.recycle()
            _state.value = _state.value.copy(
                inspecting = false,
                audioName = name,
                durationSeconds = duration,
                title = title.ifBlank { name.substringBeforeLast('.') },
                artist = artist,
                hasCover = coverFile != null,
            )
        }
    }

    fun pickCover(uri: Uri) {
        viewModelScope.launch {
            runCatching {
                val bitmap = context.contentResolver.openInputStream(uri)?.use {
                    android.graphics.BitmapFactory.decodeStream(it)
                }
                if (bitmap != null) {
                    coverFile = repo.saveCover(bitmap, "cover-" + System.currentTimeMillis())
                    bitmap.recycle()
                    _state.value = _state.value.copy(hasCover = coverFile != null, useCover = true)
                }
            }
        }
    }

    fun clearCover() {
        coverFile = null
        _state.value = _state.value.copy(hasCover = false)
    }

    fun setTitle(value: String) = update { it.copy(title = value.take(60)) }
    fun setArtist(value: String) = update { it.copy(artist = value.take(40)) }
    fun setStyle(value: String) = update { it.copy(styleId = value) }.also { persist { settings.setStyle(value) } }
    fun setPalette(value: String) = update { it.copy(paletteId = value) }.also { persist { settings.setPalette(value) } }
    fun setAspect(value: String) = update { it.copy(aspectId = value) }.also { persist { settings.setAspect(value) } }
    fun setQuality(value: String) = update { it.copy(qualityId = value) }.also { persist { settings.setQuality(value) } }
    fun setFps(value: Int) = update { it.copy(fps = value) }.also { persist { settings.setFps(value) } }
    fun setShowText(value: Boolean) = update { it.copy(showText = value) }.also { persist { settings.setShowText(value) } }
    fun setShowProgress(value: Boolean) = update { it.copy(showProgress = value) }.also { persist { settings.setShowProgress(value) } }
    fun setUseCover(value: Boolean) = update { it.copy(useCover = value) }.also { persist { settings.setUseCover(value) } }
    fun setWholeTrack(value: Boolean) = update { it.copy(wholeTrack = value) }
    fun setClipSeconds(value: Int) = update { it.copy(clipSeconds = value.coerceIn(10, 600)) }
    fun consumeMessage() = update { it.copy(message = null) }

    fun create(onQueued: () -> Unit) {
        val current = _state.value
        val uri = current.audioUri ?: return
        _state.value = current.copy(submitting = true)
        viewModelScope.launch {
            val spec = ClipSpec(
                styleId = current.styleId,
                paletteId = current.paletteId,
                aspectId = current.aspectId,
                qualityId = current.qualityId,
                fps = current.fps,
                title = current.title.trim(),
                artist = current.artist.trim(),
                showText = current.showText,
                showProgress = current.showProgress,
                useCover = current.useCover && current.hasCover,
                startSeconds = 0f,
                endSeconds = if (current.wholeTrack) 0f else current.renderSeconds,
                seed = System.currentTimeMillis(),
            )
            runCatching { repo.enqueue(Uri.parse(uri), spec, coverFile.takeIf { spec.useCover }) }
                .onSuccess {
                    _state.value = _state.value.copy(
                        submitting = false,
                        message = "Rendering started — you can leave this screen.",
                    )
                    onQueued()
                }
                .onFailure { error ->
                    _state.value = _state.value.copy(
                        submitting = false,
                        message = error.message ?: "Could not start the render",
                    )
                }
        }
    }

    private fun displayName(uri: Uri): String {
        val cursor = context.contentResolver.query(uri, null, null, null, null) ?: return "audio"
        return cursor.use {
            val index = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && it.moveToFirst()) it.getString(index) ?: "audio" else "audio"
        }
    }

    private fun durationOf(uri: Uri): Float {
        val retriever = android.media.MediaMetadataRetriever()
        return try {
            retriever.setDataSource(context, uri)
            val raw = retriever.extractMetadata(
                android.media.MediaMetadataRetriever.METADATA_KEY_DURATION,
            )
            (raw?.toLongOrNull() ?: 0L) / 1000f
        } catch (error: Throwable) {
            0f
        } finally {
            runCatching { retriever.release() }
        }
    }

    private fun update(block: (CreateUiState) -> CreateUiState) {
        _state.value = block(_state.value)
    }

    private fun persist(block: suspend () -> Unit) {
        viewModelScope.launch { block() }
    }

    companion object {
        fun factory(context: Context): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                CreateViewModel(
                    context = context.applicationContext,
                    repo = ServiceLocator.clipRepository(context),
                    settings = ServiceLocator.settings(context),
                )
            }
        }
    }
}
