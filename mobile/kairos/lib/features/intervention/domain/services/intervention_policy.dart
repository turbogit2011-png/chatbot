import '../../../flow_state/domain/entities/state_reading.dart';

/// Powód, dla którego Kairos milczy. Pokazujemy go wprost w UI — „dlaczego nic
/// nie mówisz” jest równie ważną informacją jak sama interwencja.
enum SuppressReason {
  disabled('Interwencje są wyłączone.'),
  protectedState('Chronię to skupienie — nie przerywam.'),
  notInterruptible('Ten stan nie wymaga reakcji.'),
  unsettled('Stan właśnie się zmienia — czekam na potwierdzenie.'),
  unreliableSignal('Za mało sygnału z czujników w tym oknie.'),
  lowConfidence('Nie jestem wystarczająco pewny odczytu.'),
  cooldown('Za wcześnie po poprzedniej wiadomości.'),
  quietHours('Cisza nocna.'),
  dailyLimit('Limit na dziś wyczerpany.');

  const SuppressReason(this.explanation);

  final String explanation;
}

/// Wynik oceny polityki.
sealed class InterventionDecision {
  const InterventionDecision();

  bool get isAllowed => this is AllowIntervention;
}

/// Wolno przerwać.
final class AllowIntervention extends InterventionDecision {
  const AllowIntervention({required this.reading});

  final StateReading reading;
}

/// Nie wolno przerwać — z konkretnym, pokazywalnym powodem.
final class SuppressIntervention extends InterventionDecision {
  const SuppressIntervention({required this.reason, this.retryAfter});

  final SuppressReason reason;

  /// Za ile warunek może przestać obowiązywać (cooldown, cisza nocna).
  final Duration? retryAfter;

  String get explanation => reason.explanation;
}

/// Parametry polityki — pochodzą z ustawień użytkownika i z jego reakcji.
class PolicyConfig {
  const PolicyConfig({
    this.enabled = true,
    this.minConfidence = 0.55,
    this.cooldown = const Duration(minutes: 25),
    this.dailyLimit = 6,
    this.quietStartMinutes = 22 * 60 + 30,
    this.quietEndMinutes = 7 * 60,
    this.requireReliableSignal = true,
    this.deliverAsNotification = true,
    this.useLocalModel = true,
  });

  final bool enabled;

  /// Czy doręczać interwencję powiadomieniem systemowym (poza aplikacją).
  final bool deliverAsNotification;

  /// Czy wolno sięgać po lokalny model językowy. `false` → tylko silnik
  /// kompozycyjny.
  final bool useLocalModel;

  /// Minimalna pewność modelu, przy której w ogóle otwieramy usta.
  final double minConfidence;

  /// Osobisty odstęp między interwencjami — rośnie po odrzuceniach,
  /// maleje po „pomogło”.
  final Duration cooldown;

  final int dailyLimit;

  /// Cisza nocna wyrażona w minutach od północy (obsługuje przejście przez 24:00).
  final int quietStartMinutes;
  final int quietEndMinutes;

  final bool requireReliableSignal;

  static const Duration minCooldown = Duration(minutes: 15);
  static const Duration maxCooldown = Duration(minutes: 90);

  /// Przesuwa cooldown w granicach [minCooldown]–[maxCooldown].
  PolicyConfig withCooldownDelta(Duration delta) {
    final int minutes = (cooldown + delta).inMinutes.clamp(
      minCooldown.inMinutes,
      maxCooldown.inMinutes,
    );
    return copyWith(cooldown: Duration(minutes: minutes));
  }

  PolicyConfig copyWith({
    bool? enabled,
    double? minConfidence,
    Duration? cooldown,
    int? dailyLimit,
    int? quietStartMinutes,
    int? quietEndMinutes,
    bool? requireReliableSignal,
    bool? deliverAsNotification,
    bool? useLocalModel,
  }) {
    return PolicyConfig(
      enabled: enabled ?? this.enabled,
      minConfidence: minConfidence ?? this.minConfidence,
      cooldown: cooldown ?? this.cooldown,
      dailyLimit: dailyLimit ?? this.dailyLimit,
      quietStartMinutes: quietStartMinutes ?? this.quietStartMinutes,
      quietEndMinutes: quietEndMinutes ?? this.quietEndMinutes,
      requireReliableSignal:
          requireReliableSignal ?? this.requireReliableSignal,
      deliverAsNotification:
          deliverAsNotification ?? this.deliverAsNotification,
      useLocalModel: useLocalModel ?? this.useLocalModel,
    );
  }
}

/// Czysta, w pełni testowalna polityka przerywania.
///
/// To serce obietnicy produktu: aplikacja, która **domyślnie milczy**.
/// Kolejność reguł jest istotna — od najmocniejszych zakazów do najsłabszych,
/// żeby powód pokazywany użytkownikowi był tym najbardziej istotnym.
class InterventionPolicy {
  const InterventionPolicy();

  InterventionDecision evaluate({
    required StateReading reading,
    required PolicyConfig config,
    required DateTime now,
    required bool signalReliable,
    required int interventionsToday,
    DateTime? lastInterventionAt,
  }) {
    if (!config.enabled) {
      return const SuppressIntervention(reason: SuppressReason.disabled);
    }

    if (reading.state.isProtected) {
      return const SuppressIntervention(reason: SuppressReason.protectedState);
    }

    if (!reading.state.isInterruptible) {
      return const SuppressIntervention(reason: SuppressReason.notInterruptible);
    }

    if (!reading.isSettled) {
      return const SuppressIntervention(reason: SuppressReason.unsettled);
    }

    if (config.requireReliableSignal && !signalReliable) {
      return const SuppressIntervention(reason: SuppressReason.unreliableSignal);
    }

    if (reading.confidence < config.minConfidence) {
      return const SuppressIntervention(reason: SuppressReason.lowConfidence);
    }

    final Duration? quietLeft = _quietHoursRemaining(now, config);
    if (quietLeft != null) {
      return SuppressIntervention(
        reason: SuppressReason.quietHours,
        retryAfter: quietLeft,
      );
    }

    if (interventionsToday >= config.dailyLimit) {
      return SuppressIntervention(
        reason: SuppressReason.dailyLimit,
        retryAfter: _untilMidnight(now),
      );
    }

    if (lastInterventionAt != null) {
      final Duration elapsed = now.difference(lastInterventionAt);
      if (elapsed < config.cooldown) {
        return SuppressIntervention(
          reason: SuppressReason.cooldown,
          retryAfter: config.cooldown - elapsed,
        );
      }
    }

    return AllowIntervention(reading: reading);
  }

  /// Zwraca czas pozostały do końca ciszy nocnej albo `null`, jeśli jej nie ma.
  Duration? _quietHoursRemaining(DateTime now, PolicyConfig config) {
    final int start = config.quietStartMinutes % (24 * 60);
    final int end = config.quietEndMinutes % (24 * 60);
    if (start == end) {
      return null;
    }

    final int minutes = now.hour * 60 + now.minute;
    final bool crossesMidnight = start > end;
    final bool inQuiet = crossesMidnight
        ? minutes >= start || minutes < end
        : minutes >= start && minutes < end;

    if (!inQuiet) {
      return null;
    }

    final int minutesLeft = minutes < end
        ? end - minutes
        : (24 * 60 - minutes) + end;
    return Duration(minutes: minutesLeft);
  }

  Duration _untilMidnight(DateTime now) {
    final DateTime midnight = DateTime(now.year, now.month, now.day + 1);
    return midnight.difference(now);
  }
}
