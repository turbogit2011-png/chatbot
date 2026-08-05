/**
 * Transport OBD oparty na natywnym moście Androida.
 *
 * ZMIANY WZGLĘDEM 0.2.0
 * ---------------------
 * 1. [WYDAJNOŚĆ / UX] Most jest asynchroniczny. W 0.2.0 każde wywołanie
 *    `window.TurboOSAndroid.*` blokowało wątek JavaScript do zakończenia operacji
 *    natywnej (skan BLE, odczyt DTC, przegląd SAE), więc interfejs zamierał na
 *    kilkadziesiąt sekund. Tutaj most zwraca `requestId`, a wynik dociera przez
 *    `window.__turboOSBridgeSettle`, co daje prawdziwe `Promise`.
 * 2. [BŁĄD] `Promise.all([readVehicleInfo(), readDtcs(), readInspection()])` w
 *    0.2.0 sugerował zrównoleglenie, którego nie było. Teraz odczyty naprawdę
 *    wykonują się współbieżnie na puli wątków po stronie natywnej.
 * 3. [WYCIEK] Każde żądanie ma limit czasu i jest usuwane z rejestru niezależnie
 *    od wyniku. W 0.2.0 nazwy callbacków strumienia live były zapisywane przez
 *    `Object.defineProperty` na `window` i usuwane tylko przy poprawnym
 *    `stopLiveData` — przerwanie strony w trakcie zostawiało wiszący wpis.
 * 4. [TYPY] Pełne typowanie kontraktu mostu zamiast `any` + ręcznych rzutowań.
 */

// ---------------------------------------------------------------- typy mostu

export type ObdLinkType = 'bluetooth-classic' | 'bluetooth-le';

export interface NativeErrorPayload {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

type NativeEnvelope<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: NativeErrorPayload };

interface PendingAck {
  readonly requestId: string;
  readonly operation: string;
  readonly pending: true;
}

/** Kontrakt metod wystawionych przez `addJavascriptInterface`. */
export interface TurboOsNativeBridge {
  connect(): string;
  disconnect(): string;
  listPairedDevices(): string;
  selectDevice(address: string): string;
  readVehicleInfo(): string;
  readDtcs(): string;
  readSaeInspection?(): string;
  clearDtcs(): string;
  setKeepScreenOn(enabled: boolean): string;
  saveTextFile(fileName: string, mimeType: string, content: string): string;
  printReport(documentName: string): string;
  startLiveData(callbackName: string, intervalMs: number): string;
  stopLiveData(callbackName: string): string;
}

interface BridgeHost {
  TurboOSAndroid?: TurboOsNativeBridge;
  __turboOSBridgeSettle?: (requestId: string, payload: string) => void;
  __turboOSBridgeEvent?: (channel: string, payload: string) => void;
}

export class ObdTransportError extends Error {
  readonly code: string;
  readonly nativeCode?: string;
  readonly nativeDetails?: unknown;

  constructor(
    code: string,
    message: string,
    options?: ErrorOptions & { nativeCode?: string; nativeDetails?: unknown },
  ) {
    super(message, options);
    this.name = 'ObdTransportError';
    this.code = code;
    this.nativeCode = options?.nativeCode;
    this.nativeDetails = options?.nativeDetails;
  }
}

const REQUIRED_METHODS = [
  'connect',
  'disconnect',
  'readVehicleInfo',
  'readDtcs',
  'clearDtcs',
  'startLiveData',
  'stopLiveData',
] as const satisfies readonly (keyof TurboOsNativeBridge)[];

/** Domyślny limit czasu żądania. Przegląd SAE dostaje własny, dłuższy budżet. */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const INSPECTION_TIMEOUT_MS = 120_000;

// -------------------------------------------------------------- warstwa RPC

interface PendingRequest {
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: ObdTransportError) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Rejestr żądań w locie oraz punkt wejścia dla wywołań zwrotnych z warstwy
 * natywnej. Instalowany raz — kolejne instancje transportu współdzielą go,
 * dzięki czemu ponowne połączenie nie nadpisuje globalnych funkcji.
 */
class BridgeRpc {
  private readonly pending = new Map<string, PendingRequest>();
  private readonly channels = new Map<string, (payload: unknown) => void>();

  constructor(private readonly host: BridgeHost) {
    host.__turboOSBridgeSettle = (requestId, payload) => this.settle(requestId, payload);
    host.__turboOSBridgeEvent = (channel, payload) => this.deliver(channel, payload);
  }

  /**
   * Wywołuje metodę mostu. Synchroniczna odpowiedź to albo potwierdzenie
   * `{requestId}` (praca w tle), albo gotowy wynik/błąd (walidacja odrzuciła
   * żądanie od razu).
   */
  call<T>(invoke: () => string, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS): Promise<T> {
    let raw: string;
    try {
      raw = invoke();
    } catch (cause) {
      return Promise.reject(
        new ObdTransportError('NATIVE_CALL_FAILED', 'Wywołanie mostu Android OBD nie powiodło się.', {
          cause,
        }),
      );
    }

    let unwrapped: unknown;
    try {
      unwrapped = unwrap<PendingAck | T>(raw);
    } catch (error) {
      return Promise.reject(error as ObdTransportError);
    }

    if (!isPendingAck(unwrapped)) {
      return Promise.resolve(unwrapped as T);
    }

    const { requestId } = unwrapped;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(
          new ObdTransportError(
            'NATIVE_TIMEOUT',
            `Operacja natywna nie zakończyła się w ciągu ${Math.round(timeoutMs / 1000)} s.`,
          ),
        );
      }, timeoutMs);

      this.pending.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });
    });
  }

  subscribe(channel: string, handler: (payload: unknown) => void): () => void {
    this.channels.set(channel, handler);
    return () => {
      this.channels.delete(channel);
    };
  }

  private settle(requestId: string, payload: string): void {
    const request = this.pending.get(requestId);
    if (!request) return; // Spóźniona odpowiedź po timeoucie — ignorujemy.
    this.pending.delete(requestId);
    clearTimeout(request.timer);

    try {
      request.resolve(unwrap(payload));
    } catch (error) {
      request.reject(error as ObdTransportError);
    }
  }

  private deliver(channel: string, payload: string): void {
    const handler = this.channels.get(channel);
    if (!handler) return;
    try {
      handler(unwrap(payload));
    } catch (error) {
      handler(error);
    }
  }
}

/** Rozpakowuje kopertę `{ok, data|error}` z warstwy natywnej. */
function unwrap<T>(raw: string): T {
  let envelope: NativeEnvelope<T>;
  try {
    envelope = JSON.parse(raw) as NativeEnvelope<T>;
  } catch (cause) {
    throw new ObdTransportError(
      'INVALID_NATIVE_RESPONSE',
      'Most Android OBD zwrócił nieprawidłowy JSON.',
      { cause },
    );
  }

  if (!envelope.ok) {
    const { code, message, details } = envelope.error;
    throw new ObdTransportError('NATIVE_OPERATION_FAILED', message, {
      nativeCode: code,
      nativeDetails: details,
    });
  }
  return envelope.data;
}

function isPendingAck(value: unknown): value is PendingAck {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as PendingAck).pending === true &&
    typeof (value as PendingAck).requestId === 'string'
  );
}

// --------------------------------------------------------------- transport

let rpcSingleton: BridgeRpc | undefined;
let liveCallbackSequence = 0;

export interface LiveDataOptions {
  readonly intervalMs?: number;
  readonly onError?: (error: ObdTransportError) => void;
}

export class AndroidObdTransport {
  readonly kind = 'native-android' as const;

  private readonly bridge: TurboOsNativeBridge;
  private readonly rpc: BridgeRpc;
  private readonly activeCallbacks = new Set<string>();
  private connected = false;

  constructor(host: BridgeHost = window as unknown as BridgeHost) {
    const bridge = host.TurboOSAndroid;
    if (!AndroidObdTransport.isSupported(host)) {
      throw new ObdTransportError(
        'TRANSPORT_UNAVAILABLE',
        'Brak natywnego mostu TurboOSAndroid. Tryb rzeczywistego OBD jest dostępny ' +
          'wyłącznie w aplikacji Android z poprawnie zainstalowanym mostem.',
      );
    }
    this.bridge = bridge as TurboOsNativeBridge;
    rpcSingleton ??= new BridgeRpc(host);
    this.rpc = rpcSingleton;
  }

  static isSupported(host: BridgeHost = window as unknown as BridgeHost): boolean {
    const bridge = host?.TurboOSAndroid;
    if (!bridge || typeof bridge !== 'object') return false;
    return REQUIRED_METHODS.every((name) => typeof bridge[name] === 'function');
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<unknown> {
    if (this.connected) {
      throw new ObdTransportError('ALREADY_CONNECTED', 'Transport Android OBD jest już połączony.');
    }
    const details = await this.rpc.call(() => this.bridge.connect());
    this.connected = true;
    return details;
  }

  async disconnect(): Promise<void> {
    // Subskrypcje zamykamy przed rozłączeniem, żeby nie wywołać błędu
    // NOT_CONNECTED w trakcie kolejnej próbki.
    for (const callbackName of [...this.activeCallbacks]) {
      this.stopSubscription(callbackName);
    }
    if (this.connected) {
      await this.rpc.call(() => this.bridge.disconnect()).catch(() => undefined);
    }
    this.connected = false;
  }

  readVehicleInfo(): Promise<unknown> {
    this.requireConnection();
    return this.rpc.call(() => this.bridge.readVehicleInfo());
  }

  readDtcs(): Promise<unknown> {
    this.requireConnection();
    return this.rpc.call(() => this.bridge.readDtcs());
  }

  readInspection(): Promise<unknown> {
    this.requireConnection();
    if (typeof this.bridge.readSaeInspection !== 'function') {
      return Promise.resolve({
        capturedAt: new Date().toISOString(),
        commands: [],
        warnings: ['Ta wersja natywnego mostu nie udostępnia jeszcze przeglądu SAE OBD-II.'],
      });
    }
    return this.rpc.call(() => this.bridge.readSaeInspection!(), INSPECTION_TIMEOUT_MS);
  }

  clearDtcs(): Promise<unknown> {
    this.requireConnection();
    return this.rpc.call(() => this.bridge.clearDtcs());
  }

  /**
   * Uruchamia strumień próbek. Zwraca funkcję zamykającą — idempotentną,
   * bezpieczną do wywołania z `useEffect` cleanup w React StrictMode.
   */
  subscribeLiveData(onSample: (sample: unknown) => void, options: LiveDataOptions = {}): () => void {
    this.requireConnection();

    const intervalMs = Math.max(200, Math.round(options.intervalMs ?? 1000));
    const callbackName = `__turboOSObdLive_${(liveCallbackSequence += 1)}`;

    const unsubscribeChannel = this.rpc.subscribe(callbackName, (payload) => {
      if (payload instanceof ObdTransportError) {
        this.connected = false;
        this.stopSubscription(callbackName);
        options.onError?.(payload);
        return;
      }
      onSample(payload);
    });

    this.activeCallbacks.add(callbackName);

    try {
      // Rejestracja subskrypcji jest walidowana synchronicznie po stronie
      // natywnej, więc błędna nazwa callbacku zgłosi się natychmiast.
      unwrap(this.bridge.startLiveData(callbackName, intervalMs));
    } catch (error) {
      unsubscribeChannel();
      this.activeCallbacks.delete(callbackName);
      throw error;
    }

    let active = true;
    return () => {
      if (!active) return;
      active = false;
      unsubscribeChannel();
      this.stopSubscription(callbackName);
    };
  }

  private stopSubscription(callbackName: string): void {
    if (!this.activeCallbacks.delete(callbackName)) return;
    try {
      unwrap(this.bridge.stopLiveData(callbackName));
    } catch {
      // Zatrzymanie strumienia nie może przesłonić pierwotnego błędu.
    }
  }

  private requireConnection(): void {
    if (!this.connected) {
      throw new ObdTransportError('NOT_CONNECTED', 'Najpierw połącz transport Android OBD.');
    }
  }
}
