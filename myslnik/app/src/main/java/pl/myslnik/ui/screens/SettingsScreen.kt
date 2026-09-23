package pl.myslnik.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import pl.myslnik.data.db.CategoryEntity
import pl.myslnik.data.settings.Settings
import pl.myslnik.ui.AppViewModel
import java.util.UUID

private fun fmtMin(min: Int) = "%d:%02d".format(min / 60, min % 60)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimeSettingRow(
    label: String,
    minutes: Int,
    onChange: (Int) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }
    if (showPicker) {
        val state = rememberTimePickerState(initialHour = minutes / 60, initialMinute = minutes % 60, is24Hour = true)
        AlertDialog(
            onDismissRequest = { showPicker = false },
            title = { Text(label) },
            text = { TimePicker(state = state) },
            confirmButton = {
                TextButton(onClick = { onChange(state.hour * 60 + state.minute); showPicker = false }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showPicker = false }) { Text("Anuluj") } }
        )
    }
    Row(
        Modifier.fillMaxWidth().clickable { showPicker = true }.padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
        Text(fmtMin(minutes), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
private fun SectionTitle(text: String) {
    Spacer(Modifier.padding(top = 8.dp))
    Text(text, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
    HorizontalDivider(Modifier.padding(vertical = 4.dp))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(viewModel: AppViewModel, onBack: () -> Unit, onOpenReliability: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var settings by remember { mutableStateOf<Settings?>(null) }
    androidx.compose.runtime.LaunchedEffect(Unit) {
        viewModel.settingsRepo.settings.collect { settings = it }
    }
    val s = settings ?: return
    val categories by viewModel.categories.collectAsStateWithLifecycle()
    val trash by viewModel.trash.collectAsStateWithLifecycle()

    fun set(block: (Settings) -> Settings) = viewModel.updateSettings { block(it) }

    val backupDirLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocumentTree()
    ) { uri: Uri? ->
        if (uri != null) {
            context.contentResolver.takePersistableUriPermission(
                uri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
            set { it.copy(backupDirUri = uri.toString()) }
            Toast.makeText(context, "Folder kopii ustawiony ✓", Toast.LENGTH_SHORT).show()
        }
    }
    val exportLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json")
    ) { uri: Uri? ->
        if (uri != null) scope.launch {
            try {
                viewModel.container.backupManager.writeExportTo(uri)
                Toast.makeText(context, "Wyeksportowano ✓", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(context, "Błąd eksportu: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri != null) scope.launch {
            try {
                val (added, updated) = viewModel.container.backupManager.importFrom(uri)
                viewModel.container.startupSync()
                Toast.makeText(context, "Import: $added nowych, $updated zaktualizowanych", Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(context, "Błąd importu: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    var editCategory by remember { mutableStateOf<CategoryEntity?>(null) }
    var showTrash by remember { mutableStateOf(false) }

    editCategory?.let { cat ->
        var name by remember(cat.id) { mutableStateOf(cat.name) }
        val palette = listOf(0xFF4FC3F7, 0xFF81C784, 0xFFFFD54F, 0xFFBA68C8, 0xFFE57373, 0xFF90A4AE, 0xFFFFB74D)
        var color by remember(cat.id) { mutableStateOf(cat.color) }
        AlertDialog(
            onDismissRequest = { editCategory = null },
            title = { Text("Kategoria") },
            text = {
                Column {
                    OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nazwa") })
                    Spacer(Modifier.padding(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        palette.forEach { c ->
                            Text(
                                if (color == c) "●✓" else "●",
                                color = androidx.compose.ui.graphics.Color(c.toInt() or (0xFF shl 24)),
                                style = MaterialTheme.typography.titleLarge,
                                modifier = Modifier.clickable { color = c }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.saveCategory(cat.copy(name = name, color = color))
                    editCategory = null
                }) { Text("Zapisz") }
            },
            dismissButton = {
                Row {
                    TextButton(onClick = { viewModel.deleteCategory(cat.id); editCategory = null }) {
                        Text("Usuń", color = MaterialTheme.colorScheme.error)
                    }
                    TextButton(onClick = { editCategory = null }) { Text("Anuluj") }
                }
            }
        )
    }

    if (showTrash) {
        AlertDialog(
            onDismissRequest = { showTrash = false },
            title = { Text("Kosz (${trash.size})") },
            text = {
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    if (trash.isEmpty()) Text("Kosz pusty. Usunięte wpisy leżą tu 30 dni.")
                    trash.forEach { e ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(e.content, Modifier.weight(1f), maxLines = 1)
                            TextButton(onClick = { viewModel.restoreFromTrash(e.id) }) { Text("Przywróć") }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { showTrash = false }) { Text("Zamknij") } }
        )
    }

    androidx.compose.material3.Scaffold(
        topBar = {
            androidx.compose.material3.TopAppBar(
                title = { Text("Ustawienia") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Wstecz")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)
        ) {
            SectionTitle("NIEZAWODNOŚĆ")
            Button(onClick = onOpenReliability, modifier = Modifier.fillMaxWidth()) {
                Text("Lista kontrolna niezawodności")
            }
            Spacer(Modifier.padding(4.dp))
            OutlinedButton(
                onClick = {
                    viewModel.scheduleTestReminders()
                    Toast.makeText(context, "TEST: przypomnienia za 1 i 5 minut. Zablokuj telefon i odłóż go!", Toast.LENGTH_LONG).show()
                },
                modifier = Modifier.fillMaxWidth()
            ) { Text("🔔 TEST PRZYPOMNIENIA") }

            SectionTitle("NOC")
            TimeSettingRow("Początek nocy", s.nightStart) { v -> set { it.copy(nightStart = v) } }
            TimeSettingRow("Koniec nocy (poranny przegląd)", s.nightEnd) { v -> set { it.copy(nightEnd = v) } }

            SectionTitle("PRZEGLĄDY")
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Wieczorne podsumowanie", Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                Switch(checked = s.eveningEnabled, onCheckedChange = { v -> set { it.copy(eveningEnabled = v) } })
            }
            if (s.eveningEnabled) {
                TimeSettingRow("Godzina podsumowania", s.eveningTime) { v -> set { it.copy(eveningTime = v) } }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Powrót myśli po (dniach)", Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                listOf(1, 3, 7).forEach { d ->
                    TextButton(onClick = { set { it.copy(thoughtReturnDays = d) } }) {
                        Text(
                            "$d",
                            color = if (s.thoughtReturnDays == d) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Uparte: ponawiaj co (min)", Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                listOf(5, 10, 20, 30).forEach { m ->
                    TextButton(onClick = { set { it.copy(nagIntervalMin = m) } }) {
                        Text(
                            "$m",
                            color = if (s.nagIntervalMin == m) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            SectionTitle("PORY DNIA (dla parsera)")
            TimeSettingRow("Rano", s.rano) { v -> set { it.copy(rano = v) } }
            TimeSettingRow("Przed południem", s.przedPoludniem) { v -> set { it.copy(przedPoludniem = v) } }
            TimeSettingRow("W południe", s.poludnie) { v -> set { it.copy(poludnie = v) } }
            TimeSettingRow("Po południu", s.poPoludniu) { v -> set { it.copy(poPoludniu = v) } }
            TimeSettingRow("Wieczorem", s.wieczorem) { v -> set { it.copy(wieczorem = v) } }
            TimeSettingRow("W nocy", s.wNocy) { v -> set { it.copy(wNocy = v) } }
            TimeSettingRow("Domyślna godzina terminu", s.defaultTime) { v -> set { it.copy(defaultTime = v) } }

            SectionTitle("SZYBKIE DODAWANIE")
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Stałe powiadomienie „Dodaj”", Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                Switch(checked = s.ongoingNotification, onCheckedChange = { v -> set { it.copy(ongoingNotification = v) } })
            }

            SectionTitle("KATEGORIE")
            categories.forEach { c ->
                Row(
                    Modifier.fillMaxWidth().clickable { editCategory = c }.padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("●", color = androidx.compose.ui.graphics.Color(c.color.toInt() or (0xFF shl 24)))
                    Spacer(Modifier.width(10.dp))
                    Text(c.name, style = MaterialTheme.typography.bodyLarge)
                }
            }
            OutlinedButton(onClick = {
                editCategory = CategoryEntity(UUID.randomUUID().toString(), "", 0xFF90A4AE, categories.size)
            }) { Text("+ Nowa kategoria") }

            SectionTitle("DANE I KOPIA")
            Text(
                if (s.backupDirUri.isBlank()) "Kopia automatyczna: folder NIE ustawiony ⚠"
                else "Kopia automatyczna: codziennie, ostatnie 7 plików ✓",
                style = MaterialTheme.typography.bodyLarge
            )
            Spacer(Modifier.padding(2.dp))
            OutlinedButton(onClick = { backupDirLauncher.launch(null) }, modifier = Modifier.fillMaxWidth()) {
                Text("Wybierz folder kopii automatycznej")
            }
            OutlinedButton(onClick = { exportLauncher.launch("myslnik-eksport.json") }, modifier = Modifier.fillMaxWidth()) {
                Text("Eksportuj teraz (JSON)")
            }
            OutlinedButton(onClick = { importLauncher.launch(arrayOf("application/json", "text/*", "*/*")) }, modifier = Modifier.fillMaxWidth()) {
                Text("Importuj (scala po UUID)")
            }
            OutlinedButton(onClick = { showTrash = true }, modifier = Modifier.fillMaxWidth()) {
                Text("🗑 Kosz (${trash.size})")
            }
            Spacer(Modifier.padding(16.dp))
        }
    }
}
