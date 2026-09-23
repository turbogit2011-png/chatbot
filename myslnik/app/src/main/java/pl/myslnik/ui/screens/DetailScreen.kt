package pl.myslnik.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import pl.myslnik.data.db.EntryEntity
import pl.myslnik.domain.RepeatCalculator
import pl.myslnik.domain.RepeatRule
import pl.myslnik.ui.AppViewModel
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

/** Szybkie opcje odkładania: 15 min, 1 h, 3 h, wieczorem, jutro, za tydzień + własny termin. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DuePickerDialog(
    viewModel: AppViewModel,
    onPicked: (Long?) -> Unit,
    onDismiss: () -> Unit,
) {
    var showCustomDate by remember { mutableStateOf(false) }
    var showCustomTime by remember { mutableStateOf(false) }
    var customDateMillis by remember { mutableStateOf<Long?>(null) }
    val dateState = rememberDatePickerState()
    val timeState = rememberTimePickerState(initialHour = 9, initialMinute = 0)
    val zone = ZoneId.systemDefault()

    fun option(label: String, compute: () -> Long?): Pair<String, () -> Long?> = label to compute

    val now = ZonedDateTime.now(zone)
    val settings = remember { mutableStateOf<pl.myslnik.data.settings.Settings?>(null) }
    LaunchedEffect(Unit) { settings.value = viewModel.settingsRepo.current() }
    val s = settings.value

    val options = listOf(
        option("Za 15 min") { now.plusMinutes(15).toInstant().toEpochMilli() },
        option("Za 1 h") { now.plusHours(1).toInstant().toEpochMilli() },
        option("Za 3 h") { now.plusHours(3).toInstant().toEpochMilli() },
        option("Dziś wieczorem") {
            val t = s?.wieczorem ?: (19 * 60)
            now.toLocalDate().atTime(t / 60, t % 60).atZone(zone).toInstant().toEpochMilli()
        },
        option("Jutro rano") {
            val t = s?.rano ?: (8 * 60)
            now.toLocalDate().plusDays(1).atTime(t / 60, t % 60).atZone(zone).toInstant().toEpochMilli()
        },
        option("Jutro") {
            val t = s?.defaultTime ?: (9 * 60)
            now.toLocalDate().plusDays(1).atTime(t / 60, t % 60).atZone(zone).toInstant().toEpochMilli()
        },
        option("Za tydzień") {
            val t = s?.defaultTime ?: (9 * 60)
            now.toLocalDate().plusDays(7).atTime(t / 60, t % 60).atZone(zone).toInstant().toEpochMilli()
        },
    )

    if (showCustomDate) {
        DatePickerDialog(
            onDismissRequest = { showCustomDate = false },
            confirmButton = {
                TextButton(onClick = {
                    customDateMillis = dateState.selectedDateMillis
                    showCustomDate = false
                    showCustomTime = true
                }) { Text("Dalej") }
            },
            dismissButton = { TextButton(onClick = { showCustomDate = false }) { Text("Anuluj") } }
        ) { DatePicker(state = dateState) }
        return
    }
    if (showCustomTime) {
        AlertDialog(
            onDismissRequest = { showCustomTime = false },
            title = { Text("Godzina") },
            text = { TimePicker(state = timeState) },
            confirmButton = {
                TextButton(onClick = {
                    val date = customDateMillis?.let {
                        Instant.ofEpochMilli(it).atZone(ZoneId.of("UTC")).toLocalDate()
                    } ?: LocalDate.now(zone)
                    val millis = date.atTime(timeState.hour, timeState.minute)
                        .atZone(zone).toInstant().toEpochMilli()
                    onPicked(millis)
                }) { Text("Ustaw") }
            },
            dismissButton = { TextButton(onClick = { showCustomTime = false }) { Text("Anuluj") } }
        )
        return
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Kiedy przypomnieć?") },
        text = {
            Column {
                options.forEach { (label, compute) ->
                    TextButton(onClick = { onPicked(compute()) }, modifier = Modifier.fillMaxWidth()) {
                        Text(label, modifier = Modifier.fillMaxWidth())
                    }
                }
                TextButton(onClick = { showCustomDate = true }, modifier = Modifier.fillMaxWidth()) {
                    Text("Własny termin…", modifier = Modifier.fillMaxWidth())
                }
                TextButton(onClick = { onPicked(null) }, modifier = Modifier.fillMaxWidth()) {
                    Text("Usuń termin", modifier = Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.error)
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Anuluj") } }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailScreen(viewModel: AppViewModel, entryId: String, onBack: () -> Unit) {
    val entry by viewModel.entryFlow(entryId).collectAsStateWithLifecycle(initialValue = null)
    val categories by viewModel.categories.collectAsStateWithLifecycle()
    var showDuePicker by remember { mutableStateOf(false) }
    var showRepeatPicker by remember { mutableStateOf(false) }

    val e = entry ?: return

    fun update(block: (EntryEntity) -> EntryEntity) = viewModel.save(block(e))

    if (showDuePicker) {
        DuePickerDialog(
            viewModel = viewModel,
            onPicked = { millis ->
                showDuePicker = false
                if (millis != null) viewModel.snooze(e.id, millis)
                else update { it.copy(dueAt = null, nextFireAt = null) }
            },
            onDismiss = { showDuePicker = false }
        )
    }
    if (showRepeatPicker) {
        AlertDialog(
            onDismissRequest = { showRepeatPicker = false },
            title = { Text("Powtarzanie") },
            text = {
                Column {
                    listOf(
                        "bez powtarzania" to null,
                        "codziennie" to RepeatRule.DAILY,
                        "dni robocze" to RepeatRule.WORKDAYS,
                        "pn, śr, pt" to RepeatRule.weekdays(setOf(1, 3, 5)),
                        "sob, nd" to RepeatRule.weekdays(setOf(6, 7)),
                        "co miesiąc" to RepeatRule.MONTHLY,
                        "co 2 dni" to RepeatRule.everyN(2),
                        "co 7 dni" to RepeatRule.everyN(7),
                        "co 14 dni" to RepeatRule.everyN(14),
                        "co 30 dni" to RepeatRule.everyN(30),
                    ).forEach { (label, rule) ->
                        TextButton(
                            onClick = { update { it.copy(repeatRule = rule) }; showRepeatPicker = false },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text(label, modifier = Modifier.fillMaxWidth()) }
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { showRepeatPicker = false }) { Text("Anuluj") } }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (e.type == "THOUGHT") "Myśl" else "Zadanie") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Wstecz")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.trash(e.id); onBack() }) {
                        Icon(Icons.Default.Delete, contentDescription = "Usuń")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            OutlinedTextField(
                value = e.content,
                onValueChange = { update { en -> en.copy(content = it) } },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Treść") },
                minLines = 2
            )
            OutlinedTextField(
                value = e.note,
                onValueChange = { update { en -> en.copy(note = it) } },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Notatka") },
                minLines = 2
            )

            // Typ
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = e.type == "TASK",
                    onClick = { update { it.copy(type = "TASK") } },
                    label = { Text("Zadanie") })
                FilterChip(
                    selected = e.type == "THOUGHT",
                    onClick = { viewModel.toThought(e.id) },
                    label = { Text("Myśl") })
            }

            // Termin
            Text("Termin", style = MaterialTheme.typography.titleMedium)
            AssistChip(
                onClick = { showDuePicker = true },
                label = {
                    Text(
                        e.dueAt?.let { "⏰ " + formatDue(it) + (if (e.userSetNight) " 🌙" else "") }
                            ?: "Ustaw termin…"
                    )
                }
            )

            // Powtarzanie
            Text("Powtarzanie", style = MaterialTheme.typography.titleMedium)
            AssistChip(
                onClick = { showRepeatPicker = true },
                label = { Text("🔁 " + RepeatCalculator.describe(e.repeatRule)) }
            )

            // Priorytet
            Text("Priorytet", style = MaterialTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(e.priority == 0, { update { it.copy(priority = 0) } }, { Text("normalny") })
                FilterChip(e.priority == 1, { update { it.copy(priority = 1) } }, { Text("⭐ ważny") })
                FilterChip(
                    e.priority == 2,
                    { update { it.copy(priority = 2, persistent = true) } },
                    { Text("🚨 PILNY") })
            }

            // Uparte przypomnienie
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Uparte przypomnienie", style = MaterialTheme.typography.bodyLarge)
                    Text(
                        "Ponawia co kilka minut, aż oznaczysz zrobione",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
                Switch(checked = e.persistent, onCheckedChange = { update { en -> en.copy(persistent = it) } })
            }

            // Kategoria
            Text("Kategoria", style = MaterialTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                FilterChip(e.categoryId == null, { update { it.copy(categoryId = null) } }, { Text("brak") })
            }
            categories.chunked(2).forEach { rowCats ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    rowCats.forEach { c ->
                        FilterChip(
                            selected = e.categoryId == c.id,
                            onClick = { update { it.copy(categoryId = c.id) } },
                            label = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    androidx.compose.foundation.layout.Box(
                                        Modifier.size(10.dp).clip(CircleShape)
                                            .background(Color(c.color.toInt() or (0xFF shl 24)))
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(c.name)
                                }
                            }
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Działania na statusie
            when (e.status) {
                "INBOX", "ACTIVE" -> Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { viewModel.markDone(e.id); onBack() }, modifier = Modifier.weight(1f)) {
                        Text("✓ Zrobione")
                    }
                    OutlinedButton(onClick = { viewModel.archive(e.id); onBack() }, modifier = Modifier.weight(1f)) {
                        Text("Archiwum")
                    }
                }
                "DONE", "ARCHIVED" -> OutlinedButton(
                    onClick = { viewModel.activate(e.id) }, modifier = Modifier.fillMaxWidth()
                ) { Text("Przywróć do aktywnych") }
                "TRASH" -> OutlinedButton(
                    onClick = { viewModel.restoreFromTrash(e.id); onBack() }, modifier = Modifier.fillMaxWidth()
                ) { Text("Przywróć z kosza") }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}
