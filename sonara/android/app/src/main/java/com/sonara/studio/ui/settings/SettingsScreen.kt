package com.sonara.studio.ui.settings

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.sonara.studio.data.prefs.EngineMode
import com.sonara.studio.data.prefs.SonaraSettings
import com.sonara.studio.ui.components.GlassCard
import com.sonara.studio.ui.components.SectionLabel
import com.sonara.studio.ui.components.SliderRow
import com.sonara.studio.ui.components.TagChip
import com.sonara.studio.ui.create.Presets
import com.sonara.studio.util.formatBytes
import com.sonara.studio.util.formatDuration

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    contentPadding: PaddingValues,
    onMessage: (String) -> Unit,
) {
    val config by viewModel.config.collectAsState()
    val ui by viewModel.ui.collectAsState()
    val count by viewModel.libraryCount.collectAsState()
    var serverDraft by remember(config.serverUrl) { mutableStateOf(config.serverUrl) }
    var keyDraft by remember(config.apiKey) { mutableStateOf(config.apiKey) }
    var keyVisible by remember { mutableStateOf(false) }

    LaunchedEffect(ui.message) {
        ui.message?.let {
            onMessage(it)
            viewModel.consumeMessage()
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item { Text("Settings", style = MaterialTheme.typography.headlineMedium) }

        item {
            GlassCard {
                Column {
                    SectionLabel("Where songs are rendered")
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TagChip("On this phone", selected = config.engineMode == EngineMode.Device) {
                            viewModel.setEngineMode(EngineMode.Device)
                        }
                        TagChip("Sonara server", selected = config.engineMode == EngineMode.Server) {
                            viewModel.setEngineMode(EngineMode.Server)
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(
                        if (config.engineMode == EngineMode.Device) {
                            "Everything is generated on this device. No server, no internet, nothing leaves the phone. " +
                                "Vocals are synthesised rather than modelled — switch to a server with a GPU engine for sung vocals."
                        } else {
                            "Songs are rendered by a Sonara server you run. Give it an address the phone can actually reach: " +
                                "the same Wi-Fi as your computer, or a tunnel if you are on mobile data."
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        if (config.engineMode == EngineMode.Server) {
        item {
            GlassCard {
                Column {
                    SectionLabel("Server engine")
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = serverDraft,
                        onValueChange = { serverDraft = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Server address") },
                        placeholder = { Text(SonaraSettings.DEFAULT_SERVER_URL) },
                        supportingText = { Text("Your Sonara server, e.g. http://192.168.1.20:8000") },
                        leadingIcon = { Icon(Icons.Filled.Cloud, null) },
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true,
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = keyDraft,
                        onValueChange = { keyDraft = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("API key (optional)") },
                        visualTransformation = if (keyVisible) {
                            VisualTransformation.None
                        } else {
                            PasswordVisualTransformation()
                        },
                        trailingIcon = {
                            IconButton(onClick = { keyVisible = !keyVisible }) {
                                Icon(
                                    if (keyVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                                    "Toggle key visibility",
                                )
                            }
                        },
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true,
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(
                            onClick = {
                                viewModel.setServerUrl(serverDraft)
                                viewModel.setApiKey(keyDraft)
                                viewModel.testConnection()
                            },
                        ) { Text("Save & test") }
                        Spacer(Modifier.width(12.dp))
                        if (ui.checking) {
                            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        } else {
                            ui.healthLine?.let {
                                Text(
                                    it,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (ui.healthy == true) {
                                        MaterialTheme.colorScheme.secondary
                                    } else {
                                        MaterialTheme.colorScheme.error
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
        }

        if (ui.models.isNotEmpty()) {
            item {
                GlassCard {
                    Column {
                        SectionLabel("Default model")
                        Spacer(Modifier.height(10.dp))
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            ui.models.forEach { model ->
                                TagChip(model.name, selected = model.id == config.defaultModel) {
                                    viewModel.setDefaultModel(model.id)
                                }
                            }
                        }
                    }
                }
            }
        }

        item {
            GlassCard {
                Column {
                    SectionLabel("Defaults for new songs")
                    Spacer(Modifier.height(10.dp))
                    SliderRow(
                        label = "Length",
                        value = config.defaultDuration.toFloat(),
                        valueLabel = formatDuration(config.defaultDuration * 1000L),
                        range = 30f..300f,
                        onChange = { viewModel.setDuration(it.toInt() / 5 * 5) },
                    )
                    Spacer(Modifier.height(6.dp))
                    SectionLabel("Lyric language")
                    Spacer(Modifier.height(8.dp))
                    Row(
                        Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Presets.languages.forEach { (code, label) ->
                            TagChip(label, selected = config.defaultLanguage == code) {
                                viewModel.setLanguage(code)
                            }
                        }
                    }
                }
            }
        }

        item {
            GlassCard {
                Column {
                    SectionLabel("Storage & playback")
                    Spacer(Modifier.height(6.dp))
                    ToggleRow(
                        title = "Download finished songs",
                        subtitle = "Keeps every generation playable offline",
                        checked = config.autoDownload,
                        onChange = viewModel::setAutoDownload,
                    )
                    ToggleRow(
                        title = "Wi-Fi only downloads",
                        subtitle = "Avoids mobile data for audio files",
                        checked = config.wifiOnlyDownloads,
                        onChange = viewModel::setWifiOnly,
                    )
                    ToggleRow(
                        title = "Match system colors",
                        subtitle = "Use the device palette instead of the Sonara theme",
                        checked = config.dynamicColor,
                        onChange = viewModel::setDynamicColor,
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Audio on this device", style = MaterialTheme.typography.titleSmall)
                            Text(
                                "${formatBytes(ui.cacheBytes)} · $count tracks. Clearing frees only " +
                                    "tracks downloaded from a server — songs made on this phone are kept.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        OutlinedButton(onClick = viewModel::clearDownloads) { Text("Free space") }
                    }
                }
            }
        }

        item {
            GlassCard {
                Column {
                    SectionLabel("About")
                    Spacer(Modifier.height(8.dp))
                    Text("Sonara Studio 1.0.0", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Sonara is the client. The music is rendered by the Sonara server you point it at — " +
                            "run it on your own GPU box, a rented GPU, or bridge it to a hosted music API. " +
                            "Everything you generate stays in your library on this device.",
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
private fun ToggleRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
) {
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
