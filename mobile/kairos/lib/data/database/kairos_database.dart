import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import '../../core/logging/app_logger.dart';

/// Lokalna baza SQLite — jedyne miejsce, w którym cokolwiek o użytkowniku jest
/// zapisywane. Brak synchronizacji, brak kopii zapasowej w chmurze
/// (`android:allowBackup="false"` w manifeście), brak eksportu bez jego akcji.
class KairosDatabase {
  KairosDatabase._(this.db);

  static const String fileName = 'kairos.db';
  static const int schemaVersion = 1;

  static const AppLogger _log = AppLogger('database');

  final Database db;

  /// Otwiera bazę w katalogu dokumentów aplikacji i wykonuje migracje.
  static Future<KairosDatabase> open({String? overridePath}) async {
    final String path;
    if (overridePath != null) {
      path = overridePath;
    } else {
      final String directory = (await getApplicationDocumentsDirectory()).path;
      path = p.join(directory, fileName);
    }

    _log.info('Otwieram bazę: $path');

    final Database database = await openDatabase(
      path,
      version: schemaVersion,
      onConfigure: (Database db) async {
        await db.execute('PRAGMA foreign_keys = ON');
      },
      onCreate: (Database db, int version) async {
        await _createSchema(db);
        _log.info('Utworzono schemat w wersji $version');
      },
      onUpgrade: (Database db, int from, int to) async {
        _log.info('Migracja schematu $from → $to');
        await _migrate(db, from, to);
      },
    );

    return KairosDatabase._(database);
  }

  Future<void> close() => db.close();

  static Future<void> _createSchema(Database db) async {
    final Batch batch = db.batch();

    batch.execute('''
      CREATE TABLE feature_windows (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at     INTEGER NOT NULL,
        ended_at       INTEGER NOT NULL,
        sample_count   INTEGER NOT NULL,
        schema_version INTEGER NOT NULL,
        features       TEXT    NOT NULL
      )
    ''');
    batch.execute(
      'CREATE INDEX idx_feature_windows_ended_at ON feature_windows(ended_at)',
    );

    batch.execute('''
      CREATE TABLE state_readings (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        at            INTEGER NOT NULL,
        state         TEXT    NOT NULL,
        confidence    REAL    NOT NULL,
        probabilities TEXT    NOT NULL,
        settled       INTEGER NOT NULL DEFAULT 1,
        window_id     INTEGER REFERENCES feature_windows(id) ON DELETE SET NULL
      )
    ''');
    batch.execute('CREATE INDEX idx_state_readings_at ON state_readings(at)');

    batch.execute('''
      CREATE TABLE intentions (
        id          TEXT    PRIMARY KEY,
        text        TEXT    NOT NULL,
        created_at  INTEGER NOT NULL,
        archived_at INTEGER
      )
    ''');
    batch.execute(
      'CREATE INDEX idx_intentions_archived ON intentions(archived_at, created_at)',
    );

    batch.execute('''
      CREATE TABLE interventions (
        id           TEXT    PRIMARY KEY,
        at           INTEGER NOT NULL,
        state        TEXT    NOT NULL,
        confidence   REAL    NOT NULL,
        message      TEXT    NOT NULL,
        source       TEXT    NOT NULL,
        features     TEXT    NOT NULL,
        intention_id TEXT    REFERENCES intentions(id) ON DELETE SET NULL,
        feedback     TEXT,
        feedback_at  INTEGER
      )
    ''');
    batch.execute('CREATE INDEX idx_interventions_at ON interventions(at)');

    batch.execute('''
      CREATE TABLE model_state (
        id             INTEGER PRIMARY KEY CHECK (id = 1),
        schema_version INTEGER NOT NULL,
        weights        TEXT    NOT NULL,
        updated_at     INTEGER NOT NULL
      )
    ''');

    await batch.commit(noResult: true);
  }

  /// Migracje przyrostowe. Każda wersja dokłada własny blok — nigdy nie
  /// modyfikujemy bloków już wydanych.
  static Future<void> _migrate(Database db, int from, int to) async {
    // Wersja 1 jest wersją początkową — brak ścieżek migracji.
    // Przykład dla przyszłych wydań:
    // if (from < 2) {
    //   await db.execute('ALTER TABLE interventions ADD COLUMN dismissals INTEGER NOT NULL DEFAULT 0');
    // }
  }

  /// Higiena danych: surowe okna cech żyją krótko, odczyty stanu dłużej,
  /// interwencje zostają (to na nich uczy się polityka).
  Future<void> applyRetentionPolicy({
    Duration featureWindowRetention = const Duration(days: 14),
    Duration readingRetention = const Duration(days: 60),
    DateTime? now,
  }) async {
    final DateTime reference = now ?? DateTime.now();
    final int windowCutoff =
        reference.subtract(featureWindowRetention).millisecondsSinceEpoch;
    final int readingCutoff =
        reference.subtract(readingRetention).millisecondsSinceEpoch;

    final int readings = await db.delete(
      'state_readings',
      where: 'at < ?',
      whereArgs: <Object?>[readingCutoff],
    );
    final int windows = await db.delete(
      'feature_windows',
      where: 'ended_at < ?',
      whereArgs: <Object?>[windowCutoff],
    );

    if (readings > 0 || windows > 0) {
      _log.info('Retencja: usunięto $readings odczytów i $windows okien');
    }
  }

  /// Trwałe usunięcie wszystkich danych użytkownika (ustawienia → „Wyczyść”).
  Future<void> wipeAll() async {
    await db.transaction((Transaction txn) async {
      await txn.delete('interventions');
      await txn.delete('intentions');
      await txn.delete('state_readings');
      await txn.delete('feature_windows');
      await txn.delete('model_state');
    });
    _log.warning('Wyczyszczono wszystkie dane lokalne na żądanie użytkownika');
  }
}
