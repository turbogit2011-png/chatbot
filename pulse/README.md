# Pulse Studio

Aplikacja na Androida, która z pliku MP3 robi klip wideo zsynchronizowany z muzyką.

Wskazujesz utwór, opcjonalnie dorzucasz **własne zdjęcia** i **tekst piosenki** —
aplikacja znajduje tempo i bity, tnie ujęcia na downbeatach, ustawia typografię w rytm
słów i renderuje MP4 z oryginalnym dźwiękiem. **Wszystko na telefonie**: bez serwera,
bez konta, bez internetu.

```
pulse/
├── engine/     rdzeń w czystym Kotlinie: analiza audio, typografia, szablony, efekty
├── android/    aplikacja (Compose, Media3, Room, WorkManager, MediaCodec)
├── preview/    narzędzie deweloperskie: renderuje ten sam silnik na komputerze
└── docs/       architektura i opis szablonów
```

## Co robi

| | |
|---|---|
| **Twoje zdjęcia** | do 12 sztuk; ujęcia zmieniają się na downbeatach, z powolnym najazdem i punchem na cięciu |
| **Tekst piosenki** | wklej słowa — zostaną rozłożone na siatkę bitów i ustawione wielką typografią. Linie z czasami `[00:14.20]` są używane dokładnie tak, jak zapisane |
| **4 sposoby podania tekstu** | słowa wbijające się pojedynczo, podświetlenie karaoke, stos linii, pełnoekranowy baner |
| **7 szablonów** | Lyric Slam, Photo Cut, VHS, Bloomscape, Editorial, Strobe, Split Grid — plus tryb Auto, który zmienia szablon na granicach sekcji |
| **Wykończenie obrazu** | bloom, halacja, aberracja chromatyczna, ziarno, scanlines, glitch na transientach, smugi, winieta, grading — 6 gotowych looków |
| **Formaty** | 9:16, 1:1, 16:9 · 540p / 720p / 1080p · 24/30/60 fps |
| **Wyjście** | MP4 (H.264 + AAC), zapis do galerii, udostępnianie |
| **W tle** | render chodzi jako usługa pierwszoplanowa, więc kilkuminutowy klip kończy się nawet po wyjściu z aplikacji |

## Szybki start

Zainstaluj `dist/pulse-studio-release.apk`, otwórz, wskaż plik audio i naciśnij
**Make the clip**. Zdjęcia i tekst są opcjonalne — bez nich szablony rysują własne tła.

Budowa ze źródeł:

```bash
cd pulse/android
echo "sdk.dir=/ścieżka/do/Android/Sdk" > local.properties
./gradlew assembleRelease
```

## Jak to działa

1. **Dekodowanie** — `MediaExtractor` + `MediaCodec` zamieniają plik na PCM. Strumień
   ląduje na dysku (żeby enkoder AAC nie dekodował drugi raz), kopia mono zostaje
   w pamięci do analizy.
2. **Analiza** — STFT 2048/512, 48 pasm logarytmicznych, obwiednia onsetów, tempo
   z autokorelacji z kontrolą błędu oktawowego, siatka bitów dociągana do lokalnych
   maksimów, granice sekcji z nowości widmowej.
3. **Montaż** — reżyser dobiera szablon do sekcji, tło tnie ujęcia na downbeatach,
   warstwa typografii ustawia słowa w rytm, na wierzch idą podpisy.
4. **Wykończenie** — cała klatka przechodzi przez łańcuch pikselowy: bloom budowany
   w ćwiartce rozdzielczości, halacja, aberracja, tone/saturacja/winieta/ziarno
   scalone w jeden przebieg i rozbite na rdzenie.
5. **Kodowanie** — ARGB → YUV 4:2:0 (z uwzględnieniem strides enkodera) → sprzętowy
   H.264, `MediaMuxer` przeplata to z wcześniej zakodowanym AAC.

Szczegóły: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
szablony i jak dodać własny: [`docs/VISUALS.md`](docs/VISUALS.md).

## Dlaczego rdzeń jest osobnym modułem

`engine/` nie zna Androida. Dzięki temu moduł `preview/` renderuje te same klatki na
komputerze przez `java.awt` i składa je ffmpegiem — wygląd da się oceniać i poprawiać
bez telefonu:

```bash
cd pulse/android
./gradlew :preview:run --args="--stills /tmp/stills --media ~/fotki --lyrics tekst.txt"
./gradlew :preview:run --args="--audio utwor.wav --out klip.mp4 --style auto --look film"
```

Ta pętla wyłapała m.in.: aberrację rozdwajającą napisy, ziarno per-piksel puchnące
plik do 183 MB zamiast 73 MB, pierścienie zamieniające się w wypełnione dyski przy
małym promieniu i pole cząsteczek zbijające się w jeden ukośny pas.

## Testy

```bash
cd pulse/android && ./gradlew :engine:test   # 32 testy
```

* **Analiza** — tempo na klik-trackach i pętlach 90–174 BPM, siatka bitów poniżej 60 ms
  błędu, nadążanie za zmianą tempa, rozdział pasm, odstępy sekcji.
* **Tekst** — parsowanie LRC, przesunięcie, lądowanie linii na bitach, podział słów,
  zawijanie, ignorowanie tagów `[Verse]`.
* **Efekty** — zakres bajtowy i alfa, winieta ciemniejsza w rogach, bloom rozlewający
  się z podświetlenia, ziarno zmieniające piksele, smugi i ich reset, glitch tylko na
  transiencie.
* **Kolory** — ARGB→YUV na zakresie, kolorach podstawowych, wypełnieniu wierszy
  i nieparzystych wymiarach.

## Czego nie robi

Nie generuje muzyki ani materiału wideo — pracuje na Twoim pliku i Twoich zdjęciach.
Nie rozpoznaje tekstu ze słuchu: słowa trzeba wkleić (albo wkleić plik LRC z czasami).
