import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import 'local_database.dart';

class SyncClient {
  SyncClient(this.database, {required this.baseUrl, this.accessToken});

  final LocalDatabase database;
  final String baseUrl;
  final String? accessToken;
  final _uuid = const Uuid();

  Future<void> enqueue({
    required String entityType,
    required String entityId,
    required String operation,
    required Map<String, Object?> payload,
  }) async {
    final id = _uuid.v4();
    await database.enqueue(SyncOutboxCompanion.insert(
      id: id,
      entityType: entityType,
      entityId: entityId,
      operation: operation,
      payloadJson: jsonEncode(payload),
      idempotencyKey: id,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    ));
  }

  Future<void> push() async {
    if (accessToken == null) return;
    final pending = await database.watchPending().first;
    for (final entry in pending) {
      try {
        final response = await http.post(
          Uri.parse('$baseUrl/sync/push'),
          headers: {'authorization': 'Bearer $accessToken', 'content-type': 'application/json'},
          body: jsonEncode({
            'id': entry.id,
            'entityType': entry.entityType,
            'entityId': entry.entityId,
            'operation': entry.operation,
            'payload': jsonDecode(entry.payloadJson),
            'idempotencyKey': entry.idempotencyKey,
          }),
        );
        if (response.statusCode >= 200 && response.statusCode < 300) {
          await database.removeOutbox(entry.id);
        } else if (response.statusCode == 409) {
          final body = jsonDecode(response.body) as Map<String, dynamic>;
          await database.recordConflict(SyncConflictsCompanion.insert(
            id: _uuid.v4(),
            entityType: entry.entityType,
            entityId: entry.entityId,
            policy: entry.entityType == 'EXPENSE' || entry.entityType == 'PAYMENT' ? 'FINANCIAL_REQUIRES_RESOLUTION' : 'OPERATIONAL_LAST_WRITE_WINS',
            localJson: entry.payloadJson,
            serverJson: jsonEncode(body['server'] ?? body),
            detectedAt: DateTime.now().millisecondsSinceEpoch,
          ));
          if (entry.entityType != 'EXPENSE' && entry.entityType != 'PAYMENT') {
            await database.removeOutbox(entry.id);
          }
        } else {
          await database.recordOutboxError(entry.id, response.body);
        }
      } catch (error) {
        await database.recordOutboxError(entry.id, error.toString());
      }
    }
  }

  Future<void> pull() async {
    if (accessToken == null) return;
    final cursor = await database.metadata('sync_cursor') ?? '0';
    final response = await http.get(
      Uri.parse('$baseUrl/sync/pull?cursor=${Uri.encodeQueryComponent(cursor)}'),
      headers: {'authorization': 'Bearer $accessToken'},
    );
    if (response.statusCode < 200 || response.statusCode >= 300) return;
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (body['cursor'] is String) await database.setMetadata('sync_cursor', body['cursor'] as String);
    // Entity materialization is deliberately isolated from transport. Conflict
    // records remain in the outbox until the user resolves them.
  }
}
