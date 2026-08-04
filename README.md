# AE Farm & Financial Management

Offline-first aqua (shrimp and fish) pond operations and financial management for Indian farmers.
The backend is a strict NestJS/TypeScript service with PostgreSQL and a pure rules engine. Mobile
and web clients are intentionally reserved for later phases.

## Repository layout

- `apps/api` — NestJS 10 API and rules engine (current foundation)
- `apps/web` — Next.js App Router client
- `apps/mobile` — Flutter client foundation (Riverpod, go_router, Drift and sync outbox)
- `packages` — reserved for shared generated clients and types
- `docs/ARCHITECTURE.md` — source-of-truth technical architecture

## Requirements

- Node.js 20
- pnpm 9.15.5
- Docker and Docker Compose
- Flutter 3.29+ and Android SDK (for mobile development)

Copy `.env.example` to `.env` before starting the API. The local MinIO service uses the
credentials shown there and stores attachments in the `aqua-attachments` bucket; the API creates
that bucket during startup.

## Run locally

```sh
pnpm install
docker compose up -d
pnpm --filter @aqua/api prisma:generate
pnpm --filter @aqua/api prisma:migrate
pnpm --filter @aqua/api start:dev
pnpm lint
pnpm typecheck
pnpm test
```

The API HTTP feature modules are intentionally not included in this foundation handoff.

To check the mobile foundation:

```sh
cd apps/mobile
flutter pub get
dart run build_runner build
flutter analyze
flutter test
```

## Quality checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm prisma:validate` are also run by GitHub Actions.
The rules engine tests are pure and do not require a database.
