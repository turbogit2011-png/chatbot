import anthropic
import re
from config import Config

SYSTEM_PROMPT = """Jesteś ekspertem SEO i copywriterem specjalizującym się w sklepach e-commerce
z turbosprężarkami i częściami samochodowymi.
Twoje teksty są zoptymalizowane pod Google TOP 1 na rynku polskim i europejskim.
Piszesz konkretnie, technicznie i sprzedażowo.
NIE używasz ogólników. Każde zdanie wnosi wartość dla klienta lub SEO.
Używasz naturalnie słów kluczowych, nie upychasz ich na siłę.
Format wyjściowy: TYLKO żądany tekst, bez wyjaśnień, bez nagłówków sekcji."""

class ContentAI:
    def __init__(self):
        self.api_key = Config.ANTHROPIC_API_KEY
        self.model = Config.CLAUDE_MODEL
        self._client = None

    def _client_ok(self):
        if not self.api_key:
            return False
        if self._client is None:
            self._client = anthropic.Anthropic(api_key=self.api_key)
        return True

    def _ask(self, prompt, max_tokens=800):
        if not self._client_ok():
            return None
        msg = self._client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text.strip()

    # ─────────────────────────────────────────────────────────────────────────
    # PRODUCT CONTENT
    # ─────────────────────────────────────────────────────────────────────────

    def generate_short_description(self, product):
        name = product.get("name", "")
        sku = product.get("sku", "")
        price = product.get("price", "")
        attrs = self._attrs_str(product.get("attributes", []))
        prompt = f"""Napisz KRÓTKI OPIS produktu dla sklepu WooCommerce (100-140 znaków).
Produkt: {name}
SKU/OEM: {sku}
Atrybuty: {attrs}
Cena: {price} PLN

Wymagania:
- Zacznij od głównego słowa kluczowego (turbosprężarka + marka/model)
- Wymień najważniejszą zaletę (nowa/regenerowana, gwarancja, dostawa)
- Zakończ CTA (np. "Zamów z dostawą 24h")
- MAX 140 znaków"""
        result = self._ask(prompt, 200)
        return result or self._fallback_short_desc(product)

    def generate_full_description(self, product, keywords=None):
        name = product.get("name", "")
        sku = product.get("sku", "")
        price = product.get("price", "")
        attrs = self._attrs_str(product.get("attributes", []))
        kws = ", ".join(keywords[:5]) if keywords else name

        prompt = f"""Napisz PEŁNY OPIS produktu (min. 350 słów) dla turbosprężarki w sklepie WooCommerce.
Zoptymalizowany pod SEO i konwersję. Struktura HTML (używaj <h2>, <p>, <ul>, <table>).

Produkt: {name}
SKU/OEM: {sku}
Atrybuty: {attrs}
Cena: {price} PLN
Frazy kluczowe do wpleacenia: {kws}

OBOWIĄZKOWE SEKCJE (użyj dokładnie tych <h2>):
<h2>Zastosowanie i kompatybilność</h2>
<h2>Dane techniczne</h2>
<h2>Co wchodzi w skład dostawy</h2>
<h2>Gwarancja i zwroty</h2>
<h2>Montaż — wskazówki</h2>
<h2>Najczęściej zadawane pytania</h2>

W sekcji FAQ dodaj min. 3 pytania Q&A.
W sekcji Dane techniczne użyj tabeli HTML.
Pisz profesjonalnie, technicznie, sprzedażowo.
Nie powtarzaj zdań. NIE wymyślaj nieistniejących danych technicznych."""

        result = self._ask(prompt, 1500)
        return result or self._fallback_full_desc(product)

    def generate_seo_title(self, product, max_chars=60):
        name = product.get("name", "")
        sku = product.get("sku", "")
        price = product.get("price", "")
        prompt = f"""Napisz SEO title dla produktu WooCommerce. MAX {max_chars} znaków.
Produkt: {name} | SKU: {sku} | Cena: {price} PLN

Zasady:
- Zacznij od głównej frazy kluczowej (turbosprężarka + marka + model)
- Dodaj USP (np. "Gwarancja 24m", "Darmowa dostawa", "Oryginał")
- Zakończ nazwą sklepu po | (np. | TurboShop)
- MAX {max_chars} znaków — żaden znak więcej
- Format: Turbosprężarka [Marka] [Model] [Numer OEM] – [USP] | [Sklep]"""
        result = self._ask(prompt, 100)
        if result and len(result) <= max_chars + 5:
            return result[:max_chars]
        return None

    def generate_meta_description(self, product, max_chars=160):
        name = product.get("name", "")
        price = product.get("price", "")
        prompt = f"""Napisz meta description dla produktu WooCommerce. MAX {max_chars} znaków.
Produkt: {name} | Cena: {price} PLN

Zasady:
- Zacznij od głównego słowa kluczowego
- Wymień 2-3 USP (gwarancja, dostawa, cena, jakość)
- Zakończ CTA (np. "Zamów teraz ►", "Sprawdź cenę →")
- MAX {max_chars} znaków — dokładnie
- Pisz naturalnie, nie upychaj słów kluczowych"""
        result = self._ask(prompt, 200)
        if result:
            result = result[:max_chars]
        return result

    def generate_category_description(self, category_name, car_data=None):
        prompt = f"""Napisz OPIS KATEGORII dla WooCommerce. Min. 250 słów. Format HTML.
Kategoria: {category_name}
Branża: Turbosprężarki / Części samochodowe

Struktura:
<p>Wstęp (2-3 zdania z główną frazą kluczową)</p>
<h2>Dlaczego warto kupić turbosprężarkę {category_name} u nas?</h2>
<ul>bullet points zalet</ul>
<h2>Jak dobrać turbosprężarkę {category_name}?</h2>
<p>Porada doboru</p>
<h2>Najczęściej szukane turbosprężarki {category_name}</h2>
<ul>lista 5-8 popularnych modeli/zastosowań</ul>
<p>Podsumowanie + CTA</p>

Wymagania:
- Naturalne użycie słów kluczowych: turbosprężarka {category_name}, turbo {category_name}, regeneracja turbo {category_name}
- Pisz dla klienta końcowego (właściciela auta)
- Koniec z CTA: Zamów teraz lub Skontaktuj sie"""

        result = self._ask(prompt, 1000)
        return result or self._fallback_category_desc(category_name)

    def generate_homepage_content(self, store_name="TurboShop"):
        prompt = f"""Napisz treść strony głównej sklepu z turbosprężarkami: {store_name}.
Format HTML. Min. 400 słów.

Sekcje (obowiązkowe):
<h1>Nagłówek H1 (główna fraza: turbosprężarki sklep online)</h1>
<section class="hero-text"><p>Lead — 2-3 zdania USP sklepu</p></section>
<h2>Dlaczego {store_name}?</h2>
<ul>6 punktów przewag</ul>
<h2>Nasze kategorie</h2>
<p>Opis asortymentu</p>
<h2>Jak zamawiać?</h2>
<ol>3-4 kroki procesu zakupu</ol>
<h2>Najczęściej zadawane pytania</h2>
5 pytań FAQ w formacie Q&A

Ton: profesjonalny, zaufany, techniczny ale zrozumiały dla mechanika i właściciela auta.
Frazy kluczowe: turbosprężarki sklep, turbo online, regeneracja turbo, nowe turbosprężarki, turbo regenerowane"""

        return self._ask(prompt, 1200) or ""

    def generate_llms_txt(self, store_url, store_name, categories=None):
        cats = "\n".join([f"- {c}" for c in (categories or ["Turbosprężarki nowe", "Turbosprężarki regenerowane", "CHRA"])])
        content = f"""# {store_name}

## O sklepie
{store_name} to sklep internetowy specjalizujący się w sprzedaży turbosprężarek
nowych i regenerowanych do samochodów osobowych, dostawczych i ciężarowych.
Sklep obsługuje klientów z Polski i Europy.

## Asortyment
{cats}

## Główne marki w ofercie
BMW, Audi, Volkswagen, Mercedes-Benz, Ford, Opel, Toyota, Renault, Peugeot, Citroën, Skoda

## Producenci turbin
Garrett, BorgWarner, Holset, IHI, Mitsubishi Turbocharger, KKK (BorgWarner)

## Polityka sklepu
- Gwarancja: 12 miesięcy (regenerowane), 24 miesiące (nowe)
- Dostawa: 24-48h Polska, 3-7 dni Europa
- Zwroty: 30 dni bez podania przyczyny
- Płatność: Przelew, karta, BLIK, PayPal, raty

## URL sklepu
{store_url}

## Kontakt
Strona kontaktu: {store_url}/kontakt

## Polityka treści
Treści mogą być cytowane z podaniem źródła ({store_name}, {store_url}).
"""
        return content

    # ─────────────────────────────────────────────────────────────────────────
    # FALLBACKS (no API key)
    # ─────────────────────────────────────────────────────────────────────────

    def _fallback_short_desc(self, product):
        name = product.get("name", "Turbosprężarka")
        return f"{name} — nowa i regenerowana. Gwarancja 12 mies., dostawa 24h, montaż w cenie. Zamów online!"

    def _fallback_full_desc(self, product):
        name = product.get("name", "Turbosprężarka")
        sku = product.get("sku", "")
        return f"""<p><strong>{name}</strong> to wysokiej jakości turbosprężarka dostępna w wersji nowej i regenerowanej.
Numer OEM: {sku}.</p>
<h2>Zastosowanie i kompatybilność</h2>
<p>Sprawdź kompatybilność przed zakupem — wyślij nam numer VIN, potwierdzimy dobór bezpłatnie.</p>
<h2>Dane techniczne</h2>
<table><tr><th>Parametr</th><th>Wartość</th></tr>
<tr><td>Numer OEM</td><td>{sku}</td></tr>
<tr><td>Typ</td><td>Turbosprężarka</td></tr></table>
<h2>Gwarancja i zwroty</h2>
<p>Gwarancja 12 miesięcy na regenerowane, 24 miesiące na nowe. Zwroty w ciągu 30 dni.</p>
<h2>Najczęściej zadawane pytania</h2>
<p><strong>Czy mogę sprawdzić kompatybilność przed zakupem?</strong> Tak — wyślij numer VIN.</p>"""

    def _fallback_category_desc(self, cat_name):
        return f"""<p>Witamy w kategorii <strong>turbosprężarki {cat_name}</strong>.
Oferujemy szeroki wybór turbosprężarek nowych i regenerowanych do samochodów {cat_name}.</p>
<h2>Dlaczego warto kupić turbosprężarkę {cat_name} u nas?</h2>
<ul><li>Oryginalne części i wysokiej jakości zamienniki</li>
<li>Gwarancja na każdy produkt</li>
<li>Dostawa w 24 godziny</li>
<li>Bezpłatna weryfikacja kompatybilności po VIN</li></ul>
<p>Skontaktuj się z nami — pomożemy dobrać właściwą turbosprężarkę do Twojego auta.</p>"""

    def _attrs_str(self, attributes):
        parts = []
        for a in attributes:
            name = a.get("name", "")
            opts = a.get("options", [a.get("option", "")])
            val = ", ".join(str(o) for o in opts if o)
            if name and val:
                parts.append(f"{name}: {val}")
        return " | ".join(parts) if parts else "brak"
