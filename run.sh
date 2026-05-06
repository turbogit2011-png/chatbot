#!/bin/bash
# TurboSEO Engine — Quick Start

cd "$(dirname "$0")"

# Install dependencies if needed
pip3 install -r requirements.txt --quiet --break-system-packages 2>/dev/null || \
pip3 install -r requirements.txt --quiet 2>/dev/null

export FLASK_APP=app.py
export FLASK_DEBUG=${FLASK_DEBUG:-false}
export PORT=${PORT:-5000}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   TurboSEO Engine — WooCommerce Optimizer   ║"
echo "║   http://localhost:${PORT}                       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  1. Otwórz http://localhost:${PORT}"
echo "  2. Kliknij 'Połącz sklep' i podaj dane WooCommerce API"
echo "  3. Kliknij 'Uruchom audyt' — system wykryje problemy"
echo "  4. Kliknij 'Optymalizuj wszystko' — AI naprawi sklep"
echo ""

python3 app.py
