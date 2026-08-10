/// Jednolita reprezentacja błędu przekraczającego granicę warstw.
///
/// Warstwa `data` nigdy nie przepuszcza wyjątku w górę — mapuje go na [Failure]
/// (patrz `error_mapper.dart`), dzięki czemu prezentacja obsługuje skończony,
/// znany zbiór przypadków, a kompilator pilnuje kompletności `switch`.
sealed class Failure {
  const Failure({required this.message, this.cause, this.stackTrace});

  /// Komunikat gotowy do pokazania użytkownikowi (po polsku, bez żargonu).
  final String message;

  /// Oryginalna przyczyna — wyłącznie do logów, nigdy do UI.
  final Object? cause;

  final StackTrace? stackTrace;

  @override
  String toString() => '$runtimeType($message)${cause == null ? '' : ' <- $cause'}';
}

/// Błąd lokalnej bazy danych (zapis, odczyt, migracja).
final class DatabaseFailure extends Failure {
  const DatabaseFailure({
    super.message = 'Nie udało się sięgnąć do danych na urządzeniu.',
    super.cause,
    super.stackTrace,
  });
}

/// Czujnik niedostępny, zablokowany przez system lub nieobsługiwany sprzętowo.
final class SensorFailure extends Failure {
  const SensorFailure({
    super.message = 'Czujnik ruchu jest niedostępny na tym urządzeniu.',
    super.cause,
    super.stackTrace,
    this.sensor,
  });

  final String? sensor;
}

/// Brak zgody użytkownika lub uprawnienia cofniętego na stałe.
final class PermissionFailure extends Failure {
  const PermissionFailure({
    super.message = 'Brakuje zgody wymaganej do działania tej funkcji.',
    super.cause,
    super.stackTrace,
    this.permanentlyDenied = false,
  });

  /// `true` → jedyną drogą jest ekran ustawień systemowych.
  final bool permanentlyDenied;
}

/// Problem z lokalnym modelem językowym (brak pliku, brak pamięci, błąd runtime).
final class ModelFailure extends Failure {
  const ModelFailure({
    super.message = 'Lokalny model językowy jest niedostępny.',
    super.cause,
    super.stackTrace,
  });
}

/// Praca w tle niedostępna (ograniczenia platformy, oszczędzanie baterii).
final class BackgroundFailure extends Failure {
  const BackgroundFailure({
    super.message = 'System nie pozwolił uruchomić pracy w tle.',
    super.cause,
    super.stackTrace,
  });
}

/// Wszystko, czego nie potrafimy sklasyfikować — zawsze logowane ze stosem.
final class UnknownFailure extends Failure {
  const UnknownFailure({
    super.message = 'Coś poszło nie tak. Spróbuj ponownie.',
    super.cause,
    super.stackTrace,
  });
}
