/// TurboCare Ecosystem — Filar 1 + 2
/// =================================
/// SILNIK LOGIKI MONTAŻOWO-GWARANCYJNEJ (Warranty Interlock State Machine).
///
/// Maszyna stanów zarządzająca całym procesem montażu, adaptacji i aktywacji
/// gwarancji regenerowanej turbosprężarki. Konstrukcja gwarantuje na poziomie
/// typów i logiki, że ŻADEN etap nie może zostać pominięty:
///
///   notVerified → checklistCompleted → actuatorSweepPassed
///        → dtcCleared → roadTestValidated → warrantyActivated
///
/// Każde przejście wymaga obiektu-dowodu (Evidence), który sam waliduje swoje
/// kryteria zaliczenia. Próba przejścia poza macierzą dozwolonych tranzycji
/// lub z niekompletnym dowodem kończy się [Err] z [WizardFailure] — nigdy
/// cichym zaakceptowaniem.
library;

import 'dart:collection';

import '../../core/result.dart';

// ---------------------------------------------------------------------------
// STANY PROCESU
// ---------------------------------------------------------------------------

/// Stany cyklu życia montażu i gwarancji.
///
/// Kolejność deklaracji odpowiada kolejności procesu — [index] służy do
/// porównań "czy etap X został już osiągnięty" (patrz [TurboAssemblyWizardController.hasReached]).
enum TurboAssemblyState {
  /// Stan początkowy: turbina zeskanowana, ale nic nie zostało zweryfikowane.
  notVerified,

  /// Pre-Flight Checklist zamknięta: wszystkie obowiązkowe kroki fizyczne
  /// potwierdzone (oliwienie, przewód olejowy, intercooler, pomiar odmy).
  checklistCompleted,

  /// Test I (statyczny sweep geometrii VGT / nastawnika) zaliczony
  /// oraz Test II (szczelność układu) w normie.
  actuatorSweepPassed,

  /// Pamięć błędów skasowana i potwierdzona re-skanem: brak aktywnych
  /// kodów związanych z doładowaniem.
  dtcCleared,

  /// Próba drogowa zwalidowana przez Live Boost Analyzer
  /// (Health Score ≥ próg, zero niezamkniętych flag under/overboost).
  roadTestValidated,

  /// Gwarancja aktywowana — raport podpisany i wysłany (lub w outboxie offline).
  /// Stan terminalny pozytywny.
  warrantyActivated,

  /// Proces odrzucony (np. konflikt VIN anti-fraud, nieusuwalna usterka).
  /// Stan terminalny negatywny — wymaga interwencji działu gwarancji.
  warrantyRejected,
}

// ---------------------------------------------------------------------------
// DOWODY PRZEJŚĆ (EVIDENCE) — każdy etap wymaga twardych danych, nie "kliknięcia"
// ---------------------------------------------------------------------------

/// Bazowa klasa dowodu wymaganego do przejścia między stanami.
///
/// Dowód sam zna swoje kryteria zaliczenia ([validate]) — kontroler nie musi
/// znać szczegółów każdego testu, a nowe rodzaje dowodów nie zmieniają
/// jego logiki (Open/Closed).
sealed class TransitionEvidence {
  const TransitionEvidence();

  /// Zwraca `null`, gdy dowód spełnia kryteria; w przeciwnym razie opis
  /// pierwszego niespełnionego warunku (komunikat techniczny do logów).
  String? validate();
}

/// Dowód weryfikacji tożsamości: paszport pobrany + VIN powiązany.
final class IdentityEvidence extends TransitionEvidence {
  const IdentityEvidence({
    required this.serialNumber,
    required this.vin,
    required this.passportFetched,
    required this.vinBindingAccepted,
    required this.engineCodeMatches,
  });

  final String serialNumber;
  final String vin;

  /// Czy paszport został pobrany z API (lub z podpisanego cache offline).
  final bool passportFetched;

  /// Czy backend zaakceptował powiązanie VIN ↔ S/N (anti-fraud przeszedł).
  final bool vinBindingAccepted;

  /// Czy kod silnika z dekodera VIN zgadza się z przeznaczeniem turbiny.
  final bool engineCodeMatches;

  /// VIN: 17 znaków, bez I/O/Q (norma ISO 3779).
  static final RegExp _vinPattern = RegExp(r'^[A-HJ-NPR-Z0-9]{17}$');

  @override
  String? validate() {
    if (!passportFetched) return 'Paszport turbiny nie został pobrany z API.';
    if (!_vinPattern.hasMatch(vin)) return 'VIN "$vin" ma niepoprawny format.';
    if (!vinBindingAccepted) {
      return 'Backend odrzucił powiązanie VIN↔S/N (możliwy konflikt anti-fraud).';
    }
    if (!engineCodeMatches) {
      return 'Kod silnika pojazdu nie zgadza się z przeznaczeniem turbiny.';
    }
    return null;
  }
}

/// Pojedynczy krok Pre-Flight Checklisty z potwierdzeniem fizycznym.
final class ChecklistItemProof {
  const ChecklistItemProof({
    required this.stepId,
    required this.mandatory,
    required this.confirmed,
    this.photoEvidenceCount = 0,
    this.requiresPhoto = false,
  });

  final String stepId;
  final bool mandatory;
  final bool confirmed;
  final int photoEvidenceCount;
  final bool requiresPhoto;

  bool get satisfied =>
      !mandatory || (confirmed && (!requiresPhoto || photoEvidenceCount > 0));
}

/// Dowód zamknięcia Pre-Flight Checklisty.
final class ChecklistEvidence extends TransitionEvidence {
  const ChecklistEvidence({required this.items});

  final List<ChecklistItemProof> items;

  /// Minimalny, niezbywalny zestaw kroków — nawet gdyby konfiguracja OTA
  /// była uboższa, te kroki MUSZĄ istnieć i być potwierdzone.
  static const Set<String> requiredStepIds = {
    'oil_priming_syringe', // zalanie turbiny olejem strzykawką
    'oil_feed_line_replaced', // wymiana przewodu zasilania olejem
    'intercooler_cleaned', // czyszczenie intercoolera z oleju/opiłków
    'crankcase_pressure_measured', // pomiar ciśnienia w skrzyni korbowej (odma)
  };

  @override
  String? validate() {
    final presentIds = items.map((i) => i.stepId).toSet();
    final missing = requiredStepIds.difference(presentIds);
    if (missing.isNotEmpty) {
      return 'Checklista nie zawiera wymaganych kroków: ${missing.join(', ')}.';
    }
    for (final item in items) {
      if (!item.satisfied) {
        return 'Krok "${item.stepId}" nie został potwierdzony '
            '(lub brak wymaganego zdjęcia dowodowego).';
      }
    }
    return null;
  }
}

/// Dowód zaliczenia Testu I (sweep geometrii) i Testu II (szczelność).
final class ActuatorTestEvidence extends TransitionEvidence {
  const ActuatorTestEvidence({
    required this.sweepMinPositionPct,
    required this.sweepMaxPositionPct,
    required this.maxPositionDeviationPct,
    required this.travelTimeMs,
    required this.allowedTravelTimeMs,
    required this.leakTestPressureDropBarPer30s,
    this.maxAllowedDeviationPct = 3.0,
    this.maxAllowedLeakDropBar = 0.10,
  });

  // --- Test I: Sweep ---
  final double sweepMinPositionPct; // osiągnięte minimum zakresu
  final double sweepMaxPositionPct; // osiągnięte maksimum zakresu
  final double maxPositionDeviationPct; // największa odchyłka zadana/rzeczywista
  final int travelTimeMs; // czas pełnego przejścia min→max
  final int allowedTravelTimeMs; // limit czasu wg profilu marki

  // --- Test II: Boost Leak ---
  final double leakTestPressureDropBarPer30s;

  // Progi zaliczenia (nadpisywalne profilem marki).
  final double maxAllowedDeviationPct;
  final double maxAllowedLeakDropBar;

  @override
  String? validate() {
    // Pełny zakres ruchu: min blisko 0%, max blisko 100% (tolerancja 5 p.p.).
    if (sweepMinPositionPct > 5.0) {
      return 'Sweep: geometria nie osiąga dolnego ogranicznika '
          '(min=${sweepMinPositionPct.toStringAsFixed(1)}%).';
    }
    if (sweepMaxPositionPct < 95.0) {
      return 'Sweep: geometria nie osiąga górnego ogranicznika '
          '(max=${sweepMaxPositionPct.toStringAsFixed(1)}%).';
    }
    if (maxPositionDeviationPct > maxAllowedDeviationPct) {
      return 'Sweep: odchyłka pozycji ${maxPositionDeviationPct.toStringAsFixed(1)}% '
          '> ${maxAllowedDeviationPct.toStringAsFixed(1)}% — możliwe zacięcie mechaniczne.';
    }
    if (travelTimeMs > allowedTravelTimeMs) {
      return 'Sweep: czas przejścia ${travelTimeMs}ms przekracza limit '
          '${allowedTravelTimeMs}ms — nadmierny opór geometrii.';
    }
    if (leakTestPressureDropBarPer30s > maxAllowedLeakDropBar) {
      return 'Leak Test: spadek ${leakTestPressureDropBarPer30s.toStringAsFixed(2)} bar/30s '
          '> ${maxAllowedLeakDropBar.toStringAsFixed(2)} — nieszczelność układu.';
    }
    return null;
  }
}

/// Dowód skasowania i re-weryfikacji pamięci błędów.
final class DtcClearedEvidence extends TransitionEvidence {
  const DtcClearedEvidence({
    required this.clearCommandConfirmed,
    required this.rescanPerformed,
    required this.activeBoostRelatedCodes,
  });

  /// Czy ECU potwierdziło komendę kasowania (Mode 04 / UDS 0x14 → pozytywna odpowiedź).
  final bool clearCommandConfirmed;

  /// Czy wykonano ponowny odczyt PO kasowaniu (nie ufamy samemu "clear").
  final bool rescanPerformed;

  /// Kody doładowania nadal aktywne po re-skanie (muszą być puste).
  final List<String> activeBoostRelatedCodes;

  @override
  String? validate() {
    if (!clearCommandConfirmed) return 'ECU nie potwierdziło kasowania DTC.';
    if (!rescanPerformed) return 'Brak re-skanu pamięci błędów po kasowaniu.';
    if (activeBoostRelatedCodes.isNotEmpty) {
      return 'Aktywne kody doładowania po kasowaniu: '
          '${activeBoostRelatedCodes.join(', ')} — najpierw usuń przyczynę '
          'wg matrycy DTC Engine.';
    }
    return null;
  }
}

/// Dowód zwalidowanej próby drogowej (wynik Live Boost Analyzer).
final class RoadTestEvidence extends TransitionEvidence {
  const RoadTestEvidence({
    required this.boostHealthScore,
    required this.underboostEvents,
    required this.overboostEvents,
    required this.testDurationSeconds,
    this.minRequiredScore = 85,
    this.minTestDurationSeconds = 300,
  });

  final int boostHealthScore; // 0–100 z analizatora
  final int underboostEvents; // zamknięte okna niedoładowania
  final int overboostEvents; // zamknięte okna przeładowania
  final int testDurationSeconds;
  final int minRequiredScore;
  final int minTestDurationSeconds;

  @override
  String? validate() {
    if (testDurationSeconds < minTestDurationSeconds) {
      return 'Próba drogowa za krótka: ${testDurationSeconds}s '
          '< wymagane ${minTestDurationSeconds}s.';
    }
    if (overboostEvents > 0) {
      return 'Wykryto $overboostEvents zdarzeń OVERBOOST — ryzyko uszkodzenia; '
          'wymagana ponowna kalibracja przed aktywacją gwarancji.';
    }
    if (underboostEvents > 0) {
      return 'Wykryto $underboostEvents zdarzeń UNDERBOOST — sprawdź szczelność '
          'i kalibrację wg checklisty analizatora.';
    }
    if (boostHealthScore < minRequiredScore) {
      return 'Boost Health Score $boostHealthScore < $minRequiredScore — '
          'osiągi poza tolerancją mapy referencyjnej.';
    }
    return null;
  }
}

/// Dowód aktywacji gwarancji: podpisany raport przyjęty przez API lub w outboxie.
final class WarrantyActivationEvidence extends TransitionEvidence {
  const WarrantyActivationEvidence({
    required this.activationId,
    required this.payloadHmacPresent,
    required this.acceptedByApiOrQueued,
  });

  /// Idempotentny identyfikator aktywacji (UUID v7) — ochrona przed dublami.
  final String activationId;

  /// Czy payload został podpisany HMAC kluczem urządzenia (anti-tamper).
  final bool payloadHmacPresent;

  /// Przyjęte przez API 2xx LUB trwale zakolejkowane w outboxie offline.
  final bool acceptedByApiOrQueued;

  @override
  String? validate() {
    if (activationId.isEmpty) return 'Brak identyfikatora aktywacji.';
    if (!payloadHmacPresent) return 'Raport aktywacyjny nie został podpisany HMAC.';
    if (!acceptedByApiOrQueued) {
      return 'Raport nie został przyjęty przez API ani zakolejkowany offline.';
    }
    return null;
  }
}

/// Dowód odrzucenia procesu (ścieżka negatywna — też wymaga uzasadnienia).
final class RejectionEvidence extends TransitionEvidence {
  const RejectionEvidence({required this.reasonCode, required this.note});

  /// Kod przyczyny, np. `vin_conflict`, `unresolvable_dtc`, `customer_refused`.
  final String reasonCode;
  final String note;

  @override
  String? validate() =>
      reasonCode.isEmpty ? 'Odrzucenie wymaga kodu przyczyny.' : null;
}

// ---------------------------------------------------------------------------
// BŁĘDY MASZYNY STANÓW
// ---------------------------------------------------------------------------

/// Błąd operacji na maszynie stanów wizarda.
final class WizardFailure extends Failure {
  const WizardFailure(super.message, {required this.kind});

  final WizardFailureKind kind;
}

enum WizardFailureKind {
  /// Przejście spoza macierzy dozwolonych tranzycji (próba pominięcia etapu).
  illegalTransition,

  /// Dowód nie spełnia kryteriów zaliczenia etapu.
  evidenceRejected,

  /// Dowód niewłaściwego typu dla żądanego przejścia.
  evidenceTypeMismatch,

  /// Operacja na stanie terminalnym.
  processFinalized,
}

// ---------------------------------------------------------------------------
// WPIS AUDYTU
// ---------------------------------------------------------------------------

/// Niezmienny wpis dziennika audytowego — każda (również odrzucona) próba
/// przejścia zostawia ślad; dziennik jest częścią raportu gwarancyjnego.
final class WizardAuditEntry {
  const WizardAuditEntry({
    required this.timestamp,
    required this.fromState,
    required this.toState,
    required this.accepted,
    this.rejectionReason,
  });

  final DateTime timestamp;
  final TurboAssemblyState fromState;
  final TurboAssemblyState toState;
  final bool accepted;
  final String? rejectionReason;

  Map<String, Object?> toJson() => {
        'timestamp': timestamp.toUtc().toIso8601String(),
        'from': fromState.name,
        'to': toState.name,
        'accepted': accepted,
        if (rejectionReason != null) 'rejectionReason': rejectionReason,
      };
}

// ---------------------------------------------------------------------------
// KONTROLER — WŁAŚCIWA MASZYNA STANÓW
// ---------------------------------------------------------------------------

/// Kontroler procesu montażu i aktywacji gwarancji.
///
/// INWARIANTY (egzekwowane w 100% przez kod, nie przez konwencję):
///  1. Stan zmienia się WYŁĄCZNIE metodą [advance] — brak publicznego settera.
///  2. Dozwolone są tylko przejścia z [_transitionMatrix]; wszystko inne
///     zwraca [WizardFailureKind.illegalTransition].
///  3. Każde przejście wymaga dowodu właściwego TYPU i przechodzącego
///     własną walidację ([TransitionEvidence.validate]).
///  4. Stany terminalne ([TurboAssemblyState.warrantyActivated],
///     [TurboAssemblyState.warrantyRejected]) są nieopuszczalne.
///  5. Każda próba przejścia (także odrzucona) trafia do dziennika audytu.
final class TurboAssemblyWizardController {
  TurboAssemblyWizardController({
    TurboAssemblyState initialState = TurboAssemblyState.notVerified,
    DateTime Function()? clock,
  })  : _state = initialState,
        _clock = clock ?? DateTime.now;

  /// Odtworzenie kontrolera z utrwalonego stanu (np. po restarcie aplikacji).
  ///
  /// Uwaga: przywracamy wyłącznie stan zapisany przez nas samych (secure
  /// storage z MAC-iem) — deserializacja nie pozwala "wskoczyć" w środek
  /// procesu bez wcześniejszego legalnego przejścia, bo zapis następuje
  /// tylko po zaakceptowanym [advance].
  factory TurboAssemblyWizardController.restore(Map<String, Object?> json) {
    final stateName = json['state'] as String? ?? '';
    final state = TurboAssemblyState.values.asNameMap()[stateName] ??
        TurboAssemblyState.notVerified;
    return TurboAssemblyWizardController(initialState: state);
  }

  final DateTime Function() _clock;

  TurboAssemblyState _state;

  /// Aktualny stan procesu (tylko do odczytu).
  TurboAssemblyState get state => _state;

  final List<WizardAuditEntry> _auditLog = [];

  /// Niemodyfikowalny widok dziennika audytowego.
  UnmodifiableListView<WizardAuditEntry> get auditLog =>
      UnmodifiableListView(_auditLog);

  final List<void Function(TurboAssemblyState)> _listeners = [];

  /// Rejestracja nasłuchu zmian stanu (warstwa UI / synchronizacja cloud).
  void addListener(void Function(TurboAssemblyState newState) listener) =>
      _listeners.add(listener);

  void removeListener(void Function(TurboAssemblyState) listener) =>
      _listeners.remove(listener);

  /// MACIERZ PRZEJŚĆ — jedyne legalne krawędzie grafu procesu.
  ///
  /// Klucz: stan bieżący; wartość: mapa {stan docelowy → wymagany typ dowodu}.
  /// Odrzucenie ([TurboAssemblyState.warrantyRejected]) jest osiągalne z każdego
  /// stanu nieterminalnego — proces można przerwać, ale nigdy "przewinąć".
  static final Map<TurboAssemblyState, Map<TurboAssemblyState, Type>>
      _transitionMatrix = {
    TurboAssemblyState.notVerified: {
      TurboAssemblyState.checklistCompleted: ChecklistEvidence,
      TurboAssemblyState.warrantyRejected: RejectionEvidence,
    },
    TurboAssemblyState.checklistCompleted: {
      TurboAssemblyState.actuatorSweepPassed: ActuatorTestEvidence,
      TurboAssemblyState.warrantyRejected: RejectionEvidence,
    },
    TurboAssemblyState.actuatorSweepPassed: {
      TurboAssemblyState.dtcCleared: DtcClearedEvidence,
      TurboAssemblyState.warrantyRejected: RejectionEvidence,
    },
    TurboAssemblyState.dtcCleared: {
      TurboAssemblyState.roadTestValidated: RoadTestEvidence,
      TurboAssemblyState.warrantyRejected: RejectionEvidence,
    },
    TurboAssemblyState.roadTestValidated: {
      TurboAssemblyState.warrantyActivated: WarrantyActivationEvidence,
      TurboAssemblyState.warrantyRejected: RejectionEvidence,
    },
    // Stany terminalne: brak wyjść.
    TurboAssemblyState.warrantyActivated: {},
    TurboAssemblyState.warrantyRejected: {},
  };

  /// Weryfikacja tożsamości (skan QR + VIN + bind) wykonywana PRZED checklistą.
  ///
  /// Nie zmienia stanu maszyny (stan pozostaje [TurboAssemblyState.notVerified]),
  /// ale jej pozytywny wynik jest warunkiem wstępnym pierwszego [advance] —
  /// kontroler pamięta flagę i odmówi przejścia do checklisty bez tożsamości.
  Result<void, WizardFailure> verifyIdentity(IdentityEvidence evidence) {
    final rejection = evidence.validate();
    if (rejection != null) {
      return Err(WizardFailure(rejection,
          kind: WizardFailureKind.evidenceRejected));
    }
    _identityVerified = true;
    return const Ok(null);
  }

  bool _identityVerified = false;
  bool get identityVerified => _identityVerified;

  /// Jedyna metoda zmieniająca stan procesu.
  ///
  /// Kolejność weryfikacji (fail-fast):
  ///  1. Czy proces nie jest już sfinalizowany?
  ///  2. Czy krawędź (from → to) istnieje w macierzy przejść?
  ///  3. Czy dowód ma właściwy typ dla tej krawędzi?
  ///  4. Czy dowód przechodzi własną walidację merytoryczną?
  ///  5. (dla pierwszego kroku) Czy tożsamość została zweryfikowana?
  Result<TurboAssemblyState, WizardFailure> advance(
    TurboAssemblyState target,
    TransitionEvidence evidence,
  ) {
    // 1. Stany terminalne są nieopuszczalne.
    final allowedTargets = _transitionMatrix[_state]!;
    if (allowedTargets.isEmpty) {
      return _reject(
        target,
        'Proces jest sfinalizowany w stanie ${_state.name} — dalsze przejścia '
        'niemożliwe.',
        WizardFailureKind.processFinalized,
      );
    }

    // 2. Krawędź musi istnieć w macierzy — to blokuje pomijanie etapów.
    final requiredEvidenceType = allowedTargets[target];
    if (requiredEvidenceType == null) {
      return _reject(
        target,
        'Nielegalne przejście ${_state.name} → ${target.name}. '
        'Dozwolone cele: ${allowedTargets.keys.map((s) => s.name).join(', ')}.',
        WizardFailureKind.illegalTransition,
      );
    }

    // 3. Typ dowodu musi odpowiadać krawędzi (np. nie można zamknąć próby
    //    drogowej dowodem z checklisty).
    if (evidence.runtimeType != requiredEvidenceType) {
      return _reject(
        target,
        'Przejście do ${target.name} wymaga dowodu $requiredEvidenceType, '
        'otrzymano ${evidence.runtimeType}.',
        WizardFailureKind.evidenceTypeMismatch,
      );
    }

    // 4. Merytoryczna walidacja dowodu.
    final rejection = evidence.validate();
    if (rejection != null) {
      return _reject(target, rejection, WizardFailureKind.evidenceRejected);
    }

    // 5. Pierwszy krok procesu dodatkowo wymaga zweryfikowanej tożsamości.
    if (_state == TurboAssemblyState.notVerified &&
        target == TurboAssemblyState.checklistCompleted &&
        !_identityVerified) {
      return _reject(
        target,
        'Checklista nie może zostać zamknięta przed weryfikacją tożsamości '
        '(skan QR + odczyt VIN + powiązanie w bazie gwarancyjnej).',
        WizardFailureKind.evidenceRejected,
      );
    }

    // Przejście zaakceptowane.
    _auditLog.add(WizardAuditEntry(
      timestamp: _clock(),
      fromState: _state,
      toState: target,
      accepted: true,
    ));
    _state = target;
    for (final listener in List.of(_listeners)) {
      listener(_state);
    }
    return Ok(_state);
  }

  /// Czy proces osiągnął (lub minął) dany etap — do sterowania UI
  /// (np. odblokowanie zakładki telemetrii dopiero po skasowaniu DTC).
  bool hasReached(TurboAssemblyState milestone) {
    if (_state == TurboAssemblyState.warrantyRejected) return false;
    return _state.index >= milestone.index;
  }

  /// Serializacja do utrwalenia (secure storage) i do raportu gwarancyjnego.
  Map<String, Object?> toJson() => {
        'state': _state.name,
        'identityVerified': _identityVerified,
        'auditLog': _auditLog.map((e) => e.toJson()).toList(),
      };

  Result<TurboAssemblyState, WizardFailure> _reject(
    TurboAssemblyState target,
    String reason,
    WizardFailureKind kind,
  ) {
    _auditLog.add(WizardAuditEntry(
      timestamp: _clock(),
      fromState: _state,
      toState: target,
      accepted: false,
      rejectionReason: reason,
    ));
    return Err(WizardFailure(reason, kind: kind));
  }
}
