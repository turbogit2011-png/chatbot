# Sonara Studio

Aplikacja na Androida do generowania całych utworów z opisu tekstowego — z wokalem,
tekstem, aranżacją i masteringiem — plus serwer, który te utwory renderuje.

Klient jest w pełni natywny (Kotlin + Jetpack Compose + Media3), serwer w Pythonie
(FastAPI) i obsługuje kilka silników generujących. Wszystko, co wygenerujesz, zostaje
na Twoim urządzeniu i na Twoim serwerze.

```
sonara/
├── android/    aplikacja (Kotlin, Compose, Room, Media3, WorkManager)
├── server/     backend (FastAPI + silniki generujące)
└── docs/       architektura i konfiguracja silników
```

## Co aplikacja potrafi

| Funkcja | Opis |
|---|---|
| Tryb „Describe it” | jedno zdanie opisu → gotowy utwór |
| Tryb „Full control” | własny tekst z tagami `[Verse]`/`[Chorus]`, tytuł, style tagi, wykluczenia |
| Pisanie tekstów | „Write for me” generuje tekst z sekcjami w wybranym języku |
| Style | ~50 gatunków, 20 nastrojów, instrumenty, typy wokalu, produkcja, 10 gotowych presetów |
| Parametry | długość 30 s – 10 min, siła stylu, weirdness, wierność tekstowi, BPM, płeć wokalu, seed, 1–4 wersje na raz |
| Kolejka | generowanie w tle (WorkManager), postęp i powiadomienia, odporne na zamknięcie apki |
| Biblioteka | wyszukiwanie po tytule/stylu/tekście, ulubione, filtr „offline”, odtwarzanie bez sieci |
| Odtwarzacz | pełnoekranowy, waveform do przewijania, kolejka, repeat/shuffle, sterowanie z powiadomienia i ekranu blokady |
| Dalsza praca | Extend (przedłużenie od wybranej sekundy), Cover/remix w nowym stylu, podział na stemy |
| Eksport | zapis do `Music/Sonara` (widoczny w innych odtwarzaczach), udostępnianie MP3, tagi ID3 + okładka |

## Szybki start

### 1. Serwer

```bash
cd sonara/server
./run.sh          # tworzy venv, instaluje zależności i startuje na :8000
```

Wymagane jest `ffmpeg` w systemie. Bez GPU serwer używa silnika **sonara-offline**
(proceduralne studio na CPU) — działa od razu, utwór 3-minutowy renderuje w ~10 s.

Docker:

```bash
cd sonara/server && docker build -t sonara-server . && docker run -p 8000:8000 -v sonara-data:/data sonara-server
```

### 2. Aplikacja

Gotowe APK: `sonara/dist/sonara-studio-1.0.0-release.apk` (3,7 MB, podpisane).
Skopiuj na telefon i zainstaluj (trzeba zezwolić na instalację z nieznanych źródeł).

Budowa ze źródeł:

```bash
cd sonara/android
echo "sdk.dir=/ścieżka/do/Android/Sdk" > local.properties
./gradlew assembleRelease
```

### 3. Połączenie

Przy pierwszym uruchomieniu aplikacja pyta o adres serwera:

* emulator Androida → `http://10.0.2.2:8000`
* telefon w tej samej sieci Wi-Fi → `http://ADRES-IP-KOMPUTERA:8000`

Przycisk **Test connection** od razu pokazuje, czy silnik odpowiada.

## Silniki generujące

Serwer wybiera silnik automatycznie (`SONARA_ENGINE=auto`) albo wskazujesz go ręcznie.

| Silnik | Wokal | Sprzęt | Uwagi |
|---|---|---|---|
| `sonara-offline` | syntezator formantowy | dowolny CPU | zawsze dostępny, pełna aranżacja i mastering, stemy |
| `ace-step` | **śpiewany, modelowy** | GPU NVIDIA | ACE-Step, otwarte wagi (Apache-2.0) — najbliżej komercyjnej jakości |
| `musicgen` | brak (instrumental) | GPU/CPU | Meta MusicGen, bardzo dobre instrumentale |
| `remote` | zależnie od dostawcy | — | most do hostowanego API, do którego masz dostęp |

Szczegóły i konfiguracja: [`docs/ENGINES.md`](docs/ENGINES.md).

## Uczciwie o jakości

Aplikacja, protokół, kolejka, biblioteka, odtwarzacz i eksport są kompletne i przetestowane.
Jakość *samego dźwięku* zależy wyłącznie od wybranego silnika:

* **sonara-offline** daje poprawnie zaaranżowany i zmiksowany utwór (perkusja, bas, harmonia,
  lead, wokal formantowy), ale wokal brzmi syntetycznie — to nie jest model neuronowy.
* **ace-step** daje prawdziwy śpiew generowany modelem. To jest ścieżka do jakości zbliżonej
  do płatnych serwisów i wymaga karty GPU (praktycznie od ~8 GB VRAM).
* Modelu klasy Suno v6 nie da się odtworzyć w kodzie aplikacji — to wytrenowany model
  fundamentowy. Sonara daje za to całą resztę produktu i podłącza najlepszy dostępny
  silnik, jaki masz pod ręką.

## Testy

```bash
cd sonara/server && ./.venv/bin/python -m pytest -q      # 17 testów: API + arranżer + DSP
cd sonara/android && ./gradlew lintVitalRelease          # lint wydania
```

## Licencja i treści

Kod tego repozytorium jest Twój. Za użycie modeli i hostowanych API odpowiadają ich
własne licencje. Generator tekstów pisze oryginalne teksty i ma w instrukcji zakaz
kopiowania istniejących utworów — nie używaj aplikacji do podrabiania cudzych nagrań
ani głosów konkretnych osób.
