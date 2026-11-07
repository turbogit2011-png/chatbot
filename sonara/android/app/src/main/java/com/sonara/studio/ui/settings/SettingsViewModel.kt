package com.sonara.studio.ui.settings

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.sonara.studio.data.prefs.EngineMode
import com.sonara.studio.data.prefs.SettingsRepository
import com.sonara.studio.data.prefs.SonaraSettings
import com.sonara.studio.data.remote.ModelDto
import com.sonara.studio.data.repo.MusicRepository
import com.sonara.studio.di.ServiceLocator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class SettingsUiState(
    val checking: Boolean = false,
    val healthLine: String? = null,
    val healthy: Boolean? = null,
    val models: List<ModelDto> = emptyList(),
    val cacheBytes: Long = 0,
    val message: String? = null,
)

class SettingsViewModel(
    private val settings: SettingsRepository,
    private val repo: MusicRepository,
) : ViewModel() {

    val config: StateFlow<SonaraSettings> = settings.settings
        .stateIn(viewModelScope, SharingStarted.Eagerly, SonaraSettings())

    val libraryCount: StateFlow<Int> = repo.libraryCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    private val _ui = MutableStateFlow(SettingsUiState())
    val ui: StateFlow<SettingsUiState> = _ui.asStateFlow()

    init {
        refreshCache()
        testConnection()
    }

    fun setEngineMode(mode: EngineMode) = viewModelScope.launch {
        settings.setEngineMode(mode)
        testConnection()
    }

    fun setServerUrl(value: String) = viewModelScope.launch { settings.setServerUrl(value) }
    fun setApiKey(value: String) = viewModelScope.launch { settings.setApiKey(value) }
    fun setEngine(value: String) = viewModelScope.launch { settings.setEngine(value) }
    fun setDefaultModel(value: String) = viewModelScope.launch { settings.setDefaultModel(value) }
    fun setAutoDownload(value: Boolean) = viewModelScope.launch { settings.setAutoDownload(value) }
    fun setDuration(value: Int) = viewModelScope.launch { settings.setDefaultDuration(value) }
    fun setLanguage(value: String) = viewModelScope.launch { settings.setDefaultLanguage(value) }
    fun setDynamicColor(value: Boolean) = viewModelScope.launch { settings.setDynamicColor(value) }
    fun setWifiOnly(value: Boolean) = viewModelScope.launch { settings.setWifiOnlyDownloads(value) }
    fun completeOnboarding() = viewModelScope.launch { settings.setOnboarded(true) }

    fun consumeMessage() {
        _ui.value = _ui.value.copy(message = null)
    }

    fun refreshCache() {
        _ui.value = _ui.value.copy(cacheBytes = repo.cacheBytes())
    }

    fun clearDownloads() {
        viewModelScope.launch {
            val removed = repo.clearDownloads()
            val kept = repo.deviceSongCount()
            _ui.value = _ui.value.copy(
                cacheBytes = repo.cacheBytes(),
                message = when {
                    removed == 0 && kept > 0 ->
                        "Nothing to free — all $kept tracks were made on this phone and are kept."
                    removed == 0 -> "Nothing to free."
                    else -> "Freed $removed downloaded track(s); $kept made on this phone were kept."
                },
            )
        }
    }

    fun testConnection() {
        _ui.value = _ui.value.copy(checking = true, healthLine = null)
        viewModelScope.launch {
            repo.health()
                .onSuccess { health ->
                    _ui.value = _ui.value.copy(
                        checking = false,
                        healthy = true,
                        healthLine = buildString {
                            append("Connected")
                            if (health.engine.isNotBlank()) append(" · ${health.engine}")
                            if (health.device.isNotBlank()) append(" · ${health.device}")
                            if (health.version.isNotBlank()) append(" · v${health.version}")
                            if (health.queueDepth > 0) append(" · queue ${health.queueDepth}")
                        },
                    )
                }
                .onFailure { error ->
                    _ui.value = _ui.value.copy(
                        checking = false,
                        healthy = false,
                        healthLine = error.message ?: "Could not reach the server",
                    )
                }
            repo.models().onSuccess { models ->
                _ui.value = _ui.value.copy(models = models)
            }
        }
    }

    companion object {
        fun factory(context: Context): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                SettingsViewModel(
                    settings = ServiceLocator.settings(context),
                    repo = ServiceLocator.musicRepository(context),
                )
            }
        }
    }
}
