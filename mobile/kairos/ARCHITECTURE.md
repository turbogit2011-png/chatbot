# Kairos — koncepcja i architektura

> **Faza 1 + Faza 2.** Ten dokument opisuje koncept, stos technologiczny i strukturę
> projektu. Kod warstw domeny/danych/prezentacji powstaje w Fazie 3.

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
   │ czujnik światła       │──▶│ + klasyfikator stanu  │──▶│ 1 zdanie w kontekście│
   │ cykl on/off ekranu    │   │ (reg. logistyczna     │   │ deklarowanego zamiaru│
   │ krokomierz, bateria   │   │  uczona lokalnie)     │   │ + haptyka, bez dźwięku│
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

**Model prywatności (kontrakt produktowy).** Aplikacja nie ma backendu. Jedyne
połączenie sieciowe w całym cyklu życia to **jednorazowe, jawnie zainicjowane przez
użytkownika pobranie modelu LLM**. Po nim aplikacja działa w pełni offline —
weryfikowalnie, bo brak jakiegokolwiek klienta HTTP w warstwie danych domenowych
(`dio` jest wstrzykiwany wyłącznie do `ModelDownloadRepository`).

### Uczciwe ograniczenia (zapisane wprost, nie ukryte)

* **iOS nie oddaje ciągłego tła.** Na iOS pętla `SENSE` działa: (a) na pierwszym
  planie w czasie rzeczywistym, (b) w tle przez `CMMotionActivity`/`CMPedometer`
  (dane historyczne odczytywane przy każdym `BGAppRefreshTask`), (c) podczas sesji
  skupienia uruchomionej przez użytkownika. Interwencje predykcyjne w tle na iOS są
  z natury rzadsze niż na Androidzie — UI komunikuje to wprost, zamiast obiecywać
  parytet.
* **Android wymaga usługi pierwszoplanowej** (`foregroundServiceType="health"`) ze
  stałą, informacyjną notyfikacją. To świadomy koszt uczciwości wobec użytkownika.
* **Czujnik światła** istnieje wyłącznie na Androidzie — cecha `ambientLux` jest
  opcjonalna, a klasyfikator obsługuje jej brak (maskowanie cechy, nie zero).
* **Klasyfikator jest heurystyką kalibrowaną, nie diagnozą medyczną.** Aplikacja
  nie stawia rozpoznań i nie używa słownictwa klinicznego.

---

## 2. Stos technologiczny i uzasadnienie

| Warstwa | Wybór | Uzasadnienie |
|---------|-------|--------------|
| Framework | **Flutter 3.35+ / Dart 3.9** | Jeden zestaw sensorów i UI na dwie platformy; izolaty Darta pozwalają liczyć cechy sygnału poza wątkiem UI bez natywnego kodu. |
| Stan / DI | **Riverpod 3 + codegen** | Kompilacyjnie bezpieczne DI bez `BuildContext`, `AsyncValue` jako natywny model stanów `loading/data/error`, testowalność przez `ProviderContainer` z nadpisaniami. |
| Nawigacja | **go_router 16** | Deklaratywne trasy, deep-linki z notyfikacji interwencji, przewidywalny stos przy powrocie z tła. |
| Modele | **freezed + json_serializable** | Niezmienne encje, `sealed`/`switch` bez domyślnej gałęzi → kompilator pilnuje kompletności obsługi stanów. |
| Błędy | **fpdart (`TaskEither`)** | Repozytoria zwracają `Either<Failure, T>` — brak niejawnych wyjątków przekraczających granice warstw. |
| Baza lokalna | **Drift (SQLite)** | Szeregi czasowe cech + indeksy po czasie, migracje wersjonowane, zapytania agregujące (okna 7/30 dni) po stronie SQL, szyfrowanie klucza w `flutter_secure_storage`. |
| Sensory | **sensors_plus, pedometer, light, battery_plus** | Stabilne, utrzymywane pluginy z jednolitym API strumieni. |
| Tło | **flutter_foreground_task** (Android) + **workmanager** (BGTaskScheduler na iOS) | Podział zgodny z realiami platform, nie z pobożnymi życzeniami. |
| LLM | **flutter_gemma** (MediaPipe LLM Inference, Gemma 3 1B int4) | Inferencja na GPU/NNAPI, ~550 MB, mieści się w budżecie pamięci telefonu średniej klasy; deterministyczny fallback szablonowy, gdy model nie jest pobrany. |
| Klasyfikator | **czysty Dart** (regresja logistyczna + SGD) | Zero zależności natywnych, w pełni audytowalny, trenowalny na urządzeniu, serializowalny do SQLite. |
| Animacje | **flutter_animate + CustomPainter** | Sygnaturowy „pierścień oddechu” rysowany shaderem/painterem; reszta deklaratywnie. |
| Wykresy | **fl_chart 1.x** | Oś czasu stanów i histogramy skuteczności interwencji. |

**Czego świadomie NIE ma:** Firebase, Supabase, Sentry, analityki, reklam, kont
użytkownika, uprawnień do lokalizacji, mikrofonu i kamery. Każdy z tych elementów
łamałby UVP.

---

## 3. Struktura projektu (Clean Architecture)

Podział pionowy po **funkcjach** (feature-first), poziomy po **warstwach**.
Zależności wskazują wyłącznie do środka: `presentation → domain ← data`.

```
mobile/kairos/
├── pubspec.yaml
├── analysis_options.yaml
├── ARCHITECTURE.md
├── tool/
│   └── fetch_fonts.sh
├── assets/
│   ├── fonts/                     # fonty zmienne (pobierane skryptem)
│   ├── icons/
│   ├── models/manifest.json       # rejestr modeli LLM (bez wag)
│   └── prompts/intervention_system_pl.txt
└── lib/
    ├── main.dart                             # bootstrap + ProviderScope
    ├── app/
    │   ├── kairos_app.dart                   # MaterialApp.router
    │   ├── router/app_router.dart            # go_router + deep-linki
    │   └── bootstrap.dart                    # inicjalizacja DB, uprawnień, tła
    ├── core/
    │   ├── theme/
    │   │   ├── app_colors.dart               # KairosPalette (ThemeExtension)
    │   │   ├── app_typography.dart           # skala typograficzna
    │   │   ├── app_motion.dart               # tokeny ruchu + geometrii
    │   │   └── app_theme.dart                # ThemeData light/dark
    │   ├── error/
    │   │   ├── failure.dart                  # sealed Failure
    │   │   └── error_mapper.dart             # wyjątek → Failure (granica warstw)
    │   ├── result/typedefs.dart              # FutureEither<T>
    │   ├── logging/app_logger.dart
    │   ├── permissions/permission_service.dart
    │   ├── time/clock.dart                   # wstrzykiwany zegar (testy)
    │   ├── math/                             # statystyki sygnału (czysty Dart)
    │   │   ├── running_stats.dart
    │   │   ├── signal_features.dart
    │   │   └── logistic_regression.dart
    │   └── widgets/                          # współdzielone prymitywy UI
    │       ├── glass_card.dart
    │       ├── state_badge.dart
    │       ├── error_view.dart
    │       ├── empty_view.dart
    │       └── shimmer_box.dart
    ├── features/
    │   ├── sensing/                          # pozyskiwanie sygnału
    │   │   ├── data/
    │   │   │   ├── datasources/
    │   │   │   │   ├── motion_data_source.dart
    │   │   │   │   ├── ambient_data_source.dart
    │   │   │   │   ├── device_state_data_source.dart
    │   │   │   │   └── background_sensing_service.dart
    │   │   │   ├── models/sensor_sample_dto.dart
    │   │   │   └── repositories/sensing_repository_impl.dart
    │   │   ├── domain/
    │   │   │   ├── entities/{sensor_sample.dart,feature_window.dart}
    │   │   │   ├── repositories/sensing_repository.dart
    │   │   │   └── usecases/{start_sensing.dart,stop_sensing.dart,
    │   │   │                 watch_feature_window.dart}
    │   │   └── presentation/providers/sensing_providers.dart
    │   ├── flow_state/                       # wnioskowanie o stanie
    │   │   ├── data/
    │   │   │   ├── datasources/local_model_store.dart
    │   │   │   ├── models/flow_state_dto.dart
    │   │   │   └── repositories/flow_state_repository_impl.dart
    │   │   ├── domain/
    │   │   │   ├── entities/{flow_state.dart,state_reading.dart,
    │   │   │   │             calibration_profile.dart}
    │   │   │   ├── repositories/flow_state_repository.dart
    │   │   │   ├── services/flow_classifier.dart     # czysta logika
    │   │   │   └── usecases/{classify_window.dart,watch_current_state.dart,
    │   │   │                 calibrate_from_feedback.dart}
    │   │   └── presentation/
    │   │       ├── providers/flow_state_providers.dart
    │   │       └── widgets/{breathing_ring.dart,state_timeline.dart}
    │   ├── intervention/                     # generowanie i doręczanie zdania
    │   │   ├── data/
    │   │   │   ├── datasources/{gemma_llm_data_source.dart,
    │   │   │   │                template_fallback_data_source.dart,
    │   │   │   │                notification_data_source.dart}
    │   │   │   └── repositories/intervention_repository_impl.dart
    │   │   ├── domain/
    │   │   │   ├── entities/{intervention.dart,intention.dart,
    │   │   │   │             intervention_feedback.dart}
    │   │   │   ├── repositories/intervention_repository.dart
    │   │   │   ├── services/intervention_policy.dart # kiedy WOLNO przerwać
    │   │   │   └── usecases/{generate_intervention.dart,
    │   │   │                 record_feedback.dart,list_history.dart}
    │   │   └── presentation/
    │   │       ├── providers/intervention_providers.dart
    │   │       ├── pages/intervention_sheet.dart
    │   │       └── widgets/{typing_text.dart,feedback_bar.dart}
    │   ├── home/                             # ekran główny „Puls”
    │   │   └── presentation/
    │   │       ├── pages/home_page.dart
    │   │       └── widgets/{pulse_header.dart,signal_strip.dart,
    │   │                    intention_card.dart,next_step_card.dart}
    │   ├── insights/                         # historia i skuteczność
    │   │   ├── data/repositories/insights_repository_impl.dart
    │   │   ├── domain/{entities,repositories,usecases}/…
    │   │   └── presentation/{pages/insights_page.dart,widgets/…}
    │   ├── onboarding/
    │   │   └── presentation/pages/{welcome_page.dart,permissions_page.dart,
    │   │                           intention_setup_page.dart,model_setup_page.dart}
    │   └── settings/
    │       ├── data/repositories/settings_repository_impl.dart
    │       ├── domain/{entities/app_settings.dart,repositories,usecases}/…
    │       └── presentation/pages/settings_page.dart
    └── data/                                 # infrastruktura współdzielona
        ├── database/
        │   ├── kairos_database.dart          # Drift: schemat + migracje
        │   ├── tables/{sensor_windows.dart,state_readings.dart,
        │   │            interventions.dart,intentions.dart,model_weights.dart}
        │   └── daos/{sensing_dao.dart,state_dao.dart,intervention_dao.dart}
        └── preferences/preferences_store.dart
```

**Reguły zależności egzekwowane w review:**

1. `domain/` nie importuje `package:flutter/*` ani żadnego pluginu — czysty Dart.
2. `data/` implementuje interfejsy z `domain/repositories/`; DTO nigdy nie wyciekają
   powyżej repozytorium.
3. `presentation/` rozmawia wyłącznie z use-case'ami przez providery Riverpod.
4. Każdy przepływ ma cztery jawne stany UI: `loading`, `data`, `empty`, `error`.

---

## 4. Konfiguracja (Faza 2 — dostarczona)

| Plik | Zawartość |
|------|-----------|
| `pubspec.yaml` | Pełna lista zależności produkcyjnych i deweloperskich, assety, fonty zmienne. |
| `analysis_options.yaml` | `strict-casts`/`strict-inference`/`strict-raw-types`, `custom_lint` + `riverpod_lint`, zestaw reguł wymuszających jawność. |
| `lib/core/theme/app_colors.dart` | `KairosPalette` jako `ThemeExtension`: neutralne, tony sześciu stanów, gradienty (w tym sygnaturowa *Aurora*), poświaty, warianty light/dark. |
| `lib/core/theme/app_typography.dart` | Skala typograficzna na fontach zmiennych (oś `wght`), cyfry tabularne dla metryk. |
| `lib/core/theme/app_motion.dart` | Tokeny czasu i krzywych + wariant `reduced` respektujący `disableAnimations`; tokeny geometrii. |
| `lib/core/theme/app_theme.dart` | `ThemeData` light/dark: Material 3, komponenty (przyciski, pola, arkusze, nawigacja), przejścia stron z Predictive Back. |
| `tool/fetch_fonts.sh` | Jednorazowe pobranie fontów OFL do `assets/fonts/`. |
| `assets/models/manifest.json` | Rejestr modeli LLM (URL, rozmiar, wymagana pamięć, suma kontrolna). |
| `assets/prompts/intervention_system_pl.txt` | Prompt systemowy interwencji — twarde reguły tonu i długości. |

### Język systemu projektowego

* **Ciemny domyślnie**, jasny w pełni równoprawny — oba przechodzą przez ten sam
  zestaw tokenów, więc nie istnieje „kolor tylko dla dark mode”.
* **Kolor niesie znaczenie**: sześć tonów stanów jest jedynym źródłem koloru
  akcentowego w UI. Nic w interfejsie nie jest kolorowe „dla ozdoby”.
* **Ruch niesie informację**: `deliberate` (620 ms) dla zmiany stanu poznawczego —
  celowo wolniej niż reakcja na dotyk (`quick`, 160 ms), żeby zmiana stanu nie
  wyglądała jak reakcja na kliknięcie.
* **Mikro-interakcje**: pierścień oddechu (4,2 s cykl), przyrostowe wypisywanie
  zdania interwencji, haptyka `HapticFeedback.selectionClick` przy zmianie stanu,
  cross-fade zamiast przeskoku przy aktualizacji metryk.
* **Dostępność**: kontrast tekstu ≥ 4.5:1 w obu motywach, warianty `reduced`
  animacji, cele dotykowe ≥ 48 dp, etykiety semantyczne dla stanów (nie polegamy
  wyłącznie na kolorze).
