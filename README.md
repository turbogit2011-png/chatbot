# Momentum — Twoje centrum produktywności

Momentum to działająca **w pełni offline** aplikacja do produktywności, zbudowana
na Next.js 16 (App Router, statyczny eksport). Wszystkie dane są przechowywane
**wyłącznie w przeglądarce** (`localStorage`) — bez kont, bez serwera, bez śledzenia.

## Funkcje

- **⏱️ Timer skupienia (Pomodoro)** — konfigurowalne sesje pracy i przerw, pierścień
  postępu, dźwiękowy sygnał końca sesji oraz automatyczne zliczanie minut skupienia.
- **✅ Zadania** — szybkie dodawanie, priorytety (wysoki/średni/niski), filtrowanie
  (wszystkie/aktywne/zrobione) i licznik ukończeń z dziś.
- **🔁 Nawyki z passami** — odhaczanie nawyków na dziś, licznik dni „z rzędu”
  (streak) i mini-podgląd ostatnich 7 dni.
- **📝 Notatnik** — automatycznie zapisywany brudnopis z licznikiem słów.
- **📊 Statystyki dnia** — minuty skupienia, ukończone zadania, najlepsza passa
  oraz wykres skupienia z ostatnich 7 dni.
- **💾 Eksport / import / reset** — pełna kontrola nad własnymi danymi (plik JSON).

## Uruchomienie

```bash
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

## Budowanie (statyczny eksport)

```bash
npm run build   # generuje statyczną stronę do katalogu out/
```

## Stack

- **Next.js 16** (App Router, `output: "export"`)
- **React 19**
- **Tailwind CSS v4**
- **framer-motion** (animacje), **lucide-react** (ikony)

> Dane nigdy nie opuszczają urządzenia — to świadoma decyzja projektowa
> stawiająca prywatność na pierwszym miejscu.
