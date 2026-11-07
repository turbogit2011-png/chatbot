# Silniki generujące

## Silnik w aplikacji (domyślny, bez serwera)

Cały renderer działa w APK, na procesorze telefonu — bez sieci, bez konta, bez
konfiguracji. Kod: `android/app/src/main/java/com/sonara/studio/engine/`.

| Plik | Rola |
|---|---|
| `Dsp.kt` | oscylatory, obwiednie, biquady, perkusja, comb/allpass reverb, kompresor, limiter |
| `Music.kt` | skale, progresje, tabela ~50 gatunków i 19 nastrojów, plan sekcji, parser tekstu, wokal formantowy |
| `Composer.kt` | aranżer i wykonawca: zamienia utwór na listę zdarzeń i renderuje go blokami |
| `MixChains.kt` | miks i mastering (EQ, kompresja, reverb, ducking pod wokal, stereo, limiter) |
| `AacEncoder.kt` | strumieniowy enkoder AAC/.m4a przez MediaCodec, z awaryjnym zapisem do .wav |
| `LocalEngine.kt` | spina render, enkoder i okładki; obsługuje też extend, cover i stemy |
| `LyricsWriter.kt` | pisanie tekstów offline, z tagami sekcji |

**Dlaczego renderuje blokami.** Pięć szyn po 3 minuty audio w 44,1 kHz to ponad 150 MB
floatów — za dużo dla telefonu. Composer buduje listę zdarzeń, przechodzi oś czasu po
kilka taktów, a stan filtrów i ogony nut przenosi między blokami. Pamięć jest stała
niezależnie od długości utworu; test `a five minute render stays within a small memory
budget` renderuje 5 minut w budżecie 384 MB.

**Poziomy bez normalizacji.** Strumieniowy renderer nigdy nie widzi całego utworu, więc
nie może go znormalizować. Zamiast tego poziom każdej szyny jest wyliczany z aranżacji:
każde zdarzenie dokłada swój peak do kubełków czasowych, a wysoki percentyl tych
kubełków jest stabilnym oszacowaniem. Jeden empiryczny współczynnik (`COHERENCE`)
przelicza to na realny poziom. Dzięki temu wszystkie gatunki wychodzą równo głośne
(zmierzone: peak 0,86–0,89, RMS 0,22–0,27).

**Extend / cover / stemy bez dekodera.** Każdy utwór zapisuje swój `SongSpec`, więc
oryginał można odtworzyć bit w bit. Extend renderuje oryginał i kontynuację do plików
WAV, po czym skleja je strumieniowo z crossfadem; stemy to ponowny render z zapisem
każdej szyny osobno.

**Ograniczenie:** wokal jest syntezowany formantowo — prowadzi melodię i sylaby tekstu,
ale nie brzmi jak człowiek. Po prawdziwy śpiew użyj ACE-Step na serwerze.

---

## Silniki serwerowe

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
