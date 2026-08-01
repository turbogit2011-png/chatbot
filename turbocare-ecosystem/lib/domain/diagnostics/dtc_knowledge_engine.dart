/// TurboCare Ecosystem — Filar 3
/// =============================
/// INTELIGENTNY SILNIK DIAGNOSTYCZNY DTC (Knowledge Tree Engine).
///
/// Zamiast suchej definicji z tabeli OBD, silnik dla każdego kodu związanego
/// z doładowaniem zwraca MATRYCĘ PRAWDOPODOBNYCH PRZYCZYN (wagi %),
/// uporządkowaną hierarchię weryfikacji oraz interaktywną checklistę
/// eliminacji — mechanik musi wykluczyć przyczyny zewnętrzne, zanim
/// zgłosi reklamację regenerowanej turbiny.
///
/// Baza wiedzy jest danymi (JSON, wersjonowana, aktualizowana OTA) —
/// ten moduł zawiera model, parser i logikę pracy z checklistą.
library;

import 'dart:collection';
import 'dart:convert';

import '../../core/result.dart';

// ---------------------------------------------------------------------------
// MODEL BAZY WIEDZY
// ---------------------------------------------------------------------------

/// Priorytet kodu DTC nadawany przez silnik (kody doładowania → critical/high).
enum DtcPriority {
  critical,
  high,
  medium,
  low,
  info;

  static DtcPriority parse(String raw) =>
      DtcPriority.values.asNameMap()[raw] ?? DtcPriority.medium;
}

/// Parametry Live Data rekomendowane do weryfikacji danego kodu.
/// Mapują się 1:1 na PID-y obsługiwane przez warstwę telemetrii.
enum LivePid {
  targetBoost,
  actualBoost,
  actuatorDuty,
  actuatorPosition,
  maf,
  rpm,
  engineLoad,
  batteryVoltage,
  barometricPressure;

  /// Parsowanie identyfikatorów z JSON (SCREAMING_SNAKE_CASE → enum).
  static LivePid? tryParse(String raw) => switch (raw) {
        'TARGET_BOOST' => LivePid.targetBoost,
        'ACTUAL_BOOST' => LivePid.actualBoost,
        'ACTUATOR_DUTY' => LivePid.actuatorDuty,
        'ACTUATOR_POSITION' => LivePid.actuatorPosition,
        'MAF' => LivePid.maf,
        'RPM' => LivePid.rpm,
        'ENGINE_LOAD' => LivePid.engineLoad,
        'BATTERY_VOLTAGE' => LivePid.batteryVoltage,
        'BAROMETRIC_PRESSURE' => LivePid.barometricPressure,
        _ => null,
      };
}

/// Pojedyncza prawdopodobna przyczyna z wagą % i instrukcją weryfikacji.
final class ProbableCause {
  const ProbableCause({
    required this.id,
    required this.label,
    required this.weightPct,
    required this.verificationSteps,
    required this.liveDataHint,
  });

  /// Stabilny identyfikator przyczyny (klucz checklisty eliminacji).
  final String id;

  /// Nazwa przyczyny prezentowana mechanikowi (PL).
  final String label;

  /// Waga statystyczna 0–100; wagi w obrębie kodu sumują się do 100.
  final int weightPct;

  /// Instrukcja "jak sprawdzić" — kroki w kolejności wykonania.
  final List<String> verificationSteps;

  /// Wskazówka: jak ta przyczyna objawia się w Live Data.
  final String liveDataHint;

  factory ProbableCause.fromJson(Map<String, Object?> json) => ProbableCause(
        id: json['id'] as String,
        label: json['label'] as String,
        weightPct: json['weightPct'] as int,
        verificationSteps: (json['verificationSteps'] as List)
            .cast<String>()
            .toList(growable: false),
        liveDataHint: json['liveDataHint'] as String? ?? '',
      );
}

/// Kompletny wpis wiedzy dla jednego kodu DTC.
final class DtcKnowledgeEntry {
  DtcKnowledgeEntry({
    required this.code,
    required this.title,
    required this.priority,
    required this.technicalDescription,
    required this.recommendedLivePids,
    required List<ProbableCause> probableCauses,
  }) : probableCauses = UnmodifiableListView(
          // Inwariant hierarchii: przyczyny zawsze malejąco po wadze —
          // mechanik widzi najbardziej prawdopodobną na górze.
          probableCauses.toList()
            ..sort((a, b) => b.weightPct.compareTo(a.weightPct)),
        );

  /// Kod SAE, np. `P0299`.
  final String code;

  /// Krótki tytuł techniczny.
  final String title;

  final DtcPriority priority;

  /// Pełny opis techniczny — co ECU faktycznie wykryło i czego kod NIE oznacza.
  final String technicalDescription;

  /// PID-y, które aplikacja proponuje włączyć w telemetrii podczas diagnozy.
  final List<LivePid> recommendedLivePids;

  /// Przyczyny posortowane malejąco po wadze (niemodyfikowalne).
  final UnmodifiableListView<ProbableCause> probableCauses;

  factory DtcKnowledgeEntry.fromJson(Map<String, Object?> json) =>
      DtcKnowledgeEntry(
        code: json['code'] as String,
        title: json['title'] as String,
        priority: DtcPriority.parse(json['priority'] as String? ?? 'medium'),
        technicalDescription: json['technicalDescription'] as String,
        recommendedLivePids: (json['recommendedLivePids'] as List? ?? const [])
            .cast<String>()
            .map(LivePid.tryParse)
            .whereType<LivePid>()
            .toList(growable: false),
        probableCauses: (json['probableCauses'] as List)
            .cast<Map<String, Object?>>()
            .map(ProbableCause.fromJson)
            .toList(),
      );
}

// ---------------------------------------------------------------------------
// CHECKLISTA ELIMINACJI PRZYCZYN
// ---------------------------------------------------------------------------

/// Werdykt mechanika dla pojedynczej przyczyny.
enum CauseVerdict {
  /// Jeszcze nie sprawdzona.
  pending,

  /// Sprawdzona i WYKLUCZONA (element sprawny).
  ruledOut,

  /// Sprawdzona i POTWIERDZONA jako usterka — to jest źródło problemu.
  confirmed,
}

/// Stan checklisty eliminacji dla jednej przyczyny.
final class CauseEliminationItem {
  CauseEliminationItem({required this.cause}) : verdict = CauseVerdict.pending;

  final ProbableCause cause;
  CauseVerdict verdict;

  /// Notatka mechanika / wynik pomiaru dołączany do raportu.
  String? note;
  DateTime? verifiedAt;

  Map<String, Object?> toJson() => {
        'causeId': cause.id,
        'verdict': verdict.name,
        if (note != null) 'note': note,
        if (verifiedAt != null)
          'verifiedAt': verifiedAt!.toUtc().toIso8601String(),
      };
}

/// Interaktywna sesja diagnozy jednego kodu DTC.
///
/// Prowadzi mechanika przez przyczyny w kolejności hierarchii (najwyższa
/// waga najpierw) i pilnuje reguły biznesowej: reklamacja turbiny może
/// zostać otwarta dopiero, gdy WSZYSTKIE przyczyny zewnętrzne zostały
/// wykluczone albo któraś została potwierdzona (wtedy wiadomo, że wina
/// nie leży po stronie regenerowanej jednostki).
final class DtcDiagnosisSession {
  DtcDiagnosisSession({required this.entry, DateTime Function()? clock})
      : _clock = clock ?? DateTime.now,
        items = UnmodifiableListView(
          entry.probableCauses
              .map((c) => CauseEliminationItem(cause: c))
              .toList(growable: false),
        );

  final DtcKnowledgeEntry entry;
  final UnmodifiableListView<CauseEliminationItem> items;
  final DateTime Function() _clock;

  /// Następna przyczyna do sprawdzenia wg hierarchii (lub `null`, gdy koniec).
  CauseEliminationItem? get nextToVerify {
    for (final item in items) {
      if (item.verdict == CauseVerdict.pending) return item;
    }
    return null;
  }

  /// Zapisanie werdyktu mechanika dla przyczyny.
  Result<void, DtcEngineFailure> recordVerdict(
    String causeId,
    CauseVerdict verdict, {
    String? note,
  }) {
    if (verdict == CauseVerdict.pending) {
      return const Err(DtcEngineFailure(
          'Werdykt nie może być ustawiony z powrotem na "pending".'));
    }
    for (final item in items) {
      if (item.cause.id == causeId) {
        item
          ..verdict = verdict
          ..note = note
          ..verifiedAt = _clock();
        return const Ok(null);
      }
    }
    return Err(DtcEngineFailure(
        'Przyczyna "$causeId" nie występuje w matrycy kodu ${entry.code}.'));
  }

  /// Czy zidentyfikowano potwierdzone źródło usterki.
  ProbableCause? get confirmedRootCause {
    for (final item in items) {
      if (item.verdict == CauseVerdict.confirmed) return item.cause;
    }
    return null;
  }

  /// Reguła biznesowa Warranty Interlock:
  /// zgłoszenie reklamacji turbiny jest dopuszczalne wyłącznie, gdy każda
  /// przyczyna z matrycy została sprawdzona i WYKLUCZONA (verdict=ruledOut).
  /// Jedna potwierdzona przyczyna zewnętrzna ⇒ reklamacja bezzasadna.
  bool get turboClaimJustified =>
      items.every((i) => i.verdict == CauseVerdict.ruledOut);

  /// Postęp eliminacji ważony wagami przyczyn (0.0–1.0) — pasek postępu UI
  /// pokazuje "ile % prawdopodobieństwa zostało już pokryte diagnozą".
  double get weightedProgress {
    final total = items.fold<int>(0, (s, i) => s + i.cause.weightPct);
    if (total == 0) return 0;
    final done = items
        .where((i) => i.verdict != CauseVerdict.pending)
        .fold<int>(0, (s, i) => s + i.cause.weightPct);
    return done / total;
  }

  /// Eksport sesji do raportu gwarancyjnego.
  Map<String, Object?> toJson() => {
        'dtcCode': entry.code,
        'items': items.map((i) => i.toJson()).toList(),
        'turboClaimJustified': turboClaimJustified,
        'confirmedRootCause': confirmedRootCause?.id,
      };
}

// ---------------------------------------------------------------------------
// SILNIK — ŁADOWANIE I ZAPYTANIA
// ---------------------------------------------------------------------------

final class DtcEngineFailure extends Failure {
  const DtcEngineFailure(super.message);
}

/// Silnik wiedzy diagnostycznej: ładuje bazę JSON, indeksuje kody i tworzy
/// sesje diagnozy. Bezstanowy poza indeksem — bezpieczny do współdzielenia.
final class DtcKnowledgeEngine {
  DtcKnowledgeEngine._(this._entries, this.knowledgeBaseVersion);

  final Map<String, DtcKnowledgeEntry> _entries;

  /// Wersja załadowanej bazy (semver) — raport zapisuje ją dla audytu.
  final String knowledgeBaseVersion;

  /// Kody uznawane za związane z doładowaniem także wtedy, gdy nie mają
  /// dedykowanego wpisu w bazie — dostają priorytet i generyczną ścieżkę.
  static final RegExp _boostRelatedPattern = RegExp(
    // P0033–P0035 (WG solenoid), P004x (boost control), P023x–P024x (boost
    // sensor / WG), P0299, P0234, P25xx wybrane, P226x (boost performance).
    r'^P(003[3-5]|004[5-9]|023[4-9]|024[0-9]|0299|256[0-9]|226[0-9])$',
  );

  /// Wczytanie bazy wiedzy z JSON (asset lub payload OTA).
  static Result<DtcKnowledgeEngine, DtcEngineFailure> fromJsonString(
      String jsonString) {
    final Object? decoded;
    try {
      decoded = json.decode(jsonString);
    } on FormatException catch (e) {
      return Err(DtcEngineFailure('Niepoprawny JSON bazy wiedzy: ${e.message}'));
    }
    if (decoded is! Map<String, Object?>) {
      return const Err(DtcEngineFailure('Baza wiedzy musi być obiektem JSON.'));
    }
    final version = decoded['schemaVersion'] as String? ?? '0.0.0';
    final rawEntries = decoded['entries'];
    if (rawEntries is! List) {
      return const Err(DtcEngineFailure('Brak tablicy "entries" w bazie wiedzy.'));
    }

    final entries = <String, DtcKnowledgeEntry>{};
    for (final raw in rawEntries) {
      if (raw is! Map<String, Object?>) continue;
      final DtcKnowledgeEntry entry;
      try {
        entry = DtcKnowledgeEntry.fromJson(raw);
      } catch (e) {
        return Err(DtcEngineFailure(
            'Uszkodzony wpis bazy wiedzy (${raw['code']}): $e'));
      }
      // Walidacja inwariantu: wagi przyczyn muszą sumować się do 100 —
      // chroni przed literówką w edycji bazy, która wypaczyłaby matrycę.
      final weightSum =
          entry.probableCauses.fold<int>(0, (s, c) => s + c.weightPct);
      if (weightSum != 100) {
        return Err(DtcEngineFailure(
            'Wagi przyczyn dla ${entry.code} sumują się do $weightSum ≠ 100.'));
      }
      entries[entry.code.toUpperCase()] = entry;
    }
    if (entries.isEmpty) {
      return const Err(DtcEngineFailure('Baza wiedzy nie zawiera żadnych wpisów.'));
    }
    return Ok(DtcKnowledgeEngine._(entries, version));
  }

  /// Czy kod dotyczy układu doładowania (wpis dedykowany lub wzorzec zakresu).
  bool isBoostRelated(String dtcCode) {
    final code = dtcCode.toUpperCase();
    return _entries.containsKey(code) || _boostRelatedPattern.hasMatch(code);
  }

  /// Wpis wiedzy dla kodu lub `null`, gdy kod nie ma dedykowanej matrycy.
  DtcKnowledgeEntry? lookup(String dtcCode) =>
      _entries[dtcCode.toUpperCase()];

  /// Priorytetyzacja surowej listy kodów z ECU: kody doładowania na górze
  /// (critical → info), wewnątrz priorytetu — kolejność alfabetyczna.
  List<PrioritizedDtc> prioritize(Iterable<String> rawCodes) {
    final result = rawCodes.map((code) {
      final normalized = code.toUpperCase();
      final entry = _entries[normalized];
      final priority = entry?.priority ??
          (_boostRelatedPattern.hasMatch(normalized)
              ? DtcPriority.high
              : DtcPriority.low);
      return PrioritizedDtc(
        code: normalized,
        priority: priority,
        boostRelated: isBoostRelated(normalized),
        hasKnowledgeEntry: entry != null,
      );
    }).toList()
      ..sort((a, b) {
        final byPriority = a.priority.index.compareTo(b.priority.index);
        return byPriority != 0 ? byPriority : a.code.compareTo(b.code);
      });
    return result;
  }

  /// Otwarcie interaktywnej sesji diagnozy dla kodu z dedykowaną matrycą.
  Result<DtcDiagnosisSession, DtcEngineFailure> startDiagnosis(String dtcCode) {
    final entry = lookup(dtcCode);
    if (entry == null) {
      return Err(DtcEngineFailure(
          'Kod $dtcCode nie ma dedykowanej matrycy przyczyn w bazie '
          'v$knowledgeBaseVersion — użyj ścieżki generycznej.'));
    }
    return Ok(DtcDiagnosisSession(entry: entry));
  }
}

/// Kod DTC po priorytetyzacji — element listy prezentowanej mechanikowi.
final class PrioritizedDtc {
  const PrioritizedDtc({
    required this.code,
    required this.priority,
    required this.boostRelated,
    required this.hasKnowledgeEntry,
  });

  final String code;
  final DtcPriority priority;
  final bool boostRelated;

  /// Czy dostępna jest pełna matryca przyczyn (przycisk "Diagnozuj" w UI).
  final bool hasKnowledgeEntry;
}
