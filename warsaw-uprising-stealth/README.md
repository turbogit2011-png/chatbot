# Warsaw Uprising 1944 — Tactical Stealth (Unity / C#)

Rdzeń systemu skradania i widzenia dla izometrycznej gry taktycznej (mobile).

```
Assets/Scripts/
├── Stealth/
│   ├── NoiseManager.cs      – propagacja hałasu (Observer + spatial hash grid, zero GC)
│   └── SoundEmitter.cs      – emisja kroków/zdarzeń, detekcja szkła pod stopami
├── AI/
│   ├── FieldOfView.cs       – stożek widzenia: detekcja celu + dynamiczny mesh
│   └── EnemyAIController.cs – FSM strażnika: Patrol / Suspicious / Alert / Combat
└── Player/
    └── PlayerStealthController.cs – dotykowe sterowanie + postawa (skradanie/bieg)
```

## Architektura

### Dźwięk (Observer + Spatial Partitioning)
`NoiseManager` utrzymuje jednorodną siatkę przestrzenną na płaszczyźnie XZ.
Słuchacze (`INoiseListener`) trzymani są w **płaskich tablicach int** jako
listy intruzywne (`head[cell]` / `next[slot]` / `prev[slot]`) z free-listą slotów —
brak `Dictionary`, brak `List`, brak boksowania. Emisja odwiedza wyłącznie
komórki przecięte promieniem słyszalności; głośność = intensywność × liniowy
spadek z odległością × tłumienie ścian (`Physics.RaycastNonAlloc` na wspólnym
buforze, każda ściana mnoży przez `wallMuffling`).

`SoundEmitter` emituje kroki co `strideLength` metrów przebytej drogi; profil
(promień/intensywność) zależy od trybu ruchu, a **szkło pod stopami**
(marker `StealthSurface`, sonda `RaycastNonAlloc` w dół) nadpisuje tryb —
skradanie po szkle i tak budzi pół dzielnicy.

### Wzrok (Dynamic Mesh + NonAlloc)
`FieldOfView` rozdziela dwie pętle:
- **skan celów** (10 Hz): `OverlapSphereNonAlloc` → test kąta stożka →
  `RaycastNonAlloc` linii wzroku; ekspozycja celu skalowana odległością oraz
  `IStealthTarget.ExposureMultiplier` (kucanie, osłony); strefa bliska
  („szósty zmysł") wykrywa także za plecami,
- **mesh stożka** (30 Hz): 1 promień na `meshRayStep` stopni + **binarne
  doprecyzowanie krawędzi** tylko tam, gdzie sąsiednie promienie się różnią
  (ostre narożniki bez gęstego próbkowania). Wierzchołki i indeksy w tablicach
  alokowanych raz; upload przez `SetVertices/SetTriangles` (zakresowe przeciążenia,
  `MarkDynamic`, bez przeliczania bounds) — przyjazne mobilnym GPU.

### AI strażnika (State Pattern, stany prealokowane)
Drabina eskalacji sterowana **miernikiem detekcji** (0..1, ładowany ekspozycją
z FOV w czasie `timeToSpot`, rozładowywany po utracie kontaktu) oraz zdarzeniami
słuchowymi:

```
Patrol ──cichy hałas / mignięcie──▶ Suspicious ──głośny hałas / 2. bodziec──▶ Alert
   ▲                                    │ timer                                │ timer
   └────────── ReturnToPost ◀───────────┴────────────◀─────────────────────────┘
Combat: pełny miernik + widoczny cel (z każdego stanu); utrata celu → Alert.
```

- **Suspicious**: podejście do źródła bodźca, omiatanie obrotem, timer powrotu.
- **Alert**: broń w gotowości, przeszukiwanie pierścieniowe wokół ostatniego
  bodźca (deterministyczny wzór, bez alokacji), niższy próg przejścia w Combat.
- **Combat**: trzymanie dystansu, obrót na cel, ostrzał na interwale
  (`ShotFired` — Observer dla systemu broni), utrata LOS → Alert.

Zdarzenia `StateChanged` zasilają animator, odzywki i koordynatora oddziału.

## Gwarancje zero-GC w pętli gry
- wszystkie zapytania fizyki przez **współdzielone, prealokowane bufory NonAlloc**
  (`RaycastNonAlloc`, `OverlapSphereNonAlloc`),
- zdarzenia dźwiękowe jako `readonly struct` przekazywane przez `in`,
- stany FSM tworzone raz w `Awake`,
- siatka przestrzenna i mesh FOV wyłącznie na tablicach wielokrotnego użytku.

## Podpięcie w scenie
1. Pusty obiekt `NoiseManager` (ustaw `worldOrigin`/`cellSize` pod rozmiar mapy,
   warstwy ścian w `occluderMask`).
2. Gracz: `CharacterController` + `PlayerStealthController` + `SoundEmitter`;
   warstwa gracza w `targetMask` strażników.
3. Strażnik: `NavMeshAgent` + `FieldOfView` (dziecko z `MeshFilter`/`MeshRenderer`
   i półprzezroczystym materiałem stożka) + `EnemyAIController` (waypointy patrolu).
4. Podłogi ze szkłem: collider + `StealthSurface` z zaznaczonym `IsGlass`.
