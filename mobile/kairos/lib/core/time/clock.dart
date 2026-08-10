/// Wstrzykiwane źródło czasu.
///
/// Cała logika domenowa (polityka interwencji, ciszy nocnej, cooldownów)
/// pyta o czas wyłącznie przez ten interfejs — dzięki temu testy są
/// deterministyczne i nie wymagają czekania.
abstract interface class Clock {
  DateTime now();
}

/// Zegar systemowy — używany w produkcji.
final class SystemClock implements Clock {
  const SystemClock();

  @override
  DateTime now() => DateTime.now();
}

/// Zegar sterowany ręcznie — używany w testach.
final class FixedClock implements Clock {
  FixedClock(this._now);

  DateTime _now;

  @override
  DateTime now() => _now;

  void set(DateTime value) => _now = value;

  void advance(Duration delta) => _now = _now.add(delta);
}
