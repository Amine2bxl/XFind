# INGESTION

## Pipeline

```
MarketplaceProvider (active provider)
   → IngestionService.run({provider?, limit?})
       1. fetchListings(limit)
       2. per listing:
            - normalize()
            - deduplicate by (source, external_id)
            - upsert (INSERT ... ON CONFLICT DO UPDATE)
            - classify new / updated / duplicate
       3. matchSavedSearches(newListings)
       4. finishIngestionRun → stats + latency
```

## Normalization

`IngestionService.normalize(raw, source)` (`src/server/services/ingestion.service.ts`):

- **Brand** — resolves against the canonical catalogue by normalized name; if
  absent, auto-creates via `BrandService.createBrand` (catalogue expands from
  data rather than hardcoded lists).
- **Category** — same resolution; auto-creates a top-level category if unknown.
- **Model** — resolved within the detected brand; auto-created with a unique
  slug when missing.
- **Size** — `normalizeSize()` produces canonical candidates (`42`, `us10`, `M`, …).
- **Images** — only `https://` URLs are stored, capped at 8.
- Character data is trimmed; timestamps stay ISO-8601 strings (portable ordering).

## Deduplication

Primary key on ingestion: `(source, external_id)` with a unique index
(`uq_listings_source_external`). Re-ingesting the same listing:

- existing row, identical `title`/`price` → counted as **duplicate**;
- existing row, changed fields → counted as **updated**, row refreshed;
- new → counted as **new** and pushed into the saved-search matcher.

`lastSeenAt` is refreshed on every upsert; `firstSeenAt` stays on first insert.

## Saved-search matching

`SavedSearchService.matches(listing, search)` compares attributes directly:

- brand / category / model id
- price range
- sizes, conditions, colours
- `keywordsInclude` / `keywordsExclude`
- free-text query tokens (when the search has no structured filters)

Dedup for notifications: `Database.hasNotified(user, listing, savedSearchId)`
prevents repeat alerts for the same match. Notifications only fire for users
with in-app notifications enabled.

## Observability

- `ingestion_runs`: provider, found/new/updated/duplicates/errors, latency, status.
- `ingestion_errors`: per-item failures with external id and message.
- `/api/admin/ingestion` + `/api/admin/overview` expose these (admin only).
- Each provider exposes a `status()` with `available` / `live` flags.

## Scheduling

- Development: `IngestionService.startWorker(INGESTION_INTERVAL_MS)` runs on
  server boot and blocks nothing (interval timer unref'd).
- Production: run it as a scheduled job (cron/queue) or invoke
  `POST /api/admin/ingestion/run`; the service is idempotent.

## Latency roadmap

Current pipeline is pull-based (poll interval). For near-real-time updates later:

- poll more frequently / stream via webhook push into the same `ingest()` path;
- swap the SQLite/text search for an indexed engine behind the `SearchEngine`
  seam — the ingestion and search contracts are unchanged.