# XFind

Intelligent search and monitoring layer for Vinted.

XFind does not clone Vinted — it sits on top of it. It provides normalized
brand/model/category search, advanced filters, saved searches, new-listing alerts
and listing intelligence, while the transaction itself always happens on Vinted.

> **Honesty rule:** this repository never fakes live Vinted data. In development it
> ships a clearly-labelled **mock marketplace provider**. The Vinted integration is
> a clean adapter boundary documented in [`docs/VINTED_INTEGRATION.md`](docs/VINTED_INTEGRATION.md).

## Quick start

```bash
bun install
cp .env.example .env
bun run dev
```

- Web UI (Vite): <http://localhost:5173>
- API (Hono/Bun): <http://localhost:3001>

On first boot the development database (`./data/xfind.db`) is created and seeded
with a realistic sample catalogue: 12 brands, 13 categories, 36 models and a
batch of listings. All sample listings are labelled "Dev data" in the UI and are
never presented as live Vinted listings.

## Scripts

| Script                | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `bun run dev`         | API (Bun, hot reload) + Vite web client together   |
| `bun run build`       | Production client build into `dist/`               |
| `bun start`           | Production server (serves `dist` + API)            |
| `bun run seed`        | Re-seed catalogue and ingest a batch of listings   |
| `bun run typecheck`   | Strict TypeScript check                            |
| `bun run lint`        | ESLint                                             |
| `bun test`            | Unit tests (normalization, relevance)              |
| `bun run db:set-admin -- <email>` | Grant admin access to the `/admin/ingestion` area |

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, react-router
- **Backend:** TypeScript, Hono, service layer, Bun runtime
- **Database:** portable SQL core — SQLite via `bun:sqlite` for development, or
  PostgreSQL (Supabase) via `pg` for production
  (migrations: `supabase/migrations/0001_init.sql` with RLS)
- **Auth:** provider abstraction — `local` (email/password + sessions) for dev,
  `supabase` (Supabase Auth) for production
- **Search:** normalized intent detection + relational queries; a `SearchEngine`
  boundary so Typesense/Meilisearch/OpenSearch can be slotted in later

## Product map

| Page                 | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `/`                  | Landing with search-first CTA                         |
| `/search`            | Full search: URL-persisted filters, sorting, pagination, "new listings" bar, detected-intent chips, "Save this search" |
| `/listing/:id`       | Gallery, attributes, relevance, source, save, external links |
| `/saved-searches`    | Monitoring: match counts, last match, active/notification toggles |
| `/favorites`         | Saved listings                                        |
| `/notifications`     | In-app alerts with read state                         |
| `/brands`, `/brand/:slug` | Catalogue browsing (models + latest listings)     |
| `/settings`          | Profile, notification preferences, push status        |
| `/admin/ingestion`   | Provider status, ingestion runs, errors (admin only)  |

## Environment

See [`.env.example`](.env.example). Never commit real secrets. The service role
key and provider credentials are server-only.

## How ingestion works

```
Provider (mock or future compliant Vinted feed)
   → IngestionService.run()
   → normalize (brand/model/category resolution, size normalization, https-only images)
   → deduplicate (source + external_id)
   → upsert listings
   → match saved searches → in-app notifications
   → record ingestion run / errors
```

## Documentation

- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — architecture, stack, env, status
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — module boundaries and data flow
- [`FEATURES_STATUS.md`](FEATURES_STATUS.md) — implemented / mocked / provider-dependent
- [`ROADMAP.md`](ROADMAP.md) — next steps
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel + Supabase deployment guide
- [`docs/VINTED_INTEGRATION.md`](docs/VINTED_INTEGRATION.md) — compliant Vinted integration path
- [`docs/INGESTION.md`](docs/INGESTION.md) — data pipeline details
- [`docs/SEARCH.md`](docs/SEARCH.md) — search engine, intent detection, relevance scoring

## Deploying to Vercel

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). XFind deploys as static files +
one `/api` serverless function. Prerequisites: `DATABASE_TYPE=postgres`,
`DATABASE_URL` (Supabase Postgres), `SESSION_SECRET` (plus Supabase auth env if
using `AUTH_PROVIDER=supabase`).