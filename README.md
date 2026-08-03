# AE Farm & Financial Management

Offline-first aqua (shrimp and fish) pond operations and financial management for Indian farmers.
The backend is a strict NestJS/TypeScript service with PostgreSQL and a pure rules engine. Mobile
and web clients are intentionally reserved for later phases.

## Repository layout

- `apps/api` — NestJS 10 API and rules engine (current foundation)
- `apps/web` — reserved for a future Next.js App Router client; not scaffolded yet
- `apps/mobile` — reserved for a future Flutter client; not scaffolded yet
- `packages` — reserved for shared generated clients and types
- `docs/ARCHITECTURE.md` — source-of-truth technical architecture

## Requirements

- Node.js 20
- pnpm 9.15.5
- Docker and Docker Compose

## Run locally

```sh
pnpm install
docker compose up -d
pnpm --filter @aqua/api prisma:generate
pnpm --filter @aqua/api prisma:migrate
pnpm lint
pnpm typecheck
pnpm test
```

The API HTTP feature modules are intentionally not included in this foundation handoff.

## Quality checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm prisma:validate` are also run by GitHub Actions.
The rules engine tests are pure and do not require a database.
