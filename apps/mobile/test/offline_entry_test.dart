import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:aqua_mobile/data/farm_repository.dart';
import 'package:aqua_mobile/data/local_database.dart';
import 'package:aqua_mobile/data/sync_client.dart';

void main() {
  test('daily entry is durable when the network is unavailable', () async {
    final database = LocalDatabase(NativeDatabase.memory());
    addTearDown(database.close);
    final sync = SyncClient(
      database,
      baseUrl: 'http://unreachable.invalid',
      accessToken: null,
    );
    final repository = FarmRepository(
      database,
      sync,
      baseUrl: 'http://unreachable.invalid',
    );

    final id = await repository.saveDailyEntry(
      pondId: 'pond-1',
      kind: 'FEED',
      payload: {'date': '2026-08-04', 'quantityKg': '12'},
    );

    final entry = await database.select(database.dailyEntries).getSingle();
    final outbox = await database.select(database.syncOutbox).getSingle();
    expect(entry.id, id);
    expect(entry.syncState, 'PENDING');
    expect(outbox.entityId, id);
    expect(outbox.idempotencyKey, isNot(id));
    expect(outbox.entityType, 'FEED');
  });

  test('rejected receipt remains visible and durable', () async {
    final database = LocalDatabase(NativeDatabase.memory());
    addTearDown(database.close);
    final client = MockClient(
      (request) async => http.Response(
        '{"receipts":[{"id":"entry-1","status":"rejected","reason":"Closed crops are read-only"}]}',
        201,
      ),
    );
    final sync = SyncClient(
      database,
      baseUrl: 'http://api.test',
      accessToken: 'token',
      client: client,
    );
    await database.addEntry(
      DailyEntriesCompanion.insert(
        id: 'entry-1',
        pondId: 'pond-1',
        kind: 'FEED',
        payloadJson: '{}',
        createdAt: 1,
      ),
    );
    await sync.enqueue(
      entityType: 'FEED',
      entityId: 'entry-1',
      operation: 'CREATE',
      payload: {},
    );
    await sync.push();
    final entry =
        await (database.select(database.dailyEntries)
          ..where((row) => row.id.equals('entry-1'))).getSingle();
    expect(entry.syncState, 'REJECTED');
    expect(entry.conflictMarker, contains('Closed crops'));
    expect(await database.select(database.syncOutbox).getSingle(), isNotNull);
  });

  test('pull uses since and persists the returned cursor', () async {
    String? requested;
    final database = LocalDatabase(NativeDatabase.memory());
    addTearDown(database.close);
    final client = MockClient((request) async {
      requested = request.url.queryParameters['since'];
      return http.Response(
        '{"changes":[{"entity":"crop","record":{"id":"crop-1","pondId":"pond-1","code":"C1","status":"ACTIVE"}}],"cursor":"next"}',
        200,
      );
    });
    final sync = SyncClient(
      database,
      baseUrl: 'http://api.test',
      accessToken: 'token',
      client: client,
    );
    await database.setMetadata('sync_cursor', 'old');
    await sync.pull();
    expect(requested, 'old');
    expect(await database.metadata('sync_cursor'), 'next');
    expect(
      (await database.select(database.localCrops).get()).single.id,
      'crop-1',
    );
  });
}
