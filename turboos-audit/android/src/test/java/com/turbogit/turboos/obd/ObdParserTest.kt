package com.turbogit.turboos.obd

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Testy regresyjne parsera OBD.
 *
 * Zestaw `parseDtcs*` jest bezpośrednią odpowiedzią na błąd K2 z audytu:
 * wersja 0.2.0 nie uwzględniała bajtu licznika DTC w odpowiedziach ISO 15765-4
 * (CAN) i zwracała nieistniejące kody usterek. Wektory pokrywają oba warianty
 * protokołu, bo poprawka nie może zepsuć odczytu na magistralach bez licznika.
 *
 * Parsery są czystymi funkcjami — testy nie wymagają emulatora ani adaptera.
 */
class ObdParserTest {

    // -------------------------------------------------------------- Mode 03

    @Test
    fun `dekoduje kody CAN pomijajac bajt licznika`() {
        // 43 = odpowiedź Mode 03, 02 = liczba kodów, dalej dwie pary bajtów.
        // Wersja 0.2.0 zwracała tu ["P0201", "C0301"].
        assertEquals(
            listOf("P0143", "P0196"),
            ObdParser.parseDtcs("43 02 01 43 01 96"),
        )
    }

    @Test
    fun `dekoduje pojedynczy kod CAN z wypelnieniem ramki`() {
        assertEquals(
            listOf("P0299"),
            ObdParser.parseDtcs("43 01 02 99 00 00 00 00"),
        )
    }

    @Test
    fun `zwraca pusta liste gdy ECU nie zglasza kodow`() {
        assertEquals(emptyList<String>(), ObdParser.parseDtcs("43 00 00 00 00 00 00 00"))
    }

    @Test
    fun `dekoduje odpowiedz wieloramkowa z prefiksami ramek`() {
        val response = """
            009
            0: 43 03 02 99 25 63
            1: 00 AF 00 00 00 00 00
        """.trimIndent()
        assertEquals(listOf("P0299", "P2563", "P00AF"), ObdParser.parseDtcs(response))
    }

    @Test
    fun `zachowuje poprawnosc dla protokolow bez bajtu licznika`() {
        // ISO 9141-2 / KWP2000: po 43 idą od razu bajty kodów.
        assertEquals(
            listOf("P0143", "P0196"),
            ObdParser.parseDtcs("43 01 43 01 96 00 00"),
        )
    }

    @Test
    fun `usuwa naglowek CAN 11-bit z odpowiedzi zbitej`() {
        assertEquals(listOf("P0143"), ObdParser.parseDtcs("7E8430143"))
    }

    @Test
    fun `czyta kody oczekujace z Mode 07`() {
        assertEquals(
            listOf("P0299"),
            ObdParser.parseDtcs("47 01 02 99 00 00", responseService = 0x47),
        )
    }

    @Test
    fun `pomija linie sterujace adaptera`() {
        assertEquals(emptyList<String>(), ObdParser.parseDtcs("SEARCHING...\nNO DATA"))
    }

    // ------------------------------------------------------------- Mode 01

    @Test
    fun `parsuje obroty silnika`() {
        // 41 0C 1A F8 → (0x1AF8) / 4 = 1726 obr/min
        assertEquals(1726.0, ObdParser.parseRpm("41 0C 1A F8")!!, 0.001)
    }

    @Test
    fun `odrzuca wartosci spoza zakresu SAE`() {
        // Temperatura płynu: bajt 0xFF → 215 °C to górna granica, więc wartość przechodzi…
        assertEquals(215.0, ObdParser.parseCoolantTemperatureC("41 05 FF")!!, 0.001)
        // …natomiast odpowiedź na inny PID nie może zostać użyta jako źródło danych.
        assertNull(ObdParser.parseCoolantTemperatureC("41 0C 1A F8"))
    }

    @Test
    fun `nie miesza bajtow pochodzacych z roznych ramek`() {
        // Bajt 41 kończy pierwszą ramkę, 0C zaczyna drugą — to nie jest poprawny odczyt.
        assertNull(ObdParser.parseRpm("7E8 06 41\n7E9 03 0C 1A F8"))
    }

    @Test
    fun `parsuje mape wspieranych PID-ow`() {
        // 41 00 BE 1F A8 13 → bit A7 (PID 01) ustawiony, bit A8 (PID 08) nie.
        val supported = ObdParser.parseSupportedPids("41 00 BE 1F A8 13", 0x41, 0x00)
        assertEquals(true, 0x01 in supported)
        assertEquals(true, 0x0C in supported)
        assertEquals(false, 0x08 in supported)
    }

    // ------------------------------------------------------------- Mode 09

    @Test
    fun `parsuje VIN z odpowiedzi wieloramkowej`() {
        val response = """
            014
            0: 49 02 01 57 56 57
            1: 5A 5A 5A 33 43 5A 44
            2: 45 30 30 30 30 30 31
        """.trimIndent()
        assertEquals("WVWZZZ3CZDE000001", ObdParser.parseVin(response))
    }

    @Test
    fun `odrzuca VIN o niepoprawnej dlugosci`() {
        assertNull(ObdParser.parseVin("49 02 01 57 56 57"))
    }
}
