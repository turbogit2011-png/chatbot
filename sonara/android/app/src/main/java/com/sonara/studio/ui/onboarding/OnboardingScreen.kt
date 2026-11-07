package com.sonara.studio.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.sonara.studio.data.prefs.SonaraSettings
import com.sonara.studio.ui.components.GlassCard
import com.sonara.studio.ui.components.GradientButton
import com.sonara.studio.ui.components.SectionLabel
import com.sonara.studio.ui.settings.SettingsViewModel
import com.sonara.studio.ui.theme.AuroraBrush

@Composable
fun OnboardingScreen(
    viewModel: SettingsViewModel,
    onDone: () -> Unit,
) {
    val config by viewModel.config.collectAsState()
    val ui by viewModel.ui.collectAsState()
    var server by remember(config.serverUrl) { mutableStateOf(config.serverUrl) }

    Scaffold { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(padding)
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Spacer(Modifier.height(24.dp))
            Box(
                Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(AuroraBrush),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.AutoAwesome, null, tint = Color.White, modifier = Modifier.size(32.dp))
            }
            Text("Sonara Studio", style = MaterialTheme.typography.displaySmall)
            Text(
                "Write a line, get a finished song — vocals, lyrics, arrangement and master — " +
                    "then extend it, cover it, split the stems and keep everything offline.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            GlassCard {
                Column {
                    SectionLabel("Point Sonara at an engine")
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "Sonara renders music on a server you control. Start the bundled Sonara server " +
                            "(see server/README.md) and paste its address below. On an emulator use " +
                            "${SonaraSettings.DEFAULT_SERVER_URL}; on a phone use your computer's LAN address.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = server,
                        onValueChange = { server = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Server address") },
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true,
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(onClick = {
                            viewModel.setServerUrl(server)
                            viewModel.testConnection()
                        }) { Text("Test connection") }
                        Spacer(Modifier.width(12.dp))
                        when {
                            ui.checking -> CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                            ui.healthy == true -> Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Check, null, tint = MaterialTheme.colorScheme.secondary)
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    ui.healthLine ?: "Connected",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.secondary,
                                )
                            }
                            ui.healthy == false -> Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Close, null, tint = MaterialTheme.colorScheme.error)
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    "Not reachable yet",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error,
                                )
                            }
                        }
                    }
                }
            }

            GradientButton(
                text = "Start creating",
                modifier = Modifier.fillMaxWidth(),
            ) {
                viewModel.setServerUrl(server)
                viewModel.completeOnboarding()
                onDone()
            }
            TextButton(onClick = {
                viewModel.completeOnboarding()
                onDone()
            }, modifier = Modifier.fillMaxWidth()) {
                Text("Set this up later")
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}
