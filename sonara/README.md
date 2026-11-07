# Sonara Studio

Aplikacja na Androida do generowania całych utworów z opisu tekstowego — z wokalem,
tekstem, aranżacją i masteringiem.

**Działa sama, bez serwera i bez internetu.** Silnik renderujący jest wbudowany w APK:
komponuje, gra, miksuje i masteruje utwór na procesorze telefonu, a plik zapisuje
lokalnie. Opcjonalnie można ją przełączyć na serwer z silnikiem GPU, gdy chcesz
prawdziwy śpiewany wokal.

Klient jest w pełni natywny (Kotlin + Jetpack Compose + Media3), serwer w Pythonie
(FastAPI). Nic nie opuszcza Twojego urządzenia.

```
sonara/
├── android/    aplikacja (Kotlin, Compose, Room, Media3, WorkManager)
├── server/     backend (FastAPI + silniki generujące)
└── docs/       architektura i konfiguracja silników
```

## Co aplikacja potrafi

| Funkcja | Opis |
|---|---|
| Praca offline | silnik w aplikacji — zero konfiguracji, zero serwera, zero internetu |
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

Zainstaluj `sonara/dist/sonara-studio-release.apk` na telefonie (trzeba zezwolić na
instalację z nieznanych źródeł), otwórz, wpisz opis utworu i naciśnij **Create song**.
To wszystko — żadnej konfiguracji, konta ani serwera.

Budowa ze źródeł:

```bash
cd sonara/android
echo "sdk.dir=/ścieżka/do/Android/Sdk" > local.properties
./gradlew assembleRelease
```

### Opcjonalnie: serwer z lepszym wokalem

Silnik w telefonie syntezuje wokal formantowo — słychać, że to nie człowiek. Po
prawdziwy śpiew podłącz serwer z modelem na GPU:

```bash
cd sonara/server
./run.sh          # tworzy venv, instaluje zależności i startuje na :8000
```

Wymagane jest `ffmpeg`. Potem w aplikacji: **Settings → Where songs are rendered →
Sonara server** i adres, pod którym telefon naprawdę widzi komputer:

* ten sam Wi-Fi → `http://ADRES-IP-KOMPUTERA:8000`
* emulator → `http://10.0.2.2:8000`
* dane komórkowe → serwer musi być wystawiony tunelem (Cloudflare Tunnel, Tailscale);
  adres `10.0.2.2` ani LAN-owy nie zadziała z sieci operatora

Docker:

```bash
cd sonara/server && docker build -t sonara-server . && docker run -p 8000:8000 -v sonara-data:/data sonara-server
```

## Silniki generujące

Serwer wybiera silnik automatycznie (`SONARA_ENGINE=auto`) albo wskazujesz go ręcznie.

| Silnik | Wokal | Sprzęt | Uwagi |
|---|---|---|---|
| **w aplikacji** | syntezator formantowy | sam telefon | domyślny, offline, bez konfiguracji; utwór 3-min renderuje się w kilkanaście sekund |
| `sonara-offline` | syntezator formantowy | dowolny CPU | zawsze dostępny, pełna aranżacja i mastering, stemy |
| `ace-step` | **śpiewany, modelowy** | GPU NVIDIA | ACE-Step, otwarte wagi (Apache-2.0) — najbliżej komercyjnej jakości |
| `musicgen` | brak (instrumental) | GPU/CPU | Meta MusicGen, bardzo dobre instrumentale |
| `remote` | zależnie od dostawcy | — | most do hostowanego API, do którego masz dostęp |

Szczegóły i konfiguracja: [`docs/ENGINES.md`](docs/ENGINES.md).

## Uczciwie o jakości

Aplikacja, kolejka, biblioteka, odtwarzacz, extend/cover/stemy i eksport są kompletne
i przetestowane. Jakość *samego dźwięku* zależy od wybranego silnika:

* **silnik w aplikacji** daje poprawnie zaaranżowany i zmiksowany utwór — perkusja, bas,
  harmonia, lead i wokal prowadzący tekst, z kompresją, EQ i limiterem. Wokal jest
  syntezowany formantowo, więc brzmi syntetycznie. Do instrumentali, szkiców i demówek
  nadaje się od ręki.
* **ace-step** (serwer, GPU) daje prawdziwy śpiew generowany modelem. To jest ścieżka do
  jakości zbliżonej do płatnych serwisów; wymaga karty NVIDIA (praktycznie od ~8 GB VRAM).
* Modelu klasy Suno v6 nie da się zmieścić w kodzie aplikacji — to wytrenowany model
  fundamentowy ważący gigabajty. Sonara daje całą resztę produktu i podłącza najlepszy
  silnik, jaki masz pod ręką.

## Testy

```bash
cd sonara/android && ./gradlew testDebugUnitTest   # 18 testów silnika w telefonie (JVM)
cd sonara/android && ./gradlew lintVitalRelease    # lint wydania
cd sonara/server  && ./.venv/bin/python -m pytest -q   # 17 testów: API + aranżer + DSP
```

Testy Androida renderują prawdziwe utwory na JVM i mierzą wynik: tempo zgodne z
zamówionym, brak przesterowania, sensowny poziom w kilku gatunkach, zgodność
renderu blokowego z jednoprzebiegowym oraz 5-minutowy utwór w budżecie 384 MB pamięci.

## Licencja i treści

Kod tego repozytorium jest Twój. Za użycie modeli i hostowanych API odpowiadają ich
własne licencje. Generator tekstów pisze oryginalne teksty i ma w instrukcji zakaz
kopiowania istniejących utworów — nie używaj aplikacji do podrabiania cudzych nagrań
ani głosów konkretnych osób.
