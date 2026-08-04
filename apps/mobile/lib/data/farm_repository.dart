import 'dart:convert';
import 'package:flutter/foundation.dart';

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
    debugPrint('refreshPonds response=${response?.statusCode} bytes=${response?.body.length}');
    if (response == null) throw StateError('Ponds unavailable offline');
    if (response.statusCode < 200 || response.statusCode >= 300) throw StateError(response.body);
    final rows = (jsonDecode(response.body) as List<dynamic>).whereType<Map<String, dynamic>>().map((pond) {
      final crop = pond['activeCrop'];
      final attention = pond['attention'] is Map<String, dynamic>
          ? pond['attention'] as Map<String, dynamic>
          : <String, dynamic>{};
      return LocalPondsCompanion.insert(
        id: pond['id'] as String,
        name: pond['name'] as String,
        code: pond['code'] as String,
        attention: Value(attention['state']?.toString() ?? pond['attention']?.toString() ?? 'GREEN'),
        attentionReason: Value(attention['reason']?.toString() ?? pond['attentionReason']?.toString()),
        cropJson: Value(crop == null ? null : jsonEncode(crop)),
        updatedAt: DateTime.now().millisecondsSinceEpoch,
      );
    });
    try {
      await database.replacePonds(rows);
    } catch (error) {
      debugPrint('refreshPonds materialization failed: $error');
      rethrow;
    }
  }

  Future<String> saveDailyEntry({
    required String pondId,
    String? cropId,
    required String kind,
    required Map<String, Object?> payload,
  }) async {
    final id = _uuid.v4();
    final pond = await (database.select(database.localPonds)..where((row) => row.id.equals(pondId))).getSingleOrNull();
    String? resolvedCropId = cropId;
    if (resolvedCropId == null && pond?.cropJson != null) {
      final crop = jsonDecode(pond!.cropJson!);
      if (crop is Map<String, dynamic>) resolvedCropId = crop['id']?.toString();
    }
    final resolvedPayload = {...payload, 'cropId': resolvedCropId};
    if (kind == 'FEED' && resolvedPayload['feedItemId'] == null) {
      final response = await sync.get('/masters/feed-items');
      if (response?.statusCode == 200) {
        final items = jsonDecode(response!.body);
        if (items is List && items.isNotEmpty && items.first is Map<String, dynamic>) {
          resolvedPayload['feedItemId'] = (items.first as Map<String, dynamic>)['id'];
        }
      }
    }
    await database.addEntry(DailyEntriesCompanion.insert(
      id: id,
      pondId: pondId,
      cropId: Value(resolvedCropId),
      kind: kind,
      payloadJson: jsonEncode(resolvedPayload),
      createdAt: DateTime.now().millisecondsSinceEpoch,
    ));
    await sync.enqueue(entityType: kind, entityId: id, operation: 'CREATE', payload: {
      ...resolvedPayload,
      'id': id,
      'pondId': pondId,
      'cropId': resolvedCropId,
    });
    return id;
  }
}
