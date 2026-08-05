package com.turbogit.turboos.web

import android.webkit.WebView
import com.turbogit.turboos.obd.ObdException
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong
import org.json.JSONObject

/**
 * Asynchroniczny kanał żądanie/odpowiedź między WebView a warstwą natywną.
 *
 * DLACZEGO TO POWSTAŁO — NAJPOWAŻNIEJSZY PROBLEM ARCHITEKTONICZNY 0.2.0
 * --------------------------------------------------------------------
 * Metody wystawione przez `addJavascriptInterface` są wywoływane SYNCHRONICZNIE:
 * wątek JavaScript WebView blokuje się do momentu powrotu z metody Kotlina.
 * W 0.2.0 wszystkie operacje OBD były wykonywane w ciele takiej metody, więc:
 *
 *   • `connect()`  — skan BLE (do 12 s) + `connect` (do 15 s) + inicjalizacja ELM
 *                    → interfejs zamrożony na kilkadziesiąt sekund;
 *   • `readDtcs()` — 3 tryby × timeout 8 s → do 24 s zamrożenia;
 *   • `readSaeInspection()` — ~18 kolejnych komend ELM → w skrajnym przypadku minuty.
 *
 * Przez ten czas nie renderuje się nic: ani spinner, ani animacja postępu, ani
 * reakcja na dotyk. Dodatkowo `Promise.all([readVehicleInfo(), readDtcs(),
 * readInspection()])` po stronie webowej sugerował współbieżność, której nie było —
 * synchroniczne wywołania mostu wykonują się szeregowo.
 *
 * ROZWIĄZANIE
 * -----------
 * Każda metoda mostu zwraca natychmiast kopertę `{"ok":true,"data":{"requestId":…}}`,
 * a właściwa praca trafia na pulę wątków. Wynik wraca do strony przez
 * `window.__turboOSBridgeSettle(requestId, jsonString)`. Warstwa webowa opakowuje
 * to w `Promise`, więc `async/await` działa naprawdę asynchronicznie, a
 * `Promise.all` faktycznie zrównolegla odczyty niezależne od siebie.
 */
class BridgeDispatcher(
    private val webView: WebView,
    /** Zwraca `true`, dopóki bieżąca strona to zaufany, lokalny zasób aplikacji. */
    private val isTrustedPageLoaded: () -> Boolean,
    workerCount: Int = 2,
) : AutoCloseable {

    private companion object {
        const val SETTLE_FUNCTION = "window.__turboOSBridgeSettle"
        const val EVENT_FUNCTION = "window.__turboOSBridgeEvent"
    }

    /**
     * Pula wątków zamiast pojedynczego wątku: odczyty nieblokujące magistrali
     * (np. `listPairedDevices`) nie muszą czekać na trwający odczyt DTC.
     * Serializacja na poziomie magistrali OBD i tak zapewnia klient ELM327.
     */
    private val workers: ExecutorService = Executors.newFixedThreadPool(workerCount) { runnable ->
        Thread(runnable, "turboos-bridge").apply { isDaemon = true }
    }

    private val requestSequence = AtomicLong(0)

    @Volatile private var closed = false

    /**
     * Rejestruje żądanie i zwraca kopertę z jego identyfikatorem.
     * `block` wykonuje się poza wątkiem JavaScript.
     */
    fun dispatch(operation: String, block: () -> Any?): String {
        if (closed) {
            return failureEnvelope(ObdException("HOST_CLOSED", "Most OBD został zamknięty."))
        }

        val requestId = "req-${requestSequence.incrementAndGet()}"
        try {
            workers.execute {
                val payload = try {
                    successEnvelope(block())
                } catch (throwable: Throwable) {
                    failureEnvelope(asObdException(throwable))
                }
                settle(requestId, payload)
            }
        } catch (rejected: java.util.concurrent.RejectedExecutionException) {
            return failureEnvelope(
                ObdException("HOST_BUSY", "Most OBD nie przyjmuje nowych żądań.", cause = rejected),
            )
        }

        return successEnvelope(
            JSONObject().put("requestId", requestId).put("operation", operation).put("pending", true),
        )
    }

    /** Zdarzenie „push" (strumień danych na żywo) bez towarzyszącego żądania. */
    fun emit(channel: String, payload: String) {
        if (closed) return
        evaluate("$EVENT_FUNCTION(${JSONObject.quote(channel)}, ${JSONObject.quote(payload)});")
    }

    private fun settle(requestId: String, payload: String) {
        evaluate(
            "$SETTLE_FUNCTION(${JSONObject.quote(requestId)}, ${JSONObject.quote(payload)});",
        )
    }

    /**
     * `evaluateJavascript` musi być wołane na wątku UI i wyłącznie wtedy, gdy
     * załadowana jest zaufana strona lokalna — inaczej wynik diagnostyki
     * (w tym VIN) mógłby trafić do obcego dokumentu.
     */
    private fun evaluate(script: String) {
        webView.post {
            if (closed || !isTrustedPageLoaded()) return@post
            webView.evaluateJavascript(script, null)
        }
    }

    override fun close() {
        closed = true
        workers.shutdownNow()
    }

    // -------------------------------------------------------------- koperty

    fun successEnvelope(data: Any?): String =
        JSONObject().put("ok", true).put("data", data ?: JSONObject.NULL).toString()

    fun failureEnvelope(exception: ObdException): String {
        val error = JSONObject()
            .put("code", exception.code)
            .put("message", exception.message)
        exception.details?.let { error.put("details", it) }
        return JSONObject().put("ok", false).put("error", error).toString()
    }

    private fun asObdException(throwable: Throwable): ObdException = when (throwable) {
        is ObdException -> throwable
        is SecurityException -> ObdException(
            "PERMISSION_DENIED",
            "Brak uprawnienia systemowego wymaganego do tej operacji.",
            cause = throwable,
        )
        // Świadomie NIE przekazujemy `throwable.message` do warstwy webowej:
        // komunikaty wyjątków JVM potrafią zawierać adresy MAC i ścieżki plików.
        else -> ObdException(
            "UNEXPECTED_ERROR",
            "Operacja OBD nie powiodła się z powodu nieoczekiwanego błędu.",
            cause = throwable,
        )
    }
}
