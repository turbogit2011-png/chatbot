# Mapowanie: Master Catalog → Allegro (generator treści)

Cel: generować **projekty** ofert Allegro (do zatwierdzenia), z danych kontraktu — bez publikacji
automatycznej i bez zgadywania parametrów. Publikacja = osobny, zatwierdzony krok.

| Element Allegro | Źródło | Reguła |
|---|---|---|
| Tytuł | `vehicle_make/model` + `engine` + `power_hp` + `turbo_number_primary` | limit znaków Allegro; bez „nowa" dla regeneracji |
| Kategoria | mapowanie kategorii → Allegro (turbosprężarki) | ręcznie potwierdzone |
| Parametry (OE, numer turbo, moc, kod silnika) | atrybuty kontraktu (tylko `VERIFIED`) | `NEEDS_REVIEW/MISSING` → pominięte, oznaczone do uzupełnienia |
| Stan | `condition=refurbished` → „Używany/Regenerowany" wg słownika Allegro | nigdy „Nowy" |
| Opis | szablon treści własnej (regeneracja, nowy CHRA jeśli VERIFIED, gwarancja, zakres) | brak kopii konkurencji |
| Cena / dostępność | WooCommerce | źródło prawdy |
| Zdjęcia | realne zdjęcia produktu | brak placeholderów |

## Tryb pracy
`PREVIEW` (podgląd wygenerowanej oferty) → `EXPORT` (paczka draftów) → `APPROVE` (człowiek) →
publikacja poza tym modułem. Moduł **nie** wystawia ofert samodzielnie.

## Uwaga zgodności
Parametry wymagane przez Allegro, których nie mamy jako `VERIFIED`, **nie są zgadywane** — oferta trafia
do listy „do uzupełnienia", nie jest kompletowana fikcyjnymi wartościami.
