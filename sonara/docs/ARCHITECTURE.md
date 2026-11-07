# Architektura

## Dwie drogi renderu

Aplikacja ma dwa tryby, przełączane w Ustawieniach, za tym samym interfejsem
`MusicRepository`:

```
tryb „On this phone” (domyślny)        tryb „Sonara server”
  CreateViewModel                        CreateViewModel
        │                                      │
  MusicRepository.submitGenerate ──────────────┤
        │                                      │
  LocalRenderWorker                      POST /v1/generate
        │                                      │
  Composer → AacEncoder → plik           GenerationWorker (polling)
        │                                      │
        └────────► SongEntity (Room) ◄─────────┘
                         │
              Biblioteka / PlaybackService
```

Reszta aplikacji nie wie, który tryb jest aktywny: zadania, postęp, biblioteka,
odtwarzacz i eksport są wspólne.

## Przepływ jednego utworu (tryb serwerowy)

```
CreateScreen ──► CreateViewModel ──► MusicRepository ──► POST /v1/generate
                                           │                      │
                                           │                 JobManager (pula wątków)
                                           │                      │
                                     JobEntity (Room)        Engine.generate()
                                           │                      │
                                  GenerationWorker  ◄── GET /v1/jobs/{id} (co 2,5 s)
                                           │
                            SongEntity (Room) + pobranie MP3 i okładki
                                           │
                             LibraryScreen / PlaybackService (Media3)
```

Kluczowa decyzja: **postęp zadania mieszka w bazie, nie w ViewModelu**. Dzięki temu
generowanie przeżywa zamknięcie ekranu, obrót i ubicie procesu — `GenerationWorker`
odtwarza stan z Room, a po restarcie aplikacji `MainActivity` dopina obserwację
zadań, które były jeszcze w toku.

## Android

| Warstwa | Zawartość |
|---|---|
| `data/remote` | Retrofit + kotlinx.serialization; `DynamicHostInterceptor` przepisuje każdy request na aktualny adres z ustawień, więc zmiana serwera nie wymaga restartu |
| `data/local` | Room: `SongEntity`, `JobEntity`, DAO oparte na `Flow` |
| `data/audio` | pobieranie plików, cache offline, eksport przez MediaStore do `Music/Sonara` |
| `data/prefs` | DataStore: adres serwera, klucz API, domyślny model, długość, język, motyw |
| `data/repo` | `MusicRepository` — jedyne miejsce, które łączy sieć, bazę i pliki |
| `work` | `GenerationWorker` — polling zadania z backoffem, powiadomienia o postępie |
| `player` | `PlaybackService` (Media3 `MediaSessionService`) + `PlayerController` wystawiający `StateFlow<PlaybackState>` |
| `ui` | Compose Material 3; ekrany Create / Library / Song / Settings / Onboarding, mini-odtwarzacz w `bottomBar` |
| `engine` | silnik w aplikacji: DSP, aranżer, miks, enkoder AAC, okładki, teksty (czysty Kotlin poza enkoderem i okładkami, więc testowalny na JVM) |
| `di` | `ServiceLocator` — ręczny graf zależności; wszystkie obiekty i tak są singletonami na proces |

Bez Hilta celowo: graf ma siedem węzłów, a brak procesora adnotacji to krótszy build
i mniej ruchomych części.

## Serwer

| Moduł | Rola |
|---|---|
| `main.py` | FastAPI: `/v1/generate`, `/extend`, `/cover`, `/stems`, `/jobs/{id}`, `/lyrics`, `/audio`, `/cover`, `/upload`, `/models`, `/engines`, `/health` |
| `jobs.py` | kolejka na puli wątków, postęp, pozycja w kolejce, anulowanie, sprzątanie starych zadań |
| `store.py` | trwały rejestr klipów (JSON obok plików) — dzięki temu `extend`/`stems` działają po restarcie |
| `engines/` | `base.Engine` + implementacje; rejestr wybiera pierwszą dostępną |
| `music.py` | aranżer: profile stylów, progresje, plan sekcji, parser tekstu, synteza wokalu |
| `dsp.py` | oscylatory, obwiednie, filtry biquad, perkusja, kompresor, reverb, stereo, limiter |
| `audio_io.py` | WAV ze standardowej biblioteki, MP3 i dekodowanie przez ffmpeg, crossfade |
| `covers.py` | generowanie okładek (Pillow) |
| `lyrics.py` | pisanie tekstów: endpoint zgodny z OpenAI albo generator offline |

### Wydajność renderu (silnik w telefonie)

Pięć szyn audio po 3 minuty to >150 MB floatów, więc renderer nigdy nie trzyma całego
utworu: aranżacja zamienia się w listę zdarzeń, oś czasu idzie blokami po kilka taktów,
a stan filtrów przenosi się między blokami (test `block rendering matches single pass
rendering` pilnuje, żeby granice bloków były niesłyszalne). Pamięć jest stała; 5-minutowy
render mieści się w 384 MB sterty testowej.

### Wydajność renderu (serwer)

Pierwsza wersja reverbu liczyła filtry grzebieniowe przez `lfilter` z tysiącami
współczynników — 31 s na 45 s muzyki. Po przepisaniu na blokowe sprzężenie zwrotne
(`_comb` / `_allpass` operują na blokach długości opóźnienia) ten sam materiał renderuje
się w 2,8 s, a pełne 3 minuty w ~10 s. Obwiednia kompresora liczona jest na sygnale
zdecymowanym 64×, bo tylko ona wymaga pętli sekwencyjnej.

## Kontrakt HTTP

Klient i serwer dzielą dokładnie jeden kształt danych — `sonara_server/models.py`
odpowiada `data/remote/Dto.kt` (snake_case po stronie sieci, `@SerialName` po stronie
Kotlina). Testy `server/tests/test_api.py` odtwarzają dokładnie te wywołania, które
wykonuje aplikacja.
