import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'local_database.g.dart';

class SyncOutbox extends Table {
  TextColumn get id => text()();
  TextColumn get entityType => text()();
  TextColumn get entityId => text()();
  TextColumn get operation => text()();
  TextColumn get payloadJson => text()();
  TextColumn get idempotencyKey => text()();
  IntColumn get createdAt => integer()();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  TextColumn get conflictJson => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

class SyncMetadata extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column> get primaryKey => {key};
}

class ThemeCache extends Table {
  TextColumn get businessId => text()();
  TextColumn get tokensJson => text()();
  IntColumn get cachedAt => integer()();

  @override
  Set<Column> get primaryKey => {businessId};
}

class SyncConflicts extends Table {
  TextColumn get id => text()();
  TextColumn get entityType => text()();
  TextColumn get entityId => text()();
  TextColumn get policy => text()();
  TextColumn get localJson => text()();
  TextColumn get serverJson => text()();
  IntColumn get detectedAt => integer()();
  BoolColumn get resolved => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class LocalPonds extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get code => text()();
  TextColumn get attention => text().withDefault(const Constant('GREEN'))();
  TextColumn get attentionReason => text().nullable()();
  TextColumn get cropJson => text().nullable()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

class LocalCrops extends Table {
  TextColumn get id => text()();
  TextColumn get pondId => text()();
  TextColumn get code => text()();
  TextColumn get status => text()();
  TextColumn get figuresJson => text().nullable()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

class DailyEntries extends Table {
  TextColumn get id => text()();
  TextColumn get pondId => text()();
  TextColumn get cropId => text().nullable()();
  TextColumn get kind => text()();
  TextColumn get payloadJson => text()();
  TextColumn get syncState => text().withDefault(const Constant('PENDING'))();
  TextColumn get conflictMarker => text().nullable()();
  IntColumn get createdAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

class AttachmentQueue extends Table {
  TextColumn get id => text()();
  TextColumn get ownerType => text()();
  TextColumn get ownerId => text()();
  TextColumn get localPath => text()();
  TextColumn get fileName => text()();
  TextColumn get contentType => text()();
  TextColumn get state =>
      text().withDefault(const Constant('PENDING_UPLOAD'))();
  TextColumn get attachmentId => text().nullable()();
  TextColumn get error => text().nullable()();
  IntColumn get createdAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(
  tables: [
    SyncOutbox,
    SyncMetadata,
    ThemeCache,
    SyncConflicts,
    LocalPonds,
    LocalCrops,
    DailyEntries,
    AttachmentQueue,
  ],
)
class LocalDatabase extends _$LocalDatabase {
  LocalDatabase(super.e);

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) => m.createAll(),
    onUpgrade: (m, from, to) async {
      if (from < 2) {
        await m.createTable(localPonds);
        await m.createTable(localCrops);
        await m.createTable(dailyEntries);
      }
      if (from < 3) await m.createTable(attachmentQueue);
    },
  );

  Future<void> enqueue(Insertable<SyncOutboxData> entry) =>
      into(syncOutbox).insert(entry, mode: InsertMode.insertOrReplace);

  Stream<List<SyncOutboxData>> watchPending() =>
      (select(syncOutbox)
        ..orderBy([(row) => OrderingTerm.asc(row.createdAt)])).watch();

  Future<void> removeOutbox(String id) =>
      (delete(syncOutbox)..where((row) => row.id.equals(id))).go();

  Future<void> recordOutboxError(String id, String error) async {
    await (update(syncOutbox)..where((row) => row.id.equals(id))).write(
      SyncOutboxCompanion(
        attempts: Value(
          (await (select(syncOutbox)
                    ..where((row) => row.id.equals(id))).getSingle())
                  .attempts +
              1,
        ),
        lastError: Value(error),
      ),
    );
  }

  Future<void> updateOutboxPayload(String id, String payload) =>
      (update(syncOutbox)..where((row) => row.id.equals(id))).write(
        SyncOutboxCompanion(
          payloadJson: Value(payload),
          lastError: const Value(null),
        ),
      );

  Future<void> recordConflict(Insertable<SyncConflict> conflict) =>
      into(syncConflicts).insertOnConflictUpdate(conflict);

  Stream<List<LocalPond>> watchPonds() => select(localPonds).watch();
  Future<void> replacePonds(Iterable<LocalPondsCompanion> rows) async {
    await transaction(() async {
      await delete(localPonds).go();
      await batch((batch) => batch.insertAll(localPonds, rows.toList()));
    });
  }

  Future<void> addEntry(DailyEntriesCompanion entry) =>
      into(dailyEntries).insert(entry);
  Stream<List<DailyEntry>> watchEntries() =>
      (select(dailyEntries)
        ..orderBy([(row) => OrderingTerm.desc(row.createdAt)])).watch();

  Future<DailyEntry?> latestEntry(String pondId, String kind) =>
      (select(dailyEntries)
            ..where((row) => row.pondId.equals(pondId) & row.kind.equals(kind))
            ..orderBy([(row) => OrderingTerm.desc(row.createdAt)])
            ..limit(1))
          .getSingleOrNull();

  Future<void> markEntry(String id, {required String state, String? marker}) =>
      (update(dailyEntries)..where((row) => row.id.equals(id))).write(
        DailyEntriesCompanion(
          syncState: Value(state),
          conflictMarker: Value(marker),
        ),
      );

  Future<String?> metadata(String key) async =>
      (await (select(syncMetadata)
            ..where((row) => row.key.equals(key))).getSingleOrNull())
          ?.value;

  Future<void> setMetadata(String key, String value) =>
      into(syncMetadata).insertOnConflictUpdate(
        SyncMetadataCompanion.insert(key: key, value: value),
      );

  Future<void> cacheTheme(String businessId, String tokensJson) =>
      into(themeCache).insertOnConflictUpdate(
        ThemeCacheCompanion.insert(
          businessId: businessId,
          tokensJson: tokensJson,
          cachedAt: DateTime.now().millisecondsSinceEpoch,
        ),
      );

  Future<String?> cachedTheme(String businessId) async =>
      (await (select(themeCache)..where(
            (row) => row.businessId.equals(businessId),
          )).getSingleOrNull())
          ?.tokensJson;
}

LazyDatabase openLocalDatabase() {
  return LazyDatabase(() async {
    final directory = await getApplicationDocumentsDirectory();
    final file = File(p.join(directory.path, 'aqua.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
