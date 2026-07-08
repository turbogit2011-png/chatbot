# Backlog — Turbo-Git Forge

Priorytety: **P0** ryzyko prawne/SEO/bezpieczeństwo/produkcja · **P1** katalog/dane/konwersja ·
**P2** B2B/CRM/automatyzacje · **P3** wizualne.

## P0
- [ ] `P0-SEC-01` Framework sekretów: `.env.example`, `.gitignore`, skan CI „no-secrets", BFF trzyma klucze. *(rdzeń w tym PR)*
- [ ] `P0-SAFE-01` Safety framework wtyczki: PREVIEW→EXPORT→APPROVE→APPLY→VERIFY→ROLLBACK, backup meta, audit log, nonces, capability checks, blokada tworzenia produktów. *(szkielet w tym PR)*
- [ ] `P0-CAT-01` Nowy klucz SKU wewnętrzny `TG-…`; wyprowadzić numer turbo/OE z SKU (changeset + zgoda).
- [ ] `P0-GOO-01` Rozdział `google_brand` ≠ `vehicle_make` ≠ `turbo_manufacturer`; naprawa `brand` w feedzie.
- [ ] `P0-CAT-02` Reguła: `condition=refurbished`; twarda blokada oznaczenia „new" dla regenerowanych; audyt całego katalogu.
- [ ] `P0-DATA-01` Reguła „nie zgaduj": każde pole techniczne ma status VERIFIED/NEEDS_REVIEW/MISSING.

## P1
- [ ] `AUDIT-SAMPLE-20` Potwierdzić ustalenia na próbce ≥20 produktów (publicznie, bez zmian).
- [ ] `P1-CAT-03` Ekstrakcja pól technicznych (OE/turbo/silnik/moc) z tytułu/slug → atrybuty, z ręczną weryfikacją.
- [ ] `P1-SEO-01` Breadcrumb JSON-LD na produktach; kanonikale; plan 301 przy zmianach URL.
- [ ] `P1-FE-01` `apps/api` (BFF) + `apps/storefront` (Next.js) na realnych danych WooCommerce (staging).
- [ ] `P1-FE-02` Wyszukiwarka: SKU/OE/turbo/silnik/marka/model/moc + normalizacja numerów (spacje/myślniki/wielkość liter).
- [ ] `P1-PROD-01` Wzorcowa strona produktu (Faza 5).
- [ ] `P1-FIT-01` Moduł „czy ta turbina pasuje?" + formularz VIN + upload tabliczki.
- [ ] `P1-CI-01` CI: lint, typecheck, build, test, budżet wydajności.

## P2
- [ ] `P2-GOO-02` Feed QA; listy „ready for campaign" / „blocked".
- [ ] `P2-SEO-02` Huby: numer turbo / OE / kod silnika / model; internal linking; baza wiedzy/FAQ.
- [ ] `P2-B2B-01` Panel B2B: rejestracja, ceny B2B, historia, priorytet.
- [ ] `P2-CRM-01` CRM: VIN requests, reklamacje, zwrot starej turbiny (core deposit) + statusy.
- [ ] `P2-AUTO-01` Automatyzacje po zakupie + generator treści Allegro.

## P3
- [ ] `P3-UI-01` Dopracowanie UI/UX, mikrointerakcje, dostępność.
- [ ] `P3-DOC-01` Baza wiedzy: montaż, docieranie, objawy uszkodzeń (treści własne).
