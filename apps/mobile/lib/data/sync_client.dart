import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import 'local_database.dart';

class SyncClient {
  SyncClient(
    this.database, {
    required this.baseUrl,
    this.accessToken,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final LocalDatabase database;
  final String baseUrl;
  final String? accessToken;
  final http.Client _client;
  final _uuid = const Uuid();

  Future<http.Response?> get(String path) async {
    if (accessToken == null) return null;
    try {
      return await _client
          .get(
            Uri.parse('$baseUrl$path'),
            headers: {'authorization': 'Bearer $accessToken'},
          )
          .timeout(const Duration(seconds: 5));
    } catch (error) {
      throw StateError('GET $path failed: $error');
    }
  }

  Future<void> enqueue({
    required String entityType,
    required String entityId,
    required String operation,
    required Map<String, Object?> payload,
  }) async {
    final idempotencyKey = _uuid.v4();
    await database.enqueue(
      SyncOutboxCompanion.insert(
        id: entityId,
        entityType: entityType,
        entityId: entityId,
        operation: operation,
        payloadJson: jsonEncode(payload),
        idempotencyKey: idempotencyKey,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }

  Future<void> push() async {
    if (accessToken == null) return;
    final pending = await database.watchPending().first;
    for (final entry in pending.where(
      (item) => !(item.lastError?.startsWith('REJECTED:') ?? false),
    )) {
      try {
        final payload = Map<String, dynamic>.from(
          jsonDecode(entry.payloadJson) as Map,
        );
        if (entry.entityType == 'FEED' && payload['feedItemId'] == null) {
          final masters = await get('/masters/feed-items');
          if (masters?.statusCode == 200) {
            final items = jsonDecode(masters!.body);
            if (items is List &&
                items.isNotEmpty &&
                items.first is Map<String, dynamic>) {
              payload['feedItemId'] =
                  (items.first as Map<String, dynamic>)['id'];
              await database.updateOutboxPayload(entry.id, jsonEncode(payload));
            }
          }
        }
        final response = await _client.post(
          Uri.parse('$baseUrl/sync/push'),
          headers: {
            'authorization': 'Bearer $accessToken',
            'content-type': 'application/json',
          },
          body: jsonEncode({
            'records': [
              {
                'id': entry.id,
                'entity': _serverEntity(entry.entityType),
                'operation': entry.operation,
                'payload': payload,
                'idempotencyKey': entry.idempotencyKey,
              },
            ],
          }),
        );
        debugPrint(
          'sync push ${entry.entityId}: ${response.statusCode} ${response.body}',
        );
        if (response.statusCode >= 200 && response.statusCode < 300) {
          final body = jsonDecode(response.body) as Map<String, dynamic>;
          final receipt =
              (body['receipts'] as List<dynamic>?)?.first
                  as Map<String, dynamic>?;
          final status = receipt?['status']?.toString();
          if (status == 'conflict') {
            await database.markEntry(
              entry.entityId,
              state: 'CONFLICT',
              marker: receipt?['reason']?.toString(),
            );
            await database.recordConflict(
              SyncConflictsCompanion.insert(
                id: _uuid.v4(),
                entityType: entry.entityType,
                entityId: entry.entityId,
                policy:
                    _isFinancial(entry.entityType)
                        ? 'FINANCIAL_REQUIRES_RESOLUTION'
                        : 'OPERATIONAL_LAST_WRITE_WINS',
                localJson: entry.payloadJson,
                serverJson: jsonEncode(receipt),
                detectedAt: DateTime.now().millisecondsSinceEpoch,
              ),
            );
            if (_isFinancial(entry.entityType)) continue;
          } else if (status == 'applied' || status == 'duplicate') {
            await database.markEntry(entry.entityId, state: 'SYNCED');
            await database.removeOutbox(entry.id);
          } else if (status == 'rejected') {
            final reason =
                receipt?['reason']?.toString() ?? 'Server rejected this record';
            await database.markEntry(
              entry.entityId,
              state: 'REJECTED',
              marker: reason,
            );
            await database.recordOutboxError(entry.id, 'REJECTED: $reason');
          } else {
            await database.recordOutboxError(
              entry.id,
              'UNKNOWN_RECEIPT: ${jsonEncode(receipt)}',
            );
          }
          if (status == 'conflict' && !_isFinancial(entry.entityType)) {
            await database.removeOutbox(entry.id);
          }
        } else if (response.statusCode == 409) {
          final body = jsonDecode(response.body) as Map<String, dynamic>;
          await database.recordConflict(
            SyncConflictsCompanion.insert(
              id: _uuid.v4(),
              entityType: entry.entityType,
              entityId: entry.entityId,
              policy:
                  _isFinancial(entry.entityType)
                      ? 'FINANCIAL_REQUIRES_RESOLUTION'
                      : 'OPERATIONAL_LAST_WRITE_WINS',
              localJson: entry.payloadJson,
              serverJson: jsonEncode(body['server'] ?? body),
              detectedAt: DateTime.now().millisecondsSinceEpoch,
            ),
          );
          await database.markEntry(
            entry.entityId,
            state: 'CONFLICT',
            marker: body['reason']?.toString(),
          );
          if (!_isFinancial(entry.entityType)) {
            await database.removeOutbox(entry.id);
          }
        } else {
          await database.recordOutboxError(
            entry.id,
            'RETRYABLE: ${response.body}',
          );
        }
      } catch (error) {
        await database.recordOutboxError(entry.id, error.toString());
      }
    }
  }

  bool _isFinancial(String entityType) => {
    'EXPENSE',
    'PAYMENT',
    'HARVEST',
    'HARVEST_EVENT',
    'HARVEST_LINE',
    'ATTENDANCE',
    'MEDICINE',
  }.contains(entityType);
  String _serverEntity(String entityType) => switch (entityType) {
    'FEED' => 'feedLog',
    'GROWTH' => 'growthSample',
    'WATER' => 'waterReading',
    'MEDICINE' => 'medicineApplication',
    'HEALTH' => 'healthEvent',
    'CHECK_TRAY' => 'checkTrayReading',
    _ => entityType.toLowerCase(),
  };

  Future<void> pull() async {
    if (accessToken == null) return;
    final cursor = await database.metadata('sync_cursor') ?? '0';
    final response = await _client.get(
      Uri.parse('$baseUrl/sync/pull?since=${Uri.encodeQueryComponent(cursor)}'),
      headers: {'authorization': 'Bearer $accessToken'},
    );
    if (response.statusCode < 200 || response.statusCode >= 300) return;
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final changes = body['changes'] as List<dynamic>? ?? const [];
    for (final change in changes.whereType<Map<String, dynamic>>()) {
      final entity = change['entity']?.toString();
      final record = change['record'];
      if (record is! Map<String, dynamic>) continue;
      if (entity == 'crop') {
        await database
            .into(database.localCrops)
            .insertOnConflictUpdate(
              LocalCropsCompanion.insert(
                id: record['id'].toString(),
                pondId: record['pondId'].toString(),
                code: record['code']?.toString() ?? record['id'].toString(),
                status: record['status']?.toString() ?? 'ACTIVE',
                figuresJson: Value(jsonEncode(record)),
                updatedAt: DateTime.now().millisecondsSinceEpoch,
              ),
            );
      } else if (entity == 'feedLog' || entity == 'waterReading') {
        final id = record['id']?.toString();
        final pondId = record['pondId']?.toString() ?? '';
        if (id == null || pondId.isEmpty) continue;
        await database
            .into(database.dailyEntries)
            .insertOnConflictUpdate(
              DailyEntriesCompanion.insert(
                id: id,
                pondId: pondId,
                cropId: Value(record['cropId']?.toString()),
                kind: entity == 'feedLog' ? 'FEED' : 'WATER',
                payloadJson: jsonEncode(record),
                syncState: const Value('SYNCED'),
                createdAt: DateTime.now().millisecondsSinceEpoch,
              ),
            );
      }
    }
    if (body['cursor'] is String)
      await database.setMetadata('sync_cursor', body['cursor'] as String);
    // Entity materialization is deliberately isolated from transport. Conflict
    // records remain in the outbox until the user resolves them.
  }
}
