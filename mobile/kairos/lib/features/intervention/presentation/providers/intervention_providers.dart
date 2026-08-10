import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fpdart/fpdart.dart';

import '../../../../app/di.dart';
import '../../../../app/kairos_engine.dart';
import '../../../../core/error/failure.dart';
import '../../domain/entities/intention.dart';
import '../../domain/entities/intervention.dart';
import '../../domain/repositories/intervention_repository.dart';
import '../../domain/services/intervention_policy.dart';

/// Strumień interwencji doręczonych użytkownikowi.
final StreamProvider<Intervention> interventionFeedProvider =
    StreamProvider<Intervention>(
      (Ref ref) => ref.watch(kairosEngineProvider).interventions,
    );

/// Identyfikatory interwencji otwartych z powiadomienia.
final StreamProvider<String> notificationTapProvider = StreamProvider<String>(
  (Ref ref) => ref.watch(kairosEngineProvider).notificationTaps,
);

/// Ostatnia interwencja wraz z jej stanem reakcji. Odświeża się sama, gdy
/// pojawi się nowa albo gdy użytkownik oceni bieżącą.
class LastInterventionController extends AsyncNotifier<Intervention?> {
  @override
  Future<Intervention?> build() async {
    // Nowa interwencja w strumieniu → przebuduj stan.
    ref.watch(interventionFeedProvider);

    final Either<Failure, Intervention?> result = await ref
        .watch(interventionRepositoryProvider)
        .latest();
    return result.match(
      (Failure failure) => throw failure,
      (Intervention? intervention) => intervention,
    );
  }

  /// Zapisuje reakcję i natychmiast dostraja model.
  Future<void> submitFeedback(InterventionFeedback feedback) async {
    final Intervention? intervention = state.valueOrNull;
    if (intervention == null || !intervention.awaitsFeedback) {
      return;
    }

    // Optymistyczna aktualizacja — przycisk reaguje natychmiast.
    state = AsyncValue<Intervention?>.data(
      intervention.copyWith(feedback: feedback, feedbackAt: DateTime.now()),
    );

    final KairosEngine engine = ref.read(kairosEngineProvider);
    final Either<Failure, Unit> result = await engine.submitFeedback(
      intervention: intervention,
      feedback: feedback,
    );

    result.match(
      (Failure failure) =>
          state = AsyncValue<Intervention?>.error(failure, StackTrace.current),
      (_) {},
    );
  }
}

final AsyncNotifierProvider<LastInterventionController, Intervention?>
lastInterventionProvider =
    AsyncNotifierProvider<LastInterventionController, Intervention?>(
      LastInterventionController.new,
    );

/// Aktualny zamiar użytkownika.
class IntentionController extends AsyncNotifier<Intention?> {
  @override
  Future<Intention?> build() async {
    final Either<Failure, Intention?> result = await ref
        .watch(interventionRepositoryProvider)
        .activeIntention();
    return result.match(
      (Failure failure) => throw failure,
      (Intention? intention) => intention,
    );
  }

  /// Ustawia nowy zamiar. Zwraca komunikat błędu albo `null` przy powodzeniu.
  Future<String?> setIntention(String text) async {
    final InterventionRepository repository = ref.read(
      interventionRepositoryProvider,
    );

    final String? validationError = Intention.validate(text);
    if (validationError != null) {
      return validationError;
    }

    state = const AsyncValue<Intention?>.loading();
    final Either<Failure, Intention> result = await repository.setIntention(
      text,
    );

    return result.match((Failure failure) {
      state = AsyncValue<Intention?>.error(failure, StackTrace.current);
      return failure.message;
    }, (Intention intention) {
      state = AsyncValue<Intention?>.data(intention);
      return null;
    });
  }

  Future<void> clear() async {
    final Either<Failure, Unit> result = await ref
        .read(interventionRepositoryProvider)
        .clearIntention();

    result.match(
      (Failure failure) =>
          state = AsyncValue<Intention?>.error(failure, StackTrace.current),
      (_) => state = const AsyncValue<Intention?>.data(null),
    );
  }
}

final AsyncNotifierProvider<IntentionController, Intention?> intentionProvider =
    AsyncNotifierProvider<IntentionController, Intention?>(
      IntentionController.new,
    );

/// Powód, dla którego Kairos aktualnie milczy — pokazywany wprost w UI.
final Provider<InterventionDecision?> lastDecisionProvider =
    Provider<InterventionDecision?>((Ref ref) {
      // Decyzja powstaje przy każdym odczycie — wiąże się z tym samym cyklem.
      ref.watch(interventionFeedProvider);
      return ref.watch(interventionRepositoryProvider).lastDecision;
    });

/// Historia interwencji (ekran „Wgląd”).
final FutureProvider<List<Intervention>> interventionHistoryProvider =
    FutureProvider<List<Intervention>>((Ref ref) async {
      ref.watch(interventionFeedProvider);

      final Either<Failure, List<Intervention>> result = await ref
          .watch(interventionRepositoryProvider)
          .history(limit: 50);
      return result.match(
        (Failure failure) => throw failure,
        (List<Intervention> items) => items,
      );
    });

/// Skuteczność interwencji w zadanym oknie czasu.
final FutureProviderFamily<InterventionStats, Duration>
interventionStatsProvider =
    FutureProvider.family<InterventionStats, Duration>((
      Ref ref,
      Duration span,
    ) async {
      ref.watch(interventionFeedProvider);

      final Either<Failure, InterventionStats> result = await ref
          .watch(interventionRepositoryProvider)
          .stats(since: DateTime.now().subtract(span));
      return result.match(
        (Failure failure) => throw failure,
        (InterventionStats stats) => stats,
      );
    });
