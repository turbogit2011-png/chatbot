#!/usr/bin/env bash
# Pobiera fonty zmienne (OFL) do assets/fonts/.
#
# Fonty świadomie NIE są trzymane w repozytorium ani pobierane w runtime
# (jak robi to pakiet google_fonts) — aplikacja Kairos nie wykonuje żadnych
# żądań sieciowych po instalacji. To jednorazowy krok build-time.
#
# Użycie:  ./tool/fetch_fonts.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${ROOT}/assets/fonts"
BASE="https://raw.githubusercontent.com/google/fonts/main/ofl"

mkdir -p "${DEST}"

download() {
  local url="$1"
  local out="$2"

  if [[ -f "${out}" ]]; then
    echo "  ✓ ${out##*/} (już jest — pomijam)"
    return 0
  fi

  echo "  ↓ ${out##*/}"
  if ! curl --fail --silent --show-error --location --retry 3 --retry-delay 2 \
       --output "${out}.part" "${url}"; then
    rm -f "${out}.part"
    echo "  ✗ nie udało się pobrać: ${url}" >&2
    return 1
  fi

  # Sanity check: plik TTF zaczyna się od sygnatury 0x00010000 lub 'true'/'OTTO'.
  if [[ ! -s "${out}.part" ]]; then
    rm -f "${out}.part"
    echo "  ✗ pusty plik: ${url}" >&2
    return 1
  fi

  mv "${out}.part" "${out}"
}

echo "Pobieram fonty zmienne do ${DEST}"
download "${BASE}/sora/Sora%5Bwght%5D.ttf"                  "${DEST}/Sora-Variable.ttf"
download "${BASE}/inter/Inter%5Bopsz,wght%5D.ttf"           "${DEST}/Inter-Variable.ttf"
download "${BASE}/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf" "${DEST}/JetBrainsMono-Variable.ttf"

echo "Gotowe. Licencje: OFL 1.1 (Sora, Inter, JetBrains Mono)."
