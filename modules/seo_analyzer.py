import re
from urllib.parse import urlparse
from database import log_audit

TITLE_MIN = 40
TITLE_MAX = 60
DESC_MIN = 130
DESC_MAX = 160
H1_MIN = 20
H1_MAX = 70
PRICE_REQUIRED = True

TURBO_STOP_WORDS = {"do", "i", "w", "z", "na", "the", "and", "for", "of", "in"}

class SEOAnalyzer:
    def __init__(self, woo_client):
        self.woo = woo_client

    # ────────────────────────────────────────────────────────────────────────
    # PUBLIC: full audit
    # ────────────────────────────────────────────────────────────────────────

    def run_full_audit(self):
        products = self.woo.get_all_products()
        categories = self.woo.get_categories()

        results = {
            "products": [],
            "categories": [],
            "summary": {},
        }

        for p in products:
            issues = self._audit_product(p)
            results["products"].append({
                "id": p["id"],
                "name": p["name"],
                "issues": issues,
                "score": self._score(issues),
                "permalink": p.get("permalink", ""),
            })

        for c in categories:
            issues = self._audit_category(c)
            results["categories"].append({
                "id": c["id"],
                "name": c["name"],
                "issues": issues,
                "score": self._score(issues),
                "slug": c.get("slug", ""),
            })

        results["summary"] = self._build_summary(results)
        return results

    # ────────────────────────────────────────────────────────────────────────
    # PRODUCT AUDIT
    # ────────────────────────────────────────────────────────────────────────

    def _audit_product(self, p):
        issues = []
        pid = p["id"]
        name = p.get("name", "")

        # Title / name
        issues += self._check_title(pid, name, name, "product")

        # Short description
        short_desc = self._strip_html(p.get("short_description", ""))
        if not short_desc:
            issues.append({"field": "short_description", "severity": "critical",
                           "msg": "Brak krótkiego opisu produktu — kluczowy dla SEO i konwersji",
                           "fix": f"Dodaj krótki opis (100-150 znaków) z główną frazą kluczową produktu"})
        elif len(short_desc) < 80:
            issues.append({"field": "short_description", "severity": "warning",
                           "msg": f"Krótki opis za krótki ({len(short_desc)} znaków)",
                           "fix": "Rozbuduj do minimum 100 znaków z naturalnym użyciem słów kluczowych"})

        # Long description
        long_desc = self._strip_html(p.get("description", ""))
        if not long_desc:
            issues.append({"field": "description", "severity": "critical",
                           "msg": "Brak pełnego opisu — Google nie ma treści do indeksowania",
                           "fix": "Dodaj opis min. 300 słów: zastosowanie, dane techniczne, kompatybilność, FAQ"})
        elif len(long_desc.split()) < 150:
            issues.append({"field": "description", "severity": "warning",
                           "msg": f"Opis zbyt krótki ({len(long_desc.split())} słów)",
                           "fix": "Rozbuduj do min. 300 słów. Dodaj: dane techniczne, kompatybilność, FAQ, montaż"})

        # Slug / URL
        slug = p.get("slug", "")
        issues += self._check_slug(pid, slug, name, "product")

        # Price
        price = p.get("regular_price", "") or p.get("price", "")
        if not price:
            issues.append({"field": "price", "severity": "critical",
                           "msg": "Brak ceny — produkt nie sprzedaje i psuje schema markup",
                           "fix": "Ustaw cenę regularną w WooCommerce"})

        # Images
        images = p.get("images", [])
        if not images:
            issues.append({"field": "images", "severity": "critical",
                           "msg": "Brak zdjęć — kluczowy czynnik konwersji i SEO",
                           "fix": "Dodaj minimum 3 zdjęcia: główne, boczne, etykieta/numer"})
        else:
            for img in images:
                if not img.get("alt", "").strip():
                    issues.append({"field": "image_alt", "severity": "warning",
                                   "msg": f"Zdjęcie ID {img['id']} bez ALT tekstu",
                                   "fix": f'ALT: "{name} — turbosprężarka | TurboShop"'})

        # Categories
        cats = p.get("categories", [])
        if not cats:
            issues.append({"field": "categories", "severity": "critical",
                           "msg": "Produkt bez kategorii — nie pojawi się w nawigacji ani sitemap",
                           "fix": "Przypisz do właściwej kategorii (marka, model lub typ turbo)"})

        # SKU
        sku = p.get("sku", "")
        if not sku:
            issues.append({"field": "sku", "severity": "warning",
                           "msg": "Brak SKU — klienci szukają po numerze OEM/części",
                           "fix": "Dodaj numer OEM lub własny SKU np. GT1749V-RAD-001"})

        # Attributes (OEM, compatibility)
        attrs = p.get("attributes", [])
        attr_names = [a.get("name", "").lower() for a in attrs]
        if not any(k in " ".join(attr_names) for k in ["oem", "zastosowanie", "kompatybil", "marka", "model"]):
            issues.append({"field": "attributes", "severity": "warning",
                           "msg": "Brak atrybutów kompatybilności — klient nie wie do jakiego auta pasuje",
                           "fix": "Dodaj atrybuty: Marka auta, Model, Rocznik, Numer OEM, Typ silnika"})

        # Meta via Yoast/RankMath (check custom fields if present)
        meta_title = self._get_meta_field(p, "_yoast_wpseo_title") or \
                     self._get_meta_field(p, "rank_math_title") or ""
        meta_desc = self._get_meta_field(p, "_yoast_wpseo_metadesc") or \
                    self._get_meta_field(p, "rank_math_description") or ""

        if not meta_title:
            issues.append({"field": "meta_title", "severity": "critical",
                           "msg": "Brak SEO title (Yoast/RankMath) — Google wyświetli surową nazwę produktu",
                           "fix": f'Ustaw: "{name} – Turbosprężarka | Sklep TurboShop | Darmowa dostawa"'})
        else:
            issues += self._check_title(pid, meta_title, name, "product_meta_title")

        if not meta_desc:
            issues.append({"field": "meta_description", "severity": "critical",
                           "msg": "Brak meta description — Google generuje losowy snippet",
                           "fix": "Dodaj meta description 130-160 znaków z CTA i słowem kluczowym"})
        else:
            issues += self._check_meta_desc(pid, meta_desc, name)

        # Log all
        for iss in issues:
            log_audit("product", pid, name, iss["field"], iss["severity"], iss["msg"],
                      suggested=iss.get("fix", ""))

        return issues

    # ────────────────────────────────────────────────────────────────────────
    # CATEGORY AUDIT
    # ────────────────────────────────────────────────────────────────────────

    def _audit_category(self, c):
        issues = []
        cid = c["id"]
        name = c.get("name", "")

        description = self._strip_html(c.get("description", ""))
        if not description:
            issues.append({"field": "description", "severity": "critical",
                           "msg": "Brak opisu kategorii — krytyczny dla SEO kategorii",
                           "fix": "Dodaj 200-400 słów: co to za kategoria, jakie produkty, zastosowanie, FAQ"})
        elif len(description.split()) < 100:
            issues.append({"field": "description", "severity": "warning",
                           "msg": f"Opis kategorii zbyt krótki ({len(description.split())} słów)",
                           "fix": "Rozbuduj do 200+ słów z frazami kluczowymi (marka/model + turbo)"})

        slug = c.get("slug", "")
        issues += self._check_slug(cid, slug, name, "category")

        if not c.get("image"):
            issues.append({"field": "image", "severity": "warning",
                           "msg": "Brak obrazu kategorii",
                           "fix": "Dodaj baner 1200x400px z nazwą kategorii i słowem kluczowym w ALT"})

        for iss in issues:
            log_audit("category", cid, name, iss["field"], iss["severity"], iss["msg"],
                      suggested=iss.get("fix", ""))

        return issues

    # ────────────────────────────────────────────────────────────────────────
    # HELPERS
    # ────────────────────────────────────────────────────────────────────────

    def _check_title(self, item_id, title, context_name, scope):
        issues = []
        if not title:
            issues.append({"field": "title", "severity": "critical",
                           "msg": "Brak tytułu",
                           "fix": f"Dodaj tytuł 40-60 znaków z główną frazą kluczową"})
        elif len(title) < TITLE_MIN:
            issues.append({"field": "title", "severity": "warning",
                           "msg": f"Tytuł za krótki ({len(title)} znaków, min {TITLE_MIN})",
                           "fix": f"Rozbuduj o: rok, numer OEM, zastosowanie — np. '{title} – Oryginał | TurboShop'"})
        elif len(title) > TITLE_MAX:
            issues.append({"field": "title", "severity": "warning",
                           "msg": f"Tytuł za długi ({len(title)} znaków, max {TITLE_MAX}) — Google skróci",
                           "fix": f"Skróć do 60 znaków zachowując główną frazę kluczową"})
        return issues

    def _check_meta_desc(self, item_id, desc, context_name):
        issues = []
        if len(desc) < DESC_MIN:
            issues.append({"field": "meta_description", "severity": "warning",
                           "msg": f"Meta description za krótka ({len(desc)} znaków, min {DESC_MIN})",
                           "fix": "Uzupełnij do 130-160 znaków. Dodaj CTA: 'Zamów online', 'Sprawdź teraz'"})
        elif len(desc) > DESC_MAX:
            issues.append({"field": "meta_description", "severity": "warning",
                           "msg": f"Meta description za długa ({len(desc)} znaków, max {DESC_MAX}) — Google obcina",
                           "fix": "Skróć do max 160 znaków"})
        return issues

    def _check_slug(self, item_id, slug, name, scope):
        issues = []
        if not slug:
            return [{"field": "slug", "severity": "critical",
                     "msg": "Brak slug URL", "fix": "Ustaw slug SEO-friendly: marka-model-turbo"}]
        if re.search(r'[A-Z]', slug):
            issues.append({"field": "slug", "severity": "warning",
                           "msg": "Slug zawiera wielkie litery — używaj wyłącznie małych",
                           "fix": f"Zmień na: {slug.lower()}"})
        if re.search(r'[^a-z0-9\-]', slug):
            issues.append({"field": "slug", "severity": "warning",
                           "msg": "Slug zawiera niedozwolone znaki (polskie litery, spacje, _)",
                           "fix": "Użyj tylko a-z, 0-9 i myślniki: turbosprężarka → turbosprężarka"})
        if len(slug) > 60:
            issues.append({"field": "slug", "severity": "info",
                           "msg": f"Slug długi ({len(slug)} znaków)",
                           "fix": "Skróć do max 60 znaków, zachowaj kluczowe słowo"})
        if re.match(r'^product-\d+$', slug) or re.match(r'^p\d+$', slug):
            issues.append({"field": "slug", "severity": "critical",
                           "msg": "Slug jest auto-generowanym ID — zero wartości SEO",
                           "fix": "Zmień na opisowy: turbosprężarka-bmw-320d-gt1749v"})
        return issues

    def _get_meta_field(self, product, key):
        meta_data = product.get("meta_data", [])
        for m in meta_data:
            if m.get("key") == key:
                return m.get("value", "")
        return ""

    def _strip_html(self, html):
        return re.sub(r'<[^>]+>', '', html or "").strip()

    def _score(self, issues):
        deductions = {"critical": 20, "warning": 8, "info": 2}
        score = 100
        for iss in issues:
            score -= deductions.get(iss.get("severity", "info"), 2)
        return max(0, score)

    def _build_summary(self, results):
        total_issues = 0
        critical = 0
        warnings = 0
        avg_score = 0
        products_below_50 = 0

        for p in results["products"]:
            for iss in p["issues"]:
                total_issues += 1
                if iss["severity"] == "critical":
                    critical += 1
                elif iss["severity"] == "warning":
                    warnings += 1
            avg_score += p["score"]
            if p["score"] < 50:
                products_below_50 += 1

        count = len(results["products"]) or 1
        return {
            "total_products": len(results["products"]),
            "total_categories": len(results["categories"]),
            "total_issues": total_issues,
            "critical_issues": critical,
            "warnings": warnings,
            "avg_product_score": round(avg_score / count),
            "products_below_50": products_below_50,
        }
