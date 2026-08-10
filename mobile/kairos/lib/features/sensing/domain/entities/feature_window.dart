import '../../../../core/math/signal_features.dart';

/// Zamknięte okno obserwacji — porcja sygnału, na której pracuje klasyfikator.
class FeatureWindow {
  const FeatureWindow({
    required this.start,
    required this.end,
    required this.sampleCount,
    required this.features,
    this.id,
  });

  final int? id;
  final DateTime start;
  final DateTime end;

  /// Liczba próbek akcelerometru zebranych w oknie — poniżej progu jakości
  /// okno jest opisane jako niepewne (telefon leżał, czujnik uśpiony).
  final int sampleCount;

  final FeatureVector features;

  Duration get duration => end.difference(start);

  /// Minimalna liczba próbek, przy której odczyt uznajemy za wiarygodny
  /// (okno 30 s przy ~10 Hz po odfiltrowaniu = 150 próbek).
  static const int reliableSampleCount = 150;

  bool get isReliable => sampleCount >= reliableSampleCount;

  FeatureWindow copyWith({int? id}) => FeatureWindow(
    id: id ?? this.id,
    start: start,
    end: end,
    sampleCount: sampleCount,
    features: features,
  );

  @override
  String toString() =>
      'FeatureWindow($start → $end, próbek: $sampleCount, ${features.toString()})';
}

/// Migawka sygnału „na żywo”, odświeżana kilka razy na sekundę wyłącznie na
/// potrzeby UI. Nie trafia do bazy — to dane ulotne.
class LiveSignal {
  const LiveSignal({
    required this.at,
    required this.motionEnergy,
    required this.microMovement,
    required this.stillness,
    required this.rotation,
    required this.sampleCount,
    required this.foregroundSwitches,
    required this.isCharging,
    required this.stepsInWindow,
  });

  factory LiveSignal.idle(DateTime at) => LiveSignal(
    at: at,
    motionEnergy: 0,
    microMovement: 0,
    stillness: 0,
    rotation: 0,
    sampleCount: 0,
    foregroundSwitches: 0,
    isCharging: false,
    stepsInWindow: 0,
  );

  final DateTime at;

  /// Wygładzona energia ruchu, 0–1.
  final double motionEnergy;

  /// Udział mikroruchów w bieżącym oknie, 0–1.
  final double microMovement;

  /// Udział bezruchu w bieżącym oknie, 0–1.
  final double stillness;

  /// Wygładzona energia obrotu, 0–1.
  final double rotation;

  final int sampleCount;
  final int foregroundSwitches;
  final bool isCharging;
  final int stepsInWindow;

  bool get hasSignal => sampleCount > 0;
}
