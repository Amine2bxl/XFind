# SEARCH

One endpoint, one service: `GET /api/search` → `SearchService.search()`.

## Inputs

```text
/api/search?q=prada+america%27s+cup&size=42&maxPrice=250&sort=newest&page=1&perPage=24
```

| Param | Semantics |
| --- | --- |
| `q` | free text (see Intent detection below) |
| `brandId`, `categoryId`, `modelId` | explicit structured filters |
| `size` | normalized size (`42`, `us10`, `M`) |
| `minPrice`, `maxPrice` | price range (EUR default) |
| `condition` | comma or repeated params: `new_with_tags,very_good,...` |
| `color` | comma or repeated params |
| `gender` | `women | men | unisex | kids` |
| `sort` | `newest` (default) · `price_asc` · `price_desc` · `relevance` |
| `page`, `perPage` | pagination (cap 60) |

Validation: `src/shared/schemas.ts#searchQuerySchema` (zod, server-side).

## Intent detection (free text)

`NormalizationService.detectIntent(query, catalogContext)` parses:

```
"prada america's cup black 42" →
  { brand: "Prada", model: "America's Cup", color: "black", size: "42" }
```

Order of operations:

1. **Brand** — longest contiguous phrase match over canonical names + aliases.
2. **Model** — phrase match over models, restricted to the detected brand when known.
3. **Category** — phrase match over the category tree.
4. **Size** — numeric tokens in a plausible range (14–70) or `us N`; canonicalized.
5. **Color / gender** — canonical color aliases; gender vocabulary.
6. Remaining tokens → **keywords** (noise words such as "size", "eu", "eur" removed).

Everything is accent/case-insensitive via `normalizeText()`. The intent is
returned in the response and rendered as chips ("Interpreted as: …") in the UI.

## Query building

`SearchService.buildListingQuery()` converts the merged (detected + explicit)
intent into the portable `Database.searchListings` where-clauses:

- brand/category/model by id (or normalized name when no id resolves)
- size against `size_normalized`
- price `BETWEEN`
- condition/color `IN`
- gender `=`
- keywords → all tokens must appear in `title/description/brand/model/category`
  (LIKE with parameter-bound values)

Sorting is pushed into SQL: `price_asc/price_desc`, else
`published_at DESC NULLS LAST`.

## Relevance scoring

Deterministic, documented weights (`src/server/services/relevance.ts`):

| Factor | weight |
| --- | --- |
| brand | 25 |
| model | 25 |
| category | 10 |
| size | 10 |
| price in range | 5 |
| color | 5 |
| keyword overlap | 20 (≤ max) |

Score = matched weight / total weight → 0–100. Labels: 95+ Excellent · 80+
Strong · 60+ Good · else Partial. This is a **deterministic relevance score**,
not an AI confidence — the API and UI say as much.

**Known limitation:** `sort=relevance` currently re-orders the fetched page in
memory, which is correct within a page but can be suboptimal across pages.
A persisted per-listing relevance index (or SQL-side scoring) is the planned fix
(`ROADMAP.md`).

## Autocomplete

`GET /api/search/suggest?q=nike+air` returns grouped suggestions (brands,
models with brand prefix, categories). The search bar debounces (160 ms),
navigates with keyboard, and visually distinguishes brands in the dropdown.

## URL persistence

Filters live in the URL (via `toSearchParams/parseSearchParams`), so:
- refresh preserves the exact search;
- search state is shareable;
- pagination resets when filters change.

## Analytics hooks

Every search records a `search_events` row (query, detected factors, result
count, has-results). Zero-result searches and outclicks are tracked for the
admin analytics overview. Analytics failures are swallowed so they never break
search.