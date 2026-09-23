package pl.myslnik

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import pl.myslnik.domain.NightWindow
import java.time.ZoneId
import java.time.ZonedDateTime

class NightWindowTest {

    private val zone = ZoneId.of("Europe/Warsaw")
    private val nightStart = 23 * 60
    private val nightEnd = 7 * 60

    private fun millis(h: Int, min: Int, day: Int = 16): Long =
        ZonedDateTime.of(2026, 9, day, h, min, 0, 0, zone).toInstant().toEpochMilli()

    @Test fun poznyWieczorJestNoca() =
        assertTrue(NightWindow.isNight(millis(23, 30), nightStart, nightEnd, zone))

    @Test fun srodekNocyJestNoca() =
        assertTrue(NightWindow.isNight(millis(3, 0), nightStart, nightEnd, zone))

    @Test fun tuzPrzedKoncemNocy() =
        assertTrue(NightWindow.isNight(millis(6, 59), nightStart, nightEnd, zone))

    @Test fun koniecNocyJuzNieNoc() =
        assertFalse(NightWindow.isNight(millis(7, 0), nightStart, nightEnd, zone))

    @Test fun dzienNieJestNoca() =
        assertFalse(NightWindow.isNight(millis(12, 0), nightStart, nightEnd, zone))

    @Test fun tuzPrzedPoczatkiemNocy() =
        assertFalse(NightWindow.isNight(millis(22, 59), nightStart, nightEnd, zone))

    @Test fun oknoNiePrzezPolnoc() {
        // np. noc 1:00–5:00 (start < end)
        assertTrue(NightWindow.isNight(millis(2, 0), 60, 300, zone))
        assertFalse(NightWindow.isNight(millis(6, 0), 60, 300, zone))
    }

    @Test fun nastepnyKoniecNocyTegoSamegoDnia() {
        // O 3:00 → koniec nocy dziś o 7:00.
        assertEquals(millis(7, 0), NightWindow.nextNightEnd(millis(3, 0), nightEnd, zone))
    }

    @Test fun nastepnyKoniecNocyJutro() {
        // O 12:00 → koniec nocy jutro o 7:00.
        assertEquals(millis(7, 0, day = 17), NightWindow.nextNightEnd(millis(12, 0), nightEnd, zone))
    }

    @Test fun nastepneWieczornePodsumowanie() {
        // O 12:00 → dziś 21:00; o 22:00 → jutro 21:00.
        assertEquals(millis(21, 0), NightWindow.nextTimeOfDay(millis(12, 0), 21 * 60, zone))
        assertEquals(millis(21, 0, day = 17), NightWindow.nextTimeOfDay(millis(22, 0), 21 * 60, zone))
    }

    @Test fun wyborNajblizszegoZdarzeniaLancucha() {
        // Łańcuch wybiera minimum z kandydatów — najbliższe zdarzenie.
        val entryFire = millis(14, 0)
        val morning = millis(7, 0, day = 17)
        val evening = millis(21, 0)
        assertEquals(entryFire, listOf(entryFire, morning, evening).min())
    }
}
