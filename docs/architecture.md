# Architektura Turbo-Git Forge

## Zasada nadrzędna: WooCommerce = źródło prawdy
Ceny, stany, zamówienia i produkty żyją w WooCommerce. Forge **czyta** je przez bezpieczny backend
i **wzbogaca** (katalog techniczny, dobór, B2B, feedy), ale ich nie duplikuje jako drugiego źródła.

## Przepływ danych i sekretów

```
[ Przeglądarka / apps/storefront (Next.js, publiczny) ]
        │  HTTPS, tylko dane publiczne, ZERO kluczy WooCommerce
        ▼
[ apps/api  (Backend-for-Frontend, server-side) ]
        │  - trzyma WC_CONSUMER_KEY/SECRET w ENV (nigdy w repo/froncie)
        │  - walidacja wejścia (zod), rate-limiting, CORS allowlist, logowanie błędów
        │  - normalizacja numerów (packages/catalog)
        ▼
[ WooCommerce REST API (read) ]  ← źródło prawdy
[ Checkout → prawdziwy koszyk/checkout WooCommerce ]  ← płatności po stronie WooCommerce
```

**Dlaczego BFF:** Consumer secret nie może trafić do przeglądarki ani do statycznego hostingu
(GitHub Pages). BFF jest jedynym miejscem, które zna sekret, i wystawia wąskie, zwalidowane endpointy.

## Monorepo (docelowo)
```
apps/storefront   Next.js + TS, mobile-first, SEO, czyta apps/api
apps/api          BFF: proxy WooCommerce (read), wyszukiwarka, VIN, walidacja, rate-limit
packages/catalog  model danych (data contract), normalizacja numerów, walidatory (współdzielone)
packages/ui       komponenty UI
plugins/turbo-git-forge  wtyczka WordPress (operacje po stronie WooCommerce, safety-first)
docs              audyt, katalog, architektura
```

## Bezpieczeństwo (wymogi realizacji)
- Sekrety tylko w ENV hostingu; w repo wyłącznie `*.env.example` bez wartości; `.gitignore` na `.env*`.
- BFF: walidacja (zod), rate-limiting, allowlist CORS, brak zwracania surowych błędów WooCommerce.
- Frontend: brak jakichkolwiek kluczy; komunikacja wyłącznie z `NEXT_PUBLIC_API_BASE_URL`.
- CI: skan „no-secrets" (blokuje merge przy wykryciu kluczy) + skan „no-fake-data".

## Wdrożenie (skrót — pełny runbook w kolejnym PR)
| Warstwa | Rekomendacja | Sekrety |
|---|---|---|
| `apps/storefront` | Vercel / Cloudflare Pages (SSR/ISR) | tylko `NEXT_PUBLIC_*` |
| `apps/api` | Vercel Functions / Cloudflare Workers / Render | `WC_*`, limity, CORS |
| `plugins/turbo-git-forge` | instalacja na WordPress (staging → produkcja) | brak — operuje w WP |

Nic nie jest publikowane produkcyjnie bez jawnej zgody użytkownika, backupu i planu rollbacku.

## Relacja do istniejącego repo
`main` to generyczny scaffold; `turbo-git-shop` i gałąź `claude/…` to referencje wizualne (demo).
Forge budujemy jako czystą warstwę na branchu `forge/turbo-git-platform-v1` — bez mieszania z demami.
