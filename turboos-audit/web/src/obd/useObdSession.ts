import { useCallback, useEffect, useMemo, useReducer, useRef, useSyncExternalStore } from 'react';
import { AndroidObdTransport, ObdTransportError } from './androidBridge';

/**
 * Stan sesji diagnostycznej OBD.
 *
 * ZMIANY WZGLĘDEM 0.2.0
 * ---------------------
 * 1. [ARCHITEKTURA] Ekran główny 0.2.0 był jednym komponentem trzymającym ponad
 *    trzydzieści niezależnych `useState` i osiem `useRef`, z ośmioma efektami
 *    modyfikującymi się nawzajem. Każda akcja (np. „Połącz") ustawiała
 *    kilkanaście stanów pod rząd. Tutaj jeden [useReducer] opisuje przejścia
 *    sesji, więc niemożliwy jest stan pośredni typu „connected + brak transportu".
 * 2. [WYDAJNOŚĆ] 0.2.0 wołał `setSamples((prev) => [...prev.slice(-119), sample])`
 *    dla KAŻDEJ próbki (co 250 ms), a wynikowa tablica była zależnością
 *    `useMemo` przeliczającego cały raport diagnostyczny. Efekt: pełne
 *    przerenderowanie drzewa i przeliczenie analizy 4 razy na sekundę.
 *    Próbki lądują teraz w buforze cyklicznym poza Reactem, a komponenty
 *    subskrybują je przez [useSyncExternalStore] z ograniczeniem do jednej
 *    aktualizacji na klatkę.
 * 3. [BŁĄD] Zapis historii do `localStorage` odbywał się w 0.2.0 WEWNĄTRZ
 *    funkcji aktualizującej `setState`. Funkcje aktualizujące muszą być czyste,
 *    a w `React.StrictMode` (włączonym w 0.2.0) są wywoływane dwukrotnie —
 *    każdy wpis historii był zapisywany dwa razy. Zapis jest teraz efektem.
 * 4. [BŁĄD] Odczyt historii z `localStorage` w inicjalizatorze `useState` ufał
 *    kształtowi danych (`e.snapshot.samples.map(...)` po sprawdzeniu wyłącznie
 *    `e.snapshot?.current?.available`). Jeden uszkodzony wpis wpadał w `catch`
 *    i kasował z widoku całą historię pomiarów. Teraz każdy wpis jest walidowany
 *    osobno, a niepoprawne są pomijane.
 */

// ------------------------------------------------------------------- model

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface LiveSample {
  readonly timestampMs: number;
  readonly engineRpm: number | null;
  readonly actualBoostKpa: number | null;
  readonly engineLoadPercent: number | null;
  readonly vehicleSpeedKph: number | null;
}

export interface SessionState {
  readonly status: ConnectionStatus;
  readonly deviceName: string | null;
  readonly protocol: string | null;
  readonly error: string | null;
  readonly lastSampleAtMs: number | null;
}

type SessionAction =
  | { type: 'connect/start' }
  | { type: 'connect/success'; deviceName: string; protocol: string }
  | { type: 'connect/failure'; message: string }
  | { type: 'sample/received'; atMs: number }
  | { type: 'disconnect' };

const INITIAL_STATE: SessionState = {
  status: 'disconnected',
  deviceName: null,
  protocol: null,
  error: null,
  lastSampleAtMs: null,
};

function reduce(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'connect/start':
      return { ...INITIAL_STATE, status: 'connecting' };
    case 'connect/success':
      return {
        status: 'connected',
        deviceName: action.deviceName,
        protocol: action.protocol,
        error: null,
        lastSampleAtMs: Date.now(),
      };
    case 'connect/failure':
      return { ...INITIAL_STATE, status: 'error', error: action.message };
    case 'sample/received':
      // Świadomie nie kopiujemy próbki do stanu — trafia do bufora poza Reactem.
      return state.lastSampleAtMs === action.atMs
        ? state
        : { ...state, lastSampleAtMs: action.atMs };
    case 'disconnect':
      return INITIAL_STATE;
    default:
      return state;
  }
}

// --------------------------------------------------- bufor próbek poza React

const SAMPLE_CAPACITY = 120;

/**
 * Bufor cykliczny z powiadamianiem zgodnym z `useSyncExternalStore`.
 * Powiadomienie jest ograniczone do jednej klatki animacji, więc strumień
 * 4–10 Hz nie generuje 4–10 przerenderowań na sekundę.
 */
class SampleBuffer {
  private samples: LiveSample[] = [];
  private snapshot: readonly LiveSample[] = [];
  private readonly listeners = new Set<() => void>();
  private frame: number | null = null;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): readonly LiveSample[] => this.snapshot;

  push(sample: LiveSample): void {
    this.samples.push(sample);
    if (this.samples.length > SAMPLE_CAPACITY) {
      this.samples = this.samples.slice(-SAMPLE_CAPACITY);
    }
    this.scheduleNotify();
  }

  clear(): void {
    this.samples = [];
    this.snapshot = [];
    this.notify();
  }

  private scheduleNotify(): void {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      // Nowa referencja dopiero przy publikacji — `useSyncExternalStore`
      // porównuje snapshoty przez `Object.is`.
      this.snapshot = [...this.samples];
      this.notify();
    });
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  dispose(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.listeners.clear();
  }
}

// ---------------------------------------------------------------- historia

const HISTORY_KEY = 'turboos-history';
const HISTORY_LIMIT = 20;

export interface HistoryEntry {
  readonly id: string;
  readonly date: string;
  readonly vin?: string;
  readonly score: number | null;
}

/** Walidacja kształtu — uszkodzony wpis jest pomijany, a nie wywraca ekranu. */
function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<HistoryEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.date === 'string' &&
    (entry.score === null || typeof entry.score === 'number')
  );
}

function readHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isHistoryEntry).slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

// -------------------------------------------------------------------- hook

export interface UseObdSessionResult {
  readonly state: SessionState;
  readonly samples: readonly LiveSample[];
  readonly history: readonly HistoryEntry[];
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
  readonly saveToHistory: (entry: HistoryEntry) => void;
}

export function useObdSession(): UseObdSessionResult {
  const [state, dispatch] = useReducer(reduce, INITIAL_STATE);
  const [history, dispatchHistory] = useReducer(
    (current: HistoryEntry[], entry: HistoryEntry) => [entry, ...current].slice(0, HISTORY_LIMIT),
    undefined,
    readHistory,
  );

  const buffer = useMemo(() => new SampleBuffer(), []);
  const transportRef = useRef<AndroidObdTransport | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const samples = useSyncExternalStore(buffer.subscribe, buffer.getSnapshot, buffer.getSnapshot);

  // Efekt, nie funkcja aktualizująca stan — patrz punkt 3 w nagłówku pliku.
  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Przekroczony limit magazynu nie może przerwać sesji diagnostycznej.
    }
  }, [history]);

  const teardown = useCallback(async () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    const transport = transportRef.current;
    transportRef.current = null;
    await transport?.disconnect().catch(() => undefined);
  }, []);

  const connect = useCallback(async () => {
    dispatch({ type: 'connect/start' });
    await teardown();
    buffer.clear();

    try {
      const transport = new AndroidObdTransport();
      const details = (await transport.connect()) as { deviceName?: string; protocol?: string };
      transportRef.current = transport;

      unsubscribeRef.current = transport.subscribeLiveData(
        (sample) => {
          const parsed = sample as LiveSample;
          buffer.push(parsed);
          dispatch({ type: 'sample/received', atMs: Date.now() });
        },
        {
          intervalMs: 250,
          onError: (error) => {
            void teardown();
            dispatch({ type: 'connect/failure', message: error.message });
          },
        },
      );

      dispatch({
        type: 'connect/success',
        deviceName: details.deviceName ?? 'Adapter OBD',
        protocol: details.protocol ?? 'OBD-II',
      });
    } catch (error) {
      await teardown();
      dispatch({
        type: 'connect/failure',
        message:
          error instanceof ObdTransportError || error instanceof Error
            ? error.message
            : 'Nie udało się połączyć z adapterem OBD.',
      });
    }
  }, [buffer, teardown]);

  const disconnect = useCallback(async () => {
    await teardown();
    buffer.clear();
    dispatch({ type: 'disconnect' });
  }, [buffer, teardown]);

  /**
   * Host natywny zgłasza przejście aplikacji w tło. 0.2.0 nasłuchiwał tego
   * zdarzenia, ale rozłączał transport bez czyszczenia bufora próbek, więc po
   * powrocie wykres pokazywał sklejone dane z dwóch sesji.
   */
  useEffect(() => {
    const onHostStopped = () => {
      void disconnect();
    };
    window.addEventListener('turboos-obd-host-stopped', onHostStopped);
    return () => window.removeEventListener('turboos-obd-host-stopped', onHostStopped);
  }, [disconnect]);

  // Sprzątanie przy odmontowaniu — odporne na podwójne wywołanie w StrictMode.
  useEffect(
    () => () => {
      void teardown();
      buffer.dispose();
    },
    [buffer, teardown],
  );

  return { state, samples, history, connect, disconnect, saveToHistory: dispatchHistory };
}
