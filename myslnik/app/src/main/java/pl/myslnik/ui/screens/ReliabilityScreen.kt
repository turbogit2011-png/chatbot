package pl.myslnik.ui.screens

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings as SysSettings
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import pl.myslnik.data.settings.Settings
import pl.myslnik.ui.AppViewModel

/**
 * Lista kontrolna NIEZAWODNOŚCI: zielony/czerwony status i „Napraw".
 * Czego nie da się wykryć programowo — „sprawdź ręcznie" + checkbox „zrobione".
 * Intencje do ekranów MIUI/HyperOS zawsze w try/catch z przejściem
 * do ustawień aplikacji, gdy się nie uda.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReliabilityScreen(viewModel: AppViewModel, onDone: () -> Unit) {
    val context = LocalContext.current
    var refreshTick by remember { mutableIntStateOf(0) }

    // Odśwież statusy po powrocie z ustawień systemowych.
    val lifecycleOwner = LocalLifecycleOwner.current
    androidx.compose.runtime.DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) refreshTick++
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    var settings by remember { mutableStateOf<Settings?>(null) }
    LaunchedEffect(Unit) { viewModel.settingsRepo.settings.collect { settings = it } }
    val s = settings ?: return

    val notifPermLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { refreshTick++ }

    val pkg = context.packageName
    fun openAppSettings() {
        context.startActivity(
            Intent(SysSettings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }
    fun tryStart(intent: Intent, fallbackMsg: String) {
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Exception) {
            Toast.makeText(context, fallbackMsg, Toast.LENGTH_LONG).show()
            openAppSettings()
        }
    }

    val checks = remember(refreshTick, s) {
        val nm = context.getSystemService(NotificationManager::class.java)
        val am = context.getSystemService(AlarmManager::class.java)
        val pm = context.getSystemService(PowerManager::class.java)
        buildList {
            add(
                CheckItem(
                    "notifications", "Powiadomienia",
                    "Bez tego żadne przypomnienie nie zadzwoni.",
                    status = if (NotificationManagerCompat.from(context).areNotificationsEnabled()) CheckStatus.OK else CheckStatus.BAD,
                    fix = { notifPermLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS) }
                )
            )
            add(
                CheckItem(
                    "exact_alarms", "Dokładne alarmy",
                    "Pozwala budzić telefon punktualnie (setAlarmClock).",
                    status = if (am.canScheduleExactAlarms()) CheckStatus.OK else CheckStatus.BAD,
                    fix = {
                        tryStart(
                            Intent(SysSettings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$pkg")),
                            "Otwórz: Ustawienia → Aplikacje → Myślnik → Alarmy i przypomnienia"
                        )
                    }
                )
            )
            add(
                CheckItem(
                    "full_screen", "Powiadomienia pełnoekranowe",
                    "PILNE przypomnienia na zablokowanym ekranie.",
                    status = if (nm.canUseFullScreenIntent()) CheckStatus.OK else CheckStatus.BAD,
                    fix = {
                        tryStart(
                            Intent(SysSettings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:$pkg")),
                            "Włącz pełnoekranowe powiadomienia w ustawieniach aplikacji"
                        )
                    }
                )
            )
            add(
                CheckItem(
                    "battery_opt", "Optymalizacja baterii wyłączona",
                    "System nie może usypiać Myślnika.",
                    status = if (pm.isIgnoringBatteryOptimizations(pkg)) CheckStatus.OK else CheckStatus.BAD,
                    fix = {
                        tryStart(
                            Intent(SysSettings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$pkg")),
                            "Wyłącz optymalizację baterii dla Myślnika"
                        )
                    }
                )
            )
            add(
                CheckItem(
                    "xiaomi_autostart", "Xiaomi: Autostart",
                    "Włącz Autostart, żeby alarmy działały po restarcie. Nie da się tego wykryć — sprawdź ręcznie i odhacz.",
                    status = if ("xiaomi_autostart" in s.manualChecksDone) CheckStatus.MANUAL_DONE else CheckStatus.MANUAL,
                    fix = {
                        tryStart(
                            Intent().setComponent(
                                ComponentName(
                                    "com.miui.securitycenter",
                                    "com.miui.permcenter.autostart.AutoStartManagementActivity"
                                )
                            ),
                            "Otwórz: Zabezpieczenia → Autostart i włącz Myślnik"
                        )
                    }
                )
            )
            add(
                CheckItem(
                    "xiaomi_battery", "Xiaomi: Oszczędzanie baterii → „Bez ograniczeń”",
                    "Ustawienia → Aplikacje → Myślnik → Oszczędzanie baterii → Bez ograniczeń. Sprawdź ręcznie i odhacz.",
                    status = if ("xiaomi_battery" in s.manualChecksDone) CheckStatus.MANUAL_DONE else CheckStatus.MANUAL,
                    fix = {
                        tryStart(
                            Intent().setComponent(
                                ComponentName(
                                    "com.miui.powerkeeper",
                                    "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"
                                )
                            ).putExtra("package_name", pkg).putExtra("package_label", "Myślnik"),
                            "Ustaw „Bez ograniczeń” w oszczędzaniu baterii"
                        )
                    }
                )
            )
            add(
                CheckItem(
                    "xiaomi_lockscreen", "Xiaomi: ekran blokady i wyskakujące okna",
                    "Uprawnienia: wyświetlanie na ekranie blokady, wyskakujące okna w tle, powiadomienia pływające i na ekranie blokady. Sprawdź ręcznie i odhacz.",
                    status = if ("xiaomi_lockscreen" in s.manualChecksDone) CheckStatus.MANUAL_DONE else CheckStatus.MANUAL,
                    fix = {
                        tryStart(
                            Intent("miui.intent.action.APP_PERM_EDITOR")
                                .setClassName(
                                    "com.miui.securitycenter",
                                    "com.miui.permcenter.permissions.PermissionsEditorActivity"
                                )
                                .putExtra("extra_pkgname", pkg),
                            "Otwórz uprawnienia aplikacji i włącz wyświetlanie na ekranie blokady"
                        )
                    }
                )
            )
            add(
                CheckItem(
                    "pin_recents", "Przypięcie w ostatnich (kłódka)",
                    "Otwórz ostatnie aplikacje, przytrzymaj kartę Myślnika i dotknij kłódki 🔒 — system nie zamknie aplikacji. Sprawdź ręcznie i odhacz.",
                    status = if ("pin_recents" in s.manualChecksDone) CheckStatus.MANUAL_DONE else CheckStatus.MANUAL,
                    fix = null
                )
            )
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("NIEZAWODNOŚĆ") }) }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)
        ) {
            Text(
                "Xiaomi agresywnie oszczędza baterię. Przejdź listę — każdy punkt na zielono to gwarancja, że przypomnienie przyjdzie.",
                style = MaterialTheme.typography.bodyLarge
            )
            Spacer(Modifier.padding(6.dp))
            checks.forEach { item ->
                Card(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                    Column(Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                when (item.status) {
                                    CheckStatus.OK -> "🟢"
                                    CheckStatus.BAD -> "🔴"
                                    CheckStatus.MANUAL -> "🟡"
                                    CheckStatus.MANUAL_DONE -> "🟢"
                                },
                                style = MaterialTheme.typography.titleLarge
                            )
                            Spacer(Modifier.width(10.dp))
                            Text(item.title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                        }
                        Text(
                            item.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (item.fix != null && item.status != CheckStatus.OK) {
                                OutlinedButton(onClick = item.fix) { Text("Napraw") }
                            }
                            Spacer(Modifier.weight(1f))
                            if (item.status == CheckStatus.MANUAL || item.status == CheckStatus.MANUAL_DONE) {
                                Text("zrobione")
                                Checkbox(
                                    checked = item.status == CheckStatus.MANUAL_DONE,
                                    onCheckedChange = { checked ->
                                        viewModel.updateSettings { st ->
                                            st.copy(
                                                manualChecksDone =
                                                    if (checked) st.manualChecksDone + item.id
                                                    else st.manualChecksDone - item.id
                                            )
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.padding(6.dp))
            OutlinedButton(
                onClick = {
                    viewModel.scheduleTestReminders()
                    Toast.makeText(context, "TEST: przypomnienia za 1 i 5 minut. Zablokuj telefon i odłóż go!", Toast.LENGTH_LONG).show()
                },
                modifier = Modifier.fillMaxWidth()
            ) { Text("🔔 TEST PRZYPOMNIENIA") }
            Spacer(Modifier.padding(4.dp))
            Button(onClick = onDone, modifier = Modifier.fillMaxWidth()) { Text("Gotowe — do aplikacji") }
            Spacer(Modifier.padding(12.dp))
        }
    }
}

private enum class CheckStatus { OK, BAD, MANUAL, MANUAL_DONE }

private class CheckItem(
    val id: String,
    val title: String,
    val description: String,
    val status: CheckStatus,
    val fix: (() -> Unit)?,
)
