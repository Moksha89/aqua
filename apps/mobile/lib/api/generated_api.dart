// GENERATED CODE - DO NOT MODIFY BY HAND.
// Source: /api/docs-json (OpenAPI 3.0)

import 'dart:convert';
import 'package:http/http.dart' as http;

class FigureDerivation {
  const FigureDerivation({required this.inputs, required this.steps});
  final List<String> inputs;
  final List<String> steps;
  factory FigureDerivation.fromJson(Map<String, dynamic> json) =>
      FigureDerivation(
        inputs: [
          for (final value
              in (json['inputs'] as List<dynamic>? ?? const <dynamic>[]))
            value.toString(),
        ],
        steps: [
          for (final value
              in (json['steps'] as List<dynamic>? ?? const <dynamic>[]))
            value.toString(),
        ],
      );
}

class OperationalFigure {
  const OperationalFigure({
    this.value,
    required this.unit,
    required this.status,
    this.reason,
    required this.derivation,
  });
  final String? value;
  final String unit;
  final String status;
  final String? reason;
  final FigureDerivation derivation;
  factory OperationalFigure.fromJson(Map<String, dynamic> json) =>
      OperationalFigure(
        value: json['value']?.toString(),
        unit: json['unit']?.toString() ?? '',
        status: json['status']?.toString() ?? 'NOT_DETERMINABLE',
        reason: json['reason']?.toString(),
        derivation: FigureDerivation.fromJson(
          (json['derivation'] as Map?)?.cast<String, dynamic>() ?? const {},
        ),
      );
}

class ActiveCrop {
  const ActiveCrop({
    required this.id,
    required this.code,
    required this.status,
    required this.doc,
    required this.abw,
    required this.biomass,
    required this.fcr,
    required this.density,
  });
  final String id;
  final String code;
  final String status;
  final OperationalFigure doc;
  final OperationalFigure abw;
  final OperationalFigure biomass;
  final OperationalFigure fcr;
  final OperationalFigure density;
  factory ActiveCrop.fromJson(Map<String, dynamic> json) => ActiveCrop(
    id: json['id'].toString(),
    code: json['code'].toString(),
    status: json['status'].toString(),
    doc: OperationalFigure.fromJson(
      (json['doc'] as Map).cast<String, dynamic>(),
    ),
    abw: OperationalFigure.fromJson(
      (json['abw'] as Map).cast<String, dynamic>(),
    ),
    biomass: OperationalFigure.fromJson(
      (json['biomass'] as Map).cast<String, dynamic>(),
    ),
    fcr: OperationalFigure.fromJson(
      (json['fcr'] as Map).cast<String, dynamic>(),
    ),
    density: OperationalFigure.fromJson(
      (json['density'] as Map).cast<String, dynamic>(),
    ),
  );
}

class PondAttention {
  const PondAttention({
    required this.state,
    required this.reason,
    required this.signals,
  });
  final String state;
  final String reason;
  final List<String> signals;
  factory PondAttention.fromJson(Map<String, dynamic> json) => PondAttention(
    state: json['state'].toString(),
    reason: json['reason'].toString(),
    signals: [
      for (final value
          in (json['signals'] as List<dynamic>? ?? const <dynamic>[]))
        value.toString(),
    ],
  );
}

class PondListItem {
  const PondListItem({
    required this.id,
    required this.businessId,
    required this.farmId,
    required this.code,
    required this.name,
    required this.extentAcres,
    required this.status,
    required this.attention,
    this.activeCrop,
  });
  final String id;
  final String businessId;
  final String farmId;
  final String code;
  final String name;
  final String extentAcres;
  final String status;
  final PondAttention attention;
  final ActiveCrop? activeCrop;
  factory PondListItem.fromJson(Map<String, dynamic> json) => PondListItem(
    id: json['id'].toString(),
    businessId: json['businessId'].toString(),
    farmId: json['farmId'].toString(),
    code: json['code'].toString(),
    name: json['name'].toString(),
    extentAcres: json['extentAcres'].toString(),
    status: json['status'].toString(),
    attention: PondAttention.fromJson(
      (json['attention'] as Map).cast<String, dynamic>(),
    ),
    activeCrop:
        json['activeCrop'] is Map
            ? ActiveCrop.fromJson(
              (json['activeCrop'] as Map).cast<String, dynamic>(),
            )
            : null,
  );
}

class SyncChange {
  const SyncChange({required this.entity, required this.record});
  final String entity;
  final Map<String, dynamic> record;
  factory SyncChange.fromJson(Map<String, dynamic> json) => SyncChange(
    entity: json['entity'].toString(),
    record: (json['record'] as Map).cast<String, dynamic>(),
  );
}

class SyncPullResponse {
  const SyncPullResponse({
    required this.snapshot,
    required this.cursor,
    required this.hasMore,
    required this.changes,
    this.theme,
  });
  final String snapshot;
  final String cursor;
  final bool hasMore;
  final List<SyncChange> changes;
  final Map<String, dynamic>? theme;
  factory SyncPullResponse.fromJson(Map<String, dynamic> json) =>
      SyncPullResponse(
        snapshot: json['snapshot'].toString(),
        cursor: json['cursor'].toString(),
        hasMore: json['hasMore'] == true,
        changes: [
          for (final value
              in (json['changes'] as List<dynamic>? ?? const <dynamic>[]))
            SyncChange.fromJson((value as Map).cast<String, dynamic>()),
        ],
        theme:
            json['theme'] is Map
                ? (json['theme'] as Map).cast<String, dynamic>()
                : null,
      );
}

class FeedItemOption {
  const FeedItemOption({
    required this.id,
    required this.name,
    required this.code,
  });
  final String id;
  final String name;
  final String code;
  factory FeedItemOption.fromJson(Map<String, dynamic> json) => FeedItemOption(
    id: json['id'].toString(),
    name: json['name'].toString(),
    code: json['code'].toString(),
  );
}

class AquaApiClient {
  AquaApiClient({
    required this.baseUrl,
    required this.accessToken,
    http.Client? client,
  }) : client = client ?? http.Client();
  final String baseUrl;
  final String? accessToken;
  final http.Client client;
  Map<String, String> get _headers => {'authorization': 'Bearer $accessToken'};

  Future<List<PondListItem>> listPonds() async {
    final response = await client.get(
      Uri.parse('$baseUrl/masters/ponds'),
      headers: _headers,
    );
    _ensureSuccess(response);
    return [
      for (final value in (jsonDecode(response.body) as List<dynamic>))
        PondListItem.fromJson((value as Map).cast<String, dynamic>()),
    ];
  }

  Future<List<FeedItemOption>> listFeedItems() async {
    final response = await client.get(
      Uri.parse('$baseUrl/masters/feed-items'),
      headers: _headers,
    );
    _ensureSuccess(response);
    return [
      for (final value in (jsonDecode(response.body) as List<dynamic>))
        FeedItemOption.fromJson((value as Map).cast<String, dynamic>()),
    ];
  }

  Future<SyncPullResponse> pull({required String since}) async {
    final response = await client.get(
      Uri.parse('$baseUrl/sync/pull?since=${Uri.encodeQueryComponent(since)}'),
      headers: _headers,
    );
    _ensureSuccess(response);
    return SyncPullResponse.fromJson(
      (jsonDecode(response.body) as Map).cast<String, dynamic>(),
    );
  }

  void _ensureSuccess(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError('API ${response.statusCode}: ${response.body}');
    }
  }
}
