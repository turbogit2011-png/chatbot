import 'dart:convert';
import 'dart:math' as math;

import 'running_stats.dart';

/// Wektor cech opisujący jedno okno obserwacji (domyślnie 30 s).
///
/// Kolejność i znaczenie cech są częścią kontraktu z modelem — każda zmiana
/// wymaga podniesienia [schemaVersion], co unieważnia zapisane wagi
/// (repozytorium wykrywa niezgodność i wraca do wag priorytetowych).
class FeatureVector {
  const FeatureVector(this.values)
    : assert(values.length == length, 'Nieprawidłowa długość wektora cech');

  /// Wektor zerowy (poza biasem) — używany, gdy okno nie zebrało próbek.
  factory FeatureVector.empty() {
    final List<double> values = List<double>.filled(length, 0);
    values[bias] = 1;
    return FeatureVector(values);
  }

  factory FeatureVector.fromJson(String source) {
    final Object? decoded = jsonDecode(source);
    if (decoded is! List) {
      return FeatureVector.empty();
    }
    final List<double> values = decoded
        .map((Object? e) => e is num ? e.toDouble() : 0.0)
        .toList(growable: false);
    if (values.length != length) {
      return FeatureVector.empty();
    }
    return FeatureVector(values);
  }

  /// Wersja schematu cech. Podnieś przy każdej zmianie znaczenia lub kolejności.
  static const int schemaVersion = 1;

  static const int length = 14;

  // ── Indeksy cech ─────────────────────────────────────────────────────────
  static const int bias = 0;
  static const int motionEnergy = 1;
  static const int motionVariability = 2;
  static const int jerkRate = 3;
  static const int microMovementRate = 4;
  static const int stillnessRatio = 5;
  static const int rotationEnergy = 6;
  static const int postureShiftRate = 7;
  static const int foregroundSwitchRate = 8;
  static const int stepRate = 9;
  static const int charging = 10;
  static const int hourSin = 11;
  static const int hourCos = 12;
  static const int sessionLoad = 13;

  /// Nazwy techniczne — logi, eksport, testy.
  static const List<String> names = <String>[
    'bias',
    'motionEnergy',
    'motionVariability',
    'jerkRate',
    'microMovementRate',
    'stillnessRatio',
    'rotationEnergy',
    'postureShiftRate',
    'foregroundSwitchRate',
    'stepRate',
    'charging',
    'hourSin',
    'hourCos',
    'sessionLoad',
  ];

  /// Nazwy pokazywane użytkownikowi w panelu „co widzi Kairos”.
  static const Map<int, String> labels = <int, String>{
    motionEnergy: 'Energia ruchu',
    motionVariability: 'Zmienność ruchu',
    jerkRate: 'Szarpnięcia',
    microMovementRate: 'Mikroruchy',
    stillnessRatio: 'Bezruch',
    rotationEnergy: 'Obroty urządzenia',
    postureShiftRate: 'Zmiany pozycji',
    foregroundSwitchRate: 'Przełączenia aplikacji',
    stepRate: 'Tempo kroków',
    sessionLoad: 'Obciążenie sesji',
  };

  final List<double> values;

  double operator [](int index) => values[index];

  /// Cechy pokazywane w UI (bez biasu i kodowania czasu).
  static const List<int> displayable = <int>[
    motionEnergy,
    microMovementRate,
    stillnessRatio,
    foregroundSwitchRate,
    jerkRate,
    stepRate,
  ];

  String toJson() => jsonEncode(values);

  @override
  String toString() {
    final StringBuffer buffer = StringBuffer('FeatureVector(');
    for (int i = 1; i < length; i++) {
      buffer.write('${names[i]}=${values[i].toStringAsFixed(2)}');
      if (i < length - 1) {
        buffer.write(', ');
      }
    }
    buffer.write(')');
    return buffer.toString();
  }
}

/// Akumulator zamieniający strumień surowych próbek w [FeatureVector].
///
/// Klasa jest czystym Dartem (bez Fluttera i pluginów), więc działa zarówno w
/// izolacie UI, jak i w izolacie usługi pierwszoplanowej, i jest w całości
/// testowalna bez urządzenia.
class FeatureAccumulator {
  FeatureAccumulator({this.stillnessThreshold = 0.02, this.microUpperBound = 0.4});

  /// Poniżej tej wartości (m/s², z usuniętą grawitacją) uznajemy pełny bezruch.
  final double stillnessThreshold;

  /// Górna granica pasma „mikroruchów” — wiercenie się, poprawianie chwytu.
  final double microUpperBound;

  static const double _postureShiftRadians = 0.26; // ~15°

  final RunningStats _acceleration = RunningStats();
  final RunningStats _jerk = RunningStats();
  final RunningStats _rotation = RunningStats();

  int _stillSamples = 0;
  int _microSamples = 0;
  int _accelerationSamples = 0;

  double? _lastMagnitude;
  DateTime? _lastMagnitudeAt;

  List<double>? _orientationReference;
  int _postureShifts = 0;

  int _foregroundSwitches = 0;

  int? _stepsAtWindowStart;
  int? _stepsLatest;

  bool _charging = false;
  double _sessionLoad = 0;

  int get sampleCount => _accelerationSamples;

  /// Przyspieszenie użytkownika (bez grawitacji), w m/s².
  void addUserAcceleration(double x, double y, double z, DateTime at) {
    final double magnitude = math.sqrt(x * x + y * y + z * z);
    if (magnitude.isNaN || magnitude.isInfinite) {
      return;
    }

    _accelerationSamples++;
    _acceleration.add(magnitude);

    if (magnitude < stillnessThreshold) {
      _stillSamples++;
    } else if (magnitude < microUpperBound) {
      _microSamples++;
    }

    final double? previous = _lastMagnitude;
    final DateTime? previousAt = _lastMagnitudeAt;
    if (previous != null && previousAt != null) {
      final double seconds =
          at.difference(previousAt).inMicroseconds / Duration.microsecondsPerSecond;
      if (seconds > 1e-4) {
        _jerk.add((magnitude - previous).abs() / seconds);
      }
    }
    _lastMagnitude = magnitude;
    _lastMagnitudeAt = at;
  }

  /// Prędkość kątowa z żyroskopu, w rad/s.
  void addRotation(double x, double y, double z) {
    final double magnitude = math.sqrt(x * x + y * y + z * z);
    if (magnitude.isNaN || magnitude.isInfinite) {
      return;
    }
    _rotation.add(magnitude);
  }

  /// Surowe przyspieszenie z grawitacją — służy wyłącznie do wykrywania
  /// zmiany orientacji urządzenia (odłożenie, podniesienie, obrót).
  void addOrientation(double x, double y, double z) {
    final double norm = math.sqrt(x * x + y * y + z * z);
    if (norm < 1e-6 || norm.isNaN || norm.isInfinite) {
      return;
    }
    final List<double> unit = <double>[x / norm, y / norm, z / norm];
    final List<double>? reference = _orientationReference;

    if (reference == null) {
      _orientationReference = unit;
      return;
    }

    final double dot = (reference[0] * unit[0] +
            reference[1] * unit[1] +
            reference[2] * unit[2])
        .clamp(-1.0, 1.0);
    if (math.acos(dot) > _postureShiftRadians) {
      _postureShifts++;
      _orientationReference = unit;
    }
  }

  /// Powrót aplikacji na pierwszy plan — proxy zachowania „sprawdzania telefonu”.
  void noteForegroundSwitch() => _foregroundSwitches++;

  /// Skumulowany licznik kroków z krokomierza systemowego.
  void setStepCounter(int steps) {
    _stepsAtWindowStart ??= steps;
    _stepsLatest = steps;
  }

  void setCharging({required bool charging}) => _charging = charging;

  /// 0 → świeży start, 1 → długa sesja bez przerwy (≥ 120 min).
  void setSessionLoad(double value) => _sessionLoad = value.clamp(0.0, 1.0);

  /// Buduje wektor cech dla okna kończącego się o [windowEnd].
  FeatureVector build({required DateTime windowStart, required DateTime windowEnd}) {
    final double minutes = math.max(
      windowEnd.difference(windowStart).inMilliseconds /
          Duration.millisecondsPerMinute,
      1 / 60,
    );

    final List<double> values = List<double>.filled(FeatureVector.length, 0);
    values[FeatureVector.bias] = 1;

    if (_accelerationSamples > 0) {
      values[FeatureVector.motionEnergy] = _squash(_acceleration.mean / 1.5);
      values[FeatureVector.motionVariability] =
          _squash(_acceleration.coefficientOfVariation / 2);
      values[FeatureVector.microMovementRate] =
          _microSamples / _accelerationSamples;
      values[FeatureVector.stillnessRatio] =
          _stillSamples / _accelerationSamples;
    }

    if (_jerk.count > 0) {
      values[FeatureVector.jerkRate] = _squash(_jerk.mean / 10);
    }
    if (_rotation.count > 0) {
      values[FeatureVector.rotationEnergy] = _squash(_rotation.mean);
    }

    values[FeatureVector.postureShiftRate] =
        _squash(_postureShifts / minutes / 6);
    values[FeatureVector.foregroundSwitchRate] =
        _squash(_foregroundSwitches / minutes / 2);

    final int? start = _stepsAtWindowStart;
    final int? latest = _stepsLatest;
    if (start != null && latest != null && latest >= start) {
      values[FeatureVector.stepRate] = _squash((latest - start) / minutes / 60);
    }

    values[FeatureVector.charging] = _charging ? 1 : 0;

    final double hourOfDay =
        windowEnd.hour + windowEnd.minute / 60 + windowEnd.second / 3600;
    final double angle = 2 * math.pi * hourOfDay / 24;
    values[FeatureVector.hourSin] = math.sin(angle);
    values[FeatureVector.hourCos] = math.cos(angle);

    values[FeatureVector.sessionLoad] = _sessionLoad;

    return FeatureVector(values);
  }

  /// Czyści statystyki okna, zachowując stan ciągły (orientacja, kroki).
  void resetWindow() {
    _acceleration.reset();
    _jerk.reset();
    _rotation.reset();
    _stillSamples = 0;
    _microSamples = 0;
    _accelerationSamples = 0;
    _postureShifts = 0;
    _foregroundSwitches = 0;
    _stepsAtWindowStart = _stepsLatest;
    _lastMagnitude = null;
    _lastMagnitudeAt = null;
  }

  /// Pełny reset — po zatrzymaniu sensingu.
  void resetAll() {
    resetWindow();
    _orientationReference = null;
    _stepsAtWindowStart = null;
    _stepsLatest = null;
    _charging = false;
    _sessionLoad = 0;
  }

  /// Miękkie nasycenie x/(1+x): zachowuje monotoniczność, ogranicza do [0,1)
  /// i nie wymaga arbitralnego przycinania wartości odstających.
  static double _squash(double value) {
    if (value.isNaN || value <= 0) {
      return 0;
    }
    if (value.isInfinite) {
      return 1;
    }
    return value / (1 + value);
  }
}
