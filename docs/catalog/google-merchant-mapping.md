# Mapowanie: Master Catalog → Google Merchant / Google for WooCommerce

Cel: feed zgodny z wymaganiami Google, bez fałszywych identyfikatorów (zasada #9), z poprawnym stanem.

| Atrybut Google | Źródło (kontrakt) | Reguła |
|---|---|---|
| `id` | `internal_sku` (`TG-…`) | stabilny, unikalny |
| `title` | `seo_title` / tytuł | zawiera model+numer turbo, bez „nowa" dla regeneracji |
| `description` | `seo_description`/opis | treść własna, faktograficzna |
| `link` / `canonical_url` | `canonical_url` | kanoniczny |
| `image_link` | zdjęcie główne | **realne** zdjęcia |
| `availability` | `stock_status` | z WooCommerce |
| `price` / `sale_price` | WooCommerce | źródło prawdy |
| **`brand`** | `google_brand` (producent turbiny lub „Turbo-Git") | 🔴 **NIGDY marka pojazdu** (obecnie błąd „Audi, Seat") |
| **`mpn`** | `google_mpn` (numer producenta turbiny) | ≠ `internal_sku`; jeśli brak → pomiń |
| **`gtin`** | `google_gtin` | jeśli brak → **`identifier_exists = false`** (nie wymyślać) |
| **`condition`** | `condition` | `refurbished` (dla regeneracji) |
| `product_type` / `google_product_category` | kategoria | „Vehicles & Parts > … > Turbochargers" |
| kompatybilność | atrybuty pojazdu | do opisu / atrybutów strukturalnych |

## Kolejka publikacji (feed QA)
- **READY FOR CAMPAIGN:** wszystkie wymagane pola `VERIFIED`, `brand` poprawna, `condition=refurbished`,
  identyfikatory spójne (`gtin` lub `identifier_exists=false`).
- **BLOCKED:** dowolne pole krytyczne = `NEEDS_REVIEW/MISSING` lub `brand` = marka pojazdu.
  Produkt **nie trafia** do kampanii do czasu weryfikacji.

## Uwagi
- Stan `refurbished` bywa wrażliwy — zweryfikować w Merchant Center akceptację i ewentualne wymagania
  (polityki dot. odnowionych). To sprawdzenie = `NEEDS_ACCESS` (konto Merchant), nie zgadujemy.
- Google for WooCommerce już generuje `MerchantReturnPolicy`/`OfferShippingDetails` (VERIFIED na produkcji) — zachować.
