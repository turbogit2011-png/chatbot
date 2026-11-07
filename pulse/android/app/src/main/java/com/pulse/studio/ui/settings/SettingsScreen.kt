package com.pulse.studio.ui.settings

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.pulse.studio.data.prefs.PulseSettings
import com.pulse.studio.data.prefs.SettingsRepository
import com.pulse.studio.data.repo.ClipRepository
import com.pulse.studio.di.ServiceLocator
import com.pulse.studio.ui.components.GlassCard
import com.pulse.studio.ui.components.SectionLabel
import com.pulse.studio.ui.components.TagChip
import com.pulse.studio.util.formatBytes
import com.pulse.studio.visual.AspectRatio
import com.pulse.studio.visual.Palette
import com.pulse.studio.visual.Quality
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val settings: SettingsRepository,
    private val repo: ClipRepository,
) : ViewModel() {

    val config: StateFlow<PulseSettings> = settings.settings
        .stateIn(viewModelScope, SharingStarted.Eagerly, PulseSettings())

    val clipCount: StateFlow<Int> = repo.readyCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    fun storageBytes(): Long = repo.storageBytes()

    fun setPalette(value: String) = viewModelScope.launch { settings.setPalette(value) }
    fun setAspect(value: String) = viewModelScope.launch { settings.setAspect(value) }
    fun setQuality(value: String) = viewModelScope.launch { settings.setQuality(value) }
    fun setFps(value: Int) = viewModelScope.launch { settings.setFps(value) }
    fun setShowText(value: Boolean) = viewModelScope.launch { settings.setShowText(value) }
    fun setShowProgress(value: Boolean) = viewModelScope.launch { settings.setShowProgress(value) }

    companion object {
        fun factory(context: Context): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                SettingsViewModel(
                    ServiceLocator.settings(context),
                    ServiceLocator.clipRepository(context),
                )
            }
        }
    }
}

@Composable
fun SettingsScreen(viewModel: SettingsViewModel, contentPadding: PaddingValues) {
    val config by viewModel.config.collectAsState()
    val count by viewModel.clipCount.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item { Text("Settings", style = MaterialTheme.typography.headlineMedium) }

        item {
            GlassCard {
                Column {
                    SectionLabel("Defaults for new clips")
                    Spacer(Modifier.height(12.dp))
                    Text("Shape", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        AspectRatio.entries.forEach { aspect ->
                            TagChip(aspect.id, selected = config.aspectId == aspect.id) {
                                viewModel.setAspect(aspect.id)
                            }
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("Quality", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Quality.entries.forEach { quality ->
                            TagChip(quality.label, selected = config.qualityId == quality.id) {
                                viewModel.setQuality(quality.id)
                            }
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("Frame rate", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(24, 30, 60).forEach { fps ->
                            TagChip("$fps", selected = config.fps == fps) { viewModel.setFps(fps) }
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("Colours", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Palette.all.forEach { palette ->
                            TagChip(palette.name, selected = config.paletteId == palette.id) {
                                viewModel.setPalette(palette.id)
                            }
                        }
                    }
                }
            }
        }

        item {
            GlassCard {
                Column {
                    SectionLabel("Overlays")
                    ToggleRow(
                        "Title and artist",
                        "Burned into new clips by default",
                        config.showText,
                        viewModel::setShowText,
                    )
                    ToggleRow(
                        "Progress bar",
                        "A thin bar that tracks the song",
                        config.showProgress,
                        viewModel::setShowProgress,
                    )
                }
            }
        }

        item {
            GlassCard {
                Column {
                    SectionLabel("Storage")
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "${formatBytes(viewModel.storageBytes())} across $count finished clips.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Delete individual clips from their page. Anything you exported to the " +
                            "gallery is a separate copy and stays there.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        item {
            GlassCard {
                Column {
                    SectionLabel("About")
                    Spacer(Modifier.height(8.dp))
                    Text("Pulse Studio 1.0.0", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Everything happens on this device: the audio is decoded and analysed " +
                            "here, every frame is drawn here, and the video is encoded here. " +
                            "Nothing is uploaded and no account is needed.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun ToggleRow(title: String, subtitle: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.width(10.dp))
        Switch(checked = checked, onCheckedChange = onChange)
    }
}
