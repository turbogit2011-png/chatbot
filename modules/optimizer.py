"""
Product + Category Optimizer
Applies SEO fixes directly to WooCommerce via REST API.
Logs every change to the database.
"""
import json
import re
from .woo_client import WooClient
from .keyword_mapper import KeywordMapper
from .schema_generator import SchemaGenerator
from .content_ai import ContentAI
from database import log_optimization, get_config

class ProductOptimizer:
    def __init__(self):
        self.woo = WooClient()
        self.kw = KeywordMapper()
        self.ai = ContentAI()
        self.store_url = get_config("woo_url", "")
        self.store_name = get_config("store_name", "TurboShop")
        self.seo_plugin = get_config("seo_plugin", "yoast")
        self.schema_gen = SchemaGenerator(self.store_url, self.store_name)

    # ─────────────────────────────────────────────────────────────────────────
    # SINGLE PRODUCT — full optimization
    # ─────────────────────────────────────────────────────────────────────────

    def optimize_product(self, product_id, use_ai=True):
        product = self.woo.get_product(product_id)
        name = product.get("name", "")
        changes = []

        # 1. SEO Title
        if use_ai:
            seo_title = self.ai.generate_seo_title(product)
        else:
            seo_title = self.kw.suggest_seo_title(name, product.get("sku", ""))

        if seo_title:
            changes.append(("seo_title", product.get("name", ""), seo_title))

        # 2. Meta Description
        if use_ai:
            meta_desc = self.ai.generate_meta_description(product)
        else:
            meta_desc = self.kw.suggest_meta_description(name, product.get("sku", ""), product.get("price", ""))

        if meta_desc:
            changes.append(("meta_description", "", meta_desc))

        # 3. Short description (if missing or too short)
        short = re.sub(r'<[^>]+>', '', product.get("short_description", "") or "")
        if len(short) < 80:
            if use_ai:
                new_short = self.ai.generate_short_description(product)
            else:
                new_short = f"{name} — turbosprężarka nowa i regenerowana. Gwarancja, dostawa 24h, montaż. Zamów!"
            if new_short:
                changes.append(("short_description", product.get("short_description", ""), new_short))

        # 4. Full description (if missing or too short)
        desc_plain = re.sub(r'<[^>]+>', '', product.get("description", "") or "")
        if len(desc_plain.split()) < 150:
            kws = self.kw.get_focus_keywords(product)
            if use_ai:
                new_desc = self.ai.generate_full_description(product, kws)
            else:
                new_desc = self._rule_based_description(product, kws)
            if new_desc:
                changes.append(("description", product.get("description", ""), new_desc))

        # 5. Slug
        current_slug = product.get("slug", "")
        if self._is_bad_slug(current_slug, name):
            new_slug = self.kw.suggest_slug(name, product.get("sku", ""))
            if new_slug and new_slug != current_slug:
                changes.append(("slug", current_slug, new_slug))

        # 6. Image ALTs
        image_fixes = self._fix_image_alts(product)
        changes.extend(image_fixes)

        # 7. Schema markup injection (store in meta field)
        kws = self.kw.get_focus_keywords(product)
        schema_tag = self.schema_gen.render_all_product_schemas(product, kws)
        changes.append(("schema_markup", "", schema_tag))

        # ── Apply all changes via WooCommerce API ────────────────────────────
        applied = self._apply_product_changes(product, changes)
        return {"product_id": product_id, "name": name, "changes": applied}

    # ─────────────────────────────────────────────────────────────────────────
    # BATCH ALL PRODUCTS
    # ─────────────────────────────────────────────────────────────────────────

    def optimize_all_products(self, use_ai=True, limit=None):
        products = self.woo.get_all_products()
        if limit:
            products = products[:limit]

        results = []
        for p in products:
            try:
                r = self.optimize_product(p["id"], use_ai=use_ai)
                results.append(r)
            except Exception as e:
                results.append({"product_id": p["id"], "name": p.get("name", ""), "error": str(e)})

        return results

    # ─────────────────────────────────────────────────────────────────────────
    # CATEGORY OPTIMIZATION
    # ─────────────────────────────────────────────────────────────────────────

    def optimize_category(self, cat_id, use_ai=True):
        cats = self.woo.get_categories()
        cat = next((c for c in cats if c["id"] == cat_id), None)
        if not cat:
            return {"error": "Category not found"}

        name = cat.get("name", "")
        changes = []

        # Description
        desc_plain = re.sub(r'<[^>]+>', '', cat.get("description", "") or "")
        if len(desc_plain.split()) < 100:
            if use_ai:
                new_desc = self.ai.generate_category_description(name)
            else:
                new_desc = self._rule_based_cat_description(name)
            changes.append(("description", cat.get("description", ""), new_desc))

        # Slug
        if self._is_bad_slug(cat.get("slug", ""), name):
            new_slug = self._category_slug(name)
            changes.append(("slug", cat.get("slug", ""), new_slug))

        # Apply
        update_data = {}
        applied = []
        for field, old_val, new_val in changes:
            update_data[field] = new_val
            log_optimization("category", cat_id, name, field, old_val, new_val,
                             method="ai" if use_ai else "rule")
            applied.append({"field": field, "old": old_val[:100] if old_val else "",
                            "new": new_val[:100] if new_val else ""})

        if update_data:
            self.woo.update_category(cat_id, update_data)

        return {"category_id": cat_id, "name": name, "changes": applied}

    def optimize_all_categories(self, use_ai=True):
        cats = self.woo.get_categories()
        results = []
        for c in cats:
            try:
                r = self.optimize_category(c["id"], use_ai=use_ai)
                results.append(r)
            except Exception as e:
                results.append({"category_id": c["id"], "name": c.get("name", ""), "error": str(e)})
        return results

    # ─────────────────────────────────────────────────────────────────────────
    # IMAGE ALT FIXER
    # ─────────────────────────────────────────────────────────────────────────

    def fix_all_image_alts(self):
        products = self.woo.get_all_products()
        fixed = 0
        for p in products:
            fixes = self._fix_image_alts(p)
            if fixes:
                self._apply_product_image_alts(p, fixes)
                fixed += len(fixes)
        return {"images_fixed": fixed}

    def _fix_image_alts(self, product):
        name = product.get("name", "")
        changes = []
        for img in product.get("images", []):
            if not img.get("alt", "").strip():
                good_alt = f"{name} — turbosprężarka | {self.store_name}"
                changes.append(("image_alt", "", good_alt))
        return changes

    def _apply_product_image_alts(self, product, fixes):
        updated_images = []
        fix_iter = iter(fixes)
        for img in product.get("images", []):
            if not img.get("alt", "").strip():
                try:
                    _, old, new_alt = next(fix_iter)
                    img["alt"] = new_alt
                    img["name"] = re.sub(r'\s+', '-', product.get("name", "").lower())
                except StopIteration:
                    pass
            updated_images.append(img)
        if updated_images:
            self.woo.update_product(product["id"], {"images": updated_images})

    # ─────────────────────────────────────────────────────────────────────────
    # SCHEMA INJECTOR (stores schema in _turbo_schema meta field)
    # ─────────────────────────────────────────────────────────────────────────

    def apply_schema_all_products(self):
        products = self.woo.get_all_products()
        results = []
        for p in products:
            kws = self.kw.get_focus_keywords(p)
            schema = self.schema_gen.product_schema(p, kws)
            schema_json = json.dumps(schema, ensure_ascii=False)
            meta_data = p.get("meta_data", [])
            existing_keys = [m["key"] for m in meta_data]

            new_meta = {"key": "_turbo_schema_json", "value": schema_json}
            if "_turbo_schema_json" in existing_keys:
                meta_data = [m if m["key"] != "_turbo_schema_json" else new_meta for m in meta_data]
            else:
                meta_data.append(new_meta)

            try:
                self.woo.update_product(p["id"], {"meta_data": meta_data})
                log_optimization("product", p["id"], p.get("name", ""),
                                 "schema_json", "", schema_json[:200], method="schema")
                results.append({"id": p["id"], "name": p.get("name", ""), "status": "ok"})
            except Exception as e:
                results.append({"id": p["id"], "name": p.get("name", ""), "error": str(e)})
        return results

    # ─────────────────────────────────────────────────────────────────────────
    # SEO META — Yoast / RankMath updater
    # ─────────────────────────────────────────────────────────────────────────

    def apply_seo_meta_all(self, use_ai=True):
        products = self.woo.get_all_products()
        results = []
        plugin = self.seo_plugin

        for p in products:
            name = p.get("name", "")
            try:
                if use_ai:
                    title = self.ai.generate_seo_title(p) or self.kw.suggest_seo_title(name, p.get("sku", ""))
                    desc = self.ai.generate_meta_description(p) or self.kw.suggest_meta_description(name, p.get("sku", ""), p.get("price", ""))
                else:
                    title = self.kw.suggest_seo_title(name, p.get("sku", ""))
                    desc = self.kw.suggest_meta_description(name, p.get("sku", ""), p.get("price", ""))

                if plugin == "yoast":
                    ok = self.woo.update_yoast_meta(p["id"], "product", title, desc)
                elif plugin == "rankmath":
                    ok = self.woo.update_rankmath_meta(p["id"], "product", title, desc)
                else:
                    ok = False

                if ok:
                    log_optimization("product", p["id"], name, "seo_title", "", title)
                    log_optimization("product", p["id"], name, "meta_description", "", desc)
                results.append({"id": p["id"], "name": name, "status": "ok" if ok else "plugin_not_detected"})
            except Exception as e:
                results.append({"id": p["id"], "name": name, "error": str(e)})

        return results

    # ─────────────────────────────────────────────────────────────────────────
    # INTERNAL HELPERS
    # ─────────────────────────────────────────────────────────────────────────

    def _apply_product_changes(self, product, changes):
        pid = product["id"]
        name = product.get("name", "")
        update_data = {}
        applied = []
        meta_data = product.get("meta_data", [])

        for field, old_val, new_val in changes:
            if field == "seo_title":
                meta_data = self._set_meta(meta_data, "_yoast_wpseo_title", new_val)
                meta_data = self._set_meta(meta_data, "rank_math_title", new_val)
            elif field == "meta_description":
                meta_data = self._set_meta(meta_data, "_yoast_wpseo_metadesc", new_val)
                meta_data = self._set_meta(meta_data, "rank_math_description", new_val)
            elif field == "schema_markup":
                meta_data = self._set_meta(meta_data, "_turbo_schema_json", new_val)
            elif field == "image_alt":
                pass  # handled separately
            else:
                update_data[field] = new_val

            log_optimization("product", pid, name, field, str(old_val)[:200], str(new_val)[:200],
                             method="ai" if self.ai.api_key else "rule")
            applied.append({
                "field": field,
                "old": str(old_val)[:120] if old_val else "",
                "new": str(new_val)[:120] if new_val else "",
            })

        update_data["meta_data"] = meta_data

        self.woo.update_product(pid, update_data)
        return applied

    def _set_meta(self, meta_data, key, value):
        for m in meta_data:
            if m["key"] == key:
                m["value"] = value
                return meta_data
        meta_data.append({"key": key, "value": value})
        return meta_data

    def _is_bad_slug(self, slug, name):
        if not slug:
            return True
        if re.match(r'^product-\d+$', slug):
            return True
        if re.search(r'[A-Z]', slug):
            return True
        return False

    def _category_slug(self, name):
        slug = name.lower()
        slug = re.sub(r'[ąćęłńóśźż]', lambda m: {
            'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
            'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'
        }.get(m.group(), m.group()), slug)
        slug = re.sub(r'[^a-z0-9\s]', '', slug)
        slug = re.sub(r'\s+', '-', slug.strip())
        return slug[:60]

    def _rule_based_description(self, product, keywords):
        name = product.get("name", "")
        sku = product.get("sku", "")
        kws_str = ", ".join(keywords[:3])
        return f"""<p><strong>{name}</strong> to wysokiej jakości turbosprężarka dostępna zarówno
w wersji nowej, jak i w pełni zregenerowanej. Idealna jako {kws_str}.
Numer katalogowy OEM: <strong>{sku}</strong>.</p>

<h2>Zastosowanie i kompatybilność</h2>
<p>Turbosprężarka {name} pasuje do pojazdów zgodnych z numerem OEM {sku}.
Przed zakupem skontaktuj się z nami podając numer VIN — potwierdzimy kompatybilność bezpłatnie w ciągu 1 godziny.</p>

<h2>Dane techniczne</h2>
<table>
<tr><th>Parametr</th><th>Wartość</th></tr>
<tr><td>Numer OEM</td><td>{sku}</td></tr>
<tr><td>Typ produktu</td><td>Turbosprężarka</td></tr>
<tr><td>Dostępność</td><td>Na stanie — wysyłka 24h</td></tr>
<tr><td>Gwarancja</td><td>12 mies. (regenerowana) / 24 mies. (nowa)</td></tr>
</table>

<h2>Co wchodzi w skład dostawy</h2>
<ul>
<li>Turbosprężarka {name}</li>
<li>Śruby montażowe</li>
<li>Uszczelki</li>
<li>Instrukcja montażu</li>
<li>Certyfikat jakości</li>
</ul>

<h2>Gwarancja i zwroty</h2>
<p>Każda turbosprężarka objęta jest gwarancją: 12 miesięcy na wersję regenerowaną,
24 miesiące na wersję nową. Zwroty przyjmujemy w ciągu 30 dni od zakupu bez podania przyczyny.
W przypadku wady — wymiana lub pełny zwrot środków.</p>

<h2>Montaż — wskazówki</h2>
<p>Przed montażem wypełnij otwór olejowy czystym olejem silnikowym i obróć wałek kilkakrotnie ręką.
Po montażu przekręć zapłon do ON (bez startu) 3-4 razy po 10 sekund, by naoliwić łożyska turbo.
Zalecamy wymianę oleju i filtra oleju przy każdej wymianie turbosprężarki.</p>

<h2>Najczęściej zadawane pytania</h2>
<p><strong>Czy turbosprężarka {name} jest na stanie?</strong><br>
Tak — produkty dostępne na stanie wysyłamy w ciągu 24 godzin. Sprawdź dostępność telefonicznie lub online.</p>
<p><strong>Czy mogę sprawdzić kompatybilność przed zakupem?</strong><br>
Tak — wyślij nam numer VIN, potwierdzimy dobór bezpłatnie w ciągu 1 godziny w dni robocze.</p>
<p><strong>Jaki olej stosować do turbosprężarki?</strong><br>
Zalecamy olej syntetyczny zgodny ze specyfikacją producenta pojazdu. Przy wymianie turbo zawsze wymieniaj olej i filtr oleju.</p>"""

    def _rule_based_cat_description(self, name):
        return f"""<p>W kategorii <strong>turbosprężarki {name}</strong> znajdziesz pełny asortyment turbosprężarek
nowych i regenerowanych do pojazdów marki {name}. Każdy produkt jest sprawdzony, objęty gwarancją
i dostępny z dostawą w 24 godziny.</p>

<h2>Dlaczego warto kupić turbosprężarkę {name} u nas?</h2>
<ul>
<li>✓ Oryginalne turbosprężarki i wysokiej jakości zamienniki</li>
<li>✓ Regeneracja na najnowocześniejszych stanowiskach testowych</li>
<li>✓ Gwarancja 12-24 miesiące na każdy produkt</li>
<li>✓ Dostawa w 24 godziny — Polska i Europa</li>
<li>✓ Bezpłatna weryfikacja kompatybilności po numerze VIN</li>
<li>✓ Zwroty w ciągu 30 dni</li>
</ul>

<h2>Jak dobrać turbosprężarkę {name}?</h2>
<p>Najłatwiejszym sposobem jest podanie nam numeru VIN swojego pojazdu lub numeru OEM turbosprężarki.
Nasz zespół specjalistów potwierdzi właściwy dobór i dostępność produktu w ciągu 1 godziny roboczej.</p>

<h2>Najczęściej szukane turbosprężarki {name}</h2>
<p>Sprawdź naszą ofertę — posiadamy turbosprężarki do najpopularniejszych modeli {name}.
Jeśli nie znajdziesz interesującego Cię produktu, skontaktuj się z nami — mamy dostęp do
pełnej bazy producentów Garrett, BorgWarner, IHI, Holset i innych.</p>

<p>Zamów online lub zadzwoń do naszych specjalistów — doradzimy i pomożemy wybrać właściwą
turbosprężarkę {name} w najlepszej cenie.</p>"""
