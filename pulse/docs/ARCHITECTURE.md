# Architektura

## Moduły

| Moduł | Zawartość | Zależy od Androida |
|---|---|---|
| `engine` | analiza audio, silnik wizualny, konwersja kolorów, `ClipSpec` | nie |
| `android` | dekoder, enkoder, płótno Canvas, baza, UI, kolejka renderów | tak |
| `preview` | backend `java.awt` + harness CLI do renderowania na komputerze | nie |

Rozdział nie jest kosmetyczny: cała logika, która decyduje o tym, jak klip wygląda
i czy trzyma rytm, siedzi w `engine` i dzięki temu jest uruchamiana i mierzona na JVM.

## Droga jednego klipu

```
CreateScreen ──► ClipRepository.enqueue ──► Room (ClipEntity: queued)
                                                  │
                                            RenderWorker
                                                  │
                                            ClipRenderer
         ┌────────────┬───────────────┬───────────┴───────────┐
   AudioDecoder   AudioAnalyzer     Director            AudioTrackEncoder
   (MediaCodec)   (FFT, bity)    (klatki)                  (AAC → m4a)
         │              │              │                       │
         └──────────────┴──────► AndroidFrameCanvas ──► VideoWriter (H.264 + MediaMuxer)
                                                                │
                                                      Room (ready) ──► Biblioteka
```

Postęp mieszka w bazie, nie w ViewModelu, więc render przeżywa obrót ekranu,
wyjście z aplikacji i ubicie procesu, a biblioteka pokazuje klip zapełniający się
w miejscu.

## Analiza audio (`engine/audio`)

* **STFT** 2048 próbek, skok 512 (~86 klatek na sekundę).
* **Pasma** — osiem zbiorczych (do `bass()`/`mid()`/`treble()`) i 48 logarytmicznych
  od 35 Hz do 15 kHz dla słupków i szprych. Te drugie są trzymane jako bajty: dla
  dziesięciominutowego utworu to ~2,5 MB zamiast ~10 MB.
* **Normalizacja** — względem wysokiego percentyla, nie maksimum, żeby jeden
  transjent nie spłaszczył całej krzywej. Pasma dzielą wspólny punkt odniesienia,
  inaczej czysty bas wyglądałby jak hi-haty; dopiero potem każde dostaje ograniczone
  dociągnięcie, żeby góra pasma w ogóle się ruszała.
* **Tempo** — autokorelacja obwiedni onsetów, z premią dla lagów, których wielokrotności
  też się zgadzają. To właśnie oddziela prawdziwy okres bitu od jego harmonicznej.
* **Siatka bitów** — wybór fazy zbierającej najwięcej energii, potem każdy bit
  dociągany do lokalnego maksimum, z mieszaniem pozycji oczekiwanej i znalezionej
  65/35, żeby pojedynczy mocny offbeat nie przestawił całej siatki.
* **Sekcje** — nowość widmowa (różnica średniego widma przed i po), dociągana do
  downbeatów, z minimalnym odstępem, żeby cięcia nie leciały co dwie sekundy.

## Silnik wizualny (`engine/visual`)

`FrameCanvas` to celowo mały zestaw prymitywów: prostokąt, zaokrąglony prostokąt,
koło, wielokąt, łamana, tekst, obraz, gradienty liniowe i promieniste, tryb
addytywny. Mały zestaw da się wiernie zaimplementować dwa razy — raz na
`android.graphics.Canvas`, raz na `java.awt.Graphics2D` — i to jest warunek tego,
żeby podgląd na komputerze pokazywał to samo, co telefon.

`Director` trzyma tło, wybór sceny na sekcję, cięcie, winietę i napisy. Sceny mają
własny stan między klatkami (cząsteczki, wygładzane słupki) i dostają `RenderContext`
z czasem, cechami audio i paletą.

## Kodowanie (`android/render`)

Android nie pozwala rysować `Canvas` po powierzchni wejściowej enkodera, więc klatki
idą przez bufory: `AndroidFrameCanvas` oddaje ARGB, `YuvConverter` zamienia je na
płaszczyzny YUV 4:2:0 z uwzględnieniem `rowStride` i `pixelStride`, które enkoder
raportuje. Ta arytmetyka jest testowana na JVM, bo pomyłka o jeden bajt daje zielony
film i nie widać jej w kodzie.

Dźwięk jest kodowany najpierw, do tymczasowego `.m4a`. Dzięki temu w momencie, gdy
enkoder wideo zgłasza swój format, format audio jest już znany — a `MediaMuxer`
wymaga dodania wszystkich ścieżek przed `start()`. Próbki audio są dopisywane w miarę
postępu osi czasu wideo, więc plik jest poprawnie przeplatany i dobrze się przewija.
