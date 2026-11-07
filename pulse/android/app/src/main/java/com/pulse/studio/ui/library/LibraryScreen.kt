package com.pulse.studio.ui.library

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.pulse.studio.data.local.ClipEntity
import com.pulse.studio.data.repo.ClipRepository
import com.pulse.studio.di.ServiceLocator
import com.pulse.studio.ui.components.ClipThumbnail
import com.pulse.studio.ui.components.EmptyState
import com.pulse.studio.ui.components.ProgressLine
import com.pulse.studio.ui.components.TagChip
import com.pulse.studio.util.formatDuration
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

class LibraryViewModel(private val repo: ClipRepository) : ViewModel() {
    val clips: StateFlow<List<ClipEntity>> = repo.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    companion object {
        fun factory(context: Context): ViewModelProvider.Factory = viewModelFactory {
            initializer { LibraryViewModel(ServiceLocator.clipRepository(context)) }
        }
    }
}

@Composable
fun LibraryScreen(
    viewModel: LibraryViewModel,
    contentPadding: PaddingValues,
    onOpenClip: (String) -> Unit,
    onCreate: () -> Unit,
) {
    val clips by viewModel.clips.collectAsState()

    if (clips.isEmpty()) {
        Column(Modifier.fillMaxWidth().padding(contentPadding)) {
            Text("Clips", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(24.dp))
            EmptyState(
                title = "No clips yet",
                subtitle = "Pick a track and Pulse will build a video around it.",
            ) {
                TagChip("Make one", selected = true, onClick = onCreate)
            }
        }
        return
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = contentPadding,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        items(clips, key = { it.id }) { clip ->
            ClipCard(clip, onClick = { if (clip.isReady) onOpenClip(clip.id) })
        }
    }
}

@Composable
private fun ClipCard(clip: ClipEntity, onClick: () -> Unit) {
    Column(
        Modifier
            .clip(RoundedCornerShape(18.dp))
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .clickable(enabled = clip.isReady) { onClick() }
            .padding(8.dp),
    ) {
        Box {
            ClipThumbnail(clip.thumbPath, clip.width, clip.height, Modifier.fillMaxWidth())
            if (clip.isReady) {
                Box(
                    Modifier
                        .align(Alignment.Center)
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.45f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.PlayArrow, "Play", tint = Color.White)
                }
            }
            if (clip.favorite) {
                Icon(
                    Icons.Filled.Favorite,
                    null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.align(Alignment.TopEnd).padding(8.dp).size(18.dp),
                )
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            clip.title,
            style = MaterialTheme.typography.titleSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(2.dp))
        if (clip.isWorking) {
            Text(
                "${(clip.progress * 100).toInt()}% · ${clip.stage}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(6.dp))
            ProgressLine(clip.progress, height = 4.dp)
        } else if (clip.status == ClipEntity.STATUS_FAILED) {
            Text(
                clip.error ?: "Failed",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error,
                maxLines = 2,
            )
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    formatDuration(clip.durationSeconds),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "${clip.height}p · ${clip.tempo.toInt()} bpm",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
