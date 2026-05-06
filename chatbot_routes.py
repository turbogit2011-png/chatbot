"""
TurboChat Flask Routes
Dołącz do głównego app.py: app.register_blueprint(chatbot_bp)
"""
import json
from flask import Blueprint, request, jsonify, render_template, session

from chatbot.conversation import (
    init_chat_tables, new_session, session_exists,
    save_message, get_all_sessions, get_session_messages, chat_stats
)
from chatbot.engine import TurboChatEngine

chatbot_bp = Blueprint("chatbot", __name__, url_prefix="/chatbot")

# Init tables on import
init_chat_tables()
_engine = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = TurboChatEngine()
    return _engine


# ─────────────────────────────────────────────────────────────────────────────
# API: NEW SESSION
# ─────────────────────────────────────────────────────────────────────────────

@chatbot_bp.route("/api/session", methods=["POST"])
def api_new_session():
    sid = new_session()
    return jsonify({"session_id": sid})


# ─────────────────────────────────────────────────────────────────────────────
# API: SEND MESSAGE
# ─────────────────────────────────────────────────────────────────────────────

@chatbot_bp.route("/api/message", methods=["POST"])
def api_message():
    data = request.get_json() or {}
    session_id = data.get("session_id", "")
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "Pusta wiadomość"}), 400

    # Create session if not exists
    if not session_id or not session_exists(session_id):
        session_id = new_session()

    engine = get_engine()
    result = engine.chat(session_id, user_message)

    return jsonify(result)


# ─────────────────────────────────────────────────────────────────────────────
# API: QUICK GREETING
# ─────────────────────────────────────────────────────────────────────────────

@chatbot_bp.route("/api/greet", methods=["POST"])
def api_greet():
    from database import get_config
    store_name = get_config("store_name", "TurboShop")
    sid = new_session()
    greeting = (
        f"Cześć! Jestem **Turbo AI** — Twój doradca {store_name}. 👋\n\n"
        "Pomogę Ci znaleźć właściwą turbosprężarkę do Twojego auta.\n\n"
        "Napisz:\n"
        "• **markę i model auta** (np. *BMW 320d*, *Audi A4 2.0 TDI*)\n"
        "• **numer VIN** — sam sprawdzę co potrzebujesz\n"
        "• **numer OEM turbo** jeśli go już masz\n\n"
        "Lub opisz **objawy awarii** — zdiagnozuję problem 🔧"
    )
    save_message(sid, "assistant", greeting)
    return jsonify({"session_id": sid, "message": greeting, "products": []})


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN PANEL
# ─────────────────────────────────────────────────────────────────────────────

@chatbot_bp.route("/admin")
def admin():
    sessions = get_all_sessions(limit=50)
    stats = chat_stats()
    return render_template("chatbot/admin.html", sessions=sessions, stats=stats)


@chatbot_bp.route("/admin/session/<session_id>")
def admin_session(session_id):
    messages = get_session_messages(session_id)
    return render_template("chatbot/session.html",
                           session_id=session_id, messages=messages)


# ─────────────────────────────────────────────────────────────────────────────
# EMBED INSTRUCTIONS
# ─────────────────────────────────────────────────────────────────────────────

@chatbot_bp.route("/embed")
def embed():
    from database import get_config
    store_url = get_config("woo_url", "https://twojsklep.pl")
    engine_url = request.host_url.rstrip("/")
    return render_template("chatbot/embed.html",
                           store_url=store_url, engine_url=engine_url)


# ─────────────────────────────────────────────────────────────────────────────
# WIDGET JS (served from /chatbot/widget.js — inline, no static file needed)
# ─────────────────────────────────────────────────────────────────────────────

@chatbot_bp.route("/widget.js")
def widget_js():
    from flask import Response, current_app
    from database import get_config
    store_name = get_config("store_name", "TurboShop")
    engine_url = request.host_url.rstrip("/")
    accent = get_config("chat_accent", "#ea580c")
    with current_app.open_resource("static/js/turbo-chat.js") as f:
        js = f.read().decode("utf-8")
    js = js.replace("__ENGINE_URL__", engine_url)
    js = js.replace("__STORE_NAME__", store_name)
    js = js.replace("__ACCENT_COLOR__", accent)
    return Response(js, mimetype="application/javascript")
