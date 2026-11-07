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
├── engine/    silnik renderujący w telefonie (DSP, aranżer, miks, AAC, okładki, teksty)
├── data/      remote (Retrofit+DTO), local (Room), prefs (DataStore), audio, repo
├── work/      LocalRenderWorker (render na telefonie) + GenerationWorker (polling serwera)
├── player/    PlaybackService (Media3) + PlayerController
├── ui/        create, library, player, settings, onboarding, components, theme
└── di/        ServiceLocator
```

## Silnik w aplikacji

Pakiet `engine/` to kompletny renderer: komponuje aranż, gra go, miksuje i masteruje,
a potem koduje do AAC (.m4a) przez `MediaCodec`. Poza `AacEncoder` i `CoverArtist` jest
to czysty Kotlin bez zależności od Androida, dzięki czemu cały łańcuch testuje się na
JVM — `./gradlew testDebugUnitTest` renderuje prawdziwe utwory do `build/test-audio/`
i mierzy tempo, poziom, przesterowanie i zużycie pamięci.

Szczegóły projektowe (render blokowy, szacowanie poziomów, extend bez dekodera):
[`../docs/ENGINES.md`](../docs/ENGINES.md).

## Testy

```bash
./gradlew testDebugUnitTest     # 18 testów silnika na JVM
./gradlew lintVitalRelease      # lint wydania
```

## Uwagi

* Domyślnie aplikacja renderuje na telefonie i nie potrzebuje żadnej sieci. Tryb
  serwerowy włącza się w Ustawieniach.
* Adres serwera i klucz API ustawia się w aplikacji (Ustawienia / onboarding) — nie są
  wkompilowane. `DynamicHostInterceptor` przepisuje każde żądanie na aktualny adres.
* `usesCleartextTraffic` jest włączone, bo typowy serwer w sieci lokalnej działa po HTTP.
  Przy wystawianiu serwera do internetu użyj HTTPS i wyłącz tę flagę w manifeście.
* Odtwarzanie działa w tle przez `MediaSessionService` — sterowanie z powiadomienia
  i ekranu blokady.
