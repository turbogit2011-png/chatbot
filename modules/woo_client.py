import requests
import base64
import json
from database import get_config

class WooClient:
    def __init__(self):
        self.base_url = get_config("woo_url", "").rstrip("/")
        self.ck = get_config("woo_ck", "")
        self.cs = get_config("woo_cs", "")
        self.wp_user = get_config("wp_user", "")
        self.wp_pass = get_config("wp_pass", "")
        self.timeout = 30

    def _woo_auth(self):
        return (self.ck, self.cs)

    def _wp_headers(self):
        token = base64.b64encode(f"{self.wp_user}:{self.wp_pass}".encode()).decode()
        return {"Authorization": f"Basic {token}", "Content-Type": "application/json"}

    def is_connected(self):
        if not self.base_url or not self.ck:
            return False
        try:
            r = requests.get(f"{self.base_url}/wp-json/wc/v3/system_status",
                             auth=self._woo_auth(), timeout=10)
            return r.status_code == 200
        except Exception:
            return False

    # ── PRODUCTS ──────────────────────────────────────────────────────────────

    def get_products(self, per_page=100, page=1, status="any"):
        r = requests.get(
            f"{self.base_url}/wp-json/wc/v3/products",
            params={"per_page": per_page, "page": page, "status": status},
            auth=self._woo_auth(), timeout=self.timeout
        )
        r.raise_for_status()
        return r.json(), int(r.headers.get("X-WP-Total", 0))

    def get_all_products(self):
        all_products = []
        page = 1
        while True:
            products, total = self.get_products(per_page=100, page=page)
            all_products.extend(products)
            if len(all_products) >= total or not products:
                break
            page += 1
        return all_products

    def get_product(self, product_id):
        r = requests.get(f"{self.base_url}/wp-json/wc/v3/products/{product_id}",
                         auth=self._woo_auth(), timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def update_product(self, product_id, data):
        r = requests.put(
            f"{self.base_url}/wp-json/wc/v3/products/{product_id}",
            json=data, auth=self._woo_auth(), timeout=self.timeout
        )
        r.raise_for_status()
        return r.json()

    def batch_update_products(self, updates):
        """WooCommerce batch endpoint — max 100 per call."""
        results = []
        for i in range(0, len(updates), 100):
            chunk = updates[i:i+100]
            r = requests.post(
                f"{self.base_url}/wp-json/wc/v3/products/batch",
                json={"update": chunk},
                auth=self._woo_auth(), timeout=60
            )
            r.raise_for_status()
            results.extend(r.json().get("update", []))
        return results

    # ── CATEGORIES ────────────────────────────────────────────────────────────

    def get_categories(self, per_page=100):
        r = requests.get(
            f"{self.base_url}/wp-json/wc/v3/products/categories",
            params={"per_page": per_page, "hide_empty": False},
            auth=self._woo_auth(), timeout=self.timeout
        )
        r.raise_for_status()
        return r.json()

    def update_category(self, cat_id, data):
        r = requests.put(
            f"{self.base_url}/wp-json/wc/v3/products/categories/{cat_id}",
            json=data, auth=self._woo_auth(), timeout=self.timeout
        )
        r.raise_for_status()
        return r.json()

    # ── IMAGES ────────────────────────────────────────────────────────────────

    def get_media(self, per_page=100, page=1):
        r = requests.get(
            f"{self.base_url}/wp-json/wp/v2/media",
            params={"per_page": per_page, "page": page, "media_type": "image"},
            headers=self._wp_headers(), timeout=self.timeout
        )
        r.raise_for_status()
        total = int(r.headers.get("X-WP-Total", 0))
        return r.json(), total

    def update_media(self, media_id, data):
        r = requests.post(
            f"{self.base_url}/wp-json/wp/v2/media/{media_id}",
            json=data, headers=self._wp_headers(), timeout=self.timeout
        )
        r.raise_for_status()
        return r.json()

    # ── PAGES ─────────────────────────────────────────────────────────────────

    def get_pages(self, per_page=50):
        r = requests.get(
            f"{self.base_url}/wp-json/wp/v2/pages",
            params={"per_page": per_page},
            headers=self._wp_headers(), timeout=self.timeout
        )
        r.raise_for_status()
        return r.json()

    def update_page(self, page_id, data):
        r = requests.post(
            f"{self.base_url}/wp-json/wp/v2/pages/{page_id}",
            json=data, headers=self._wp_headers(), timeout=self.timeout
        )
        r.raise_for_status()
        return r.json()

    # ── YOAST / RANKMATH META (via WP REST custom fields) ─────────────────────

    def update_yoast_meta(self, post_id, post_type, title, description):
        """Update Yoast SEO title + meta description via WP REST."""
        endpoint_map = {"product": "product", "page": "pages", "post": "posts"}
        ep = endpoint_map.get(post_type, post_type)
        data = {
            "meta": {
                "_yoast_wpseo_title": title,
                "_yoast_wpseo_metadesc": description,
            }
        }
        r = requests.post(
            f"{self.base_url}/wp-json/wp/v2/{ep}/{post_id}",
            json=data, headers=self._wp_headers(), timeout=self.timeout
        )
        return r.status_code in (200, 201)

    def update_rankmath_meta(self, post_id, post_type, title, description):
        """Update RankMath title + description."""
        endpoint_map = {"product": "product", "page": "pages", "post": "posts"}
        ep = endpoint_map.get(post_type, post_type)
        data = {
            "meta": {
                "rank_math_title": title,
                "rank_math_description": description,
            }
        }
        r = requests.post(
            f"{self.base_url}/wp-json/wp/v2/{ep}/{post_id}",
            json=data, headers=self._wp_headers(), timeout=self.timeout
        )
        return r.status_code in (200, 201)

    # ── SYSTEM STATUS ─────────────────────────────────────────────────────────

    def get_system_status(self):
        r = requests.get(f"{self.base_url}/wp-json/wc/v3/system_status",
                         auth=self._woo_auth(), timeout=15)
        if r.status_code == 200:
            return r.json()
        return {}

    def detect_seo_plugin(self):
        """Detect which SEO plugin is active."""
        try:
            status = self.get_system_status()
            plugins = status.get("active_plugins", [])
            for p in plugins:
                if "yoast" in p.get("plugin", "").lower():
                    return "yoast"
                if "rank-math" in p.get("plugin", "").lower():
                    return "rankmath"
        except Exception:
            pass
        return "unknown"
