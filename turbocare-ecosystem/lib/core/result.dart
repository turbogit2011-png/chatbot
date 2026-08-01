/// TurboCare Ecosystem — typy wspólne warstwy domenowej.
///
/// Warstwa domenowa nie rzuca "gołych" wyjątków przez granice modułów —
/// wszystkie operacje, które mogą się nie powieść (sprzęt, sieć, walidacja),
/// zwracają [Result], dzięki czemu kompilator wymusza obsługę błędu.
library;

/// Uniwersalny wynik operacji: sukces z wartością [T] albo porażka z [F].
///
/// Wzorzec sealed class + pattern matching (Dart 3.x):
/// ```dart
/// switch (await queue.send(cmd)) {
///   case Ok(:final value):    handle(value);
///   case Err(:final failure): log(failure);
/// }
/// ```
sealed class Result<T, F extends Failure> {
  const Result();

  /// Wygodne konstruktory fabryczne.
  const factory Result.ok(T value) = Ok<T, F>;
  const factory Result.err(F failure) = Err<T, F>;

  bool get isOk => this is Ok<T, F>;

  /// Zwraca wartość lub `null` — do szybkich ścieżek odczytu.
  T? get valueOrNull => switch (this) {
        Ok(:final value) => value,
        Err() => null,
      };

  /// Transformacja wartości sukcesu bez naruszania błędu.
  Result<R, F> map<R>(R Function(T value) transform) => switch (this) {
        Ok(:final value) => Ok(transform(value)),
        Err(:final failure) => Err(failure),
      };
}

final class Ok<T, F extends Failure> extends Result<T, F> {
  const Ok(this.value);
  final T value;
}

final class Err<T, F extends Failure> extends Result<T, F> {
  const Err(this.failure);
  final F failure;
}

/// Bazowa klasa błędów domenowych — każda warstwa definiuje własne podtypy.
abstract base class Failure {
  const Failure(this.message);

  /// Komunikat techniczny (logi); warstwa UI mapuje na komunikaty PL dla mechanika.
  final String message;

  @override
  String toString() => '$runtimeType: $message';
}
