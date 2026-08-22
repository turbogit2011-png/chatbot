# Audyt repozytorium — turbogit2011-png/chatbot

**Data:** 2026-07-05 · **Branch bazowy:** `main` · **Metoda:** przegląd drzewa i zależności.

## Najważniejsze ustalenie (VERIFIED)
**To repozytorium nie jest systemem produkcyjnym sklepu.** `main` zawiera **generyczny scaffold
Next.js 16 / React 19** z modułami niezwiązanymi z Turbo-Git:
```
src/app/ai, src/app/wealth, src/app/aura
src/components/{ai, wealth, aura, momentum, ui}   # AI chat, planer finansów, habit-tracker
turbo-git-shop/                                    # osobne, statyczne demo sklepu (dane w src/lib/data.ts)
```
Produkcja (turbo-git.com) to **WordPress + WooCommerce** — poza tym repo. Wniosek: Forge budujemy
tu **od zera jako czystą warstwę**, a WooCommerce integrujemy przez API (nie migrujemy sklepu do repo).

## Ocena szczegółowa

| Obszar | Stan | Priorytet |
|---|---|---|
| Struktura projektu | Brak monorepo; luźne aplikacje demo + zagnieżdżony `turbo-git-shop` z własnym `package-lock` | P1 |
| Framework/zależności | Next 16.2.6, React 19.2.4 — aktualne. OK jako baza `apps/storefront` | ✅ |
| Dane produktowe | `turbo-git-shop/src/lib/data.ts` = **statyczne dane demo** (nie realne) | 🔴 usunąć z toru produkcyjnego |
| Backend / API | **Brak** warstwy serwerowej / BFF do WooCommerce | 🔴 P0 (fundament Fazy 4) |
| Sekrety | Brak wykrytych sekretów w kodzie (dobrze); brak `.env.example` i konwencji | P1 |
| Testy | **Brak** testów jednostkowych/integracyjnych/e2e | 🔴 P1 |
| CI/CD | `.github/` obecne; **brak** pipeline lint/build/test/typecheck | 🔴 P1 |
| Dokumentacja wdrożeniowa | Brak (env, deploy, rollback) | P1 |
| GitHub Pages | Repo zawiera artefakty statyczne (`.nojekyll`, demo) — **Pages nie może hostować sekretów/BFF** | ⚠️ zasada #2 |

## Rekomendacje (realizowane w kolejnych PR-ach)
1. **Monorepo** (`apps/*`, `packages/*`, `plugins/*`, `docs/*`) — workspaces + jeden lockfile.
2. **`apps/api` (BFF)** trzyma sekrety WooCommerce i wystawia bezpieczne, zwalidowane endpointy;
   frontend **nigdy** nie dotyka Consumer secret.
3. **Wyłączyć dane demo z toru produkcyjnego** — `apps/storefront` czyta wyłącznie realne dane przez `apps/api`.
4. **CI/CD**: lint + typecheck + build + testy + skan „brak sekretów" + „brak fikcyjnych danych" (grep reguł).
5. **`.env.example`** (bez wartości) + `docs/architecture.md` (deploy Vercel/Cloudflare/Render, rollback).
6. Zachować demo (`turbo-git-shop`, gałąź `claude/...`) jako referencję wizualną — **poza** torem produkcyjnym.
