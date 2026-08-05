# Audyt techniczny — TurboOS OBD 0.2.0 (`com.turbogit.turboos`)

Analiza artefaktu `TurboOSOBD0.2.0READONLY_3.apk` (1,59 MB, versionCode 2, minSdk 26, targetSdk 35).

## Zakres i metoda

Dostarczono wyłącznie skompilowany APK — nie kod źródłowy. Analiza objęła:

| Warstwa | Materiał | Narzędzie |
|---|---|---|
| Manifest, uprawnienia, podpis | `AndroidManifest.xml` (AXML), blok podpisu | androguard 4.1.4 |
| Kod natywny | `classes2–6.dex` → 92 klasy `com.turbogit.turboos.*` | dekompilator DAD |
| Warstwa webowa | `assets/assets/index-siXgiMlk.js` (313 kB, zminifikowany) | prettier + analiza ręczna |
| PWA | `index.html`, `service-worker.js`, `manifest.webmanifest` | analiza ręczna |

Architektura: hybryda **WebView + React 19 + natywny most Kotlin**. Strona ładowana lokalnie
przez `WebViewAssetLoader` z `https://appassets.androidplatform.net/index.html`, komunikacja
z magistralą OBD przez `Elm327Client` (Bluetooth Classic / SPP) oraz `VgateBleClient` (BLE GATT).

**Co jest zrobione dobrze** (i czego nie należy przy refaktoryzacji zepsuć): brak jakichkolwiek
zaszytych kluczy, tokenów i adresów zdalnych — aplikacja jest w pełni offline; `blockNetworkLoads
= true`; `allowFileAccess`/`allowUniversalAccessFromFileURLs` wyłączone; wstrzykiwanie JS przez
`JSONObject.quote()` zamiast konkatenacji; whitelist nazw callbacków, nazw plików CSV i limit
1 MB eksportu; maskowanie adresów MAC; walidacja kopert JSON po stronie webowej; rygorystyczna
polityka statusu Mode 03 (brak pewności = błąd, nie pusta lista).

---

## 1. Wykaz podatności i błędów

### 🔴 Krytyczne

<a id="k1"></a>
#### K1 — Artefakt produkcyjny zbudowany i podpisany jako kompilacja debug

| Dowód | Wartość |
|---|---|
| `AndroidManifest.xml` | `android:debuggable="true"` |
| `BuildConfig.BUILD_TYPE` | `"debug"` |
| `BuildConfig.DEBUG` | `Boolean.parseBoolean("true")` → `true` |
| Certyfikat podpisu | `CN=Android Debug, O=Android, C=US` (tylko schemat v2) |
| Minifikacja | brak — pełne nazwy klas i metod czytelne wprost z APK |

Konsekwencje łączą się kaskadowo. `MainActivity.configureWebView()` wywołuje
`WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)`, więc w tym artefakcie zdalna
inspekcja WebView jest **włączona**. Każdy, kto ma dostęp do ADB (włączone debugowanie USB,
złośliwa aplikacja z uprawnieniem `RUN_AS`, serwis warsztatowy), może przez DevTools wykonać
dowolny kod w kontekście strony, a przez to wywołać cały most `TurboOSAndroid` — łącznie
z `readVehicleInfo()` (VIN), `readDtcs()` i `clearDtcs()`. `android:debuggable="true"` dodatkowo
pozwala podpiąć debugger do procesu i odczytać pamięć.

Osobno: klucz debug uniemożliwia publikację i aktualizacje w Google Play, a brak R8 oznacza,
że komunikaty diagnostyczne i struktura protokołu są dostępne wprost.

**Uwaga do nazwy artefaktu.** Plik nosi oznaczenie `READONLY`, ale most wystawia `clearDtcs()`,
które wysyła do ECU **Mode 04 (Clear Diagnostic Information)** — operację zapisu kasującą kody
usterek, dane freeze-frame i status gotowości monitorów. To rozbieżność między deklarowaną
a rzeczywistą charakterystyką kompilacji.

*Naprawa:* [`android/build.gradle.kts.sample`](android/build.gradle.kts.sample),
[`android/proguard-rules.pro`](android/proguard-rules.pro),
[`android/src/main/AndroidManifest.xml`](android/src/main/AndroidManifest.xml).

<a id="k2"></a>
#### K2 — Błędne dekodowanie kodów usterek na magistrali CAN

`ObdParser.parseDtcs()` szuka bajtu usługi (`0x43` dla Mode 03) i od razu czyta następujące po
nim bajty parami jako kody DTC:

```java
int v1_0 = (p7.indexOf(Integer.valueOf(p8)) + 1);   // pozycja tuż za 0x43
while ((v1_0 + 1) < p7.size()) {
    ...add(this.decodeDtc(v2_2, v3_4));             // para bajtów → kod
    v1_0 += 2;
}
```

W ISO 15765-4 (CAN) — protokole każdego pojazdu po ~2008 roku — pierwszym bajtem po usłudze
jest **liczba zgłoszonych kodów**, a nie dane kodu. Parser konsumuje go jako połowę pierwszego
DTC i przesuwa cały odczyt o jeden bajt.

Przykład dla odpowiedzi `43 02 01 43 01 96` (dwa kody: P0143, P0196):

| | bajty | wynik |
|---|---|---|
| Oczekiwany | `01 43`, `01 96` | **P0143**, **P0196** |
| Wersja 0.2.0 | `02 01`, `43 01` | **P0201**, **C0301** |

Ta sama wada dotyczy Mode 07 (`0x47`) i Mode 0A (`0x4A`), a więc kodów oczekujących
i trwałych. W narzędziu, na podstawie którego mechanik wycenia naprawę turbosprężarki,
oznacza to prezentację nieistniejących usterek i przemilczenie prawdziwych.

**Drugi, sprzężony defekt w tym samym parserze.** `hexByteLines()` zdejmuje z linii prefiks
indeksu ramki ISO-TP (`0:`, `1:`, …) regexem `FRAME_PREFIX`, po czym traktuje **każdą linię jako
niezależną ramkę**. Odpowiedź wieloramkowa, którą ELM327 wypisuje jako:

```
009
0: 43 03 02 99 25 63
1: 00 AF 00 00 00 00 00
```

jest w rzeczywistości jedną wiadomością (3 kody: P0299, P2563, P00AF). Rozdzielenie jej na linie
rozrywa parę bajtów `25 63` / `00 AF` między ramki, więc kod P00AF nie może zostać odtworzony
w ogóle. Poprawka wymaga sklejania ramek o rosnącym indeksie w jedną wiadomość.

Efekt obu wad jest dodatkowo maskowany: `TurboOsAndroidBridge.DTC_DESCRIPTIONS` zawiera opisy
tylko dla `P0299` i `P2563`, więc błędne kody trafiają do UI po prostu bez opisu — nieodróżnialnie
od rzadkiego, ale prawdziwego kodu.

*Naprawa:* [`ObdParser`](android/src/main/java/com/turbogit/turboos/obd/ObdParser.kt) —
`hexByteLines()` skleja ramki ISO-TP, `decodeDtcBody()` rozpoznaje bajt licznika heurystyką
weryfikowaną długością wiadomości (dzięki czemu ISO 9141-2 / KWP2000 bez licznika nadal parsują
się poprawnie), a wyszukiwanie bajtu usługi ogranicza się do pierwszego wystąpienia — bajt danych
DTC może mieć tę samą wartość co usługa (P0143 to bajty `01 43`).

<a id="k3"></a>
#### K3 — Synchroniczny most blokuje wątek JavaScript na kilkadziesiąt sekund

Metody wystawione przez `addJavascriptInterface` wykonują się **synchronicznie** — wątek JS
WebView jest zablokowany do powrotu z metody Kotlina. Wersja 0.2.0 wykonuje w ciele takich
metod całą pracę na magistrali:

| Operacja | Budżet czasu w kodzie 0.2.0 |
|---|---|
| `connect()` | skan BLE do 12 s (`VgateBleScanner.MAX_SCAN_MS`) + `CONNECT_TIMEOUT_MS` 15 s + inicjalizacja ELM (6 komend) |
| `readDtcs()` | 3 tryby × `command(mode, 8000)` → do 24 s |
| `readSaeInspection()` | ~18 kolejnych komend ELM (mapy PID 0100/0120/0140/0160, 0101, 0200 + do 10 PID-ów freeze-frame, 0900/0904/0906) |
| `readLiveSample()` | 4 komendy co próbkę + 4 dodatkowe co czwartą |

Przez ten czas strona nie renderuje niczego: ani wskaźnika postępu, ani animacji, ani reakcji na
dotyk. `VgateBleClient.CONNECT_OPERATION_TIMEOUT_MS` wynosi 60 000 ms — to górna granica
pojedynczego zamrożenia interfejsu.

Warstwa webowa dodatkowo sugeruje współbieżność, której nie ma:

```js
const [i, o, c] = await Promise.all([
  t.readVehicleInfo(), t.readDtcs(), t.readInspection().catch(...)
]);
```

`Promise.all` nie zrównolegli wywołań synchronicznych — pierwszy `readVehicleInfo()` blokuje
wątek, zanim drugie wyrażenie zdąży się w ogóle wykonać. Trzy operacje idą szeregowo, a ich
czasy się sumują.

*Naprawa:* asynchroniczny kanał żądanie/odpowiedź —
[`BridgeDispatcher`](android/src/main/java/com/turbogit/turboos/web/BridgeDispatcher.kt)
zwraca natychmiast `requestId`, wynik wraca przez `window.__turboOSBridgeSettle`;
po stronie webowej [`androidBridge.ts`](web/src/obd/androidBridge.ts) opakowuje to w `Promise`,
dzięki czemu `Promise.all` zaczyna faktycznie zrównoleglać.

<a id="k4"></a>
#### K4 — Brak CSP oraz nierówna kontrola zaufania treści w moście

`assets/index.html` w 0.2.0 nie zawiera nagłówka ani meta `Content-Security-Policy`. Strona ma
przy tym dostęp do mostu natywnego wykonującego operacje na pojeździe.

Drugi element tego samego problemu: sprawdzenie `ensureTrustedLocalContent()` (weryfikujące, że
załadowany dokument to `https://appassets.androidplatform.net`) było wywoływane **tylko** przez
`saveTextFile`, `printReport` i `setKeepScreenOn`. Metody `connect`, `readVehicleInfo`,
`readDtcs`, `clearDtcs`, `startLiveData` takiej kontroli nie miały — o zaufaniu decydował
wyłącznie `shouldOverrideUrlLoading`.

Ryzyko jest ograniczone przez `blockNetworkLoads = true` (brak kanału eksfiltracji) i lokalne
źródło zasobów, dlatego nie jest to podatność zdalna. Pozostaje jednak brak drugiej warstwy
obrony w aplikacji, która przez `clearDtcs()` może trwale zmienić stan sterownika pojazdu —
a w wariancie PWA uruchamianym w przeglądarce (ten sam kod, `manifest.webmanifest` obecny)
CSP jest jedyną dostępną warstwą.

*Naprawa:* [`web/index.html`](web/index.html) — `default-src 'none'` z jawną listą,
`frame-ancestors 'none'`, `base-uri 'none'`;
[`TurboOsAndroidBridge.guarded()`](android/src/main/java/com/turbogit/turboos/web/TurboOsAndroidBridge.kt) —
`requireTrustedPage()` na każdej metodzie mostu bez wyjątku.

---

### 🟠 Średnie

#### S1 — Odczyt gniazda RFCOMM bajt po bajcie

`Elm327Client.readUntilPrompt()` czyta z surowego `InputStream` po jednym znaku:

```java
while (v0_1.length() < 65536) {
    com.turbogit.turboos.obd.ObdException v1_0 = p20.read();   // jeden bajt = jedno wywołanie
```

Strumień nie jest opakowany w `BufferedInputStream`. Odpowiedź `41 0C 1A F8\r\r>` to ~15 wywołań
systemowych; wieloramkowa odpowiedź Mode 09 (VIN) — ponad 100. Przy 4 PID-ach na próbkę i
próbkowaniu 4 Hz daje to kilka tysięcy wywołań na minutę pomiaru drogowego.

#### S2 — Timeout jednej komendy zrywa całą sesję OBD

`Elm327Client.await()` na `TimeoutException` wywołuje `closeSocket()` i unieważnia połączenie.
Pojedynczy wolniejszy PID (np. `NO DATA` zwrócone po pełnym timeoucie) kończy więc całą sesję
diagnostyczną i wymusza ponowne łączenie — w środku pomiaru drogowego.

Zamknięcie gniazda było przy tym jedynym mechanizmem odblokowującym zawieszony `read()`
(`BluetoothSocket.InputStream.read()` nie reaguje na `Thread.interrupt()`, więc `future.cancel(true)`
sam z siebie nic nie daje). Poprawka wymaga własnego deadline'u w pętli odczytu.

#### S3 — Brak stabilizacji po `ATZ`

`initializeAdapter()` wysyła sekwencję bez żadnej przerwy:

```java
this.commandInternal("ATZ");   // twardy reset adaptera
this.commandInternal("ATE0");  // wysyłane natychmiast
```

ELM327 (i większość klonów) potrzebuje po `ATZ` ok. 1 s. Wysłanie `ATE0` w tym oknie kończy się
odpowiedzią `?` lub przekłamanym echem — stąd typowy objaw „pierwsze połączenie nie działa,
drugie tak".

#### S4 — Service Worker: pięć niezależnych defektów

1. **`cache.put()` z odpowiedzią 206 rzuca `TypeError`.** Warunek `response.ok` przepuszcza
   status 206 (mieści się w 200–299). Wyjątek powstaje wewnątrz `.then()` przekazanego do
   `respondWith()`, więc żądanie kończy się błędem sieci zamiast danych.
2. **Zapis do cache na ścieżce krytycznej.** `await cache.put(request, copy)` wykonuje się
   *przed* zwróceniem odpowiedzi do strony; powinien iść przez `event.waitUntil()`.
3. **Network-first dla wszystkiego**, także dla zasobów z hashem w nazwie
   (`index-siXgiMlk.js`), które z definicji są niezmienne — każde uruchomienie płaci za
   niepotrzebny round-trip.
4. **Atomowe `cache.addAll()` na liście wyskrobanej regexem z HTML-a.** Jeden brakujący zasób
   przerywa instalację i Service Worker nigdy nie przechodzi do stanu `activated`, bez żadnego
   komunikatu.
5. **`self.clients.claim()` poza `event.waitUntil()`** — przeglądarka może zakończyć `activate`
   przed przejęciem kontroli nad kartami.

Dodatkowo brak limitu wpisów w cache runtime oraz rozjazd wersji: `CACHE = "turboos-v0.1.1"`
przy aplikacji 0.2.0.

*Naprawa:* [`web/public/service-worker.js`](web/public/service-worker.js).

#### S5 — Efekt uboczny w funkcji aktualizującej stan Reacta

```js
we((t) => {
  let n = [e, ...t].slice(0, 20);
  try { window.localStorage.setItem(`turboos-history`, JSON.stringify(n)); } catch { ... }
  return n;
});
```

Funkcje przekazywane do settera muszą być czyste. Aplikacja renderuje się w `React.StrictMode`
(potwierdzone w bundlu), gdzie reduktory i funkcje aktualizujące są wywoływane **dwukrotnie** —
każdy wpis historii jest więc serializowany i zapisywany dwa razy.

#### S6 — Pełne przerenderowanie i przeliczenie raportu 4 razy na sekundę

Callback strumienia live wykonuje `setSamples((prev) => [...prev.slice(-119), sample])` co 250 ms,
a wynikowa tablica jest zależnością `useMemo` przeliczającego cały raport diagnostyczny
(`Un(f, _, xe, x)`). Każda próbka powoduje zatem alokację 120-elementowej tablicy, przeliczenie
analizy i przerenderowanie całego drzewa — przy jednoczesnym drugim `setInterval` co 250 ms
liczącym postęp próby.

#### S7 — Brak obsługi wstawek systemowych przy `targetSdk 35`

Android 15 wymusza tryb edge-to-edge dla `targetSdkVersion 35`. `onCreate()` wykonuje
`setContentView(webView)` bez `WindowInsets`, więc górna część interfejsu chowa się pod paskiem
stanu, a dolna — pod paskiem nawigacji.

#### S8 — Obrót ekranu niszczy sesję OBD

Aktywność nie deklaruje `android:configChanges` ani `android:screenOrientation`, mimo że
`manifest.webmanifest` deklaruje `"orientation": "portrait-primary"`. Zmiana orientacji, motywu
lub rozmiaru czcionki odtwarza aktywność, niszczy `WebView` i zrywa aktywne połączenie
z adapterem — w praktyce w połowie pomiaru drogowego.

#### S9 — Filtr wspieranych PID-ów zależy od operacji, która może się nie powieść

`optionalPid()` — używane zarówno przez cztery szybkie PID-y, jak i przez wolnozmienne —
poprawnie pomija PID-y spoza `supportedMode01Pids`. Problem leży w tym, **skąd** ten zbiór
pochodzi: jest ustawiany wyłącznie jako efekt uboczny `readSaeInspection()` (jedno przypisanie
w całej klasie) i zerowany przy rozłączeniu.

`readSaeInspection()` ma `INSPECTION_TIMEOUT_MS = 5000`, a warstwa webowa świadomie połyka jego
błąd:

```js
t.readInspection().catch((e) => ({ capturedAt: …, commands: [], warnings: [e.message] }))
```

Jeżeli przegląd SAE się nie powiedzie — co przy klonach ELM327 zdarza się regularnie — filtr
pozostaje `null` i **każdy** PID jest odpytywany w każdym cyklu. Na pojeździe bez czujnika MAF
`0110` kończy się wtedy `NO DATA` dopiero po pełnym timeoucie, w każdej próbce.

Drugi brak: negatywny wynik nie jest zapamiętywany. PID obecny w mapie wsparcia, ale zwracający
`NO_DATA` lub `UNSUPPORTED_COMMAND`, jest ponawiany bez końca.

*Naprawa:* mapa wsparcia czytana raz przy `connect()` niezależnie od przeglądu SAE + zbiór
`unsupportedPids` zapamiętujący trwałe odmowy
([`ObdDiagnosticsService`](android/src/main/java/com/turbogit/turboos/obd/ObdDiagnosticsService.kt)).

#### S10 — Kompilacja wyrażenia regularnego w pętli

`Elm327Client.findNegativeResponse()` tworzy `new Regex("7F" + service + "([0-9A-F]{2})")` dla
**każdej linii** odpowiedzi. Kompilacja wzorca jest o rzędy wielkości droższa od dopasowania.

#### S11 — Brak limitu liczby subskrypcji strumienia live

`startLiveData()` odrzuca tylko duplikat tej samej nazwy callbacku. Nic nie ogranicza liczby
równoległych subskrypcji, a każda dokłada osobny cykl odpytywania tej samej magistrali.

---

### 🟡 Niskie

| # | Problem | Lokalizacja |
|---|---|---|
| N1 | `slowLiveCache` nie jest `@Volatile` mimo dostępu z wątku schedulera | `TurboOsAndroidBridge` |
| N2 | `sampleStartedAt`/`timestamp` z `Instant.now()`, ale czas trwania z `elapsedRealtime()` — korekta zegara systemowego daje ujemny odstęp | `readLiveSample()` |
| N3 | `maskBluetoothAddress()` zduplikowane w `MainActivity` i w moście (identyczna implementacja) | 2 pliki |
| N4 | Brak `onReceivedError` — nieudane ładowanie zasobu daje pustą, czarną stronę bez komunikatu | `MainActivity$configureWebView$2` |
| N5 | `COMMAND_PATTERN` (`^(?:AT(?:[A-Z0-9]+\|@1)\|[0-9A-F]{2,12})$`) dopuszcza dowolne komendy AT, w tym `ATSH`/`ATCF`/`ATPB` zmieniające parametry magistrali | `Elm327Client` |
| N6 | Podpis wyłącznie schematem v2 — brak v3 uniemożliwia rotację klucza | blok podpisu APK |
| N7 | `kotlin/*.kotlin_builtins` i `META-INF/*.version` w APK — brak `packaging.resources.excludes` | zawartość APK |
| N8 | Brak `<noscript>` i ekranu wstępnego — pierwszy render to pusta karta | `index.html` |
| N9 | Historia z `localStorage` czytana bez walidacji kształtu (`e.snapshot.samples.map(...)` po sprawdzeniu wyłącznie `e.snapshot?.current?.available`); jeden uszkodzony wpis wpada w `catch` i kasuje z widoku **całą** historię pomiarów | bundle, inicjalizator `useState` |
| N10 | `manifest.webmanifest` bez pola `id` — utrudnia stabilną identyfikację instalacji PWA | `manifest.webmanifest` |
| N11 | Rozjazd wersji: `service-worker.js` deklaruje `turboos-v0.1.1` przy aplikacji 0.2.0 | `service-worker.js` |

---

## 2. Zrefaktoryzowany kod

Kod źródłowy nie był dostępny, więc poniższe pliki są **rekonstrukcją produkcyjną** modułów,
w których znaleziono defekty — napisaną tak, aby dało się je wstawić do projektu jako zamienniki.
Każdy plik zaczyna się blokiem `ZMIANY WZGLĘDEM 0.2.0` wiążącym zmianę z konkretnym punktem
tego raportu.

**Stan weryfikacji.** Pliki TypeScript przechodzą `tsc --strict` bez ostrzeżeń. Logika parsera
została zweryfikowana wykonawczo: [`tools/parser-check.mjs`](tools/parser-check.mjs) to wierny
port `ObdParser.kt` w JavaScripcie, uruchamiający te same 15 wektorów co `ObdParserTest.kt`
(`node turboos-audit/tools/parser-check.mjs` → 15/15). Skrypt izoluje też samą wadę [K2](#k2),
uruchamiając ten sam potok bez obsługi bajtu licznika — stąd liczby w tabeli poniżej.
Kod Kotlina **nie został skompilowany** —
w środowisku audytu nie było Android SDK, więc traktuj go jako gotowy do przeglądu, a nie
zweryfikowany przez kompilator.

### Warstwa natywna (Kotlin)

| Plik | Naprawia |
|---|---|
| [`android/src/main/java/com/turbogit/turboos/obd/ObdParser.kt`](android/src/main/java/com/turbogit/turboos/obd/ObdParser.kt) | [K2](#k2) + walidacja zakresów fizycznych, deduplikacja logiki nagłówków CAN |
| [`android/src/main/java/com/turbogit/turboos/obd/Elm327Client.kt`](android/src/main/java/com/turbogit/turboos/obd/Elm327Client.kt) | S1, S2, S3, S10, N5 |
| [`android/src/main/java/com/turbogit/turboos/obd/ObdDiagnosticsService.kt`](android/src/main/java/com/turbogit/turboos/obd/ObdDiagnosticsService.kt) | S9, N1, N2 + wydzielenie domeny z klasy mostu |
| [`android/src/main/java/com/turbogit/turboos/obd/ObdTypes.kt`](android/src/main/java/com/turbogit/turboos/obd/ObdTypes.kt) | wspólny kontrakt transportów |
| [`android/src/main/java/com/turbogit/turboos/web/BridgeDispatcher.kt`](android/src/main/java/com/turbogit/turboos/web/BridgeDispatcher.kt) | [K3](#k3) — asynchroniczny kanał żądanie/odpowiedź |
| [`android/src/main/java/com/turbogit/turboos/web/TurboOsAndroidBridge.kt`](android/src/main/java/com/turbogit/turboos/web/TurboOsAndroidBridge.kt) | [K4](#k4), S11 + redukcja z 92 metod do samego kontraktu JS |
| [`android/src/main/java/com/turbogit/turboos/MainActivity.kt`](android/src/main/java/com/turbogit/turboos/MainActivity.kt) | S7, S8, N3, N4 |
| [`android/src/main/AndroidManifest.xml`](android/src/main/AndroidManifest.xml) | [K1](#k1), S8 |
| [`android/build.gradle.kts.sample`](android/build.gradle.kts.sample) | [K1](#k1), N6, N7 |
| [`android/proguard-rules.pro`](android/proguard-rules.pro) | reguły `@JavascriptInterface` wymagane po włączeniu R8 |
| [`android/src/test/java/com/turbogit/turboos/obd/ObdParserTest.kt`](android/src/test/java/com/turbogit/turboos/obd/ObdParserTest.kt) | 15 testów regresyjnych, w tym wektory dla [K2](#k2) |

### Warstwa webowa (TypeScript / PWA)

| Plik | Naprawia |
|---|---|
| [`web/src/obd/androidBridge.ts`](web/src/obd/androidBridge.ts) | [K3](#k3) — klient `Promise`-owy, pełne typowanie kontraktu mostu, limity czasu |
| [`web/src/obd/useObdSession.ts`](web/src/obd/useObdSession.ts) | S5, S6, N9 — `useReducer`, bufor próbek poza Reactem, zapis historii jako efekt |
| [`web/public/service-worker.js`](web/public/service-worker.js) | S4, N11 |
| [`web/index.html`](web/index.html) | [K4](#k4), N8 |

### Kluczowa zmiana architektoniczna

Przepływ 0.2.0 — wątek JS zablokowany na czas całej operacji:

```
JS: await bridge.connect() ──────────── blokada 15–60 s ───────────► wynik
                            (skan BLE → GATT → ATZ/ATE0/… → ATDP)
```

Przepływ po refaktoryzacji:

```
JS: bridge.connect() ─► {requestId} (natychmiast)          UI renderuje postęp
                             │
Kotlin: pula wątków ─────────┴──► praca OBD ──► window.__turboOSBridgeSettle(id, wynik)
                                                        │
JS: Promise rozwiązany ◄────────────────────────────────┘
```

Dzięki temu `Promise.all([readVehicleInfo(), readDtcs(), readInspection()])` zaczyna faktycznie
zrównoleglać odczyty (kolejność na samej magistrali nadal serializuje `Elm327Client`), a interfejs
pozostaje responsywny przez cały czas trwania operacji.

---

## 3. Rekomendacje dalszego rozwoju

**Natychmiast, przed jakąkolwiek dystrybucją**

1. Zbudować wydanie z `buildType = release`, własnym keystore (v2+v3+v4), `isMinifyEnabled = true`.
   Uzupełnić proces CI o krok weryfikujący, że `aapt dump badging` nie zgłasza `debuggable`.
2. Dodać test jednostkowy `ObdParser` na wektorach odpowiedzi CAN i ISO 9141 — [K2](#k2) to błąd,
   który powinien był zostać wykryty pierwszym testem parsera. Parsery są czystymi funkcjami,
   więc testują się bez emulatora i bez sprzętu.

**Architektura**

3. Rozbić most na trzy warstwy (kontrakt JS → walidacja → domena), jak w załączonym kodzie.
   Klasa z 92 metodami i czterema odpowiedzialnościami jest nietestowalna i to ona utrzymała
   przy życiu K2, S9 i N1 naraz.
4. Zdefiniować kontrakt mostu w jednym miejscu (np. schemat JSON lub wspólny plik `.d.ts`
   generowany z Kotlina) i weryfikować go testem kontraktowym. Dziś warstwa webowa ręcznie
   sprawdza obecność siedmiu metod (`zt` w bundlu), a rozjazd wersji mostu jest wykrywany
   dopiero w runtime, przez `typeof bridge.readSaeInspection === 'function'`.
5. Rozważyć zastąpienie ręcznego dispatchera korutynami Kotlina (`suspendCancellableCoroutine`
   + `CoroutineScope` związany z cyklem życia aktywności) — anulowanie w połowie skanu BLE
   będzie wtedy naturalne, a nie wymuszane zamykaniem gniazda.

**Warstwa webowa**

6. Podzielić główny komponent ekranu (ponad 30 `useState`, 8 `useRef`, 8 efektów) na hooki
   domenowe: sesja OBD, przebieg pomiaru drogowego, historia, eksport. Obecna postać sprawia,
   że każda akcja użytkownika ustawia kilkanaście stanów pod rząd i praktycznie nie da się
   wnioskować o dopuszczalnych kombinacjach.
7. Przenieść historię pomiarów z `localStorage` do IndexedDB. Wpisy zawierają do 120 pełnych
   próbek na pomiar × 20 pozycji; `localStorage` jest synchroniczny (blokuje wątek główny przy
   każdej serializacji) i ma limit ~5 MB, którego kod 0.2.0 już dotyka — stąd obecna obsługa
   `catch` z komunikatem „Brak miejsca na trwały zapis historii".
8. Wygenerować listę precache Service Workera przy budowaniu (Workbox lub własny plugin Vite)
   zamiast odtwarzać ją regexem z `index.html` po instalacji.
9. Docelowo usunąć `'unsafe-inline'` ze `style-src` — wymaga przeniesienia stylów inline
   Framer Motion na nonce lub klasy statyczne.

**Jakość i utrzymanie**

10. Dodać testy instrumentalne dla mostu z zaślepką `WebView` oraz symulatorem ELM327 na
    lokalnym gnieździe — warstwa symulatora już istnieje w bundlu (`sn`, `on`, dane demo
    Passat B7 / EDC17C46), wystarczy wystawić ją po stronie natywnej.
11. Wprowadzić budżety wydajności w CI: rozmiar bundla (dziś 313 kB JS + 38 kB CSS w jednym
    chunku — brak podziału kodu, cały raport diagnostyczny ładuje się przed pierwszym renderem)
    oraz czas do pierwszego renderu w WebView.
12. Ujednolicić źródło wersji: `versionName`, nazwa cache Service Workera i etykieta w UI
    powinny pochodzić z jednej wartości wstrzykiwanej przy budowaniu ([N11](#-niskie)).
13. Jeśli oznaczenie „READONLY" ma być wiążące, wyłączyć `clearDtcs()` w tym wariancie kompilacji
    (flaga `BuildConfig`), a nie tylko w nazwie pliku.
