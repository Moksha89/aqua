import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import 'local_database.dart';

class AttachmentRepository {
  AttachmentRepository(this.database, {required this.baseUrl, required this.accessToken});

  final LocalDatabase database;
  final String baseUrl;
  final String accessToken;
  final _uuid = const Uuid();

  Future<String> queuePhoto({
    required String ownerType,
    required String ownerId,
    required String path,
    required String contentType,
  }) async {
    final id = _uuid.v4();
    await database.into(database.attachmentQueue).insert(AttachmentQueueCompanion.insert(
      id: id,
      ownerType: ownerType,
      ownerId: ownerId,
      localPath: path,
      fileName: path.split('/').last,
      contentType: contentType,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    ));
    await upload(id);
    return id;
  }

  Future<void> upload(String queueId) async {
    final row = await (database.select(database.attachmentQueue)..where((item) => item.id.equals(queueId))).getSingle();
    try {
      final presign = await http.post(
        Uri.parse('$baseUrl/attachments/presign'),
        headers: {'authorization': 'Bearer $accessToken', 'content-type': 'application/json'},
        body: jsonEncode({
          'ownerType': row.ownerType,
          'ownerId': row.ownerId,
          'fileName': row.fileName,
          'contentType': row.contentType,
          'sizeBytes': await File(row.localPath).length(),
        }),
      );
      if (presign.statusCode < 200 || presign.statusCode >= 300) throw StateError(presign.body);
      final body = jsonDecode(presign.body) as Map<String, dynamic>;
      final put = await http.put(Uri.parse(body['uploadUrl'] as String), headers: {'content-type': row.contentType}, body: await File(row.localPath).readAsBytes());
      if (put.statusCode < 200 || put.statusCode >= 300) throw StateError('Photo upload failed');
      final confirm = await http.post(
        Uri.parse('$baseUrl/attachments/confirm'),
        headers: {'authorization': 'Bearer $accessToken', 'content-type': 'application/json'},
        body: jsonEncode({'attachmentId': body['attachmentId']}),
      );
      if (confirm.statusCode < 200 || confirm.statusCode >= 300) throw StateError(confirm.body);
      await (database.update(database.attachmentQueue)..where((item) => item.id.equals(queueId))).write(
        AttachmentQueueCompanion(state: const Value('UPLOADED'), attachmentId: Value(body['attachmentId'] as String)),
      );
    } catch (error) {
      await (database.update(database.attachmentQueue)..where((item) => item.id.equals(queueId))).write(
        AttachmentQueueCompanion(state: const Value('PENDING_UPLOAD'), error: Value(error.toString())),
      );
    }
  }

  Future<void> retryPending() async {
    final rows = await (database.select(database.attachmentQueue)..where((row) => row.state.equals('PENDING_UPLOAD'))).get();
    for (final row in rows) {
      await upload(row.id);
    }
  }
}
