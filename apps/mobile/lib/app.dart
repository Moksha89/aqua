import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import 'data/farm_repository.dart';
import 'data/local_database.dart';
import 'data/sync_client.dart';
import 'data/theme_repository.dart';

const apiBaseUrl = String.fromEnvironment('AQUA_API_URL', defaultValue: 'http://10.0.2.2:3000/api/v1');

final databaseProvider = Provider<LocalDatabase>((ref) {
  final database = LocalDatabase(openLocalDatabase());
  ref.onDispose(database.close);
  return database;
});

final appStateProvider = ChangeNotifierProvider<AppState>((ref) {
  final state = AppState(ref.read(databaseProvider));
  return state;
});

final routerProvider = Provider<GoRouter>((ref) {
  final app = ref.watch(appStateProvider);
  return GoRouter(
    refreshListenable: app,
    redirect: (_, state) {
      if (!app.verified) return state.matchedLocation == '/login' ? null : '/login';
      if (app.businessId == null) return state.matchedLocation == '/business' ? null : '/business';
      return state.matchedLocation == '/login' || state.matchedLocation == '/business' ? '/' : null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/business', builder: (_, __) => const BusinessScreen()),
      GoRoute(path: '/', builder: (_, __) => const ShellScreen()),
    ],
  );
});

class AppState extends ChangeNotifier {
  AppState(this.database);
  final LocalDatabase database;
  String? accessToken;
  String? refreshToken;
  String? businessId;
  String? role;
  bool financialAccess = false;
  ColorScheme colorScheme = const ColorScheme.light();
  String? mobile;
  bool get authenticated => accessToken != null && businessId != null;
  bool get verified => accessToken != null;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    accessToken = prefs.getString('access_token');
    refreshToken = prefs.getString('refresh_token');
    businessId = prefs.getString('business_id');
    role = prefs.getString('role');
    financialAccess = prefs.getBool('financial_access') ?? false;
    if (businessId != null && accessToken != null) {
      final theme = await ThemeRepository(database, baseUrl: apiBaseUrl, accessToken: accessToken).load(businessId!);
      colorScheme = _themeScheme(theme);
    }
    notifyListeners();
  }

  Future<Map<String, dynamic>> requestOtp(String value) async {
    mobile = value;
    return _json(await http.post(Uri.parse('$apiBaseUrl/auth/otp/request'), headers: {'content-type': 'application/json'}, body: jsonEncode({'mobile': value})));
  }

  Future<void> verifyOtp(String value, String code) async {
    final body = await _json(await http.post(Uri.parse('$apiBaseUrl/auth/otp/verify'), headers: {'content-type': 'application/json'}, body: jsonEncode({'mobile': value, 'code': code, 'deviceId': const Uuid().v4()})));
    accessToken = body['accessToken'] as String;
    refreshToken = body['refreshToken'] as String;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', accessToken!);
    await prefs.setString('refresh_token', refreshToken!);
    notifyListeners();
  }

  Future<void> switchBusiness(String id) async {
    final body = await _json(await http.post(Uri.parse('$apiBaseUrl/auth/business/switch'), headers: _headers, body: jsonEncode({'businessId': id})));
    businessId = body['businessId'] as String;
    role = body['role'] as String;
    financialAccess = body['financialAccess'] == true;
    accessToken = body['accessToken'] as String;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('business_id', businessId!);
    await prefs.setString('role', role!);
    await prefs.setBool('financial_access', financialAccess);
    await prefs.setString('access_token', accessToken!);
    colorScheme = _themeScheme(await ThemeRepository(database, baseUrl: apiBaseUrl, accessToken: accessToken).load(businessId!));
    notifyListeners();
  }

  ColorScheme _themeScheme(Map<String, dynamic> theme) {
    final source = theme['tokens'] is Map<String, dynamic> ? theme['tokens'] as Map<String, dynamic> : theme;
    Color? color(String key) {
      final value = source[key];
      if (value is! String) return null;
      final hex = value.replaceFirst('#', '');
      if (hex.length != 6 && hex.length != 8) return null;
      final normalized = hex.length == 6 ? 'FF$hex' : hex;
      return Color(int.tryParse(normalized, radix: 16) ?? 0);
    }
    final primary = color('primary') ?? color('primaryColor');
    return primary == null ? const ColorScheme.light() : ColorScheme.light(primary: primary, onPrimary: color('onPrimary') ?? primary);
  }

  Map<String, String> get _headers => {'authorization': 'Bearer $accessToken', 'content-type': 'application/json'};

  Future<Map<String, dynamic>> _json(http.Response response) async {
    final body = jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError(body is Map && body['error'] is Map ? (body['error']['message'] ?? 'Request failed').toString() : 'Request failed');
    }
    return body as Map<String, dynamic>;
  }
}

class AquaApp extends ConsumerStatefulWidget {
  const AquaApp({super.key});
  @override
  ConsumerState<AquaApp> createState() => _AquaAppState();
}

class _AquaAppState extends ConsumerState<AquaApp> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(appStateProvider).load());
  }

  @override
  Widget build(BuildContext context) => MaterialApp.router(
        title: 'AE Farm',
        theme: ThemeData(useMaterial3: true, colorScheme: ref.watch(appStateProvider).colorScheme, visualDensity: VisualDensity.standard),
        routerConfig: ref.watch(routerProvider),
      );
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final mobile = TextEditingController();
  final code = TextEditingController();
  String message = '';
  bool sent = false;
  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const SizedBox(height: 48),
              Text('AE Farm', style: Theme.of(context).textTheme.headlineLarge),
              const SizedBox(height: 8),
              const Text('మీ ఫార్మ్ నిర్వహణ / Farm management'),
              const SizedBox(height: 32),
              TextField(controller: mobile, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Mobile / మొబైల్', border: OutlineInputBorder())),
              if (sent) ...[
                const SizedBox(height: 16),
                TextField(controller: code, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'OTP code / OTP కోడ్', border: OutlineInputBorder())),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  try {
                    final app = ref.read(appStateProvider);
                    if (!sent) {
                      await app.requestOtp(mobile.text.trim());
                      setState(() { sent = true; message = 'OTP sent. Check the development API log.'; });
                    } else {
                      await app.verifyOtp(mobile.text.trim(), code.text.trim());
                      if (!context.mounted) return;
                      context.go('/business');
                    }
                  } catch (error) {
                    setState(() => message = error.toString());
                  }
                },
                child: Text(sent ? 'Verify / ధృవీకరించండి' : 'Send OTP / OTP పంపండి'),
              ),
              if (message.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 16), child: Text(message)),
            ]),
          ),
        ),
      );
}

class BusinessScreen extends ConsumerStatefulWidget {
  const BusinessScreen({super.key});
  @override
  ConsumerState<BusinessScreen> createState() => _BusinessScreenState();
}

class _BusinessScreenState extends ConsumerState<BusinessScreen> {
  final business = TextEditingController();
  String message = '';
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Choose business / వ్యాపారం ఎంచుకోండి')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextField(controller: business, decoration: const InputDecoration(labelText: 'Business ID', border: OutlineInputBorder())),
            const SizedBox(height: 16),
            FilledButton(onPressed: () async {
              try {
                await ref.read(appStateProvider).switchBusiness(business.text.trim());
                if (!context.mounted) return;
                context.go('/');
              } catch (error) {
                setState(() => message = error.toString());
              }
            }, child: const Text('Continue / కొనసాగించండి')),
            if (message.isNotEmpty) Text(message),
          ]),
        ),
      );
}

class ShellScreen extends ConsumerStatefulWidget {
  const ShellScreen({super.key});
  @override
  ConsumerState<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends ConsumerState<ShellScreen> {
  int tab = 0;
  @override
  Widget build(BuildContext context) {
    final app = ref.watch(appStateProvider);
    final screens = [const HomeTab(), const PondsTab(), const DailyEntryTab(), if (app.financialAccess) const MoneyTab(), const MoreTab()];
    final labels = ['Home', 'My Ponds', 'Daily Entry', if (app.financialAccess) 'Money', 'More'];
    return Scaffold(
      body: IndexedStack(index: tab.clamp(0, screens.length - 1), children: screens),
      floatingActionButton: FloatingActionButton.extended(onPressed: () => setState(() => tab = 2), label: const Text('+ Quick add')),
      bottomNavigationBar: NavigationBar(selectedIndex: tab.clamp(0, labels.length - 1), onDestinationSelected: (value) => setState(() => tab = value), destinations: [for (final label in labels) NavigationDestination(icon: const Icon(Icons.dashboard_outlined), label: label)]),
    );
  }
}

class HomeTab extends ConsumerWidget {
  const HomeTab({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => const _Page(title: 'Home / హోమ్', children: [Text('Your ponds at a glance / మీ చెరువుల స్థితి'), SizedBox(height: 16), Text('Alerts and attention appear here when the server syncs.')]);
}

class PondsTab extends ConsumerStatefulWidget {
  const PondsTab({super.key});
  @override
  ConsumerState<PondsTab> createState() => _PondsTabState();
}

class _PondsTabState extends ConsumerState<PondsTab> {
  late final FarmRepository repository;
  @override
  void initState() {
    super.initState();
    final db = ref.read(databaseProvider);
    final app = ref.read(appStateProvider);
    repository = FarmRepository(db, SyncClient(db, baseUrl: apiBaseUrl, accessToken: app.accessToken), baseUrl: apiBaseUrl);
    repository.refreshPonds();
  }
  @override
  Widget build(BuildContext context) => StreamBuilder<List<LocalPond>>(stream: ref.read(databaseProvider).watchPonds(), builder: (context, snapshot) {
        final ponds = snapshot.data ?? [];
        return _Page(title: 'My Ponds / నా చెరువులు', children: ponds.isEmpty ? const [Text('No ponds cached yet. Connect once to load them.')] : [for (final pond in ponds) Card(child: ListTile(title: Text('${pond.name} · ${pond.code}'), subtitle: Text('${pond.attention} ${pond.attentionReason ?? ''}'), leading: const Icon(Icons.water)))]);
      });
}

class DailyEntryTab extends ConsumerStatefulWidget {
  const DailyEntryTab({super.key});
  @override
  ConsumerState<DailyEntryTab> createState() => _DailyEntryTabState();
}

class _DailyEntryTabState extends ConsumerState<DailyEntryTab> {
  String kind = 'FEED';
  String? pondId;
  final quantity = TextEditingController();
  String message = '';
  @override
  Widget build(BuildContext context) => _Page(title: 'Daily Entry / రోజువారీ నమోదు', children: [
        StreamBuilder<List<LocalPond>>(stream: ref.read(databaseProvider).watchPonds(), builder: (context, snapshot) {
          final ponds = snapshot.data ?? [];
          pondId ??= ponds.isEmpty ? null : ponds.first.id;
          return DropdownButtonFormField<String>(value: pondId, items: [for (final pond in ponds) DropdownMenuItem(value: pond.id, child: Text(pond.name))], onChanged: (value) => setState(() => pondId = value), decoration: const InputDecoration(labelText: 'Pond / చెరువు', border: OutlineInputBorder()));
        }),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(value: kind, items: const [DropdownMenuItem(value: 'FEED', child: Text('Feed / ఆహారం')), DropdownMenuItem(value: 'GROWTH', child: Text('Growth sample / వృద్ధి')), DropdownMenuItem(value: 'WATER', child: Text('Water / నీరు')), DropdownMenuItem(value: 'MEDICINE', child: Text('Medicine / మందు')), DropdownMenuItem(value: 'HEALTH', child: Text('Health event / ఆరోగ్యం')), DropdownMenuItem(value: 'CHECK_TRAY', child: Text('Check tray / చెక్ ట్రే'))], onChanged: (value) => setState(() => kind = value!), decoration: const InputDecoration(labelText: 'Entry type', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        TextField(controller: quantity, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: kind == 'FEED' ? 'Quantity kg / పరిమాణం కిలోలు' : 'Value / విలువ', border: const OutlineInputBorder())),
        const SizedBox(height: 12),
        FilledButton(onPressed: pondId == null ? null : () async {
          final db = ref.read(databaseProvider);
          final app = ref.read(appStateProvider);
          final repo = FarmRepository(db, SyncClient(db, baseUrl: apiBaseUrl, accessToken: app.accessToken), baseUrl: apiBaseUrl);
          await repo.saveDailyEntry(pondId: pondId!, kind: kind, payload: {'date': DateTime.now().toIso8601String().substring(0, 10), 'quantityKg': quantity.text});
          setState(() => message = 'Saved offline • Pending sync / ఆఫ్‌లైన్‌లో సేవ్ అయింది');
        }, child: const Text('Save entry / నమోదు సేవ్ చేయండి')),
        if (message.isNotEmpty) Text(message),
        const SizedBox(height: 16),
        StreamBuilder<List<DailyEntry>>(stream: ref.read(databaseProvider).watchEntries(), builder: (_, snapshot) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [for (final entry in snapshot.data ?? []) ListTile(title: Text(entry.kind), subtitle: Text(entry.syncState), trailing: const Icon(Icons.cloud_queue))])),
      ]);
}

class MoneyTab extends StatelessWidget {
  const MoneyTab({super.key});
  @override
  Widget build(BuildContext context) => const _Page(title: 'Money / డబ్బు', children: [Text('Financial access enabled'), Text('Expenses, payments, reports and party ledger load here.')]);
}

class MoreTab extends StatelessWidget {
  const MoreTab({super.key});
  @override
  Widget build(BuildContext context) => const _Page(title: 'More / మరిన్ని', children: [Text('Settings, language and sync status')]);
}

class _Page extends StatelessWidget {
  const _Page({required this.title, required this.children});
  final String title;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => SafeArea(child: ListView(padding: const EdgeInsets.all(20), children: [Text(title, style: Theme.of(context).textTheme.headlineMedium), const SizedBox(height: 20), ...children]));
}
