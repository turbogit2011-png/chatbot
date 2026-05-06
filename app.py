"""
TurboSEO Engine — WooCommerce SEO + CRO Optimizer
Audytuje i automatycznie naprawia sklep WooCommerce z turbosprężarkami.
"""
import json
import os
import sys
import re
import sqlite3
from flask import (Flask, render_template, request, redirect, url_for,
                   flash, jsonify, send_file, Response)

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from config import Config
from database import init_db, get_config, set_config, get_stats, get_db

app = Flask(__name__)
app.secret_key = Config.SECRET_KEY

# Initialise DB on first run
init_db()

# ─────────────────────────────────────────────────────────────────────────────
# CONTEXT PROCESSOR
# ─────────────────────────────────────────────────────────────────────────────

@app.context_processor
def inject_globals():
    from modules.woo_client import WooClient
    try:
        connected = WooClient().is_connected()
    except Exception:
        connected = False
    return {
        "store_connected": connected,
        "ai_enabled": bool(get_config("anthropic_key") or Config.ANTHROPIC_API_KEY),
    }

# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html", stats=get_stats())

# ─────────────────────────────────────────────────────────────────────────────
# CONNECT / SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/connect", methods=["GET", "POST"])
def connect():
    if request.method == "POST":
        fields = ["woo_url", "woo_ck", "woo_cs", "wp_user", "wp_pass",
                  "store_name", "seo_plugin", "anthropic_key"]
        for f in fields:
            val = request.form.get(f, "").strip()
            if val:
                set_config(f, val)
                if f == "anthropic_key":
                    os.environ["ANTHROPIC_API_KEY"] = val
                    Config.ANTHROPIC_API_KEY = val

        # Test connection
        from modules.woo_client import WooClient
        if WooClient().is_connected():
            flash("Sklep połączony pomyślnie!", "success")
        else:
            flash("Dane zapisane — nie udało się połączyć z WooCommerce API. Sprawdź URL i klucze.", "error")
        return redirect(url_for("index"))

    cfg = {k: get_config(k, "") for k in
           ["woo_url", "woo_ck", "woo_cs", "wp_user", "wp_pass",
            "store_name", "seo_plugin", "anthropic_key"]}
    return render_template("connect.html", config=cfg)

@app.route("/settings", methods=["GET", "POST"])
def settings():
    if request.method == "POST":
        for f in ["store_name", "seo_plugin", "anthropic_key", "opt_mode"]:
            val = request.form.get(f, "").strip()
            if val:
                set_config(f, val)
                if f == "anthropic_key":
                    os.environ["ANTHROPIC_API_KEY"] = val
                    Config.ANTHROPIC_API_KEY = val
        flash("Ustawienia zapisane.", "success")
        return redirect(url_for("settings"))

    cfg = {k: get_config(k, "") for k in
           ["woo_url", "store_name", "seo_plugin", "anthropic_key", "opt_mode"]}
    return render_template("settings.html", config=cfg)

@app.route("/settings/clear-db", methods=["POST"])
def clear_db():
    conn = get_db()
    conn.executescript("DELETE FROM audit_results; DELETE FROM optimizations; DELETE FROM content_cache;")
    conn.commit()
    conn.close()
    flash("Baza wyczyszczona.", "success")
    return redirect(url_for("settings"))

# ─────────────────────────────────────────────────────────────────────────────
# AUDIT
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/audit")
def audit():
    from modules.woo_client import WooClient
    from modules.seo_analyzer import SEOAnalyzer
    from modules.keyword_mapper import KeywordMapper

    woo = WooClient()
    if not woo.is_connected():
        flash("Połącz sklep WooCommerce, aby uruchomić audyt.", "error")
        return redirect(url_for("connect"))

    try:
        analyzer = SEOAnalyzer(woo)
        report = analyzer.run_full_audit()
    except Exception as e:
        flash(f"Błąd audytu: {e}", "error")
        report = {"products": [], "categories": [], "summary": {}}

    return render_template("audit.html", report=report)

# ─────────────────────────────────────────────────────────────────────────────
# PRODUCTS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/products")
def products():
    from modules.woo_client import WooClient
    from modules.seo_analyzer import SEOAnalyzer

    woo = WooClient()
    if not woo.is_connected():
        flash("Połącz sklep.", "error")
        return redirect(url_for("connect"))

    analyzer = SEOAnalyzer(woo)
    report = analyzer.run_full_audit()
    return render_template("products.html", products=report["products"])

@app.route("/products/<int:product_id>/optimize")
def product_optimize(product_id):
    from modules.woo_client import WooClient
    from modules.seo_analyzer import SEOAnalyzer
    from modules.keyword_mapper import KeywordMapper
    from modules.schema_generator import SchemaGenerator
    from modules.content_ai import ContentAI

    woo = WooClient()
    product = woo.get_product(product_id)
    analyzer = SEOAnalyzer(woo)
    issues = analyzer._audit_product(product)
    score = analyzer._score(issues)

    kw = KeywordMapper()
    all_keywords = kw.generate_product_keywords(
        product.get("name", ""), product.get("sku", ""), product.get("attributes", []))
    focus_kws = [k["keyword"] for k in all_keywords[:6]]

    ai = ContentAI()
    store_url = get_config("woo_url", "")
    store_name = get_config("store_name", "TurboShop")
    schema_gen = SchemaGenerator(store_url, store_name)

    generated = {
        "seo_title": kw.suggest_seo_title(product.get("name", ""), product.get("sku", "")),
        "meta_desc": kw.suggest_meta_description(product.get("name", ""), product.get("sku", ""), product.get("price", "")),
        "slug": kw.suggest_slug(product.get("name", ""), product.get("sku", "")),
        "short_desc": ai._fallback_short_desc(product),
        "keywords": focus_kws,
    }

    faq_items = schema_gen.product_faq_items(product)
    sample_schema = json.dumps(schema_gen.product_schema(product, focus_kws), ensure_ascii=False, indent=2)

    return render_template("product_detail.html",
                           product=product, issues=issues, score=score,
                           generated=generated, all_keywords=all_keywords,
                           faq_items=faq_items, schema_preview=sample_schema)

@app.route("/products/<int:product_id>/apply", methods=["POST"])
def product_apply(product_id):
    from modules.optimizer import ProductOptimizer
    use_ai = get_config("opt_mode", "ai") == "ai" and bool(
        get_config("anthropic_key") or Config.ANTHROPIC_API_KEY)
    opt = ProductOptimizer()
    try:
        result = opt.optimize_product(product_id, use_ai=use_ai)
        flash(f"Zastosowano {len(result['changes'])} zmian dla: {result['name']}", "success")
    except Exception as e:
        flash(f"Błąd: {e}", "error")
    return redirect(url_for("product_optimize", product_id=product_id))

# ─────────────────────────────────────────────────────────────────────────────
# CATEGORIES
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/categories")
def categories():
    from modules.woo_client import WooClient
    from modules.seo_analyzer import SEOAnalyzer
    from modules.keyword_mapper import KeywordMapper

    woo = WooClient()
    if not woo.is_connected():
        flash("Połącz sklep.", "error")
        return redirect(url_for("connect"))

    cats_raw = woo.get_categories()
    analyzer = SEOAnalyzer(woo)
    kw = KeywordMapper()

    cats = []
    for c in cats_raw:
        issues = analyzer._audit_category(c)
        kws = kw.generate_category_keywords(c.get("name", ""))
        cats.append({
            "id": c["id"],
            "name": c.get("name", ""),
            "slug": c.get("slug", ""),
            "count": c.get("count", 0),
            "issues": issues,
            "score": analyzer._score(issues),
            "keywords": [k["keyword"] for k in kws[:6]],
        })

    return render_template("categories.html", categories=cats)

@app.route("/categories/<int:cat_id>/optimize", methods=["GET", "POST"])
def category_optimize(cat_id):
    from modules.optimizer import ProductOptimizer
    use_ai = get_config("opt_mode", "ai") == "ai" and bool(
        get_config("anthropic_key") or Config.ANTHROPIC_API_KEY)
    opt = ProductOptimizer()
    try:
        result = opt.optimize_category(cat_id, use_ai=use_ai)
        flash(f"Zastosowano {len(result.get('changes', []))} zmian dla kategorii: {result.get('name')}", "success")
    except Exception as e:
        flash(f"Błąd: {e}", "error")
    return redirect(url_for("categories"))

# ─────────────────────────────────────────────────────────────────────────────
# SCHEMA
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/schema")
def schema():
    from modules.schema_generator import SchemaGenerator
    store_url = get_config("woo_url", "https://twojsklep.pl")
    store_name = get_config("store_name", "TurboShop")
    sg = SchemaGenerator(store_url, store_name)

    sample = sg.product_schema({
        "id": 1, "name": "Turbosprężarka BMW 320d GT1749V", "sku": "GT1749V",
        "price": "1499", "description": "Turbosprężarka BMW 320d...",
        "images": [{"src": f"{store_url}/img/turbo.jpg"}],
        "categories": [{"name": "BMW"}], "attributes": [],
        "rating_count": 12, "average_rating": "4.8",
        "permalink": f"{store_url}/produkt/turbosprężarka-bmw-320d",
        "stock_status": "instock"
    }, ["turbosprężarka BMW 320d", "GT1749V"])
    sample_json = json.dumps(sample, ensure_ascii=False, indent=2)

    return render_template("schema.html", sample_schema=sample_json)

@app.route("/schema/local-business", methods=["POST"])
def schema_local_business():
    for field in ["phone", "email", "street", "postal", "city"]:
        val = request.form.get(field, "").strip()
        if val:
            set_config(f"lb_{field}", val)
    flash("Dane LocalBusiness Schema zapisane.", "success")
    return redirect(url_for("schema"))

# ─────────────────────────────────────────────────────────────────────────────
# KEYWORDS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/keywords", methods=["GET"])
def keywords():
    return render_template("keywords.html", keywords=None, query="")

@app.route("/keywords/generate", methods=["POST"])
def keywords_generate():
    from modules.keyword_mapper import KeywordMapper
    name = request.form.get("product_name", "").strip()
    sku = request.form.get("sku", "").strip()
    kw = KeywordMapper()
    kws = kw.generate_product_keywords(name, sku)
    return render_template("keywords.html", keywords=kws, query=name)

# ─────────────────────────────────────────────────────────────────────────────
# CONTENT AI
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/content")
def content():
    return render_template("content.html")

# ─────────────────────────────────────────────────────────────────────────────
# IMAGES
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/images")
def images():
    from modules.woo_client import WooClient
    woo = WooClient()
    if not woo.is_connected():
        return render_template("images.html", products_missing_alt=[])

    products = woo.get_all_products()
    missing = []
    for p in products:
        count = sum(1 for img in p.get("images", []) if not img.get("alt", "").strip())
        if count:
            missing.append({
                "id": p["id"],
                "name": p.get("name", ""),
                "missing_count": count,
                "suggested_alt": f"{p.get('name','')} — turbosprężarka | {get_config('store_name','TurboShop')}"
            })

    return render_template("images.html", products_missing_alt=missing)

# ─────────────────────────────────────────────────────────────────────────────
# LLMs.TXT
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/llms-txt")
def llms_txt_page():
    from modules.content_ai import ContentAI
    store_url = get_config("woo_url", "https://twojsklep.pl")
    store_name = get_config("store_name", "TurboShop")

    from modules.woo_client import WooClient
    try:
        cats = [c.get("name", "") for c in WooClient().get_categories()[:15]]
    except Exception:
        cats = ["Turbosprężarki nowe", "Turbosprężarki regenerowane",
                "CHRA — wkłady turbo", "Turbosprężarki BMW", "Turbosprężarki Audi",
                "Turbosprężarki Volkswagen", "Turbosprężarki Mercedes"]

    ai = ContentAI()
    content = ai.generate_llms_txt(store_url, store_name, cats)
    return render_template("llms.html", llms_content=content)

@app.route("/llms-txt/download")
def llms_txt_download():
    from modules.content_ai import ContentAI
    store_url = get_config("woo_url", "https://twojsklep.pl")
    store_name = get_config("store_name", "TurboShop")
    ai = ContentAI()
    content = ai.generate_llms_txt(store_url, store_name)
    return Response(content, mimetype="text/plain",
                    headers={"Content-Disposition": "attachment;filename=llms.txt"})

# ─────────────────────────────────────────────────────────────────────────────
# HISTORY
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/history")
def history():
    conn = get_db()
    opts = conn.execute(
        "SELECT * FROM optimizations ORDER BY applied_at DESC LIMIT 500"
    ).fetchall()
    total = conn.execute("SELECT COUNT(*) FROM optimizations").fetchone()[0]
    conn.close()
    return render_template("history.html", optimizations=opts, total=total)

# ─────────────────────────────────────────────────────────────────────────────
# JSON API ENDPOINTS (called from frontend JS)
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/optimize/products/all", methods=["POST"])
def api_optimize_products_all():
    from modules.optimizer import ProductOptimizer
    use_ai_param = request.args.get("use_ai", "true").lower() == "true"
    ai_key = get_config("anthropic_key") or Config.ANTHROPIC_API_KEY
    use_ai = use_ai_param and bool(ai_key)
    opt = ProductOptimizer()
    try:
        results = opt.optimize_all_products(use_ai=use_ai)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/optimize/categories/all", methods=["POST"])
def api_optimize_categories_all():
    from modules.optimizer import ProductOptimizer
    ai_key = get_config("anthropic_key") or Config.ANTHROPIC_API_KEY
    use_ai = bool(ai_key)
    opt = ProductOptimizer()
    try:
        results = opt.optimize_all_categories(use_ai=use_ai)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/schema/all", methods=["POST"])
def api_schema_all():
    from modules.optimizer import ProductOptimizer
    opt = ProductOptimizer()
    try:
        results = opt.apply_schema_all_products()
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/images/fix-alts", methods=["POST"])
def api_fix_alts():
    from modules.optimizer import ProductOptimizer
    opt = ProductOptimizer()
    try:
        result = opt.fix_all_image_alts()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/seo-meta/all", methods=["POST"])
def api_seo_meta_all():
    from modules.optimizer import ProductOptimizer
    ai_key = get_config("anthropic_key") or Config.ANTHROPIC_API_KEY
    use_ai = bool(ai_key)
    opt = ProductOptimizer()
    try:
        results = opt.apply_seo_meta_all(use_ai=use_ai)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/content/generate", methods=["POST"])
def api_content_generate():
    from modules.content_ai import ContentAI
    from modules.keyword_mapper import KeywordMapper

    data = request.get_json() or {}
    name = data.get("name", "")
    sku = data.get("sku", "")
    price = data.get("price", "")
    gen_type = data.get("type", "full")

    # Update Claude key if set
    anthropic_key = get_config("anthropic_key", "")
    if anthropic_key:
        Config.ANTHROPIC_API_KEY = anthropic_key
        os.environ["ANTHROPIC_API_KEY"] = anthropic_key

    ai = ContentAI()
    kw = KeywordMapper()

    product = {"name": name, "sku": sku, "price": price,
                "short_description": "", "description": "",
                "images": [], "attributes": [], "categories": []}

    content = ""
    if gen_type == "full":
        keywords = [k["keyword"] for k in kw.generate_product_keywords(name, sku)[:5]]
        content = ai.generate_full_description(product, keywords)
    elif gen_type == "short":
        content = ai.generate_short_description(product)
    elif gen_type == "title":
        content = ai.generate_seo_title(product) or kw.suggest_seo_title(name, sku)
    elif gen_type == "meta":
        content = ai.generate_meta_description(product) or kw.suggest_meta_description(name, sku, price)
    elif gen_type == "faq":
        from modules.schema_generator import SchemaGenerator
        sg = SchemaGenerator(get_config("woo_url", ""), get_config("store_name", "TurboShop"))
        faqs = sg.product_faq_items(product)
        content = "\n\n".join([f"P: {f['question']}\nO: {f['answer']}" for f in faqs])
    elif gen_type == "category":
        content = ai.generate_category_description(name)

    if not content:
        content = f"[Brak klucza API Claude — ustaw klucz w Ustawieniach]\n\nSzablonowy wynik:\n{kw.suggest_seo_title(name, sku)}"

    return jsonify({"content": content})

@app.route("/api/audit/quick", methods=["GET"])
def api_audit_quick():
    from modules.woo_client import WooClient
    from modules.seo_analyzer import SEOAnalyzer
    woo = WooClient()
    if not woo.is_connected():
        return jsonify({"error": "Store not connected"}), 400
    analyzer = SEOAnalyzer(woo)
    report = analyzer.run_full_audit()
    return jsonify(report["summary"])

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/health")
def health():
    from modules.woo_client import WooClient
    woo = WooClient()
    return jsonify({
        "status": "ok",
        "store_connected": woo.is_connected(),
        "ai_enabled": bool(get_config("anthropic_key") or Config.ANTHROPIC_API_KEY),
        "store_url": get_config("woo_url", ""),
        "store_name": get_config("store_name", "TurboShop"),
    })

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"\n{'='*55}")
    print(f"  TurboSEO Engine — WooCommerce Optimizer")
    print(f"  http://localhost:{port}")
    print(f"{'='*55}\n")
    app.run(host=host, port=port, debug=debug)
