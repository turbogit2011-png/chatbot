package com.sonara.studio.ui.create

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.sonara.studio.data.local.JobEntity
import com.sonara.studio.ui.components.GlassCard
import com.sonara.studio.ui.components.GradientButton
import com.sonara.studio.ui.components.ProgressLine
import com.sonara.studio.ui.components.SectionLabel
import com.sonara.studio.ui.components.SliderRow
import com.sonara.studio.ui.components.TagChip
import com.sonara.studio.ui.theme.AuroraBrush

@Composable
fun CreateScreen(
    viewModel: CreateViewModel,
    contentPadding: PaddingValues,
    onOpenJob: (String) -> Unit,
    onMessage: (String) -> Unit,
) {
    val state by viewModel.state.collectAsState()
    val activeJobs by viewModel.activeJobs.collectAsState()

    LaunchedEffect(state.error, state.notice) {
        val message = state.error ?: state.notice
        if (message != null) {
            onMessage(message)
            viewModel.clearError()
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { Header(state, onRefresh = viewModel::refreshBackend) }

        item {
            ModeSwitch(state.mode, onSelect = viewModel::setMode)
        }

        if (state.mode == CreateMode.Simple) {
            item { SimplePanel(state, viewModel) }
            item { QuickPresets(viewModel) }
        } else {
            item { CustomPanel(state, viewModel) }
            item { StyleLibrary(state, viewModel) }
        }

        item { ModelPanel(state, viewModel) }
        item { AdvancedPanel(state, viewModel) }

        item {
            GradientButton(
                text = if (state.submitting) "Sending to the studio" else "Create song",
                modifier = Modifier.fillMaxWidth(),
                enabled = state.canSubmit,
                loading = state.submitting,
                icon = { Icon(Icons.Filled.AutoAwesome, null, tint = Color.White) },
                onClick = viewModel::generate,
            )
        }

        if (activeJobs.isNotEmpty()) {
            item { SectionLabel("In the studio") }
            items(activeJobs, key = { it.id }) { job ->
                JobCard(job, onOpen = { onOpenJob(job.id) }, onDismiss = { viewModel.dismissJob(job.id) })
            }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun Header(state: CreateUiState, onRefresh: () -> Unit) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(AuroraBrush),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.AutoAwesome, null, tint = Color.White, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Sonara Studio", style = MaterialTheme.typography.headlineSmall)
                val status = when (state.backendOnline) {
                    true -> "Engine online" + if (state.backendLabel.isNotBlank()) " · ${state.backendLabel}" else ""
                    false -> "Engine offline — check Settings"
                    null -> "Connecting to engine…"
                }
                Text(
                    status,
                    style = MaterialTheme.typography.bodySmall,
                    color = when (state.backendOnline) {
                        true -> MaterialTheme.colorScheme.secondary
                        false -> MaterialTheme.colorScheme.error
                        null -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }
            IconButton(onClick = onRefresh) {
                Icon(Icons.Filled.Refresh, "Refresh engine status")
            }
        }
    }
}

@Composable
private fun ModeSwitch(mode: CreateMode, onSelect: (CreateMode) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .padding(4.dp),
    ) {
        CreateMode.entries.forEach { option ->
            val selected = option == mode
            Box(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(13.dp))
                    .background(if (selected) Brush.linearGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.tertiary)) else Brush.linearGradient(listOf(Color.Transparent, Color.Transparent)))
                    .clickable { onSelect(option) }
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    if (option == CreateMode.Simple) "Describe it" else "Full control",
                    style = MaterialTheme.typography.labelLarge,
                    color = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun SimplePanel(state: CreateUiState, viewModel: CreateViewModel) {
    GlassCard {
        Column {
            SectionLabel("Song description")
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.prompt,
                onValueChange = viewModel::setPrompt,
                modifier = Modifier.fillMaxWidth().heightIn(min = 130.dp),
                placeholder = { Text("A euphoric synth-pop anthem about running out of a city at sunrise, female vocals, huge chorus") },
                shape = RoundedCornerShape(16.dp),
                maxLines = 8,
            )
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = viewModel::surpriseMe) {
                    Icon(Icons.Filled.Casino, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Surprise me")
                }
                Spacer(Modifier.width(4.dp))
                TextButton(onClick = viewModel::writeLyrics, enabled = !state.writingLyrics) {
                    if (state.writingLyrics) {
                        CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Filled.EditNote, null, modifier = Modifier.size(18.dp))
                    }
                    Spacer(Modifier.width(6.dp))
                    Text("Write lyrics")
                }
            }
            InstrumentalRow(state.instrumental, viewModel::setInstrumental)
        }
    }
}

@Composable
private fun CustomPanel(state: CreateUiState, viewModel: CreateViewModel) {
    GlassCard {
        Column {
            SectionLabel("Title")
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = state.title,
                onValueChange = viewModel::setTitle,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Leave empty and the engine names it") },
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
            )
            Spacer(Modifier.height(16.dp))
            SectionLabel("Lyrics") {
                TextButton(onClick = viewModel::writeLyrics, enabled = !state.writingLyrics) {
                    if (state.writingLyrics) {
                        CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(6.dp))
                    }
                    Text("Write for me")
                }
            }
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = state.lyrics,
                onValueChange = viewModel::setLyrics,
                modifier = Modifier.fillMaxWidth().heightIn(min = 190.dp),
                enabled = !state.instrumental,
                placeholder = {
                    Text("[Verse]\nStreetlights blur into the rain…\n\n[Chorus]\nWe run until the morning breaks")
                },
                shape = RoundedCornerShape(16.dp),
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "Use [Verse], [Chorus], [Bridge], [Drop], [Outro] tags to shape the arrangement.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            InstrumentalRow(state.instrumental, viewModel::setInstrumental)
            Spacer(Modifier.height(10.dp))
            SectionLabel("Extra style words")
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = state.style,
                onValueChange = viewModel::setStyle,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("sidechained pads, tape saturation, 124 bpm") },
                shape = RoundedCornerShape(16.dp),
            )
            Spacer(Modifier.height(12.dp))
            SectionLabel("Exclude")
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = state.negativeStyle,
                onValueChange = viewModel::setNegativeStyle,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("screaming, distortion, lo-fi hiss") },
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
            )
        }
    }
}

@Composable
private fun InstrumentalRow(instrumental: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(top = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(Modifier.weight(1f)) {
            Text("Instrumental", style = MaterialTheme.typography.titleSmall)
            Text(
                "No vocals at all — pure production",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(checked = instrumental, onCheckedChange = onChange)
    }
}

@Composable
private fun QuickPresets(viewModel: CreateViewModel) {
    Column {
        SectionLabel("Start from a vibe")
        Spacer(Modifier.height(10.dp))
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Presets.quick.forEach { preset ->
                Box(
                    Modifier
                        .width(168.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(MaterialTheme.colorScheme.surfaceContainer)
                        .clickable { viewModel.applyPreset(preset) }
                        .padding(14.dp),
                ) {
                    Column {
                        Text(preset.name, style = MaterialTheme.typography.titleSmall, maxLines = 2)
                        Spacer(Modifier.height(6.dp))
                        Text(
                            preset.tags.joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                        )
                        preset.bpm?.let {
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "$it bpm",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StyleLibrary(state: CreateUiState, viewModel: CreateViewModel) {
    var expanded by rememberSaveable { mutableStateOf("Genre") }
    val categories = remember {
        listOf(
            "Genre" to Presets.genres,
            "Mood" to Presets.moods,
            "Instruments" to Presets.instruments,
            "Vocals" to Presets.vocals,
            "Production" to Presets.production,
        )
    }
    GlassCard {
        Column {
            SectionLabel("Style tags") {
                if (state.selectedTags.isNotEmpty()) {
                    Text(
                        "${state.selectedTags.size}/8",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            if (state.selectedTags.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.selectedTags.forEach { tag ->
                        TagChip(tag, selected = true) { viewModel.toggleTag(tag) }
                    }
                }
            }
            categories.forEach { (name, options) ->
                Spacer(Modifier.height(14.dp))
                Row(
                    Modifier.fillMaxWidth().clickable { expanded = if (expanded == name) "" else name },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(name, style = MaterialTheme.typography.titleSmall)
                    Icon(
                        if (expanded == name) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                        null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                AnimatedVisibility(visible = expanded == name) {
                    FlowRow(
                        modifier = Modifier.padding(top = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        options.forEach { option ->
                            TagChip(option, selected = state.selectedTags.contains(option)) {
                                viewModel.toggleTag(option)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ModelPanel(state: CreateUiState, viewModel: CreateViewModel) {
    GlassCard {
        Column {
            SectionLabel("Engine model")
            Spacer(Modifier.height(10.dp))
            if (state.models.isEmpty()) {
                Text(
                    "No model list yet. Sonara will use \"${state.model}\".",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.models.forEach { model ->
                        TagChip(model.name, selected = model.id == state.model) { viewModel.setModel(model.id) }
                    }
                }
                state.models.firstOrNull { it.id == state.model }?.let { model ->
                    Spacer(Modifier.height(8.dp))
                    Text(
                        model.description.ifBlank { "Max ${model.maxDurationSeconds / 60} min" },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            val maxDuration = state.models.firstOrNull { it.id == state.model }?.maxDurationSeconds ?: 300
            SliderRow(
                label = "Length",
                value = state.durationSeconds.toFloat(),
                valueLabel = "${state.durationSeconds / 60}:${(state.durationSeconds % 60).toString().padStart(2, '0')}",
                range = 30f..maxDuration.toFloat(),
                onChange = { viewModel.setDuration(it.toInt() / 5 * 5) },
            )
            Spacer(Modifier.height(4.dp))
            SectionLabel("Versions per run")
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                (1..4).forEach { count ->
                    TagChip("$count", selected = state.variations == count) { viewModel.setVariations(count) }
                }
            }
        }
    }
}

@Composable
private fun AdvancedPanel(state: CreateUiState, viewModel: CreateViewModel) {
    GlassCard {
        Column {
            Row(
                Modifier.fillMaxWidth().clickable { viewModel.toggleAdvanced() },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Tune, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Advanced controls", style = MaterialTheme.typography.titleSmall)
                }
                Icon(
                    if (state.advancedOpen) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            AnimatedVisibility(visible = state.advancedOpen) {
                Column(Modifier.padding(top = 12.dp)) {
                    SliderRow(
                        label = "Style strength",
                        value = state.styleWeight,
                        valueLabel = "${(state.styleWeight * 100).toInt()}%",
                        onChange = viewModel::setStyleWeight,
                    )
                    SliderRow(
                        label = "Weirdness",
                        value = state.weirdness,
                        valueLabel = "${(state.weirdness * 100).toInt()}%",
                        onChange = viewModel::setWeirdness,
                    )
                    SliderRow(
                        label = "Lyrics adherence",
                        value = state.lyricsWeight,
                        valueLabel = "${(state.lyricsWeight * 100).toInt()}%",
                        onChange = viewModel::setLyricsWeight,
                    )
                    Spacer(Modifier.height(8.dp))
                    SectionLabel("Vocals")
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("any", "female", "male", "duet").forEach { option ->
                            TagChip(option, selected = state.vocalGender == option) {
                                viewModel.setVocalGender(option)
                            }
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    SectionLabel("Lyric language")
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Presets.languages.forEach { (code, label) ->
                            TagChip(label, selected = state.language == code) { viewModel.setLanguage(code) }
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = state.tempoBpm?.toString() ?: "",
                            onValueChange = { raw ->
                                viewModel.setTempo(raw.filter { it.isDigit() }.take(3).toIntOrNull())
                            },
                            modifier = Modifier.width(132.dp),
                            label = { Text("BPM") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(14.dp),
                            singleLine = true,
                        )
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                state.seed?.let { "Seed $it" } ?: "Seed: random",
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            Row {
                                TextButton(onClick = viewModel::randomizeSeed) { Text("Lock seed") }
                                if (state.seed != null) {
                                    TextButton(onClick = viewModel::clearSeed) { Text("Clear") }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun JobCard(job: JobEntity, onOpen: () -> Unit, onDismiss: () -> Unit) {
    GlassCard(onClick = onOpen) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(AuroraBrush),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(
                        Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = Color.White,
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        job.title?.ifBlank { null } ?: job.prompt?.take(44) ?: "New song",
                        style = MaterialTheme.typography.titleSmall,
                        maxLines = 1,
                    )
                    Text(
                        (job.stage ?: job.status).replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    "${(job.progress * 100).toInt()}%",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Filled.Close, "Dismiss", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Spacer(Modifier.height(10.dp))
            ProgressLine(job.progress)
            job.error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

private val CardBorder = BorderStroke(1.dp, Color(0x22FFFFFF))
