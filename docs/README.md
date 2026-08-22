# Turbo-Git Forge

Repozytorium platformy **Turbo-Git Forge** — uporządkowanie i przebudowa cyfrowego systemu sprzedaży
regenerowanych turbosprężarek Turbo-Git dla klientów indywidualnych i warsztatów (B2B).

> **To nie jest kolejne demo.** Celem jest realny, bezpieczny, skalowalny system, w którym
> **WooCommerce pozostaje źródłem prawdy** dla produktów, cen, stanów i zamówień, a warstwy
> Forge (frontend, katalog techniczny, B2B, CRM, feedy) budują na nim wartość — bez ryzyka dla
> żywego sklepu.

## Zasady bezwzględne (obowiązują cały kod w tym repo)

1. **Zero sekretów w repo/froncie/GitHub Pages.** Klucze API, hasła, tokeny → wyłącznie
   server-side environment variables. W repo tylko `*.env.example` bez wartości.
2. **Zero zmian na żywym sklepie** bez: backupu → dry-run → changesetu → zgody użytkownika → możliwości rollbacku.
3. **Zero fikcji.** Brak placeholderów produktowych, wymyślonych opinii, statystyk, certyfikatów,
   numerów OE/turbo/kodów silnika. Nieznane = `NEEDS_REVIEW`, nie „zgadnij".
4. **Regenerowana ≠ fabrycznie nowa.** Nigdy nie oznaczaj produktu regenerowanego jako nowego.
5. **Jedna wtyczka** (`turbo-git-forge`), nie seria „Batch 01/02/03".
6. **Każda operacja produkcyjna**: `PREVIEW → EXPORT CHANGESET → APPROVE → APPLY → VERIFY → ROLLBACK`.

## Mapa repozytorium (docelowa)

```
apps/
  storefront/     # Next.js + TS — frontend sprzedażowy (czyta realne dane WooCommerce przez apps/api)
  api/            # backend-for-frontend: trzyma sekrety, proxy do WooCommerce REST, rate-limit, walidacja
packages/
  catalog/        # model danych (data contract), normalizacja numerów, walidatory (TS)
  ui/             # współdzielone komponenty UI
plugins/
  turbo-git-forge/  # jedna wtyczka WordPress (PHP, namespace TurboGit\Forge) — safety-first
docs/
  audit/          # Faza 1 — raporty audytu (ten PR)
  catalog/        # Faza 2 — kontrakt danych i mapowania
  architecture.md # architektura, przepływ sekretów, wdrożenie
```

## Status

| Faza | Zakres | Status |
|---|---|---|
| 1 | Audyt (bez zmian produkcyjnych) | **w tym PR** |
| 2 | Master Catalog — kontrakt danych | **w tym PR (rdzeń)** |
| 3 | Wtyczka `turbo-git-forge` (safety framework) | **szkielet w tym PR** |
| 4 | Frontend + API (monorepo) | scaffold + plan |
| 5 | Wzorcowa strona produktu | plan |
| 6 | SEO / Google / B2B | plan |

Status produkcyjny całości: **NOT READY** (audyt + fundament; brak zmian na produkcji).
