package com.turbogit.turboos.web

import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.turbogit.turboos.MainActivity
import com.turbogit.turboos.obd.ObdDiagnosticsService
import com.turbogit.turboos.obd.ObdException
import com.turbogit.turboos.obd.ObdLinkType
import java.nio.charset.StandardCharsets
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong
import org.json.JSONObject

/**
 * Powierzchnia mostu wystawiana do WebView.
 *
 * ZMIANY WZGLĘDEM 0.2.0
 * ---------------------
 * 1. [ARCHITEKTURA] Klasa 0.2.0 miała 92 metody i łączyła cztery odpowiedzialności:
 *    kontrakt JS, walidację wejścia, cykl życia hosta oraz całą logikę diagnostyczną
 *    (skan DTC, przegląd SAE, próbkowanie live). Tutaj zostaje wyłącznie kontrakt
 *    i walidacja; domena mieszka w [ObdDiagnosticsService], transport w
 *    [BridgeDispatcher]. Klasa jest testowalna bez `WebView`.
 * 2. [WYDAJNOŚĆ / UX] Wszystkie operacje blokujące są asynchroniczne — patrz
 *    dokumentacja [BridgeDispatcher].
 * 3. [BEZPIECZEŃSTWO] `@JavascriptInterface` jest jawnie na każdej wystawionej
 *    metodzie, a każda z nich sprawdza zaufanie strony PRZED podjęciem pracy —
 *    w 0.2.0 kontrolę `ensureTrustedLocalContent()` miały tylko operacje na
 *    dokumentach (eksport, druk, wybudzanie ekranu), natomiast odczyt VIN i DTC
 *    był dostępny dla dowolnej załadowanej treści.
 * 4. [WYCIEK ZASOBÓW] Subskrypcje live są zamykane przy `onHostStop`, `close`
 *    ORAZ przy zmianie pokolenia hosta; identyfikator subskrypcji jest wiązany
 *    z pokoleniem, więc próbka ze starej sesji nie trafi do nowej strony.
 */
class TurboOsAndroidBridge(
    private val activity: MainActivity,
    webView: WebView,
    private val diagnostics: ObdDiagnosticsService,
) : AutoCloseable {

    private companion object {
        /** Nazwa funkcji zwrotnej strumienia live — wyłącznie wzorzec generowany przez naszą stronę. */
        val CALLBACK_NAME_PATTERN = Regex("^__turboOSObdLive_[A-Za-z0-9_]{1,32}$")
        val SAFE_CSV_FILE_NAME_PATTERN = Regex("^[A-Za-z0-9][A-Za-z0-9._-]{0,95}\\.csv$")
        val SAFE_PRINT_NAME_PATTERN = Regex("^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$")

        const val MIN_LIVE_INTERVAL_MS = 200
        const val MAX_LIVE_INTERVAL_MS = 10_000
        const val MAX_LIVE_SUBSCRIPTIONS = 4
        const val MAX_CSV_BYTES = 1024 * 1024
    }

    private val dispatcher = BridgeDispatcher(
        webView = webView,
        isTrustedPageLoaded = activity::isTrustedLocalPageLoaded,
    )

    private val scheduler: ScheduledExecutorService =
        Executors.newSingleThreadScheduledExecutor { runnable ->
            Thread(runnable, "turboos-live-obd").apply { isDaemon = true }
        }

    private val subscriptions = ConcurrentHashMap<String, ScheduledFuture<*>>()
    private val hostGeneration = AtomicLong(1)

    @Volatile private var hostActive = true
    @Volatile private var closed = false

    // ------------------------------------------------------- powierzchnia JS

    @JavascriptInterface
    fun connect(): String = guarded("connect") { diagnostics.connect() }

    @JavascriptInterface
    fun disconnect(): String = guarded("disconnect") {
        stopAllSubscriptions()
        diagnostics.disconnect()
        JSONObject().put("disconnected", true)
    }

    @JavascriptInterface
    fun listPairedDevices(): String = guarded("listPairedDevices") { diagnostics.listPairedDevices() }

    @JavascriptInterface
    fun selectDevice(address: String): String = guarded("selectDevice") {
        diagnostics.selectDevice(address, ObdLinkType.BLUETOOTH_CLASSIC)
        JSONObject().put("selected", address)
    }

    @JavascriptInterface
    fun readVehicleInfo(): String = guarded("readVehicleInfo") { diagnostics.readVehicleInfo() }

    @JavascriptInterface
    fun readDtcs(): String = guarded("readDtcs") { diagnostics.readDtcScan() }

    @JavascriptInterface
    fun readSaeInspection(): String = guarded("readSaeInspection") { diagnostics.readSaeInspection() }

    @JavascriptInterface
    fun clearDtcs(): String = guarded("clearDtcs") { diagnostics.clearDtcs() }

    @JavascriptInterface
    fun setKeepScreenOn(enabled: Boolean): String = guarded("setKeepScreenOn") {
        activity.setObdScreenAwake(enabled)
        JSONObject().put("enabled", enabled)
    }

    /**
     * Eksport CSV. Walidacja nazwy, typu MIME, treści i rozmiaru odbywa się
     * synchronicznie — odrzucenie ma być natychmiastowe i widoczne w `catch`
     * po stronie webowej, bez otwierania systemowego selektora plików.
     */
    @JavascriptInterface
    fun saveTextFile(fileName: String, mimeType: String, content: String): String = try {
        requireTrustedPage()
        requireHostActive()

        if (!SAFE_CSV_FILE_NAME_PATTERN.matches(fileName) || fileName.contains("..")) {
            throw ObdException("INVALID_FILE_NAME", "Odrzucono nieprawidłową nazwę pliku CSV.")
        }
        if (mimeType != "text/csv") {
            throw ObdException("INVALID_MIME_TYPE", "Dozwolony jest wyłącznie eksport text/csv.")
        }
        if (content.isEmpty() || content.indexOf('\u0000') >= 0) {
            throw ObdException(
                "INVALID_FILE_CONTENT",
                "Plik CSV jest pusty lub zawiera niedozwolony znak NUL.",
            )
        }
        val bytes = content.toByteArray(StandardCharsets.UTF_8)
        if (bytes.size > MAX_CSV_BYTES) {
            throw ObdException("EXPORT_TOO_LARGE", "Plik CSV przekracza bezpieczny limit 1 MB.")
        }

        activity.requestTextFileExport(fileName, mimeType, bytes)
        dispatcher.successEnvelope(JSONObject().put("started", true).put("fileName", fileName))
    } catch (exception: ObdException) {
        dispatcher.failureEnvelope(exception)
    }

    @JavascriptInterface
    fun printReport(documentName: String): String = try {
        requireTrustedPage()
        requireHostActive()
        if (!SAFE_PRINT_NAME_PATTERN.matches(documentName) || documentName.contains("..")) {
            throw ObdException("INVALID_DOCUMENT_NAME", "Odrzucono nieprawidłową nazwę raportu.")
        }
        activity.printLocalReport(documentName)
        dispatcher.successEnvelope(
            JSONObject().put("started", true).put("documentName", documentName),
        )
    } catch (exception: ObdException) {
        dispatcher.failureEnvelope(exception)
    }

    // ------------------------------------------------------- strumień „live"

    @JavascriptInterface
    fun startLiveData(callbackName: String, intervalMs: Int): String = try {
        requireTrustedPage()
        val generation = requireHostActive()

        if (!CALLBACK_NAME_PATTERN.matches(callbackName)) {
            throw ObdException("INVALID_CALLBACK", "Odrzucono nieprawidłową nazwę callbacku.")
        }
        // Limit liczby subskrypcji — 0.2.0 pozwalał zarejestrować dowolnie wiele,
        // a każda dokłada kolejny cykl odpytywania magistrali.
        if (subscriptions.size >= MAX_LIVE_SUBSCRIPTIONS) {
            throw ObdException(
                "TOO_MANY_SUBSCRIPTIONS",
                "Osiągnięto limit równoległych strumieni danych OBD.",
            )
        }
        if (subscriptions.containsKey(callbackName)) {
            throw ObdException("SUBSCRIPTION_EXISTS", "Ten strumień danych już działa.")
        }

        val interval = intervalMs.coerceIn(MIN_LIVE_INTERVAL_MS, MAX_LIVE_INTERVAL_MS).toLong()
        // `scheduleWithFixedDelay` (a nie `AtFixedRate`) — odstęp liczony po
        // zakończeniu próbki, więc wolna magistrala nie buduje kolejki zaległości.
        val future = scheduler.scheduleWithFixedDelay(
            { publishSample(callbackName, generation) },
            0L,
            interval,
            TimeUnit.MILLISECONDS,
        )
        subscriptions[callbackName] = future

        dispatcher.successEnvelope(
            JSONObject().put("started", true).put("intervalMs", interval),
        )
    } catch (exception: ObdException) {
        dispatcher.failureEnvelope(exception)
    }

    @JavascriptInterface
    fun stopLiveData(callbackName: String): String {
        subscriptions.remove(callbackName)?.cancel(false)
        return dispatcher.successEnvelope(JSONObject().put("stopped", true))
    }

    private fun publishSample(callbackName: String, generation: Long) {
        if (!isSubscriptionCurrent(callbackName, generation)) return

        val payload = try {
            dispatcher.successEnvelope(diagnostics.readLiveSample())
        } catch (throwable: Throwable) {
            // Błąd odczytu kończy subskrypcję — inaczej strona dostawałaby
            // ten sam błąd co interwał aż do ręcznego rozłączenia.
            subscriptions.remove(callbackName)?.cancel(false)
            val exception = throwable as? ObdException
                ?: ObdException("LIVE_STREAM_FAILED", "Natywny strumień danych OBD został zatrzymany.")
            dispatcher.failureEnvelope(exception)
        }

        if (generation == hostGeneration.get()) {
            dispatcher.emit(callbackName, payload)
        }
    }

    private fun isSubscriptionCurrent(callbackName: String, generation: Long): Boolean =
        hostActive && !closed &&
            generation == hostGeneration.get() &&
            subscriptions.containsKey(callbackName)

    private fun stopAllSubscriptions() {
        val pending = subscriptions.values.toList()
        subscriptions.clear()
        pending.forEach { it.cancel(false) }
    }

    // ----------------------------------------------------------- cykl życia

    fun onHostStart() {
        hostActive = true
    }

    /**
     * Wejście w tło zamyka wszystko, co dotyka magistrali. Przy powrocie strona
     * dostaje `turboos-obd-host-stopped` i sama decyduje o ponownym połączeniu —
     * podbicie pokolenia gwarantuje, że żadna zaległa próbka nie zostanie dostarczona.
     */
    fun onHostStop() {
        hostActive = false
        hostGeneration.incrementAndGet()
        stopAllSubscriptions()
        runCatching { diagnostics.disconnect() }
    }

    override fun close() {
        closed = true
        hostActive = false
        hostGeneration.incrementAndGet()
        stopAllSubscriptions()
        scheduler.shutdownNow()
        runCatching { diagnostics.close() }
        dispatcher.close()
    }

    // ------------------------------------------------------------- pomocnicze

    /**
     * Wspólna obudowa metod asynchronicznych: walidacja wstępna jest
     * synchroniczna, praca trafia na pulę wątków.
     */
    private fun guarded(operation: String, block: () -> Any?): String = try {
        requireTrustedPage()
        requireHostActive()
        dispatcher.dispatch(operation, block)
    } catch (exception: ObdException) {
        dispatcher.failureEnvelope(exception)
    }

    private fun requireTrustedPage() {
        if (!activity.isTrustedLocalPageLoaded()) {
            throw ObdException(
                "UNTRUSTED_CONTENT",
                "Operacje OBD są dostępne wyłącznie dla lokalnej aplikacji TurboOS.",
            )
        }
    }

    private fun requireHostActive(): Long {
        if (closed) throw ObdException("HOST_CLOSED", "Most OBD został zamknięty.")
        if (!hostActive) {
            throw ObdException(
                "HOST_INACTIVE",
                "Aplikacja jest w tle — połączenie OBD zostało wstrzymane.",
            )
        }
        return hostGeneration.get()
    }
}
