import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'data/local_database.dart';

final databaseProvider = Provider<LocalDatabase>((ref) {
  final database = LocalDatabase(openLocalDatabase());
  ref.onDispose(database.close);
  return database;
});

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
    ],
  );
});

class AquaApp extends ConsumerWidget {
  const AquaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      MaterialApp.router(title: 'AE Farm', theme: ThemeData.from(colorScheme: const ColorScheme.light()), routerConfig: ref.watch(routerProvider));
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(child: Text('AE Farm')),
      );
}
