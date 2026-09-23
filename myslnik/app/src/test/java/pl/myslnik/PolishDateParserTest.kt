package pl.myslnik

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import pl.myslnik.domain.parser.PolishDateParser
import java.time.ZoneId
import java.time.ZonedDateTime

class PolishDateParserTest {

    private val zone = ZoneId.of("Europe/Warsaw")

    // Ustalone „teraz": środa, 16 września 2026, 10:00.
    private val now: ZonedDateTime = ZonedDateTime.of(2026, 9, 16, 10, 0, 0, 0, zone)

    private val parser = PolishDateParser()

    private fun at(y: Int, m: Int, d: Int, h: Int, min: Int): ZonedDateTime =
        ZonedDateTime.of(y, m, d, h, min, 0, 0, zone)

    private fun due(text: String, from: ZonedDateTime = now): ZonedDateTime? =
        parser.parse(text, from).dueAt

    // --- względne ---

    @Test fun za20minut() = assertEquals(now.plusMinutes(20), due("za 20 minut kupić mleko"))

    @Test fun zaGodzine() = assertEquals(now.plusHours(1), due("za godzinę oddzwonić"))

    @Test fun za2godziny() = assertEquals(now.plusHours(2), due("za 2 godziny wyjść"))

    @Test fun zaPolGodziny() = assertEquals(now.plusMinutes(30), due("za pół godziny herbata"))

    @Test fun za3dni() = assertEquals(at(2026, 9, 19, 9, 0), due("za 3 dni przegląd auta"))

    @Test fun zaTydzien() = assertEquals(at(2026, 9, 23, 9, 0), due("za tydzień spotkanie"))

    @Test fun za5dniO18() = assertEquals(at(2026, 9, 21, 18, 0), due("za 5 dni o 18 kolacja"))

    // --- dziś / jutro / pojutrze ---

    @Test fun dzisWieczorem() = assertEquals(at(2026, 9, 16, 19, 0), due("dziś wieczorem umyć auto"))

    @Test fun jutro() = assertEquals(at(2026, 9, 17, 9, 0), due("jutro zapłacić fakturę"))

    @Test fun jutroRano() = assertEquals(at(2026, 9, 17, 8, 0), due("jutro rano wysłać maila"))

    @Test fun jutroWieczorem() = assertEquals(at(2026, 9, 17, 19, 0), due("jutro wieczorem kino"))

    @Test fun pojutrzeO14() = assertEquals(at(2026, 9, 18, 14, 0), due("pojutrze o 14 dentysta"))

    @Test fun pojutrze() = assertEquals(at(2026, 9, 18, 9, 0), due("pojutrze przelew"))

    @Test fun dzisiajO22() = assertEquals(at(2026, 9, 16, 22, 0), due("dzisiaj o 22 tabletka"))

    // --- dni tygodnia ---

    @Test fun wPiatek() = assertEquals(at(2026, 9, 18, 9, 0), due("w piątek wywieźć śmieci"))

    @Test fun weWtorekO930() = assertEquals(at(2026, 9, 22, 9, 30), due("we wtorek o 9:30 zebranie"))

    @Test fun wPrzyszlyPoniedzialek() = assertEquals(at(2026, 9, 21, 9, 0), due("w przyszły poniedziałek raport"))

    @Test fun wPrzyszlaSrode() = assertEquals(at(2026, 9, 23, 9, 0), due("w przyszłą środę basen"))

    @Test fun wSoboteO20() = assertEquals(at(2026, 9, 19, 20, 0), due("w sobotę o 20 impreza"))

    @Test fun wWeekend() = assertEquals(at(2026, 9, 19, 9, 0), due("w weekend naprawić kran"))

    // --- godziny ---

    @Test fun o18() = assertEquals(at(2026, 9, 16, 18, 0), due("o 18 trening"))

    @Test fun o715_nieszlaPrzyszla() = assertEquals(at(2026, 9, 16, 19, 15), due("o 7.15 wyprowadzić psa"))

    @Test fun o8_przedPolem_najblizszaPrzyszla() =
        assertEquals(at(2026, 9, 16, 20, 0), due("o 8 zadzwonić"))

    @Test fun o8_rankiem_najblizszaPrzyszla() {
        val morning = ZonedDateTime.of(2026, 9, 16, 7, 0, 0, 0, zone)
        assertEquals(at(2026, 9, 16, 8, 0), due("o 8 zadzwonić", morning))
    }

    @Test fun oDziewiatej() = assertEquals(at(2026, 9, 16, 21, 0), due("o dziewiątej serial"))

    @Test fun oWpolDoOsmej() = assertEquals(at(2026, 9, 16, 19, 30), due("o wpół do ósmej kolacja"))

    @Test fun o1830() = assertEquals(at(2026, 9, 16, 18, 30), due("o 18:30 odbiór"))

    @Test fun jutroOWpolDoOsmejWieczorem() =
        assertEquals(at(2026, 9, 17, 19, 30), due("jutro o wpół do ósmej wieczorem kolacja"))

    // --- daty ---

    @Test fun data15_10() = assertEquals(at(2026, 10, 15, 9, 0), due("15.10 urodziny mamy"))

    @Test fun data15PazdziernikaO10() =
        assertEquals(at(2026, 10, 15, 10, 0), due("15 października o 10 przegląd"))

    @Test fun dataPrzeszlaPrzechodziNaKolejnyRok() =
        assertEquals(at(2027, 3, 5, 9, 0), due("5 marca rocznica"))

    // --- reguła nocy 0:00–4:00 ---

    @Test fun jutroWSrodkuNocyZnaczyDzisiaj() {
        val night = ZonedDateTime.of(2026, 9, 16, 1, 30, 0, 0, zone)
        assertEquals(at(2026, 9, 16, 9, 0), due("jutro oddać książkę", night))
    }

    @Test fun jutroRanoWSrodkuNocy() {
        val night = ZonedDateTime.of(2026, 9, 16, 1, 30, 0, 0, zone)
        assertEquals(at(2026, 9, 16, 8, 0), due("jutro rano oddać książkę", night))
    }

    // --- czyszczenie treści ---

    @Test fun czysciTrescIUsuwaPrzypomnij() {
        val r = parser.parse("przypomnij mi jutro o 9 zadzwonić do dostawcy", now)
        assertEquals("Zadzwonić do dostawcy", r.cleanedText)
        assertEquals(at(2026, 9, 17, 9, 0), r.dueAt)
    }

    @Test fun czysciTrescZaMinuty() {
        val r = parser.parse("za 20 minut kupić mleko", now)
        assertEquals("Kupić mleko", r.cleanedText)
    }

    @Test fun bezTerminuZwracaNull() {
        val r = parser.parse("kupić chleb", now)
        assertNull(r.dueAt)
        assertEquals("Kupić chleb", r.cleanedText)
    }

    @Test fun poPoludniu() = assertEquals(at(2026, 9, 16, 15, 0), due("po południu przegląd maili"))

    @Test fun wPoludnie() = assertEquals(at(2026, 9, 16, 12, 0), due("w południe obiad"))

    @Test fun chipZawszeKonkretnaData() {
        val r = parser.parse("jutro spotkanie", now)
        assertNotNull(r.dueAt)
        assertEquals(2026, r.dueAt!!.year)
    }
}
