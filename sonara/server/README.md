# Sonara server

Backend renderujący utwory dla aplikacji Sonara Studio.

```bash
./run.sh                       # venv + zależności + start na :8000
# albo ręcznie:
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
./.venv/bin/python -m uvicorn sonara_server.main:app --host 0.0.0.0 --port 8000
```

Wymaga `ffmpeg` w `PATH`. Dokumentacja API: `http://localhost:8000/docs`.

## Zmienne środowiskowe

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `SONARA_HOST` / `SONARA_PORT` | `0.0.0.0` / `8000` | adres nasłuchu |
| `SONARA_DATA_DIR` | `./sonara-data` | audio, okładki, uploady, rejestr klipów |
| `SONARA_ENGINE` | `auto` | `auto`, `sonara-offline`, `ace-step`, `musicgen`, `remote` |
| `SONARA_API_KEY` | — | gdy ustawione, wymaga `Authorization: Bearer …` (wpisz ten sam klucz w aplikacji) |
| `SONARA_MAX_CONCURRENCY` | `1` | ile utworów renderuje się równolegle |
| `SONARA_PUBLIC_BASE_URL` | — | ustaw, gdy serwer stoi za reverse proxy |
| `SONARA_MP3_BITRATE` | `192k` | bitrate eksportu |
| `SONARA_COVERS` | `1` | generowanie okładek |
| `SONARA_KEEP_JOBS_HOURS` | `72` | po tym czasie zakończone zadania znikają z pamięci |

Zmienne silników (`SONARA_ACE_*`, `SONARA_MUSICGEN_*`, `SONARA_REMOTE_*`,
`SONARA_LYRICS_*`, `SONARA_DEMUCS_MODEL`) opisuje [`../docs/ENGINES.md`](../docs/ENGINES.md).

## Endpointy

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/v1/health` | status, silnik, urządzenie, głębokość kolejki |
| GET | `/v1/models`, `/v1/engines` | dostępne modele i silniki |
| POST | `/v1/generate` | nowy utwór → zadanie |
| POST | `/v1/extend` | przedłużenie klipu od wskazanej sekundy |
| POST | `/v1/cover` | ten sam utwór w nowym stylu |
| POST | `/v1/stems` | podział na stemy |
| GET/DELETE | `/v1/jobs/{id}` | status / anulowanie zadania |
| POST | `/v1/lyrics` | napisanie tekstu |
| GET | `/v1/audio/{id}.mp3`, `/v1/cover/{id}.jpg` | pliki |
| POST | `/v1/upload` | audio referencyjne |

## Testy

```bash
./.venv/bin/pip install pytest
./.venv/bin/python -m pytest -q          # 17 testów
./.venv/bin/python -m pytest -q -m "not slow"   # bez renderowania audio
```

## Dodanie własnego silnika

1. Utwórz `sonara_server/engines/moj_silnik.py` z klasą dziedziczącą po `base.Engine`
   (wymagane: `available()`, `models()`, `generate()`).
2. Zarejestruj ją w `sonara_server/engines/__init__.py` w funkcji `_bootstrap()`.

Reszta — kolejka, pliki, okładki, tagi ID3, API i aplikacja — działa bez zmian.
