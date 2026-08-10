import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fpdart/fpdart.dart';

import '../../../../app/di.dart';
import '../../../../core/error/failure.dart';
import '../../domain/entities/flow_state.dart';
import '../../domain/entities/state_reading.dart';
import '../../domain/repositories/flow_state_repository.dart';
import '../../domain/services/flow_classifier.dart';

/// Strumień odczytów stanu — jeden na zamknięte okno obserwacji.
final StreamProvider<StateReading> currentReadingProvider =
    StreamProvider<StateReading>(
      (Ref ref) => ref.watch(kairosEngineProvider).readings,
    );

/// Ostatni znany odczyt, także sprzed restartu aplikacji (z bazy).
final Provider<StateReading?> lastKnownReadingProvider = Provider<StateReading?>(
  (Ref ref) {
    final AsyncValue<StateReading> live = ref.watch(currentReadingProvider);
    return live.valueOrNull ?? ref.watch(kairosEngineProvider).currentReading;
  },
);

/// Funkcja wyjaśniająca decyzję modelu — wstrzykiwana zamiast rodziny
/// providerów, bo `StateReading` nie nadaje się na klucz cache.
final Provider<List<FeatureContribution> Function(StateReading)>
explainReadingProvider =
    Provider<List<FeatureContribution> Function(StateReading)>(
      (Ref ref) => ref.watch(flowStateRepositoryProvider).explain,
    );

/// Historia odczytów z ostatnich [span] — dane dla osi czasu i wykresów.
final FutureProviderFamily<List<StateReading>, Duration> stateHistoryProvider =
    FutureProvider.family<List<StateReading>, Duration>((
      Ref ref,
      Duration span,
    ) async {
      // Odśwież po każdym nowym odczycie.
      ref.watch(currentReadingProvider);

      final FlowStateRepository repository = ref.watch(
        flowStateRepositoryProvider,
      );
      final Either<Failure, List<StateReading>> result = await repository
          .history(since: DateTime.now().subtract(span));

      return result.match(
        (Failure failure) => throw failure,
        (List<StateReading> readings) => readings,
      );
    });

/// Rozkład czasu na stany od podanej chwili.
final FutureProviderFamily<Map<FlowState, int>, Duration>
stateDistributionProvider =
    FutureProvider.family<Map<FlowState, int>, Duration>((
      Ref ref,
      Duration span,
    ) async {
      ref.watch(currentReadingProvider);

      final Either<Failure, Map<FlowState, int>> result = await ref
          .watch(flowStateRepositoryProvider)
          .countsSince(DateTime.now().subtract(span));

      return result.match(
        (Failure failure) => throw failure,
        (Map<FlowState, int> counts) => counts,
      );
    });

/// Ile korekt otrzymał osobisty model — „jak dobrze Cię znam”.
final Provider<int> calibrationStepsProvider = Provider<int>((Ref ref) {
  ref.watch(currentReadingProvider);
  return ref.watch(kairosEngineProvider).calibrationSteps;
});
