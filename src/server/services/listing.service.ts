import type { Listing, ListingWithRelevance } from '../../shared/types'
import type { Database } from '../db/database'
import { CatalogService } from './catalog.service'
import type { ProviderRegistry } from '../providers/marketplace'
import { detectIntent } from './normalization'
import { ListingRelevanceService } from './relevance'

export class ListingService {
  constructor(
    private readonly db: Database,
    private readonly catalog: CatalogService,
    private readonly registry: ProviderRegistry,
  ) {}

  async getListing(
    id: string,
    userId: string | null,
    query?: string | null,
  ): Promise<{ listing: Listing; isFavorite: boolean; relevance: ListingWithRelevance['relevance'] | null; providerStatus: ReturnType<ProviderRegistry['status']>[number] } | null> {
    const listing = await this.db.getListingById(id)
    if (!listing) return null

    const isFavorite = userId ? (await this.db.favoriteIdsFor(userId, [id])).has(id) : false

    let relevance: ListingWithRelevance['relevance'] | null = null
    if (query && query.trim()) {
      const ctx = await this.catalog.intentContext()
      const intent = detectIntent(query, ctx)
      const scorer = new ListingRelevanceService()
      relevance = scorer.score(listing, intent)
    }

    return { listing, isFavorite, relevance, providerStatus: this.registry.status()[0] }
  }

  async related(listing: Listing, limit = 8): Promise<Listing[]> {
    const filters = {
      sort: 'newest' as const,
      page: 1,
      perPage: limit,
      brandId: listing.brandId ?? undefined,
      categoryId: listing.categoryId ?? undefined,
    }
    return (await this.db.searchListings(filters)).listings.filter((l) => l.id !== listing.id).slice(0, limit)
  }

  async newListingsCountSince(since: string): Promise<number> {
    return this.db.countNewPublishedSince(since)
  }

  async newListingsSince(since: string, limit = 24): Promise<Listing[]> {
    return this.db.newListingsAvailableSince(since, limit)
  }

  async trackOutclick(userId: string | null, listingId: string): Promise<void> {
    await this.db.recordOutclick(userId, listingId).catch(() => undefined)
  }
}