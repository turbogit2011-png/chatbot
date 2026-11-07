#!/usr/bin/env bash
# Starts the Sonara server with sane defaults.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
  ./.venv/bin/pip install --upgrade pip
  ./.venv/bin/pip install -r requirements.txt
fi

export SONARA_HOST="${SONARA_HOST:-0.0.0.0}"
export SONARA_PORT="${SONARA_PORT:-8000}"
export SONARA_DATA_DIR="${SONARA_DATA_DIR:-./sonara-data}"

echo "Sonara server on http://${SONARA_HOST}:${SONARA_PORT}  (engine: ${SONARA_ENGINE:-auto})"
exec ./.venv/bin/python -m uvicorn sonara_server.main:app \
  --host "$SONARA_HOST" --port "$SONARA_PORT" --workers 1
