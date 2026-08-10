import 'package:sqflite/sqflite.dart';

import '../../../core/math/signal_features.dart';
import '../../../features/flow_state/domain/entities/flow_state.dart';
import '../../../features/intervention/domain/entities/intention.dart';
import '../../../features/intervention/domain/entities/intervention.dart';

/// Dostęp do tabel `interventions` i `intentions`.
class InterventionDao {
  const InterventionDao(this._db);

  final Database _db;

  static const String interventionsTable = 'interventions';
  static const String intentionsTable = 'intentions';

  // ── Interwencje ──────────────────────────────────────────────────────────

  Future<void> insert(Intervention intervention) async {
    await _db.insert(interventionsTable, <String, Object?>{
      'id': intervention.id,
      'at': intervention.at.millisecondsSinceEpoch,
      'state': intervention.state.id,
      'confidence': intervention.confidence,
      'message': intervention.message,
      'source': intervention.source.id,
      'features': intervention.features.toJson(),
      'intention_id': intervention.intentionId,
      'feedback': intervention.feedback?.id,
      'feedback_at': intervention.feedbackAt?.millisecondsSinceEpoch,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<int> saveFeedback({
    required String id,
    required InterventionFeedback feedback,
    required DateTime at,
  }) {
    return _db.update(
      interventionsTable,
      <String, Object?>{
        'feedback': feedback.id,
        'feedback_at': at.millisecondsSinceEpoch,
      },
      where: 'id = ?',
      whereArgs: <Object?>[id],
    );
  }

  Future<Intervention?> byId(String id) async {
    final List<Intervention> rows = await _select(
      where: 'i.id = ?',
      whereArgs: <Object?>[id],
      limit: 1,
    );
    return rows.isEmpty ? null : rows.first;
  }

  Future<List<Intervention>> recent({int limit = 50}) =>
      _select(where: null, whereArgs: null, limit: limit);

  Future<Intervention?> last() async {
    final List<Intervention> rows = await _select(
      where: null,
      whereArgs: null,
      limit: 1,
    );
    return rows.isEmpty ? null : rows.first;
  }

  Future<int> countSince(DateTime moment) async {
    final List<Map<String, Object?>> rows = await _db.rawQuery(
      'SELECT COUNT(*) AS c FROM $interventionsTable WHERE at >= ?',
      <Object?>[moment.millisecondsSinceEpoch],
    );
    return (rows.first['c'] as int?) ?? 0;
  }

  /// Ostatnie użyte zdania — silnik kompozycyjny unika powtórzeń.
  Future<List<String>> recentMessages({int limit = 12}) async {
    final List<Map<String, Object?>> rows = await _db.query(
      interventionsTable,
      columns: <String>['message'],
      orderBy: 'at DESC',
      limit: limit,
    );
    return rows
        .map((Map<String, Object?> row) => row['message']! as String)
        .toList(growable: false);
  }

  Future<InterventionStats> stats({required DateTime since}) async {
    final List<Map<String, Object?>> rows = await _db.rawQuery(
      '''
      SELECT feedback, COUNT(*) AS c
      FROM $interventionsTable
      WHERE at >= ?
      GROUP BY feedback
      ''',
      <Object?>[since.millisecondsSinceEpoch],
    );

    int total = 0;
    int helped = 0;
    int notNow = 0;
    int wrongMoment = 0;
    int ignored = 0;

    for (final Map<String, Object?> row in rows) {
      final int count = (row['c'] as int?) ?? 0;
      total += count;
      final Object? feedback = row['feedback'];
      if (feedback is! String) {
        ignored += count;
        continue;
      }
      switch (InterventionFeedback.fromId(feedback)) {
        case InterventionFeedback.helped:
          helped += count;
        case InterventionFeedback.notNow:
          notNow += count;
        case InterventionFeedback.wrongMoment:
          wrongMoment += count;
        case InterventionFeedback.ignored:
          ignored += count;
      }
    }

    return InterventionStats(
      total: total,
      helped: helped,
      notNow: notNow,
      wrongMoment: wrongMoment,
      ignored: ignored,
    );
  }

  // ── Zamiary ──────────────────────────────────────────────────────────────

  Future<void> insertIntention(Intention intention) async {
    await _db.insert(intentionsTable, <String, Object?>{
      'id': intention.id,
      'text': intention.text,
      'created_at': intention.createdAt.millisecondsSinceEpoch,
      'archived_at': intention.archivedAt?.millisecondsSinceEpoch,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<Intention?> activeIntention() async {
    final List<Map<String, Object?>> rows = await _db.query(
      intentionsTable,
      where: 'archived_at IS NULL',
      orderBy: 'created_at DESC',
      limit: 1,
    );
    return rows.isEmpty ? null : _mapIntention(rows.first);
  }

  Future<List<Intention>> intentionHistory({int limit = 20}) async {
    final List<Map<String, Object?>> rows = await _db.query(
      intentionsTable,
      orderBy: 'created_at DESC',
      limit: limit,
    );
    return rows.map(_mapIntention).toList(growable: false);
  }

  Future<void> archiveAllIntentions(DateTime at) async {
    await _db.update(
      intentionsTable,
      <String, Object?>{'archived_at': at.millisecondsSinceEpoch},
      where: 'archived_at IS NULL',
    );
  }

  // ── Wspólne ──────────────────────────────────────────────────────────────

  Future<List<Intervention>> _select({
    required String? where,
    required List<Object?>? whereArgs,
    required int limit,
  }) async {
    final List<Map<String, Object?>> rows = await _db.rawQuery(
      '''
      SELECT i.*, n.text AS intention_text
      FROM $interventionsTable AS i
      LEFT JOIN $intentionsTable AS n ON n.id = i.intention_id
      ${where == null ? '' : 'WHERE $where'}
      ORDER BY i.at DESC
      LIMIT ?
      ''',
      <Object?>[...?whereArgs, limit],
    );
    return rows.map(_mapIntervention).toList(growable: false);
  }

  static Intervention _mapIntervention(Map<String, Object?> row) {
    final Object? feedback = row['feedback'];
    final Object? feedbackAt = row['feedback_at'];

    return Intervention(
      id: row['id']! as String,
      at: DateTime.fromMillisecondsSinceEpoch(row['at']! as int),
      state: FlowState.fromId(row['state']! as String),
      confidence: (row['confidence'] as num?)?.toDouble() ?? 0,
      message: row['message']! as String,
      source: InterventionSource.fromId(row['source']! as String),
      features: FeatureVector.fromJson(row['features']! as String),
      intentionId: row['intention_id'] as String?,
      intentionText: row['intention_text'] as String?,
      feedback: feedback is String
          ? InterventionFeedback.fromId(feedback)
          : null,
      feedbackAt: feedbackAt is int
          ? DateTime.fromMillisecondsSinceEpoch(feedbackAt)
          : null,
    );
  }

  static Intention _mapIntention(Map<String, Object?> row) {
    final Object? archivedAt = row['archived_at'];
    return Intention(
      id: row['id']! as String,
      text: row['text']! as String,
      createdAt: DateTime.fromMillisecondsSinceEpoch(row['created_at']! as int),
      archivedAt: archivedAt is int
          ? DateTime.fromMillisecondsSinceEpoch(archivedAt)
          : null,
    );
  }
}
