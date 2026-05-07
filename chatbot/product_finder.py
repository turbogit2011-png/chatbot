"""
Product Finder — wyszukuje turbosprężarki w WooCommerce i formatuje wyniki
dla chatbota.
"""
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def _get_woo():
    from modules.woo_client import WooClient
    return WooClient()


def search_products(query: str, limit: int = 5) -> list[dict]:
    """
    Szuka produktów w WooCommerce pasujących do zapytania.
    Zwraca uproszczone karty produktów dla chatbota.
    """
    try:
        woo = _get_woo()
        if not woo.is_connected():
            return _demo_products(query, limit)

        import requests
        r = requests.get(
            f"{woo.base_url}/wp-json/wc/v3/products",
            params={"search": query, "per_page": limit, "status": "publish"},
            auth=woo._woo_auth(), timeout=15
        )
        if r.status_code != 200:
            return _demo_products(query, limit)

        products = r.json()
        return [_format_product(p) for p in products]

    except Exception:
        return _demo_products(query, limit)


def get_product_card(product_id: int) -> dict | None:
    """Pobiera pełną kartę produktu po ID."""
    try:
        woo = _get_woo()
        if not woo.is_connected():
            return None
        p = woo.get_product(product_id)
        return _format_product(p)
    except Exception:
        return None


def search_by_brand_model(brand: str, model: str = "", engine: str = "") -> list[dict]:
    """Wyszukuje turbosprężarki dla konkretnej marki/modelu."""
    parts = ["turbosprężarka", brand]
    if model:
        parts.append(model)
    if engine:
        parts.append(engine)
    query = " ".join(parts)
    return search_products(query, limit=6)


def search_by_oem(oem_number: str) -> list[dict]:
    """Wyszukuje po numerze OEM / referencji turbo."""
    return search_products(oem_number.strip(), limit=5)


def _format_product(p: dict) -> dict:
    """Formatuje produkt WooCommerce do karty chatbota."""
    images = p.get("images", [])
    categories = [c.get("name", "") for c in p.get("categories", [])]
    attrs = {a.get("name", ""): a.get("options", [a.get("option", "")])[0]
             for a in p.get("attributes", [])}

    price = p.get("price", "") or p.get("regular_price", "")
    sale_price = p.get("sale_price", "")

    return {
        "id": p["id"],
        "name": p.get("name", ""),
        "sku": p.get("sku", ""),
        "price": price,
        "sale_price": sale_price,
        "price_display": f"{sale_price} zł" if sale_price else (f"{price} zł" if price else "Zapytaj o cenę"),
        "on_sale": bool(sale_price and sale_price != price),
        "permalink": p.get("permalink", ""),
        "image": images[0]["src"] if images else "",
        "short_description": _strip_html(p.get("short_description", "")),
        "categories": categories,
        "attributes": attrs,
        "in_stock": p.get("stock_status", "instock") == "instock",
        "rating": p.get("average_rating", "0"),
        "rating_count": p.get("rating_count", 0),
    }


def _strip_html(html: str) -> str:
    return re.sub(r'<[^>]+>', '', html or "").strip()[:200]


def _demo_products(query: str, limit: int) -> list[dict]:
    """Demo produkty gdy sklep nie jest połączony."""
    demos = [
        {
            "id": 101,
            "name": "Turbosprężarka BMW 320d / 330d — GT1749V",
            "sku": "GT1749V",
            "price": "1499",
            "sale_price": "1299",
            "price_display": "1299 zł",
            "on_sale": True,
            "permalink": "#",
            "image": "",
            "short_description": "Turbosprężarka BMW 320d E46/E90 — nowa i regenerowana. Gwarancja 24 mies.",
            "categories": ["BMW"],
            "attributes": {"Zastosowanie": "BMW 320d, 330d", "Numer OEM": "GT1749V"},
            "in_stock": True,
            "rating": "4.8",
            "rating_count": 47,
        },
        {
            "id": 102,
            "name": "Turbosprężarka Audi A4 2.0 TDI — BorgWarner KP39",
            "sku": "KP39-0045",
            "price": "1699",
            "sale_price": "",
            "price_display": "1699 zł",
            "on_sale": False,
            "permalink": "#",
            "image": "",
            "short_description": "Turbosprężarka Audi A4/A6 2.0 TDI — oryginalna BorgWarner. Dostawa 24h.",
            "categories": ["Audi"],
            "attributes": {"Zastosowanie": "Audi A4 B7, A6 C6 2.0 TDI", "Numer OEM": "03G253019A"},
            "in_stock": True,
            "rating": "4.9",
            "rating_count": 31,
        },
        {
            "id": 103,
            "name": "Turbosprężarka VW Passat 2.0 TDI — GT1749V BV39",
            "sku": "BV39-0059",
            "price": "1349",
            "sale_price": "",
            "price_display": "1349 zł",
            "on_sale": False,
            "permalink": "#",
            "image": "",
            "short_description": "Turbosprężarka VW Passat B6 2.0 TDI. Nowa lub regenerowana. Gwarancja 12 mies.",
            "categories": ["Volkswagen"],
            "attributes": {"Zastosowanie": "VW Passat B6, Golf V 2.0 TDI", "Numer OEM": "03G253019B"},
            "in_stock": True,
            "rating": "4.7",
            "rating_count": 22,
        },
    ]
    q = query.lower()
    results = [d for d in demos if any(w in d["name"].lower() for w in q.split())]
    return (results or demos)[:limit]
