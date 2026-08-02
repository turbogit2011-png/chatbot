# Ski Jump — Symulator Skoków Narciarskich

Dwie części projektu:

| Katalog | Co zawiera | Status |
|---|---|---|
| `web/` | **Grywalna gra HTML5** — jeden plik, zero zależności | ✅ gotowa do pobrania i grania |
| `Unity/` | **Architektura produkcyjna Unity/URP (C#)** — 4 systemy + shader śniegu | ✅ kod gotowy do wpięcia w projekt Unity |

---

## 1. Gra do pobrania — `web/index.html`

Pobierz plik `web/index.html` i otwórz w przeglądarce (komputer lub telefon).
Nie wymaga serwera, internetu ani instalacji.

**Sterowanie**

| Faza | Klawiatura | Dotyk |
|---|---|---|
| Najazd | `←`/`→` — utrzymuj balans na środku paska | przeciąganie palcem w bok |
| Wybicie | `SPACJA` tuż przed progiem (okno czasowe!) | tap |
| Lot | `↑`/`↓` — kąt natarcia (za mało = nurkowanie, za dużo = przeciągnięcie) | przeciąganie góra/dół |
| Lądowanie | `SPACJA` w krótkim oknie = **Telemark** (bonus stylowy, ale ryzyko przy twardym lądowaniu) | tap |
| Restart | `R` | przycisk |

**Fizyka i punktacja w wersji web** — ta sama co w architekturze Unity:
- siła nośna i opór: `F_L = 0.5·ρ·v²·S·C_L(AoA)`, `F_D = 0.5·ρ·v²·S·C_D(AoA)`,
  krzywe C_L/C_D z przeciągnięciem powyżej ~40° kąta natarcia,
- dynamiczny wiatr (szum wielooktawowy, podmuchy przednie/tylne, pomiar średniej do kompensaty),
- skocznia K-125 / HS-140, wartość metra 1,8 pkt, kompensata wiatru 10,8 pkt/(m/s)
  (wiatr tylny ×1,5 — jak w przepisach FIS),
- 5 sędziów 0–20 pkt co 0,5; skrajne noty odrzucane; potrącenia za niestabilny lot
  (odchylenie standardowe AoA, algorytm Welforda), brak telemarku (−2,0), twarde lądowanie,
- fizyka liczona substeppingiem 240 Hz — trajektoria stabilna niezależnie od FPS.

Parametry (profil zeskoku, powierzchnia nośna, prędkość najazdu) zostały **dostrojone
symulacją numeryczną**: skok neutralny ≈ 122 m (punkt K), perfekcyjnie prowadzony ≈ 140 m (HS),
błędy kąta natarcia i timingu wybicia karane dystansem.

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
