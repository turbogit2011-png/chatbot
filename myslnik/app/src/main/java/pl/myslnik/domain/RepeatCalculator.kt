package pl.myslnik.domain

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Wyliczanie następnego wystąpienia dla reguł powtarzania.
 * Operuje na java.time w strefie systemowej, więc „codziennie 8:00"
 * zostaje 8:00 także po zmianie czasu letni/zimowy.
 */
object RepeatCalculator {

    /**
     * Następne wystąpienie PO [afterMillis] dla wpisu, którego dotychczasowy
     * termin to [dueMillis] (z niego bierzemy godzinę i kotwicę daty).
     * Zwraca null dla nieznanej/pustej reguły.
     */
    fun nextOccurrence(encoded: String?, dueMillis: Long, afterMillis: Long, zone: ZoneId): Long? {
        if (encoded.isNullOrBlank()) return null
        val due = ZonedDateTime.ofInstant(Instant.ofEpochMilli(dueMillis), zone)
        val after = ZonedDateTime.ofInstant(Instant.ofEpochMilli(afterMillis), zone)
        val time: LocalTime = due.toLocalTime()

        fun at(date: LocalDate): ZonedDateTime = ZonedDateTime.of(date, time, zone)

        val next: ZonedDateTime = when {
            encoded == RepeatRule.DAILY -> {
                var d = after.toLocalDate()
                if (!at(d).isAfter(after)) d = d.plusDays(1)
                at(d)
            }
            encoded == RepeatRule.WORKDAYS -> {
                var d = after.toLocalDate()
                if (!at(d).isAfter(after)) d = d.plusDays(1)
                while (d.dayOfWeek == DayOfWeek.SATURDAY || d.dayOfWeek == DayOfWeek.SUNDAY) d = d.plusDays(1)
                at(d)
            }
            encoded.startsWith("WEEKDAYS:") -> {
                val days = encoded.removePrefix("WEEKDAYS:")
                    .split(",").mapNotNull { it.trim().toIntOrNull() }
                    .filter { it in 1..7 }.toSet()
                if (days.isEmpty()) return null
                var d = after.toLocalDate()
                if (!at(d).isAfter(after) || d.dayOfWeek.value !in days) {
                    d = d.plusDays(1)
                    while (d.dayOfWeek.value !in days) d = d.plusDays(1)
                }
                at(d)
            }
            encoded == RepeatRule.MONTHLY -> {
                val anchorDay = due.dayOfMonth
                var ym = java.time.YearMonth.from(after)
                var candidate = at(ym.atDay(anchorDay.coerceAtMost(ym.lengthOfMonth())))
                while (!candidate.isAfter(after)) {
                    ym = ym.plusMonths(1)
                    candidate = at(ym.atDay(anchorDay.coerceAtMost(ym.lengthOfMonth())))
                }
                candidate
            }
            encoded.startsWith("EVERY_N:") -> {
                val n = encoded.removePrefix("EVERY_N:").trim().toLongOrNull() ?: return null
                if (n <= 0) return null
                var d = due.toLocalDate()
                var candidate = at(d)
                while (!candidate.isAfter(after)) {
                    d = d.plusDays(n)
                    candidate = at(d)
                }
                candidate
            }
            else -> return null
        }
        return next.toInstant().toEpochMilli()
    }

    fun describe(encoded: String?): String = when {
        encoded.isNullOrBlank() -> "bez powtarzania"
        encoded == RepeatRule.DAILY -> "codziennie"
        encoded == RepeatRule.WORKDAYS -> "dni robocze"
        encoded == RepeatRule.MONTHLY -> "co miesiąc"
        encoded.startsWith("WEEKDAYS:") -> {
            val names = mapOf(1 to "pn", 2 to "wt", 3 to "śr", 4 to "czw", 5 to "pt", 6 to "sob", 7 to "nd")
            "co " + encoded.removePrefix("WEEKDAYS:").split(",")
                .mapNotNull { it.trim().toIntOrNull() }.mapNotNull { names[it] }.joinToString(", ")
        }
        encoded.startsWith("EVERY_N:") -> "co ${encoded.removePrefix("EVERY_N:")} dni"
        else -> encoded
    }
}
