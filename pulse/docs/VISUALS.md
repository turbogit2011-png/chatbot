# Style

Każdy styl to klasa implementująca `Scene` w `engine/src/main/kotlin/com/pulse/studio/visual/scenes/`.

| Styl | Co robi | Reaguje na |
|---|---|---|
| **Spectrum** | słupki widma na odbijającej podłodze | 48 pasm, bit (rozbłysk podłogi) |
| **Radial** | widmo zawinięte w pierścień wokół okładki | widmo, bit (pierścienie), poziom (halo) |
| **Particles** | pole świateł rozpychane kopnięciem | bas (siła wybuchu), średnie (dryf), poziom (rozmiar) |
| **Waves** | nakładające się wstęgi | osobne pasmo na warstwę, bit (grubość linii) |
| **Kaleidoscope** | lustrzany kwiat płatków | średnie (obrót), widmo (kształt płatka), bas (rdzeń) |
| **Artwork** | okładka z oddechem na bit i paskiem widma | bit (skala), widmo (słupki) |

Tryb **Auto** rozdaje style po sekcjach utworu, w kolejności zależnej od ziarna, więc
dwa klipy z tego samego pliku są różne, ale ten sam seed daje ten sam montaż.

## Palety

`Sunset`, `Neon`, `Mint`, `Ember`, `Ice`, `Mono`, `Candy` — każda ma tło, kolor
główny, drugi i akcent. `Palette.ramp(t)` przechodzi płynnie przez całą trójkę
i to jest podstawowy sposób kolorowania w scenach.

## Dodanie własnego stylu

1. Napisz klasę implementującą `Scene` (`id`, `displayName`, `render`, opcjonalnie
   `reset` dla stanu między klatkami).
2. Dopisz ją do `Director.available()`.
3. Obejrzyj wynik bez telefonu:

```bash
cd pulse/android
./gradlew :preview:run --args="--stills /tmp/stills --quality 540"
./gradlew :preview:run --args="--audio utwor.wav --out proba.mp4 --style twoj-id"
```

Test `every style renders a frame that is not blank` pilnuje, żeby nowy styl faktycznie
coś narysował i nie był czarną klatką.

## Zasady, które się sprawdziły

* **Wygładzaj słupki asymetrycznie** — szybki atak, wolniejszy powrót. Bez tego ruch
  jest nerwowy i nie czyta się jako muzyczny.
* **Nie licz na jedno pasmo** — osiem pasm na 48 słupków daje schodki; od tego jest
  `ctx.spectrum(position)`.
* **Nie dawaj wszystkim cząsteczkom wspólnej fazy** — pierwsza wersja `Particles`
  miała jedno pole zawirowań dla całego układu i po kilku sekundach spychało ono
  wszystkie punkty w jeden ukośny pas.
