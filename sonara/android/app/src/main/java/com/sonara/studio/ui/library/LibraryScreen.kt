package com.sonara.studio.ui.library

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sonara.studio.data.local.SongEntity
import com.sonara.studio.ui.components.CoverArt
import com.sonara.studio.ui.components.EmptyState
import com.sonara.studio.ui.components.SectionLabel
import com.sonara.studio.ui.components.TagChip
import com.sonara.studio.util.formatDuration

@Composable
fun LibraryScreen(
    viewModel: LibraryViewModel,
    contentPadding: PaddingValues,
    onOpenSong: (String) -> Unit,
    onCreate: () -> Unit,
    onMessage: (String) -> Unit,
) {
    val state by viewModel.ui.collectAsState()
    val songs by viewModel.songs.collectAsState()

    LaunchedEffect(state.message) {
        state.message?.let {
            onMessage(it)
            viewModel.consumeMessage()
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("Library", style = MaterialTheme.typography.headlineMedium)
        }
        item {
            OutlinedTextField(
                value = state.query,
                onValueChange = viewModel::setQuery,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search titles, styles, lyrics") },
                leadingIcon = { Icon(Icons.Filled.Search, null) },
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
            )
        }
        item {
            Row(
                Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                LibraryFilter.entries.forEach { filter ->
                    TagChip(
                        text = when (filter) {
                            LibraryFilter.All -> "All songs"
                            LibraryFilter.Favorites -> "Favorites"
                            LibraryFilter.Downloaded -> "Offline"
                        },
                        selected = state.filter == filter,
                    ) { viewModel.setFilter(filter) }
                }
            }
        }
        if (songs.isEmpty()) {
            item {
                EmptyState(
                    title = if (state.query.isBlank()) "Nothing here yet" else "No matches",
                    subtitle = if (state.query.isBlank()) {
                        "Create your first song and it will land here, ready to play offline."
                    } else {
                        "Try a different word, or clear the search."
                    },
                ) {
                    TagChip("Create a song", selected = true, onClick = onCreate)
                }
            }
        } else {
            item { SectionLabel("${songs.size} tracks") }
            items(songs, key = { it.id }) { song ->
                SongRow(
                    song = song,
                    onPlay = { viewModel.play(song) },
                    onOpen = { onOpenSong(song.id) },
                    onFavorite = { viewModel.toggleFavorite(song) },
                )
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun SongRow(
    song: SongEntity,
    onPlay: () -> Unit,
    onOpen: () -> Unit,
    onFavorite: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .clickable { onOpen() }
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box {
            CoverArt(
                id = song.id,
                title = song.title,
                localPath = song.localCoverPath,
                remoteUrl = song.coverUrl,
                size = 58.dp,
                corner = 14.dp,
            )
            Box(
                Modifier
                    .size(58.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .clickable { onPlay() },
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.scrim.copy(alpha = 0.55f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Filled.PlayArrow,
                        "Play",
                        tint = androidx.compose.ui.graphics.Color.White,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                song.title,
                style = MaterialTheme.typography.titleSmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                song.tagLine.ifBlank { song.prompt?.take(60) ?: "Sonara generation" },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    formatDuration((song.durationSeconds * 1000).toLong()),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (song.variant > 1) {
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "v${song.variant}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                if (song.isDownloaded) {
                    Spacer(Modifier.width(8.dp))
                    Icon(
                        Icons.Filled.Download,
                        "Offline",
                        tint = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.size(13.dp),
                    )
                }
            }
        }
        IconButton(onClick = onFavorite) {
            Icon(
                if (song.favorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                "Favorite",
                tint = if (song.favorite) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        IconButton(onClick = onOpen) {
            Icon(Icons.Filled.MoreVert, "Details", tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
