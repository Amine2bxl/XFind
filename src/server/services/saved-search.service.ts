import type { Listing, SavedSearch, SearchFilters } from '../../shared/types'
import type { Database } from '../db/database'
import type { SavedSearchInput, SavedSearchUpdate } from '../db/database'
import { normalizeText, tokenize } from './normalization'
import { SearchService } from './search.service'

export class SavedSearchService {
  constructor(
    private readonly db: Database,
    private readonly search: SearchService,
  ) {}

  async create(userId: string, input: SavedSearchInput): Promise<SavedSearch> {
    return this.db.createSavedSearch(userId, input)
  }

  async update(userId: string, id: string, fields: SavedSearchUpdate): Promise<SavedSearch | null> {
    return this.db.updateSavedSearch(id, userId, fields)
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db.deleteSavedSearch(id, userId)
  }

  async list(userId: string): Promise<Array<SavedSearch & { matchCount: number; lastMatchAt: string | null }>> {
    const searches = await this.db.listSavedSearches(userId)
    const results: Array<SavedSearch & { matchCount: number; lastMatchAt: string | null }> = []
    for (const search of searches) {
      results.push({
        ...search,
        matchCount: await this.countMatches(search),
        lastMatchAt: await this.db.lastMatchAt(userId, search.id),
      })
    }
    return results
  }

  async countMatches(search: SavedSearch): Promise<number> {
    const filters = this.toFilters(search)
    try {
      return await this.search.countMatches(filters)
    } catch {
      return 0
    }
  }

  toFilters(search: SavedSearch): SearchFilters {
    const structured = search.brandId || search.categoryId || search.modelId || search.minPrice !== null || search.maxPrice !== null
    return {
      q: structured ? search.query ?? undefined : search.query ?? undefined,
      brandId: search.brandId ?? undefined,
      categoryId: search.categoryId ?? undefined,
      modelId: search.modelId ?? undefined,
      minPrice: search.minPrice ?? undefined,
      maxPrice: search.maxPrice ?? undefined,
      condition: search.conditions.length > 0 ? search.conditions : undefined,
      color: search.colors.length > 0 ? search.colors : undefined,
      sort: 'newest',
      page: 1,
      perPage: 1,
    }
  }

  /**
   * Attribute-level matcher used at ingestion time — a single listing vs one
   * saved search. Deterministic and fast enough to run per new listing.
   */
  matches(listing: Listing, search: SavedSearch): boolean {
    if (search.brandId && listing.brandId !== search.brandId) return false
    if (search.categoryId && listing.categoryId !== search.categoryId) return false
    if (search.modelId && listing.modelId !== search.modelId) return false

    if (search.minPrice !== null && listing.price < search.minPrice) return false
    if (search.maxPrice !== null && listing.price > search.maxPrice) return false

    if (search.sizes.length > 0) {
      const listingSize = (listing.sizeNormalized ?? listing.size ?? '').toLowerCase()
      if (!search.sizes.some((s) => s.toLowerCase() === listingSize || listingSize.includes(s.toLowerCase()))) return false
    }

    if (search.conditions.length > 0 && !search.conditions.includes(listing.condition ?? '')) return false

    if (search.colors.length > 0) {
      const color = (listing.color ?? '').toLowerCase()
      if (!search.colors.some((c) => c.toLowerCase() === color)) return false
    }

    const text = normalizeText(
      [listing.title, listing.description, listing.brand, listing.model, listing.category].filter(Boolean).join(' '),
    )

    if (search.keywordsInclude.length > 0) {
      for (const kw of search.keywordsInclude) {
        if (!text.includes(normalizeText(kw))) return false
      }
    }
    if (search.keywordsExclude.length > 0) {
      for (const kw of search.keywordsExclude) {
        if (text.includes(normalizeText(kw))) return false
      }
    }
    if (search.query && !structuredFilters(search)) {
      const tokens = tokenize(search.query)
      for (const token of tokens) {
        if (!text.includes(token)) return false
      }
    }
    return true
  }
}

function structuredFilters(search: SavedSearch): boolean {
  return Boolean(
    search.brandId || search.categoryId || search.modelId ||
    search.minPrice !== null || search.maxPrice !== null ||
    search.sizes.length > 0 || search.conditions.length > 0 || search.colors.length > 0,
  )
}