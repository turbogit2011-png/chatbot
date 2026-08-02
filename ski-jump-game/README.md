# Ski Jump — Symulator Skoków Narciarskich

Dwie części projektu:

| Katalog | Co zawiera | Status |
|---|---|---|
| `web/` | **Grywalna gra HTML5** — jeden plik, zero zależności | ✅ gotowa do pobrania i grania |
| `Unity/` | **Architektura produkcyjna Unity/URP (C#)** — 4 systemy + shader śniegu | ✅ kod gotowy do wpięcia w projekt Unity |

---

## 1. Gra do pobrania — `web/index.html` (SKI JUMP CUP)

Pobierz plik `web/index.html` i otwórz w przeglądarce (komputer lub telefon).
Nie wymaga serwera, internetu ani instalacji.

**Zawartość gry**

- **3 skocznie**: K-90 (HS-101), K-125 (HS-140) i mamut K-200 (HS-224) — każda z inną
  prędkością najazdu, wartością metra i charakterystyką lotu (na mamucie liczy się
  płaski, aerodynamiczny lot),
- **Tryb konkursu**: 2 serie przeciwko 9 rywalom AI, tablica wyników między seriami,
  podium na koniec,
- **Trening** z rekordami skoczni zapisywanymi lokalnie (localStorage),
- **Wybór belki startowej** (−3…+3) z kompensatą punktową FIS — niższa belka to mniejsza
  prędkość, ale dodatnie punkty,
- **Powtórki** skoku ze zwolnionym tempem przy lądowaniu,
- oprawa: animowana sylwetka skoczka (dojazd, wyprost po wybiciu, styl V, telemark,
  ragdoll przy upadku), stadion (wieża najazdowa, wieża sędziowska, tłum, banery),
  parallax gór, padający śnieg znoszony wiatrem, śnieżny pył spod nart, dźwięk
  proceduralny (szum wiatru zależny od prędkości, tłum, wybicie/lądowanie — WebAudio).

**Sterowanie**

| Faza | Mysz (styl DSJ) | Klawiatura | Dotyk |
|---|---|---|---|
| Start | klik | `SPACJA` | tap |
| Najazd (balans) | pozycja pozioma | `←`/`→` | przeciąganie w bok |
| Wybicie | klik przy progu | `SPACJA` | tap |
| Lot | pozycja pionowa myszy | `↑`/`↓` | przeciąganie góra/dół |
| Telemark | klik w oknie lądowania | `SPACJA` | tap |

**Fizyka i punktacja** — te same równania co w architekturze Unity:
- `F_L = 0.5·ρ·v²·S·C_L(AoA)`, `F_D = 0.5·ρ·v²·S·C_D(AoA)`, przeciągnięcie >~40° AoA,
- dynamiczny wiatr wielooktawowy z pomiarem średniej od progu do lądowania,
- pełny przelicznik FIS: 60 pkt za punkt K (120 na mamucie), wartość metra wg rozmiaru
  skoczni (2,0 / 1,8 / 1,2), kompensata wiatru (tylny ×1,5) i belki, 5 sędziów 0–20 co
  0,5 pkt ze skreśleniem not skrajnych; potrącenia za niestabilność lotu (odchylenie
  standardowe AoA — Welford), brak telemarku, twarde lądowanie i skok za HS,
- substepping fizyki 240 Hz — trajektoria niezależna od FPS.

Parametry każdej skoczni **dostrojone symulacją numeryczną** (skrypt w repo commit
history): np. na K-125 skok bez sterowania ≈ 122 m, perfekcyjnie prowadzony ≈ 140 m (HS),
spóźnione wybicie kosztuje ~25 m, a na mamucie ~50 m.

---

## 2. Architektura Unity / URP — `Unity/Assets/`

Produkcyjny kod C# pod Unity 2026 + URP (mobile, 60–120 FPS), Clean Architecture,
zero alokacji GC w pętlach `Update()`/`FixedUpdate()`.

```
Assets/
├── Scripts/
│   ├── Physics/SkierPhysicsController.cs   – silnik aerodynamiki (Lift/Drag/AoA)
│   ├── Environment/WindSystem.cs           – wiatr 3D z szumu Perlina
│   ├── Skier/SkierStateMachine.cs          – FSM: Inrun→Takeoff→Flight→Landing/Crash
│   └── Scoring/FISScoringSystem.cs         – punktacja FIS + 5 sędziów
└── Shaders/SnowDeform.shader               – śnieg URP: koleiny + wind motion blur
```

**Kluczowe decyzje architektoniczne**

- **State Pattern** (`SkierStateMachine`) — stany prealokowane w `Awake`, przejścia bez GC;
  każdy stan nadpisuje tylko potrzebne haki (`Tick`, `FixedTick`, `OnGroundContact`).
- **Observer Pattern** — zdarzenia `PhaseChanged`, `TakeoffExecuted`, `Landed`, `Crashed`,
  `ResultReady`; kamera/HUD/audio/sędziowie subskrybują bez sprzężeń.
- **Strategy/Command po stronie wejścia** — interfejs `ISkierInput` (dotyk+żyroskop
  w produkcji, klawiatura w edytorze, replay/AI w testach); tap buforowany i konsumowany.
- **GC-free hot path** — krzywe `AnimationCurve` wypiekane do LUT w `Awake`
  (bez `Evaluate()` w fizyce), telemetria jako `struct` z wariancją liczoną online
  (Welford — bez buforów), `Collision.GetContact()` zamiast alokującego `contacts`.
- **Wiatr = f(pozycja, czas)** — podmuch globalny (Perlin niskiej częstotliwości)
  + turbulencja przestrzenna; średnia mierzona od wybicia do lądowania zasila
  kompensatę punktową FIS.
- **FIS** — tabela wartości metra wg punktu K (ICR 431.2), 60 pkt za K (120 na mamutach),
  kompensata belki (gate factor), noty stylu deterministyczne z telemetrii + szum per sędzia.
- **Shader śniegu** — odkształcanie wierzchołków z `_DeformationMap` (R = głębokość koleiny,
  malowana kamerą ortho top-down), kierunkowe rozmycie sparkli wiatrem; 1 pass, bez tessellacji.

**Jak zbudować grę mobilną z tego kodu**

1. Zainstaluj Unity (szablon *3D Mobile / URP*).
2. Skopiuj `Unity/Assets/` do projektu.
3. Scena: skocznia (mesh + colliders), `Rigidbody` zawodnika z `SkierPhysicsController`
   + `SkierStateMachine`, obiekt `WindSystem`, obiekt `FISScoringSystem` (podpięty do FSM),
   materiał śniegu na shaderze `SkiJump/URP/SnowDeform`.
4. `File → Build Settings → Android/iOS → Build` — powstaje `.apk` / projekt Xcode.

> **Uwaga:** binarka `.apk`/`.ipa` musi zostać zbudowana w Unity Editorze — repozytorium
> dostarcza kompletny kod i architekturę; wersją "do pobrania i grania od razu" jest
> `web/index.html`.
