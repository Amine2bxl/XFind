# ROADMAP.md

Priority-ordered. The core is functional end-to-end in development; these steps
harden it toward a real product.

## 1. Production database (first)

- [ ] Point `DATABASE_TYPE=postgres` at Supabase and apply
      `supabase/migrations/0001_init.sql`.
- [ ] Exercise the Postgres driver (`Bun.sql`) against Supabase: migrations,
      upserts, RLS behaviour under the service role.

## 2. Real Vinted data (clean integration)

- [ ] Establish a **compliant** data arrangement (official/partner feed or a
      data licence). Implement the Vinted adapter against that feed.
      Constraints are documented in `docs/VINTED_INTEGRATION.md`.
- [ ] Add ingestion scheduling (cron / queue) with retry and backoff.
- [ ] Add a marketplace proxy/cache to respect rate limits.

## 3. Search quality

- [ ] Move free-text matching to a dedicated search index behind a
      `SearchEngine` interface (Typesense/Meilisearch for trigram + typo
      tolerance), keeping the same `/api/search` contract.
- [ ] Cross-page deterministic ordering for `sort=relevance` (score in SQL or a
      persisted per-listing relevance index).
- [ ] Extend the alias/entity catalogue import from structured data.

## 4. Alerts

- [ ] Wire browser push (VAPID) end-to-end: subscribe → store → send.
- [ ] Email notifications via a transactional provider (user already stores the
      preference).
- [ ] Telegram/Discord sink behind a `NotificationChannel` abstraction.

## 5. Hardening

- [ ] Replace in-memory rate limiting with a shared store (e.g. Upstash/Redis).
- [ ] Server-side rendering / SEO meta for brand pages (or pre-rendered cache).
- [ ] E2E tests (Playwright) at 1440/1280/1024/768/375px.
- [ ] Structured logging and error reporting (Sentry).
- [ ] CI pipeline: typecheck → lint → tests → build.

## 6. Features

- [ ] Shared user collaboration (teams) — low priority.
- [ ] Analytics dashboards per user.
- [ ] Price-drop notifications on favorites.

## Out of scope (connect the architecture later, don't build now)

Automated buying, payment processing, AI authentication, resale prediction,
native mobile apps.