# Plan wykonawczy 90 dni

Zasada: każda zmiana produkcyjna = branch → PR → staging → zgoda → apply → verify → (rollback ready).
Nic nie idzie na `main`/produkcję bez akceptacji użytkownika.

## Tydzień 0 (ten PR) — fundament, zero zmian produkcyjnych
- Branch `forge/turbo-git-platform-v1`.
- Audyty (Faza 1) + kontrakt danych (Faza 2, rdzeń) + szkielet wtyczki (Faza 3) + `.env.example`.
- Backlog P0–P3, risk register, plan.

## Dni 1–14 — dane i bezpieczeństwo (P0)
- Monorepo: `apps/api` (BFF, sekrety w env, rate-limit, walidacja), `apps/storefront`, `packages/catalog`.
- CI/CD: lint, typecheck, build, testy, skan „no-secrets", skan „no-fake-data".
- Wtyczka `turbo-git-forge`: moduł **Catalog → PREVIEW** generuje raport jakości 109 produktów
  (po udostępnieniu read-only API **lub** eksportu CSV). Brak jakichkolwiek zapisów.
- Decyzje P0 do zatwierdzenia: nowy schemat SKU (`TG-…`), rozdział brand/vehicle/turbo-manufacturer.

## Dni 15–30 — katalog i konwersja (P1)
- Migracja danych do modelu (Faza 2) w trybie changeset: pola techniczne z tytułów/slugów → atrybuty,
  **z ręczną weryfikacją** (VERIFIED/NEEDS_REVIEW), bez zgadywania.
- Wzorcowa strona produktu (Faza 5) na `apps/storefront` (staging) na realnych danych.
- Naprawa breadcrumb schema; plan redirectów przy ewentualnej zmianie URL.
- Moduł „czy ta turbina pasuje?" v1 (numer turbo/OE) + formularz VIN.

## Dni 31–60 — Google/SEO/feed (P1/P2)
- Feed Google: mapowanie brand/mpn/gtin(identifier_exists)/condition=refurbished; **feed QA**;
  lista „ready for campaign" vs „blocked (NEEDS_REVIEW)".
- Huby SEO po numerze turbo/OE/kodzie silnika/modelu (Faza 6) + internal linking + kanonikale.
- Baza wiedzy / FAQ (treści własne).

## Dni 61–90 — B2B, CRM, automatyzacje (P2)
- Panel B2B: rejestracja warsztatu, ceny B2B, historia, priorytet.
- CRM: zgłoszenia VIN, reklamacje, zwrot starej turbiny (core deposit) + statusy.
- Automatyzacje po zakupie (montaż, gwarancja, docieranie) + generator treści Allegro.

## Bramki jakości (Definition of Done każdej fazy)
`lint ✓` · `typecheck ✓` · `build ✓` · `test ✓` · `no-secrets ✓` · `no-fake-data ✓` · raport zmian ✓ ·
PR ze statusem `NOT READY / READY FOR STAGING / READY FOR PRODUCTION`.
