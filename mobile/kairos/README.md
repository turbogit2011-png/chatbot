# Kairos

**Predykcyjny kopilot uwagi.** Nie liczy czasu przed ekranem — rozpoznaje moment
tuż przed utratą uwagi i mówi jedno zdanie, w kontekście tego, nad czym akurat
pracujesz. Cała analiza dzieje się na urządzeniu.

* **Koncept, architektura, decyzje inżynierskie** → [`ARCHITECTURE.md`](ARCHITECTURE.md)
* **Uruchomienie, konfiguracja platform, buildy** → [`DEPLOYMENT.md`](DEPLOYMENT.md)

## Szybki start

```bash
flutter create . --project-name kairos --org com.kairos --platforms=android,ios
./tool/fetch_fonts.sh
flutter pub get
flutter test
flutter run
```

## W skrócie

| | |
|---|---|
| Stos | Flutter 3.32+ · Riverpod 2 · go_router · sqflite · fpdart |
| Sensory | akcelerometr, żyroskop, orientacja, krokomierz, bateria |
| Model | softmax + SGD uczony na urządzeniu (czysty Dart) |
| Treść interwencji | lokalny SLM (opcjonalnie) lub deterministyczny silnik kompozycyjny |
| Sieć | **brak** — w zależnościach nie ma klienta HTTP |
| Kod generowany | **brak** — projekt kompiluje się od razu po `flutter pub get` |
