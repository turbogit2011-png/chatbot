import 'dart:math' as math;

import '../../../flow_state/domain/entities/flow_state.dart';
import '../../domain/entities/intervention.dart';
import 'intervention_engine.dart';

/// Deterministyczny silnik kompozycyjny — domyślne źródło treści.
///
/// Nie jest „gorszym zamiennikiem modelu”, tylko pełnoprawnym silnikiem:
/// działa natychmiast, bez pobierania 550 MB wag, bez GPU i bez ryzyka, że
/// model powie coś, czego nie chcemy. Lokalny SLM (jeśli jest) daje większą
/// różnorodność; ten silnik daje gwarancję tonu i dostępności.
///
/// Losowość jest **zaziarniona** czasem i stanem, więc dwie interwencje w tej
/// samej minucie dają to samo zdanie (idempotencja przy ponowieniu), a kolejne
/// są różne.
class CompositionEngine implements InterventionEngine {
  const CompositionEngine();

  @override
  InterventionSource get source => InterventionSource.composition;

  @override
  Future<bool> isAvailable() async => true;

  @override
  Future<void> dispose() async {}

  @override
  Future<String> compose(InterventionRequest request) async {
    final int seed =
        request.at.millisecondsSinceEpoch ~/ Duration.millisecondsPerMinute +
        request.reading.state.index * 7919;
    final math.Random random = math.Random(seed);

    final String? goal = _goal(request.intention?.text);
    final List<String> observations =
        _observations[request.reading.state] ?? _observations[FlowState.drift]!;
    final List<String> steps = goal == null
        ? (_stepsWithoutGoal[request.reading.state] ??
              _stepsWithoutGoal[FlowState.drift]!)
        : (_stepsWithGoal[request.reading.state] ??
              _stepsWithGoal[FlowState.drift]!);

    // Kilka prób, żeby nie powtórzyć zdania z ostatnich interwencji.
    for (int attempt = 0; attempt < 12; attempt++) {
      final String observation = request.dominantObservation != null && attempt < 4
          ? 'widzę ${request.dominantObservation}'
          : observations[random.nextInt(observations.length)];
      final String step = steps[random.nextInt(steps.length)];

      final String candidate = InterventionText.sanitize(
        '$observation — ${goal == null ? step : step.replaceAll('{cel}', goal)}.',
      );

      final bool repeated = request.recentMessages.any(
        (String previous) => _similar(previous, candidate),
      );
      if (!repeated && InterventionText.isAcceptable(candidate)) {
        return candidate;
      }
    }

    // Wariant awaryjny — zawsze poprawny, nawet gdy wszystko inne odpadło.
    final String fallbackStep = steps.first;
    return InterventionText.sanitize(
      '${observations.first} — '
      '${goal == null ? fallbackStep : fallbackStep.replaceAll('{cel}', goal)}.',
    );
  }

  /// Normalizuje zamiar do formy wpasowanej w zdanie („kończę rozdział 3”).
  static String? _goal(String? text) {
    if (text == null) {
      return null;
    }
    String value = text.trim();
    if (value.isEmpty) {
      return null;
    }
    while (value.endsWith('.') || value.endsWith(',')) {
      value = value.substring(0, value.length - 1).trimRight();
    }
    if (value.isEmpty) {
      return null;
    }
    return value[0].toLowerCase() + value.substring(1);
  }

  /// Prosta miara podobieństwa — wystarczająca, by wykryć powtórkę szablonu.
  static bool _similar(String a, String b) {
    if (a == b) {
      return true;
    }
    final Set<String> wordsA = a.toLowerCase().split(' ').toSet();
    final Set<String> wordsB = b.toLowerCase().split(' ').toSet();
    if (wordsA.isEmpty || wordsB.isEmpty) {
      return false;
    }
    final int common = wordsA.intersection(wordsB).length;
    return common / math.max(wordsA.length, wordsB.length) > 0.7;
  }

  /// Obserwacje: nazywają to, co widać w sygnale. Nigdy nie diagnozują.
  static const Map<FlowState, List<String>> _observations =
      <FlowState, List<String>>{
        FlowState.drift: <String>[
          'ostatnie minuty wyglądają na krążenie',
          'rytm zaczyna się rozjeżdżać',
          'uwaga odpływa małymi krokami',
          'sygnał robi się poszarpany',
        ],
        FlowState.restless: <String>[
          'ciało jest w ruchu bardziej niż praca',
          'dużo drobnych, nerwowych ruchów',
          'trudno usiedzieć w jednej pozycji',
          'sporo szarpnięć w ostatnich minutach',
        ],
        FlowState.fatigue: <String>[
          'ta sesja ciągnie się już długo',
          'tempo wyraźnie zwolniło',
          'energia zeszła nisko',
          'to już kawał czasu bez przerwy',
        ],
        FlowState.deepFocus: <String>[
          'jest cicho i równo',
        ],
        FlowState.flow: <String>[
          'rytm jest stabilny',
        ],
        FlowState.recovery: <String>[
          'jesteś w ruchu',
        ],
      };

  /// Kroki, gdy znamy zamiar użytkownika — najmocniejszy wariant.
  static const Map<FlowState, List<String>> _stepsWithGoal =
      <FlowState, List<String>>{
        FlowState.drift: <String>[
          'wróć na dwie minuty do {cel}',
          'zamknij wszystko poza {cel}',
          'dopisz jedno zdanie do {cel} i dopiero potem wstań',
          'nazwij następny najmniejszy krok w {cel}',
        ],
        FlowState.restless: <String>[
          'wstań na minutę, potem jedno zdanie do {cel}',
          'rozprostuj się i wróć do {cel} na dwie minuty',
          'zmień pozycję, zanim wrócisz do {cel}',
        ],
        FlowState.fatigue: <String>[
          'odejdź na pięć minut, {cel} poczeka',
          'zrób przerwę teraz, żeby {cel} nie kosztowało wieczoru',
          'napij się wody i wróć do {cel} za chwilę',
        ],
        FlowState.deepFocus: <String>[
          'nic nie rób, {cel} idzie dobrze',
        ],
        FlowState.flow: <String>[
          'trzymaj kurs na {cel}',
        ],
        FlowState.recovery: <String>[
          'wróć do {cel}, kiedy poczujesz, że starczy',
        ],
      };

  /// Kroki bez zadeklarowanego zamiaru — celowo bardziej ogólne.
  static const Map<FlowState, List<String>> _stepsWithoutGoal =
      <FlowState, List<String>>{
        FlowState.drift: <String>[
          'wybierz jedną rzecz i daj jej dwie minuty',
          'zamknij wszystkie okna poza jednym',
          'zapisz w jednym zdaniu, co robisz teraz',
          'nazwij następny najmniejszy krok',
        ],
        FlowState.restless: <String>[
          'wstań na minutę i rozprostuj plecy',
          'zmień pozycję, zanim wrócisz do ekranu',
          'weź trzy wolne oddechy i usiądź inaczej',
        ],
        FlowState.fatigue: <String>[
          'odejdź od ekranu na pięć minut',
          'napij się wody i spójrz w okno',
          'zrób przerwę teraz, nie za godzinę',
        ],
        FlowState.deepFocus: <String>[
          'nic nie rób, to dobry moment',
        ],
        FlowState.flow: <String>[
          'trzymaj ten rytm',
        ],
        FlowState.recovery: <String>[
          'daj sobie jeszcze chwilę',
        ],
      };

  /// Frazy opisujące dominującą cechę sygnału — wstrzykiwane przez repozytorium
  /// jako `dominantObservation`.
  static const Map<String, String> signalPhrases = <String, String>{
    'foregroundSwitchRate': 'sporo przeskakiwania między aplikacjami',
    'microMovementRate': 'dużo drobnych ruchów',
    'jerkRate': 'nerwowe szarpnięcia',
    'stillnessRatio': 'długi bezruch',
    'sessionLoad': 'długą sesję bez przerwy',
    'stepRate': 'sporo chodzenia',
    'motionEnergy': 'wysoką energię ruchu',
    'motionVariability': 'nierówny rytm ruchu',
    'rotationEnergy': 'częste obracanie telefonu',
    'postureShiftRate': 'częste zmiany pozycji',
  };
}
