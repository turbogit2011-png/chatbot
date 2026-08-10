/// Deklarowany zamiar użytkownika — jedno zdanie w rodzaju „kończę rozdział 3”.
///
/// To jedyne dane wpisywane ręcznie w całej aplikacji i jednocześnie klucz do
/// tego, żeby interwencja brzmiała jak własna myśl, a nie jak powiadomienie.
class Intention {
  const Intention({
    required this.id,
    required this.text,
    required this.createdAt,
    this.archivedAt,
  });

  final String id;
  final String text;
  final DateTime createdAt;
  final DateTime? archivedAt;

  bool get isActive => archivedAt == null;

  /// Maksymalna długość — zamiar ma być hasłem, nie planem projektu.
  static const int maxLength = 90;

  /// Waliduje treść wpisaną przez użytkownika.
  /// Zwraca komunikat błędu albo `null`, jeśli wszystko jest w porządku.
  static String? validate(String value) {
    final String trimmed = value.trim();
    if (trimmed.isEmpty) {
      return 'Napisz, nad czym chcesz zostać.';
    }
    if (trimmed.length < 3) {
      return 'Trochę za krótko — dodaj kilka słów.';
    }
    if (trimmed.length > maxLength) {
      return 'Zmieść się w $maxLength znakach.';
    }
    return null;
  }

  Intention copyWith({DateTime? archivedAt}) => Intention(
    id: id,
    text: text,
    createdAt: createdAt,
    archivedAt: archivedAt ?? this.archivedAt,
  );
}
