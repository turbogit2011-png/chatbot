import 'package:sqflite/sqflite.dart';

import '../../../core/logging/app_logger.dart';
import '../../../core/math/logistic_regression.dart';
import '../../../core/math/signal_features.dart';

/// Trwałość osobistego modelu użytkownika.
///
/// Wagi są zapisywane razem z wersją schematu cech. Gdy schemat się zmieni,
/// stare wagi przestają cokolwiek znaczyć — wtedy świadomie je odrzucamy
/// i wracamy do wag priorytetowych, zamiast po cichu psuć predykcje.
class ModelDao {
  const ModelDao(this._db);

  final Database _db;

  static const String table = 'model_state';
  static const AppLogger _log = AppLogger('model-dao');

  Future<SoftmaxClassifier?> load() async {
    final List<Map<String, Object?>> rows = await _db.query(
      table,
      where: 'id = 1',
      limit: 1,
    );
    if (rows.isEmpty) {
      return null;
    }

    final Map<String, Object?> row = rows.first;
    final int storedSchema = (row['schema_version'] as int?) ?? -1;
    if (storedSchema != FeatureVector.schemaVersion) {
      _log.warning(
        'Zapisany model ma schemat $storedSchema, oczekiwano '
        '${FeatureVector.schemaVersion} — wracam do wag startowych',
      );
      return null;
    }

    try {
      final SoftmaxClassifier model = SoftmaxClassifier.decode(
        row['weights']! as String,
      );
      if (model.featureCount != FeatureVector.length) {
        _log.warning('Niezgodna liczba cech w zapisanym modelu — odrzucam');
        return null;
      }
      return model;
    } on FormatException catch (error, stackTrace) {
      _log.error('Nie udało się odczytać modelu', error, stackTrace);
      return null;
    }
  }

  Future<void> save(SoftmaxClassifier model, {required DateTime at}) async {
    await _db.insert(table, <String, Object?>{
      'id': 1,
      'schema_version': FeatureVector.schemaVersion,
      'weights': model.encode(),
      'updated_at': at.millisecondsSinceEpoch,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> reset() async {
    await _db.delete(table, where: 'id = 1');
    _log.info('Zresetowano osobisty model do wag startowych');
  }
}
