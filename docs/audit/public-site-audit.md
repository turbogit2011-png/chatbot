# Audyt strony publicznej — turbo-git.com

**Data:** 2026-07-05 · **Metoda:** analiza publicznie dostępnych zasobów (HTML, sitemap, robots,
JSON-LD) bez logowania i bez API. · **Status zmian produkcyjnych:** brak (read-only).

Legenda dowodu: `VERIFIED` = potwierdzone na żywym zasobie · `OBSERVED` = zaobserwowane, wymaga
szerszej próbki · `NEEDS_ACCESS` = wymaga dostępu (admin / API read-only / narzędzia Google).

---

## 0. Stack (VERIFIED)
- WordPress + WooCommerce, Elementor, Rank Math SEO, Google for WooCommerce, FiboSearch.
- Sitemapy Rank Math: `page-`, `product-`, `category-`, `product_brand-sitemap.xml`.
- **109 URL produktów** w `product-sitemap.xml` (zgodne z deklarowanym katalogiem).

## 1. Architektura informacji i URL
- **VERIFIED — numery upakowane w slug.** Przykład:
  `/produkt/turbosprezarka-2-0-tdi-143km-audi-a4-b8-a5-q5-exeo-cglc-cjca-uszczelki/`.
  Slug niesie: pojemność (2.0 TDI), moc (143 KM), marki/modele (Audi A4 B8/A5/Q5, Seat Exeo),
  kody silnika (CGLC, CJCA). To zawiera cenną semantykę, ale:
  - dane są **tylko w tekście** (slug/tytuł/opis), nie w ustrukturyzowanych atrybutach → brak filtrów,
    brak fasetowania, brak spójnego schema, trudny feed.
  - długie, „workowate" slugi mieszają wiele modeli → kanibalizacja i rozmyty focus keyword.
- **OBSERVED — brak dedykowanych stron-hubów** po numerze turbo / OE / kodzie silnika (potencjał SEO, Faza 6).

## 2. Strona produktowa (VERIFIED na 1 produkcie, do rozszerzenia na próbce)
Analiza `/produkt/...audi-a4-b8...`:
- **`sku = "18421966015"`, `mpn = "18421966015"`** → **SKU = numer turbosprężarki.**
  🔴 P0. SKU musi być wewnętrznym identyfikatorem Turbo-Git; numer turbo/OE to osobne pola.
- **`brand = { name: "Audi, Seat" }`** → marka w schema/feedzie ustawiona na **marki pojazdu**.
  🔴 P0 (Google). `brand` powinno być producentem turbiny (Garrett/IHI/BorgWarner…) lub „Turbo-Git",
  a marki pojazdu to osobny wymiar kompatybilności.
- **`itemCondition = RefurbishedCondition`** ✅ poprawnie (nie „nowa"). Zgodne z pozycjonowaniem.
- **`WarrantyPromise` 24 miesiące** ✅ obecne w schema. „Gwarancja 24" i „Nowy CHRA" wielokrotnie w treści ✅.
- **`Offer` InStock, price 999 PLN** ✅. `MerchantReturnPolicy` + `OfferShippingDetails` ✅
  (dodane przez Google for WooCommerce).
- 🟠 **Brak breadcrumb JSON-LD** (`itemListElement` = 0 na stronie produktu) — P1 SEO.
- 🟠 **Brak tabeli atrybutów** (`<th>` techniczne puste) — dane techniczne nie są sfrukturyzowane — P1.
- 🟠 **Waga strony ~330 KB HTML** (Elementor + liczne wtyczki) — realne ryzyko dla Core Web Vitals — P1.

## 3. SEO techniczne
- ✅ Rank Math: sitemapy, Product/Offer/Organization/Website schema, polityka zwrotów, wysyłka.
- 🟠 **Breadcrumby**: brak `BreadcrumbList` na produkcie (do włączenia/naprawy).
- 🟠 **Marka jako wymiar**: `product_brand` istnieje (sitemap), ale wygląda na użyty do marek pojazdu,
  nie producenta turbiny → konflikt semantyczny (patrz Faza 2).
- 🟠 **Kanonikalizacja / duplikaty**: slugi łączące wiele modeli grożą kanibalizacją; brak hubów.
- `NEEDS_ACCESS` — realne pokrycie indeksu (GSC), Core Web Vitals polowe (CrUX/GSC), 404, redirecty.
- ℹ️ `robots.txt` blokuje wyłącznie `GPTBot` (świadoma decyzja; nie wpływa na Google).

## 4. UX / konwersja (do potwierdzenia na próbce + realnym mobile)
- 🟠 Brak widocznego, ustandaryzowanego bloku „first screen": numer turbo, kluczowe OE, kompatybilność,
  cena, dostępność, gwarancja, CTA „Wyślij VIN", „Kup teraz", „Zwrot starej turbiny".
  (Faza 5 projektuje wzorzec.)
- 🟠 Dobór po **VIN / numerze turbo / OE** — brak dedykowanego, prominentnego narzędzia doboru
  (FiboSearch daje search, ale to nie to samo co „czy ta turbina pasuje?").
- `NEEDS_ACCESS` — realne testy checkoutu, koszyka, ścieżki mobilnej.

## 5. Zaufanie / B2B / gwarancja / zwrot starej turbiny
- ✅ Gwarancja 24 mies. i „Nowy CHRA" komunikowane w treści i schema.
- 🟠 **Zwrot starej turbiny / kaucja (core deposit)**: brak ustrukturyzowanych pól (kwota kaucji, termin
   zwrotu, czy wymagany) — istotne dla wyceny i CRM (Faza 2/3).
- 🟠 **B2B**: brak wydzielonego procesu (rejestracja warsztatu, ceny B2B, priorytet, uproszczona reklamacja).

---

## Priorytety wynikające z tego audytu
- **P0:** SKU = numer turbo; `brand` = marki pojazdu (Google/feed); regenerowana≠nowa (utrzymać, zweryfikować w całym katalogu).
- **P1:** brak struktury atrybutów technicznych; brak breadcrumb schema; waga strony/CWV; brak wzorca strony produktu; brak doboru po VIN/OE.
- **P2:** brak procesu B2B, kaucji za rdzeń, hubów SEO.

Rozszerzenie: powyższe „VERIFIED na 1 produkcie" należy potwierdzić na próbce ≥20 produktów
(zadanie w backlogu, `AUDIT-SAMPLE-20`) — możliwe bez zmian, na publicznych stronach.
