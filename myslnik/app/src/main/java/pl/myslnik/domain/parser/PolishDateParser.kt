package pl.myslnik.domain.parser

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZonedDateTime

/**
 * Konfigurowalne pory dnia (minuty od północy) oraz domyślna godzina
 * dla terminów podanych bez godziny.
 */
data class DayTimes(
    val rano: Int = 8 * 60,
    val przedPoludniem: Int = 10 * 60,
    val poludnie: Int = 12 * 60,
    val poPoludniu: Int = 15 * 60,
    val wieczorem: Int = 19 * 60,
    val wNocy: Int = 22 * 60,
    val defaultTime: Int = 9 * 60,
)

data class ParseResult(
    /** Treść wpisu z usuniętym terminem, z wielką literą na początku. */
    val cleanedText: String,
    /** Rozpoznany termin albo null, gdy w tekście nie było terminu. */
    val dueAt: ZonedDateTime?,
    /** Fragmenty tekstu rozpoznane jako termin (do podglądu). */
    val matchedPhrase: String?,
)

/**
 * Offline'owy parser polskich określeń czasu. Bez zewnętrznych bibliotek.
 * Znajduje termin w tekście, usuwa go z treści i zwraca konkretną datę.
 */
class PolishDateParser(private val times: DayTimes = DayTimes()) {

    private enum class Pora { RANO, PRZED_POL, POLUDNIE, PO_POL, WIECZOR, NOC }

    private data class Span(val range: IntRange, val text: String)

    private val wordHours = mapOf(
        "pierwszej" to 1, "drugiej" to 2, "trzeciej" to 3, "czwartej" to 4,
        "piątej" to 5, "piatej" to 5, "szóstej" to 6, "szostej" to 6,
        "siódmej" to 7, "siodmej" to 7, "ósmej" to 8, "osmej" to 8,
        "dziewiątej" to 9, "dziewiatej" to 9, "dziesiątej" to 10, "dziesiatej" to 10,
        "jedenastej" to 11, "dwunastej" to 12, "trzynastej" to 13, "czternastej" to 14,
        "piętnastej" to 15, "pietnastej" to 15, "szesnastej" to 16,
        "siedemnastej" to 17, "osiemnastej" to 18, "dziewiętnastej" to 19,
        "dziewietnastej" to 19, "dwudziestej" to 20, "północy" to 0, "polnocy" to 0,
    )

    private val months = mapOf(
        "stycznia" to 1, "lutego" to 2, "marca" to 3, "kwietnia" to 4,
        "maja" to 5, "czerwca" to 6, "lipca" to 7, "sierpnia" to 8,
        "września" to 9, "wrzesnia" to 9, "października" to 10, "pazdziernika" to 10,
        "listopada" to 11, "grudnia" to 12,
    )

    private val weekdays = mapOf(
        "poniedziałek" to 1, "poniedzialek" to 1,
        "wtorek" to 2,
        "środę" to 3, "srode" to 3, "środe" to 3, "srodę" to 3,
        "czwartek" to 4,
        "piątek" to 5, "piatek" to 5,
        "sobotę" to 6, "sobote" to 6,
        "niedzielę" to 7, "niedziele" to 7,
    )

    fun parse(text: String, now: ZonedDateTime): ParseResult {
        val lower = text.lowercase()
        val consumed = mutableListOf<Span>()

        var relMinutes: Long? = null
        var relDays: Long? = null
        var relMonths: Long? = null
        var dayOffset: Int? = null
        var weekday: Int? = null
        var nextWeek = false
        var weekend = false
        var explicitDate: Triple<Int, Int, Int?>? = null // dzień, miesiąc, rok?
        var timeH: Int? = null
        var timeM = 0
        var timeExact = false // godzina jednoznaczna (np. 18, 9:30 z porą dnia, wpół do…)
        var pora: Pora? = null

        fun claim(m: MatchResult): Boolean {
            if (consumed.any { it.range.first <= m.range.last && m.range.first <= it.range.last }) return false
            consumed += Span(m.range, text.substring(m.range.first, m.range.last + 1))
            return true
        }
        // \b w Javie nie zna polskich liter (ą, ś, ę…), więc granice słów
        // realizujemy jawnym lookaroundem Unicode: „z którejś strony nie ma litery/cyfry".
        val boundary = """(?:(?<![\p{L}\d])|(?![\p{L}\d]))"""
        fun find(pattern: String, onMatch: (MatchResult) -> Unit) {
            val p = pattern.replace("""\b""", boundary)
            Regex(p).findAll(lower).forEach { m -> if (claim(m)) onMatch(m) }
        }

        // --- względne ---
        find("""\bza\s+(\d+)\s+(minut\p{L}*|min)\b""") { relMinutes = it.groupValues[1].toLong() }
        find("""\bza\s+pół\s+godziny\b""") { relMinutes = 30 }
        find("""\bza\s+kwadrans\b""") { relMinutes = 15 }
        find("""\bza\s+godzin[ęe]\b""") { relMinutes = 60 }
        find("""\bza\s+(\d+)\s+godzin\p{L}*\b""") { relMinutes = it.groupValues[1].toLong() * 60 }
        find("""\bza\s+(\d+)\s+(dni|dzień|dzien)\b""") { relDays = it.groupValues[1].toLong() }
        find("""\bza\s+tydzień\b|\bza\s+tydzien\b""") { relDays = 7 }
        find("""\bza\s+(\d+)\s+tygodni\p{L}*\b""") { relDays = it.groupValues[1].toLong() * 7 }
        find("""\bza\s+miesiąc\b|\bza\s+miesiac\b""") { relMonths = 1 }

        // --- „wpół do ósmej" ---
        find("""\b(?:o\s+)?wpół\s+do\s+(\p{L}+)\b|\b(?:o\s+)?wpol\s+do\s+(\p{L}+)\b""") { m ->
            val w = m.groupValues[1].ifEmpty { m.groupValues[2] }
            wordHours[w]?.let { h -> timeH = h - 1; timeM = 30; timeExact = false }
        }

        // --- daty słowne: „15 października", „15 października 2026 " ---
        find("""\b(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|wrzesnia|października|pazdziernika|listopada|grudnia)(\s+(\d{4}))?\b""") { m ->
            val d = m.groupValues[1].toInt()
            val mo = months[m.groupValues[2]] ?: return@find
            val y = m.groupValues[4].takeIf { it.isNotEmpty() }?.toInt()
            if (d in 1..31) explicitDate = Triple(d, mo, y)
        }

        // --- godziny: „o 9:30", „o 7.15" ---
        find("""\bo\s+(\d{1,2})[:.](\d{2})\b""") { m ->
            val h = m.groupValues[1].toInt(); val min = m.groupValues[2].toInt()
            if (h in 0..23 && min in 0..59) { timeH = h; timeM = min; timeExact = h > 12 || h == 0 }
        }
        // --- „o 18", „o 8" ---
        find("""\bo\s+(\d{1,2})\b""") { m ->
            val h = m.groupValues[1].toInt()
            if (h in 0..23) { timeH = h; timeM = 0; timeExact = h > 12 || h == 0 }
        }
        // --- „o dziewiątej" ---
        find("""\bo\s+(\p{L}+)\b""") { m ->
            val h = wordHours[m.groupValues[1]] ?: run {
                consumed.removeAt(consumed.size - 1); return@find
            }
            timeH = h; timeM = 0; timeExact = h > 12 || h == 0
        }
        // --- samodzielne „18:30" ---
        find("""\b(\d{1,2}):(\d{2})\b""") { m ->
            val h = m.groupValues[1].toInt(); val min = m.groupValues[2].toInt()
            if (h in 0..23 && min in 0..59 && timeH == null) { timeH = h; timeM = min; timeExact = h > 12 || h == 0 }
            else if (timeH != null) consumed.removeAt(consumed.size - 1)
        }

        // --- daty liczbowe: „15.10.2026", „15.10" (nie mylić z „o 7.15" — tamto już zjedzone) ---
        find("""\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b""") { m ->
            val d = m.groupValues[1].toInt(); val mo = m.groupValues[2].toInt()
            var y = m.groupValues[3].toInt(); if (y < 100) y += 2000
            if (d in 1..31 && mo in 1..12) explicitDate = Triple(d, mo, y)
        }
        find("""\b(\d{1,2})\.(\d{1,2})\b(?!\.)""") { m ->
            val d = m.groupValues[1].toInt(); val mo = m.groupValues[2].toInt()
            if (d in 1..31 && mo in 1..12 && explicitDate == null) explicitDate = Triple(d, mo, null)
            else consumed.removeAt(consumed.size - 1)
        }

        // --- dni względne ---
        find("""\bpojutrze\b""") { dayOffset = 2 }
        find("""\bjutro\b""") { dayOffset = 1 }
        find("""\bdzisiaj\b|\bdziś\b|\bdzis\b""") { dayOffset = 0 }

        // --- dni tygodnia, „w przyszły poniedziałek" ---
        find("""\b(?:w|we)\s+(przyszł\p{L}+\s+|najbliższ\p{L}+\s+|nastepn\p{L}+\s+|następn\p{L}+\s+)?(poniedziałek|poniedzialek|wtorek|środę|srode|środe|srodę|czwartek|piątek|piatek|sobotę|sobote|niedzielę|niedziele)\b""") { m ->
            weekday = weekdays[m.groupValues[2]]
            val prefix = m.groupValues[1].trim()
            if (prefix.startsWith("przysz") || prefix.startsWith("nast") || prefix.startsWith("następ")) nextWeek = true
        }

        // --- weekend ---
        find("""\b(?:w|na)\s+weekend\b""") { weekend = true }

        // --- pory dnia ---
        find("""\bprzed\s+południem\b|\bprzed\s+poludniem\b""") { pora = Pora.PRZED_POL }
        find("""\bpo\s+południu\b|\bpo\s+poludniu\b""") { pora = Pora.PO_POL }
        find("""\bw\s+południe\b|\bw\s+poludnie\b""") { pora = Pora.POLUDNIE }
        find("""\bwieczorem\b|\bwieczór\b|\bwieczor\b""") { pora = Pora.WIECZOR }
        find("""\bw\s+nocy\b|\bnocą\b|\bnoca\b""") { pora = Pora.NOC }
        find("""\bnad\s+ranem\b|\bz\s+rana\b|\brano\b""") { pora = Pora.RANO }

        val hasAnything = relMinutes != null || relDays != null || relMonths != null ||
            dayOffset != null || weekday != null || weekend || explicitDate != null ||
            timeH != null || pora != null

        if (!hasAnything) return ParseResult(capitalize(text.trim()), null, null)

        val due: ZonedDateTime = when {
            relMinutes != null -> now.plusMinutes(relMinutes!!).withSecond(0).withNano(0)
            else -> {
                // 1. Dzień
                val today = now.toLocalDate()
                var date: LocalDate? = null
                var dateIsFixed = false // dzień wskazany wprost (nie „dziś domyślnie")
                when {
                    relMonths != null -> { date = today.plusMonths(relMonths!!); dateIsFixed = true }
                    relDays != null -> { date = today.plusDays(relDays!!); dateIsFixed = true }
                    explicitDate != null -> {
                        val (d, mo, y) = explicitDate!!
                        var year = y ?: today.year
                        var candidate = safeDate(year, mo, d)
                        if (y == null && candidate.isBefore(today)) candidate = safeDate(year + 1, mo, d)
                        date = candidate; dateIsFixed = true
                    }
                    weekday != null -> {
                        val target = DayOfWeek.of(weekday!!)
                        var candidate = today
                        while (candidate.dayOfWeek != target) candidate = candidate.plusDays(1)
                        if (nextWeek) {
                            // poniedziałek nadchodzącego tygodnia + przesunięcie
                            var monday = today.plusDays(1)
                            while (monday.dayOfWeek != DayOfWeek.MONDAY) monday = monday.plusDays(1)
                            candidate = monday.plusDays((weekday!! - 1).toLong())
                        }
                        date = candidate; dateIsFixed = true
                    }
                    weekend -> {
                        date = if (today.dayOfWeek == DayOfWeek.SATURDAY || today.dayOfWeek == DayOfWeek.SUNDAY) today
                        else today.with(java.time.temporal.TemporalAdjusters.next(DayOfWeek.SATURDAY))
                        dateIsFixed = true
                    }
                    dayOffset != null -> {
                        // Między 0:00 a 4:00 „jutro" znaczy nadchodzący dzień (to wciąż ta sama noc)
                        var off = dayOffset!!
                        if (now.hour < 4 && off >= 1) off -= 1
                        date = today.plusDays(off.toLong())
                        dateIsFixed = true
                    }
                }

                // 2. Godzina (minuty od północy)
                var minutesOfDay: Int? = null
                var ambiguous = false
                if (timeH != null) {
                    var h = timeH!!
                    when (pora) {
                        Pora.RANO, Pora.PRZED_POL -> { /* AM — zostaje */ }
                        Pora.POLUDNIE, Pora.PO_POL, Pora.WIECZOR, Pora.NOC ->
                            if (h < 12) h += 12
                        null -> if (!timeExact && h in 1..12) ambiguous = true
                    }
                    minutesOfDay = h * 60 + timeM
                } else if (pora != null) {
                    minutesOfDay = when (pora!!) {
                        Pora.RANO -> times.rano
                        Pora.PRZED_POL -> times.przedPoludniem
                        Pora.POLUDNIE -> times.poludnie
                        Pora.PO_POL -> times.poPoludniu
                        Pora.WIECZOR -> times.wieczorem
                        Pora.NOC -> times.wNocy
                    }
                }

                // 3. Połączenie
                if (date == null) {
                    // sama godzina / sama pora dnia → najbliższe przyszłe wystąpienie
                    val mod = minutesOfDay ?: times.defaultTime
                    if (ambiguous) {
                        nearestFuture(now, listOf(mod, mod + 12 * 60))
                    } else {
                        nearestFuture(now, listOf(mod))
                    }
                } else {
                    var mod = minutesOfDay
                    if (mod == null) mod = times.defaultTime
                    if (ambiguous) {
                        val altA = atMinutes(date, mod, now)
                        val altB = atMinutes(date, mod + 12 * 60, now)
                        if (date == today) {
                            // najbliższa przyszła z 8:00/20:00
                            when {
                                altA.isAfter(now) -> altA
                                altB.isAfter(now) -> altB
                                else -> altA.plusDays(1)
                            }
                        } else {
                            // przyszły dzień: 1–6 traktuj jako popołudnie/wieczór, 7–12 jako dzień
                            val h = mod / 60
                            if (h in 1..6) altB else altA
                        }
                    } else {
                        var result = atMinutes(date, mod, now)
                        if (dateIsFixed && date == today && minutesOfDay == null && !result.isAfter(now)) {
                            // „dziś" bez godziny, gdy 9:00 minęło → za godzinę
                            result = now.plusHours(1).withSecond(0).withNano(0)
                        }
                        result
                    }
                }
            }
        }

        // 4. Sprzątanie treści
        var cleaned = removeSpans(text, consumed.map { it.range })
        cleaned = cleaned.replace(Regex("""(?i)\bprzypomnij\s+mi\b|\bprzypomnij\b|\bprzypomnienie\b"""), " ")
        cleaned = cleaned.replace(Regex("""\s+"""), " ")
            .replace(Regex("""\s+([,.;!?])"""), "$1")
            .trim().trim(',', '.', ';', ':', '-', ' ')
        val phrase = consumed.sortedBy { it.range.first }.joinToString(" ") { it.text }

        return ParseResult(capitalize(cleaned), due, phrase)
    }

    private fun safeDate(year: Int, month: Int, day: Int): LocalDate {
        val len = java.time.YearMonth.of(year, month).lengthOfMonth()
        return LocalDate.of(year, month, day.coerceAtMost(len))
    }

    private fun atMinutes(date: LocalDate, minutesOfDay: Int, zoneRef: ZonedDateTime): ZonedDateTime {
        val d = date.plusDays((minutesOfDay / (24 * 60)).toLong())
        val mod = minutesOfDay % (24 * 60)
        return ZonedDateTime.of(d, java.time.LocalTime.of(mod / 60, mod % 60), zoneRef.zone)
    }

    private fun nearestFuture(now: ZonedDateTime, minuteOptions: List<Int>): ZonedDateTime {
        val today = now.toLocalDate()
        val candidates = buildList {
            for (m in minuteOptions) {
                add(atMinutes(today, m % (24 * 60), now))
                add(atMinutes(today.plusDays(1), m % (24 * 60), now))
            }
        }.sorted()
        return candidates.first { it.isAfter(now) }
    }

    private fun removeSpans(text: String, ranges: List<IntRange>): String {
        val sb = StringBuilder()
        val sorted = ranges.sortedBy { it.first }
        var idx = 0
        for (r in sorted) {
            if (r.first > idx) sb.append(text, idx, r.first)
            idx = maxOf(idx, r.last + 1)
        }
        if (idx < text.length) sb.append(text, idx, text.length)
        return sb.toString()
    }

    private fun capitalize(s: String): String =
        if (s.isEmpty()) s else s.replaceFirstChar { it.uppercase() }
}
