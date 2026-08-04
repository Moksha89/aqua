import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:uuid/uuid.dart';

import 'data/farm_repository.dart';
import 'data/attachment_repository.dart';
import 'data/local_database.dart';
import 'data/sync_client.dart';
import 'data/theme_repository.dart';

const apiBaseUrl = String.fromEnvironment(
  'AQUA_API_URL',
  defaultValue: 'http://10.0.2.2:3000/api/v1',
);

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
      if (!app.verified) {
        return state.matchedLocation == '/login' ? null : '/login';
      }
      if (app.businessId == null) {
        return state.matchedLocation == '/business' ? null : '/business';
      }
      return state.matchedLocation == '/login' ||
              state.matchedLocation == '/business'
          ? '/'
          : null;
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
      final theme = await ThemeRepository(
        database,
        baseUrl: apiBaseUrl,
        accessToken: accessToken,
      ).load(businessId!);
      colorScheme = _themeScheme(theme);
    }
    notifyListeners();
  }

  Future<Map<String, dynamic>> requestOtp(String value) async {
    mobile = value;
    return _json(
      await http.post(
        Uri.parse('$apiBaseUrl/auth/otp/request'),
        headers: {'content-type': 'application/json'},
        body: jsonEncode({'mobile': value}),
      ),
    );
  }

  Future<void> verifyOtp(String value, String code) async {
    final body = await _json(
      await http.post(
        Uri.parse('$apiBaseUrl/auth/otp/verify'),
        headers: {'content-type': 'application/json'},
        body: jsonEncode({
          'mobile': value,
          'code': code,
          'deviceId': const Uuid().v4(),
        }),
      ),
    );
    accessToken = body['accessToken'] as String;
    refreshToken = body['refreshToken'] as String;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', accessToken!);
    await prefs.setString('refresh_token', refreshToken!);
    notifyListeners();
  }

  Future<void> switchBusiness(String id) async {
    final body = await _json(
      await http.post(
        Uri.parse('$apiBaseUrl/auth/business/switch'),
        headers: _headers,
        body: jsonEncode({'businessId': id}),
      ),
    );
    businessId = body['businessId'] as String;
    role = body['role'] as String;
    financialAccess = body['financialAccess'] == true;
    accessToken = body['accessToken'] as String;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('business_id', businessId!);
    await prefs.setString('role', role!);
    await prefs.setBool('financial_access', financialAccess);
    await prefs.setString('access_token', accessToken!);
    colorScheme = _themeScheme(
      await ThemeRepository(
        database,
        baseUrl: apiBaseUrl,
        accessToken: accessToken,
      ).load(businessId!),
    );
    notifyListeners();
  }

  ColorScheme _themeScheme(Map<String, dynamic> theme) {
    final source =
        theme['tokens'] is Map<String, dynamic>
            ? theme['tokens'] as Map<String, dynamic>
            : theme;
    Color? color(String key) {
      final value = source[key];
      if (value is! String) return null;
      final hex = value.replaceFirst('#', '');
      if (hex.length != 6 && hex.length != 8) return null;
      final normalized = hex.length == 6 ? 'FF$hex' : hex;
      return Color(int.tryParse(normalized, radix: 16) ?? 0);
    }

    final primary = color('primary') ?? color('primaryColor');
    return primary == null
        ? const ColorScheme.light()
        : ColorScheme.light(
          primary: primary,
          onPrimary: color('onPrimary') ?? primary,
        );
  }

  Map<String, String> get _headers => {
    'authorization': 'Bearer $accessToken',
    'content-type': 'application/json',
  };

  Future<Map<String, dynamic>> _json(http.Response response) async {
    final body = jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError(
        body is Map && body['error'] is Map
            ? (body['error']['message'] ?? 'Request failed').toString()
            : 'Request failed',
      );
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
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ref.watch(appStateProvider).colorScheme,
      visualDensity: VisualDensity.standard,
    ),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 48),
            Text('AE Farm', style: Theme.of(context).textTheme.headlineLarge),
            const SizedBox(height: 8),
            const Text('మీ ఫార్మ్ నిర్వహణ / Farm management'),
            const SizedBox(height: 32),
            TextField(
              controller: mobile,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Mobile / మొబైల్',
                border: OutlineInputBorder(),
              ),
            ),
            if (sent) ...[
              const SizedBox(height: 16),
              TextField(
                controller: code,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'OTP code / OTP కోడ్',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () async {
                try {
                  final app = ref.read(appStateProvider);
                  if (!sent) {
                    await app.requestOtp(mobile.text.trim());
                    setState(() {
                      sent = true;
                      message = 'OTP sent. Check the development API log.';
                    });
                  } else {
                    await app.verifyOtp(mobile.text.trim(), code.text.trim());
                    if (!context.mounted) return;
                    context.go('/business');
                  }
                } catch (error) {
                  setState(() => message = error.toString());
                }
              },
              child: Text(
                sent ? 'Verify / ధృవీకరించండి' : 'Send OTP / OTP పంపండి',
              ),
            ),
            if (message.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Text(message),
              ),
          ],
        ),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: business,
            decoration: const InputDecoration(
              labelText: 'Business ID',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () async {
              try {
                await ref
                    .read(appStateProvider)
                    .switchBusiness(business.text.trim());
                if (!context.mounted) return;
                context.go('/');
              } catch (error) {
                setState(() => message = error.toString());
              }
            },
            child: const Text('Continue / కొనసాగించండి'),
          ),
          if (message.isNotEmpty) Text(message),
        ],
      ),
    ),
  );
}

class ShellScreen extends ConsumerStatefulWidget {
  const ShellScreen({super.key});
  @override
  ConsumerState<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends ConsumerState<ShellScreen>
    with WidgetsBindingObserver {
  int tab = 0;
  late SyncClient sync;
  late AttachmentRepository attachments;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final app = ref.read(appStateProvider);
    sync = SyncClient(
      ref.read(databaseProvider),
      baseUrl: apiBaseUrl,
      accessToken: app.accessToken,
    );
    attachments = AttachmentRepository(
      ref.read(databaseProvider),
      baseUrl: apiBaseUrl,
      accessToken: app.accessToken!,
    );
    _syncNow();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _syncNow();
  }

  Future<void> _syncNow() async {
    await sync.push();
    await sync.pull();
    await attachments.retryPending();
  }

  @override
  Widget build(BuildContext context) {
    final app = ref.watch(appStateProvider);
    final screens = [
      const HomeTab(),
      const PondsTab(),
      const DailyEntryTab(),
      if (app.financialAccess) const MoneyTab(),
      const MoreTab(),
    ];
    final labels = [
      'Home',
      'My Ponds',
      'Daily Entry',
      if (app.financialAccess) 'Money',
      'More',
    ];
    return Scaffold(
      body: IndexedStack(
        index: tab.clamp(0, screens.length - 1),
        children: screens,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => setState(() => tab = 2),
        label: const Text('+ Quick add'),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab.clamp(0, labels.length - 1),
        onDestinationSelected: (value) => setState(() => tab = value),
        destinations: [
          for (final label in labels)
            NavigationDestination(
              icon: const Icon(Icons.dashboard_outlined),
              label: label,
            ),
        ],
      ),
    );
  }
}

class HomeTab extends ConsumerWidget {
  const HomeTab({super.key});
  @override
  Widget build(
    BuildContext context,
    WidgetRef ref,
  ) => StreamBuilder<List<LocalPond>>(
    stream: ref.read(databaseProvider).watchPonds(),
    builder: (context, snapshot) {
      final ponds = snapshot.data ?? [];
      return _Page(
        title: 'Home / హోమ్',
        children: [
          const Text('Your ponds at a glance / మీ చెరువుల స్థితి'),
          const SizedBox(height: 16),
          if (ponds.isEmpty) const Text('Alerts appear after the first sync.'),
          for (final pond in ponds)
            Card(
              child: ListTile(
                title: Text(pond.name),
                subtitle: Text(
                  '${pond.attention}${pond.attentionReason == null ? '' : ' · ${pond.attentionReason}'}',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap:
                    () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => PondDetailScreen(pond: pond),
                      ),
                    ),
              ),
            ),
        ],
      );
    },
  );
}

class PondsTab extends ConsumerStatefulWidget {
  const PondsTab({super.key});
  @override
  ConsumerState<PondsTab> createState() => _PondsTabState();
}

class _PondsTabState extends ConsumerState<PondsTab> {
  late final FarmRepository repository;
  String? loadError;
  @override
  void initState() {
    super.initState();
    final db = ref.read(databaseProvider);
    final app = ref.read(appStateProvider);
    repository = FarmRepository(
      db,
      SyncClient(db, baseUrl: apiBaseUrl, accessToken: app.accessToken),
      baseUrl: apiBaseUrl,
    );
    repository.refreshPonds().catchError(
      (error) => setState(() => loadError = error.toString()),
    );
  }

  @override
  Widget build(BuildContext context) => StreamBuilder<List<LocalPond>>(
    stream: ref.read(databaseProvider).watchPonds(),
    builder: (context, snapshot) {
      final ponds = snapshot.data ?? [];
      return _Page(
        title: 'My Ponds / నా చెరువులు',
        children: [
          OutlinedButton.icon(
            onPressed:
                () => repository
                    .refreshPonds()
                    .then((_) => setState(() => loadError = null))
                    .catchError(
                      (error) => setState(() => loadError = error.toString()),
                    ),
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh ponds / చెరువులు రిఫ్రెష్ చేయండి'),
          ),
          if (loadError != null) Text(loadError!),
          if (ponds.isEmpty)
            const Text('No ponds cached yet. Connect once to load them.'),
          for (final pond in ponds)
            Card(
              child: ListTile(
                title: Text('${pond.name} · ${pond.code}'),
                subtitle: Text(
                  '${pond.attention} ${pond.attentionReason ?? ''}',
                ),
                leading: const Icon(Icons.water),
                onTap:
                    () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => PondDetailScreen(pond: pond),
                      ),
                    ),
              ),
            ),
        ],
      );
    },
  );
}

class PondDetailScreen extends StatelessWidget {
  const PondDetailScreen({super.key, required this.pond});
  final LocalPond pond;

  @override
  Widget build(BuildContext context) {
    final crop = pond.cropJson == null ? null : jsonDecode(pond.cropJson!);
    return Scaffold(
      appBar: AppBar(title: Text('${pond.name} · ${pond.code}')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Attention: ${pond.attention}',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          if (pond.attentionReason != null) Text(pond.attentionReason!),
          const SizedBox(height: 20),
          if (crop is Map<String, dynamic>) ...[
            Text(
              'Active crop / ప్రస్తుత పంట',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            for (final item in [
              ('doc', 'DOC'),
              ('abw', 'ABW'),
              ('biomass', 'Biomass'),
              ('fcr', 'FCR'),
              ('density', 'Density'),
            ])
              if (crop[item.$1] is Map<String, dynamic>)
                _FigureTile(
                  label: item.$2,
                  figure: crop[item.$1] as Map<String, dynamic>,
                ),
          ] else
            const Text('No active crop'),
        ],
      ),
    );
  }
}

class _FigureTile extends StatelessWidget {
  const _FigureTile({required this.label, required this.figure});
  final String label;
  final Map<String, dynamic> figure;
  @override
  Widget build(BuildContext context) {
    final status = figure['status']?.toString() ?? 'NOT_DETERMINABLE';
    final value = figure['value'];
    final unit = figure['unit']?.toString() ?? '';
    final reason = figure['reason']?.toString();
    return ListTile(
      title: Text(label),
      subtitle: Text(
        [
          value == null ? status : '$value $unit',
          if (status == 'ESTIMATED') 'ESTIMATED',
          if (status == 'NOT_DETERMINABLE' && reason != null) reason,
        ].join(' · '),
      ),
      onTap:
          () => showModalBottomSheet<void>(
            context: context,
            builder: (_) => _DerivationView(value: figure),
          ),
    );
  }
}

class _DerivationView extends StatelessWidget {
  const _DerivationView({required this.value});
  final dynamic value;
  @override
  Widget build(BuildContext context) {
    final map =
        value is Map<String, dynamic>
            ? value as Map<String, dynamic>
            : {'value': value};
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'How this figure is derived / లెక్కింపు',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            for (final entry in map.entries)
              if (entry.key == 'derivation' && entry.value is Map)
                ...((entry.value as Map).entries.map(
                  (step) => ListTile(
                    dense: true,
                    title: Text(step.key.toString()),
                    subtitle: Text('${step.value}'),
                  ),
                ))
              else
                ListTile(
                  dense: true,
                  title: Text(entry.key),
                  subtitle: Text('${entry.value}'),
                ),
          ],
        ),
      ),
    );
  }
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
  final remarks = TextEditingController();
  final speech = SpeechToText();
  bool listening = false;
  String message = '';
  bool defaultsLoaded = false;

  Future<void> loadPrevious(String id) async {
    if (defaultsLoaded) return;
    final entry = await ref.read(databaseProvider).latestEntry(id, kind);
    if (entry != null) {
      final payload = jsonDecode(entry.payloadJson);
      if (payload is Map && payload['quantityKg'] != null) {
        quantity.text = payload['quantityKg'].toString();
      }
      if (payload is Map && payload['remarks'] != null) {
        remarks.text = payload['remarks'].toString();
      }
    }
    defaultsLoaded = true;
  }

  @override
  Widget build(BuildContext context) => _Page(
    title: 'Daily Entry / రోజువారీ నమోదు',
    children: [
      StreamBuilder<List<LocalPond>>(
        stream: ref.read(databaseProvider).watchPonds(),
        builder: (context, snapshot) {
          final ponds = snapshot.data ?? [];
          final shouldSelectFirst = pondId == null && ponds.isNotEmpty;
          pondId ??= ponds.isEmpty ? null : ponds.first.id;
          if (shouldSelectFirst) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) setState(() {});
            });
          }
          if (pondId != null) loadPrevious(pondId!);
          return DropdownButtonFormField<String>(
            value: pondId,
            items: [
              for (final pond in ponds)
                DropdownMenuItem(value: pond.id, child: Text(pond.name)),
            ],
            onChanged: (value) => setState(() => pondId = value),
            decoration: const InputDecoration(
              labelText: 'Pond / చెరువు',
              border: OutlineInputBorder(),
            ),
          );
        },
      ),
      const SizedBox(height: 12),
      OutlinedButton.icon(
        onPressed:
            pondId == null
                ? null
                : () async {
                  defaultsLoaded = false;
                  await loadPrevious(pondId!);
                  setState(
                    () =>
                        message =
                            'Same as yesterday loaded / నిన్నటి నమోదు లోడ్ అయింది',
                  );
                },
        icon: const Icon(Icons.content_copy),
        label: const Text('Same as yesterday / నిన్నటి మాదిరి'),
      ),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(
        value: kind,
        items: const [
          DropdownMenuItem(value: 'FEED', child: Text('Feed / ఆహారం')),
          DropdownMenuItem(
            value: 'GROWTH',
            child: Text('Growth sample / వృద్ధి'),
          ),
          DropdownMenuItem(value: 'WATER', child: Text('Water / నీరు')),
          DropdownMenuItem(value: 'MEDICINE', child: Text('Medicine / మందు')),
          DropdownMenuItem(
            value: 'HEALTH',
            child: Text('Health event / ఆరోగ్యం'),
          ),
          DropdownMenuItem(
            value: 'CHECK_TRAY',
            child: Text('Check tray / చెక్ ట్రే'),
          ),
        ],
        onChanged:
            (value) => setState(() {
              kind = value!;
              defaultsLoaded = false;
            }),
        decoration: const InputDecoration(
          labelText: 'Entry type',
          border: OutlineInputBorder(),
        ),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: quantity,
        keyboardType: TextInputType.number,
        decoration: InputDecoration(
          labelText:
              kind == 'FEED' ? 'Quantity kg / పరిమాణం కిలోలు' : 'Value / విలువ',
          border: const OutlineInputBorder(),
        ),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: remarks,
        maxLines: 2,
        decoration: InputDecoration(
          labelText: 'Remarks / గమనికలు',
          border: const OutlineInputBorder(),
          suffixIcon: IconButton(
            icon: Icon(listening ? Icons.mic : Icons.mic_none),
            onPressed: () async {
              if (!listening) {
                final ready = await speech.initialize();
                if (!ready) return;
                setState(() => listening = true);
                await speech.listen(
                  onResult:
                      (result) =>
                          setState(() => remarks.text = result.recognizedWords),
                );
              } else {
                await speech.stop();
                setState(() => listening = false);
              }
            },
          ),
        ),
      ),
      const SizedBox(height: 12),
      FilledButton(
        onPressed:
            pondId == null
                ? null
                : () async {
                  if (quantity.text.trim().isEmpty) {
                    setState(
                      () => message = 'Enter a quantity / పరిమాణం నమోదు చేయండి',
                    );
                    return;
                  }
                  final db = ref.read(databaseProvider);
                  final app = ref.read(appStateProvider);
                  final repo = FarmRepository(
                    db,
                    SyncClient(
                      db,
                      baseUrl: apiBaseUrl,
                      accessToken: app.accessToken,
                    ),
                    baseUrl: apiBaseUrl,
                  );
                  await repo.saveDailyEntry(
                    pondId: pondId!,
                    kind: kind,
                    payload: {
                      'logDate': DateTime.now().toIso8601String().substring(
                        0,
                        10,
                      ),
                      'mealSlot': 'AM',
                      'quantityKg': quantity.text,
                      'remarks': remarks.text,
                    },
                  );
                  setState(
                    () =>
                        message =
                            'Saved offline • Pending sync / ఆఫ్‌లైన్‌లో సేవ్ అయింది',
                  );
                },
        child: const Text('Save entry / నమోదు సేవ్ చేయండి'),
      ),
      if (message.isNotEmpty) Text(message),
      const SizedBox(height: 16),
      StreamBuilder<List<DailyEntry>>(
        stream: ref.read(databaseProvider).watchEntries(),
        builder:
            (_, snapshot) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final entry in snapshot.data ?? [])
                  ListTile(
                    title: Text(entry.kind),
                    subtitle: Text(
                      entry.conflictMarker == null
                          ? entry.syncState
                          : '${entry.syncState} · ${entry.conflictMarker}',
                    ),
                    trailing: Icon(
                      entry.syncState == 'REJECTED'
                          ? Icons.error_outline
                          : Icons.cloud_queue,
                    ),
                  ),
              ],
            ),
      ),
    ],
  );
}

class MoneyTab extends ConsumerStatefulWidget {
  const MoneyTab({super.key});
  @override
  ConsumerState<MoneyTab> createState() => _MoneyTabState();
}

class _MoneyTabState extends ConsumerState<MoneyTab> {
  final amount = TextEditingController();
  String? expenseId;
  final picker = ImagePicker();
  String? photoPath;
  String message = '';
  Future<void> captureBill() async {
    final app = ref.read(appStateProvider);
    if (expenseId == null) {
      if (amount.text.trim().isEmpty) {
        setState(
          () => message = 'Enter amount first / ముందుగా మొత్తం నమోదు చేయండి',
        );
        return;
      }
      final heads = await http.get(
        Uri.parse('$apiBaseUrl/masters/cost-heads'),
        headers: {'authorization': 'Bearer ${app.accessToken}'},
      );
      if (heads.statusCode < 200 || heads.statusCode >= 300) {
        setState(
          () =>
              message =
                  'Cost heads unavailable / ఖర్చు శీర్షికలు అందుబాటులో లేవు',
        );
        return;
      }
      final items = jsonDecode(heads.body);
      if (items is! List || items.isEmpty) {
        setState(
          () => message = 'Choose a cost head first / ఖర్చు శీర్షిక ఎంచుకోండి',
        );
        return;
      }
      final headId = (items.first as Map<String, dynamic>)['id'];
      final expense = await http.post(
        Uri.parse('$apiBaseUrl/finance/expenses'),
        headers: {
          'authorization': 'Bearer ${app.accessToken}',
          'content-type': 'application/json',
        },
        body: jsonEncode({
          'expenseDate': DateTime.now().toIso8601String().substring(0, 10),
          'costHeadId': headId,
          'allocationTarget': 'COMMON',
          'amountPaise': amount.text.trim(),
          'paymentStatus': 'UNPAID',
        }),
      );
      if (expense.statusCode < 200 || expense.statusCode >= 300) {
        setState(
          () => message = 'Expense could not be saved / ఖర్చు సేవ్ కాలేదు',
        );
        return;
      }
      expenseId =
          (jsonDecode(expense.body) as Map<String, dynamic>)['id']?.toString();
    }
    if (expenseId == null) return;
    final photo = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
    );
    if (photo == null) return;
    final repository = AttachmentRepository(
      ref.read(databaseProvider),
      baseUrl: apiBaseUrl,
      accessToken: app.accessToken!,
    );
    await repository.queuePhoto(
      ownerType: 'EXPENSE',
      ownerId: expenseId!,
      path: photo.path,
      contentType: 'image/jpeg',
    );
    setState(() {
      photoPath = photo.path;
      message =
          'Bill photo queued for expense / ఖర్చుకు బిల్లు ఫోటో క్యూ అయింది';
    });
  }

  @override
  Widget build(BuildContext context) => _Page(
    title: 'Money / డబ్బు',
    children: [
      const Text('Financial access enabled'),
      const Text('Expenses, payments, reports and party ledger load here.'),
      const SizedBox(height: 16),
      TextField(
        controller: amount,
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(
          labelText: 'Amount paise / మొత్తం పైసలు',
          border: OutlineInputBorder(),
        ),
      ),
      const SizedBox(height: 12),
      OutlinedButton.icon(
        onPressed: captureBill,
        icon: const Icon(Icons.camera_alt),
        label: const Text('Capture bill photo / బిల్లు ఫోటో తీయండి'),
      ),
      if (photoPath != null) Text(photoPath!),
      if (message.isNotEmpty) Text(message),
    ],
  );
}

class MoreTab extends StatelessWidget {
  const MoreTab({super.key});
  @override
  Widget build(BuildContext context) => Consumer(
    builder:
        (context, ref, _) => StreamBuilder<List<SyncConflict>>(
          stream:
              ref
                  .read(databaseProvider)
                  .select(ref.read(databaseProvider).syncConflicts)
                  .watch(),
          builder: (context, snapshot) {
            final conflicts = snapshot.data ?? [];
            return _Page(
              title: 'More / మరిన్ని',
              children: [
                const Text('Settings, language and sync status'),
                const SizedBox(height: 20),
                if (conflicts.isEmpty)
                  const Text('No conflicts / విభేదాలు లేవు'),
                for (final conflict in conflicts)
                  Card(
                    child: ListTile(
                      title: Text(
                        conflict.policy == 'FINANCIAL_REQUIRES_RESOLUTION'
                            ? 'Financial record needs review / ఆర్థిక నమోదు పరిశీలించండి'
                            : 'Operational record updated / ఆపరేషనల్ నమోదు నవీకరించబడింది',
                      ),
                      subtitle: Text(conflict.entityType),
                      trailing:
                          conflict.policy == 'FINANCIAL_REQUIRES_RESOLUTION'
                              ? const Icon(Icons.warning_amber)
                              : const Icon(Icons.info_outline),
                    ),
                  ),
              ],
            );
          },
        ),
  );
}

class _Page extends StatelessWidget {
  const _Page({required this.title, required this.children});
  final String title;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => SafeArea(
    child: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(title, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 20),
        ...children,
      ],
    ),
  );
}
