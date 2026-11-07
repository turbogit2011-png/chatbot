# Sonara Studio (Android)

Kotlin · Jetpack Compose (Material 3) · Room · Media3 · WorkManager · DataStore · Retrofit

* `minSdk` 26 (Android 8.0), `targetSdk` 35, `compileSdk` 35
* pakiet: `com.sonara.studio`

## Budowa

```bash
echo "sdk.dir=/ścieżka/do/Android/Sdk" > local.properties
./gradlew assembleDebug      # app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease    # app/build/outputs/apk/release/app-release.apk
```

Wydanie jest podpisywane kluczem z `app/sonara-release.jks` (nie jest w repozytorium).
Własny klucz:

```bash
keytool -genkeypair -v -keystore app/sonara-release.jks -alias sonara \
  -keyalg RSA -keysize 2048 -validity 10000
export SONARA_STORE_PASSWORD=... SONARA_KEY_ALIAS=sonara SONARA_KEY_PASSWORD=...
./gradlew assembleRelease
```

## Struktura

```
com.sonara.studio
├── data/      remote (Retrofit+DTO), local (Room), prefs (DataStore), audio, repo
├── work/      GenerationWorker — polling zadań w tle
├── player/    PlaybackService (Media3) + PlayerController
├── ui/        create, library, player, settings, onboarding, components, theme
└── di/        ServiceLocator
```

## Uwagi

* Adres serwera i klucz API ustawia się w aplikacji (Ustawienia / onboarding) — nie są
  wkompilowane. `DynamicHostInterceptor` przepisuje każde żądanie na aktualny adres.
* `usesCleartextTraffic` jest włączone, bo typowy serwer w sieci lokalnej działa po HTTP.
  Przy wystawianiu serwera do internetu użyj HTTPS i wyłącz tę flagę w manifeście.
* Odtwarzanie działa w tle przez `MediaSessionService` — sterowanie z powiadomienia
  i ekranu blokady.
