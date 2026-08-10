import '../../../../core/math/signal_features.dart';
import '../../../flow_state/domain/entities/flow_state.dart';

/// Źródło pochodzenia treści interwencji.
enum InterventionSource {
  /// Zdanie wygenerowane przez lokalny model językowy.
  localModel('local_model', 'model lokalny'),

  /// Zdanie złożone przez deterministyczny silnik kompozycyjny (fallback).
  composition('composition', 'silnik kompozycyjny');

  const InterventionSource(this.id, this.label);

  final String id;
  final String label;

  static InterventionSource fromId(String id) => InterventionSource.values
      .firstWhere(
        (InterventionSource value) => value.id == id,
        orElse: () => InterventionSource.composition,
      );
}

/// Reakcja użytkownika na interwencję. To jedyne wejście uczące modelu.
enum InterventionFeedback {
  helped(
    'helped',
    'Pomogło',
    calibrationLabel: null,
    strength: 1.0,
    cooldownDelta: Duration(minutes: -5),
  ),
  notNow(
    'not_now',
    'Nie teraz',
    calibrationLabel: FlowState.flow,
    strength: 0.4,
    cooldownDelta: Duration(minutes: 10),
  ),
  wrongMoment(
    'wrong_moment',
    'Zły moment',
    calibrationLabel: FlowState.deepFocus,
    strength: 1.0,
    cooldownDelta: Duration(minutes: 25),
  ),
  ignored(
    'ignored',
    'Zignorowana',
    calibrationLabel: FlowState.flow,
    strength: 0.25,
    cooldownDelta: Duration(minutes: 5),
  );

  const InterventionFeedback(
    this.id,
    this.label, {
    required this.calibrationLabel,
    required this.strength,
    required this.cooldownDelta,
  });

  final String id;
  final String label;

  /// Stan, którym douczamy klasyfikator. `null` → wzmacniamy stan przewidziany
  /// (użytkownik potwierdził, że model miał rację).
  final FlowState? calibrationLabel;

  /// Siła sygnału uczącego (waga próbki w kroku SGD).
  final double strength;

  /// O ile zmienia się osobisty odstęp między interwencjami.
  final Duration cooldownDelta;

  static InterventionFeedback fromId(String id) => InterventionFeedback.values
      .firstWhere(
        (InterventionFeedback value) => value.id == id,
        orElse: () => InterventionFeedback.ignored,
      );
}

/// Pojedyncza mikro-interwencja: jedno zdanie w konkretnym momencie.
class Intervention {
  const Intervention({
    required this.id,
    required this.at,
    required this.state,
    required this.confidence,
    required this.message,
    required this.source,
    required this.features,
    this.intentionId,
    this.intentionText,
    this.feedback,
    this.feedbackAt,
  });

  final String id;
  final DateTime at;
  final FlowState state;
  final double confidence;
  final String message;
  final InterventionSource source;

  /// Cechy z chwili wygenerowania — potrzebne, by douczyć model po reakcji
  /// użytkownika, także gdy reakcja przyjdzie kilka minut później.
  final FeatureVector features;

  final String? intentionId;
  final String? intentionText;
  final InterventionFeedback? feedback;
  final DateTime? feedbackAt;

  bool get awaitsFeedback => feedback == null;

  bool get wasUseful => feedback == InterventionFeedback.helped;

  Intervention copyWith({
    InterventionFeedback? feedback,
    DateTime? feedbackAt,
    String? intentionText,
  }) {
    return Intervention(
      id: id,
      at: at,
      state: state,
      confidence: confidence,
      message: message,
      source: source,
      features: features,
      intentionId: intentionId,
      intentionText: intentionText ?? this.intentionText,
      feedback: feedback ?? this.feedback,
      feedbackAt: feedbackAt ?? this.feedbackAt,
    );
  }
}

/// Zbiorcza skuteczność interwencji — dane dla ekranu „Wgląd”.
class InterventionStats {
  const InterventionStats({
    required this.total,
    required this.helped,
    required this.notNow,
    required this.wrongMoment,
    required this.ignored,
  });

  static const InterventionStats empty = InterventionStats(
    total: 0,
    helped: 0,
    notNow: 0,
    wrongMoment: 0,
    ignored: 0,
  );

  final int total;
  final int helped;
  final int notNow;
  final int wrongMoment;
  final int ignored;

  int get answered => helped + notNow + wrongMoment;

  /// Odsetek interwencji uznanych za pomocne spośród tych, na które
  /// użytkownik w ogóle zareagował.
  double get hitRate => answered == 0 ? 0 : helped / answered;
}
