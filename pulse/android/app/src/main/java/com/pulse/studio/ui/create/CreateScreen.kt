package com.pulse.studio.ui.create

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AudioFile
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.MovieCreation
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.pulse.studio.data.local.ClipEntity
import com.pulse.studio.ui.components.GlassCard
import com.pulse.studio.ui.components.GradientButton
import com.pulse.studio.ui.components.ProgressLine
import com.pulse.studio.ui.components.SectionLabel
import com.pulse.studio.ui.components.StylePreview
import com.pulse.studio.ui.components.TagChip
import com.pulse.studio.ui.theme.PulseBrush
import com.pulse.studio.util.formatDuration
import com.pulse.studio.visual.AspectRatio
import com.pulse.studio.visual.Director
import com.pulse.studio.visual.Palette
import com.pulse.studio.visual.Quality

@Composable
fun CreateScreen(
    viewModel: CreateViewModel,
    contentPadding: PaddingValues,
    onOpenLibrary: () -> Unit,
    onMessage: (String) -> Unit,
) {
    val state by viewModel.state.collectAsState()
    val working by viewModel.working.collectAsState()

    val audioPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri -> uri?.let(viewModel::pickAudio) }

    val imagePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri -> uri?.let(viewModel::pickCover) }

    LaunchedEffect(state.message) {
        state.message?.let {
            onMessage(it)
            viewModel.consumeMessage()
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { Header() }

        item {
            TrackCard(
                state = state,
                onPick = { audioPicker.launch(arrayOf("audio/*")) },
            )
        }

        if (state.audioUri != null) {
            item { StylePicker(state, viewModel) }
            item { PalettePicker(state, viewModel) }
            item { FormatCard(state, viewModel) }
            item { TextCard(state, viewModel, onPickImage = { imagePicker.launch("image/*") }) }
            item { LengthCard(state, viewModel) }
            item {
                GradientButton(
                    text = if (state.submitting) "Starting" else "Make the clip",
                    modifier = Modifier.fillMaxWidth(),
                    enabled = state.ready,
                    loading = state.submitting,
                    icon = { Icon(Icons.Filled.MovieCreation, null, tint = Color.White) },
                    onClick = { viewModel.create(onOpenLibrary) },
                )
            }
        }

        if (working.isNotEmpty()) {
            item { SectionLabel("In progress") }
            items(working, key = { it.id }) { clip -> WorkingCard(clip) }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun Header() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(PulseBrush),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.MovieCreation, null, tint = Color.White, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text("Pulse Studio", style = MaterialTheme.typography.headlineSmall)
            Text(
                "Your track, turned into a video — entirely on this phone",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun TrackCard(state: CreateUiState, onPick: () -> Unit) {
    GlassCard(onClick = onPick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(52.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                contentAlignment = Alignment.Center,
            ) {
                if (state.inspecting) {
                    CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Filled.AudioFile, null, tint = MaterialTheme.colorScheme.primary)
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    if (state.audioUri == null) "Choose an audio file" else state.audioName,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    when {
                        state.audioUri == null -> "MP3, M4A, WAV, FLAC or OGG"
                        state.durationSeconds > 0f -> formatDuration(state.durationSeconds) +
                            (if (state.hasCover) " · artwork found" else "")
                        else -> "Ready"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TextButton(onClick = onPick) { Text(if (state.audioUri == null) "Browse" else "Change") }
        }
    }
}

@Composable
private fun StylePicker(state: CreateUiState, viewModel: CreateViewModel) {
    Column {
        SectionLabel("Style")
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            StyleTile(
                label = "Auto",
                selected = state.styleId == "auto",
                styleId = "radial",
                paletteId = state.paletteId,
                aspect = state.aspect,
                caption = "changes with the song",
            ) { viewModel.setStyle("auto") }

            Director.available().forEach { scene ->
                StyleTile(
                    label = scene.displayName,
                    selected = state.styleId == scene.id,
                    styleId = scene.id,
                    paletteId = state.paletteId,
                    aspect = state.aspect,
                ) { viewModel.setStyle(scene.id) }
            }
        }
    }
}

@Composable
private fun StyleTile(
    label: String,
    selected: Boolean,
    styleId: String,
    paletteId: String,
    aspect: AspectRatio,
    caption: String? = null,
    onClick: () -> Unit,
) {
    Column(
        Modifier
            .width(104.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(
                if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
                else MaterialTheme.colorScheme.surfaceContainer
            )
            .clickable { onClick() }
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        StylePreview(
            styleId = styleId,
            paletteId = paletteId,
            aspect = aspect,
            modifier = Modifier.fillMaxWidth().height(if (aspect == AspectRatio.Landscape) 54.dp else 150.dp),
        )
        Spacer(Modifier.height(8.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            maxLines = 1,
        )
        if (caption != null) {
            Text(
                caption,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
            )
        }
    }
}

@Composable
private fun PalettePicker(state: CreateUiState, viewModel: CreateViewModel) {
    Column {
        SectionLabel("Colours")
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Palette.all.forEach { palette ->
                val selected = palette.id == state.paletteId
                Column(
                    Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
                            else MaterialTheme.colorScheme.surfaceContainer
                        )
                        .clickable { viewModel.setPalette(palette.id) }
                        .padding(10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        listOf(palette.primary, palette.secondary, palette.accent).forEach { colour ->
                            Box(
                                Modifier
                                    .size(16.dp)
                                    .clip(CircleShape)
                                    .background(Color(colour)),
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        palette.name,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (selected) MaterialTheme.colorScheme.onSurface
                        else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun FormatCard(state: CreateUiState, viewModel: CreateViewModel) {
    GlassCard {
        Column {
            SectionLabel("Shape")
            Spacer(Modifier.height(10.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                AspectRatio.entries.forEach { aspect ->
                    TagChip(aspect.label, selected = state.aspectId == aspect.id) {
                        viewModel.setAspect(aspect.id)
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            SectionLabel("Quality")
            Spacer(Modifier.height(10.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Quality.entries.forEach { quality ->
                    TagChip(quality.label, selected = state.qualityId == quality.id) {
                        viewModel.setQuality(quality.id)
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            SectionLabel("Frame rate")
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(24, 30, 60).forEach { fps ->
                    TagChip("$fps fps", selected = state.fps == fps) { viewModel.setFps(fps) }
                }
            }
            Spacer(Modifier.height(10.dp))
            val (w, h) = state.aspect.sizeFor(state.quality.shortSide)
            Text(
                "Output: ${w}x$h at ${state.fps} fps",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun TextCard(state: CreateUiState, viewModel: CreateViewModel, onPickImage: () -> Unit) {
    GlassCard {
        Column {
            SectionLabel("Text and artwork")
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.title,
                onValueChange = viewModel::setTitle,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Title") },
                shape = RoundedCornerShape(14.dp),
                singleLine = true,
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.artist,
                onValueChange = viewModel::setArtist,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Artist") },
                shape = RoundedCornerShape(14.dp),
                singleLine = true,
            )
            ToggleRow(
                "Show title and artist",
                "Burned into the video, bottom left",
                state.showText,
                viewModel::setShowText,
            )
            ToggleRow(
                "Show progress bar",
                "A thin bar that tracks the song",
                state.showProgress,
                viewModel::setShowProgress,
            )
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Artwork", style = MaterialTheme.typography.titleSmall)
                    Text(
                        if (state.hasCover) "Used by the Artwork and Radial styles"
                        else "None — add one or let the styles draw their own",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (state.hasCover) {
                    IconButton(onClick = viewModel::clearCover) {
                        Icon(Icons.Filled.Close, "Remove artwork")
                    }
                }
                TextButton(onClick = onPickImage) {
                    Icon(Icons.Filled.Image, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(if (state.hasCover) "Replace" else "Add")
                }
            }
            if (state.hasCover) {
                ToggleRow("Use artwork", "Turn off to ignore it for this clip", state.useCover, viewModel::setUseCover)
            }
        }
    }
}

@Composable
private fun LengthCard(state: CreateUiState, viewModel: CreateViewModel) {
    GlassCard {
        Column {
            SectionLabel("Length")
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TagChip("Whole track", selected = state.wholeTrack) { viewModel.setWholeTrack(true) }
                TagChip("Short clip", selected = !state.wholeTrack) { viewModel.setWholeTrack(false) }
            }
            if (!state.wholeTrack) {
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(15, 30, 60, 90).forEach { seconds ->
                        TagChip("${seconds}s", selected = state.clipSeconds == seconds) {
                            viewModel.setClipSeconds(seconds)
                        }
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            val frames = (state.renderSeconds * state.fps).toInt()
            Text(
                "About $frames frames to draw" +
                    if (state.renderSeconds > 0f) " · ${formatDuration(state.renderSeconds)} of video" else "",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
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

@Composable
private fun WorkingCard(clip: ClipEntity) {
    GlassCard {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(clip.title, style = MaterialTheme.typography.titleSmall, maxLines = 1)
                    Text(
                        when (clip.stage) {
                            "decoding" -> "Reading the audio"
                            "analysing" -> "Finding the beat"
                            "rendering" -> "Painting frames"
                            "finishing" -> "Writing the video"
                            "failed" -> clip.error ?: "Failed"
                            else -> "Queued"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = if (clip.status == ClipEntity.STATUS_FAILED) {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                    )
                }
                Text(
                    "${(clip.progress * 100).toInt()}%",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Spacer(Modifier.height(10.dp))
            ProgressLine(clip.progress)
        }
    }
}
