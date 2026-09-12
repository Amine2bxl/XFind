# ARCHITECTURE.md

## High-level flow

```
                                                      ┌───────────────────────────┐
   User in browser ── POST /api/auth →                  │  AuthProvider           │
      Register/Login                                    │  local | supabase       │
                                                       └────────────┬────────────┘
                                                                    │ session cookie
        ┌────────────────────────────────────────  UI (React SPA)  ◄┘
        ▼
   /api/*  (Hono on Bun)
        │
        ├─ GET  /api/search            → SearchService  → Database.searchListings
        │                                            └─ ListingRelevanceService → scores
        ├─ GET  /api/listings/:id      → ListingService
        ├─ GET  /api/brands, /api/categories, /api/search/suggest → CatalogService
        ├─ POST /api/favorites         → Database
        ├─ POST/PATCH /api/saved-searches → SavedSearchService → Database
        ├─ GET /api/notifications      → NotificationService
        ├─ POST /api/admin/ingestion/run → IngestionService
        └─ POST /api/outclick          → analytics
                                                       ┌───────────────────────────┐
   Ingestion worker (interval / admin trigger) ───────►│  MarketplaceProvider      │
      IngestionService.run()                           │  MockMarketplaceProvider  │
      ├─ provider.fetchListings()                      │  VintedProvider (boundary)│
      ├─ normalize (brand/model/category, sizes, imgs) └────────────┬──────────────┘
      ├─ deduplicate (source + external_id)                        │
      ├─ upsert listings ──────────────────────────────────────────►│ Database (SQL)
      ├─ matchSavedSearches() ──► in-app notifications              │
      └─ ingestion_runs / ingestion_errors                          │
                                                                    ▼
                                                          SQLite (dev) / Postgres (prod)
```

## Module boundaries

### 1. `src/shared`

Single source of truth for domain types (`Listing`, `Brand`, `SavedSearch`, …)
and request schemas (zod). Client and server both import from here — no drift.

### 2. Data access: `src/server/db`

- `driver.ts` — minimal async SQL interface (`all`, `get`, `run`, `exec`).
- `sqlite-driver.ts` — `bun:sqlite` implementation (development default),
  imported lazily so Node-focused bundles (Vercel functions) never resolve the
  `bun:` builtin at build time.
- `postgres-driver.ts` — `pg` implementation (production/Supabase); translates
  `?` placeholders to `$n` and runs on both Node and Bun runtimes.
- `database.ts` — the domain repository. This is the only file that touches SQL
  for business operations; SQL is kept portable (no PostgreSQL-only or
  SQLite-only syntax). Handles row↔domain mapping.
- `ddl.ts` — portable DDL shared by both backends.

**Why this shape:** swapping storage (SQLite → Supabase Postgres, or a future
managed Postgres) changes one driver + config, nothing else.

### 3. Auth: `src/server/auth`

`AuthProvider` interface: `register / login / authenticateToken / logout /
createSession`. Two implementations:

- `LocalAuthProvider` — hashed passwords (Bun `bcrypt`), sessions table, httpOnly cookie.
- `SupabaseAuthProvider` — uses Supabase Auth REST endpoints; session token is the
  Supabase access token, mirrored into the sessions table.

Routes attach the resolved user via `optionalAuth` middleware.

### 4. Marketplace providers: `src/server/providers/marketplace`

```ts
interface MarketplaceProvider {
  readonly id: string
  status(): ProviderStatusInfo
  searchListings(...): Promise<ProviderListing[]>
  getListing(externalId): Promise<ProviderListing | null>
  getNewListings(...): Promise<ProviderListing[]>
  fetchListings(limit): Promise<ProviderListing[]>
}
```

- `MockMarketplaceProvider` — deterministic seeded catalogue (clearly labelled).
- `VintedProvider` — cold integration boundary (no scraping, no bypass);
  reports `available: false` until a compliant feed is configured.

`ProviderRegistry.active()` returns the configured provider. The UI receives
`providerStatus` in every search response and only ever marks listings as live
Vinted lines when `source === 'vinted'`.

### 5. Services

| Service | Responsibility |
| --- | --- |
| `NormalizationService` utilities | accents/case normalization, tokenizing, size parsing, intent detection (brand→model→category→size→color) |
| `BrandService` | canonical brand catalogue, aliases, slugs, find/create/merge |
| `CatalogService` | cached brand/model/category context + autocomplete suggestions |
| `SearchService` | turn `SearchFilters` into an intent + DB query, score results, record analytics |
| `ListingRelevanceService` | deterministic 0–100 relevance breakdown |
| `ListingService` | detail (+related, outclick analytics, new-listing counting) |
| `SavedSearchService` | CRUD, match counts, `matches(listing, search)` used at ingestion time |
| `NotificationService` | in-app notifications, web push status (never faked) |
| `IngestionService` | provider → normalize → dedup → upsert → alerts; background worker |

### 6. Composition root: `src/server/context.ts`

Wires `Database + registry + provider + services` once, then `app.ts` receives the
context. This keeps routes thin and testable.

## Concurrency & caching

- Multiple requests share one SQLite database; `bun:sqlite` is synchronous and
  serialized per driver instance (adequate for development volumes).
- Catalog context is cached for 60s and invalidated on ingestion/seed changes.
- Search pagination: `page`/`perPage` with `LIMIT/OFFSET`; `relevance` sort is
  applied over the requested page (documented limitation, see `docs/SEARCH.md`).

## Security model

- All writes are validated server-side with zod.
- Sessions are opaque random tokens in an httpOnly cookie (`SameSite=Lax`, Secure
  in production).
- Admin endpoints verify `user.isAdmin` server-side.
- RLS on Supabase limits rows per authenticated user; service-role never runs in
  the browser.
- Only `https://` image URLs are stored.
- Rate limiting (in-memory) on auth endpoints; docs recommend a Redis-backed limiter
  for multi-instance deploys.