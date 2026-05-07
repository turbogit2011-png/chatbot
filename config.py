import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "turbo-seo-engine-2026")
    DATABASE = os.path.join(os.path.dirname(__file__), "turbo_seo.db")
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL = "claude-sonnet-4-6"
    WOO_TIMEOUT = 30
    MAX_PRODUCTS_PER_BATCH = 50
    APP_LANG = "pl"
