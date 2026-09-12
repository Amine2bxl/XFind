# DEPLOYMENT

## Option A — Vercel + Supabase (recommended)

XFind deploys to Vercel as **static files + one `/api` serverless function**
(standard Node runtime — no pinned Bun runtime needed):

- Vercel serves the built SPA from `dist/client` (`outputDirectory`).
- The function at `api/index.ts` handles every `/api/*` request.
- `vercel.json` routes anything that is not a static file to `/index.html`
  (SPA fallback), with `handle: filesystem` first so assets keep resolving.

### 1. Database (Supabase)

1. Create a Supabase project.
2. Copy the **Postgres connection string** (Project Settings → Database →
   Connection string → URI). Prefer the **pooler** (`aws-0-...pooler.supabase.com`)
   connection string.
3. (Optional, recommended for auth) note `SUPABASE_URL` (`https://<ref>.supabase.co`)
   and the `anon` key.

### 2. Vercel import

1. Import `https://github.com/Amine2bxl/XFind` in the Vercel dashboard.
2. Framework **Other** is forced automatically by `vercel.json`
   (`framework: null` + `buildCommand` + `outputDirectory`). Just click deploy.
   With **no environment variables** the site deploys in **demo mode**: an
   ephemeral SQLite database is seeded with clearly-labelled sample data, so
   search, the live feed, account creation and favorites all work immediately.
   A banner shows when demo mode is active; data resets on cold start and labels
   always say "Dev data".
3. For a persistent deployment add the environment variables below
   (Production):

| Variable | Value |
| --- | --- |
| `DATABASE_TYPE` | `postgres` |
| `DATABASE_URL` | your Supabase Postgres connection string |
| `AUTH_PROVIDER` | `supabase` (recommended) |
| `SUPABASE_URL` | `https://<ref>.supabase.co` (when `AUTH_PROVIDER=supabase`) |
| `SUPABASE_ANON_KEY` | anon/public key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (server-only, never exposed) |
| `SESSION_SECRET` | random value, e.g. `openssl rand -hex 32` |
| `MOCK_PROVIDER_ENABLED` | `true` for demo data (clearly labelled), `false` for real providers later |

> Without `DATABASE_TYPE=postgres` + `DATABASE_URL`, the function intentionally
> returns a readable JSON error (not a crash) — it never silently falls back to
> a fake database.

First deploy is slow (cold DB). On a cold Postgres, the API seeds the demo
catalogue automatically **when the active provider is the mock provider** (no
`VINTED_FEED_URL` configured) so the site is browsable immediately.

### 3. Apply the Supabase schema

XFind migrates the schema itself on first function boot (portable DDL in
`src/server/db/ddl.ts`). To also enable Row Level Security policies, run
`supabase/migrations/0001_init.sql` in the Supabase SQL editor once.  RLS is
optional for the serverless app (the server connects with the service role),
but recommended.

## Option B — Self-hosted Bun server

```bash
NODE_ENV=production bun install
NODE_ENV=production bun run build
SESSION_SECRET=$(openssl rand -hex 32) \
DATABASE_TYPE=postgres DATABASE_URL="postgresql://..." \
bun run start          # serves dist/client + /api on one port
```

or keep `DATABASE_TYPE=sqlite` for a single-VM demo (SQLite file on disk).

## Common issues

| Symptom | Cause / fix |
| --- | --- |
| Site deploys but works "by default" | Demo mode: ephemeral SQLite + labelled sample data. Add `DATABASE_TYPE=postgres` + `DATABASE_URL` for persistence. |
| Build fails while resolving `bun:sqlite` | Should be gone: the Bun SQLite driver imports `bun:sqlite` lazily and is never bundled/initialised in production. |
| `/api/*` returns `{ error: "missing_configuration" }` | `DATABASE_TYPE=postgres` is set but `DATABASE_URL` is missing. Remove `DATABASE_TYPE` (demo mode) or add the URL. |
| Account creation fails on the deployed site | Fixed: password hashing now uses portable `scrypt` (works on Node), not the Bun-only API. |
| Deploy succeeds but `/` is blank | Check the browser Network tab for asset status; ensure `outputDirectory: dist/client` and that `bun run build` succeeded (assets are 200). |
| Slow cold start / first load | Serverless cold start is normal. Warm with a scheduled ping or move to the self-hosted server. |