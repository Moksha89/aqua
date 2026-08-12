# AE Farm mobile

Offline-first Flutter client foundation and farmer shell.

## Development

```sh
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter analyze
flutter test
flutter run --dart-define=AQUA_API_URL=http://10.0.2.2:3000/api/v1
```

The Android emulator reaches a host API through `10.0.2.2`. Physical devices
need an API URL reachable from the device.

The local Drift database stores ponds, crops, daily entries, sync outbox
records, conflict markers, cursor metadata and the server-provided theme.
Daily entries are written to SQLite before any network request. The outbox
uses client UUIDs as idempotency keys and syncs opportunistically.
