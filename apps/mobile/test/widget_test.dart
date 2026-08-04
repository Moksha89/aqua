import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:aqua_mobile/app.dart';

void main() {
  testWidgets('renders the mobile foundation', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: AquaApp()));
    expect(find.text('AE Farm'), findsOneWidget);
  });
}
