# Reguły walidacji danych (egzekwowane przez packages/catalog i wtyczkę)

Każda reguła ma poziom: `ERROR` (blokuje apply / feed), `WARN` (dopuszcza, oznacza), `INFO`.

## Integralność / bezpieczeństwo produktu
| ID | Reguła | Poziom |
|---|---|---|
| V1 | `internal_sku` pasuje do `^TG-[A-Z]+-\d{3,}$` i jest unikalny | ERROR |
| V2 | `internal_sku` **nie** równa się `turbo_number_primary` ani żadnemu OE | ERROR |
| V3 | `condition == "refurbished"` dla produktów regenerowanych; wartość „new" **zabroniona** | ERROR |
| V4 | `google_brand` ∉ zbiór marek pojazdów (nie „Audi/Seat/BMW…"); ∈ {producent turbiny, „Turbo-Git"} | ERROR |
| V5 | `turbo_manufacturer`, `vehicle_make`, `google_brand` to trzy różne pola (brak nadpisań) | ERROR |
| V6 | Numery (turbo/OE/MPN) przechowywane znormalizowane; brak numerów w SKU | ERROR |

## Kompletność (status pól)
| ID | Reguła | Poziom |
|---|---|---|
| V7 | Każde pole techniczne ma status ∈ {VERIFIED, NEEDS_REVIEW, MISSING} | ERROR |
| V8 | Do feedu/kampanii i do odznaki „zweryfikowane" trafiają tylko pola `VERIFIED` | ERROR |
| V9 | `power_hp`, `engine_code`, `turbo_number_primary` = `MISSING` → produkt „BLOCKED" dla feedu | WARN→ERROR (feed) |
| V10 | Brak `gtin` → wymagane `identifier_exists=false` (nie generować fikcyjnego GTIN) | ERROR |

## Treść / zgodność
| ID | Reguła | Poziom |
|---|---|---|
| V11 | Brak fraz „fabrycznie nowa/nowa turbina" w tytule/treści produktu regenerowanego | ERROR |
| V12 | Brak fikcyjnych opinii/statystyk/certyfikatów (skan treści + brak importu) | ERROR |
| V13 | Opis nie jest kopią zewnętrznego źródła (heurystyka + zasada procesowa) | WARN |

## Handel
| ID | Reguła | Poziom |
|---|---|---|
| V14 | `deposit_amount`/`old_turbo_return_*` spójne (jeśli `old_turbo_return_required` = true → deposit i deadline wymagane) | WARN |
| V15 | Ceny/stany czytane z WooCommerce; brak zduplikowanego źródła cen we froncie/repo | ERROR |

## Wynik walidacji
Walidator zwraca dla produktu: `{ score: 0..100, errors[], warnings[], field_status{} }`.
`errors.length > 0` ⇒ produkt nie przechodzi do `APPLY`/feedu. Raport zbiorczy: `docs/audit/generated/`.
