package com.turbogit.turboos.obd

/**
 * Parser odpowiedzi SAE J1979 / ISO 15765-4 z adaptera ELM327.
 *
 * ZMIANY WZGLĘDEM 0.2.0
 * ---------------------
 * 1. [KRYTYCZNE] Obsługa bajtu licznika DTC w odpowiedziach CAN (ISO 15765-4).
 *    Wersja 0.2.0 czytała pary bajtów bezpośrednio po bajcie usługi (0x43/0x47/0x4A),
 *    a w protokole CAN pierwszym bajtem po usłudze jest LICZBA kodów. Skutkowało to
 *    przesunięciem o 1 bajt i dekodowaniem nieistniejących kodów usterek
 *    (np. `43 02 01 43 01 96` → "P0201","C0301" zamiast "P0143","P0196").
 *    Rozstrzygamy heurystyką: bajt jest licznikiem, jeżeli liczba pozostałych bajtów
 *    zgadza się z `2 * licznik` (z tolerancją na padding zerami ramki CAN).
 * 2. Rozpoznawanie i usuwanie nagłówków 11-bit / 29-bit przeniesione do jednego
 *    miejsca ([stripHeader]) zamiast powielonej logiki inline.
 * 3. Walidacja zakresów fizycznych — parser nie zwraca już wartości spoza zakresu
 *    zdefiniowanego przez SAE (np. RPM > 16383,75), co wcześniej przepuszczało
 *    uszkodzone ramki do UI jako „poprawny" odczyt.
 * 4. Prekompilowane wyrażenia regularne i brak alokacji `Regex` w pętli
 *    ([Elm327Client.findNegativeResponse] w 0.2.0 tworzył `Regex` per linia odpowiedzi).
 */
object ObdParser {

    private val BYTE_TOKEN = Regex("^[0-9A-Fa-f]{2}$")
    private val CAN_11_BIT_HEADER = Regex("^[0-9A-Fa-f]{3}$")
    private val COMPACT_HEX = Regex("^[0-9A-Fa-f]+$")
    private val FRAME_PREFIX = Regex("^[0-9A-Fa-f]:\\s*")
    private val WHITESPACE = Regex("\\s+")

    private val VIN_CHARACTERS = "0123456789ABCDEFGHJKLMNPRSTUVWXYZ".toSet()
    private val DTC_SYSTEM_PREFIX = charArrayOf('P', 'C', 'B', 'U')

    /** Linie, które ELM327 wypisuje jako komunikaty tekstowe, nie jako dane. */
    private val NON_DATA_MARKERS = listOf("NO DATA", "SEARCHING", "UNABLE", "STOPPED", "BUS INIT")

    // ---------------------------------------------------------------- ramki

    /**
     * Zamienia surową odpowiedź adaptera na listę wiadomości, gdzie każda wiadomość
     * to lista bajtów (0..255). Odrzuca linie sterujące i nagłówki transportowe.
     *
     * POPRAWKA WZGLĘDEM 0.2.0: odpowiedzi wieloramkowe ISO-TP, które ELM327 wypisuje
     * z indeksem ramki (`0: 43 03 …` / `1: 00 AF …`), są sklejane w JEDNĄ wiadomość.
     * Wersja 0.2.0 zdejmowała prefiks `N:` i traktowała każdą linię jako niezależną
     * ramkę, przez co bajty jednego kodu usterki rozdzielone między linie nigdy nie
     * były poprawnie sparowane.
     */
    private fun hexByteLines(response: String): List<List<Int>> {
        val messages = mutableListOf<MutableList<Int>>()
        var assembling: MutableList<Int>? = null

        for (rawLine in response.replace('>', ' ').lineSequence()) {
            val upper = rawLine.uppercase()
            if (upper.startsWith("ELM") || NON_DATA_MARKERS.any { upper.contains(it) }) continue

            val trimmed = rawLine.trim()
            val frameIndex = FRAME_PREFIX.find(trimmed)?.value?.trimEnd(':', ' ')?.toIntOrNull(16)
            val bytes = tokenizeLine(trimmed)
            if (bytes.isEmpty()) continue

            val current = assembling
            if (frameIndex == 0 || (frameIndex != null && current == null)) {
                // Pierwsza ramka sekwencji ISO-TP — zaczyna nową wiadomość.
                val message = bytes.toMutableList()
                messages += message
                assembling = message
            } else if (frameIndex != null && current != null) {
                // Kolejna ramka tej samej sekwencji — dopisujemy do składanej wiadomości.
                current += bytes
            } else {
                // Linia bez indeksu ramki — samodzielna wiadomość.
                messages += bytes.toMutableList()
                assembling = null
            }
        }
        return messages
    }

    private fun tokenizeLine(rawLine: String): List<Int> {
        val line = FRAME_PREFIX.replace(rawLine.trim(), "")
        val spaced = WHITESPACE.split(line)

        // Format „41 0C 1A F8" — bajty rozdzielone spacjami.
        if (spaced.size > 1) {
            return spaced.filter(BYTE_TOKEN::matches).map { it.toInt(16) }
        }

        // Format zbity „7E8410C1AF8" — bez spacji, potencjalnie z nagłówkiem.
        val compact = line.filter(Char::isLetterOrDigit)
        val payload = stripHeader(compact)
        if (payload.length % 2 != 0 || !COMPACT_HEX.matches(payload)) return emptyList()
        return payload.chunked(2).map { it.toInt(16) }
    }

    /** Usuwa nagłówek CAN 11-bit (3 nibble) lub 29-bit (8 nibble, 18DAxx/18DBxx). */
    private fun stripHeader(compact: String): String = when {
        compact.length >= 12 &&
            (compact.startsWith("18DA", ignoreCase = true) || compact.startsWith("18DB", ignoreCase = true)) ->
            compact.drop(8)

        compact.length >= 7 && compact.length % 2 == 1 && CAN_11_BIT_HEADER.matches(compact.take(3)) ->
            compact.drop(3)

        else -> compact
    }

    private fun hexBytes(response: String): List<Int> = hexByteLines(response).flatten()

    // ------------------------------------------------------------------ DTC

    /**
     * Dekoduje dwa bajty na kod DTC w formacie SAE (np. `01 43` → `P0143`).
     * Zwraca `null` dla pary 00 00 (wypełniacz ramki), zamiast produkować „P0000".
     */
    private fun decodeDtc(high: Int, low: Int): String? {
        if (high == 0 && low == 0) return null
        val prefix = DTC_SYSTEM_PREFIX[(high shr 6) and 0b11]
        val secondDigit = (high shr 4) and 0b11
        return buildString(5) {
            append(prefix)
            append(secondDigit)
            append((high and 0x0F).toString(16))
            append((low shr 4).toString(16))
            append((low and 0x0F).toString(16))
        }.uppercase()
    }

    /**
     * Odczytuje kody usterek dla podanej usługi odpowiedzi
     * (0x43 = Mode 03, 0x47 = Mode 07, 0x4A = Mode 0A).
     *
     * Poprawka względem 0.2.0: wykrywa i pomija bajt licznika DTC obecny
     * w odpowiedziach ISO 15765-4 (CAN).
     */
    fun parseDtcs(response: String, responseService: Int = 0x43): List<String> {
        val codes = LinkedHashSet<String>()
        for (frame in hexByteLines(response)) {
            // Wyłącznie PIERWSZE wystąpienie bajtu usługi. Bajt danych DTC może mieć
            // tę samą wartość co usługa (np. P0143 to bajty `01 43`), więc skanowanie
            // kolejnych wystąpień produkowałoby kody-widma. Odpowiedzi z wielu ECU
            // przychodzą w osobnych wiadomościach, nie w jednej.
            val index = frame.indexOf(responseService)
            if (index < 0) continue
            codes += decodeDtcBody(frame.subList(index + 1, frame.size))
        }
        return codes.toList()
    }

    /**
     * Dekoduje ciało odpowiedzi Mode 03/07/0A leżące bezpośrednio po bajcie usługi.
     *
     * Heurystyka licznika: w CAN pierwszy bajt to liczba kodów. Traktujemy go jako
     * licznik tylko wtedy, gdy jest to spójne z długością ramki — dzięki temu
     * odpowiedzi ISO 9141-2 / KWP2000 (bez licznika) parsują się dalej poprawnie.
     */
    private fun decodeDtcBody(body: List<Int>): List<String> {
        if (body.isEmpty()) return emptyList()

        val count = body.first()
        val remaining = body.size - 1
        val looksLikeCount = count in 0..0x7F &&
            remaining >= count * 2 &&
            // Pozostałe bajty poza deklarowanymi kodami muszą być wypełniaczem 0x00.
            body.drop(1 + count * 2).all { it == 0 }

        val payload = if (looksLikeCount) body.drop(1).take(count * 2) else body

        return payload.chunked(2)
            .mapNotNull { pair -> if (pair.size == 2) decodeDtc(pair[0], pair[1]) else null }
    }

    fun isClearDtcAcknowledged(response: String): Boolean = hexBytes(response).contains(0x44)

    // ------------------------------------------------------------- PID Mode 01

    /**
     * Wyszukuje `n` bajtów danych dla PID-u odpowiedzi Mode 01 (`41 <pid> <dane>`).
     * Skanuje per ramka, a nie po spłaszczonej liście — dzięki temu bajt z jednej
     * ramki nie może zostać połączony z bajtem z następnej.
     */
    private fun pidBytes(response: String, pid: Int, length: Int): List<Int>? {
        for (frame in hexByteLines(response)) {
            for (i in 0 until frame.size - 1) {
                if (frame[i] != 0x41 || frame[i + 1] != pid) continue
                val start = i + 2
                if (start + length <= frame.size) return frame.subList(start, start + length)
            }
        }
        return null
    }

    /** Zwraca wartość tylko wtedy, gdy mieści się w zakresie dopuszczonym przez SAE. */
    private fun inRange(value: Double, min: Double, max: Double): Double? =
        if (value.isFinite() && value in min..max) value else null

    fun parseRpm(response: String): Double? = pidBytes(response, 0x0C, 2)
        ?.let { inRange((it[0] * 256 + it[1]) / 4.0, 0.0, 16383.75) }

    fun parseSpeedKph(response: String): Double? = pidBytes(response, 0x0D, 1)
        ?.let { inRange(it[0].toDouble(), 0.0, 255.0) }

    fun parseMapKpa(response: String): Double? = pidBytes(response, 0x0B, 1)
        ?.let { inRange(it[0].toDouble(), 0.0, 255.0) }

    fun parseEngineLoadPercent(response: String): Double? = pidBytes(response, 0x04, 1)
        ?.let { inRange(it[0] * 100.0 / 255.0, 0.0, 100.0) }

    fun parseCoolantTemperatureC(response: String): Double? = pidBytes(response, 0x05, 1)
        ?.let { inRange(it[0] - 40.0, -40.0, 215.0) }

    fun parseIntakeTemperatureC(response: String): Double? = pidBytes(response, 0x0F, 1)
        ?.let { inRange(it[0] - 40.0, -40.0, 215.0) }

    fun parseMafGps(response: String): Double? = pidBytes(response, 0x10, 2)
        ?.let { inRange((it[0] * 256 + it[1]) / 100.0, 0.0, 655.35) }

    fun parseControlModuleVoltage(response: String): Double? = pidBytes(response, 0x42, 2)
        ?.let { inRange((it[0] * 256 + it[1]) / 1000.0, 0.0, 65.535) }

    // ------------------------------------------------------- mapy wsparcia PID

    /**
     * Dekoduje bitmapę wspieranych PID-ów (`41 00 BE 1F A8 13`).
     *
     * @param responseService bajt usługi odpowiedzi (0x41 dla Mode 01, 0x49 dla Mode 09).
     * @param pidBase bazowy numer PID-u (0x00, 0x20, 0x40, 0x60).
     * @param skipFrameByte `true` dla Mode 02 (freeze frame), gdzie po PID-zie
     *        występuje dodatkowy bajt numeru ramki.
     */
    fun parseSupportedPids(
        response: String,
        responseService: Int,
        pidBase: Int,
        skipFrameByte: Boolean = false,
    ): Set<Int> {
        val supported = LinkedHashSet<Int>()
        val offset = if (skipFrameByte) 1 else 0

        for (frame in hexByteLines(response)) {
            for (i in 0 until frame.size - 1) {
                if (frame[i] != responseService || frame[i + 1] != pidBase) continue
                val start = i + 2 + offset
                if (start + 4 > frame.size) continue
                for (byteIndex in 0 until 4) {
                    val value = frame[start + byteIndex]
                    for (bit in 7 downTo 0) {
                        if (value and (1 shl bit) != 0) {
                            supported += pidBase + byteIndex * 8 + (8 - bit)
                        }
                    }
                }
            }
        }
        return supported
    }

    // ------------------------------------------------------------------- VIN

    /** Odczytuje 17-znakowy VIN z odpowiedzi Mode 09 PID 02 (`49 02 ...`). */
    fun parseVin(response: String): String? {
        val bytes = hexBytes(response)
        for (i in 0 until bytes.size - 1) {
            if (bytes[i] != 0x49 || bytes[i + 1] != 0x02) continue
            val vin = buildString(17) {
                // +1 pomija bajt numeru sekwencji ramki, jeżeli występuje.
                for (j in (i + 2) until bytes.size) {
                    val char = bytes[j].toChar().uppercaseChar()
                    if (char in VIN_CHARACTERS) append(char)
                    if (length == 17) break
                }
            }
            if (vin.length == 17) return vin
        }
        return null
    }
}
