# Pulse Studio

Aplikacja na Androida, która z pliku MP3 robi klip wideo zsynchronizowany z muzyką.

Wybierasz utwór, styl i format — aplikacja dekoduje audio, znajduje tempo i bity,
rysuje każdą klatkę reagującą na dźwięk i koduje gotowe MP4 z oryginalną ścieżką.
**Wszystko dzieje się na telefonie**: bez serwera, bez konta, bez internetu, nic nie
jest wysyłane.

```
pulse/
├── engine/     rdzeń w czystym Kotlinie: analiza audio + silnik wizualny (testowalny na JVM)
├── android/    aplikacja (Compose, Media3, Room, WorkManager, MediaCodec)
├── preview/    narzędzie deweloperskie: renderuje ten sam silnik na komputerze
└── docs/       architektura i opis stylów
```

## Co potrafi

| Funkcja | Opis |
|---|---|
| Wejście | MP3, M4A, WAV, FLAC, OGG — wszystko, co Android umie zdekodować |
| Analiza | tempo, siatka bitów, 48-pasmowe widmo, głośność, granice sekcji, akcenty |
| Style | 6 stylów reagujących na dźwięk + tryb **Auto**, który zmienia styl na granicach sekcji |
| Podgląd | kafelki w wyborze stylu to prawdziwe klatki z silnika, nie ikonki |
| Formaty | 9:16 (Reels/TikTok/Shorts), 1:1, 16:9 · 540p / 720p / 1080p · 24/30/60 fps |
| Napisy | tytuł i wykonawca wypalone w obrazie, pasek postępu, okładka z tagów albo z galerii |
| Długość | cały utwór albo krótki klip 15/30/60/90 s |
| Wyjście | MP4 (H.264 + AAC) z oryginalnym dźwiękiem, zapis do galerii, udostępnianie |
| W tle | render chodzi przez WorkManager z powiadomieniem i przeżywa wyjście z aplikacji |

## Szybki start

Zainstaluj `dist/pulse-studio-release.apk`, otwórz, wskaż plik audio i naciśnij
**Make the clip**. To wszystko.

Budowa ze źródeł:

```bash
cd pulse/android
echo "sdk.dir=/ścieżka/do/Android/Sdk" > local.properties
./gradlew assembleRelease
```

## Jak to działa

1. **Dekodowanie** — `MediaExtractor` + `MediaCodec` zamieniają plik na PCM. Strumień
   trafia na dysk (żeby enkoder AAC nie musiał dekodować drugi raz), a kopia mono
   zostaje w pamięci do analizy.
2. **Analiza** (`engine/audio`) — STFT 2048/512, osiem pasm zbiorczych i 48 pasm
   logarytmicznych, obwiednia onsetów ze spectral flux, tempo z autokorelacji
   z kontrolą błędu oktawowego, siatka bitów dociągana do lokalnych maksimów,
   granice sekcji z nowości widmowej dociągane do downbeatów.
3. **Rysowanie** (`engine/visual`) — reżyser dobiera styl do sekcji, maluje tło,
   scenę, cięcie, winietę i napisy. Sceny rysują przez abstrakcję `FrameCanvas`.
4. **Kodowanie** (`android/render`) — klatki idą jako ARGB → YUV 4:2:0 do sprzętowego
   enkodera H.264, a `MediaMuxer` przeplata je z wcześniej zakodowanym AAC.

Szczegóły: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
style i jak dodać własny: [`docs/VISUALS.md`](docs/VISUALS.md).

## Dlaczego rdzeń jest osobnym modułem

`engine/` nie zna Androida. Dzięki temu moduł `preview/` renderuje te same klatki na
komputerze przez `java.awt` i składa je ffmpegiem w wideo — więc wygląd da się
sprawdzić i poprawiać bez telefonu:

```bash
cd pulse/android
./gradlew :preview:run --args="--audio ~/utwor.wav --out klip.mp4 --style auto --palette neon"
./gradlew :preview:run --args="--stills /tmp/stills"      # po jednej klatce na styl
```

## Testy

```bash
cd pulse/android
./gradlew :engine:test   # analiza audio i konwersja kolorów
```

Analizator jest sprawdzany na materiale o znanym tempie: klik-tracki i pętle perkusyjne
przy 90–174 BPM, dokładność siatki bitów poniżej 60 ms, nadążanie za zmianą tempa
w połowie utworu, rozdział pasm oraz wykrywanie sekcji. Konwersja ARGB→YUV jest
sprawdzana na zakresie, kolorach podstawowych, wypełnieniu wierszy i nieparzystych
wymiarach.

## Czego aplikacja nie robi

Nie generuje muzyki ani nie dokłada materiału wideo — pracuje na Twoim pliku.
Nie rozpoznaje tekstu piosenki, więc nie zrobi napisów karaoke.
