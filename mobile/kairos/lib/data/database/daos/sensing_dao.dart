import 'package:sqflite/sqflite.dart';

import '../../../core/math/signal_features.dart';
import '../../../features/sensing/domain/entities/feature_window.dart';

/// Dostęp do tabeli `feature_windows`.
class SensingDao {
  const SensingDao(this._db);

  final Database _db;

  static const String table = 'feature_windows';

  Future<int> insertWindow(FeatureWindow window) {
    return _db.insert(table, <String, Object?>{
      'started_at': window.start.millisecondsSinceEpoch,
      'ended_at': window.end.millisecondsSinceEpoch,
      'sample_count': window.sampleCount,
      'schema_version': FeatureVector.schemaVersion,
      'features': window.features.toJson(),
    });
  }

  Future<FeatureWindow?> byId(int id) async {
    final List<Map<String, Object?>> rows = await _db.query(
      table,
      where: 'id = ?',
      whereArgs: <Object?>[id],
      limit: 1,
    );
    if (rows.isEmpty) {
      return null;
    }
    return _map(rows.first);
  }

  Future<List<FeatureWindow>> recent({int limit = 60}) async {
    final List<Map<String, Object?>> rows = await _db.query(
      table,
      orderBy: 'ended_at DESC',
      limit: limit,
    );
    return rows.map(_map).toList(growable: false).reversed.toList(growable: false);
  }

  Future<int> countSince(DateTime since) async {
    final List<Map<String, Object?>> rows = await _db.rawQuery(
      'SELECT COUNT(*) AS c FROM $table WHERE ended_at >= ?',
      <Object?>[since.millisecondsSinceEpoch],
    );
    return (rows.first['c'] as int?) ?? 0;
  }

  static FeatureWindow _map(Map<String, Object?> row) {
    final int storedSchema = (row['schema_version'] as int?) ?? 0;
    return FeatureWindow(
      id: row['id'] as int?,
      start: DateTime.fromMillisecondsSinceEpoch(row['started_at']! as int),
      end: DateTime.fromMillisecondsSinceEpoch(row['ended_at']! as int),
      sampleCount: (row['sample_count'] as int?) ?? 0,
      features: storedSchema == FeatureVector.schemaVersion
          ? FeatureVector.fromJson(row['features']! as String)
          : FeatureVector.empty(),
    );
  }
}
