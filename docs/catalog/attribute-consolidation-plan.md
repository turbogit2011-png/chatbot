# Konsolidacja atrybutów — plan (na podstawie realnego eksportu 109 produktów)

**Cel:** z ~29 pofragmentowanych atrybutów zbudować **jeden kanoniczny słownik**. To dokument decyzyjny
+ maszynowe mapowanie `packages/catalog/attribute-map.json`. **Zero zmian na sklepie** — migracja
później, kontrolowanym changesetem (backup + rollback + Twoja zgoda).

Źródło: `docs/audit/import/wc-product-export.csv`. Semantyka potwierdzona **realnymi wartościami** (VERIFIED),
niejednoznaczne oznaczone `NEEDS_OK` (wymaga Twojego potwierdzenia — zasada „nie zgaduj").

## Mapowanie: atrybut źródłowy → pole kanoniczne

| Atrybut źródłowy (n) | Przykład wartości | → Pole kanoniczne (slug) | Akcja | Pewność |
|---|---|---|---|---|
| Numer katalogowy części (93) | `49335-00640`, `844572-9004S` | `pa_turbo-number` (numer turbo) | RENAME | NEEDS_OK¹ |
| Numery katalogowe zamienników (60) | `49335-00631`, `4933500635` | `pa_turbo-crossref` (zamienniki) | RENAME | VERIFIED |
| Numer katalogowy oryginału (79) | `03L253056TV…`, `116585132…` | `pa_oe` (numery OE) | **MERGE** | VERIFIED |
| NUMER OEM (38) | `03L253010F`, `53039700137` | `pa_oe` | **MERGE→pa_oe** | VERIFIED |
| Numer Garrett (1) | `874595-0011` | `pa_mpn` (numer producenta) | RENAME | VERIFIED |
| Producent części (93) | `Garrett`, `KKK`, `Garett`(typo), `Mitsubishi OE` | `pa_turbo-manufacturer` | RENAME + FIX | VERIFIED |
| PRODUCENT (MARKA) (6) | `Garrett` | `pa_turbo-manufacturer` | **MERGE** | VERIFIED |
| Marka (79) | `Audi, Seat, Volkswagen` | `pa_make` (marka pojazdu) | RENAME | VERIFIED |
| MARKA POJAZDU (6) | `Volkswagen (VW)`, `marka`(śmieć) | `pa_make` | **MERGE + FIX** | VERIFIED |
| Model (78) | (modele) | `pa_model` | RENAME | VERIFIED |
| Kod silnika (21) | `N47D20`, `CBBB` | `pa_engine-code` | RENAME | VERIFIED |
| kod silnika (1) | — | `pa_engine-code` | **MERGE (case)** | VERIFIED |
| Pojemnosc (102) | `2.0`, `1.6` | `pa_engine` (pojemność) | RENAME | VERIFIED |
| Moc (KM) (109) | (KM) | `pa_power` | RENAME | VERIFIED |
| Moc (1) | — | `pa_power` | **MERGE** | VERIFIED |
| Rodzaj-paliwa (82) | `Diesel`, `Benzyna` | `pa_fuel` | RENAME | VERIFIED |
| Typ silnika (27) | `Diesel`, `Benzyna` | `pa_fuel` | **MERGE (to paliwo, nie „typ silnika")** | VERIFIED² |
| Typ samochodu (88) | `Samochody osobowe`, `4x4/SUV`, `dostawcze` | `pa_vehicle-segment` | RENAME | VERIFIED |
| Jakość części (zgodnie z GVO) (27) | `O - oryginał…`, `Q - OEM…` | `pa_gvo-quality` | KEEP | VERIFIED |
| Wersja (32) | `Europejska` | `pa_market` | KEEP (niska wartość) | NEEDS_OK³ |
| Stan (93) | `Regenerowany` | meta `condition=refurbished` | MAP→condition | VERIFIED |
| Stan opakowania (93) | `oryginalne`, `zastępcze` | meta `packaging_condition` | KEEP (meta) | VERIFIED |
| EAN (13) | `4046247360992` | meta `gtin` | MAP→gtin | VERIFIED |
| Waga produktu z opakowaniem (25) | — | natywne WooCommerce (waga) | MOVE→native | VERIFIED |
| długość / szerokość / wysokość (6/6/6) | — | natywne wymiary WooCommerce | DROP (atrybut) | VERIFIED |

¹ **NEEDS_OK:** potwierdź, że „Numer katalogowy części" (93 szt., ta sama liczność co Stan) to **numer turbosprężarki**
(a nie generyczny numer części). Wartości na to wskazują (49335-00640, 844572-9004S).
² „Typ silnika" zawiera Diesel/Benzyna → to **paliwo**, nie typ silnika. Scalamy do `pa_fuel`.
³ „Wersja" = zawsze „Europejska" → mała wartość informacyjna. Zostawić czy usunąć?

## Kanoniczny słownik (docelowy zestaw atrybutów/pól)
`pa_turbo-number`, `pa_turbo-crossref`, `pa_oe`, `pa_mpn`, `pa_turbo-manufacturer`, `pa_make`, `pa_model`,
`pa_engine-code`, `pa_engine`, `pa_power`, `pa_fuel`, `pa_vehicle-segment`, `pa_gvo-quality`, `pa_market`
+ meta: `condition` (refurbished), `packaging_condition`, `gtin`, `_tgf_status_<pole>`.

## Wykryte problemy jakości WARTOŚCI (do normalizacji przy migracji)
- **Escaping/format:** wartości typu `8513298\,`, `8517452\` — końcowe `\`/`,`, mieszane separatory
  (spacja vs przecinek). Normalizacja: split na białych znakach/przecinkach, usuń `\`, dedup.
- **Typo producenta:** `Garett` → `Garrett` (słownik korekt).
- **Wartość-śmieć:** `MARKA POJAZDU = "marka"` (placeholder) → usunąć/poprawić.
- **Rozbicie paliwa/OE** na 2 atrybuty (scalane wyżej).

## Jak przebiegnie migracja (bezpiecznie, później, po Twojej akceptacji)
1. Moduł `Catalog` wtyczki: **PREVIEW** — pokaże dokładnie, co i gdzie trafi (per produkt), 0 zapisu.
2. **EXPORT CHANGESET** (JSON) z backupem wartości `before`.
3. **APPROVE** (Ty) → **APPLY** (na staging najpierw) → **VERIFY** → w razie czego **ROLLBACK**.
4. Stare atrybuty zostają (ukryte) do czasu weryfikacji; usunięcie = osobny, późniejszy krok.

## Do Twojej decyzji (5 punktów)
1. `Numer katalogowy części` = numer turbo? (NEEDS_OK¹) — **zakładam TAK**, chyba że zaprzeczysz.
2. Scalenie `Typ silnika`→`pa_fuel`: OK? (**rekomendacja: tak**)
3. `Wersja (Europejska)`: zostawić czy usunąć? (**rekomendacja: zostawić jako `pa_market`**)
4. Docelowy schemat SKU `TG-TURBO-NNNN` + numery w polach: akceptacja kierunku?
5. `google_brand`: ustawiamy na `pa_turbo-manufacturer` (Garrett/IHI/KKK…) czy stałe „Turbo-Git"?
   (**rekomendacja: producent turbiny; „Turbo-Git" gdy brak producenta**)

Jeśli nie zgłosisz zastrzeżeń, przyjmuję rekomendacje i przygotowuję PREVIEW migracji (nadal bez zapisu na produkcji).
