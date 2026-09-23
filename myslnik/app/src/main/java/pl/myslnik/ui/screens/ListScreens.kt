package pl.myslnik.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import pl.myslnik.data.db.EntryEntity
import pl.myslnik.ui.AppViewModel
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

enum class ListKind { INBOX, TODAY, PLANNED, THOUGHTS, DONE }

private val plLocale = Locale.forLanguageTag("pl")
private val dateFmt = DateTimeFormatter.ofPattern("EEE d MMM", plLocale)
private val timeFmt = DateTimeFormatter.ofPattern("HH:mm", plLocale)

fun formatDue(millis: Long): String {
    val zone = ZoneId.systemDefault()
    val due = Instant.ofEpochMilli(millis).atZone(zone)
    val today = ZonedDateTime.now(zone).toLocalDate()
    val prefix = when (due.toLocalDate()) {
        today -> "dziś"
        today.plusDays(1) -> "jutro"
        else -> dateFmt.format(due)
    }
    return "$prefix ${timeFmt.format(due)}"
}

@Composable
fun EntryListScreen(viewModel: AppViewModel, kind: ListKind, onOpen: (String) -> Unit) {
    val entries by when (kind) {
        ListKind.INBOX -> viewModel.inbox
        ListKind.TODAY -> viewModel.today
        ListKind.PLANNED -> viewModel.planned
        ListKind.THOUGHTS -> viewModel.thoughts
        ListKind.DONE -> viewModel.done
    }.collectAsStateWithLifecycle()
    val categories by viewModel.categories.collectAsStateWithLifecycle()
    val catColors = categories.associate { it.id to Color(it.color.toInt() or (0xFF shl 24)) }

    val now = System.currentTimeMillis()
    val sorted = if (kind == ListKind.TODAY)
        entries.sortedWith(compareByDescending<EntryEntity> { (it.dueAt ?: 0) < now }.thenBy { it.dueAt })
    else entries

    if (sorted.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                when (kind) {
                    ListKind.INBOX -> "Skrzynka pusta ✨"
                    ListKind.TODAY -> "Nic na dziś 🎉"
                    ListKind.PLANNED -> "Brak zaplanowanych"
                    ListKind.THOUGHTS -> "Brak myśli — złap jakąś!"
                    ListKind.DONE -> "Jeszcze nic nie odhaczono"
                },
                style = MaterialTheme.typography.bodyLarge
            )
        }
        return
    }

    LazyColumn(Modifier.fillMaxSize()) {
        items(sorted, key = { it.id }) { entry ->
            key(entry.id) {
                SwipeableEntryRow(
                    entry = entry,
                    categoryColor = entry.categoryId?.let { catColors[it] },
                    overdue = kind == ListKind.TODAY && (entry.dueAt ?: 0) < now,
                    swipeEnabled = kind != ListKind.DONE,
                    onDone = { viewModel.markDone(entry.id) },
                    onPostpone = { viewModel.snoozeTomorrowMorning(entry.id) },
                    onClick = { onOpen(entry.id) },
                )
            }
        }
    }
}

/** Przesunięcie w prawo = zrobione, w lewo = odłóż (na jutro rano). Wszystko z „Cofnij". */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SwipeableEntryRow(
    entry: EntryEntity,
    categoryColor: Color?,
    overdue: Boolean,
    swipeEnabled: Boolean,
    onDone: () -> Unit,
    onPostpone: () -> Unit,
    onClick: () -> Unit,
) {
    val state = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            when (value) {
                SwipeToDismissBoxValue.StartToEnd -> { onDone(); false }
                SwipeToDismissBoxValue.EndToStart -> { onPostpone(); false }
                else -> false
            }
        }
    )
    SwipeToDismissBox(
        state = state,
        enableDismissFromStartToEnd = swipeEnabled,
        enableDismissFromEndToStart = swipeEnabled,
        backgroundContent = {
            val (color, icon, align) = when (state.dismissDirection) {
                SwipeToDismissBoxValue.StartToEnd ->
                    Triple(Color(0xFF2E7D32), Icons.Default.Check, Alignment.CenterStart)
                SwipeToDismissBoxValue.EndToStart ->
                    Triple(Color(0xFF8D6E00), Icons.Default.Schedule, Alignment.CenterEnd)
                else -> Triple(Color.Transparent, Icons.Default.Check, Alignment.Center)
            }
            Box(
                Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 4.dp)
                    .clip(MaterialTheme.shapes.medium).background(color).padding(horizontal = 24.dp),
                contentAlignment = align
            ) { Icon(icon, contentDescription = null, tint = Color.White) }
        }
    ) {
        EntryRow(entry, categoryColor, overdue, onClick)
    }
}

@Composable
fun EntryRow(entry: EntryEntity, categoryColor: Color?, overdue: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp).clickable { onClick() }
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            if (categoryColor != null) {
                Box(Modifier.size(12.dp).clip(CircleShape).background(categoryColor))
                Spacer(Modifier.width(10.dp))
            }
            Column(Modifier.weight(1f)) {
                val priorityPrefix = when (entry.priority) {
                    2 -> "🚨 "
                    1 -> "⭐ "
                    else -> ""
                }
                Text(
                    text = priorityPrefix + entry.content,
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 2, overflow = TextOverflow.Ellipsis
                )
                val meta = buildList {
                    entry.dueAt?.let {
                        add((if (overdue) "⚠ zaległe · " else "") + formatDue(it) + (if (entry.userSetNight) " 🌙" else ""))
                    }
                    if (!entry.repeatRule.isNullOrBlank())
                        add("🔁 " + pl.myslnik.domain.RepeatCalculator.describe(entry.repeatRule))
                    if (entry.type == "THOUGHT") add("💭 myśl")
                }
                if (meta.isNotEmpty()) {
                    Text(
                        meta.joinToString(" · "),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (overdue) MaterialTheme.colorScheme.error
                        else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(viewModel: AppViewModel, onOpen: (String) -> Unit, onBack: () -> Unit) {
    val query by viewModel.searchQuery.collectAsState()
    val results by viewModel.searchResults.collectAsState(initial = emptyList())
    val categories by viewModel.categories.collectAsStateWithLifecycle()
    val catColors = categories.associate { it.id to Color(it.color.toInt() or (0xFF shl 24)) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Szukaj") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Wstecz")
                    }
                }
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = query,
                onValueChange = { viewModel.searchQuery.value = it },
                modifier = Modifier.fillMaxWidth().padding(12.dp),
                placeholder = { Text("Szukaj w treści i notatkach…") },
                singleLine = true
            )
            LazyColumn(Modifier.fillMaxSize()) {
                items(results, key = { it.id }) { entry ->
                    EntryRow(
                        entry,
                        entry.categoryId?.let { catColors[it] },
                        overdue = false,
                        onClick = { onOpen(entry.id) }
                    )
                }
            }
        }
    }
}
