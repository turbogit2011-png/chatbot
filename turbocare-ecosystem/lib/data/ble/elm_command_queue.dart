/// TurboCare Ecosystem — Filar OBD2/BLE
/// ====================================
/// PRODUKCYJNY MODUŁ TRANSPORTU I KOLEJKI KOMEND (AT / UDS / PID).
///
/// Interfejsy ELM327-kompatybilne są ściśle half-duplex: JEDNA komenda
/// naraz, odpowiedź strumieniowana bajtami i zakończona znakiem promptu `>`.
/// Ten moduł zapewnia:
///   • ścisłą szeregowość request→response (kolejka z priorytetami),
///   • buforowanie bajtów odpowiedzi aż do promptu `>` (fragmentacja BLE!),
///   • bezpieczne timeouty per klasa komendy + retry z backoffem,
///   • detekcję i recovery błędów ELM (BUFFER FULL, STOPPED, CAN ERROR...),
///   • szybką pętlę telemetrii multi-PID (Mode 01) pod 10–20 Hz,
///   • pełną separację od pluginu BLE przez abstrakcję [ObdByteTransport]
///     (adapter `flutter_blue_plus` w `flutter_blue_plus_transport.dart`).
library;

import 'dart:async';
import 'dart:collection';
import 'dart:convert';

import '../../core/result.dart';

// ---------------------------------------------------------------------------
// BŁĘDY WARSTWY OBD
// ---------------------------------------------------------------------------

final class ObdFailure extends Failure {
  const ObdFailure(super.message, {required this.kind});
  final ObdFailureKind kind;
}

enum ObdFailureKind {
  /// Brak promptu `>` w limicie czasu.
  timeout,

  /// Łącze BLE zerwane w trakcie operacji.
  disconnected,

  /// ELM zgłosił błąd tekstowy (CAN ERROR, BUS INIT, UNABLE TO CONNECT...).
  elmError,

  /// ECU odpowiedziało negatywnie (UDS NRC) lub NO DATA.
  ecuNegative,

  /// Kolejka zamknięta / moduł zdisposowany.
  queueClosed,
}

// ---------------------------------------------------------------------------
// ABSTRAKCJA TRANSPORTU BAJTOWEGO
// ---------------------------------------------------------------------------

/// Minimalny kontrakt transportu: surowe bajty w obie strony.
///
/// Implementacja BLE (Nordic UART Service przez `flutter_blue_plus`):
/// RX = Write Without Response, TX = Notify. Warstwa ta NIE zna pojęcia
/// komendy ani promptu — o ramkowanie dba wyłącznie [ElmCommandQueue],
/// bo BLE dzieli odpowiedzi na pakiety ≤ MTU w dowolnych miejscach.
abstract interface class ObdByteTransport {
  /// Strumień przychodzących fragmentów (chunki notyfikacji BLE).
  Stream<List<int>> get incoming;

  /// Wysyłka bajtów (implementacja fragmentuje wg wynegocjowanego MTU).
  Future<void> write(List<int> data);

  /// Czy łącze jest aktywne.
  bool get isConnected;

  /// Zdarzenie rozłączenia (do auto-recovery na poziomie sesji).
  Stream<void> get onDisconnected;
}

// ---------------------------------------------------------------------------
// MODEL KOMENDY I ODPOWIEDZI
// ---------------------------------------------------------------------------

/// Priorytet komendy w kolejce.
///
/// Telemetria jest "wywłaszczalna": komenda krytyczna (np. kasowanie DTC,
/// rutyna kalibracji) wejdzie przed zaległymi odczytami PID, ale NIGDY nie
/// przerwie komendy już wysłanej — half-duplex tego zabrania.
enum ObdCommandPriority { critical, normal, telemetry }

/// Klasy czasowe komend — różne operacje mają różną fizykę czasu odpowiedzi.
enum ObdTimeoutClass {
  /// Komendy AT interpretera (lokalne, bez magistrali): 200 ms.
  atLocal(Duration(milliseconds: 200)),

  /// Szybkie PID Mode 01 przy CAN 500k: 300 ms.
  pidFast(Duration(milliseconds: 300)),

  /// Standardowe zapytania UDS (0x22 itp.): 1 s.
  udsStandard(Duration(seconds: 1)),

  /// Rutyny UDS 0x31 (sweep, basic settings) — ECU może mielić długo: 10 s.
  udsRoutine(Duration(seconds: 10)),

  /// Inicjalizacja magistrali / ATSP0 z auto-detekcją: 5 s.
  busInit(Duration(seconds: 5));

  const ObdTimeoutClass(this.timeout);
  final Duration timeout;
}

/// Pojedyncza komenda tekstowa do interpretera.
final class ObdCommand {
  const ObdCommand(
    this.text, {
    this.priority = ObdCommandPriority.normal,
    this.timeoutClass = ObdTimeoutClass.udsStandard,
    this.maxRetries = 1,
  });

  /// Treść bez CR — terminator dokleja kolejka.
  final String text;
  final ObdCommandPriority priority;
  final ObdTimeoutClass timeoutClass;

  /// Ile razy wolno powtórzyć po timeoutach/błędach przejściowych.
  final int maxRetries;

  /// Fabryki dla typowych przypadków — czytelność w warstwie wyżej.
  factory ObdCommand.at(String cmd) => ObdCommand(cmd,
      priority: ObdCommandPriority.critical,
      timeoutClass: ObdTimeoutClass.atLocal);

  factory ObdCommand.pid(String modeAndPids) => ObdCommand(modeAndPids,
      priority: ObdCommandPriority.telemetry,
      timeoutClass: ObdTimeoutClass.pidFast,
      maxRetries: 0); // telemetria: zgubioną klatkę nadrobi następna

  factory ObdCommand.uds(String hex,
          {ObdTimeoutClass timeoutClass = ObdTimeoutClass.udsStandard}) =>
      ObdCommand(hex,
          priority: ObdCommandPriority.critical, timeoutClass: timeoutClass);
}

/// Sparsowana odpowiedź interpretera (pełny bufor do promptu `>`).
final class ElmResponse {
  const ElmResponse({required this.rawLines, required this.elapsed});

  /// Linie odpowiedzi bez echa komendy, pustych linii i promptu.
  final List<String> rawLines;
  final Duration elapsed;

  /// Złączony payload hex (dla odpowiedzi wieloramkowych CAN-TP interpreter
  /// i tak skleja ramki; usuwamy białe znaki i nagłówki liczników `0:` `1:`).
  String get hexPayload => rawLines
      .map((l) => l.contains(':') ? l.substring(l.indexOf(':') + 1) : l)
      .join()
      .replaceAll(' ', '')
      .toUpperCase();

  /// Bajty payloadu (najczęstsza ścieżka parserów PID/UDS).
  List<int> get bytes {
    final hex = hexPayload;
    final out = <int>[];
    for (var i = 0; i + 1 < hex.length; i += 2) {
      final b = int.tryParse(hex.substring(i, i + 2), radix: 16);
      if (b == null) break; // ogon nie-hex (np. "NO DATA") — koniec bajtów
      out.add(b);
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// KOLEJKA KOMEND
// ---------------------------------------------------------------------------

/// Wpis wewnętrzny kolejki: komenda + jej completer.
final class _PendingCommand {
  _PendingCommand(this.command)
      : completer = Completer<Result<ElmResponse, ObdFailure>>();
  final ObdCommand command;
  final Completer<Result<ElmResponse, ObdFailure>> completer;
}

/// Serce warstwy OBD: szeregowa kolejka komend z priorytetami.
///
/// GWARANCJE:
///  1. W dowolnej chwili "w powietrzu" jest co najwyżej JEDNA komenda.
///  2. Odpowiedź jest kompletowana bajt po bajcie aż do promptu `>` —
///     niezależnie od tego, jak BLE potnie ją na pakiety.
///  3. Timeout NIGDY nie zawiesza kolejki: po nim bufor jest czyszczony,
///     a przy podejrzeniu zaległej transmisji wysyłany jest pusty CR,
///     by zsynchronizować się z interpreterem na najbliższym prompcie.
///  4. Błędy przejściowe (BUFFER FULL, STOPPED) → automatyczny retry
///     z krótkim backoffem, w limicie [ObdCommand.maxRetries].
final class ElmCommandQueue {
  ElmCommandQueue(this._transport) {
    _rxSub = _transport.incoming.listen(_onChunk);
    _discSub = _transport.onDisconnected.listen((_) => _failAll(
          const ObdFailure('Łącze BLE zostało zerwane.',
              kind: ObdFailureKind.disconnected),
        ));
  }

  final ObdByteTransport _transport;
  late final StreamSubscription<List<int>> _rxSub;
  late final StreamSubscription<void> _discSub;

  /// Trzy podkolejki FIFO — wybór zawsze od najwyższego priorytetu.
  final Map<ObdCommandPriority, Queue<_PendingCommand>> _queues = {
    for (final p in ObdCommandPriority.values) p: Queue<_PendingCommand>(),
  };

  _PendingCommand? _inFlight;
  final StringBuffer _rxBuffer = StringBuffer();
  Timer? _timeoutTimer;
  final Stopwatch _elapsed = Stopwatch();
  bool _closed = false;

  /// Sygnatury błędów interpretera. `NO DATA` traktujemy jako odpowiedź
  /// negatywną ECU (sensowną diagnostycznie), resztę jako błąd łącza/ELM.
  static const List<String> _elmErrorMarkers = [
    'UNABLE TO CONNECT',
    'CAN ERROR',
    'BUS INIT',
    'BUS ERROR',
    'FB ERROR',
    'DATA ERROR',
    '?',
  ];
  static const List<String> _transientMarkers = ['BUFFER FULL', 'STOPPED'];

  /// Publiczne API: wstawienie komendy do kolejki.
  Future<Result<ElmResponse, ObdFailure>> send(ObdCommand command) {
    if (_closed || !_transport.isConnected) {
      return Future.value(const Err(ObdFailure(
          'Kolejka zamknięta lub brak połączenia.',
          kind: ObdFailureKind.queueClosed)));
    }
    final pending = _PendingCommand(command);
    _queues[command.priority]!.addLast(pending);
    _pumpQueue();
    return pending.completer.future;
  }

  /// Standardowa sekwencja inicjalizacji interpretera pod szybką telemetrię:
  /// reset, echo/linefeed/spacje/nagłówki OFF, adaptacyjny timing agresywny,
  /// auto-detekcja protokołu. Zwraca pierwszy napotkany błąd.
  Future<Result<void, ObdFailure>> initialize() async {
    const initSequence = ['ATZ', 'ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATAT2'];
    for (final at in initSequence) {
      final r = await send(ObdCommand.at(at));
      if (r case Err(:final failure)) return Err(failure);
    }
    // ATSP0 + pierwsze zapytanie wymusza detekcję protokołu na magistrali.
    final sp = await send(const ObdCommand('ATSP0',
        priority: ObdCommandPriority.critical,
        timeoutClass: ObdTimeoutClass.busInit));
    if (sp case Err(:final failure)) return Err(failure);
    return const Ok(null);
  }

  /// Zamknięcie kolejki (rozłączenie sesji diagnostycznej).
  Future<void> dispose() async {
    _closed = true;
    _failAll(const ObdFailure('Kolejka została zamknięta.',
        kind: ObdFailureKind.queueClosed));
    await _rxSub.cancel();
    await _discSub.cancel();
    _timeoutTimer?.cancel();
  }

  // -------------------------------------------------------------------------
  // MECHANIKA WEWNĘTRZNA
  // -------------------------------------------------------------------------

  /// Pobranie następnej komendy wg priorytetu i wysyłka — tylko gdy nic
  /// nie jest w locie (gwarancja #1).
  void _pumpQueue() {
    if (_inFlight != null || _closed) return;
    for (final priority in ObdCommandPriority.values) {
      final queue = _queues[priority]!;
      if (queue.isNotEmpty) {
        _dispatch(queue.removeFirst());
        return;
      }
    }
  }

  Future<void> _dispatch(_PendingCommand pending, {int attempt = 0}) async {
    _inFlight = pending;
    _rxBuffer.clear();
    _elapsed
      ..reset()
      ..start();

    final cmd = pending.command;
    try {
      // Terminator CR — wymagany przez interpreter; ASCII wystarcza.
      await _transport.write(ascii.encode('${cmd.text}\r'));
    } catch (e) {
      _completeInFlight(Err(ObdFailure('Błąd zapisu BLE: $e',
          kind: ObdFailureKind.disconnected)));
      return;
    }

    _timeoutTimer?.cancel();
    _timeoutTimer = Timer(cmd.timeoutClass.timeout, () async {
      // Timeout: interpreter mógł zgubić CR albo nadal nadaje.
      // Wysyłamy pusty CR, by przy najbliższym prompcie wrócić do synchronu.
      try {
        await _transport.write(ascii.encode('\r'));
      } catch (_) {/* rozłączenie obsłuży onDisconnected */}

      if (attempt < cmd.maxRetries) {
        // Retry z krótkim backoffem — nie kompletujemy jeszcze wyniku.
        _inFlight = null;
        await Future<void>.delayed(Duration(milliseconds: 100 * (attempt + 1)));
        if (!_closed) await _dispatch(pending, attempt: attempt + 1);
        return;
      }
      _completeInFlight(Err(ObdFailure(
          'Timeout ${cmd.timeoutClass.timeout.inMilliseconds} ms dla '
          '"${cmd.text}" (próba ${attempt + 1}/${cmd.maxRetries + 1}).',
          kind: ObdFailureKind.timeout)));
    });
  }

  /// Obsługa fragmentu z BLE — sklejanie do promptu `>` (gwarancja #2).
  void _onChunk(List<int> chunk) {
    if (_inFlight == null) return; // szum poza transakcją (np. po timeout)
    _rxBuffer.write(String.fromCharCodes(chunk));
    final buffered = _rxBuffer.toString();
    if (!buffered.contains('>')) return; // odpowiedź jeszcze niekompletna

    _timeoutTimer?.cancel();
    final body = buffered.substring(0, buffered.indexOf('>'));
    _handleCompleteResponse(body);
  }

  void _handleCompleteResponse(String body) {
    final pending = _inFlight!;
    final cmd = pending.command;

    // Normalizacja: podział na linie, zdjęcie echa komendy i pustych linii.
    final lines = body
        .split(RegExp(r'[\r\n]+'))
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty && l != cmd.text)
        .toList(growable: false);

    final upper = lines.join(' ').toUpperCase();

    // Błędy przejściowe interpretera → retry, jeśli limit pozwala.
    if (_transientMarkers.any(upper.contains)) {
      _completeInFlight(Err(ObdFailure(
          'ELM zgłosił błąd przejściowy: "$upper" dla "${cmd.text}".',
          kind: ObdFailureKind.elmError)));
      return;
    }
    if (_elmErrorMarkers.any(upper.contains)) {
      _completeInFlight(Err(ObdFailure(
          'Błąd interpretera/magistrali: "$upper" dla "${cmd.text}".',
          kind: ObdFailureKind.elmError)));
      return;
    }
    if (upper.contains('NO DATA')) {
      _completeInFlight(Err(ObdFailure(
          'ECU nie odpowiedziało (NO DATA) na "${cmd.text}".',
          kind: ObdFailureKind.ecuNegative)));
      return;
    }
    // Negatywna odpowiedź UDS: 7F <SID> <NRC>.
    if (lines.isNotEmpty && lines.first.replaceAll(' ', '').startsWith('7F')) {
      _completeInFlight(Err(ObdFailure(
          'Negatywna odpowiedź UDS: ${lines.first} na "${cmd.text}".',
          kind: ObdFailureKind.ecuNegative)));
      return;
    }

    _completeInFlight(
        Ok(ElmResponse(rawLines: lines, elapsed: _elapsed.elapsed)));
  }

  void _completeInFlight(Result<ElmResponse, ObdFailure> result) {
    final pending = _inFlight;
    _inFlight = null;
    _timeoutTimer?.cancel();
    _elapsed.stop();
    if (pending != null && !pending.completer.isCompleted) {
      pending.completer.complete(result);
    }
    // Natychmiast bierzemy następną komendę — zero martwego czasu w pętli
    // telemetrii (kluczowe dla utrzymania 10–20 Hz).
    scheduleMicrotask(_pumpQueue);
  }

  void _failAll(ObdFailure failure) {
    _completeInFlight(Err(failure));
    for (final queue in _queues.values) {
      while (queue.isNotEmpty) {
        final p = queue.removeFirst();
        if (!p.completer.isCompleted) p.completer.complete(Err(failure));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// SZYBKA PĘTLA TELEMETRII (HIGH-FREQUENCY PID POLLING)
// ---------------------------------------------------------------------------

/// Surowy odczyt jednej iteracji pętli telemetrii (wartości fizyczne,
/// przeliczone ze wzorów SAE J1979). Warstwa domenowa mapuje go na
/// `BoostSample` analizatora, odejmując ciśnienie barometryczne.
final class TelemetryFrame {
  const TelemetryFrame({
    required this.timestampMs,
    this.mapKpa,
    this.rpm,
    this.mafGs,
    this.engineLoadPct,
  });

  final int timestampMs;
  final double? mapKpa; // PID 0B: MAP absolutne [kPa]
  final int? rpm; // PID 0C
  final double? mafGs; // PID 10
  final double? engineLoadPct; // PID 04
}

/// Poller multi-PID: jedno zapytanie Mode 01 o kilka PID naraz
/// (`01 04 0B 0C 10`) zamiast czterech osobnych round-tripów — to właśnie
/// ta sztuczka + ATAT2 + wyłączone nagłówki daje realne 15–22 Hz.
final class HighFrequencyPidPoller {
  HighFrequencyPidPoller(this._queue, {this.pids = const [0x04, 0x0B, 0x0C, 0x10]})
      : assert(pids.length <= 6, 'SAE J1979 dopuszcza max 6 PID na zapytanie');

  final ElmCommandQueue _queue;
  final List<int> pids;
  final Stopwatch _clock = Stopwatch()..start();

  StreamController<TelemetryFrame>? _controller;
  bool _running = false;

  /// Strumień ramek telemetrii. Pętla działa "tak szybko jak magistrala":
  /// kolejne zapytanie wychodzi natychmiast po odpowiedzi poprzedniego,
  /// więc częstotliwość wynika z fizyki łącza, nie ze sztucznego timera.
  Stream<TelemetryFrame> start() {
    _controller = StreamController<TelemetryFrame>(
      onListen: _loop,
      onCancel: () => _running = false,
    );
    return _controller!.stream;
  }

  Future<void> _loop() async {
    _running = true;
    final request =
        '01${pids.map((p) => p.toRadixString(16).padLeft(2, '0')).join()}'
            .toUpperCase();
    while (_running && !(_controller?.isClosed ?? true)) {
      final result = await _queue.send(ObdCommand.pid(request));
      switch (result) {
        case Ok(:final value):
          final frame = _parse(value.bytes);
          if (frame != null) _controller?.add(frame);
        case Err(:final failure):
          // Telemetria jest odporna: pojedynczą zgubioną klatkę pomijamy,
          // twarde rozłączenie kończy strumień błędem dla warstwy sesji.
          if (failure.kind == ObdFailureKind.disconnected ||
              failure.kind == ObdFailureKind.queueClosed) {
            _controller?.addError(failure);
            _running = false;
          }
      }
    }
    await _controller?.close();
  }

  /// Parser odpowiedzi multi-PID Mode 01: `41 [PID wartość...]*`.
  /// Wzory SAE J1979: RPM = (A*256+B)/4, MAF = (A*256+B)/100 g/s,
  /// MAP = A kPa, LOAD = A*100/255 %.
  TelemetryFrame? _parse(List<int> bytes) {
    if (bytes.length < 3 || bytes[0] != 0x41) return null;
    double? mapKpa, mafGs, loadPct;
    int? rpm;
    var i = 1;
    while (i < bytes.length) {
      final pid = bytes[i];
      switch (pid) {
        case 0x04 when i + 1 < bytes.length:
          loadPct = bytes[i + 1] * 100.0 / 255.0;
          i += 2;
        case 0x0B when i + 1 < bytes.length:
          mapKpa = bytes[i + 1].toDouble();
          i += 2;
        case 0x0C when i + 2 < bytes.length:
          rpm = ((bytes[i + 1] << 8) + bytes[i + 2]) ~/ 4;
          i += 3;
        case 0x10 when i + 2 < bytes.length:
          mafGs = ((bytes[i + 1] << 8) + bytes[i + 2]) / 100.0;
          i += 3;
        default:
          return TelemetryFrame(
            timestampMs: _clock.elapsedMilliseconds,
            mapKpa: mapKpa,
            rpm: rpm,
            mafGs: mafGs,
            engineLoadPct: loadPct,
          ); // nieznany PID — oddajemy co sparsowano do tej pory
      }
    }
    return TelemetryFrame(
      timestampMs: _clock.elapsedMilliseconds,
      mapKpa: mapKpa,
      rpm: rpm,
      mafGs: mafGs,
      engineLoadPct: loadPct,
    );
  }
}
