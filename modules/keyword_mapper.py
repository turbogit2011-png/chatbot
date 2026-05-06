import json
import re
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# ─────────────────────────────────────────────────────────────────────────────
# Static keyword lists loaded from data files
# ─────────────────────────────────────────────────────────────────────────────

def _load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}

# High-value transactional seed keywords (Polish market focus)
SEED_KEYWORDS = [
    # Główne frazy kupujące
    "turbosprężarka", "turbo", "turbina", "turbosprzęgarka",
    "regeneracja turbo", "regeneracja turbosprężarki",
    "naprawa turbo", "naprawa turbosprężarki",
    "wymiana turbo", "turbo do sprzedania",
    "nowa turbosprężarka", "regenerowana turbosprężarka",
    "turbo oryginalne", "turbo zamiennik",
    "sklep z turbo", "sklep turbosprężarki",
    "turbosprężarka cena", "turbo kupić",

    # Frazy techniczne (high intent)
    "CHRA turbo", "kartridż turbo", "wkład turbo",
    "aktuator turbo", "zawór VGT", "wkładka turbiny",
    "regeneracja CHRA", "naprawa wkładu turbo",

    # Numery turbin (top wyszukiwane)
    "GT1749V", "GT1752S", "GT2056V", "GT2260V", "GT2052ES",
    "GT1544V", "GT2056V", "GT1749MV", "KP39", "K03", "K04",
    "TF035", "CT16V", "CT20V", "BV39", "BV43",
    "53039880062", "721021", "724930", "753519", "767835",
    "777251", "787556", "808366", "816701", "821831",

    # Frazy Long-tail z markami
    "turbosprężarka BMW",
    "turbosprężarka Audi",
    "turbosprężarka Volkswagen",
    "turbosprężarka Mercedes",
    "turbosprężarka Ford",
    "turbosprężarka Opel",
    "turbosprężarka Toyota",
    "turbosprężarka Renault",
    "turbosprężarka Peugeot",
    "turbosprężarka Citroen",
    "turbosprężarka Skoda",

    # EU market (DE, CZ, SK, HU, RO)
    "Turbolader kaufen",
    "Turbosprężarka Europa",
    "turbo regenerovany",
    "turbina felújított",
]

# Intent-based keyword modifiers
BUY_MODIFIERS = ["kup", "kupić", "gdzie kupić", "sklep", "cena", "tani", "najtaniej",
                 "online", "zamów", "dostawa", "wysyłka", "24h"]
SPEC_MODIFIERS = ["parametry", "specyfikacja", "numer OEM", "numer katalogowy",
                  "oryginał", "zamiennik", "dane techniczne", "sprawdzić"]
SERVICE_MODIFIERS = ["regeneracja", "naprawa", "wymiana", "serwis", "regenerat",
                     "regenerowany", "odbudowa"]
PROBLEM_MODIFIERS = ["nie działa", "uszkodzona", "symptomy", "objawy", "diagnoza",
                     "dym", "świszczenie", "brak mocy"]


class KeywordMapper:
    def __init__(self):
        self.car_data = _load_json("car_models.json")

    # ─────────────────────────────────────────────────────────────────────────
    # Generate full keyword matrix for a product
    # ─────────────────────────────────────────────────────────────────────────

    def generate_product_keywords(self, product_name, sku="", attributes=None):
        """Return ranked list of keywords for a product."""
        keywords = []
        attrs = attributes or []
        attr_map = {a.get("name", "").lower(): a.get("options", [a.get("option", "")]) for a in attrs}

        # Extract brand/model from name
        brand = self._detect_brand(product_name)
        model = self._detect_model(product_name, brand)
        engine = self._detect_engine_code(product_name + " " + sku)
        turbo_code = self._detect_turbo_code(product_name + " " + sku)

        # Primary keyword
        primary = self._build_primary(product_name, brand, model, turbo_code)
        keywords.append({"keyword": primary, "type": "primary", "volume": "high", "intent": "transactional"})

        # SKU/OEM keywords (highest commercial intent)
        if sku:
            keywords.append({"keyword": sku, "type": "sku", "volume": "medium", "intent": "transactional"})
            keywords.append({"keyword": f"{sku} turbo", "type": "sku", "volume": "medium", "intent": "transactional"})
            keywords.append({"keyword": f"{sku} turbosprężarka", "type": "sku", "volume": "medium", "intent": "transactional"})

        if turbo_code and turbo_code != sku:
            keywords.append({"keyword": turbo_code, "type": "turbo_code", "volume": "medium", "intent": "transactional"})

        # Brand + model combinations
        if brand:
            keywords.append({"keyword": f"turbosprężarka {brand}", "type": "brand", "volume": "high", "intent": "commercial"})
            if model:
                keywords += self._brand_model_keywords(brand, model, engine)

        # Long-tail buying
        if brand and model:
            base = f"turbosprężarka {brand} {model}"
            keywords.append({"keyword": f"kup {base}", "type": "transactional", "volume": "low", "intent": "transactional"})
            keywords.append({"keyword": f"{base} cena", "type": "transactional", "volume": "medium", "intent": "commercial"})
            keywords.append({"keyword": f"{base} nowa", "type": "transactional", "volume": "low", "intent": "transactional"})
            keywords.append({"keyword": f"{base} regenerowana", "type": "transactional", "volume": "medium", "intent": "transactional"})
            keywords.append({"keyword": f"gdzie kupić {base}", "type": "transactional", "volume": "low", "intent": "transactional"})
            keywords.append({"keyword": f"{base} zamiennik", "type": "informational", "volume": "low", "intent": "commercial"})
            keywords.append({"keyword": f"wymiana turbo {brand} {model}", "type": "service", "volume": "low", "intent": "transactional"})

        # EU cross-market
        if brand and model:
            keywords.append({"keyword": f"Turbolader {brand} {model}", "type": "eu_de", "volume": "medium", "intent": "transactional"})

        return keywords

    # ─────────────────────────────────────────────────────────────────────────
    # Generate category keywords
    # ─────────────────────────────────────────────────────────────────────────

    def generate_category_keywords(self, category_name):
        keywords = []
        brand = self._detect_brand(category_name)

        base = f"turbosprężarki {category_name}" if brand else f"turbosprężarki {category_name}"
        keywords.append({"keyword": base, "type": "primary", "volume": "high", "intent": "commercial"})
        keywords.append({"keyword": f"turbo {category_name}", "type": "secondary", "volume": "high", "intent": "commercial"})
        keywords.append({"keyword": f"regeneracja turbo {category_name}", "type": "service", "volume": "medium", "intent": "transactional"})
        keywords.append({"keyword": f"turbosprężarka {category_name} sklep", "type": "commercial", "volume": "medium", "intent": "transactional"})
        keywords.append({"keyword": f"turbosprężarka {category_name} cena", "type": "commercial", "volume": "medium", "intent": "commercial"})
        keywords.append({"keyword": f"naprawa turbo {category_name}", "type": "service", "volume": "medium", "intent": "transactional"})

        if brand:
            models_data = self.car_data.get("brands", {}).get(brand, {}).get("models", {})
            for model_series, variants in list(models_data.items())[:5]:
                for variant in variants[:2]:
                    keywords.append({
                        "keyword": f"turbosprężarka {variant}",
                        "type": "long_tail",
                        "volume": "low",
                        "intent": "transactional"
                    })

        return keywords

    # ─────────────────────────────────────────────────────────────────────────
    # Assign best-fit keyword to a product
    # ─────────────────────────────────────────────────────────────────────────

    def get_primary_keyword(self, product):
        name = product.get("name", "")
        sku = product.get("sku", "")
        attrs = product.get("attributes", [])
        kws = self.generate_product_keywords(name, sku, attrs)
        if kws:
            return kws[0]["keyword"]
        return f"turbosprężarka {name}"

    def get_focus_keywords(self, product, n=5):
        name = product.get("name", "")
        sku = product.get("sku", "")
        attrs = product.get("attributes", [])
        kws = self.generate_product_keywords(name, sku, attrs)
        return [k["keyword"] for k in kws[:n]]

    # ─────────────────────────────────────────────────────────────────────────
    # Suggest SEO-optimised product title
    # ─────────────────────────────────────────────────────────────────────────

    def suggest_seo_title(self, product_name, sku=""):
        brand = self._detect_brand(product_name)
        model = self._detect_model(product_name, brand)
        turbo_code = self._detect_turbo_code(product_name + " " + sku) or sku

        parts = ["Turbosprężarka"]
        if brand:
            parts.append(brand)
        if model:
            parts.append(model)
        if turbo_code:
            parts.append(turbo_code)
        parts.append("| TurboShop")

        title = " ".join(parts)
        # Trim to 60 chars if needed
        if len(title) > 60:
            title = title[:57] + "..."
        return title

    def suggest_meta_description(self, product_name, sku="", price=""):
        brand = self._detect_brand(product_name)
        model = self._detect_model(product_name, brand)
        price_str = f" Cena od {price} zł." if price else ""
        brand_str = f"{brand} {model}" if brand and model else product_name
        desc = (f"Turbosprężarka {brand_str} — nowa i regenerowana.{price_str} "
                f"Oryginalne części, gwarancja, darmowa dostawa. "
                f"Zamów online lub zadzwoń ☎ 24/7.")
        if len(desc) > 160:
            desc = desc[:157] + "..."
        return desc

    def suggest_slug(self, product_name, sku=""):
        brand = self._detect_brand(product_name)
        model = self._detect_model(product_name, brand)
        turbo_code = self._detect_turbo_code(product_name + " " + sku) or ""

        parts = ["turbosprężarka"]
        if brand:
            parts.append(brand.lower())
        if model:
            model_slug = self._transliterate(model.lower())
            model_slug = re.sub(r'[^a-z0-9\s]', '', model_slug)
            model_slug = re.sub(r'\s+', '-', model_slug.strip())
            parts.append(model_slug)
        if turbo_code:
            parts.append(turbo_code.lower().replace(" ", "-"))

        slug = "-".join(self._transliterate(p) for p in parts)
        slug = re.sub(r'[^a-z0-9\-]', '', slug)
        slug = re.sub(r'-+', '-', slug)
        return slug[:60]

    @staticmethod
    def _transliterate(text):
        table = str.maketrans('ąćęłńóśźżÄÖÜäöü', 'acelnoszzAOUaou')
        return text.translate(table)

    # ─────────────────────────────────────────────────────────────────────────
    # Detection helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _detect_brand(self, text):
        brands_order = ["BMW", "Audi", "Volkswagen", "Mercedes", "Ford", "Opel",
                        "Toyota", "Renault", "Peugeot", "Citroen", "Skoda",
                        "Seat", "Fiat", "Volvo", "Nissan", "Hyundai", "Kia",
                        "Mazda", "Honda", "Subaru", "Mitsubishi", "Isuzu"]
        text_lower = text.lower()
        for b in brands_order:
            if b.lower() in text_lower:
                return b
        return ""

    def _detect_model(self, text, brand=""):
        if not brand:
            return ""
        models = self.car_data.get("brands", {}).get(brand, {}).get("models", {})
        text_lower = text.lower()
        for series, variants in models.items():
            if series.lower() in text_lower:
                return series
            for v in variants:
                if v.lower() in text_lower:
                    return v
        return ""

    def _detect_engine_code(self, text):
        codes = ["N47", "M47", "M57", "B47", "B57", "N57",
                 "BKD", "BMN", "BJB", "BLS", "CBAB", "CRCA",
                 "ASZ", "AVF", "AXR", "BXE", "CLJA",
                 "OM611", "OM612", "OM646", "OM651", "OM642",
                 "HHJA", "HHJB", "UFBA", "G6DA", "QXBA",
                 "Z17DTH", "Z19DTH", "A20DTH",
                 "1CD-FTV", "2AD-FHV", "1KD-FTV",
                 "K9K", "M9R", "R9M", "DV6", "DW10"]
        for code in codes:
            if code in text:
                return code
        return ""

    def _detect_turbo_code(self, text):
        pattern = r'\b(GT\d{4}[A-Z]*|KP\d+|K0[34]|BV\d+|TF\d+|CT\d+[A-Z]*|\d{9})\b'
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(0).upper()
        return ""

    def _brand_model_keywords(self, brand, model, engine=""):
        kws = []
        base = f"turbosprężarka {brand} {model}"
        kws.append({"keyword": base, "type": "brand_model", "volume": "medium", "intent": "transactional"})
        if engine:
            kws.append({"keyword": f"{base} {engine}", "type": "long_tail", "volume": "low", "intent": "transactional"})
            kws.append({"keyword": f"turbo {engine} {brand}", "type": "long_tail", "volume": "low", "intent": "informational"})
        return kws

    def _build_primary(self, name, brand, model, turbo_code):
        if brand and model:
            return f"turbosprężarka {brand} {model}"
        if turbo_code:
            return f"turbosprężarka {turbo_code}"
        return f"turbosprężarka {name.split()[0] if name else ''}"
