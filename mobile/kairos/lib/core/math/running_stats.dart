import 'dart:collection';
import 'dart:math' as math;

/// Statystyki liczone jednoprzebiegowo algorytmem Welforda.
///
/// Nie przechowuje próbek — pamięć jest stała niezależnie od długości okna,
/// co ma znaczenie przy próbkowaniu 20 Hz w izolacie tła.
class RunningStats {
  int _count = 0;
  double _mean = 0;
  double _m2 = 0;
  double _min = double.infinity;
  double _max = double.negativeInfinity;
  double _sumAbs = 0;

  int get count => _count;

  double get mean => _count == 0 ? 0 : _mean;

  /// Wariancja próbkowa (dzielona przez n-1).
  double get variance => _count < 2 ? 0 : _m2 / (_count - 1);

  double get standardDeviation => math.sqrt(variance);

  /// Współczynnik zmienności — bezwymiarowa miara „rozedrgania” sygnału.
  double get coefficientOfVariation =>
      mean.abs() < 1e-9 ? 0 : standardDeviation / mean.abs();

  double get min => _count == 0 ? 0 : _min;

  double get max => _count == 0 ? 0 : _max;

  double get meanAbsolute => _count == 0 ? 0 : _sumAbs / _count;

  void add(double value) {
    if (value.isNaN || value.isInfinite) {
      return;
    }
    _count++;
    final double delta = value - _mean;
    _mean += delta / _count;
    _m2 += delta * (value - _mean);
    _min = math.min(_min, value);
    _max = math.max(_max, value);
    _sumAbs += value.abs();
  }

  void reset() {
    _count = 0;
    _mean = 0;
    _m2 = 0;
    _min = double.infinity;
    _max = double.negativeInfinity;
    _sumAbs = 0;
  }
}

/// Bufor cykliczny o stałym rozmiarze — używany przez UI do rysowania
/// sparkline'ów bez alokacji na każdą klatkę.
class RingBuffer<T> {
  RingBuffer(this.capacity)
    : assert(capacity > 0, 'Pojemność musi być dodatnia'),
      _items = ListQueue<T>(capacity);

  final int capacity;
  final ListQueue<T> _items;

  int get length => _items.length;

  bool get isEmpty => _items.isEmpty;

  bool get isNotEmpty => _items.isNotEmpty;

  T? get last => _items.isEmpty ? null : _items.last;

  T? get first => _items.isEmpty ? null : _items.first;

  void add(T value) {
    if (_items.length == capacity) {
      _items.removeFirst();
    }
    _items.addLast(value);
  }

  void addAll(Iterable<T> values) => values.forEach(add);

  void clear() => _items.clear();

  /// Niemodyfikowalny widok zawartości od najstarszej do najnowszej próbki.
  List<T> toList() => List<T>.unmodifiable(_items);
}

/// Wygładzanie wykładnicze — tłumi drgania metryk pokazywanych na żywo,
/// żeby liczby w UI nie „migotały” przy każdej próbce.
class ExponentialSmoother {
  ExponentialSmoother({this.alpha = 0.2, double? initial}) : _value = initial;

  final double alpha;
  double? _value;

  double get value => _value ?? 0;

  bool get hasValue => _value != null;

  double add(double sample) {
    final double? previous = _value;
    _value = previous == null ? sample : previous + alpha * (sample - previous);
    return _value!;
  }

  void reset() => _value = null;
}
