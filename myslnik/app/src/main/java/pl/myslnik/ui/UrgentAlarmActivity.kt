package pl.myslnik.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.myslnik.MyslnikApp
import pl.myslnik.alarms.Notifier
import pl.myslnik.ui.theme.MyslnikTheme

/**
 * Pełnoekranowe przypomnienie PILNE na zablokowanym ekranie.
 * Pokazuje wyłącznie ten jeden wpis (lista nigdy nie jest widoczna bez odblokowania).
 */
class UrgentAlarmActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setShowWhenLocked(true)
        setTurnScreenOn(true)

        val entryId = intent.getStringExtra("entryId").orEmpty()
        val container = MyslnikApp.container(this)

        setContent {
            MyslnikTheme {
                var content by remember { mutableStateOf("…") }
                androidx.compose.runtime.LaunchedEffect(entryId) {
                    content = container.database.entryDao().byId(entryId)?.content ?: "(wpis usunięty)"
                }

                fun act(block: suspend () -> Unit) {
                    container.scope.launch {
                        block()
                        Notifier.cancelForEntry(this@UrgentAlarmActivity, entryId)
                    }
                    finish()
                }

                Scaffold { padding ->
                    Column(
                        modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text("🚨 PILNE", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.height(16.dp))
                        Text(content, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Start)
                        Spacer(Modifier.height(32.dp))
                        Button(
                            onClick = { act { container.repository.markDone(entryId) } },
                            modifier = Modifier.fillMaxWidth().height(64.dp)
                        ) { Text("✓ Zrobione") }
                        Spacer(Modifier.height(12.dp))
                        Row {
                            OutlinedButton(
                                onClick = { act { container.repository.snooze(entryId, System.currentTimeMillis() + 3_600_000) } },
                                modifier = Modifier.weight(1f).height(56.dp)
                            ) { Text("+1 h") }
                            Spacer(Modifier.width(12.dp))
                            OutlinedButton(
                                onClick = {
                                    act {
                                        val s = container.settingsRepo.current()
                                        val z = java.time.ZoneId.systemDefault()
                                        val t = java.time.ZonedDateTime.now(z).toLocalDate().plusDays(1)
                                            .atTime(s.rano / 60, s.rano % 60).atZone(z).toInstant().toEpochMilli()
                                        container.repository.snooze(entryId, t)
                                    }
                                },
                                modifier = Modifier.weight(1f).height(56.dp)
                            ) { Text("Jutro rano") }
                        }
                    }
                }
            }
        }
    }
}
