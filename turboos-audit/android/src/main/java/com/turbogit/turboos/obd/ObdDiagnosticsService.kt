package com.turbogit.turboos.obd

import android.content.SharedPreferences
import android.os.SystemClock
import java.time.Instant
import java.util.concurrent.atomic.AtomicLong
import org.json.JSONArray
import org.json.JSONObject

/**
 * Warstwa domenowa diagnostyki OBD — wydzielona z 92-metodowej klasy mostu 0.2.0.
 *
 * ZMIANY WZGLĘDEM 0.2.0
 * ---------------------
 * 1. [WYDAJNOŚĆ] Mapa wspieranych PID-ów jest odczytywana raz, przy `connect()`.
 *    W 0.2.0 zbiór `supportedMode01Pids` był ustawiany wyłącznie jako efekt
 *    uboczny `readSaeInspection()` (jedno przypisanie w całej klasie), a warstwa
 *    webowa połykała błąd tej operacji przez `.catch(...)`. Gdy przegląd SAE się
 *    nie powiódł — częste przy klonach ELM327 — filtr pozostawał `null` i każdy
 *    PID był odpytywany w każdym cyklu. Na pojeździe bez czujnika MAF `0110`
 *    kończyło się wtedy `NO DATA` dopiero po pełnym timeoucie, w każdej próbce.
 * 2. [WYDAJNOŚĆ] Wynik „PID nieobsługiwany" jest zapamiętywany ([unsupportedPids])
 *    i nie jest ponawiany do końca sesji. 0.2.0 ponawiał go bez końca.
 * 3. [BŁĄD LOGICZNY] `sampleDurationMs` w 0.2.0 mierzył czas próbki, ale
 *    `timestamp` był brany PO odczycie, a `sampleStartedAt` PRZED — obie wartości
 *    z `Instant.now()`, mimo że czas trwania liczono z `elapsedRealtime()`.
 *    Zmiana zegara systemowego w trakcie jazdy dawała ujemny odstęp między
 *    znacznikami. Teraz oba znaczniki pochodzą z jednego pomiaru monotonicznego.
 * 4. [WSPÓŁBIEŻNOŚĆ] `slowLiveCache` było zwykłym polem zapisywanym z wątku
 *    schedulera i czytanym stamtąd samego, ale bez `@Volatile` — po refaktoryzacji
 *    na pulę wątków byłby to realny wyścig. Stan jest teraz niezmienny i
 *    publikowany atomowo.
 */
class ObdDiagnosticsService(
    private val classicClient: Elm327Client,
    private val preferences: SharedPreferences,
    /** Wywoływane przed operacją wymagającą uprawnienia BLUETOOTH_CONNECT. */
    private val ensureBluetoothPermission: () -> Unit,
) : AutoCloseable {

    private companion object {
        const val PREF_ADDRESS = "selected_device_address"
        const val PREF_LINK = "selected_device_link"
        const val PREF_NAME = "selected_device_name"

        const val DTC_TIMEOUT_MS = 8_000L
        const val LIVE_TIMEOUT_MS = 2_000L

        /** PID-y odświeżane w każdej próbce (dynamika silnika). */
        val FAST_PIDS = listOf(
            LivePid(0x0C, "010C", "engineRpm", ObdParser::parseRpm),
            LivePid(0x0B, "010B", "actualBoostKpa", ObdParser::parseMapKpa),
            LivePid(0x10, "0110", "mafGps", ObdParser::parseMafGps),
            LivePid(0x04, "0104", "engineLoadPercent", ObdParser::parseEngineLoadPercent),
        )

        /** PID-y wolnozmienne — odświeżane co [SLOW_PID_EVERY_N] próbek. */
        val SLOW_PIDS = listOf(
            LivePid(0x0D, "010D", "vehicleSpeedKph", ObdParser::parseSpeedKph),
            LivePid(0x05, "0105", "coolantTemperatureC", ObdParser::parseCoolantTemperatureC),
            LivePid(0x0F, "010F", "intakeAirTemperatureC", ObdParser::parseIntakeTemperatureC),
            LivePid(0x42, "0142", "batteryVoltageV", ObdParser::parseControlModuleVoltage),
        )

        const val SLOW_PID_EVERY_N = 4L

        /** Kody, przy których PID uznajemy za trwale nieobsługiwany. */
        val PERMANENTLY_UNSUPPORTED = setOf("UNSUPPORTED_COMMAND", "ECU_NEGATIVE_RESPONSE")

        /** Pola, których ten most nie potrafi jeszcze dostarczyć — kontrakt dla UI. */
        val UNSUPPORTED_FIELDS = listOf(
            "requestedBoostKpa", "dpfSootMassG", "dpfDifferentialPressureHpa",
            "dpfRegenerationActive", "egrCommandPercent", "egrActualPercent",
            "turboActuatorCommandPercent", "turboActuatorActualPercent",
        )
    }

    private data class LivePid(
        val pid: Int,
        val command: String,
        val jsonField: String,
        val parse: (String) -> Double?,
    )

    private val sampleSequence = AtomicLong(0)

    @Volatile private var supportedMode01Pids: Set<Int>? = null
    @Volatile private var slowValues: Map<String, Double> = emptyMap()

    private val unsupportedPids = java.util.concurrent.ConcurrentHashMap.newKeySet<Int>()

    // ------------------------------------------------------------- połączenie

    fun connect(): JSONObject {
        ensureBluetoothPermission()
        val address = preferences.getString(PREF_ADDRESS, null)
            ?: throw ObdException(
                "DEVICE_NOT_SELECTED",
                "Wybierz adapter OBD z listy sparowanych urządzeń.",
            )

        val details = classicClient.connect(address)
        resetSessionState()
        // Jednorazowy odczyt mapy wspieranych PID-ów; brak odpowiedzi nie jest błędem
        // krytycznym — wtedy po prostu odpytujemy wszystkie PID-y jak w 0.2.0.
        supportedMode01Pids = runCatching { readSupportedMode01Pids() }.getOrNull()

        return JSONObject()
            .put("deviceName", details.deviceName)
            .put("protocol", details.protocol)
            .put("linkType", ObdLinkType.BLUETOOTH_CLASSIC.wireName)
            .put("connectedAt", Instant.now().toString())
            .put("addressMasked", maskBluetoothAddress(address))
            .put("simulated", false)
            .put("supportedPidCount", supportedMode01Pids?.size ?: JSONObject.NULL)
    }

    fun disconnect() {
        classicClient.disconnect()
        resetSessionState()
    }

    fun listPairedDevices(): JSONObject {
        ensureBluetoothPermission()
        val devices = JSONArray()
        classicClient.pairedDevices().forEach { device ->
            devices.put(
                JSONObject()
                    .put("address", device.address)
                    .put("addressMasked", maskBluetoothAddress(device.address))
                    .put("name", device.name ?: JSONObject.NULL)
                    .put("linkType", ObdLinkType.BLUETOOTH_CLASSIC.wireName),
            )
        }
        return JSONObject().put("devices", devices)
    }

    fun selectDevice(address: String, linkType: ObdLinkType) {
        ensureBluetoothPermission()
        val paired = classicClient.pairedDevices().firstOrNull { it.address == address }
            ?: throw ObdException("DEVICE_NOT_PAIRED", "Ten adapter nie jest sparowany.")

        preferences.edit()
            .putString(PREF_ADDRESS, paired.address)
            .putString(PREF_LINK, linkType.wireName)
            .putString(PREF_NAME, paired.name)
            .apply()
    }

    private fun resetSessionState() {
        supportedMode01Pids = null
        slowValues = emptyMap()
        unsupportedPids.clear()
        sampleSequence.set(0)
    }

    // -------------------------------------------------------------- odczyty

    fun readVehicleInfo(): JSONObject {
        requireConnection()
        return JSONObject()
            .put("vin", readVinOrNull() ?: JSONObject.NULL)
            .put("protocol", classicClient.protocol)
            .put("simulated", false)
    }

    private fun readVinOrNull(): String? = optional("0902", ObdParser::parseVin)

    /**
     * Skan DTC we wszystkich trzech trybach. Tryb 03 (kody potwierdzone) jest
     * obowiązkowy — jego niepowodzenie przerywa skan, bo pusta lista byłaby
     * nieodróżnialna od „brak usterek".
     */
    fun readDtcScan(): JSONObject {
        requireConnection()

        val statuses = LinkedHashMap<DtcReadMode, DtcReadStatus>()
        val byCode = LinkedHashMap<String, MutableSet<String>>()

        for (mode in DtcReadMode.entries) {
            val codes = try {
                val response = classicClient.command(mode.command, DTC_TIMEOUT_MS)
                statuses[mode] = DtcReadStatus.OK
                ObdParser.parseDtcs(response, mode.responseService)
            } catch (exception: ObdException) {
                val recoverable = DtcModeReadPolicy.recoverableStatus(exception.code)
                    ?: throw exception
                statuses[mode] = recoverable
                emptyList()
            }
            codes.forEach { code -> byCode.getOrPut(code) { linkedSetOf() } += mode.dtcStatus }
        }

        val confirmedStatus = statuses[DtcReadMode.CONFIRMED]
        if (confirmedStatus != DtcReadStatus.OK) {
            throw ObdException(
                "DTC_CONFIRMED_STATUS_UNKNOWN",
                "Nie można bezpiecznie potwierdzić stanu kodów Mode 03.",
                details = JSONObject()
                    .put("mode", DtcReadMode.CONFIRMED.command)
                    .put("status", (confirmedStatus ?: DtcReadStatus.ERROR).wireValue),
            )
        }

        val dtcs = JSONArray()
        byCode.forEach { (code, modes) ->
            val ordered = listOf("confirmed", "pending", "permanent").filter { it in modes }
            dtcs.put(
                JSONObject()
                    .put("code", code)
                    .put("status", ordered.firstOrNull() ?: "confirmed")
                    .put("statuses", JSONArray(ordered)),
            )
        }

        val modeStatuses = JSONObject()
        statuses.forEach { (mode, status) -> modeStatuses.put(mode.command, status.wireValue) }

        return JSONObject().put("dtcs", dtcs).put("modes", modeStatuses)
    }

    fun clearDtcs(): JSONObject {
        requireConnection()
        val response = classicClient.command("04", DTC_TIMEOUT_MS)
        if (!ObdParser.isClearDtcAcknowledged(response)) {
            throw ObdException(
                "CLEAR_NOT_ACKNOWLEDGED",
                "ECU nie potwierdził skasowania kodów usterek.",
            )
        }
        // Po skasowaniu odczytujemy stan ponownie — UI musi pokazać, co zostało.
        val remaining = runCatching {
            ObdParser.parseDtcs(classicClient.command("03", DTC_TIMEOUT_MS))
        }.getOrDefault(emptyList())

        return JSONObject()
            .put("cleared", true)
            .put("remaining", JSONArray(remaining))
            .put("completedAt", Instant.now().toString())
    }

    /**
     * Przegląd SAE OBD-II. Operacja jest z natury długa (kilkanaście komend),
     * dlatego MUSI działać asynchronicznie — patrz [com.turbogit.turboos.web.BridgeDispatcher].
     */
    fun readSaeInspection(): JSONObject {
        requireConnection()
        val sections = JSONObject()
        val commands = JSONArray()

        fun capture(command: String, section: String, timeoutMs: Long = 4_000L): String? {
            val startedAt = SystemClock.elapsedRealtime()
            return try {
                val response = classicClient.command(command, timeoutMs)
                commands.put(
                    commandJson(command, section, "ok", SystemClock.elapsedRealtime() - startedAt),
                )
                response
            } catch (exception: ObdException) {
                commands.put(
                    commandJson(
                        command,
                        section,
                        exception.code,
                        SystemClock.elapsedRealtime() - startedAt,
                    ),
                )
                null
            }
        }

        val capabilities = buildList {
            var base = 0x00
            while (base <= 0x60) {
                val response = capture("01%02X".format(base), "capabilities") ?: break
                add(response)
                val supported = ObdParser.parseSupportedPids(response, 0x41, base)
                // Kolejną stronę mapy odpytujemy tylko, gdy bieżąca ją deklaruje.
                if (base + 0x20 !in supported) break
                base += 0x20
            }
        }

        sections.put("capabilities", capabilities.joinToString("\n").ifEmpty { JSONObject.NULL })
        sections.put("readiness", capture("0101", "readiness") ?: JSONObject.NULL)
        sections.put("freezeFrame", capture("0200", "freeze-frame") ?: JSONObject.NULL)
        sections.put("calibration", capture("0900", "calibration") ?: JSONObject.NULL)

        return JSONObject()
            .put("capturedAt", Instant.now().toString())
            .put("sections", sections)
            .put("commands", commands)
    }

    private fun commandJson(command: String, section: String, status: String, durationMs: Long) =
        JSONObject()
            .put("command", command)
            .put("section", section)
            .put("status", status)
            .put("durationMs", durationMs)

    // ------------------------------------------------------------ live sample

    /**
     * Pojedyncza próbka danych na żywo. Wywoływana wyłącznie z wątku schedulera
     * mostu; magistralę i tak serializuje kolejka [Elm327Client].
     */
    fun readLiveSample(): JSONObject {
        requireConnection()

        val index = sampleSequence.getAndIncrement()
        val startedAtWall = Instant.now()
        val startedAtMonotonic = SystemClock.elapsedRealtime()

        val values = LinkedHashMap<String, Double>()
        var requested = 0
        var missing = 0

        for (pid in FAST_PIDS) {
            if (!shouldQuery(pid.pid)) continue
            requested++
            val value = readPid(pid)
            if (value == null) missing++ else values[pid.jsonField] = value
        }

        if (index % SLOW_PID_EVERY_N == 0L) {
            val refreshed = LinkedHashMap(slowValues)
            for (pid in SLOW_PIDS) {
                if (!shouldQuery(pid.pid)) continue
                requested++
                val value = readPid(pid)
                if (value == null) missing++ else refreshed[pid.jsonField] = value
            }
            slowValues = refreshed
        }
        values.putAll(slowValues)

        val durationMs = (SystemClock.elapsedRealtime() - startedAtMonotonic).coerceAtLeast(0)

        val json = JSONObject()
            .put("sampleIndex", index)
            .put("sampleStartedAt", startedAtWall.toString())
            // Znacznik końcowy wyliczony z zegara monotonicznego — odporny na
            // korektę czasu systemowego w trakcie sesji (poprawka wobec 0.2.0).
            .put("timestamp", startedAtWall.plusMillis(durationMs).toString())
            .put("sampleDurationMs", durationMs)
            .put("requestedPidCount", requested)
            .put("missingPidCount", missing)
            .put("supportedPidCount", supportedMode01Pids?.size ?: JSONObject.NULL)

        (FAST_PIDS + SLOW_PIDS).forEach { pid ->
            json.put(pid.jsonField, values[pid.jsonField] ?: JSONObject.NULL)
        }
        UNSUPPORTED_FIELDS.forEach { json.put(it, JSONObject.NULL) }
        json.put("unsupportedFields", JSONArray(UNSUPPORTED_FIELDS))

        return json
    }

    /** Pomijamy PID-y spoza mapy wsparcia oraz te, które ECU już raz odrzucił. */
    private fun shouldQuery(pid: Int): Boolean {
        if (pid in unsupportedPids) return false
        val supported = supportedMode01Pids ?: return true
        return pid in supported
    }

    private fun readPid(pid: LivePid): Double? = try {
        pid.parse(classicClient.command(pid.command, LIVE_TIMEOUT_MS))
    } catch (exception: ObdException) {
        if (exception.code in PERMANENTLY_UNSUPPORTED) {
            unsupportedPids += pid.pid
        }
        if (exception.code == "NO_DATA" || exception.code in PERMANENTLY_UNSUPPORTED) {
            null
        } else {
            // Błędy transportowe muszą przerwać strumień — inaczej UI pokazywałby
            // „brak danych" zamiast informacji o zerwanym połączeniu.
            throw exception
        }
    }

    private fun readSupportedMode01Pids(): Set<Int> {
        val supported = LinkedHashSet<Int>()
        var base = 0x00
        while (base <= 0x60) {
            val response = runCatching { classicClient.command("01%02X".format(base), LIVE_TIMEOUT_MS) }
                .getOrNull() ?: break
            supported += ObdParser.parseSupportedPids(response, 0x41, base)
            if (base + 0x20 !in supported) break
            base += 0x20
        }
        return supported
    }

    private fun <T> optional(command: String, transform: (String) -> T?): T? = try {
        transform(classicClient.command(command))
    } catch (exception: ObdException) {
        if (exception.code == "NO_DATA" || exception.code in PERMANENTLY_UNSUPPORTED) null
        else throw exception
    }

    private fun requireConnection() {
        if (!classicClient.isConnected) {
            throw ObdException("NOT_CONNECTED", "Najpierw połącz adapter OBD.")
        }
    }

    /** Adres MAC nigdy nie trafia do warstwy webowej w pełnej postaci. */
    private fun maskBluetoothAddress(address: String): String {
        val parts = address.split(':')
        return if (parts.size == 6) "**:**:**:**:${parts[4]}:${parts[5]}" else "adres ukryty"
    }

    override fun close() {
        runCatching { classicClient.close() }
    }
}
