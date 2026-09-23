package pl.myslnik.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import pl.myslnik.ui.AppViewModel

/**
 * Przegląd: wpisy ze Skrzynki po kolei. Jednym ruchem: termin,
 * zamiana w myśl, archiwum albo kosz.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReviewScreen(viewModel: AppViewModel, onBack: () -> Unit) {
    val inbox by viewModel.inbox.collectAsStateWithLifecycle()
    var showDuePicker by remember { mutableStateOf(false) }
    val current = inbox.lastOrNull() // najstarsze na końcu (inbox sortowany malejąco po dacie)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Przegląd (${inbox.size})") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Wstecz")
                    }
                }
            )
        }
    ) { padding ->
        if (current == null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Skrzynka pusta ✨", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(12.dp))
                    OutlinedButton(onClick = onBack) { Text("Wróć") }
                }
            }
            return@Scaffold
        }

        if (showDuePicker) {
            DuePickerDialog(
                viewModel = viewModel,
                onPicked = { millis ->
                    showDuePicker = false
                    if (millis != null) viewModel.snooze(current.id, millis)
                },
                onDismiss = { showDuePicker = false }
            )
        }

        Column(
            Modifier.fillMaxSize().padding(padding).padding(20.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp)) {
                    Text(current.content, style = MaterialTheme.typography.titleLarge)
                    if (current.note.isNotBlank()) {
                        Spacer(Modifier.height(8.dp))
                        Text(current.note, style = MaterialTheme.typography.bodyLarge)
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        if (current.type == "THOUGHT") "💭 myśl" else "☑ zadanie",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = { showDuePicker = true },
                modifier = Modifier.fillMaxWidth().height(60.dp)
            ) { Text("⏰ Nadaj termin") }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(
                    onClick = { viewModel.keepAsThought(current.id) },
                    modifier = Modifier.weight(1f).height(56.dp)
                ) { Text("💭 To myśl") }
                OutlinedButton(
                    onClick = { viewModel.markDone(current.id) },
                    modifier = Modifier.weight(1f).height(56.dp)
                ) { Text("✓ Zrobione") }
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(
                    onClick = { viewModel.archive(current.id) },
                    modifier = Modifier.weight(1f).height(56.dp)
                ) { Text("📦 Archiwum") }
                OutlinedButton(
                    onClick = { viewModel.trash(current.id) },
                    modifier = Modifier.weight(1f).height(56.dp)
                ) { Text("🗑 Usuń") }
            }
        }
    }
}
