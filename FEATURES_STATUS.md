# FEATURES_STATUS.md

Status legend: ✅ done · 🟡 partially done · 🔌 provider-dependent (clean adapter exists)

## Core product

| Feature | Status | Notes |
| --- | --- | --- |
| Landing page | ✅ | Search-first hero, popular brands, recent listings |
| **Dark mode** | ✅ | Full dark UI (premium, near-black surfaces, neutral ramp inverted) |
| **Live new-arrivals feed** | ✅ | Auto-refreshing scrolling ticker (`/api/live/feed`), new items slide in, pause on hover |
| Search page | ✅ | URL-persisted filters, debounce + autocomplete, sorting, pagination (load more) |
| Free-text intelligence | ✅ | Brand/model/category/size/color/gender detection from plain text |
| Filters | ✅ | Brand, category (tree), size, price, condition, colour, gender |
| Listing detail | ✅ | Gallery, attributes, relevance, save, related listings |
| "View on Vinted" | 🔌 | CTA active only for `source === 'vinted'` listings |
| Brands & brand pages | ✅ | Canonical catalogue, aliases, models, latest listings |
| Favorites | ✅ | Persistent, auth-scoped |

## Accounts & alerts

| Feature | Status | Notes |
| --- | --- | --- |
| Auth (local dev) | ✅ | Email/password, sessions, cookies |
| Auth (Supabase) | 🔌 | Provider implemented; requires Supabase env to go live |
| Saved searches | ✅ | Create/edit/pause/delete, match count, last match |
| Saved-search matching on ingestion | ✅ | Attribute matcher runs per ingested listing |
| In-app notifications | ✅ | Persistent, read/unread, bell badge |
| Web push | 🔌 | Status endpoint + settings UI; no fake subscriptions; needs VAPID keys + delivery wiring |
| Email notifications | 🟡 | Preference stored; no mail provider configured |

## Data engine

| Feature | Status | Notes |
| --- | --- | --- |
| MarketplaceProvider abstraction | ✅ | `searchListings/getListing/getNewListings/fetchListings` |
| Mock provider | ✅ | Deterministic seeded catalogue, labelled "Dev data" |
| Vinted provider boundary | 🔌 | Cold; documented at `docs/VINTED_INTEGRATION.md` |
| Ingestion pipeline | ✅ | normalize → dedupe (source+external id) → upsert → alerts |
| Brand system | ✅ | canonical name / normalized / slug / aliases, create + merge |
| Category system | ✅ | Hierarchical |
| Model system | ✅ | Brand-scoped, aliases |
| Search relevance score | ✅ | Deterministic 0–100 breakdown |
| Ingestion runs/errors tracking | ✅ | Admin page `/admin/ingestion` |
| "New listings" bar | ✅ | Polls `/api/live/new`; not faked with timers |
| LIVE indicator | ✅ | Only rendered when a provider is genuinely live |

## Analytics

| Feature | Status | Notes |
| --- | --- | --- |
| Search events | ✅ | rows in `search_events` |
| Zero-result searches | ✅ | counted |
| Outclicks | ✅ | `/api/outclick` |
| Admin analytics summary | ✅ | `/api/admin/analytics` |

## Engineering

| Item | Status | Notes |
| --- | --- | --- |
| TypeScript strict | ✅ | `bun run typecheck` clean |
| ESLint | ✅ | `bun run lint` clean |
| Unit tests | ✅ | normalization + relevance (Bun test) |
| Error / loading / empty states | ✅ | across search, detail, favorites, etc. |
| Rate limiting | 🟡 | In-memory, auth endpoints |
| RLS / Supabase migration | ✅ | `supabase/migrations/0001_init.sql` |
| SEO | 🟡 | Client-side title/meta; SSR/OG for brand pages pending |
| Security | ✅ | No secrets in client, server-side validation, session cookies |
| Vercel deploy | ✅ | Static SPA + `/api` function (Node runtime, `pg` driver); see `docs/DEPLOYMENT.md` |

## Deliberately not built (v1 scope)

- AI image authentication, fake-item detection, resale price prediction,
  automatic arbitrage/buying, payment processing, Telegram/Discord bots,
  mobile native apps. Architecture leaves room (`MarketplaceProvider`, alert
  channel abstraction) without implementing them now.