import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import 'local_database.dart';
import 'sync_client.dart';

class FarmRepository {
  FarmRepository(this.database, this.sync, {required this.baseUrl});

  final LocalDatabase database;
  final SyncClient sync;
  final String baseUrl;
  final _uuid = const Uuid();

  Future<void> refreshPonds() async {
    final response = await sync.get('/masters/ponds');
    if (response == null || response.statusCode < 200 || response.statusCode >= 300) return;
    final rows = (jsonDecode(response.body) as List<dynamic>).whereType<Map<String, dynamic>>().map((pond) {
      final crop = pond['activeCrop'];
      return LocalPondsCompanion.insert(
        id: pond['id'] as String,
        name: pond['name'] as String,
        code: pond['code'] as String,
        attention: Value(pond['attention'] as String? ?? 'GREEN'),
        attentionReason: Value(pond['attentionReason'] as String?),
        cropJson: Value(crop == null ? null : jsonEncode(crop)),
        updatedAt: DateTime.now().millisecondsSinceEpoch,
      );
    });
    await database.replacePonds(rows);
  }

  Future<String> saveDailyEntry({
    required String pondId,
    String? cropId,
    required String kind,
    required Map<String, Object?> payload,
  }) async {
    final id = _uuid.v4();
    await database.addEntry(DailyEntriesCompanion.insert(
      id: id,
      pondId: pondId,
      cropId: Value(cropId),
      kind: kind,
      payloadJson: jsonEncode(payload),
      createdAt: DateTime.now().millisecondsSinceEpoch,
    ));
    await sync.enqueue(entityType: kind, entityId: id, operation: 'CREATE', payload: {
      ...payload,
      'id': id,
      'pondId': pondId,
      'cropId': cropId,
    });
    return id;
  }
}
