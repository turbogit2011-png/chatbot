# Silniki generujące

Serwer Sonary ma jeden interfejs (`sonara_server/engines/base.py`) i kilka implementacji.
`SONARA_ENGINE=auto` wybiera pierwszy dostępny w kolejności: `remote` → `ace-step` →
`musicgen` → `sonara-offline`. Aplikacja może nadpisać wybór nagłówkiem `X-Sonara-Engine`.

Sprawdzenie, co widzi serwer:

```bash
curl -s localhost:8000/v1/engines | python3 -m json.tool
```

---

## sonara-offline (domyślny, CPU)

Proceduralne studio: dobiera tonację, tempo i progresję akordów na podstawie stylu,
planuje sekcje (intro / zwrotka / pre / refren / bridge / outro), gra perkusję, bas,
harmonię i lead, śpiewa tekst syntezatorem formantowym, a na końcu miksuje i masteruje
(kompresja, EQ, reverb, stereo, limiter z zapasem ~1 dB na true peak).

* bez modeli, bez sieci, bez GPU; utwór 3-minutowy ≈ 10 s na 4 rdzeniach
* obsługuje extend, cover i stemy (zapisuje osobne szyny: drums / bass / harmony / vocals)
* wokal jest syntetyczny — do dema i instrumentali świetny, do „prawdziwego śpiewu” użyj ACE-Step

Strojenie: `SONARA_MP3_BITRATE` (domyślnie 192k), `SONARA_COVERS=0` wyłącza okładki.

---

## ace-step (otwarte wagi, GPU) — najbliżej komercyjnej jakości

[ACE-Step](https://github.com/ace-step/ACE-Step) generuje kompletne utwory ze śpiewanym
wokalem z promptu stylu + tekstu. Wagi są otwarte (Apache-2.0).

```bash
cd sonara/server
./.venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cu121
./.venv/bin/pip install -r requirements-ace.txt

export SONARA_ENGINE=ace-step
export SONARA_ACE_STEPS=60          # więcej kroków = wolniej, ale czyściej
export SONARA_ACE_GUIDANCE=15.0
export SONARA_ACE_BF16=1
# export SONARA_ACE_CHECKPOINT=/ścieżka/do/wag   # domyślnie pobiera się samo
./run.sh
```

Wymagania: karta NVIDIA (praktycznie od ~8 GB VRAM; przy `SONARA_ACE_CPU_OFFLOAD=1`
zmieści się na mniejszej, kosztem czasu). Pierwsze uruchomienie pobiera wagi.

Integracja jest celowo odporna na zmiany API: Sonara sprawdza sygnaturę zainstalowanego
pipeline'u i przekazuje tylko te argumenty, które on faktycznie przyjmuje
(`sonara_server/engines/ace_step.py`). Jeśli upstream zmieni nazwy parametrów, silnik
nadal wystartuje.

---

## musicgen (instrumentale)

```bash
./.venv/bin/pip install torch transformers accelerate
export SONARA_ENGINE=musicgen
export SONARA_MUSICGEN_MODEL=facebook/musicgen-stereo-medium   # lub -large
```

MusicGen nie śpiewa. Żądania z tekstem są renderowane jako instrumental. Dłuższe utwory
powstają z nachodzących okien (28 s z 6 s kontekstu), więc aranż się nie restartuje.

---

## remote (hostowane API)

Most do usługi, do której masz dostęp. Sonara nie zawiera żadnych cudzych kluczy.

```bash
export SONARA_ENGINE=remote
export SONARA_REMOTE_PROFILE=openapi_async     # albo: replicate
export SONARA_REMOTE_BASE_URL=https://api.przyklad.com
export SONARA_REMOTE_API_KEY=sk-...
export SONARA_REMOTE_MODEL=nazwa-modelu
# opcjonalnie, gdy ścieżki są nietypowe:
export SONARA_REMOTE_SUBMIT_PATH=/v1/generate
export SONARA_REMOTE_STATUS_PATH=/v1/tasks/{id}
```

Profil `openapi_async` obsługuje najczęstszy schemat: POST → `task_id` → polling →
lista URL-i z audio. Odpowiedź jest przeszukiwana rekurencyjnie, więc działa z wieloma
różnymi kształtami JSON-a.

---

## Pisanie tekstów

Domyślnie działa wbudowany generator offline (strukturalny, bez sieci). Dla wyraźnie
lepszych tekstów podłącz dowolne API zgodne z OpenAI — również lokalne:

```bash
# Ollama na tym samym komputerze
export SONARA_LYRICS_BASE_URL=http://localhost:11434/v1
export SONARA_LYRICS_MODEL=llama3.1:8b

# albo dowolny hostowany endpoint
export SONARA_LYRICS_BASE_URL=https://api.przyklad.com/v1
export SONARA_LYRICS_API_KEY=sk-...
export SONARA_LYRICS_MODEL=nazwa-modelu
```

## Stemy

Jeśli w systemie jest `demucs`, używany jest Demucs. Jeśli nie — a utwór pochodzi z
silnika offline — Sonara oddaje jego własne szyny (idealny rozdział). W ostateczności
robi rozdział mid/side.

```bash
./.venv/bin/pip install demucs
```
