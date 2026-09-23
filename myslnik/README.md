# Myślnik

Osobisty łapacz zadań i myśli z niezawodnymi przypomnieniami na Xiaomi (HyperOS, Android 16+).
Offline, bez kont, bez reklam, **bez uprawnienia INTERNET**. Interfejs po polsku, ciemny motyw.

## Gotowy APK

Podpisany plik instalacyjny leży w tym repozytorium: **`myslnik/apk/myslnik-v1.0.apk`**.
Nie musisz nic budować — wystarczy go zainstalować (instrukcja niżej).

## ⚠️ KLUCZ PODPISU — MUSISZ GO ZACHOWAĆ

APK w `apk/` jest podpisany kluczem `myslnik-release.jks` (alias `myslnik`).
**Każda przyszła wersja musi być podpisana tym samym kluczem**, inaczej Android każe
najpierw odinstalować starą wersję i STRACISZ dane.

* Klucz i hasła są celowo **poza repozytorium** (`keystore/` i `keystore.properties`
  są w `.gitignore`). Dostałeś je osobno — zapisz oba pliki w bezpiecznym miejscu
  (np. prywatny dysk w chmurze + pendrive).
* Przy budowaniu połóż je tak: `myslnik/keystore/myslnik-release.jks` oraz
  `myslnik/keystore.properties` (wzór: `keystore.properties.example`).
* Bez `keystore.properties` Gradle zbuduje wersję release **niepodpisaną** — nie instaluj
  jej na starą.

## Instalacja na Xiaomi (krok po kroku, bez Android Studio)

1. Skopiuj `myslnik/apk/myslnik-v1.0.apk` na telefon (np. przez kabel USB, Dysk Google
   albo wyślij sam do siebie mailem).
2. Na telefonie otwórz plik w aplikacji **Pliki** (Menedżer plików).
3. Telefon zapyta o zgodę na instalację z nieznanych źródeł — zezwól dla tej aplikacji.
4. Dotknij **Zainstaluj**. Jeśli pojawi się ostrzeżenie Play Protect, wybierz
   „Zainstaluj mimo to" (aplikacja nie pochodzi ze Sklepu Play, to normalne).
5. Uruchom Myślnik. Przy pierwszym starcie zobaczysz ekran **NIEZAWODNOŚĆ** —
   przejdź całą listę i doprowadź każdy punkt do zielonego. To najważniejszy krok
   na Xiaomi! Bez tego HyperOS może wyciszać przypomnienia.
6. Na końcu dotknij **TEST PRZYPOMNIENIA**, zablokuj telefon i odłóż go.
   Przypomnienia mają przyjść za 1 i 5 minut (drugie jako PILNE z pełnym ekranem).

## Budowanie w Android Studio (gdy chcesz zmienić coś w kodzie)

1. Zainstaluj **Android Studio** (najnowsze stabilne) z developer.android.com.
2. Otwórz folder `myslnik` (File → Open… → wskaż katalog `myslnik`, nie cały repozytorium).
3. Poczekaj aż Gradle się zsynchronizuje (pasek na dole).
4. Menu **Build → Generate Signed App Bundle / APK… → APK** →
   wskaż `keystore/myslnik-release.jks`, alias `myslnik`, hasła z `keystore.properties` →
   wariant **release** → Finish.
   Albo w terminalu Android Studio: `./gradlew assembleRelease`
   (gotowy APK: `app/build/outputs/apk/release/app-release.apk`).
5. Testy: `./gradlew test`.

## Co jest w środku (skrót)

* Kotlin + Jetpack Compose (Material 3), MVVM, ręczne DI, Room (z migracjami, bez
  destrukcyjnych fallbacków), DataStore, WorkManager, Glance (widżety).
* Łańcuch alarmów `AlarmManager.setAlarmClock()` — w systemie zawsze jeden alarm na
  najbliższe zdarzenie; odtwarzany po restarcie, aktualizacji, zmianie czasu i strefy.
* Własny offline'owy parser polskich terminów („jutro o 9", „w piątek", „za 20 minut",
  „o wpół do ósmej", „15 października o 10"…).
* Kopia zapasowa: eksport/import JSON + automatyczna kopia dzienna do wskazanego
  folderu (SAF), trzymane ostatnie 7 plików.
