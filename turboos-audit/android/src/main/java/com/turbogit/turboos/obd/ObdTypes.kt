package com.turbogit.turboos.obd

import org.json.JSONObject

/**
 * Typy współdzielone przez transporty OBD (Bluetooth Classic i BLE).
 *
 * ZMIANA WZGLĘDEM 0.2.0: `protocol` i `isConnected` są częścią kontraktu
 * [ObdCommandSession], dzięki czemu most nie musi rzutować na konkretną
 * implementację klienta, żeby odczytać opis połączenia.
 */
interface ObdCommandSession : AutoCloseable {
    val isConnected: Boolean
    val protocol: String

    fun command(command: String, timeoutMs: Long = 4_000L): String
}

/**
 * Wyjątek domenowy OBD niosący stabilny kod maszynowy dla warstwy webowej.
 * `details` trafia do pola `error.details` w kopercie JSON.
 */
class ObdException(
    val code: String,
    override val message: String,
    val details: JSONObject? = null,
    cause: Throwable? = null,
) : Exception(message, cause)

enum class ObdLinkType(val wireName: String, val displayName: String) {
    BLUETOOTH_CLASSIC("bluetooth-classic", "Bluetooth Classic"),
    BLUETOOTH_LE("bluetooth-le", "Bluetooth LE"),
}

data class PairedDevice(val address: String, val name: String?)

data class ObdDeviceCandidate(
    val address: String,
    val name: String?,
    val linkType: ObdLinkType,
    val rssi: Int = 0,
)

data class ConnectionDetails(val deviceName: String, val protocol: String)

enum class DtcReadMode(
    val command: String,
    val responseService: Int,
    val dtcStatus: String,
) {
    CONFIRMED("03", 0x43, "confirmed"),
    PENDING("07", 0x47, "pending"),
    PERMANENT("0A", 0x4A, "permanent"),
}

enum class DtcReadStatus(val wireValue: String) {
    OK("ok"),
    UNSUPPORTED("unsupported"),
    NO_DATA("no-data"),
    ERROR("error"),
}

/**
 * Które błędy odczytu DTC są „miękkie" (tryb po prostu nieobsługiwany przez ECU),
 * a które muszą przerwać skan. Mode 03 traktujemy rygorystycznie — brak pewności
 * co do kodów potwierdzonych nie może być zamaskowany pustą listą.
 */
object DtcModeReadPolicy {
    private val RECOVERABLE = mapOf(
        "NO_DATA" to DtcReadStatus.NO_DATA,
        "UNSUPPORTED_COMMAND" to DtcReadStatus.UNSUPPORTED,
        "ECU_NEGATIVE_RESPONSE" to DtcReadStatus.UNSUPPORTED,
    )

    fun recoverableStatus(code: String): DtcReadStatus? = RECOVERABLE[code]
}
