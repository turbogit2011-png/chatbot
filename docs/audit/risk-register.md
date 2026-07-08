# Rejestr ryzyk (risk register)

Skala: Prawd. (1–5) × Wpływ (1–5) = Score. Właściciel = rola odpowiedzialna. Status mitygacji.

## P0 — ryzyka krytyczne (prawne / bezpieczeństwo / SEO / produkcja)

| ID | Ryzyko | P | W | Score | Mitygacja | Status |
|---|---|---|---|---|---|---|
| R1 | **Wyciek sekretów** (WooCommerce Consumer secret we froncie/GitHub/Pages) | 3 | 5 | 15 | Sekrety tylko w env server-side; BFF; skan CI „no-secrets"; `.gitignore`; `.env.example` bez wartości | Otwarte → framework w tym PR |
| R2 | **Regenerowana oznaczona jako „nowa"** (prawo konsumenckie, Google, reputacja) | 2 | 5 | 10 | `condition=refurbished` wymuszone regułą walidacji; blokada oznaczenia „new"; audyt całego katalogu | Częściowo (produkcja poprawnie `Refurbished` na próbce) |
| R3 | **Masowa zmiana rozwala żywy sklep** | 3 | 5 | 15 | Zakaz apply bez: backup → dry-run → changeset → zgoda → rollback; moduły domyślnie OFF | Framework w tym PR |
| R4 | **Zgadywanie numerów OE/turbo/kompatybilności** → błędny zakup, zwroty, spory | 3 | 5 | 15 | Zasada „nie zgaduj"; status pola VERIFIED/NEEDS_REVIEW/MISSING; walidator | Reguły w tym PR |
| R5 | **`brand` = marki pojazdu** w feedzie → dyskwalifikacje/niska jakość w Merchant | 4 | 4 | 16 | Rozdział pól: vehicle_make ≠ turbo_manufacturer ≠ google_brand; mapowanie feedu; feed QA | Zmapowane (Faza 2) |
| R6 | **SKU = numer turbo** → kolizje, błędy integracji, brak unikalności wewn. | 4 | 4 | 16 | `internal_sku` (`TG-…`) jako klucz; numery w osobnych polach; migracja kontrolowana | Kontrakt w tym PR |

## P1 — istotne

| ID | Ryzyko | P | W | Score | Mitygacja |
|---|---|---|---|---|---|
| R7 | Utrata pozycji SEO przy zmianie URL/struktury | 3 | 4 | 12 | Mapowanie 301, kanonikale, brak zmian slug bez redirect-planu, staging + GSC |
| R8 | Duplikaty/kanibalizacja (slugi wielomodelowe) | 3 | 3 | 9 | Huby + kanonikale + strategia duplicate-content (Faza 6) |
| R9 | Wydajność / CWV (ciężki Elementor) | 3 | 3 | 9 | Lekki frontend Next.js; budżet wydajności w CI |
| R10 | Brak testów/CI → regresje | 3 | 3 | 9 | Lint+typecheck+build+test w CI; e2e krytycznych ścieżek |
| R11 | Rozbieżność cen/stanów front vs WooCommerce | 3 | 4 | 12 | WooCommerce = źródło prawdy; cache z rewalidacją; brak duplikacji cen w repo |

## P2/P3

| ID | Ryzyko | Mitygacja |
|---|---|---|
| R12 | Fałszywe opinie/statystyki/certyfikaty | Zakaz w regułach + skan treści; tylko zweryfikowane dowody |
| R13 | Kopiowanie treści konkurencji | Własne treści; brak importu opisów |
| R14 | RODO (VIN, zdjęcia tabliczki, dane warsztatów) | Minimalizacja danych, zgody, retencja, szyfrowanie w tranzycie |

**Zasada nadrzędna:** żadna pozycja P0 nie zostaje wdrożona na produkcję bez jawnej zgody użytkownika
na konkretny zakres, backupu i planu rollbacku.
