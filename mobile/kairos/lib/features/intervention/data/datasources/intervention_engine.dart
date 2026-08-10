import '../../../flow_state/domain/entities/state_reading.dart';
import '../../domain/entities/intention.dart';
import '../../domain/entities/intervention.dart';

/// Wszystko, czego silnik potrzebuje, żeby ułożyć jedno zdanie.
class InterventionRequest {
  const InterventionRequest({
    required this.reading,
    required this.at,
    this.intention,
    this.recentMessages = const <String>[],
    this.dominantObservation,
  });

  final StateReading reading;
  final DateTime at;
  final Intention? intention;

  /// Ostatnio użyte zdania — silnik ma ich nie powtarzać.
  final List<String> recentMessages;

  /// Najmocniejsza obserwacja z sygnału, np. „przełączenia aplikacji”.
  final String? dominantObservation;
}

/// Kontrakt generatora treści interwencji.
///
/// Dwie implementacje: [InterventionSource.localModel] (lokalny SLM) oraz
/// [InterventionSource.composition] (deterministyczny silnik kompozycyjny).
/// Warstwa wyżej nie wie, która odpowiedziała — wie tylko, że dostała zdanie.
abstract interface class InterventionEngine {
  InterventionSource get source;

  /// Czy silnik jest gotowy do pracy (model wczytany, pamięć dostępna).
  Future<bool> isAvailable();

  /// Układa jedno zdanie. Rzuca wyjątek tylko w sytuacji nienaprawialnej —
  /// repozytorium przechwyci go i sięgnie po silnik zapasowy.
  Future<String> compose(InterventionRequest request);

  /// Zwalnia zasoby (sesje modelu, pamięć GPU).
  Future<void> dispose();
}

/// Wspólne reguły higieny tekstu, obowiązujące każdy silnik.
abstract final class InterventionText {
  static const int maxLength = 140;

  /// Przycina, czyści i normalizuje wygenerowane zdanie.
  static String sanitize(String raw) {
    String text = raw.trim();

    // Modele lubią otaczać odpowiedź cudzysłowem albo dodawać preambułę.
    text = text.replaceAll(RegExp(r'^["„”\x27\s]+|["„”\x27\s]+$'), '');
    final int newline = text.indexOf('\n');
    if (newline > 0) {
      text = text.substring(0, newline).trim();
    }

    text = text.replaceAll(RegExp(r'\s+'), ' ');
    text = text.replaceAll(RegExp('[*_#`]'), '');

    if (text.length > maxLength) {
      final int cut = text.lastIndexOf(' ', maxLength - 1);
      text = text.substring(0, cut > 40 ? cut : maxLength - 1).trim();
      if (!text.endsWith('.')) {
        text = '$text…';
      }
    }

    if (text.isNotEmpty) {
      text = text[0].toUpperCase() + text.substring(1);
    }
    return text;
  }

  /// Odrzuca odpowiedzi, które łamią kontrakt tonu (moralizowanie, krzyk).
  static bool isAcceptable(String text) {
    if (text.length < 12) {
      return false;
    }
    if (text.contains('!')) {
      return false;
    }
    const List<String> banned = <String>[
      'powinieneś',
      'powinnaś',
      'musisz',
      'znowu',
      'niestety',
      'jako model',
      'jako sztuczna',
    ];
    final String lower = text.toLowerCase();
    return !banned.any(lower.contains);
  }
}
