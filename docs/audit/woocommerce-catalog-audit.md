# Audyt katalogu WooCommerce

**Zakres:** ~109 produktów. · **Data:** 2026-07-05 · **Zmiany produkcyjne:** brak.

> ✅ **PEŁNY AUDYT WYKONANY** na eksporcie CSV (ścieżka B, bez sekretów, read-only).
> Wejście: `docs/audit/import/wc-product-export.csv` (109 produktów, 131 kolumn).
> **Wyniki liczbowe:** `docs/audit/generated/catalog-quality-report.md` + `catalog-quality.csv`.
> Poniższa tabela to skrót najważniejszych ustaleń; pełne liczby w raporcie generowanym.
>
> 🔧 **Korekta rzetelnościowa (ważne):** wstępne założenie „dane techniczne nie są w atrybutach"
> okazało się **nietrafne** — atrybuty **istnieją**, ale są **pofragmentowane** (to samo znaczenie
> rozbite na wiele atrybutów, m.in. OE na 4, marka pojazdu na 3, kod silnika na 4 z duplikatem
> wielkości liter). Kondycję czytamy z autorytatywnego atrybutu **„Stan"** (93× „Regenerowany",
> 0× „Nowy", 16× brak → NEEDS_REVIEW), a nie ze skanu prozy.

## Ustalone z danych publicznych (VERIFIED / OBSERVED)

| # | Ustalenie | Dowód | Priorytet |
|---|---|---|---|
| C1 | **SKU = numer turbo** (`sku`=`mpn`=`18421966015`) | JSON-LD produktu | 🔴 P0 |
| C2 | **`brand` = marki pojazdu** („Audi, Seat") zamiast producenta turbiny / Turbo-Git | JSON-LD `brand` | 🔴 P0 |
| C3 | Stan poprawnie `RefurbishedCondition` (regenerowana) | JSON-LD `itemCondition` | ✅ / do potwierdzenia globalnie |
| C4 | ~~Dane techniczne nie w atrybutach~~ **SKORYGOWANE:** atrybuty są, ale **pofragmentowane/niespójne** (OE ×4, marka pojazdu ×3, kod silnika ×4). Moc (KM) na 109/109 ✅ | eksport CSV | 🟠 P1 (konsolidacja) |
| C7 | **Kaucja `_tg_kaucja_price` pusta na 109/109** — pole istnieje, nieużywane | eksport CSV | 🟠 P1 core deposit |
| C8 | **Pola marki (product_brand/brand_name) puste na 101/109**; marka w schema pochodzi z atrybutu pojazdu | eksport CSV | 🔴 P0 Merchant |
| C9 | **16/109 bez atrybutu „Stan"** (kondycja) → NEEDS_REVIEW; 0 oznaczonych „Nowy" (dobrze) | eksport CSV | 🟠 P1 |
| C10 | **91/109 bez krótkiego opisu**; 10 zduplikowanych focus keyword (kanibalizacja) | eksport CSV | 🟠 P1 |
| C11 | **Google Merchant: 109/109 `approved`** (mimo problemu z marką — do poprawy jakości/relevancji) | eksport CSV | ℹ️ |
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
