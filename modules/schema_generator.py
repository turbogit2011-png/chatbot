import json
import re

class SchemaGenerator:
    """Generates JSON-LD structured data for turbo e-commerce products."""

    def __init__(self, store_url="", store_name="TurboShop"):
        self.store_url = store_url.rstrip("/")
        self.store_name = store_name

    # ─────────────────────────────────────────────────────────────────────────
    # PRODUCT SCHEMA
    # ─────────────────────────────────────────────────────────────────────────

    def product_schema(self, product, keywords=None):
        name = product.get("name", "")
        desc = self._strip_html(product.get("short_description", "") or product.get("description", ""))
        price = product.get("price", "") or product.get("regular_price", "")
        sku = product.get("sku", "")
        permalink = product.get("permalink", f"{self.store_url}/product/{product.get('id')}")
        images = product.get("images", [])
        image_url = images[0]["src"] if images else ""
        rating_count = product.get("rating_count", 0)
        average_rating = product.get("average_rating", "0")

        schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": name,
            "description": desc[:500] if desc else name,
            "url": permalink,
            "sku": sku or str(product.get("id", "")),
            "brand": {
                "@type": "Brand",
                "name": self._extract_brand(name)
            },
            "manufacturer": {
                "@type": "Organization",
                "name": self._extract_turbo_brand(name, sku)
            },
            "category": self._extract_category(product),
            "offers": {
                "@type": "Offer",
                "url": permalink,
                "priceCurrency": "PLN",
                "price": str(price) if price else "0",
                "priceValidUntil": "2027-12-31",
                "availability": "https://schema.org/InStock" if product.get("stock_status") != "outofstock" else "https://schema.org/OutOfStock",
                "seller": {
                    "@type": "Organization",
                    "name": self.store_name,
                    "url": self.store_url
                },
                "shippingDetails": {
                    "@type": "OfferShippingDetails",
                    "shippingRate": {
                        "@type": "MonetaryAmount",
                        "value": "0",
                        "currency": "PLN"
                    },
                    "deliveryTime": {
                        "@type": "ShippingDeliveryTime",
                        "handlingTime": {
                            "@type": "QuantitativeValue",
                            "minValue": 0,
                            "maxValue": 1,
                            "unitCode": "DAY"
                        },
                        "transitTime": {
                            "@type": "QuantitativeValue",
                            "minValue": 1,
                            "maxValue": 3,
                            "unitCode": "DAY"
                        }
                    }
                },
                "hasMerchantReturnPolicy": {
                    "@type": "MerchantReturnPolicy",
                    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                    "merchantReturnDays": 30
                }
            },
        }

        if image_url:
            schema["image"] = [image_url]

        if rating_count and float(average_rating) > 0:
            schema["aggregateRating"] = {
                "@type": "AggregateRating",
                "ratingValue": average_rating,
                "reviewCount": str(rating_count),
                "bestRating": "5",
                "worstRating": "1"
            }

        # Product specifications from attributes
        spec_props = self._attributes_to_specs(product.get("attributes", []))
        if spec_props:
            schema["additionalProperty"] = spec_props

        if keywords:
            schema["keywords"] = ", ".join(keywords[:10])

        return schema

    # ─────────────────────────────────────────────────────────────────────────
    # FAQ SCHEMA
    # ─────────────────────────────────────────────────────────────────────────

    def faq_schema(self, faq_items):
        """faq_items: list of {"question": ..., "answer": ...}"""
        return {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": item["question"],
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": item["answer"]
                    }
                }
                for item in faq_items
            ]
        }

    def product_faq_items(self, product):
        name = product.get("name", "Turbosprężarka")
        brand = self._extract_brand(name)
        model = self._extract_model_hint(name)
        price = product.get("price", "")
        price_str = f"od {price} zł" if price else "—"

        return [
            {
                "question": f"Ile kosztuje turbosprężarka {brand} {model}?".strip(),
                "answer": f"Cena turbosprężarki {name} wynosi {price_str}. "
                          f"Oferujemy zarówno nowe jak i regenerowane turbosprężarki w konkurencyjnych cenach. "
                          f"Skontaktuj się z nami po indywidualną wycenę."
            },
            {
                "question": f"Czy turbosprężarka {name} jest nowa czy regenerowana?",
                "answer": "Oferujemy obie wersje. Turbosprężarki nowe to oryginalne części prosto od producenta. "
                          "Turbosprężarki regenerowane przechodzą pełny proces regeneracji — wymiana łożysk, "
                          "uszczelnień, równoważenie i testy na stoisku. Objęte są gwarancją."
            },
            {
                "question": f"Jak długo trwa dostawa turbosprężarki {name}?",
                "answer": "Turbosprężarki z magazynu wysyłamy w ciągu 24 godzin. "
                          "Czas dostawy to 1-3 dni robocze na terenie Polski i Europy. "
                          "Oferujemy ekspresową dostawę na następny dzień roboczy."
            },
            {
                "question": "Czy otrzymam gwarancję na turbosprężarkę?",
                "answer": "Tak. Na wszystkie turbosprężarki udzielamy gwarancji: "
                          "12 miesięcy na turbo regenerowane, 24 miesiące na turbo nowe. "
                          "W razie problemów zapewniamy pełen serwis gwarancyjny."
            },
            {
                "question": f"Do jakich aut pasuje turbosprężarka {name}?",
                "answer": f"Turbosprężarka {name} pasuje do {brand} {model}. "
                          f"Dokładną listę kompatybilnych pojazdów znajdziesz w opisie produktu. "
                          f"Możesz też skontaktować się z nami podając numer VIN — "
                          f"sprawdzimy kompatybilność przed zakupem."
            },
            {
                "question": "Czy mogę sprawdzić turbosprężarkę przed zakupem po numerze VIN?",
                "answer": "Tak! Wyślij nam numer VIN swojego auta — sprawdzimy pełną historię "
                          "pojazdu i potwierdzimy dokładną specyfikację turbosprężarki. "
                          "Usługa jest bezpłatna i odpowiadamy w ciągu 1 godziny w dni robocze."
            },
        ]

    # ─────────────────────────────────────────────────────────────────────────
    # HOWTO SCHEMA (installation guide)
    # ─────────────────────────────────────────────────────────────────────────

    def howto_schema(self, product_name):
        return {
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": f"Jak wymienić turbosprężarkę {product_name}",
            "description": f"Instrukcja krok po kroku wymiany turbosprężarki {product_name}.",
            "totalTime": "PT2H",
            "tool": [
                {"@type": "HowToTool", "name": "Klucze płaskie i nasadowe"},
                {"@type": "HowToTool", "name": "Klucz dynamometryczny"},
                {"@type": "HowToTool", "name": "Pompka olejowa"},
                {"@type": "HowToTool", "name": "Smary montażowe"}
            ],
            "step": [
                {"@type": "HowToStep", "name": "Przygotowanie", "text": "Odłącz akumulator. Zaczekaj aż silnik całkowicie ostygnie (min. 2h)."},
                {"@type": "HowToStep", "name": "Demontaż przewodów", "text": "Odłącz przewody olejowe (zasilający i powrotny), przewód chłodnicy, kolektory spalin i powietrzny."},
                {"@type": "HowToStep", "name": "Demontaż turbosprężarki", "text": "Odkręć śruby mocujące turbosprężarkę do kolektora. Usuń starą turbo."},
                {"@type": "HowToStep", "name": "Przygotowanie nowej turbo", "text": "Przed montażem wypełnij nową turbo czystym olejem silnikowym przez otwór zasilający. Obróć wałek kilkakrotnie ręką."},
                {"@type": "HowToStep", "name": "Montaż", "text": "Zamontuj nową turbosprężarkę. Dokręć śruby momentem z DTR. Podłącz wszystkie przewody."},
                {"@type": "HowToStep", "name": "Uruchomienie", "text": "Przed odpaleniem silnika — przekręć zapłon do pozycji ON (bez startu) 3-4 razy po 10 sekund, by naoliwić turbo. Następnie uruchom silnik i obserwuj przez 5 minut na jałowych obrotach."}
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # LOCAL BUSINESS SCHEMA
    # ─────────────────────────────────────────────────────────────────────────

    def local_business_schema(self, config=None):
        c = config or {}
        return {
            "@context": "https://schema.org",
            "@type": ["AutoPartsStore", "LocalBusiness"],
            "name": c.get("store_name", self.store_name),
            "description": "Sklep z turbosprężarkami — nowe i regenerowane turbo do samochodów osobowych i dostawczych. Wysyłka 24h, gwarancja, montaż.",
            "url": self.store_url,
            "telephone": c.get("phone", ""),
            "email": c.get("email", ""),
            "address": {
                "@type": "PostalAddress",
                "streetAddress": c.get("street", ""),
                "addressLocality": c.get("city", ""),
                "postalCode": c.get("postal", ""),
                "addressCountry": "PL"
            },
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": c.get("lat", ""),
                "longitude": c.get("lng", "")
            },
            "openingHoursSpecification": [
                {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "08:00", "closes": "17:00"}
            ],
            "priceRange": "$$",
            "currenciesAccepted": "PLN, EUR",
            "paymentAccepted": "Przelew, Karta, BLIK, PayPal",
            "areaServed": ["PL", "DE", "CZ", "SK", "HU", "RO", "LT", "LV", "EE"],
            "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Katalog turbosprężarek",
                "itemListElement": [
                    {"@type": "OfferCatalog", "name": "Turbosprężarki nowe"},
                    {"@type": "OfferCatalog", "name": "Turbosprężarki regenerowane"},
                    {"@type": "OfferCatalog", "name": "CHRA (wkłady turbo)"},
                    {"@type": "OfferCatalog", "name": "Akcesoria i części do turbo"}
                ]
            }
        }

    # ─────────────────────────────────────────────────────────────────────────
    # BREADCRUMB SCHEMA
    # ─────────────────────────────────────────────────────────────────────────

    def breadcrumb_schema(self, breadcrumbs):
        """breadcrumbs: [{"name": ..., "url": ...}, ...]"""
        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": i + 1,
                    "name": crumb["name"],
                    "item": crumb["url"]
                }
                for i, crumb in enumerate(breadcrumbs)
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # RENDER to <script> tag
    # ─────────────────────────────────────────────────────────────────────────

    def render_script_tag(self, schema_dict):
        return f'<script type="application/ld+json">\n{json.dumps(schema_dict, ensure_ascii=False, indent=2)}\n</script>'

    def render_all_product_schemas(self, product, keywords=None, store_config=None):
        """Return list of <script> tags for product page."""
        tags = []
        tags.append(self.render_script_tag(self.product_schema(product, keywords)))
        tags.append(self.render_script_tag(self.faq_schema(self.product_faq_items(product))))
        tags.append(self.render_script_tag(self.howto_schema(product.get("name", ""))))
        tags.append(self.render_script_tag(self.breadcrumb_schema([
            {"name": "Strona główna", "url": self.store_url},
            {"name": "Turbosprężarki", "url": f"{self.store_url}/turbosprężarki"},
            {"name": product.get("name", ""), "url": product.get("permalink", "")}
        ])))
        return "\n".join(tags)

    # ─────────────────────────────────────────────────────────────────────────
    # HELPERS
    # ─────────────────────────────────────────────────────────────────────────

    def _strip_html(self, html):
        return re.sub(r'<[^>]+>', '', html or "").strip()

    def _extract_brand(self, text):
        brands = ["BMW", "Audi", "Volkswagen", "Mercedes", "Ford", "Opel",
                  "Toyota", "Renault", "Peugeot", "Citroen", "Skoda",
                  "Seat", "Fiat", "Volvo", "Nissan", "Hyundai"]
        for b in brands:
            if b.lower() in text.lower():
                return b
        return "Auto"

    def _extract_turbo_brand(self, name, sku):
        brands = ["Garrett", "BorgWarner", "Holset", "IHI", "Mitsubishi", "KKK", "MHI"]
        combined = (name + " " + sku).lower()
        for b in brands:
            if b.lower() in combined:
                return b
        return "Garrett"

    def _extract_model_hint(self, name):
        patterns = [
            r'\b(\d\.\d)\s*(TDI|CDI|HDi|dCi|CDTI|TDCi|D-4D)\b',
            r'\b(Seria\s*\d|Klasa\s*[A-Z])\b',
            r'\b([A-Z]\d+|[A-Z]\d+\s*\w+)\b',
        ]
        for pat in patterns:
            m = re.search(pat, name, re.IGNORECASE)
            if m:
                return m.group(0)
        return ""

    def _extract_category(self, product):
        cats = product.get("categories", [])
        if cats:
            return cats[0].get("name", "Turbosprężarki")
        return "Turbosprężarki"

    def _attributes_to_specs(self, attributes):
        specs = []
        for attr in attributes:
            name = attr.get("name", "")
            options = attr.get("options", [attr.get("option", "")])
            value = options[0] if options else ""
            if name and value:
                specs.append({
                    "@type": "PropertyValue",
                    "name": name,
                    "value": value
                })
        return specs
