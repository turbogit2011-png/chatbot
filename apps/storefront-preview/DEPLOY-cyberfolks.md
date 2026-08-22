# Wdrożenie MVP na cyberFolks — `szukaj.turbo-git.com`

Bezpieczne, statyczne wdrożenie narzędzia doboru. **Nie dotyka WordPressa/WooCommerce.** Zakup i płatność
dalej w sklepie turbo-git.com. Pliki są statyczne (HTML + zewnętrzne CDN), więc działają na współdzielonym
hostingu cyberFolks bez Node.js.

## Co wgrywasz
Tylko 2 pliki z folderu `apps/storefront-preview/`:
- `index.html`
- `robots.txt`

## Kroki (panel cyberFolks / DirectAdmin)

1. **Utwórz subdomenę.** Panel cyberFolks → *Domeny → Subdomeny* → dodaj `szukaj` dla `turbo-git.com`.
   Panel utworzy katalog subdomeny (np. `.../domains/turbo-git.com/public_html/szukaj/`
   lub `.../subdomains/szukaj.turbo-git.com/`). DNS dla subdomeny na tym samym hostingu tworzy się
   automatycznie (masz dostęp do DNS, więc nic więcej nie trzeba; jeśli DNS jest zewnętrzny — dodaj rekord
   `CNAME szukaj → turbo-git.com` lub `A` na IP serwera).

2. **Wgraj pliki.** Panel → *Menedżer plików* → wejdź do katalogu subdomeny → wgraj `index.html` i `robots.txt`
   (albo przez FTP/SFTP). Katalog powinien zawierać dokładnie te pliki.

3. **SSL.** Panel → *SSL / Let's Encrypt* → wystaw certyfikat dla `szukaj.turbo-git.com`
   (na cyberFolks zwykle włącza się automatycznie w kilka minut).

4. **Sprawdź:** otwórz `https://szukaj.turbo-git.com` — powinno działać (wyszukiwarka po numerze/OE,
   filtry, karty produktów, „Kup na turbo-git.com").

## Bezpieczeństwo / SEO
- Strona ma `<meta robots="noindex, follow">` + `canonical` na turbo-git.com — **nie tworzy duplikatów**
  i nie „gryzie się" z pozycjami sklepu.
- Zero sekretów. Zero zmian w WooCommerce. Rollback = usunięcie subdomeny/plików.

## Aktualizacja danych (ważne)
Dane katalogu to migawka z eksportu WooCommerce. **Ceny/dostępność finalne są zawsze w sklepie**
(przycisk „Kup na turbo-git.com"). Odświeżenie danych = ponowny eksport → regeneracja `index.html`
→ wgranie. Docelowo (etap 2): wersja czytająca dane live przez read-only API (wymaga hostingu z Node —
np. Cloudflare Pages/Vercel dla części aplikacyjnej), wtedy migawki znikają.

## Uwaga o obrazkach
Zdjęcia produktów ładują się z `turbo-git.com/wp-content/...` (Twój serwer) — działają od razu.
