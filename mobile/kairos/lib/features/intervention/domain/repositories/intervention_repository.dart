import '../../../../core/result/typedefs.dart';
import '../../../flow_state/domain/entities/state_reading.dart';
import '../entities/intention.dart';
import '../entities/intervention.dart';
import '../services/intervention_policy.dart';

/// Kontrakt modułu interwencji.
abstract interface class InterventionRepository {
  /// Interwencje faktycznie doręczone użytkownikowi.
  Stream<Intervention> get delivered;

  /// Identyfikatory interwencji otwartych z powiadomienia (deep-link).
  Stream<String> get notificationTaps;

  /// Aktualne parametry polityki (z ustawień + osobista adaptacja cooldownu).
  PolicyConfig get config;

  /// Ostatnia decyzja polityki — także ta odmowna, bo pokazujemy ją w UI.
  InterventionDecision? get lastDecision;

  FutureUnit initialize();

  /// Ocenia odczyt i — jeśli polityka pozwala — układa oraz doręcza zdanie.
  /// Zwraca `null`, gdy Kairos świadomie milczy.
  FutureEither<Intervention?> consider(
    StateReading reading, {
    required bool signalReliable,
  });

  /// Zapisuje reakcję użytkownika i przesuwa osobisty odstęp między
  /// interwencjami.
  FutureUnit recordFeedback({
    required Intervention intervention,
    required InterventionFeedback feedback,
  });

  FutureEither<List<Intervention>> history({required int limit});

  FutureEither<Intervention?> latest();

  FutureEither<InterventionStats> stats({required DateTime since});

  FutureEither<Intention?> activeIntention();

  FutureEither<Intention> setIntention(String text);

  FutureUnit clearIntention();

  void updateConfig(PolicyConfig config);

  Future<void> dispose();
}
