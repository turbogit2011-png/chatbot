# Publikacja hubów SEO na turbo-git.com (WordPress + Elementor + Rank Math)

**Co to jest:** 8 gotowych fragmentów HTML (7 hubów marek + strona-index). Każdy hub to
kompletna treść strony: H1, opis, siatka realnych produktów (linki do Twoich stron produktowych),
FAQ + JSON-LD (BreadcrumbList, ItemList, FAQPage). Zdjęcia ładują się lekkie (WebP przez CDN).

**Bezpieczeństwo:** to są NOWE strony — nie ruszasz żadnej istniejącej. Rollback = usunięcie strony.

## Krok po kroku (na każdą stronę, ~3 min)
1. WordPress → **Strony → Dodaj nową**.
2. Tytuł strony: np. „Turbosprężarki Audi" (dla `marka-audi.html`).
3. **Uprawnienia URL (slug):** ustaw dokładnie jak w nagłówku pliku, np. `huby/marka-audi`
   (najpierw utwórz pustą stronę nadrzędną „huby", by uzyskać ścieżkę /huby/…, albo ustaw slug ręcznie).
4. Edytuj w **Elementorze** → wstaw widżet **HTML** → wklej CAŁĄ zawartość pliku huba.
   (Bez Elementora: edytor blokowy → blok „Własny HTML".)
5. **Rank Math** (pod treścią): przepisz z nagłówka pliku **Tytuł SEO / Opis / Focus Keyword**.
6. Opublikuj. Sprawdź na telefonie.

## Kolejność publikacji (wg potencjału)
index-huby (strona /huby/) → Audi (26) → Volkswagen (25) → Seat (21) → Skoda (19) → Ford (18) → Opel (17) → BMW (7)

## Linkowanie wewnętrzne (ważne dla SEO)
- Dodaj pozycję **„Turbo wg marki" → /huby/** do menu głównego lub stopki sklepu.
- Huby już linkują się nawzajem i do produktów — nic więcej nie musisz robić.

## Aktualizacja
Huby są generowane z katalogu. Po zmianach w produktach — wygenerujemy nowe wersje fragmentów
(1 komenda po naszej stronie), Ty tylko podmieniasz zawartość widżetu HTML.

## Czego NIE robić
- Nie podmieniaj istniejących stron kategorii WooCommerce tymi hubami (to osobne, dodatkowe strony).
- Nie zmieniaj slugów po publikacji (jak już zaindeksuje Google) bez przekierowania 301.
