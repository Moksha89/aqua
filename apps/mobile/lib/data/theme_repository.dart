import 'dart:convert';

import 'package:http/http.dart' as http;

import 'local_database.dart';

class ThemeRepository {
  ThemeRepository(this.database, {required this.baseUrl, this.accessToken});

  final LocalDatabase database;
  final String baseUrl;
  final String? accessToken;

  Future<Map<String, dynamic>> load(String businessId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/theme'),
        headers: {'authorization': 'Bearer $accessToken'},
      );
      if (response.statusCode >= 200 && response.statusCode < 300) {
        await database.cacheTheme(businessId, response.body);
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {
      // Offline use falls through to the last server-provided theme.
    }
    final cached = await database.cachedTheme(businessId);
    return cached == null ? <String, dynamic>{} : jsonDecode(cached) as Map<String, dynamic>;
  }
}
