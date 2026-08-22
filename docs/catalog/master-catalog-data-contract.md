# Master Catalog — kontrakt danych Turbo-Git

Jeden model danych produktu dla: WooCommerce (źródło prawdy), frontend, Google Merchant, Allegro, B2B.
Kontrakt jest **normatywny** — walidator (`packages/catalog`) i wtyczka egzekwują go.

## Zasady nadrzędne
1. **`internal_sku` jest jedynym kluczem wewnętrznym.** Format `TG-<KATEGORIA>-<NNNN>` (np. `TG-TURBO-0142`).
   Numery OE/turbo **nigdy** nie są SKU.
2. **Trzy różne „marki" to trzy różne pola:** `vehicle_make` (marka auta) ≠ `turbo_manufacturer`
   (Garrett/IHI/BorgWarner…) ≠ `google_brand` (marka w feedzie).
3. **`condition`** dla produktu regenerowanego = `refurbished`. Wartość `new` jest **zabroniona** dla regeneracji.
4. **`confidence_status`** i **status pola** ∈ `VERIFIED | NEEDS_REVIEW | MISSING`. Brak = `MISSING`, nie zgadywanie.
5. **`source_of_truth`** wskazuje pochodzenie danych (`woocommerce | manufacturer_catalog | manual_verified`).

## Pola (kontrakt)

### Identyfikacja
| Pole | Typ | Wymagane | Uwagi |
|---|---|---|---|
| `internal_sku` | string `TG-…` | tak | unikalny; klucz systemu |
| `product_id` | int | tak | WooCommerce Product ID (źródło prawdy) |
| `turbo_number_primary` | string | tak (VERIFIED/NEEDS_REVIEW) | znormalizowany (bez spacji/myślników, UPPER) |
| `turbo_numbers_all` | string[] | nie | warianty/aliasy |
| `oe_numbers` | string[] | nie | numery OE producenta pojazdu |
| `manufacturer_part_numbers` | string[] | nie | numery producenta turbiny |
| `source_of_truth` | enum | tak | patrz zasady |
| `confidence_status` | enum | tak | VERIFIED/NEEDS_REVIEW/MISSING |

### Pojazd (kompatybilność) — lista, produkt może pasować do wielu
| Pole | Typ | Uwagi |
|---|---|---|
| `vehicle_make` | string | np. Audi (≠ google_brand) |
| `vehicle_model` | string | np. A4 B8 |
| `generation` | string | np. B8 |
| `engine_code` | string | np. CGLC |
| `engine_capacity` | string | np. 2.0 TDI |
| `fuel_type` | enum | diesel/benzyna |
| `power_hp` | int | moc KM |
| `production_year_range` | string | np. 2008–2015 |
| `drivetrain` | string | opcjonalne |
| `notes_fitment` | string | uwagi doboru |

### Turbosprężarka
| Pole | Typ | Uwagi |
|---|---|---|
| `turbo_manufacturer` | string | Garrett/IHI/BorgWarner/… |
| `actuator_type` | enum | pneumatyczny/elektroniczny |
| `chra_brand` | string | marka nowego CHRA (jeśli VERIFIED) |
| `condition` | enum | **refurbished** (nowy=zabroniony dla regeneracji) |
| `refurbishment_scope` | string | zakres regeneracji (co wymienione) |
| `test_method` | string | metoda testu |
| `warranty_months` | int | np. 24 |

### Handel / logistyka
| Pole | Typ | Uwagi |
|---|---|---|
| `price` / `sale_price` | number | **WooCommerce = źródło prawdy** (front tylko czyta) |
| `stock_status` / `lead_time` | enum / string | j.w. |
| `old_turbo_return_required` | bool | zwrot starej turbiny |
| `old_turbo_return_deadline` | string | termin |
| `deposit_amount` | number | kaucja za rdzeń (core deposit) |
| `b2b_price` / `b2b_rules` | number / string | tylko dla zweryfikowanych warsztatów |

### Google / SEO
| Pole | Typ | Uwagi |
|---|---|---|
| `google_brand` | string | producent turbiny lub „Turbo-Git" — **NIE marka pojazdu** |
| `google_mpn` | string | MPN (≠ SKU wewnętrzny) |
| `google_gtin` | string\|null | jeśli brak → `identifier_exists=false` |
| `google_condition` | enum | `refurbished` |
| `seo_title` / `seo_description` | string | unikalne |
| `focus_keyword` | string | unikalny na produkt |
| `product_schema` | object | Product+Offer+Breadcrumb JSON-LD |
| `canonical_url` | string | kanoniczny URL |

## Normalizacja numerów (obowiązkowa)
`normalize(x) = uppercase(remove_all(x, [spacja, '-', '.', '/']))`.
Wyszukiwanie i deduplikacja działają na wartościach znormalizowanych; do wyświetlania trzymamy oryginał.

## Reprezentacja statusu pola
Każde pole techniczne ma parę `{ value, status }`, np.
`{ "power_hp": { "value": 143, "status": "VERIFIED" } }`. Frontend pokazuje odznakę „zweryfikowane"
tylko dla `VERIFIED`; `NEEDS_REVIEW`/`MISSING` nie są prezentowane jako pewne dane.
