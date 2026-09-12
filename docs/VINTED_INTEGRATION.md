# VINTED_INTEGRATION.md

## Status: COLD INTEGRATION BOUNDARY — NOT LIVE

XFind does **not** scrape Vinted. There is no CAPTCHA bypass, no auth bypass,
no rate-limit circumvention, no private/stolen API and no access-control
violation anywhere in this codebase. The repository ships a fully-working
**mock marketplace provider** so the entire product is functional in
development while the Vinted adapter remains a clean, documented seam.

The UI never presents mock data as live Vinted data:

- mock listings carry `source = "mock"`, are badge-labelled
  "Dev data", and their detail page shows a disabled external CTA.
- a listing only exposes "View on Vinted" when `source === "vinted"`
  and a valid `sourceUrl` is present.
- the "LIVE" indicator is only rendered when a provider reports it is
  genuinely live.

## How to connect a real, compliant source

Implement `MarketplaceProvider` semantics is already there
(`src/server/providers/marketplace/`):

```ts
interface MarketplaceProvider {
  status(): ProviderStatusInfo
  searchListings(params) -> ProviderListing[]
  getListing(externalId) -> ProviderListing | null
  getNewListings(params) -> ProviderListing[]
  fetchListings(limit) -> ProviderListing[]
}
```

The built-in `VintedProvider` already implements this. It expects a **JSON
feed of normalized listings** at `VINTED_FEED_URL` (a partner/official feed,
not scraping output). Enable with `VINTED_PROVIDER_ENABLED=true`.

### Required credentials / config

| Variable | Purpose |
| --- | --- |
| `VINTED_PROVIDER_ENABLED` | flip to `true` once a feed is available |
| `VINTED_FEED_URL` | URL of the compliant feed: `{ "listings": [ { externalId, title, price, ... } ] }` |
| (optional) `VINTED_RATE_LIMIT_PER_MIN` | future: throttle ingestion calls |

### Example feed item

```json
{
  "externalId": "abc-123",
  "title": "Prada America's Cup Black 42",
  "price": 189,
  "currency": "EUR",
  "brand": "Prada",
  "model": "America's Cup",
  "category": "Sneakers",
  "size": "42",
  "condition": "very_good",
  "color": "Black",
  "images": ["https://.../1.jpg"],
  "url": "https://www.vinted.fr/items/abc-123",
  "publishedAt": "2026-09-12T10:00:00Z"
}
```

## Ingestion strategy

```
Feed poll (interval or admin-triggered)
  → IngestionService.run()
  → normalize (entity resolution, size normalization, https-only images)
  → deduplicate on (source, external_id)
  → upsert
  → match active saved searches → in-app notifications
  → ingestion_runs / ingestion_errors for observability
```

Design decisions that keep latency reducible later:

- listings carry `publishedAt / firstSeenAt / lastSeenAt` and `isActive`.
- ingestion is an idempotent upsert — re-runs are safe.
- providers are swappable one-for-one; nothing outside the provider layer knows
  about Vinted specifics (`source` field + provider adapter only).

## Fields mapped

All `ProviderListing` fields flow into the normalized `Listing` model
(`src/shared/types.ts`). Unknown/fuzzy fields are normalized by the ingestion
service (brand/model/category resolution against the catalogue, size
normalization, colour canonicalization).

## Rate limits

- The mock provider is bounded by its catalogue size.
- `VintedProvider` performs exactly one `GET VINTED_FEED_URL` per operation; no
  hammering by design.
- For a poll-based pipeline add a shared cache/poll interval; the ingestion
  worker already supports `INGESTION_INTERVAL_MS`.

## Limitations (honest)

1. No live worldwide feed exists in the codebase.
2. One-by-one listing mutation (sold/unavailable) is not tracked yet — the
   pipeline re-ingests and flips `isActive` on dedupe/refresh.
3. Seller/location coverage depends entirely on the feed.
4. Real-time "LIVE" behavior requires a streaming source; until then the UI
   polls new-listings counts and never pretends otherwise.

## Legal & compliance

- Respect Vinted's terms of service and robots/access instructions.
- Use only authorized or publicly-permitted data channels.
- Do not use stolen/private endpoints; do not evade CAPTCHA or anti-bot systems
  and do not exceed rate limits.
- XFind is a discovery/monitoring layer: buyers transact on Vinted itself.
- Seller data is displayed only as supplied by the compliant source and only as
  useful product context (location, seller name shown as-is).
- This document and the provider layer are intentionally conservative: if a
  permitted official data source becomes available, wiring it in removes the
  mock provider without any product rewrite.