package pl.myslnik.ui

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import pl.myslnik.MyslnikApp
import pl.myslnik.domain.EntryType
import pl.myslnik.domain.NightWindow
import pl.myslnik.domain.parser.PolishDateParser
import pl.myslnik.ui.theme.MyslnikTheme
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Lekki ekran szybkiego dodawania: autofokus + otwarta klawiatura, mikrofon,
 * przełącznik Zadanie/Myśl, zapis Enterem, zero potwierdzeń.
 * Działa z zablokowanego ekranu (showWhenLocked) — TYLKO dodawanie,
 * lista wpisów nigdy nie jest tu widoczna.
 */
class QuickAddActivity : ComponentActivity() {

    companion object {
        const val ACTION_QUICK_ADD = "pl.myslnik.ACTION_QUICK_ADD"
        const val ACTION_DICTATE = "pl.myslnik.ACTION_DICTATE"
    }

    private var speech: SpeechRecognizer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val container = MyslnikApp.container(this)
        val settings = runBlocking { container.settingsRepo.current() }
        val night = NightWindow.isNight(
            System.currentTimeMillis(), settings.nightStart, settings.nightEnd, ZoneId.systemDefault()
        )
        if (night) {
            // NOC: maksymalnie przygaszony ekran.
            window.attributes = window.attributes.apply { screenBrightness = 0.05f }
        }

        val sharedText = if (intent?.action == Intent.ACTION_SEND)
            intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty() else ""
        val startDictation = intent?.action == ACTION_DICTATE

        setContent {
            MyslnikTheme(nightDim = night) {
                QuickAddScreen(
                    initialText = sharedText,
                    startDictation = startDictation,
                    onSave = { text, type -> saveEntry(text, type) },
                    onClose = { finish() },
                    dayTimes = settings.dayTimes(),
                    startSpeech = ::startSpeechRecognition,
                    stopSpeech = { speech?.destroy(); speech = null },
                )
            }
        }
    }

    private val systemSpeechLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val text = result.data
            ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        if (result.resultCode == Activity.RESULT_OK && !text.isNullOrBlank()) {
            onSystemSpeechResult?.invoke(text)
        }
    }
    private var onSystemSpeechResult: ((String) -> Unit)? = null

    private val micPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> if (granted) pendingSpeechStart?.invoke() }
    private var pendingSpeechStart: (() -> Unit)? = null

    /**
     * Dyktowanie: SpeechRecognizer (pl-PL, preferuj offline), tekst na żywo,
     * automatyczny stop po ciszy. Gdy nie działa — systemowe okno rozpoznawania.
     */
    private fun startSpeechRecognition(
        onPartial: (String) -> Unit,
        onFinal: (String) -> Unit,
        onError: () -> Unit,
    ) {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingSpeechStart = { startSpeechRecognition(onPartial, onFinal, onError) }
            micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            fallbackSystemSpeech(onFinal); return
        }
        try {
            speech?.destroy()
            speech = SpeechRecognizer.createSpeechRecognizer(this).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onPartialResults(partialResults: Bundle?) {
                        partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            ?.firstOrNull()?.let(onPartial)
                    }
                    override fun onResults(results: Bundle?) {
                        val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            ?.firstOrNull().orEmpty()
                        if (text.isBlank()) onError() else onFinal(text)
                    }
                    override fun onError(error: Int) {
                        if (error == SpeechRecognizer.ERROR_NO_MATCH ||
                            error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                        ) onError()
                        else fallbackSystemSpeech(onFinal)
                    }
                    override fun onReadyForSpeech(params: Bundle?) {}
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {}
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
                startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pl-PL")
                    putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                })
            }
        } catch (_: Exception) {
            fallbackSystemSpeech(onFinal)
        }
    }

    private fun fallbackSystemSpeech(onFinal: (String) -> Unit) {
        onSystemSpeechResult = onFinal
        try {
            systemSpeechLauncher.launch(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pl-PL")
            })
        } catch (_: Exception) {
            Toast.makeText(this, "Rozpoznawanie mowy niedostępne", Toast.LENGTH_SHORT).show()
        }
    }

    private fun saveEntry(rawText: String, forcedType: EntryType?) {
        val text = rawText.trim()
        if (text.isEmpty()) { finish(); return }
        val container = MyslnikApp.container(this)
        container.scope.launch {
            val s = container.settingsRepo.current()
            val parsed = PolishDateParser(s.dayTimes()).parse(text, ZonedDateTime.now())
            val dueAt = parsed.dueAt?.toInstant()?.toEpochMilli()
            val type = forcedType ?: if (dueAt != null) EntryType.TASK else EntryType.THOUGHT
            container.repository.add(
                content = parsed.cleanedText.ifBlank { text },
                type = type,
                dueAt = dueAt,
            )
            runOnUiThread {
                vibrate()
                val msg = when {
                    dueAt != null -> {
                        val fmt = DateTimeFormatter.ofPattern("EEE d MMM, HH:mm", Locale.forLanguageTag("pl"))
                        "Zapisano ✓ — przypomnę ${fmt.format(Instant.ofEpochMilli(dueAt).atZone(ZoneId.systemDefault()))}"
                    }
                    else -> "Zapisano ✓ — trafi do porannego przeglądu"
                }
                Toast.makeText(this@QuickAddActivity, msg, Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    private fun vibrate() {
        getSystemService(Vibrator::class.java)
            ?.vibrate(VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE))
    }

    override fun onDestroy() {
        speech?.destroy(); speech = null
        super.onDestroy()
    }
}

@Composable
private fun QuickAddScreen(
    initialText: String,
    startDictation: Boolean,
    onSave: (String, EntryType?) -> Unit,
    onClose: () -> Unit,
    dayTimes: pl.myslnik.domain.parser.DayTimes,
    startSpeech: (onPartial: (String) -> Unit, onFinal: (String) -> Unit, onError: () -> Unit) -> Unit,
    stopSpeech: () -> Unit,
) {
    var text by remember { mutableStateOf(initialText) }
    var isTask by remember { mutableStateOf(true) }
    var forced by remember { mutableStateOf(false) }
    var listening by remember { mutableStateOf(false) }
    var autosaveIn by remember { mutableIntStateOf(-1) } // -1 = brak odliczania
    val focusRequester = remember { FocusRequester() }
    val parser = remember { PolishDateParser(dayTimes) }

    val parsed = remember(text) { parser.parse(text, ZonedDateTime.now()) }
    val chipLabel = parsed.dueAt?.let {
        val fmt = DateTimeFormatter.ofPattern("EEE d MMM HH:mm", Locale.forLanguageTag("pl"))
        "⏰ " + fmt.format(it)
    }

    fun save() {
        stopSpeech()
        onSave(text, if (forced) (if (isTask) EntryType.TASK else EntryType.THOUGHT) else null)
    }

    // AUTOZAPIS po dyktowaniu: 3 s, chyba że dotknięto „Edytuj".
    LaunchedEffect(autosaveIn) {
        if (autosaveIn > 0) {
            delay(1000)
            autosaveIn -= 1
        } else if (autosaveIn == 0) {
            save()
        }
    }

    fun beginDictation() {
        listening = true
        autosaveIn = -1
        startSpeech(
            { partial -> text = partial },
            { final ->
                text = final
                listening = false
                autosaveIn = 3
            },
            { listening = false }
        )
    }

    LaunchedEffect(Unit) {
        if (startDictation) beginDictation() else focusRequester.requestFocus()
    }

    Scaffold { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding)
                .systemBarsPadding().imePadding().padding(20.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Złap myśl", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                IconButton(onClick = onClose) { Icon(Icons.Default.Close, contentDescription = "Zamknij") }
            }
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = text,
                onValueChange = { text = it; autosaveIn = -1 },
                modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
                placeholder = { Text(if (listening) "Słucham… 🎙" else "Co masz w głowie?") },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { save() }),
                minLines = 2,
            )
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                FilterChip(
                    selected = isTask, onClick = { isTask = true; forced = true },
                    label = { Text("Zadanie") }
                )
                Spacer(Modifier.width(8.dp))
                FilterChip(
                    selected = !isTask, onClick = { isTask = false; forced = true },
                    label = { Text("Myśl") }
                )
                Spacer(Modifier.weight(1f))
                if (chipLabel != null) {
                    AssistChip(onClick = { }, label = { Text(chipLabel) })
                }
            }
            if (autosaveIn > 0) {
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Autozapis za $autosaveIn s…", modifier = Modifier.weight(1f))
                    OutlinedButton(onClick = { autosaveIn = -1; focusRequester.requestFocus() }) {
                        Text("Edytuj")
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            Row {
                OutlinedButton(
                    onClick = { beginDictation() },
                    modifier = Modifier.weight(1f).height(64.dp)
                ) {
                    Icon(Icons.Default.Mic, contentDescription = null, modifier = Modifier.size(28.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(if (listening) "Słucham…" else "Dyktuj")
                }
                Spacer(Modifier.width(12.dp))
                Button(
                    onClick = { save() },
                    modifier = Modifier.weight(1f).height(64.dp),
                    enabled = text.isNotBlank()
                ) {
                    Icon(Icons.Default.Send, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Zapisz")
                }
            }
        }
    }
}
