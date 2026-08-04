import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:aqua_mobile/data/farm_repository.dart';
import 'package:aqua_mobile/data/local_database.dart';
import 'package:aqua_mobile/data/sync_client.dart';

void main() {
  test('daily entry is durable when the network is unavailable', () async {
    final database = LocalDatabase(NativeDatabase.memory());
    addTearDown(database.close);
    final sync = SyncClient(database, baseUrl: 'http://unreachable.invalid', accessToken: null);
    final repository = FarmRepository(database, sync, baseUrl: 'http://unreachable.invalid');

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
}
