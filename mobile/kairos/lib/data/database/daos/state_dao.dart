import 'dart:convert';

import 'package:sqflite/sqflite.dart';

import '../../../core/math/signal_features.dart';
import '../../../features/flow_state/domain/entities/flow_state.dart';
import '../../../features/flow_state/domain/entities/state_reading.dart';

/// Dostęp do tabeli `state_readings` wraz z agregatami dla ekranu „Wgląd”.
class StateDao {
  const StateDao(this._db);

  final Database _db;

  static const String table = 'state_readings';

  Future<int> insert(StateReading reading) {
    return _db.insert(table, <String, Object?>{
      'at': reading.at.millisecondsSinceEpoch,
      'state': reading.state.id,
      'confidence': reading.confidence,
      'probabilities': jsonEncode(reading.probabilities),
      'settled': reading.isSettled ? 1 : 0,
      'window_id': reading.windowId,
    });
  }

  Future<StateReading?> latest() async {
    final List<StateReading> readings = await _query(
      where: null,
      whereArgs: null,
      limit: 1,
    );
    return readings.isEmpty ? null : readings.first;
  }

  /// Odczyty od podanej chwili, posortowane rosnąco (najstarszy pierwszy).
  Future<List<StateReading>> since(DateTime moment, {int limit = 3000}) async {
    final List<StateReading> readings = await _query(
      where: 'r.at >= ?',
      whereArgs: <Object?>[moment.millisecondsSinceEpoch],
      limit: limit,
    );
    return readings.reversed.toList(growable: false);
  }

  /// Ile czasu (w oknach) spędzono w każdym ze stanów od podanej chwili.
  Future<Map<FlowState, int>> countsSince(DateTime moment) async {
    final List<Map<String, Object?>> rows = await _db.rawQuery(
      'SELECT state, COUNT(*) AS c FROM $table WHERE at >= ? GROUP BY state',
      <Object?>[moment.millisecondsSinceEpoch],
    );

    final Map<FlowState, int> result = <FlowState, int>{
      for (final FlowState state in FlowState.values) state: 0,
    };
    for (final Map<String, Object?> row in rows) {
      final FlowState state = FlowState.fromId(row['state']! as String);
      result[state] = (row['c'] as int?) ?? 0;
    }
    return result;
  }

  /// Liczba odczytów danego stanu w kolejnych dobach — dane do wykresu 7 dni.
  Future<Map<DateTime, Map<FlowState, int>>> dailyCounts({
    required DateTime since,
  }) async {
    final List<Map<String, Object?>> rows = await _db.rawQuery(
      'SELECT at, state FROM $table WHERE at >= ? ORDER BY at ASC',
      <Object?>[since.millisecondsSinceEpoch],
    );

    final Map<DateTime, Map<FlowState, int>> result =
        <DateTime, Map<FlowState, int>>{};
    for (final Map<String, Object?> row in rows) {
      final DateTime at = DateTime.fromMillisecondsSinceEpoch(row['at']! as int);
      final DateTime day = DateTime(at.year, at.month, at.day);
      final FlowState state = FlowState.fromId(row['state']! as String);
      final Map<FlowState, int> bucket = result.putIfAbsent(
        day,
        () => <FlowState, int>{for (final FlowState s in FlowState.values) s: 0},
      );
      bucket[state] = (bucket[state] ?? 0) + 1;
    }
    return result;
  }

  Future<List<StateReading>> _query({
    required String? where,
    required List<Object?>? whereArgs,
    required int limit,
  }) async {
    final List<Map<String, Object?>> rows = await _db.rawQuery(
      '''
      SELECT r.id, r.at, r.state, r.confidence, r.probabilities, r.settled,
             r.window_id, w.features AS features, w.schema_version AS schema_version
      FROM $table AS r
      LEFT JOIN feature_windows AS w ON w.id = r.window_id
      ${where == null ? '' : 'WHERE $where'}
      ORDER BY r.at DESC
      LIMIT ?
      ''',
      <Object?>[...?whereArgs, limit],
    );

    return rows.map(_map).toList(growable: false);
  }

  static StateReading _map(Map<String, Object?> row) {
    final Object? rawProbabilities = jsonDecode(row['probabilities']! as String);
    final List<double> probabilities = rawProbabilities is List
        ? rawProbabilities
              .map((Object? value) => value is num ? value.toDouble() : 0.0)
              .toList(growable: false)
        : List<double>.filled(FlowState.values.length, 0);

    final Object? features = row['features'];
    final int storedSchema = (row['schema_version'] as int?) ?? -1;

    return StateReading(
      id: row['id'] as int?,
      at: DateTime.fromMillisecondsSinceEpoch(row['at']! as int),
      state: FlowState.fromId(row['state']! as String),
      confidence: (row['confidence'] as num?)?.toDouble() ?? 0,
      probabilities: probabilities,
      features: features is String && storedSchema == FeatureVector.schemaVersion
          ? FeatureVector.fromJson(features)
          : FeatureVector.empty(),
      windowId: row['window_id'] as int?,
      isSettled: ((row['settled'] as int?) ?? 1) == 1,
    );
  }
}
