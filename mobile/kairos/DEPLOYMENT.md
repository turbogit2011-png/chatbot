# Kairos — uruchomienie, konfiguracja platform, build

> Faza 4. Komendy są kompletne — od pustego katalogu do pliku `.aab` / `.ipa`.
> Wszystko wykonujemy z katalogu `mobile/kairos`.

## 0. Wymagania

| Narzędzie | Wersja |
|-----------|--------|
| Flutter | ≥ 3.32 (kanał stable) |
| Dart | ≥ 3.8 (dostarczany z Flutterem) |
| Android SDK | platforma 35, **minSdk 26** |
| Xcode | ≥ 15, **iOS Deployment Target 13.0** |
| JDK | 17 |

```bash
flutter --version          # sprawdź, czy ≥ 3.32.0
flutter doctor -v          # zielone: Flutter, Android toolchain, Xcode (na macOS)
```

## 1. Wygenerowanie katalogów platformowych

Repozytorium zawiera kod Dart, konfigurację i zasoby — **bez** katalogów
`android/` i `ios/`, bo są w całości generowalne i zaśmiecają diffy.

```bash
cd mobile/kairos

# Uzupełnia projekt o android/ i ios/. Nie nadpisuje istniejącego lib/.
flutter create . --project-name kairos --org com.kairos --platforms=android,ios

# Gdyby narzędzie podmieniło pliki źródłowe (zdarza się dla lib/main.dart):
git checkout -- lib pubspec.yaml
```

## 2. Zasoby i zależności

```bash
./tool/fetch_fonts.sh      # jednorazowo: fonty zmienne (OFL) do assets/fonts/
flutter pub get
```

## 3. Konfiguracja Androida

### 3.1 `android/app/src/main/AndroidManifest.xml`

W sekcji `<manifest>`, **przed** `<application>`:

```xml
<!-- Krokomierz (opcjonalny — bez zgody działa wszystko poza cechą stepRate) -->
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<!-- Powiadomienia z interwencjami (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<!-- Usługa pierwszoplanowa utrzymująca nasłuch -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_HEALTH" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

W znaczniku `<application>` dopisz atrybuty — aplikacja bez kopii zapasowych
w chmurze to część kontraktu prywatności:

```xml
<application
    android:label="Kairos"
    android:allowBackup="false"
    android:fullBackupContent="false"
    android:dataExtractionRules="@xml/data_extraction_rules"
    ... >
```

Wewnątrz `<application>` zadeklaruj usługę pluginu pracy w tle:

```xml
<service
    android:name="com.pravera.flutter_foreground_task.service.ForegroundService"
    android:foregroundServiceType="health"
    android:exported="false" />
```

Utwórz `android/app/src/main/res/xml/data_extraction_rules.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup><exclude domain="root" /></cloud-backup>
    <device-transfer><exclude domain="root" /></device-transfer>
</data-extraction-rules>
```

### 3.2 `android/app/build.gradle.kts`

```kotlin
android {
    compileSdk = 35

    defaultConfig {
        applicationId = "com.kairos.kairos"
        minSdk = 26          // wymagane przez MediaPipe LLM Inference
        targetSdk = 35
        multiDexEnabled = true
    }

    compileOptions {
        // flutter_local_notifications wymaga desugarowania java.time
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
```

## 4. Konfiguracja iOS

### 4.1 `ios/Runner/Info.plist`

```xml
<key>NSMotionUsageDescription</key>
<string>Kairos czyta czujnik ruchu, żeby rozpoznać moment utraty uwagi. Dane nie opuszczają urządzenia.</string>

<key>UIBackgroundModes</key>
<array>
    <string>processing</string>
</array>
```

### 4.2 `ios/Podfile`

```ruby
platform :ios, '13.0'
```

```bash
cd ios && pod install && cd ..
```

> **Uwaga o realiach iOS:** system nie pozwala na ciągłe próbkowanie czujników
> w tle. Na iOS Kairos czyta sygnał na pierwszym planie i przy przebudzeniach
> systemowych. Przełącznik „nasłuch poza aplikacją” w ustawieniach jest tam
> nieaktywny — aplikacja mówi o tym wprost, zamiast obiecywać parytet.

## 5. Weryfikacja i uruchomienie

```bash
flutter analyze            # tryb ścisły analizatora, zero ostrzeżeń oczekiwane
flutter test               # testy jednostkowe i widżetów
flutter devices            # lista podłączonych urządzeń

flutter run -d <device_id>                  # debug
flutter run -d <device_id> --profile        # profil (pomiar wydajności)
```

Aplikacja startuje z **wyłączonym** nasłuchem — to świadoma decyzja
projektowa. Włącz go przyciskiem „Włącz nasłuch”; pierwszy odczyt stanu
pojawi się po zamknięciu pierwszego okna, czyli po ~30 sekundach.

### Szybszy feedback przy pracy nad UI

Skróć okno obserwacji, żeby nie czekać 30 s na każdy odczyt — w
`lib/app/di.dart`, w `sensingRepositoryProvider`:

```dart
final SensingRepositoryImpl repository = SensingRepositoryImpl(
  clock: ref.watch(clockProvider),
  windowLength: const Duration(seconds: 5), // tylko na czas developmentu
);
```

## 6. Instalacja lokalnego modelu językowego (opcjonalna)

Aplikacja działa w pełni bez modelu — używa wtedy silnika kompozycyjnego.
Model dodaje różnorodność zdań i **nigdy nie jest pobierany automatycznie**.

```bash
# 1. Pobierz wagi na komputer (wymaga konta Hugging Face i akceptacji licencji Gemma)
#    https://huggingface.co/litert-community/Gemma3-1B-IT  →  gemma3-1b-it-int4.task

# 2. Android — wgraj plik do katalogu dokumentów aplikacji (build debug):
adb push gemma3-1b-it-int4.task /data/local/tmp/
adb shell run-as com.kairos.kairos \
    cp /data/local/tmp/gemma3-1b-it-int4.task \
       /data/data/com.kairos.kairos/app_flutter/gemma3-1b-it-int4.task

# 3. iOS — Xcode → Window → Devices and Simulators → wybierz aplikację →
#    „Download/Replace Container” i umieść plik w katalogu Documents.
```

Sprawdź w aplikacji: **Ustawienia → Lokalny model językowy** — status zmieni
się na „Wagi modelu są zainstalowane na urządzeniu”.

Rejestr obsługiwanych modeli (nazwy plików, rozmiary, wymagana pamięć):
`assets/models/manifest.json`.

## 7. Buildy produkcyjne

### Android

```bash
# Klucz podpisujący (jednorazowo)
keytool -genkey -v -keystore ~/kairos-release.jks -keyalg RSA \
        -keysize 2048 -validity 10000 -alias kairos

# android/key.properties  (plik jest w .gitignore)
# storePassword=...
# keyPassword=...
# keyAlias=kairos
# storeFile=/Users/<ty>/kairos-release.jks

flutter build appbundle --release      # build/app/outputs/bundle/release/app-release.aab
flutter build apk --release --split-per-abi   # APK-i do instalacji ręcznej
```

### iOS

```bash
flutter build ipa --release
# build/ios/archive/Runner.xcarchive → Xcode Organizer → dystrybucja
```

## 8. Rozwiązywanie problemów

| Objaw | Przyczyna i naprawa |
|-------|---------------------|
| `no file or variants found for asset: assets/fonts/Sora-Variable.ttf` | Fonty nie są wersjonowane w repo. Uruchom `./tool/fetch_fonts.sh` (krok 2). |
| `flutter pub get` nie rozwiązuje wersji | Twoje SDK jest nowsze niż przypięte zakresy. `flutter pub upgrade --major-versions`, potem `flutter analyze`. |
| Błąd kompilacji w `gemma_llm_engine.dart` | Rozwiązana wersja `flutter_gemma` ma inne API. To jedyny plik zależny od tego pluginu — dostosuj go albo usuń plik i providera `gemmaEngineProvider` w `lib/app/di.dart`; aplikacja działa dalej na silniku kompozycyjnym. |
| Błąd kompilacji w `background_sensing_service.dart` | To samo dla `flutter_foreground_task`. Bez tego pliku działa nasłuch na pierwszym planie. |
| Brak odczytów stanu mimo włączonego nasłuchu | Okno trwa 30 s. Sprawdź pasek „Sygnał na żywo” — jeśli licznik próbek stoi na zerze, czujniki są zablokowane przez system (tryb oszczędzania energii). |
| Powiadomienia nie docierają | Android 13+ wymaga `POST_NOTIFICATIONS`. Ekran główny pokaże ostrzeżenie „System blokuje powiadomienia”. |
| Krokomierz nie działa | Brak `ACTIVITY_RECOGNITION` albo urządzenie nie ma czujnika. Aplikacja degraduje się do wektora cech bez `stepRate`. |
| `MissingPluginException` po dodaniu zależności | Pełny restart aplikacji (hot reload nie rejestruje pluginów): `flutter clean && flutter pub get && flutter run`. |
