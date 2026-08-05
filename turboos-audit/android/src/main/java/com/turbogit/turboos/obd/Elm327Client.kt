package com.turbogit.turboos.obd

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import java.io.BufferedInputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.nio.charset.StandardCharsets
import java.util.UUID
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

/**
 * Klient ELM327 po Bluetooth Classic (SPP/RFCOMM).
 *
 * ZMIANY WZGLĘDEM 0.2.0
 * ---------------------
 * 1. [WYDAJNOŚĆ] `readUntilPrompt` czytał odpowiedź bajt po bajcie przez
 *    `InputStream.read()` na gołym gnieździe RFCOMM — jedno wywołanie systemowe na
 *    znak. Typowa odpowiedź `41 0C 1A F8\r\r>` to ~15 syscalli, a odpowiedź Mode 09
 *    (VIN, wieloramkowa) ponad 100. Teraz strumień jest opakowany w
 *    [BufferedInputStream] i czytany blokami do bufora roboczego.
 * 2. [NIEZAWODNOŚĆ] Timeout pojedynczej komendy nie zrywa już całego połączenia.
 *    W 0.2.0 każdy `TIMEOUT` wołał `closeSocket()`, więc jeden wolniejszy PID
 *    (np. `NO DATA` przy 8 s) wywracał sesję i wymuszał ponowne parowanie.
 *    Teraz próbujemy najpierw resynchronizacji (drain do znaku zachęty `>`),
 *    a gniazdo zamykamy dopiero, gdy adapter nie odpowiada.
 * 3. [BŁĄD LOGICZNY] Po `ATZ` adapter ELM327 potrzebuje ~1 s na reset. 0.2.0
 *    wysyłał `ATE0` natychmiast, przez co pierwsza inicjalizacja bywała odrzucana
 *    (`?`) i połączenie kończyło się błędem przy pierwszej próbie, a działało
 *    przy drugiej. Dodano oczekiwanie na gotowość + tolerancję na echo.
 * 4. [WYDAJNOŚĆ] `findNegativeResponse` kompilował nowy `Regex` dla każdej linii
 *    odpowiedzi. Teraz jeden prekompilowany wzorzec + parsowanie pozycyjne.
 * 5. [BEZPIECZEŃSTWO] Zawężony wzorzec dopuszczalnych komend AT — 0.2.0 przyjmował
 *    dowolne `AT[A-Z0-9]+`, w tym komendy zmieniające parametry magistrali
 *    (`ATSH`, `ATCF`, `ATPB`). Teraz obowiązuje jawna lista dozwolonych komend.
 */
class Elm327Client(context: Context) : ObdCommandSession, AutoCloseable {

    private companion object {
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

        const val CONNECT_TIMEOUT_MS = 15_000L
        const val DEFAULT_COMMAND_TIMEOUT_MS = 4_000L
        const val RESYNC_TIMEOUT_MS = 1_500L
        const val ADAPTER_RESET_SETTLE_MS = 1_000L
        const val MAX_RESPONSE_CHARS = 65_536
        const val READ_BUFFER_BYTES = 512
        const val PROMPT = '>'

        const val DEFAULT_PROTOCOL = "OBD-II / protokół automatyczny"

        /**
         * Komendy AT, które aplikacja ma prawo wysłać. Świadomie pomijamy komendy
         * modyfikujące nagłówki i filtry magistrali — TurboOS jest narzędziem
         * wyłącznie odczytowym.
         */
        val ALLOWED_AT_COMMANDS = setOf(
            "ATZ", "ATE0", "ATL0", "ATS0", "ATH0", "ATH1", "ATSP0", "ATDP", "ATDPN",
            "ATI", "AT@1", "ATRV", "ATAT1", "ATAT2", "ATST64", "ATSTFF",
        )

        val HEX_COMMAND_PATTERN = Regex("^[0-9A-F]{2,12}$")
        val NEGATIVE_RESPONSE_PATTERN = Regex("7F([0-9A-F]{2})([0-9A-F]{2})")

        val NEGATIVE_RESPONSE_LABELS = mapOf(
            "10" to "odrzucenie ogólne",
            "11" to "usługa nieobsługiwana",
            "12" to "podfunkcja nieobsługiwana",
            "21" to "ECU zajęty",
            "22" to "niespełnione warunki",
            "31" to "żądanie poza zakresem",
            "78" to "odpowiedź oczekująca",
        )
    }

    private val bluetoothManager = context.getSystemService(BluetoothManager::class.java)

    /** Jednowątkowa kolejka — ELM327 obsługuje dokładnie jedną komendę naraz. */
    private val queue: ExecutorService = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "turboos-elm327").apply { isDaemon = true }
    }

    @Volatile private var socket: BluetoothSocket? = null
    @Volatile private var input: InputStream? = null
    @Volatile private var output: OutputStream? = null
    @Volatile private var connectedDeviceName: String? = null
    @Volatile override var protocol: String = DEFAULT_PROTOCOL
        private set

    /** Bufor roboczy — własność wyłącznie wątku `turboos-elm327`. */
    private val readBuffer = ByteArray(READ_BUFFER_BYTES)
    private val responseBuilder = StringBuilder(256)

    override val isConnected: Boolean
        get() = socket?.isConnected == true && input != null && output != null

    // -------------------------------------------------------------- publiczne

    fun pairedDevices(): List<PairedDevice> {
        val adapter = requireAdapter()
        if (!adapter.isEnabled) {
            throw ObdException("BLUETOOTH_DISABLED", "Włącz Bluetooth i spróbuj ponownie.")
        }
        return adapter.bondedDevices
            .map { PairedDevice(it.address, it.name) }
            .sortedWith(compareBy({ it.name?.lowercase().orEmpty() }, { it.address }))
    }

    fun connect(address: String): ConnectionDetails {
        if (!BluetoothAdapter.checkBluetoothAddress(address)) {
            throw ObdException("INVALID_DEVICE", "Wybrany adres adaptera Bluetooth jest nieprawidłowy.")
        }
        val adapter = requireAdapter()
        if (!adapter.isEnabled) {
            throw ObdException("BLUETOOTH_DISABLED", "Włącz Bluetooth i spróbuj ponownie.")
        }
        val device = adapter.bondedDevices.firstOrNull { it.address == address }
            ?: throw ObdException(
                "DEVICE_NOT_PAIRED",
                "Wybrany adapter nie jest już sparowany. Sparuj go w ustawieniach Androida.",
            )

        disconnect()
        return awaitOrFail(
            future = queue.submit<ConnectionDetails> { openSession(device) },
            timeoutMs = CONNECT_TIMEOUT_MS,
            timeoutMessage = "Przekroczono czas łączenia z adapterem OBD.",
            fatal = true,
        )
    }

    override fun command(command: String, timeoutMs: Long): String {
        val normalized = command.trim().uppercase()
        requireAllowed(normalized)
        ensureConnected()

        return awaitOrFail(
            future = queue.submit<String> { exchange(normalized) },
            timeoutMs = timeoutMs.coerceAtLeast(250L),
            timeoutMessage = "Adapter OBD nie odpowiedział w wymaganym czasie.",
            // Zmiana względem 0.2.0: timeout komendy nie jest z definicji śmiertelny.
            fatal = false,
        )
    }

    fun disconnect() {
        closeSocket()
        connectedDeviceName = null
        protocol = DEFAULT_PROTOCOL
    }

    override fun close() {
        disconnect()
        queue.shutdownNow()
    }

    // -------------------------------------------------------------- wewnętrzne

    private fun requireAdapter(): BluetoothAdapter =
        bluetoothManager?.adapter
            ?: throw ObdException("BLUETOOTH_UNAVAILABLE", "To urządzenie nie obsługuje Bluetooth.")

    private fun ensureConnected() {
        if (!isConnected) {
            throw ObdException("NOT_CONNECTED", "Najpierw połącz adapter OBD.")
        }
    }

    private fun requireAllowed(command: String) {
        val allowed = command in ALLOWED_AT_COMMANDS || HEX_COMMAND_PATTERN.matches(command)
        if (!allowed) {
            throw ObdException("INVALID_COMMAND", "Odrzucono nieprawidłowe polecenie OBD.")
        }
    }

    private fun openSession(device: BluetoothDevice): ConnectionDetails {
        val rfcomm = device.createRfcommSocketToServiceRecord(SPP_UUID)
        socket = rfcomm
        try {
            rfcomm.connect()
        } catch (io: IOException) {
            closeSocket()
            throw ObdException(
                "CONNECT_FAILED",
                "Nie udało się połączyć z adapterem. Sprawdź zapłon, sparowanie " +
                    "i czy inna aplikacja nie używa OBD.",
                cause = io,
            )
        }

        // Buforowanie strumienia wejściowego — patrz punkt 1 w nagłówku klasy.
        input = BufferedInputStream(rfcomm.inputStream, READ_BUFFER_BYTES)
        output = rfcomm.outputStream
        connectedDeviceName = device.name ?: device.address

        initializeAdapter()

        protocol = exchange("ATDP")
            .lineSequence()
            .map(String::trim)
            .firstOrNull { it.isNotBlank() && !it.equals("OK", ignoreCase = true) }
            ?: DEFAULT_PROTOCOL

        return ConnectionDetails(connectedDeviceName ?: device.address, protocol)
    }

    /**
     * Sekwencja inicjalizacyjna ELM327. Po `ATZ` adapter przechodzi twardy reset,
     * dlatego czekamy na jego gotowość zanim wyślemy kolejne komendy (poprawka
     * względem 0.2.0, gdzie `ATE0` szło natychmiast po `ATZ`).
     */
    private fun initializeAdapter() {
        exchangeQuietly("ATZ", timeoutMs = 6_000L)
        Thread.sleep(ADAPTER_RESET_SETTLE_MS)
        drainQuietly()

        // Echo wyłączamy jako pierwsze — dopóki jest włączone, adapter odsyła
        // treść komendy, co zakłóca dopasowanie odpowiedzi.
        exchangeQuietly("ATE0", timeoutMs = 2_000L)
        listOf("ATL0", "ATS0", "ATH0", "ATSP0").forEach { exchangeQuietly(it, timeoutMs = 2_000L) }
    }

    /** Komenda konfiguracyjna — błąd nie przerywa łączenia, bo klony ELM różnią się zestawem AT. */
    private fun exchangeQuietly(command: String, timeoutMs: Long) {
        runCatching { exchange(command, timeoutMs) }
    }

    /**
     * Wysyła komendę i czyta odpowiedź do znaku zachęty. Wykonywane wyłącznie
     * na wątku `turboos-elm327`.
     */
    private fun exchange(command: String, timeoutMs: Long = DEFAULT_COMMAND_TIMEOUT_MS): String {
        val stream = input ?: throw ObdException("NOT_CONNECTED", "Brak aktywnego połączenia z OBD.")
        val sink = output ?: throw ObdException("NOT_CONNECTED", "Brak aktywnego połączenia z OBD.")

        val raw = try {
            sink.write("$command\r".toByteArray(StandardCharsets.US_ASCII))
            sink.flush()
            readUntilPrompt(stream, timeoutMs)
        } catch (io: IOException) {
            closeSocket()
            throw ObdException("IO_ERROR", "Utracono komunikację z adapterem OBD.", cause = io)
        }

        val cleaned = cleanResponse(raw, command)
        assertNoAdapterError(command, cleaned)
        return cleaned
    }

    /**
     * Czyta do znaku zachęty `>`. Egzekwuje własny deadline, bo `read()` na gnieździe
     * RFCOMM nie honoruje `Thread.interrupt()` — bez tego wątek kolejki potrafił
     * zawisnąć na stałe (0.2.0 ratował się zamykaniem gniazda z innego wątku).
     */
    private fun readUntilPrompt(stream: InputStream, timeoutMs: Long): String {
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)
        responseBuilder.setLength(0)

        while (true) {
            if (System.nanoTime() > deadline) {
                throw ObdException(
                    "TIMEOUT",
                    "Adapter OBD nie odesłał pełnej odpowiedzi w ciągu $timeoutMs ms.",
                )
            }
            // `available()` pozwala nie blokować dłużej niż do końca deadline'u.
            val ready = stream.available()
            if (ready <= 0) {
                Thread.sleep(2L)
                continue
            }
            val read = stream.read(readBuffer, 0, minOf(ready, readBuffer.size))
            if (read < 0) {
                throw ObdException("CONNECTION_CLOSED", "Adapter zamknął połączenie.")
            }
            for (i in 0 until read) {
                val char = readBuffer[i].toInt().toChar()
                if (char == PROMPT) return responseBuilder.toString()
                responseBuilder.append(char)
            }
            if (responseBuilder.length > MAX_RESPONSE_CHARS) {
                throw ObdException(
                    "RESPONSE_TOO_LARGE",
                    "Odpowiedź adaptera przekroczyła bezpieczny limit.",
                )
            }
        }
    }

    /**
     * Próba odzyskania synchronizacji po timeoucie: czekamy krótko na zaległy
     * znak zachęty. Sukces oznacza, że połączenie żyje i kolejna komenda ma sens.
     *
     * Wykonywane WYŁĄCZNIE na wątku kolejki — [readBuffer] i [responseBuilder] są
     * jego prywatnym stanem, a przerwany wcześniej odczyt zdążył już się rozwinąć
     * (pętla czekająca na dane budzi się z `Thread.sleep` na `interrupt()`).
     */
    private fun resynchronize(): Boolean = runCatching {
        val stream = input ?: return@runCatching false
        readUntilPrompt(stream, RESYNC_TIMEOUT_MS)
        true
    }.getOrDefault(false)

    private fun drainQuietly() {
        runCatching {
            val stream = input ?: return
            while (stream.available() > 0) {
                stream.read(readBuffer, 0, minOf(stream.available(), readBuffer.size))
            }
        }
    }

    private fun cleanResponse(raw: String, command: String): String =
        raw.replace('\r', '\n')
            .lineSequence()
            .map(String::trim)
            .filter { it.isNotEmpty() }
            // Odfiltrowanie echa komendy oraz komunikatu o wyszukiwaniu magistrali.
            .filterNot { it.equals(command, ignoreCase = true) }
            .filterNot { it.equals("SEARCHING...", ignoreCase = true) }
            .joinToString("\n")

    private fun assertNoAdapterError(command: String, response: String) {
        findNegativeResponse(command, response)?.let { negative ->
            throw ObdException(
                "ECU_NEGATIVE_RESPONSE",
                "ECU odrzucił usługę ${negative.service} " +
                    "(kod ${negative.code}: ${negative.label}).",
            )
        }

        val upper = response.uppercase()
        when {
            upper == "NO DATA" ->
                throw ObdException("NO_DATA", "ECU nie zwrócił danych dla tego zapytania.")

            upper == "?" ->
                throw ObdException("UNSUPPORTED_COMMAND", "Adapter nie obsługuje tego polecenia.")

            upper.contains("UNABLE TO CONNECT") -> throw ObdException(
                "ECU_UNAVAILABLE",
                "Adapter działa, ale nie może połączyć się ze sterownikiem pojazdu. Sprawdź zapłon.",
            )

            upper.contains("BUS ERROR") || upper.contains("CAN ERROR") ||
                (upper.contains("BUS INIT") && upper.contains("ERROR")) ->
                throw ObdException(
                    "VEHICLE_BUS_ERROR",
                    "Adapter zgłosił błąd magistrali pojazdu: $response",
                )

            upper.contains("BUFFER FULL") ->
                throw ObdException("ADAPTER_BUFFER_FULL", "Bufor adaptera OBD został przepełniony.")

            upper.contains("DATA ERROR") -> throw ObdException(
                "OBD_DATA_ERROR",
                "Adapter odebrał uszkodzoną lub niepełną odpowiedź ECU.",
            )

            upper.contains("STOPPED") ->
                throw ObdException("OBD_STOPPED", "Adapter przerwał odczyt OBD.")
        }
    }

    /**
     * Wykrywa negatywną odpowiedź ISO 14229 (`7F <usługa> <kod>`).
     * Jeden prekompilowany wzorzec zamiast `Regex` tworzonego per linia (0.2.0).
     */
    private fun findNegativeResponse(command: String, response: String): NegativeResponse? {
        if (!HEX_COMMAND_PATTERN.matches(command)) return null
        val service = command.take(2)

        for (line in response.lineSequence()) {
            val hex = line.uppercase().filter { it in "0123456789ABCDEF" }
            val match = NEGATIVE_RESPONSE_PATTERN.find(hex) ?: continue
            if (match.groupValues[1] != service) continue
            val code = match.groupValues[2]
            return NegativeResponse(
                service = service,
                code = code,
                label = NEGATIVE_RESPONSE_LABELS[code] ?: "odpowiedź negatywna",
            )
        }
        return null
    }

    private fun <T> awaitOrFail(
        future: Future<T>,
        timeoutMs: Long,
        timeoutMessage: String,
        fatal: Boolean,
    ): T = try {
        future.get(timeoutMs, TimeUnit.MILLISECONDS)
    } catch (timeout: TimeoutException) {
        future.cancel(true)
        handleTimeout(fatal)
        throw ObdException("TIMEOUT", timeoutMessage, cause = timeout)
    } catch (interrupted: InterruptedException) {
        Thread.currentThread().interrupt()
        closeSocket()
        throw ObdException("INTERRUPTED", "Operacja OBD została przerwana.", cause = interrupted)
    } catch (execution: java.util.concurrent.ExecutionException) {
        when (val cause = execution.cause) {
            is ObdException -> throw cause
            else -> throw ObdException(
                "IO_ERROR",
                "Operacja OBD nie powiodła się.",
                cause = cause ?: execution,
            )
        }
    }

    /**
     * Po timeoucie komendy najpierw próbujemy odzyskać sesję. Zamykanie gniazda
     * przy każdym timeoucie (zachowanie 0.2.0) niepotrzebnie kończyło diagnostykę.
     *
     * Resynchronizacja jest zlecana kolejce, a nie wykonywana na wątku
     * wywołującego — inaczej dwa wątki dotykałyby tego samego bufora odczytu.
     */
    private fun handleTimeout(fatal: Boolean) {
        if (fatal) {
            closeSocket()
            return
        }
        val recovered = runCatching {
            queue.submit<Boolean> { resynchronize() }
                .get(RESYNC_TIMEOUT_MS * 2, TimeUnit.MILLISECONDS)
        }.getOrDefault(false)

        if (!recovered) closeSocket()
    }

    private fun closeSocket() {
        runCatching { input?.close() }
        runCatching { output?.close() }
        runCatching { socket?.close() }
        input = null
        output = null
        socket = null
    }

    private data class NegativeResponse(val service: String, val code: String, val label: String)
}
