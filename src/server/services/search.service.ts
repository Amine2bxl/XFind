import type { Listing, ListingWithRelevance, SearchFilters, SearchResponse, SearchIntent } from '../../shared/types'
import type { Database, ListingSearchQuery } from '../db/database'
import { CatalogService } from './catalog.service'
import { detectIntent, normalizeText, normalizeSize } from './normalization'
import { ListingRelevanceService } from './relevance'
import type { ProviderRegistry } from '../providers/marketplace'

export interface SearchDeps {
  db: Database
  catalog: CatalogService
  registry: ProviderRegistry
}

const DEFAULT_PER_PAGE = 24

export class SearchService {
  constructor(private readonly deps: SearchDeps) {}

  async search(filters: SearchFilters, userId: string | null): Promise<SearchResponse> {
    const started = performance.now()
    const ctx = await this.deps.catalog.intentContext()
    const intent = await this.resolveIntent(filters, ctx)
    const listingQuery = this.buildListingQuery(filters, intent)
    const { listings, total } = await this.deps.db.searchListings(listingQuery)

    const relevance = new ListingRelevanceService()
    const options = {
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    }

    let favoriteIds = new Set<string>()
    if (userId) {
      favoriteIds = await this.deps.db.favoriteIdsFor(
        userId,
        listings.map((l) => l.id),
      )
    }

    let scored: ListingWithRelevance[] = listings.map((listing) => {
      const relevanceBreakdown = relevance.score(listing, intent, options)
      return {
        ...listing,
        relevanceScore: relevanceBreakdown.score,
        relevance: relevanceBreakdown,
        isFavorite: favoriteIds.has(listing.id),
      }
    })

    if ((filters.sort ?? 'newest') === 'relevance') {
      scored = [...scored].sort((a, b) => b.relevanceScore - a.relevanceScore)
    }

    const page = filters.page ?? 1
    const perPage = filters.perPage ?? DEFAULT_PER_PAGE

    // Analytics (silent: analytics failures must never break search).
    await this.deps.db
      .recordSearchEvent({
        userId,
        query: filters.q ?? null,
        filters: {
          brand: intent.brand,
          model: intent.model,
          category: intent.category,
          size: intent.size,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          sort: filters.sort,
        },
        resultCount: total,
      })
      .catch(() => undefined)

    const status = this.deps.registry.status()
    const activeProvider = this.deps.registry.active()

    return {
      listings: scored,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      tookMs: Math.round(performance.now() - started),
      intent,
      providerStatus: {
        activeProvider: activeProvider.id,
        live: activeProvider.live,
        message: status[0].message,
      },
    }
  }

  private async resolveIntent(
    filters: SearchFilters,
    ctx: Awaited<ReturnType<SearchDeps['catalog']['intentContext']>>,
  ): Promise<SearchIntent> {
    const detected = filters.q
      ? detectIntent(filters.q, ctx)
      : {
          brand: null,
          brandId: null,
          model: null,
          modelId: null,
          category: null,
          categoryId: null,
          color: null,
          size: null,
          gender: null,
          keywords: [] as string[],
        }

    if (filters.brandId && filters.brandId !== detected.brandId) {
      const brand = ctx.brands.find((b) => b.id === filters.brandId)
      detected.brand = brand?.name ?? detected.brand
      detected.brandId = filters.brandId
    }
    if (filters.brand && !detected.brandId) {
      const brand = ctx.brands.find((b) => normalizeText(b.name) === normalizeText(filters.brand!))
      detected.brand = brand?.name ?? filters.brand
      detected.brandId = brand?.id ?? null
    }
    if (filters.categoryId) {
      detected.categoryId = filters.categoryId
      detected.category = ctx.categories.find((c) => c.id === filters.categoryId)?.name ?? detected.category
    }
    if (filters.modelId) {
      detected.modelId = filters.modelId
      detected.model = ctx.models.find((m) => m.id === filters.modelId)?.name ?? detected.model
    }
    if (filters.size) {
      const candidates = normalizeSize(filters.size)
      detected.size = candidates[0] ?? filters.size
    }
    if (filters.color && filters.color.length > 0) {
      detected.color = filters.color[0]
    }
    if (filters.gender) detected.gender = filters.gender

    return detected
  }

  private buildListingQuery(filters: SearchFilters, intent: SearchIntent): ListingSearchQuery {
    const sizes = intent.size ? [intent.size] : filters.size ? [filters.size] : undefined

    let brandNames: string[] | undefined
    if (intent.brand && !intent.brandId) {
      brandNames = [intent.brand]
    }

    const query: ListingSearchQuery = {
      brandId: intent.brandId ?? undefined,
      brandNames,
      categoryId: intent.categoryId ?? undefined,
      modelId: intent.modelId ?? undefined,
      modelName: intent.model && !intent.modelId ? intent.model : undefined,
      sizes,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      conditions: filters.condition,
      colors: filters.color,
      gender: intent.gender ?? undefined,
      keywords: intent.keywords.length > 0 ? intent.keywords : undefined,
      sort: filters.sort ?? 'newest',
      page: filters.page ?? 1,
      perPage: filters.perPage ?? DEFAULT_PER_PAGE,
    }
    return query
  }

  async countMatches(filters: SearchFilters): Promise<number> {
    const result = await this.search({ ...filters, page: 1, perPage: 1 }, null)
    return result.total
  }
}

export type { Listing }