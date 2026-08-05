/// <reference lib="webworker" />
/**
 * Service Worker aplikacji TurboOS.
 *
 * ZMIANY WZGLĘDEM 0.2.0
 * ---------------------
 * 1. [BŁĄD] `cache.put()` z odpowiedzią 206 Partial Content rzuca `TypeError`.
 *    Wersja 0.2.0 sprawdzała tylko `response.ok`, a 206 mieści się w zakresie
 *    200–299, więc każde żądanie zakresowe (np. audio sygnału końca próby)
 *    wywalało obsługę `fetch`, a strona dostawała błąd sieci zamiast danych.
 *    Teraz cache'ujemy wyłącznie status 200 i pomijamy żądania z nagłówkiem Range.
 * 2. [WYDAJNOŚĆ] 0.2.0 czekał na `await cache.put(...)` PRZED zwróceniem
 *    odpowiedzi — zapis do CacheStorage leżał na ścieżce krytycznej każdego
 *    żądania. Teraz zapis idzie przez `event.waitUntil()`.
 * 3. [WYDAJNOŚĆ] Strategia była „network-first dla wszystkiego", także dla
 *    zasobów z hashem w nazwie (`index-siXgiMlk.js`), które są niezmienne z
 *    definicji. Zasoby hashowane obsługujemy teraz cache-first (zero round-tripów),
 *    a network-first zostaje dla nawigacji i manifestu.
 * 4. [BŁĄD] `precacheShell()` wyciągał listę zasobów regexem z HTML-a i wołał
 *    `cache.addAll()`, które jest atomowe — pojedynczy zasób 404 przerywał całą
 *    instalację, a SW nigdy nie przechodził do stanu `activated` (bez żadnego
 *    komunikatu). Lista jest teraz jawna, a niepowodzenia pojedynczych pozycji
 *    nie blokują instalacji.
 * 5. [BŁĄD] `self.clients.claim()` w 0.2.0 było wywołane POZA `event.waitUntil()`,
 *    więc przeglądarka mogła zakończyć zdarzenie `activate` przed przejęciem
 *    kontroli nad kartami.
 * 6. [ZASOBY] Cache runtime ma limit wpisów — 0.2.0 rósł bez ograniczeń.
 * 7. [SPÓJNOŚĆ] Nazwa cache'u zawierała `v0.1.1`, podczas gdy aplikacja miała
 *    wersję 0.2.0. Wersja jest teraz wstrzykiwana przy budowaniu.
 */

// Podstawiane przez bundler (np. `define` w Vite) — jedno źródło prawdy o wersji.
const APP_VERSION = '__TURBOOS_BUILD_ID__';

const SHELL_CACHE = `turboos-shell-${APP_VERSION}`;
const RUNTIME_CACHE = `turboos-runtime-${APP_VERSION}`;
const RUNTIME_MAX_ENTRIES = 60;

/**
 * Jawna lista powłoki aplikacji. Wygenerowana przy budowaniu — w 0.2.0 była
 * odtwarzana regexem z `index.html` już po instalacji.
 */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  // __TURBOOS_BUILD_ASSETS__ — wstrzykiwane hashowane bundle (JS/CSS).
];

/** Zasoby z hashem w nazwie są niezmienne — obsługujemy je cache-first. */
const IMMUTABLE_ASSET = /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?|png|svg)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );
      // Wewnątrz waitUntil — patrz punkt 5 w nagłówku pliku.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  // Żądania zakresowe zwracają 206, którego nie wolno zapisać w CacheStorage.
  if (request.headers.has('range')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (IMMUTABLE_ASSET.test(url.pathname)) {
    event.respondWith(cacheFirst(event, request));
    return;
  }
  event.respondWith(networkFirst(event, request));
});

/**
 * Instalacja powłoki. `addAll` jest atomowe, więc pobieramy pozycje osobno —
 * brak jednej ikony nie może zablokować aktywacji Service Workera.
 */
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const results = await Promise.allSettled(
    PRECACHE_URLS.map(async (url) => {
      const response = await fetch(new Request(url, { cache: 'reload' }));
      if (!isCacheable(response)) {
        throw new Error(`Nie można zapisać ${url}: HTTP ${response.status}`);
      }
      await cache.put(url, response);
    }),
  );

  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length === PRECACHE_URLS.length) {
    // Całkowite niepowodzenie oznacza brak sensownej powłoki offline —
    // przerywamy instalację, żeby stary SW pozostał aktywny.
    throw new Error('Nie udało się pobrać żadnego zasobu powłoki TurboOS.');
  }
}

async function cacheFirst(event, request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheable(response)) {
    event.waitUntil(putInRuntimeCache(request, response.clone()));
  }
  return response;
}

async function networkFirst(event, request) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      // Zapis poza ścieżką krytyczną — odpowiedź wraca do strony natychmiast.
      event.waitUntil(putInRuntimeCache(request, response.clone()));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/** Tylko 200 — 206 rzuciłoby TypeError, a odpowiedzi opaque nie mają wartości offline. */
function isCacheable(response) {
  return response.status === 200 && response.type !== 'opaque';
}

async function putInRuntimeCache(request, response) {
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response);
  await trimCache(cache, RUNTIME_MAX_ENTRIES);
}

/** Prosty limit FIFO — bez niego cache runtime rósł w nieskończoność (0.2.0). */
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}
