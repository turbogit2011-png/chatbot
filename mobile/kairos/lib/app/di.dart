import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/time/clock.dart';
import '../data/database/daos/intervention_dao.dart';
import '../data/database/daos/model_dao.dart';
import '../data/database/daos/sensing_dao.dart';
import '../data/database/daos/state_dao.dart';
import '../data/database/kairos_database.dart';
import '../data/preferences/preferences_store.dart';
import '../features/flow_state/data/repositories/flow_state_repository_impl.dart';
import '../features/flow_state/domain/repositories/flow_state_repository.dart';
import '../features/intervention/data/datasources/composition_engine.dart';
import '../features/intervention/data/datasources/gemma_llm_engine.dart';
import '../features/intervention/data/datasources/intervention_engine.dart';
import '../features/intervention/data/datasources/notification_data_source.dart';
import '../features/intervention/data/repositories/intervention_repository_impl.dart';
import '../features/intervention/domain/repositories/intervention_repository.dart';
import '../features/intervention/domain/services/intervention_policy.dart';
import '../features/sensing/data/repositories/sensing_repository_impl.dart';
import '../features/sensing/domain/repositories/sensing_repository.dart';
import '../features/settings/domain/entities/app_settings.dart';
import '../features/settings/presentation/providers/settings_providers.dart';
import 'kairos_engine.dart';

/// Graf zależności aplikacji.
///
/// Dwa providery są celowo „puste” i muszą zostać nadpisane w `ProviderScope`
/// (patrz `bootstrap.dart`): baza i ustawienia są otwierane asynchronicznie
/// przed pierwszą klatką, żeby UI nigdy nie musiał renderować stanu „ładuję
/// fundamenty”.
final Provider<KairosDatabase> databaseProvider = Provider<KairosDatabase>((
  Ref ref,
) {
  throw UnimplementedError(
    'databaseProvider musi zostać nadpisany w ProviderScope (bootstrap.dart)',
  );
});

final Provider<PreferencesStore> preferencesProvider = Provider<PreferencesStore>(
  (Ref ref) {
    throw UnimplementedError(
      'preferencesProvider musi zostać nadpisany w ProviderScope (bootstrap.dart)',
    );
  },
);

final Provider<Clock> clockProvider = Provider<Clock>(
  (Ref ref) => const SystemClock(),
);

// ── DAO ────────────────────────────────────────────────────────────────────

final Provider<SensingDao> sensingDaoProvider = Provider<SensingDao>(
  (Ref ref) => SensingDao(ref.watch(databaseProvider).db),
);

final Provider<StateDao> stateDaoProvider = Provider<StateDao>(
  (Ref ref) => StateDao(ref.watch(databaseProvider).db),
);

final Provider<InterventionDao> interventionDaoProvider =
    Provider<InterventionDao>(
      (Ref ref) => InterventionDao(ref.watch(databaseProvider).db),
    );

final Provider<ModelDao> modelDaoProvider = Provider<ModelDao>(
  (Ref ref) => ModelDao(ref.watch(databaseProvider).db),
);

// ── Źródła danych ──────────────────────────────────────────────────────────

final Provider<NotificationDataSource> notificationDataSourceProvider =
    Provider<NotificationDataSource>((Ref ref) {
      final NotificationDataSource source = NotificationDataSource();
      ref.onDispose(source.dispose);
      return source;
    });

/// Adapter lokalnego modelu językowego.
///
/// Usunięcie tego providera (i pliku `gemma_llm_engine.dart`) wycina zależność
/// od `flutter_gemma` — aplikacja działa dalej na silniku kompozycyjnym.
final Provider<GemmaLlmEngine> gemmaEngineProvider = Provider<GemmaLlmEngine>((
  Ref ref,
) {
  final GemmaLlmEngine engine = GemmaLlmEngine();
  ref.onDispose(engine.dispose);
  return engine;
});

final Provider<List<InterventionEngine>> interventionEnginesProvider =
    Provider<List<InterventionEngine>>(
      (Ref ref) => <InterventionEngine>[
        ref.watch(gemmaEngineProvider),
        const CompositionEngine(),
      ],
    );

// ── Repozytoria ────────────────────────────────────────────────────────────

final Provider<SensingRepository> sensingRepositoryProvider =
    Provider<SensingRepository>((Ref ref) {
      final SensingRepositoryImpl repository = SensingRepositoryImpl(
        clock: ref.watch(clockProvider),
      );
      ref.onDispose(repository.dispose);
      return repository;
    });

final Provider<FlowStateRepository> flowStateRepositoryProvider =
    Provider<FlowStateRepository>((Ref ref) {
      final FlowStateRepositoryImpl repository = FlowStateRepositoryImpl(
        sensing: ref.watch(sensingRepositoryProvider),
        stateDao: ref.watch(stateDaoProvider),
        sensingDao: ref.watch(sensingDaoProvider),
        modelDao: ref.watch(modelDaoProvider),
        clock: ref.watch(clockProvider),
      );
      ref.onDispose(repository.dispose);
      return repository;
    });

final Provider<InterventionRepository> interventionRepositoryProvider =
    Provider<InterventionRepository>((Ref ref) {
      final AppSettings settings = ref.read(settingsProvider);

      final InterventionRepositoryImpl repository = InterventionRepositoryImpl(
        dao: ref.watch(interventionDaoProvider),
        notifications: ref.watch(notificationDataSourceProvider),
        engines: ref.watch(interventionEnginesProvider),
        config: settings.toPolicyConfig(),
        clock: ref.watch(clockProvider),
        onConfigChanged: (PolicyConfig config) {
          // Polityka sama dostraja odstęp — utrwalamy go w ustawieniach.
          ref
              .read(settingsProvider.notifier)
              .setCooldownMinutes(config.cooldown.inMinutes);
        },
      );

      // Zmiany ustawień wchodzą w życie natychmiast, bez odtwarzania obiektu
      // (odtworzenie zerwałoby subskrypcje silnika).
      ref.listen<AppSettings>(settingsProvider, (
        AppSettings? previous,
        AppSettings next,
      ) {
        repository.updateConfig(next.toPolicyConfig());
      });

      ref.onDispose(repository.dispose);
      return repository;
    });

// ── Silnik aplikacji ───────────────────────────────────────────────────────

final Provider<KairosEngine> kairosEngineProvider = Provider<KairosEngine>((
  Ref ref,
) {
  final KairosEngine engine = KairosEngine(
    sensing: ref.watch(sensingRepositoryProvider),
    flow: ref.watch(flowStateRepositoryProvider),
    interventions: ref.watch(interventionRepositoryProvider),
  );
  ref.onDispose(engine.dispose);
  return engine;
});
