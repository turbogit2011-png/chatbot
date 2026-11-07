package com.sonara.studio.ui.player

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCut
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Loop
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.sonara.studio.data.local.SongEntity
import com.sonara.studio.ui.components.CoverArt
import com.sonara.studio.ui.components.GlassCard
import com.sonara.studio.ui.components.GradientButton
import com.sonara.studio.ui.components.SectionLabel
import com.sonara.studio.ui.components.TagChip
import com.sonara.studio.ui.components.Waveform
import com.sonara.studio.ui.components.gradientFor
import com.sonara.studio.ui.create.Presets
import com.sonara.studio.util.formatDuration

@Composable
fun SongScreen(
    viewModel: SongViewModel,
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    onMessage: (String) -> Unit,
) {
    val song by viewModel.song.collectAsState()
    val playback by viewModel.playback.collectAsState()
    val ui by viewModel.ui.collectAsState()
    val stems by viewModel.stems.collectAsState()
    val context = LocalContext.current
    var renaming by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    LaunchedEffect(ui.message) {
        ui.message?.let {
            onMessage(it)
            viewModel.consumeMessage()
        }
    }

    val current = song
    if (current == null) {
        Box(Modifier.fillMaxWidth().padding(contentPadding), contentAlignment = Alignment.Center) {
            Text("Loading track…", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }

    val isCurrent = playback.currentId == current.id
    val progress = if (isCurrent) playback.progress else 0f

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = viewModel::toggleFavorite) {
                Icon(
                    if (current.favorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                    "Favorite",
                    tint = if (current.favorite) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = { renaming = true }) { Icon(Icons.Filled.Edit, "Rename") }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Filled.Delete, "Delete", tint = MaterialTheme.colorScheme.error)
            }
        }

        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(28.dp))
                .background(Brush.linearGradient(gradientFor(current.id))),
            contentAlignment = Alignment.Center,
        ) {
            CoverArt(
                id = current.id,
                title = current.title,
                localPath = current.localCoverPath,
                remoteUrl = current.coverUrl,
                size = 320.dp,
                corner = 28.dp,
                modifier = Modifier.fillMaxSize(),
            )
        }

        Column {
            Text(current.title, style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(4.dp))
            Text(
                current.tagLine.ifBlank { current.model ?: "Sonara" },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        SeekRow(
            seed = current.id,
            progress = progress,
            positionMs = if (isCurrent) playback.positionMs else 0L,
            durationMs = if (isCurrent && playback.durationMs > 0) {
                playback.durationMs
            } else {
                (current.durationSeconds * 1000).toLong()
            },
            onSeek = viewModel::seekFraction,
        )

        TransportRow(
            isPlaying = isCurrent && playback.isPlaying,
            repeatOne = playback.repeatOne,
            shuffle = playback.shuffle,
            onPlayPause = viewModel::playPause,
            onNext = viewModel::next,
            onPrevious = viewModel::previous,
            onForward = viewModel::skipForward,
            onBackward = viewModel::skipBack,
            onRepeat = viewModel::toggleRepeat,
            onShuffle = viewModel::toggleShuffle,
        )

        ActionGrid(
            song = current,
            busy = ui.busy,
            onExtend = { viewModel.openSheet(SongSheet.Extend) },
            onCover = { viewModel.openSheet(SongSheet.Cover) },
            onStems = { viewModel.openSheet(SongSheet.Stems) },
            onDownload = viewModel::download,
            onExport = viewModel::exportToMusic,
            onShare = {
                val file = viewModel.localFile()
                if (file == null) {
                    onMessage("Download the track first, then share it.")
                } else {
                    val uri = FileProvider.getUriForFile(
                        context,
                        context.packageName + ".fileprovider",
                        file,
                    )
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "audio/mpeg"
                        putExtra(Intent.EXTRA_STREAM, uri)
                        putExtra(Intent.EXTRA_SUBJECT, current.title)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    context.startActivity(Intent.createChooser(intent, "Share ${current.title}"))
                }
            },
        )

        if (!current.lyrics.isNullOrBlank()) {
            GlassCard {
                Column {
                    SectionLabel("Lyrics")
                    Spacer(Modifier.height(10.dp))
                    Text(
                        current.lyrics!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }

        if (!current.prompt.isNullOrBlank()) {
            GlassCard {
                Column {
                    SectionLabel("Prompt")
                    Spacer(Modifier.height(8.dp))
                    Text(
                        current.prompt!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        if (stems.isNotEmpty()) {
            GlassCard {
                Column {
                    SectionLabel("Stems")
                    stems.forEach { stem ->
                        Spacer(Modifier.height(10.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.ContentCut, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(10.dp))
                            Text(stem.title, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                            Text(
                                formatDuration((stem.durationSeconds * 1000).toLong()),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }

        MetaCard(current)
        Spacer(Modifier.height(28.dp))
    }

    when (ui.sheet) {
        SongSheet.Extend -> ExtendSheet(current, viewModel)
        SongSheet.Cover -> CoverSheet(current, viewModel)
        SongSheet.Stems -> StemsSheet(viewModel)
        SongSheet.None -> Unit
    }

    if (renaming) {
        var draft by remember { mutableStateOf(current.title) }
        AlertDialog(
            onDismissRequest = { renaming = false },
            title = { Text("Rename track") },
            text = {
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                )
            },
            confirmButton = {
                Button(onClick = {
                    viewModel.rename(draft)
                    renaming = false
                }) { Text("Save") }
            },
            dismissButton = { TextButton(onClick = { renaming = false }) { Text("Cancel") } },
        )
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete \"${current.title}\"?") },
            text = { Text("The audio file and its entry are removed from this device.") },
            confirmButton = {
                Button(onClick = {
                    confirmDelete = false
                    viewModel.delete(onBack)
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Keep") } },
        )
    }
}

@Composable
private fun SeekRow(
    seed: String,
    progress: Float,
    positionMs: Long,
    durationMs: Long,
    onSeek: (Float) -> Unit,
) {
    var dragFraction by remember { mutableFloatStateOf(-1f) }
    val shown = if (dragFraction >= 0f) dragFraction else progress
    Column {
        Box(
            Modifier
                .fillMaxWidth()
                .height(56.dp)
                .pointerInput(seed) {
                    detectHorizontalDragGestures(
                        onDragStart = { offset ->
                            dragFraction = (offset.x / size.width).coerceIn(0f, 1f)
                        },
                        onHorizontalDrag = { change, _ ->
                            dragFraction = (change.position.x / size.width).coerceIn(0f, 1f)
                        },
                        onDragEnd = {
                            if (dragFraction >= 0f) onSeek(dragFraction)
                            dragFraction = -1f
                        },
                        onDragCancel = { dragFraction = -1f },
                    )
                },
            contentAlignment = Alignment.Center,
        ) {
            Waveform(seed = seed, progress = shown, modifier = Modifier.fillMaxWidth())
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                formatDuration(if (dragFraction >= 0f) (durationMs * dragFraction).toLong() else positionMs),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                formatDuration(durationMs),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun TransportRow(
    isPlaying: Boolean,
    repeatOne: Boolean,
    shuffle: Boolean,
    onPlayPause: () -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    onForward: () -> Unit,
    onBackward: () -> Unit,
    onRepeat: () -> Unit,
    onShuffle: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        IconButton(onClick = onShuffle) {
            Icon(
                Icons.Filled.Shuffle,
                "Shuffle",
                tint = if (shuffle) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        IconButton(onClick = onPrevious) { Icon(Icons.Filled.SkipPrevious, "Previous", modifier = Modifier.size(28.dp)) }
        IconButton(onClick = onBackward) { Icon(Icons.Filled.Replay10, "Back 15s") }
        Box(
            Modifier
                .size(68.dp)
                .clip(CircleShape)
                .background(Brush.linearGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.tertiary)))
                .clickable { onPlayPause() },
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                if (isPlaying) "Pause" else "Play",
                tint = Color.White,
                modifier = Modifier.size(32.dp),
            )
        }
        IconButton(onClick = onForward) { Icon(Icons.Filled.Forward10, "Forward 15s") }
        IconButton(onClick = onNext) { Icon(Icons.Filled.SkipNext, "Next", modifier = Modifier.size(28.dp)) }
        IconButton(onClick = onRepeat) {
            Icon(
                Icons.Filled.Loop,
                "Repeat",
                tint = if (repeatOne) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ActionGrid(
    song: SongEntity,
    busy: Boolean,
    onExtend: () -> Unit,
    onCover: () -> Unit,
    onStems: () -> Unit,
    onDownload: () -> Unit,
    onExport: () -> Unit,
    onShare: () -> Unit,
) {
    Column {
        SectionLabel("Do more with this track")
        Spacer(Modifier.height(10.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            ActionPill("Extend", Icons.Filled.Tune, enabled = !busy, onClick = onExtend)
            ActionPill("Cover / remix", Icons.Filled.Loop, enabled = !busy, onClick = onCover)
            ActionPill("Split stems", Icons.Filled.ContentCut, enabled = !busy, onClick = onStems)
            ActionPill(
                if (song.isDownloaded) "Downloaded" else "Download",
                Icons.Filled.Download,
                enabled = !busy && !song.isDownloaded,
                onClick = onDownload,
            )
            ActionPill("Save to Music", Icons.Filled.FileDownload, enabled = !busy, onClick = onExport)
            ActionPill("Share", Icons.Filled.Share, enabled = !busy, onClick = onShare)
        }
    }
}

@Composable
private fun ActionPill(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
            .clickable(enabled = enabled) { onClick() }
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            icon,
            null,
            modifier = Modifier.size(16.dp),
            tint = if (enabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.width(8.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun MetaCard(song: SongEntity) {
    GlassCard {
        Column {
            SectionLabel("Details")
            Spacer(Modifier.height(10.dp))
            MetaRow("Model", song.model ?: "unknown")
            MetaRow("Length", formatDuration((song.durationSeconds * 1000).toLong()))
            MetaRow("Version", "v${song.variant}")
            MetaRow("Seed", song.seed?.toString() ?: "random")
            MetaRow("Vocals", if (song.instrumental) "instrumental" else "with vocals")
            MetaRow("Offline", if (song.isDownloaded) "yes" else "streaming")
            MetaRow("Plays", song.playCount.toString())
        }
    }
}

@Composable
private fun MetaRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun ExtendSheet(song: SongEntity, viewModel: SongViewModel) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var from by remember { mutableFloatStateOf(song.durationSeconds.coerceAtLeast(1f)) }
    var lyrics by remember { mutableStateOf("") }
    var style by remember { mutableStateOf(song.style ?: song.tagLine) }
    var duration by remember { mutableStateOf(120) }
    ModalBottomSheet(onDismissRequest = viewModel::closeSheet, sheetState = sheetState) {
        Column(Modifier.padding(20.dp)) {
            Text("Extend this song", style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(12.dp))
            Text(
                "Continue from ${formatDuration((from * 1000).toLong())}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            com.sonara.studio.ui.components.SliderRow(
                label = "Continue at",
                value = from,
                valueLabel = formatDuration((from * 1000).toLong()),
                range = 0f..song.durationSeconds.coerceAtLeast(1f),
                onChange = { from = it },
            )
            com.sonara.studio.ui.components.SliderRow(
                label = "Added length",
                value = duration.toFloat(),
                valueLabel = formatDuration(duration * 1000L),
                range = 30f..240f,
                onChange = { duration = it.toInt() / 5 * 5 },
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = style,
                onValueChange = { style = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Style for the new part") },
                shape = RoundedCornerShape(14.dp),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = lyrics,
                onValueChange = { lyrics = it },
                modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp),
                label = { Text("Lyrics for the continuation (optional)") },
                shape = RoundedCornerShape(14.dp),
            )
            Spacer(Modifier.height(16.dp))
            GradientButton(
                text = "Render extension",
                modifier = Modifier.fillMaxWidth(),
            ) { viewModel.extend(from, lyrics, style, duration) }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun CoverSheet(song: SongEntity, viewModel: SongViewModel) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var style by remember { mutableStateOf("") }
    var keepVocals by remember { mutableStateOf(false) }
    ModalBottomSheet(onDismissRequest = viewModel::closeSheet, sheetState = sheetState) {
        Column(Modifier.padding(20.dp)) {
            Text("Cover in a new style", style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(6.dp))
            Text(
                "Keeps the song, rebuilds the production.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(14.dp))
            OutlinedTextField(
                value = style,
                onValueChange = { style = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("New style") },
                placeholder = { Text("acoustic folk, fingerpicked guitar, intimate") },
                shape = RoundedCornerShape(14.dp),
            )
            Spacer(Modifier.height(12.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Presets.quick.take(6).forEach { preset ->
                    TagChip(preset.name, selected = style == preset.tags.joinToString(", ")) {
                        style = preset.tags.joinToString(", ")
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Keep original vocals", style = MaterialTheme.typography.titleSmall)
                    Text(
                        "Only available on engines that support vocal transfer",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(checked = keepVocals, onCheckedChange = { keepVocals = it })
            }
            Spacer(Modifier.height(16.dp))
            GradientButton(
                text = "Render cover",
                modifier = Modifier.fillMaxWidth(),
                enabled = style.isNotBlank(),
            ) { viewModel.cover(style, keepVocals) }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun StemsSheet(viewModel: SongViewModel) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var mode by remember { mutableStateOf("two_stem") }
    ModalBottomSheet(onDismissRequest = viewModel::closeSheet, sheetState = sheetState) {
        Column(Modifier.padding(20.dp)) {
            Text("Split into stems", style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TagChip("Vocals + backing", selected = mode == "two_stem") { mode = "two_stem" }
                TagChip("Four stems", selected = mode == "four_stem") { mode = "four_stem" }
            }
            Spacer(Modifier.height(16.dp))
            GradientButton(text = "Split", modifier = Modifier.fillMaxWidth()) { viewModel.splitStems(mode) }
            Spacer(Modifier.height(20.dp))
        }
    }
}
