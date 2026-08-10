import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fpdart/fpdart.dart';

import '../../../../app/di.dart';
import '../../../../app/kairos_engine.dart';
import '../../../../core/error/failure.dart';
import '../../../settings/domain/entities/app_settings.dart';
import '../../../settings/presentation/providers/settings_providers.dart';
import '../../data/datasources/background_sensing_service.dart';
import '../../domain/entities/feature_window.dart';

/// Stan przycisku „nasłuchuj” na ekranie głównym.
class SensingUiState {
  const SensingUiState({
    this.isRunning = false,
    this.isBusy = false,
    this.failure,
    this.notificationsBlocked = false,
  });

  final bool isRunning;
  final bool isBusy;
  final Failure? failure;

  /// Nasłuch działa, ale system nie pozwala doręczać powiadomień —
  /// interwencje pojawią się tylko wewnątrz aplikacji.
  final bool notificationsBlocked;

  SensingUiState copyWith({
    bool? isRunning,
    bool? isBusy,
    Failure? failure,
    bool clearFailure = false,
    bool? notificationsBlocked,
  }) {
    return SensingUiState(
      isRunning: isRunning ?? this.isRunning,
      isBusy: isBusy ?? this.isBusy,
      failure: clearFailure ? null : (failure ?? this.failure),
      notificationsBlocked: notificationsBlocked ?? this.notificationsBlocked,
    );
  }
}

/// Steruje cyklem życia nasłuchu. Start jest zawsze świadomą decyzją
/// użytkownika — aplikacja nigdy nie włącza czujników sama z siebie.
class SensingController extends Notifier<SensingUiState> {
  @override
  SensingUiState build() {
    final KairosEngine engine = ref.watch(kairosEngineProvider);
    return SensingUiState(isRunning: engine.isSensing);
  }

  Future<void> toggle() => state.isRunning ? stop() : start();

  Future<void> start() async {
    if (state.isBusy) {
      return;
    }
    state = state.copyWith(isBusy: true, clearFailure: true);

    final KairosEngine engine = ref.read(kairosEngineProvider);

    final Either<Failure, Unit> initialized = await engine.initialize();
    if (initialized.isLeft()) {
      _fail(initialized);
      return;
    }

    final AppSettings settings = ref.read(settingsProvider);
    bool notificationsBlocked = false;
    if (settings.notificationsEnabled) {
      notificationsBlocked = !await ref
          .read(notificationDataSourceProvider)
          .ensurePermission();
    }

    final Either<Failure, Unit> started = await engine.startSensing();

    if (settings.backgroundEnabled && started.isRight()) {
      // Usługa pierwszoplanowa trzyma proces przy życiu (tylko Android).
      await ref
          .read(backgroundSensingProvider)
          .start(stateLabel: 'Czytam sygnał z czujników ruchu');
    }

    started.match(
      (Failure failure) => state = state.copyWith(
        isBusy: false,
        isRunning: false,
        failure: failure,
      ),
      (_) => state = state.copyWith(
        isBusy: false,
        isRunning: true,
        clearFailure: true,
        notificationsBlocked: notificationsBlocked,
      ),
    );
  }

  Future<void> stop() async {
    if (state.isBusy) {
      return;
    }
    state = state.copyWith(isBusy: true);

    await ref.read(backgroundSensingProvider).stop();

    final Either<Failure, Unit> stopped = await ref
        .read(kairosEngineProvider)
        .stopSensing();

    stopped.match(
      (Failure failure) =>
          state = state.copyWith(isBusy: false, failure: failure),
      (_) => state = state.copyWith(
        isBusy: false,
        isRunning: false,
        clearFailure: true,
      ),
    );
  }

  void _fail(Either<Failure, Unit> result) {
    result.match(
      (Failure failure) =>
          state = state.copyWith(isBusy: false, failure: failure),
      (_) => state = state.copyWith(isBusy: false),
    );
  }
}

final NotifierProvider<SensingController, SensingUiState> sensingProvider =
    NotifierProvider<SensingController, SensingUiState>(SensingController.new);

/// Usługa pierwszoplanowa (Android). Na iOS wszystkie metody są no-opem.
final Provider<BackgroundSensingService> backgroundSensingProvider =
    Provider<BackgroundSensingService>(
      (Ref ref) => const BackgroundSensingService(),
    );

/// Podgląd sygnału na żywo (odświeżany 2×/s, nic nie zapisuje).
final StreamProvider<LiveSignal> liveSignalProvider = StreamProvider<LiveSignal>(
  (Ref ref) => ref.watch(kairosEngineProvider).liveSignal,
);
