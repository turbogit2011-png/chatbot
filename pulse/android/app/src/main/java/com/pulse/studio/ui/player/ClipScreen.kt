package com.pulse.studio.ui.player

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.pulse.studio.data.local.ClipEntity
import com.pulse.studio.data.repo.ClipRepository
import com.pulse.studio.di.ServiceLocator
import com.pulse.studio.ui.components.GlassCard
import com.pulse.studio.ui.components.SectionLabel
import com.pulse.studio.util.formatBytes
import com.pulse.studio.util.formatDuration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File

class ClipViewModel(
    private val clipId: String,
    private val repo: ClipRepository,
) : ViewModel() {

    val clip: StateFlow<ClipEntity?> = repo.observeClip(clipId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    fun consumeMessage() { _message.value = null }

    fun toggleFavorite() {
        val current = clip.value ?: return
        viewModelScope.launch { repo.toggleFavorite(current) }
    }

    fun rename(title: String) {
        viewModelScope.launch { repo.rename(clipId, title) }
    }

    fun delete(onDone: () -> Unit) {
        val current = clip.value ?: return
        viewModelScope.launch {
            repo.delete(current)
            onDone()
        }
    }

    fun exportToGallery() {
        val current = clip.value ?: return
        viewModelScope.launch {
            val uri = repo.exportToGallery(current)
            _message.value = if (uri != null) "Saved to Movies/Pulse" else "Could not save to the gallery"
        }
    }

    companion object {
        fun factory(context: Context, clipId: String): ViewModelProvider.Factory = viewModelFactory {
            initializer { ClipViewModel(clipId, ServiceLocator.clipRepository(context)) }
        }
    }
}

@Composable
fun ClipScreen(
    viewModel: ClipViewModel,
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    onMessage: (String) -> Unit,
) {
    val clip by viewModel.clip.collectAsState()
    val message by viewModel.message.collectAsState()
    val context = LocalContext.current
    var renaming by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    LaunchedEffect(message) {
        message?.let {
            onMessage(it)
            viewModel.consumeMessage()
        }
    }

    val current = clip
    if (current == null || !current.isReady) {
        Box(Modifier.fillMaxWidth().padding(contentPadding), contentAlignment = Alignment.Center) {
            Text("Loading clip…", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }

    val player = remember(current.filePath) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(Uri.fromFile(File(current.filePath!!))))
            prepare()
            playWhenReady = true
            repeatMode = ExoPlayer.REPEAT_MODE_ONE
        }
    }
    DisposableEffect(player) {
        onDispose { player.release() }
    }

    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = viewModel::toggleFavorite) {
                Icon(
                    if (current.favorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                    "Favourite",
                    tint = if (current.favorite) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = { renaming = true }) { Icon(Icons.Filled.Edit, "Rename") }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Filled.Delete, "Delete", tint = MaterialTheme.colorScheme.error)
            }
        }

        val ratio = if (current.width > 0 && current.height > 0) {
            current.width.toFloat() / current.height
        } else {
            9f / 16f
        }
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    this.player = player
                    useController = true
                    setShowNextButton(false)
                    setShowPreviousButton(false)
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(ratio)
                .clip(RoundedCornerShape(20.dp))
                .background(MaterialTheme.colorScheme.surfaceContainerHigh),
        )

        Column {
            Text(current.title, style = MaterialTheme.typography.headlineSmall)
            if (current.artist.isNotBlank()) {
                Text(
                    current.artist,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            ActionPill("Save to gallery", Icons.Filled.Download) { viewModel.exportToGallery() }
            ActionPill("Share", Icons.Filled.Share) {
                val file = File(current.filePath!!)
                val uri = FileProvider.getUriForFile(context, context.packageName + ".fileprovider", file)
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "video/mp4"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    putExtra(Intent.EXTRA_SUBJECT, current.title)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                context.startActivity(Intent.createChooser(intent, "Share ${current.title}"))
            }
        }

        GlassCard {
            Column {
                SectionLabel("Details")
                Spacer(Modifier.height(10.dp))
                MetaRow("Resolution", "${current.width} x ${current.height}")
                MetaRow("Length", formatDuration(current.durationSeconds))
                MetaRow("Detected tempo", "${current.tempo.toInt()} bpm")
                MetaRow("Beats", current.beats.toString())
                MetaRow("Sections", current.sections.toString())
                MetaRow("File size", formatBytes(File(current.filePath!!).length()))
            }
        }

        Spacer(Modifier.height(24.dp))
    }

    if (renaming) {
        var draft by remember { mutableStateOf(current.title) }
        AlertDialog(
            onDismissRequest = { renaming = false },
            title = { Text("Rename clip") },
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
            text = { Text("The video file is removed from this device. Anything you exported to the gallery stays.") },
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
private fun ActionPill(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, modifier = Modifier.size(17.dp), tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.width(8.dp))
        Text(label, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun MetaRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
    }
}
