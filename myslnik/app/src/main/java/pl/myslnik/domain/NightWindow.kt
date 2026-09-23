package pl.myslnik.domain

import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Okno nocne (domyślnie 23:00–7:00). W nocy milkną automaty
 * (ponawianie zwykłych wpisów, powroty myśli, przeglądy) —
 * przechodzą do porannego przeglądu. Uparte PILNE dzwonią zawsze.
 */
object NightWindow {

    /** Czy [millis] wypada w oknie nocnym [startMin]..[endMin] (minuty od północy)? */
    fun isNight(millis: Long, startMin: Int, endMin: Int, zone: ZoneId): Boolean {
        val t = ZonedDateTime.ofInstant(Instant.ofEpochMilli(millis), zone).toLocalTime()
        val minutes = t.hour * 60 + t.minute
        return if (startMin <= endMin) {
            minutes >= startMin && minutes < endMin
        } else {
            minutes >= startMin || minutes < endMin
        }
    }

    /** Najbliższy koniec nocy (poranny przegląd) nie wcześniej niż [afterMillis]. */
    fun nextNightEnd(afterMillis: Long, endMin: Int, zone: ZoneId): Long {
        val after = ZonedDateTime.ofInstant(Instant.ofEpochMilli(afterMillis), zone)
        val time = LocalTime.of(endMin / 60, endMin % 60)
        var candidate = ZonedDateTime.of(after.toLocalDate(), time, zone)
        if (!candidate.isAfter(after)) candidate = ZonedDateTime.of(after.toLocalDate().plusDays(1), time, zone)
        return candidate.toInstant().toEpochMilli()
    }

    /** Najbliższe wystąpienie godziny [minOfDay] (np. wieczorne podsumowanie 21:00) po [afterMillis]. */
    fun nextTimeOfDay(afterMillis: Long, minOfDay: Int, zone: ZoneId): Long {
        val after = ZonedDateTime.ofInstant(Instant.ofEpochMilli(afterMillis), zone)
        val time = LocalTime.of(minOfDay / 60, minOfDay % 60)
        var candidate = ZonedDateTime.of(after.toLocalDate(), time, zone)
        if (!candidate.isAfter(after)) candidate = ZonedDateTime.of(after.toLocalDate().plusDays(1), time, zone)
        return candidate.toInstant().toEpochMilli()
    }
}
