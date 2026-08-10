# Kairos — koncepcja i architektura

> Koncept, stos technologiczny i struktura projektu. Instrukcja uruchomienia
> i konfiguracji platform: [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## 1. Koncept

**Nazwa:** **Kairos** (gr. *kairos* — właściwy moment, w opozycji do *chronos*,
czasu mierzonego zegarem). Nazwa jest jednocześnie definicją produktu.

**Problem.** Fragmentacja uwagi to dziś problem zdrowotny i ekonomiczny.
Istniejące narzędzia (Screen Time, Digital Wellbeing, blokery aplikacji) mają trzy
wady konstrukcyjne:

1. **Są retrospektywne** — pokazują raport wczoraj wieczorem, gdy nic już nie da się
   zrobić.
2. **Są ślepe na kontekst** — 40 minut w przeglądarce to badanie do pracy albo
   doomscrolling; licznik ekranu nie widzi różnicy.
3. **Są represyjne** — blokada wywołuje reaktancję psychologiczną; użytkownik uczy
   się ją obchodzić i po ~4 tygodniach kasuje aplikację.

**UVP.** *Kairos nie liczy czasu przed ekranem. Kairos rozpoznaje moment tuż przed
utratą uwagi i mówi jednym zdaniem — Twoim głosem — co zrobić w tej sekundzie.
Wszystko liczy się na urządzeniu; żaden bajt danych o Tobie nie opuszcza telefonu.*

### Przełomowy mechanizm: pętla *Sense → Infer → Intervene → Calibrate*

```
   ┌── SENSE ──────────────┐   ┌── INFER ──────────────┐   ┌── INTERVENE ─────────┐
   │ akcelerometr/żyroskop │   │ ekstrakcja cech (30 s)│   │ lokalny SLM (Gemma)  │
   │ orientacja urządzenia │──▶│ + klasyfikator stanu  │──▶│ lub silnik kompozycji│
   │ powroty na 1. plan    │   │ (softmax uczony       │   │ 1 zdanie w kontekście│
   │ krokomierz, bateria   │   │  lokalnie, SGD)       │   │ zamiaru, bez dźwięku │
   └───────────────────────┘   └───────────┬───────────┘   └──────────┬───────────┘
             ▲                             │                          │
             │                    stan: DEEP_FOCUS / FLOW /           │
             │                    DRIFT / RESTLESS / FATIGUE /        │
             │                    RECOVERY  + pewność (0–1)           │
             │                                                        ▼
   ┌── CALIBRATE ─────────────────────────────────────────────────────────────────┐
   │ reakcja użytkownika (przyjęte / odrzucone / zignorowane) → aktualizacja wag   │
   │ modelu online (SGD) i progu interwencji. Model osobisty, nigdy nie wysyłany.  │
   └──────────────────────────────────────────────────────────────────────────────┘
```

Trzy rzeczy, których nie robi dziś nikt na rynku jednocześnie:

| # | Mechanizm | Dlaczego to różnica jakościowa |
|---|-----------|--------------------------------|
| 1 | **Predykcja zamiast raportu** — sygnał `DRIFT` pojawia się w oknie ~60–180 s *przed* typowym sięgnięciem po rozpraszacz (rosnąca wariancja mikroruchów, skracające się interwały wybudzeń ekranu, spadek stabilności postawy). | Interwencja trafia w moment, w którym decyzja jeszcze nie zapadła. |
| 2 | **Generatywna mikro-interwencja lokalnym SLM** — treść powstaje z: stanu, cech numerycznych, deklarowanego zamiaru („kończę rozdział 3”) i historii tego, co u tego użytkownika działało. | Komunikat brzmi jak własna myśl, nie jak notyfikacja aplikacji. Odporność na habituację. |
| 3 | **Kalibracja osobista bez chmury** — logistyczna regresja z SGD trenowana na urządzeniu na reakcjach użytkownika; próg interwencji dopasowuje się indywidualnie. | Brak „uśrednionego modelu ludzkości”; brak transferu danych; działa w trybie samolotowym. |

**Model prywatności (kontrakt produktowy).** Aplikacja nie ma backendu ani
żadnego klienta HTTP — w `pubspec.yaml` nie ma biblioteki sieciowej, więc
obietnica „nic nie wychodzi na zewnątrz” jest weryfikowalna listą zależności,
a nie deklaracją. Wagi opcjonalnego modelu językowego użytkownik wgrywa
ręcznie (patrz DEPLOYMENT.md, sekcja 6).

### Uczciwe ograniczenia (zapisane wprost, nie ukryte)

* **iOS nie oddaje ciągłego tła.** Na iOS pętla `SENSE` działa: (a) na pierwszym
  planie w czasie rzeczywistym, (b) w tle przez `CMMotionActivity`/`CMPedometer`
  (dane historyczne odczytywane przy każdym `BGAppRefreshTask`), (c) podczas sesji
  skupienia uruchomionej przez użytkownika. Interwencje predykcyjne w tle na iOS są
  z natury rzadsze niż na Androidzie — UI komunikuje to wprost, zamiast obiecywać
  parytet.
* **Android wymaga usługi pierwszoplanowej** (`foregroundServiceType="health"`) ze
  stałą, informacyjną notyfikacją. To świadomy koszt uczciwości wobec użytkownika.
* **Krokomierz jest opcjonalny** — bez zgody na rozpoznawanie aktywności lub bez
  czujnika w urządzeniu wektor cech traci `stepRate`, a reszta działa normalnie.
* **Cykl wybudzeń ekranu** wymagałby na Androidzie uprawnienia `UsageStats`,
  którego świadomie nie prosimy. Zamiast tego liczymy powroty aplikacji na
  pierwszy plan — słabszy, ale uczciwy sygnał (`foregroundSwitchRate`).
* **Klasyfikator jest heurystyką kalibrowaną, nie diagnozą medyczną.** Aplikacja
  nie stawia rozpoznań i nie używa słownictwa klinicznego.

---

## 2. Stos technologiczny i uzasadnienie

| Warstwa | Wybór | Uzasadnienie |
|---------|-------|--------------|
| Framework | **Flutter 3.32+ / Dart 3.8** | Jeden zestaw sensorów i UI na dwie platformy; izolaty Darta pozwalają liczyć cechy sygnału poza wątkiem UI bez natywnego kodu. |
| Stan / DI | **Riverpod 2.6 (bez generatorów)** | Kompilacyjnie bezpieczne DI bez `BuildContext`, `AsyncValue` jako natywny model stanów `loading/data/error`, testowalność przez `ProviderContainer` z nadpisaniami. Providery pisane ręcznie — projekt kompiluje się bez rundy `build_runner`. |
| Nawigacja | **go_router 14** | Deklaratywne trasy, deep-linki z powiadomień, przewidywalny stos przy powrocie z tła. |
| Modele | **ręczne klasy niezmienne + `sealed`/`enum` z polami** | Zero kodu generowanego, pełna czytelność w IDE, `switch` bez gałęzi domyślnej pilnowany przez kompilator. |
| Błędy | **fpdart (`Either<Failure, T>`)** | Repozytoria nie rzucają wyjątków przez granice warstw; `guard()` w `core/error/error_mapper.dart` jest jedynym miejscem łapiącym `Object`. |
| Baza lokalna | **sqflite + ręczny SQL** | Szeregi czasowe z indeksami po czasie, migracje wersjonowane, agregaty (rozkład stanów, skuteczność) liczone w SQL, brak warstwy generowanej. |
| Sensory | **sensors_plus, pedometer, battery_plus** | Stabilne, utrzymywane pluginy z jednolitym API strumieni; każdy opcjonalny sygnał degraduje się miękko. |
| Tło | **flutter_foreground_task** (Android) | Usługa pierwszoplanowa utrzymuje proces aplikacji, zamiast duplikować próbkowanie w drugim izolacie (drugie połączenie z bazą = wyścigi). Na iOS świadomy no-op. |
| LLM | **flutter_gemma** (MediaPipe, Gemma 3 1B int4) | Inferencja na GPU/NNAPI. Opcjonalna: bez wag aplikacja działa na silniku kompozycyjnym. |
| Klasyfikator | **czysty Dart** (softmax + SGD) | Zero zależności natywnych, w pełni audytowalny, trenowalny na urządzeniu, serializowalny do SQLite. |
| Wykresy i animacje | **CustomPainter + flutter_animate** | Pierścień oddechu, oś czasu i tło aurora rysowane własnoręcznie — pełna kontrola nad wyglądem w obu motywach, o jedną zależność mniej. |

**Czego świadomie NIE ma:** Firebase, Supabase, Sentry, analityki, reklam, kont
użytkownika, uprawnień do lokalizacji, mikrofonu i kamery, generowania kodu
(`build_runner`), bibliotek wykresów. Każdy z tych elementów albo łamałby UVP,
albo dokładał zależność bez pokrycia w wartości.

### Dwa pliki zależne od API pluginów

`gemma_llm_engine.dart` i `background_sensing_service.dart` to jedyne miejsca
styku z pluginami o zmiennym API. Oba są opcjonalne: usunięcie każdego z nich
(plus jednej linii w `di.dart`) zostawia w pełni działającą aplikację. Ta
granica jest celowa — ryzyko wersji jest odizolowane, a nie rozlane po projekcie.

---

## 3. Struktura projektu (Clean Architecture)

Podział pionowy po **funkcjach** (feature-first), poziomy po **warstwach**.
Zależności wskazują wyłącznie do środka: `presentation → domain ← data`.

```
mobile/kairos/
├── pubspec.yaml · analysis_options.yaml · ARCHITECTURE.md · DEPLOYMENT.md
├── tool/fetch_fonts.sh
├── assets/{fonts,icons,models/manifest.json,prompts/intervention_system_pl.txt}
├── test/
│   ├── core/math/{logistic_regression_test,signal_features_test}.dart
│   ├── features/flow_state/flow_classifier_test.dart
│   ├── features/intervention/{intervention_policy_test,composition_engine_test}.dart
│   └── widgets/breathing_ring_test.dart
└── lib/
    ├── main.dart
    ├── app/
    │   ├── bootstrap.dart          # otwarcie bazy i ustawień przed 1. klatką
    │   ├── di.dart                 # cały graf providerów
    │   ├── kairos_app.dart         # MaterialApp.router
    │   ├── kairos_engine.dart      # orkiestracja pętli produktu
    │   └── router/app_router.dart
    ├── core/
    │   ├── error/{failure.dart,error_mapper.dart}
    │   ├── result/typedefs.dart
    │   ├── logging/app_logger.dart
    │   ├── time/{clock.dart,pl_format.dart}
    │   ├── math/{running_stats.dart,signal_features.dart,logistic_regression.dart}
    │   ├── theme/{app_colors,app_typography,app_motion,app_theme}.dart
    │   └── widgets/{glass_card.dart,status_views.dart,aurora_background.dart}
    ├── data/
    │   ├── database/kairos_database.dart
    │   ├── database/daos/{sensing_dao,state_dao,intervention_dao,model_dao}.dart
    │   └── preferences/preferences_store.dart
    └── features/
        ├── sensing/
        │   ├── data/datasources/{motion_data_source,device_state_data_source,
        │   │                     background_sensing_service}.dart
        │   ├── data/repositories/sensing_repository_impl.dart
        │   ├── domain/entities/feature_window.dart
        │   ├── domain/repositories/sensing_repository.dart
        │   └── presentation/providers/sensing_providers.dart
        ├── flow_state/
        │   ├── data/repositories/flow_state_repository_impl.dart
        │   ├── domain/entities/{flow_state.dart,state_reading.dart}
        │   ├── domain/repositories/flow_state_repository.dart
        │   ├── domain/services/flow_classifier.dart
        │   └── presentation/{flow_tone.dart,providers/…,widgets/{breathing_ring,
        │                     state_timeline}.dart}
        ├── intervention/
        │   ├── data/datasources/{intervention_engine,composition_engine,
        │   │                     gemma_llm_engine,notification_data_source}.dart
        │   ├── data/repositories/intervention_repository_impl.dart
        │   ├── domain/entities/{intention.dart,intervention.dart}
        │   ├── domain/repositories/intervention_repository.dart
        │   ├── domain/services/intervention_policy.dart
        │   └── presentation/{pages/intervention_sheet.dart,providers/…,
        │                     widgets/{typing_text,feedback_bar}.dart}
        ├── home/presentation/{pages/home_page.dart,
        │                      widgets/{intention_card,signal_strip,next_step_card}.dart}
        ├── insights/presentation/pages/insights_page.dart
        ├── onboarding/presentation/pages/onboarding_page.dart
        └── settings/{domain/entities/app_settings.dart,
                      presentation/{pages/settings_page.dart,providers/…}}
```

**Reguły zależności egzekwowane w review:**

1. `domain/` nie importuje `package:flutter/*` ani żadnego pluginu — czysty Dart.
2. `data/` implementuje interfejsy z `domain/repositories/`; szczegóły
   pluginów nie wychodzą ponad repozytorium.
3. `presentation/` rozmawia z domeną wyłącznie przez providery Riverpoda.
4. Każdy przepływ ma cztery jawne stany UI: `loading`, `data`, `empty`, `error`.

---

## 4. Konfiguracja i system projektowy

| Plik | Zawartość |
|------|-----------|
| `pubspec.yaml` | Zależności produkcyjne i deweloperskie, assety, fonty zmienne. |
| `analysis_options.yaml` | `strict-casts`/`strict-inference`/`strict-raw-types` + zestaw reguł wymuszających jawność. |
| `core/theme/app_colors.dart` | `KairosPalette` jako `ThemeExtension`: neutralne, tony sześciu stanów, gradienty (w tym sygnaturowa *Aurora*), poświaty, warianty light/dark. |
| `core/theme/app_typography.dart` | Skala typograficzna na fontach zmiennych (oś `wght`), cyfry tabularne dla metryk. |
| `core/theme/app_motion.dart` | Tokeny czasu i krzywych + wariant `reduced` respektujący `disableAnimations`; tokeny geometrii. |
| `core/theme/app_theme.dart` | `ThemeData` light/dark: Material 3, komponenty, przejścia stron z Predictive Back. |
| `tool/fetch_fonts.sh` | Jednorazowe pobranie fontów OFL do `assets/fonts/`. |
| `assets/models/manifest.json` | Rejestr modeli LLM (URL, rozmiar, wymagana pamięć, suma kontrolna). |
| `assets/prompts/intervention_system_pl.txt` | Prompt systemowy interwencji — twarde reguły tonu i długości. |

### Język systemu projektowego

* **Ciemny domyślnie**, jasny w pełni równoprawny — oba przechodzą przez ten sam
  zestaw tokenów, więc nie istnieje „kolor tylko dla dark mode”.
* **Kolor niesie znaczenie**: sześć tonów stanów jest jedynym źródłem koloru
  akcentowego w UI. Nic nie jest kolorowe „dla ozdoby”.
* **Ruch niesie informację**: `deliberate` (620 ms) dla zmiany stanu poznawczego —
  celowo wolniej niż reakcja na dotyk (`quick`, 160 ms), żeby zmiana stanu nie
  wyglądała jak reakcja na kliknięcie.
* **Mikro-interakcje**: pierścień oddechu (4,2 s; 1,8 s gdy stan się zmienia),
  przyrostowe wypisywanie zdania interwencji, haptyka przy reakcji, cross-fade
  zamiast przeskoku przy aktualizacji metryk.
* **Dostępność**: kontrast tekstu ≥ 4.5:1 w obu motywach, warianty `reduced`
  animacji (pierścień przestaje oddychać), cele dotykowe ≥ 44 dp, skala tekstu
  systemowego ograniczona do 1.4, stan komunikowany także ikoną i tekstem — nie
  samym kolorem.

---

## 5. Pętla danych — od próbki do douczenia

```
sensors_plus 10 Hz ─┐
pedometer / bateria ─┼─▶ FeatureAccumulator ──(30 s)──▶ FeatureWindow
cykl pierwszego planu┘                                        │
                                                              ▼
                                            SoftmaxClassifier + histereza
                                                              │
                                                     StateReading (stan, pewność)
                                                              │
                                              InterventionPolicy.evaluate()
                                                    │                  │
                                          Suppress(powód)        Allow
                                                    │                  │
                                        „dlaczego milczę”      silnik: LLM → kompozycja
                                          (widoczne w UI)              │
                                                                 Intervention
                                                                       │
                                                     reakcja użytkownika (3 przyciski)
                                                                       │
                                          ┌────────────────────────────┴───────────┐
                                          ▼                                        ▼
                              SGD na wagach modelu                     adaptacja cooldownu
                              (SQLite: model_state)                    (15–90 min, w ustawieniach)
```

Retencja: surowe okna cech żyją 14 dni, odczyty stanu 60 dni, interwencje
zostają (to na nich uczy się polityka). Czyszczenie startuje przy każdym
uruchomieniu aplikacji, a „Usuń wszystkie dane” w ustawieniach kasuje wszystko
nieodwracalnie.
