# PROJECT_CONTEXT.md

_Last updated: 2026-09-12_

## What XFind is

A SaaS layer on top of Vinted: normalized brand/model/category search, advanced
filters, saved searches, new-listing monitoring and in-app alerts. The
transaction always happens on Vinted; XFind provides the discovery and
monitoring layer.

## Architecture

Clear separation:

```
UI (React SPA)
   │  fetch() → /api/*
   ▼
API (Hono on Bun)
   ├─ auth        AuthProvider  (local sessions | Supabase Auth)
   ├─ db          SqlDriver     (bun:sqlite | pg/Postgres)
   │                └─ Database (domain repository methods, portable SQL)
   ├─ services    SearchService, ListingService, SavedSearchService,
   │              NotificationService, IngestionService, BrandService,
   │              CatalogService, ListingRelevanceService
   └─ providers   MarketplaceProvider ← MockMarketplaceProvider | VintedProvider
```

## Stack

- **Client:** React 18, TypeScript (strict), Vite 6, Tailwind CSS v4, react-router-dom 6
- **Server:** TypeScript, Hono 4, running on Bun (or Node for serverless)
- **Database:** `bun:sqlite` (development), PostgreSQL via `pg` (production / Supabase; works on Node and Bun)
- **Validation:** zod
- **Package manager:** Bun
- **Tests:** Bun test runner
- **Deployment:** Bun server (single process in prod); Vercel static + `/api` function (see `docs/DEPLOYMENT.md`)

## Important directories

| Path | Contents |
| --- | --- |
| `src/shared/` | Domain types (`types.ts`) and zod schemas used by client + server |
| `src/server/db/` | SQL drivers, portable schema DDL, `Database` repository layer |
| `src/server/auth/` | `AuthProvider` abstraction, local + Supabase implementations |
| `src/server/providers/marketplace/` | `MarketplaceProvider` interface, mock + Vinted adapters |
| `src/server/services/` | Business logic (search, ingestion, alerts, normalization, relevance) |
| `src/server/seed/` | Seed catalogue (brands/categories/models) + dev samples |
| `src/server/` | `app.ts` (routes), `context.ts` (composition root), `index.ts` (entry) |
| `src/client/` | React app: components, pages, lib |
| `supabase/migrations/` | PostgreSQL schema + RLS policies |
| `docs/` | Vinted integration, ingestion, search |

## Environment variables

Runtime (see `.env.example`):

- `NODE_ENV`, `PORT`, `APP_URL`
- `DATABASE_TYPE` = `sqlite` (default) | `postgres`
- `DATABASE_PATH` (SQLite file) or `DATABASE_URL` (Postgres/Supabase connection string)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (Supabase paths)
- `AUTH_PROVIDER` = `local` (default) | `supabase`
- `SESSION_SECRET` (required in production)
- `MOCK_PROVIDER_ENABLED`, `VINTED_PROVIDER_ENABLED`, `VINTED_FEED_URL`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (optional push)
- `INGESTION_BATCH_SIZE`, `INGESTION_INTERVAL_MS`

Production safety: `src/server/config.ts#assertProductionConfig()` refuses to boot
in production without a strong `SESSION_SECRET` and a database.

## Database

- Portable schema shared by SQLite and PostgreSQL lives in `src/server/db/ddl.ts`.
- `supabase/migrations/0001_init.sql` mirrors it for Supabase and adds RLS:
  - public read on brands/categories/models/listings/ingestion_runs
  - owner-only access to users/sessions/favorites/saved_searches/notifications
- Tables: `users`, `sessions`, `brands`, `categories`, `models`, `listings`,
  `favorites`, `saved_searches`, `search_events`, `notifications`,
  `ingestion_runs`, `ingestion_errors`.

## Integrations

- **Marketplace:** mock provider only, clearly labelled. Vinted adapter is a cold
  boundary — see `docs/VINTED_INTEGRATION.md`.
- **Auth:** local in development; Supabase Auth supported via env config.
- **Web Push:** infrastructure and status endpoint only; never faked. Requires VAPID keys.

## Current implementation status

Implementation is organized by phase (see `FEATURES_STATUS.md` for the full list):

1. **Audit** — analysed environment; XFind built as a new repository.
2. **Foundation** — database + driver abstraction, auth, zod schemas, provider abstraction: done.
3. **Data** — listings, brands, categories, models, seed data, ingestion + normalization + dedup: done.
4. **Search** — search service, filters, sorting, pagination, autocomplete, deterministic relevance: done.
5. **UI** — landing, search, listing detail, brands, favorites, saved searches, notifications, settings: done.
6. **Monitoring** — saved-search matching on ingestion, new-listing detection, in-app alerts, push infra status: done (push delivery is provider-dependent).
7. **Hardening** — security/RLS, error/loading/empty states, env validation, docs, tests: done for the development scope.

Known limitations are tracked in `FEATURES_STATUS.md` and `ROADMAP.md`.

## Commands

```bash
bun install
bun run dev
bun run typecheck && bun run lint && bun test
bun run build
```