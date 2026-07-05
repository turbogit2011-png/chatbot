# Raport jakosci katalogu - z eksportu WooCommerce (poprawiony)

Wejscie: `docs/audit/import/wc-product-export.csv` - Produktow: 109 - analiza read-only, zero zmian na sklepie.

> Uwaga rzetelnosciowa: kondycje bierzemy z atrybutu **Stan** (autorytatywny), nie ze skanu prozy. Wczesniejsze zalozenie 'brak atrybutow technicznych' zostaje **skorygowane**: atrybuty istnieja, ale sa **pofragmentowane**.

## Kondycja (atrybut 'Stan')
| Wartosc | Liczba |
|---|---|
| Regenerowany | 93 |
| (brak) | 16 |

**Wniosek:** 0 produktow oznaczonych 'Nowy'. 93 'Regenerowany'. **16 bez atrybutu Stan → NEEDS_REVIEW** (uzupelnic, nie zgadywac).

## Kluczowe ustalenia
| Ustalenie | Liczba | Priorytet |
|---|---|---|
| SKU = numer turbo (same cyfry) | 93 (85%) | P0 |
| SKU puste | 15 (14%) | P0 |
| Pola marki (taxonomy/brand_name) PUSTE | 101 (93%) | P0 Merchant |
| Brak atrybutu Stan (kondycja) | 16 (15%) | P1 NEEDS_REVIEW |
| Brak krotkiego opisu | 91 (83%) | P1 |
| GTIN brak (-> identifier_exists=false) | 109 (100%) | oczekiwane (regeneracja) |
| Kaucja _tg_kaucja_price PUSTA (pole istnieje, nieuzywane) | 109 (100%) | P1 core deposit |
| Brak zdjec | 0 (0%) | - |
| Zduplikowany focus keyword (kanibalizacja) | 10 | P1 SEO |
| Google Merchant status | approved: 109 (100%) | OK |

## Fragmentacja atrybutow (glowny problem katalogu, P1)
To samo znaczenie rozbite na wiele atrybutow - blokuje spojne filtry, feed i schema:

| Znaczenie | Atrybuty (liczba produktow) |
|---|---|
| Numer OE / oryginału | NUMER OEM (38), Numer katalogowy oryginału (79), Numer katalogowy części (93), Numery katalogowe zamienników (60) |
| Marka pojazdu | Marka (79), MARKA POJAZDU (6), Typ samochodu (88) |
| Kod silnika | Kod silnika (21), kod silnika (1), Silnik (1), Typ silnika (27) |
| Producent turbiny/części | Producent części (93), PRODUCENT (MARKA) (6), Numer Garrett (1) |
| Moc | Moc (KM) (109), Moc (1) |

**Rekomendacja:** jeden kanoniczny slownik atrybutow (data contract) + mapowanie starych na nowe w kontrolowanym changesecie (z backupem i rollbackiem).

## Wszystkie uzywane atrybuty
| Atrybut | Produktow |
|---|---|
| Moc (KM) | 109 |
| Pojemnosc | 102 |
| Stan | 93 |
| Stan opakowania | 93 |
| Numer katalogowy części | 93 |
| Producent części | 93 |
| Typ samochodu | 88 |
| Rodzaj-paliwa | 82 |
| Marka | 79 |
| Numer katalogowy oryginału | 79 |
| Model | 78 |
| Numery katalogowe zamienników | 60 |
| NUMER OEM | 38 |
| Wersja | 32 |
| Jakość części (zgodnie z GVO) | 27 |
| Typ silnika | 27 |
| Waga produktu z opakowaniem jednostkowym | 25 |
| Kod silnika | 21 |
| EAN | 13 |
| PRODUCENT (MARKA) | 6 |
| MARKA POJAZDU | 6 |
| długość | 6 |
| szerokość | 6 |
| wysokość | 6 |
| Numer Garrett | 1 |
| Silnik | 1 |
| Moc | 1 |
| kod silnika | 1 |

## Najslabsze produkty (25 najnizszych score)
| ID | SKU | Nazwa | Score | Problemy |
|---|---|---|---|---|
|  |  | Turbosprężarka regenerowana Garrett GTC1549MVZ 2.0 TDI Nr  | 18 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK;BRAK_KROTKIEGO |
|  |  | Turbosprężarka GARRETT 850840 do Ford Transit 2.0 EcoBlue  | 18 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK;BRAK_KROTKIEGO |
|  |  | Regenerowana turbosprężarka Hyundai KIA 2.0 CRDi 185KM | 26 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK |
|  |  | Regenerowana turbosprężarka Audi VW Skoda 1.9 TDI 100KM AX | 26 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK |
|  |  | Regenerowana turbosprężarka Citroen Peugeot 2.7 HDi V6 204 | 26 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK |
|  |  | Regenerowana turbosprężarka Mercedes 3.0 CDI V6 OM642 | 26 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK |
|  |  | Regenerowana turbosprężarka Volvo 2.4 D D5244T5 185KM | 26 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK |
|  |  | Regenerowana turbosprężarka Bi-Turbo Ford Mondeo S-Max 2.0 | 26 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK |
|  |  | Regenerowana turbosprężarka Bi-Turbo Renault Master 2.3 dC | 26 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK |
|  |  | Regenerowana turbosprężarka VW Audi Skoda Seat 1.9 TDI 105 | 26 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK |
|  |  | Regenerowana turbosprężarka Hyundai H-1 Starex iLoad 2.5 C | 26 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK |
|  |  | Regenerowana turbosprężarka Dacia Renault Nissan 1.2 TCe 1 | 26 | SKU_PUSTE;BRAND_TAX_PUSTA;STAN_BRAK |
|  |  | Regenerowane turbo Garrett 04L253022B VW T6 / Crafter / MA | 34 | SKU_PUSTE;STAN_BRAK |
|  |  | Turbosprężarka Garrett 838452 Ford Transit 2.0 TDCi EcoBlu | 34 | SKU_PUSTE;STAN_BRAK |
|  |  | Turbosprężarka Garrett 852072 Ford 2.0 TDCi EcoBlue - Rege | 34 | SKU_PUSTE;STAN_BRAK |
|  | 18471697681 | Turbosprężarka 49335 2.0D N47D20 N47D20C N47TUE BMW 320D 5 | 51 | SKU=NUMER_TURBO;BRAND_TAX_PUSTA;BRAK_KROTKIEGO |
|  | 18471697167 | Regenerowana turbosprężarka BMW 120d 220d 320d 420d 520d X | 51 | SKU=NUMER_TURBO;BRAND_TAX_PUSTA;BRAK_KROTKIEGO |
|  | 18471695778 | Regenerowane turbo BMW 120d / 320d / 520d / X1 / X3 N47D20 | 51 | SKU=NUMER_TURBO;BRAND_TAX_PUSTA;BRAK_KROTKIEGO |
|  | 18471671615 | Turbosprężarka BMW 120D 220D 320D 420D 520D X3 2.0D N47D20 | 51 | SKU=NUMER_TURBO;BRAND_TAX_PUSTA;BRAK_KROTKIEGO |
|  | 18471668200 | Turbosprężarka 53039700137 BV43 2.0 TDI CEGA CBBB 170KM VW | 51 | SKU=NUMER_TURBO;BRAND_TAX_PUSTA;BRAK_KROTKIEGO |
|  | 18471663753 | Turbosprężarka VW Golf Passat Tiguan Audi A3 TT Seat Skoda | 51 | SKU=NUMER_TURBO;BRAND_TAX_PUSTA;BRAK_KROTKIEGO |
|  | 18471662690 | Turbosprężarka 2.0 TDI CEGA CBBB 170KM VW Golf Passat Tigu | 51 | SKU=NUMER_TURBO;BRAND_TAX_PUSTA;BRAK_KROTKIEGO |
|  | 18471634534 | Turbosprężarka 2.0 TDI CEGA CBBB 170KM Audi VW Golf Passat | 51 | SKU=NUMER_TURBO;BRAND_TAX_PUSTA;BRAK_KROTKIEGO |
|  | 18471632790 | Turbosprężarka 54409 BorgWarner VW Golf Passat Audi A4 2.0 | 51 | SKU=NUMER_TURBO;BRAND_TAX_PUSTA;BRAK_KROTKIEGO |
|  | 18471632404 | Turbosprężarka VW Golf Passat Audi A4 A3 Seat Skoda 2.0 TD | 51 | SKU=NUMER_TURBO;BRAND_TAX_PUSTA;BRAK_KROTKIEGO |
