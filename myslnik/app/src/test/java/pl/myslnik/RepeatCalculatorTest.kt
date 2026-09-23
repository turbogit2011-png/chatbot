package pl.myslnik

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import pl.myslnik.domain.RepeatCalculator
import pl.myslnik.domain.RepeatRule
import java.time.ZoneId
import java.time.ZonedDateTime

class RepeatCalculatorTest {

    private val zone = ZoneId.of("Europe/Warsaw")

    private fun millis(y: Int, m: Int, d: Int, h: Int, min: Int): Long =
        ZonedDateTime.of(y, m, d, h, min, 0, 0, zone).toInstant().toEpochMilli()

    @Test fun codziennie() {
        // termin: wt 15.09 8:00, „zrobione" 16.09 10:00 → następne 17.09 8:00
        val next = RepeatCalculator.nextOccurrence(
            RepeatRule.DAILY, millis(2026, 9, 15, 8, 0), millis(2026, 9, 16, 10, 0), zone
        )
        assertEquals(millis(2026, 9, 17, 8, 0), next)
    }

    @Test fun codziennieTegoSamegoDniaPrzedGodzina() {
        // „zrobione" 16.09 6:00, godzina wzorca 8:00 → jeszcze dziś 8:00
        val next = RepeatCalculator.nextOccurrence(
            RepeatRule.DAILY, millis(2026, 9, 15, 8, 0), millis(2026, 9, 16, 6, 0), zone
        )
        assertEquals(millis(2026, 9, 16, 8, 0), next)
    }

    @Test fun dniRoboczePoPiatkuPoniedzialek() {
        // piątek 18.09 po 8:00 → poniedziałek 21.09 8:00
        val next = RepeatCalculator.nextOccurrence(
            RepeatRule.WORKDAYS, millis(2026, 9, 18, 8, 0), millis(2026, 9, 18, 9, 0), zone
        )
        assertEquals(millis(2026, 9, 21, 8, 0), next)
    }

    @Test fun wybraneDniTygodnia() {
        // pn/śr/pt, po środzie 16.09 → piątek 18.09
        val next = RepeatCalculator.nextOccurrence(
            RepeatRule.weekdays(setOf(1, 3, 5)), millis(2026, 9, 16, 7, 0), millis(2026, 9, 16, 8, 0), zone
        )
        assertEquals(millis(2026, 9, 18, 7, 0), next)
    }

    @Test fun coMiesiac31DopasowujeKrotszeMiesiace() {
        // kotwica 31.01 → luty ma 28 dni w 2026
        val next = RepeatCalculator.nextOccurrence(
            RepeatRule.MONTHLY, millis(2026, 1, 31, 9, 0), millis(2026, 2, 1, 0, 0), zone
        )
        assertEquals(millis(2026, 2, 28, 9, 0), next)
    }

    @Test fun coNDni() {
        val next = RepeatCalculator.nextOccurrence(
            RepeatRule.everyN(5), millis(2026, 9, 10, 8, 0), millis(2026, 9, 16, 10, 0), zone
        )
        // 10.09 → 15.09 → 20.09
        assertEquals(millis(2026, 9, 20, 8, 0), next)
    }

    @Test fun zmianaCzasuZimowegoZachowujeGodzine() {
        // Zmiana czasu letni→zimowy w Europie: 25.10.2026.
        // „codziennie 8:00" 24.10 → 25.10 nadal 8:00 czasu lokalnego.
        val next = RepeatCalculator.nextOccurrence(
            RepeatRule.DAILY, millis(2026, 10, 24, 8, 0), millis(2026, 10, 24, 9, 0), zone
        )
        val nextZdt = java.time.Instant.ofEpochMilli(next!!).atZone(zone)
        assertEquals(8, nextZdt.hour)
        assertEquals(25, nextZdt.dayOfMonth)
    }

    @Test fun zmianaCzasuLetniegoZachowujeGodzine() {
        // Zmiana zimowy→letni: 29.03.2026.
        val next = RepeatCalculator.nextOccurrence(
            RepeatRule.DAILY, millis(2026, 3, 28, 8, 0), millis(2026, 3, 28, 9, 0), zone
        )
        val nextZdt = java.time.Instant.ofEpochMilli(next!!).atZone(zone)
        assertEquals(8, nextZdt.hour)
        assertEquals(29, nextZdt.dayOfMonth)
    }

    @Test fun nieznanaRegulaZwracaNull() {
        assertNull(RepeatCalculator.nextOccurrence("XYZ", 0, 0, zone))
        assertNull(RepeatCalculator.nextOccurrence(null, 0, 0, zone))
        assertNull(RepeatCalculator.nextOccurrence("", 0, 0, zone))
    }
}
