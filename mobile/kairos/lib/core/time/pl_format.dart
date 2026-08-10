/// Formatowanie dat i czasu po polsku, bez zależności od `intl`.
///
/// Aplikacja jest jednojęzyczna (PL) i nie ładuje danych lokalizacyjnych w
/// runtime — to kolejny element kontraktu „zero sieci, minimum wagi”.
abstract final class PlFormat {
  static const List<String> _weekdaysShort = <String>[
    'pon',
    'wt',
    'śr',
    'czw',
    'pt',
    'sob',
    'niedz',
  ];

  static const List<String> _weekdaysLong = <String>[
    'poniedziałek',
    'wtorek',
    'środa',
    'czwartek',
    'piątek',
    'sobota',
    'niedziela',
  ];

  static const List<String> _monthsGenitive = <String>[
    'stycznia',
    'lutego',
    'marca',
    'kwietnia',
    'maja',
    'czerwca',
    'lipca',
    'sierpnia',
    'września',
    'października',
    'listopada',
    'grudnia',
  ];

  static String _two(int value) => value.toString().padLeft(2, '0');

  /// `14:07`
  static String time(DateTime at) => '${_two(at.hour)}:${_two(at.minute)}';

  /// `14:07:03`
  static String timeWithSeconds(DateTime at) =>
      '${_two(at.hour)}:${_two(at.minute)}:${_two(at.second)}';

  /// `pon`
  static String weekdayShort(DateTime at) => _weekdaysShort[at.weekday - 1];

  /// `poniedziałek`
  static String weekdayLong(DateTime at) => _weekdaysLong[at.weekday - 1];

  /// `9 sierpnia`
  static String dayAndMonth(DateTime at) =>
      '${at.day} ${_monthsGenitive[at.month - 1]}';

  /// `pon, 9 sierpnia, 14:07`
  static String full(DateTime at) =>
      '${weekdayShort(at)}, ${dayAndMonth(at)}, ${time(at)}';

  /// `przed chwilą`, `7 min temu`, `3 godz. temu`, `wczoraj 21:14`
  static String relative(DateTime at, {required DateTime now}) {
    final Duration delta = now.difference(at);

    if (delta.isNegative) {
      return time(at);
    }
    if (delta.inSeconds < 45) {
      return 'przed chwilą';
    }
    if (delta.inMinutes < 60) {
      return '${delta.inMinutes} min temu';
    }
    if (delta.inHours < 12 && _isSameDay(at, now)) {
      return '${delta.inHours} godz. temu';
    }
    if (_isSameDay(at, now)) {
      return 'dziś ${time(at)}';
    }
    if (_isSameDay(at, now.subtract(const Duration(days: 1)))) {
      return 'wczoraj ${time(at)}';
    }
    if (delta.inDays < 7) {
      return '${weekdayShort(at)} ${time(at)}';
    }
    return '${dayAndMonth(at)}, ${time(at)}';
  }

  /// Odmiana rzeczownika przez liczebnik: 1 minuta / 2 minuty / 5 minut.
  static String plural(
    int count, {
    required String one,
    required String few,
    required String many,
  }) {
    final int mod10 = count % 10;
    final int mod100 = count % 100;

    if (count == 1) {
      return one;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return few;
    }
    return many;
  }

  /// `42 min`, `1 godz. 05 min`
  static String duration(Duration value) {
    final int totalMinutes = value.inMinutes;
    if (totalMinutes < 60) {
      return '$totalMinutes min';
    }
    final int hours = totalMinutes ~/ 60;
    final int minutes = totalMinutes % 60;
    return '$hours godz. ${_two(minutes)} min';
  }

  static bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}
