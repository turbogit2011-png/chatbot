/// TurboCare Ecosystem — Filar 4
/// =============================
/// LIVE BOOST ANALYZER — analizator mapy doładowania w czasie rzeczywistym.
///
/// Konsument strumienia próbek PID (10–20 Hz) z silnika telemetrii.
/// Na żywo:
///   • liczy dewiację Target Boost vs Actual Boost,
///   • wykrywa okna niedoładowania / przeładowania
///     (|dewiacja| > 0,2 bar utrzymująca się > 1,5 s),
///   • klasyfikuje prawdopodobną sygnaturę usterki (nieszczelność dolotu /
///     błąd kalibracji nastawnika / przeciwciśnienie wydechu / czujnik),
///   • wylicza zbiorczy Boost Health Score 0–100 dla raportu gwarancyjnego,
///   • porównuje szczyty doładowania ze znamionową mapą referencyjną turbiny.
///
/// Projekt pod wydajność: zero alokacji na gorącej ścieżce [addSample]
/// poza faktycznym otwarciem/zamknięciem anomalii; całość O(1) na próbkę.
library;

import 'dart:math' as math;

// ---------------------------------------------------------------------------
// WEJŚCIE: PRÓBKA TELEMETRII
// ---------------------------------------------------------------------------

/// Pojedyncza próbka z pętli PID (jedna "klatka" telemetrii).
///
/// Ciśnienia w barach jako NADCIŚNIENIE względem atmosfery (boost gauge):
/// warstwa transportu odejmuje ciśnienie barometryczne od odczytu MAP.
final class BoostSample {
  const BoostSample({
    required this.timestampMs,
    required this.targetBoostBar,
    required this.actualBoostBar,
    required this.rpm,
    this.actuatorDutyPct,
    this.mafGs,
    this.engineLoadPct,
  });

  /// Znacznik czasu monotoniczny [ms] (Stopwatch, nie zegar ścienny —
  /// odporny na korekty NTP w trakcie próby drogowej).
  final int timestampMs;

  /// Ciśnienie zadane przez ECU [bar].
  final double targetBoostBar;

  /// Ciśnienie rzeczywiste z czujnika MAP [bar].
  final double actualBoostBar;

  final int rpm;

  /// Wysterowanie nastawnika / N75 [%] — jeśli pojazd je raportuje.
  final double? actuatorDutyPct;

  /// Masowy przepływ powietrza [g/s] — jeśli dostępny.
  final double? mafGs;

  /// Obciążenie silnika [%] — jeśli dostępne.
  final double? engineLoadPct;

  /// Dewiacja: dodatnia = przeładowanie, ujemna = niedoładowanie.
  double get deviationBar => actualBoostBar - targetBoostBar;
}

// ---------------------------------------------------------------------------
// PUNKT MAPY REFERENCYJNEJ (z paszportu turbiny)
// ---------------------------------------------------------------------------

/// Punkt znamionowej mapy doładowania z cyfrowego paszportu turbiny.
final class ReferenceBoostPoint {
  const ReferenceBoostPoint({
    required this.rpm,
    required this.expectedBoostBar,
    this.toleranceBar = 0.15,
  });

  final int rpm;
  final double expectedBoostBar;
  final double toleranceBar;
}

// ---------------------------------------------------------------------------
// WYJŚCIE: ZDARZENIA I WYNIK
// ---------------------------------------------------------------------------

/// Rodzaj anomalii doładowania.
enum BoostAnomalyType { underboost, overboost }

/// Prawdopodobna sygnatura źródła anomalii — heurystyka przyczynowo-skutkowa
/// spójna z matrycami DTC Engine (te same identyfikatory przyczyn).
enum BoostFaultSignature {
  /// Niedoładowanie przy WYSOKIM duty nastawnika → ECU "dopycha", a ciśnienia
  /// brak ⇒ powietrze ucieka: nieszczelność dolotu / intercoolera.
  intakeLeak,

  /// Niedoładowanie przy NISKIM duty → ECU nie steruje lub sterowanie
  /// nieskuteczne ⇒ błąd kalibracji / regulacji sztangi nastawnika.
  actuatorCalibration,

  /// Niedoładowanie z niskim MAF mimo wysokiego duty i braku nadwyżki
  /// dewiacji ciśnienia ⇒ przeciwciśnienie wydechu (DPF/kat) dławi turbinę.
  exhaustBackpressure,

  /// Przeładowanie ⇒ geometria zacina się w pozycji "spool" lub sterowanie
  /// podciśnieniem nie otwiera upustu — zawsze krytyczne.
  overboostControl,

  /// Dane niespójne fizycznie (np. boost bez MAF) ⇒ podejrzenie czujnika.
  sensorImplausible,

  unknown,
}

/// Zamknięte okno anomalii — trafia do raportu i na oś czasu wykresu.
final class BoostAnomalyEvent {
  const BoostAnomalyEvent({
    required this.type,
    required this.signature,
    required this.startOffsetMs,
    required this.durationMs,
    required this.peakDeviationBar,
    required this.rpmAtPeak,
    required this.actuatorDutyAtPeakPct,
  });

  final BoostAnomalyType type;
  final BoostFaultSignature signature;
  final int startOffsetMs;
  final int durationMs;

  /// Szczytowa dewiacja w oknie (ze znakiem).
  final double peakDeviationBar;
  final int rpmAtPeak;
  final double? actuatorDutyAtPeakPct;

  Map<String, Object?> toJson() => {
        'type': type.name,
        'signature': signature.name,
        'startOffsetMs': startOffsetMs,
        'durationMs': durationMs,
        'peakDeviationBar': double.parse(peakDeviationBar.toStringAsFixed(3)),
        'rpmAtPeak': rpmAtPeak,
        if (actuatorDutyAtPeakPct != null)
          'actuatorDutyAtPeakPct':
              double.parse(actuatorDutyAtPeakPct!.toStringAsFixed(1)),
      };
}

/// Migawka stanu analizatora po każdej próbce — zasila wykres live
/// (linia Target, linia Actual, wskaźnik score, aktywna flaga anomalii).
final class BoostAnalysisFrame {
  const BoostAnalysisFrame({
    required this.sample,
    required this.deviationBar,
    required this.smoothedDeviationBar,
    required this.healthScore,
    required this.anomalyInProgress,
  });

  final BoostSample sample;
  final double deviationBar;

  /// Dewiacja po filtrze EWMA — bez szumu czujnika, do wskaźnika UI.
  final double smoothedDeviationBar;

  /// Bieżący Boost Health Score 0–100.
  final int healthScore;

  /// Typ trwającej (jeszcze niezamkniętej) anomalii lub `null`.
  final BoostAnomalyType? anomalyInProgress;
}

/// Wynik końcowy sesji — dowód dla `RoadTestEvidence` w maszynie stanów.
final class BoostSessionResult {
  const BoostSessionResult({
    required this.healthScore,
    required this.passed,
    required this.meanAbsDeviationBar,
    required this.events,
    required this.durationSeconds,
    required this.peakBoostBar,
    required this.referenceMapSatisfied,
    required this.dominantSignature,
  });

  final int healthScore;
  final bool passed;
  final double meanAbsDeviationBar;
  final List<BoostAnomalyEvent> events;
  final int durationSeconds;
  final double peakBoostBar;

  /// Czy szczyty doładowania osiągnęły mapę referencyjną z paszportu.
  final bool referenceMapSatisfied;

  /// Najczęstsza sygnatura usterki wśród zdarzeń (lub `null` przy braku).
  final BoostFaultSignature? dominantSignature;

  int get underboostEvents =>
      events.where((e) => e.type == BoostAnomalyType.underboost).length;
  int get overboostEvents =>
      events.where((e) => e.type == BoostAnomalyType.overboost).length;

  Map<String, Object?> toJson() => {
        'boostHealthScore': healthScore,
        'passed': passed,
        'meanAbsDeviationBar':
            double.parse(meanAbsDeviationBar.toStringAsFixed(3)),
        'underboostEvents': underboostEvents,
        'overboostEvents': overboostEvents,
        'durationSeconds': durationSeconds,
        'peakBoostBar': double.parse(peakBoostBar.toStringAsFixed(2)),
        'referenceMapSatisfied': referenceMapSatisfied,
        'suspectedRootCause': dominantSignature?.name ?? 'none',
        'anomalies': events.map((e) => e.toJson()).toList(),
      };
}

// ---------------------------------------------------------------------------
// KONFIGURACJA
// ---------------------------------------------------------------------------

/// Progi i stałe algorytmu — wartości domyślne wg specyfikacji produktu,
/// nadpisywalne profilem marki (np. ciaśniejsze tolerancje dla BMW M).
final class BoostAnalyzerConfig {
  const BoostAnalyzerConfig({
    this.deviationThresholdBar = 0.20,
    this.anomalyMinDurationMs = 1500,
    this.minRpmForAnalysis = 1400,
    this.minTargetBoostBar = 0.30,
    this.ewmaAlpha = 0.30,
    this.highDutyThresholdPct = 75.0,
    this.lowDutyThresholdPct = 35.0,
    this.passingScore = 85,
    this.scoreEventPenaltyUnder = 8.0,
    this.scoreEventPenaltyOver = 15.0,
  });

  /// Próg dewiacji uznawanej za anomalię [bar] (spec: 0,2 bar).
  final double deviationThresholdBar;

  /// Minimalny czas utrzymywania się dewiacji, by otworzyć zdarzenie [ms]
  /// (spec: 1,5 s) — filtruje naturalny lag turbo przy szarpnięciu gazem.
  final int anomalyMinDurationMs;

  /// Poniżej tych obrotów nie oceniamy (bieg jałowy / brak żądania boost).
  final int minRpmForAnalysis;

  /// Analiza tylko, gdy ECU faktycznie żąda doładowania — inaczej porównanie
  /// Target/Actual nie ma sensu fizycznego (hamowanie silnikiem itd.).
  final double minTargetBoostBar;

  /// Współczynnik wygładzania EWMA dewiacji (0–1; wyżej = szybsza reakcja).
  final double ewmaAlpha;

  /// Progi duty do klasyfikacji sygnatury usterki.
  final double highDutyThresholdPct;
  final double lowDutyThresholdPct;

  /// Minimalny score zaliczający próbę drogową.
  final int passingScore;

  /// Kary punktowe za zamknięte zdarzenia (overboost karany mocniej —
  /// realne ryzyko uszkodzenia silnika i turbiny).
  final double scoreEventPenaltyUnder;
  final double scoreEventPenaltyOver;
}

// ---------------------------------------------------------------------------
// ANALIZATOR
// ---------------------------------------------------------------------------

/// Stanowy analizator strumienia próbek. Cykl życia:
///
/// ```dart
/// final analyzer = LiveBoostAnalyzer(
///   config: const BoostAnalyzerConfig(),
///   referenceMap: passport.referenceBoostMap,
/// );
/// pidStream.listen((s) => chart.push(analyzer.addSample(s)));
/// ...
/// final result = analyzer.finish(); // → RoadTestEvidence
/// ```
final class LiveBoostAnalyzer {
  LiveBoostAnalyzer({
    this.config = const BoostAnalyzerConfig(),
    List<ReferenceBoostPoint> referenceMap = const [],
  }) : _referenceMap = List.unmodifiable(
          referenceMap.toList()..sort((a, b) => a.rpm.compareTo(b.rpm)),
        );

  final BoostAnalyzerConfig config;
  final List<ReferenceBoostPoint> _referenceMap;

  // --- Stan bieżący (gorąca ścieżka: same pola prymitywne) ---
  int _firstTimestampMs = -1;
  int _lastTimestampMs = 0;
  double _ewmaDeviation = 0.0;
  bool _ewmaSeeded = false;

  // Akumulatory statystyk sesji.
  int _evaluatedSamples = 0;
  double _sumAbsDeviation = 0.0;
  double _peakBoost = 0.0;

  // Najlepsze osiągnięte doładowanie w koszykach RPM mapy referencyjnej —
  // do walidacji, czy turbina "dochodzi" do wartości znamionowych.
  final Map<int, double> _bestBoostNearReference = {};

  // Stan otwartego (kandydującego) okna anomalii.
  BoostAnomalyType? _pendingType;
  int _pendingStartMs = 0;
  double _pendingPeakDeviation = 0.0;
  int _pendingRpmAtPeak = 0;
  double? _pendingDutyAtPeak;
  double _pendingMafSum = 0.0;
  int _pendingMafCount = 0;

  // Czy okno przekroczyło próg czasu i jest już "prawdziwym" zdarzeniem.
  bool get _pendingConfirmed =>
      _pendingType != null &&
      (_lastTimestampMs - _pendingStartMs) >= config.anomalyMinDurationMs;

  final List<BoostAnomalyEvent> _events = [];

  /// Zamknięte zdarzenia (na żywo, rosnąco po czasie).
  List<BoostAnomalyEvent> get events => List.unmodifiable(_events);

  bool _finished = false;

  /// Przetworzenie jednej próbki — wywoływane 10–20×/s z pętli telemetrii.
  /// Zwraca ramkę do natychmiastowego renderu wykresu.
  BoostAnalysisFrame addSample(BoostSample sample) {
    assert(!_finished, 'Analizator został już zamknięty metodą finish().');

    _firstTimestampMs =
        _firstTimestampMs < 0 ? sample.timestampMs : _firstTimestampMs;
    _lastTimestampMs = sample.timestampMs;
    _peakBoost = math.max(_peakBoost, sample.actualBoostBar);
    _trackReferenceMap(sample);

    final deviation = sample.deviationBar;

    // Wygładzanie EWMA — pierwsza próbka inicjuje filtr wprost.
    _ewmaDeviation = _ewmaSeeded
        ? config.ewmaAlpha * deviation + (1 - config.ewmaAlpha) * _ewmaDeviation
        : deviation;
    _ewmaSeeded = true;

    // Ocena tylko w oknie fizycznej sensowności (obroty + żądanie boostu).
    final evaluable = sample.rpm >= config.minRpmForAnalysis &&
        sample.targetBoostBar >= config.minTargetBoostBar;

    if (evaluable) {
      _evaluatedSamples++;
      _sumAbsDeviation += deviation.abs();
      _updateAnomalyWindow(sample, deviation);
    } else {
      // Poza oknem oceny: zamykamy ewentualną trwającą anomalię.
      _closePendingIfConfirmed();
      _pendingType = null;
    }

    return BoostAnalysisFrame(
      sample: sample,
      deviationBar: deviation,
      smoothedDeviationBar: _ewmaDeviation,
      healthScore: _currentScore(),
      anomalyInProgress: _pendingConfirmed ? _pendingType : null,
    );
  }

  /// Zakończenie sesji: domknięcie otwartych okien i wyliczenie wyniku.
  BoostSessionResult finish() {
    _finished = true;
    _closePendingIfConfirmed();
    _pendingType = null;

    final score = _currentScore();
    final refOk = _referenceMapSatisfied();
    final durationS = _firstTimestampMs < 0
        ? 0
        : ((_lastTimestampMs - _firstTimestampMs) / 1000).round();

    return BoostSessionResult(
      healthScore: score,
      // Zaliczenie: score + brak zdarzeń + osiągnięta mapa referencyjna.
      passed: score >= config.passingScore && _events.isEmpty && refOk,
      meanAbsDeviationBar:
          _evaluatedSamples == 0 ? 0 : _sumAbsDeviation / _evaluatedSamples,
      events: List.unmodifiable(_events),
      durationSeconds: durationS,
      peakBoostBar: _peakBoost,
      referenceMapSatisfied: refOk,
      dominantSignature: _dominantSignature(),
    );
  }

  // -------------------------------------------------------------------------
  // DETEKCJA OKIEN ANOMALII
  // -------------------------------------------------------------------------

  void _updateAnomalyWindow(BoostSample sample, double deviation) {
    final BoostAnomalyType? observed = switch (deviation) {
      final d when d <= -config.deviationThresholdBar =>
        BoostAnomalyType.underboost,
      final d when d >= config.deviationThresholdBar =>
        BoostAnomalyType.overboost,
      _ => null,
    };

    if (observed == null || observed != _pendingType) {
      // Koniec dotychczasowego okna (jeśli przekroczyło próg czasu — raport).
      _closePendingIfConfirmed();
      _pendingType = observed;
      if (observed != null) {
        // Otwarcie nowego okna kandydującego.
        _pendingStartMs = sample.timestampMs;
        _pendingPeakDeviation = deviation;
        _pendingRpmAtPeak = sample.rpm;
        _pendingDutyAtPeak = sample.actuatorDutyPct;
        _pendingMafSum = sample.mafGs ?? 0;
        _pendingMafCount = sample.mafGs != null ? 1 : 0;
      }
      return;
    }

    // Kontynuacja okna — aktualizacja szczytu i statystyk pomocniczych.
    if (deviation.abs() > _pendingPeakDeviation.abs()) {
      _pendingPeakDeviation = deviation;
      _pendingRpmAtPeak = sample.rpm;
      _pendingDutyAtPeak = sample.actuatorDutyPct;
    }
    if (sample.mafGs != null) {
      _pendingMafSum += sample.mafGs!;
      _pendingMafCount++;
    }
  }

  void _closePendingIfConfirmed() {
    if (!_pendingConfirmed) return;
    final type = _pendingType!;
    _events.add(BoostAnomalyEvent(
      type: type,
      signature: _classify(type),
      startOffsetMs: _pendingStartMs - _firstTimestampMs,
      durationMs: _lastTimestampMs - _pendingStartMs,
      peakDeviationBar: _pendingPeakDeviation,
      rpmAtPeak: _pendingRpmAtPeak,
      actuatorDutyAtPeakPct: _pendingDutyAtPeak,
    ));
  }

  /// Heurystyka przyczynowo-skutkowa — patrz opisy w [BoostFaultSignature].
  BoostFaultSignature _classify(BoostAnomalyType type) {
    if (type == BoostAnomalyType.overboost) {
      return BoostFaultSignature.overboostControl;
    }
    final duty = _pendingDutyAtPeak;
    final avgMaf = _pendingMafCount > 0 ? _pendingMafSum / _pendingMafCount : null;

    if (duty == null) return BoostFaultSignature.unknown;
    if (duty >= config.highDutyThresholdPct) {
      // ECU steruje "na maksa", ciśnienia brak.
      if (avgMaf != null && avgMaf < _expectedMafFloorGs(_pendingRpmAtPeak)) {
        // Mało powietrza mimo pełnego wysterowania → coś dławi przepływ.
        return BoostFaultSignature.exhaustBackpressure;
      }
      // Przepływ jest, ciśnienia nie ma → powietrze ucieka przed kolektorem.
      return BoostFaultSignature.intakeLeak;
    }
    if (duty <= config.lowDutyThresholdPct) {
      // ECU nawet nie próbuje dopychać → pętla sterowania/kalibracja.
      return BoostFaultSignature.actuatorCalibration;
    }
    return BoostFaultSignature.unknown;
  }

  /// Minimalny fizycznie sensowny MAF [g/s] dla obrotów — zgrubny model
  /// objętościowy silnika 2.0 TDI; profil marki może podstawić własny.
  double _expectedMafFloorGs(int rpm) => rpm * 0.012;

  // -------------------------------------------------------------------------
  // MAPA REFERENCYJNA I SCORE
  // -------------------------------------------------------------------------

  /// Rejestrowanie najlepszego osiągniętego boostu w pobliżu punktów mapy
  /// (koszyk ±250 RPM) — porównujemy szczyty, nie chwilowe wartości.
  void _trackReferenceMap(BoostSample sample) {
    for (var i = 0; i < _referenceMap.length; i++) {
      final ref = _referenceMap[i];
      if ((sample.rpm - ref.rpm).abs() <= 250) {
        final best = _bestBoostNearReference[ref.rpm] ?? double.negativeInfinity;
        if (sample.actualBoostBar > best) {
          _bestBoostNearReference[ref.rpm] = sample.actualBoostBar;
        }
      }
    }
  }

  /// Mapa spełniona, gdy każdy ODWIEDZONY punkt osiągnął wartość znamionową
  /// w tolerancji; punkty nieodwiedzone (mechanik nie wkręcił silnika w dany
  /// zakres) nie oblewają testu, ale UI oznacza je jako "niezweryfikowane".
  bool _referenceMapSatisfied() {
    if (_referenceMap.isEmpty) return true;
    var anyVisited = false;
    for (final ref in _referenceMap) {
      final best = _bestBoostNearReference[ref.rpm];
      if (best == null) continue;
      anyVisited = true;
      if (best < ref.expectedBoostBar - ref.toleranceBar) return false;
    }
    return anyVisited;
  }

  /// Boost Health Score 0–100:
  ///   score = 100
  ///     − 60 × znormalizowana średnia |dewiacja| (nasycenie przy 0,5 bar)
  ///     − kary za zamknięte zdarzenia (over karane mocniej niż under)
  int _currentScore() {
    if (_evaluatedSamples == 0) return 100;
    final meanAbs = _sumAbsDeviation / _evaluatedSamples;
    final deviationPenalty = 60.0 * math.min(1.0, meanAbs / 0.5);
    var eventPenalty = 0.0;
    for (final e in _events) {
      eventPenalty += e.type == BoostAnomalyType.overboost
          ? config.scoreEventPenaltyOver
          : config.scoreEventPenaltyUnder;
    }
    return math.max(0, math.min(100, (100.0 - deviationPenalty - eventPenalty).round()));
  }

  BoostFaultSignature? _dominantSignature() {
    if (_events.isEmpty) return null;
    final counts = <BoostFaultSignature, int>{};
    for (final e in _events) {
      counts[e.signature] = (counts[e.signature] ?? 0) + 1;
    }
    return counts.entries
        .reduce((a, b) => b.value > a.value ? b : a)
        .key;
  }
}
