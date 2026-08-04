import 'dart:convert';
import 'package:flutter/foundation.dart';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../api/generated_api.dart';
import 'local_database.dart';
import 'sync_client.dart';

class FarmRepository {
  FarmRepository(this.database, this.sync, {required this.baseUrl});

  final LocalDatabase database;
  final SyncClient sync;
  final String baseUrl;
  final _uuid = const Uuid();

  Future<void> refreshPonds() async {
    final ponds =
        await AquaApiClient(
          baseUrl: baseUrl,
          accessToken: sync.accessToken,
        ).listPonds();
    final rows = ponds.map((pond) {
      final crop = pond.activeCrop;
      return LocalPondsCompanion.insert(
        id: pond.id,
        name: pond.name,
        code: pond.code,
        attention: Value(pond.attention.state),
        attentionReason: Value(pond.attention.reason),
        cropJson: Value(
          crop == null
              ? null
              : jsonEncode({
                'id': crop.id,
                'code': crop.code,
                'status': crop.status,
                'doc': _figureJson(crop.doc),
                'abw': _figureJson(crop.abw),
                'biomass': _figureJson(crop.biomass),
                'fcr': _figureJson(crop.fcr),
                'density': _figureJson(crop.density),
              }),
        ),
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

  Map<String, dynamic> _figureJson(OperationalFigure figure) => {
    'value': figure.value,
    'unit': figure.unit,
    'status': figure.status,
    'reason': figure.reason,
    'derivation': {
      'inputs': figure.derivation.inputs,
      'steps': figure.derivation.steps,
    },
  };

  Future<String> saveDailyEntry({
    required String pondId,
    String? cropId,
    required String kind,
    required Map<String, Object?> payload,
  }) async {
    final id = _uuid.v4();
    final pond =
        await (database.select(database.localPonds)
          ..where((row) => row.id.equals(pondId))).getSingleOrNull();
    String? resolvedCropId = cropId;
    if (resolvedCropId == null && pond?.cropJson != null) {
      final crop = jsonDecode(pond!.cropJson!);
      if (crop is Map<String, dynamic>) resolvedCropId = crop['id']?.toString();
    }
    final resolvedPayload = _payloadFor(kind, payload, pondId, resolvedCropId);
    await database.addEntry(
      DailyEntriesCompanion.insert(
        id: id,
        pondId: pondId,
        cropId: Value(resolvedCropId),
        kind: kind,
        payloadJson: jsonEncode(resolvedPayload),
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ),
    );
    await sync.enqueue(
      entityType: kind,
      entityId: id,
      operation: 'CREATE',
      payload: {
        ...resolvedPayload,
        'id': id,
        'pondId': pondId,
        'cropId': resolvedCropId,
      },
    );
    if (kind == 'FEED' && resolvedPayload['feedItemId'] == null) {
      try {
        final response = await sync.get('/masters/feed-items');
        if (response?.statusCode == 200) {
          final items = jsonDecode(response!.body);
          if (items is List &&
              items.isNotEmpty &&
              items.first is Map<String, dynamic>) {
            final withFeed = {
              ...resolvedPayload,
              'feedItemId': (items.first as Map<String, dynamic>)['id'],
            };
            await database.updateOutboxPayload(
              id,
              jsonEncode({
                ...withFeed,
                'id': id,
                'pondId': pondId,
                'cropId': resolvedCropId,
              }),
            );
          }
        }
      } catch (_) {
        // The outbox remains durable and resolves the master when connectivity returns.
      }
    }
    return id;
  }

  Map<String, Object?> _payloadFor(
    String kind,
    Map<String, Object?> payload,
    String pondId,
    String? cropId,
  ) {
    final date =
        payload['logDate'] ??
        payload['date'] ??
        DateTime.now().toIso8601String().substring(0, 10);
    final value = payload['quantityKg'] ?? payload['value'] ?? '0';
    return switch (kind) {
      'FEED' => {
        ...payload,
        'cropId': cropId,
        'logDate': date,
        'mealSlot': payload['mealSlot'] ?? 'AM',
        'quantityKg': value,
      },
      'WATER' => {
        ...payload,
        'cropId': cropId,
        'pondId': pondId,
        'readAt': payload['readAt'] ?? '${date}T00:00:00.000Z',
        'slot': payload['slot'] ?? 'AM',
        'source': payload['source'] ?? 'MANUAL',
      },
      'GROWTH' => {
        ...payload,
        'cropId': cropId,
        'sampledOn': payload['sampledOn'] ?? date,
        'doc': payload['doc'] ?? 0,
        'animalsInSample': payload['animalsInSample'] ?? 1,
        'sampleWeightG': payload['sampleWeightG'] ?? value,
        'individualWeightsG': payload['individualWeightsG'] ?? <String>[],
      },
      'MEDICINE' => {
        ...payload,
        'cropId': cropId,
        'appliedOn': payload['appliedOn'] ?? date,
        'quantity': payload['quantity'] ?? value,
      },
      'HEALTH' => {
        ...payload,
        'cropId': cropId,
        'eventDate': payload['eventDate'] ?? date,
        'doc': payload['doc'] ?? 0,
        'symptoms': payload['symptoms'] ?? <String>[],
      },
      'CHECK_TRAY' => {
        ...payload,
        'cropId': cropId,
        'readAt': payload['readAt'] ?? '${date}T00:00:00.000Z',
        'feedPlacedKg': payload['feedPlacedKg'] ?? value,
        'residualCode': payload['residualCode'] ?? 'UNKNOWN',
      },
      _ => {...payload, 'cropId': cropId},
    };
  }
}
