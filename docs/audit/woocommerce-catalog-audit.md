# Audyt katalogu WooCommerce

**Zakres:** ~109 produktów. · **Data:** 2026-07-05 · **Zmiany produkcyjne:** brak.

> ⚠️ **Ograniczenie dostępu (świadome i zgodne z zasadami).** Pełny audyt pól WooCommerce (SKU,
> atrybuty, kategorie, Google Merchant, metadane) wymaga **read-only** dostępu do danych. Nie proszę
> o sekrety w czacie. Dwie bezpieczne ścieżki uzyskania danych do audytu — patrz sekcja „Jak
> odblokować pełny audyt". Poniżej: co udało się ustalić **z danych publicznych** + checklista, którą
> wtyczka `turbo-git-forge` (moduł Catalog, tryb PREVIEW) wygeneruje automatycznie jako raport.

## Ustalone z danych publicznych (VERIFIED / OBSERVED)

| # | Ustalenie | Dowód | Priorytet |
|---|---|---|---|
| C1 | **SKU = numer turbo** (`sku`=`mpn`=`18421966015`) | JSON-LD produktu | 🔴 P0 |
| C2 | **`brand` = marki pojazdu** („Audi, Seat") zamiast producenta turbiny / Turbo-Git | JSON-LD `brand` | 🔴 P0 |
| C3 | Stan poprawnie `RefurbishedCondition` (regenerowana) | JSON-LD `itemCondition` | ✅ / do potwierdzenia globalnie |
| C4 | Dane techniczne **nie w atrybutach** (OE, kod silnika, moc, VIN-fitment) — tylko w tytule/slug | brak `<th>`/attributes | 🟠 P1 |
| C5 | Slugi łączące wiele modeli → ryzyko duplikatów/kanibalizacji | sitemap + slug | 🟠 P1 |
| C6 | Brak ustrukturyzowanych pól: kaucja/zwrot starej turbiny, lead_time, ceny B2B | brak w schema/treści | 🟠 P1/P2 |

## Checklista pełnego audytu (raport generuje moduł Catalog → PREVIEW)

Dla każdego z 109 produktów wtyczka policzy i wylistuje (bez modyfikacji):

**Integralność / zgodność:**
- [ ] duplikaty (po znormalizowanym numerze turbo/OE, po tytule)
- [ ] SKU: pusty / równy numerowi turbo / nie-unikalny / niezgodny ze wzorcem `TG-...`
- [ ] stan produktu: `regenerowana` vs oznaczenie „fabrycznie nowa" (konflikt → 🔴)
- [ ] kategoria: brak / błędna / niespójna
- [ ] marka Google (`brand`) = producent turbiny/Turbo-Git, NIE marka pojazdu

**Kompletność danych technicznych (status VERIFIED/NEEDS_REVIEW/MISSING na pole):**
- [ ] `turbo_number_primary`, `turbo_numbers_all`
- [ ] `oe_numbers`, `manufacturer_part_numbers`
- [ ] `engine_code`, `engine_capacity`, `power_hp`, `fuel_type`
- [ ] `vehicle_make/model/generation`, `production_year_range`
- [ ] `warranty_months`, `chra_brand`, `refurbishment_scope`, `test_method`

**Handel / logistyka:**
- [ ] `old_turbo_return_required`, `deposit_amount`, `old_turbo_return_deadline`
- [ ] `lead_time`, `stock_status`, `b2b_price`, `b2b_rules`

**Google / SEO:**
- [ ] `google_brand`, `google_mpn`, `google_gtin` / `identifier_exists=false`, `google_condition=refurbished`
- [ ] `seo_title`, `seo_description`, `focus_keyword` (unikalny), `canonical_url`

Każdy produkt otrzyma **scorecard jakości** (0–100) i flagi. Raport = CSV + Markdown w `docs/audit/generated/`.

## Jak odblokować pełny audyt (bez sekretów w czacie)
1. **Rekomendowane:** utworzyć **read-only** klucz WooCommerce REST (uprawnienia *Read*), a wartości
   `WC_URL`, `WC_KEY`, `WC_SECRET` ustawić **w hostingu jako zmienne środowiskowe** dla `apps/api`
   (nigdy w repo). Wtedy moduł audytu działa przez BFF.
   *lub*
2. **Offline:** wyeksportować katalog (WooCommerce → Produkty → Eksport CSV) i wgrać plik do
   `docs/audit/import/` — audyt policzę na eksporcie, całkowicie bez dostępu do sklepu.

Do czasu jednego z powyższych — audyt katalogu pozostaje na poziomie „publiczne + checklista".
