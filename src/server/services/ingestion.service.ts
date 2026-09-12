import { randomUUID } from 'node:crypto'
import type { IngestionRun, Listing } from '../../shared/types'
import type { Database, ListingInput } from '../db/database'
import { BrandService } from './brand.service'
import { CatalogService } from './catalog.service'
import { normalizeSize, normalizeText, slugify } from './normalization'
import type { ProviderRegistry, MarketplaceProvider } from '../providers/marketplace'
import type { ProviderListing } from '../providers/marketplace/MarketplaceProvider'
import { SavedSearchService } from './saved-search.service'
import { NotificationService } from './notification.service'
import { config } from '../config'

export interface IngestionSummary extends IngestionRun {
  newListings: Listing[]
}

export class IngestionService {
  private workerRunning = false

  constructor(
    private readonly db: Database,
    private readonly registry: ProviderRegistry,
    private readonly brands: BrandService,
    private readonly catalog: CatalogService,
    private readonly savedSearches: SavedSearchService,
    private readonly notifications: NotificationService,
  ) {}

  async run(options: { provider?: string; limit?: number } = {}): Promise<IngestionSummary> {
    const provider = this.resolveProvider(options.provider)
    const started = Date.now()
    const run = await this.db.createIngestionRun(provider.id)
    const limit = options.limit ?? config.ingestion.batchSize
    const stats = {
      new: 0,
      updated: 0,
      duplicates: 0,
      errors: 0,
    }
    const newListings: Listing[] = []

    try {
      const fetched = await provider.fetchListings(limit)
      for (const raw of fetched) {
        try {
          const existing = await this.db.getListingByExternalId(provider.id, raw.externalId)
          const input = await this.normalize(raw, provider.id)
          const { listing } = await this.db.upsertListing(input)
          if (!existing) {
            stats.new += 1
            newListings.push(listing)
          } else {
            const hasChanged = existing.title !== raw.title || existing.price !== raw.price
            stats[hasChanged ? 'updated' : 'duplicates'] += 1
          }
        } catch (error) {
          stats.errors += 1
          await this.db
            .createIngestionError(run.id, provider.id, raw.externalId, error instanceof Error ? error.message : 'Unknown error')
            .catch(() => undefined)
        }
      }

      const latencyMs = Date.now() - started
      await this.db.finishIngestionRun(run.id, {
        status: 'success',
        listingsFound: fetched.length,
        listingsNew: stats.new,
        listingsUpdated: stats.updated,
        duplicates: stats.duplicates,
        errors: stats.errors,
        latencyMs,
        meta: { providerLive: provider.live },
      })

      await this.matchSavedSearches(newListings)

      const finished = (await this.db.latestIngestionRun(provider.id))!
      return { ...finished, newListings }
    } catch (error) {
      await this.db.finishIngestionRun(run.id, {
        status: 'error',
        listingsFound: 0,
        listingsNew: 0,
        listingsUpdated: 0,
        duplicates: 0,
        errors: 1,
        latencyMs: Date.now() - started,
        meta: { error: error instanceof Error ? error.message : 'Unknown error' },
      })
      const finished = (await this.db.latestIngestionRun(provider.id))!
      return { ...finished, newListings: [] }
    }
  }

  private resolveProvider(id: string | undefined): MarketplaceProvider {
    if (id) {
      const provider = this.registry.all().find((p) => p.id === id)
      if (provider) return provider
    }
    return this.registry.active()
  }

  /** Converts a provider listing into DB-ready normalized listing data. */
  private async normalize(raw: ProviderListing, source: string): Promise<ListingInput> {
    const ctx = await this.catalog.intentContext()

    let brandId: string | null = null
    if (raw.brand) {
      const brand = ctx.brands.find((b) => normalizeText(b.name) === normalizeText(raw.brand!))
      if (brand) {
        brandId = brand.id
      } else {
        const created = await this.brands.createBrand({ name: raw.brand })
        brandId = created.id
        this.catalog.invalidate().catch(() => undefined)
      }
    }

    let categoryId: string | null = null
    if (raw.category) {
      const category = ctx.categories.find((c) => normalizeText(c.name) === normalizeText(raw.category!))
      if (category) {
        categoryId = category.id
      } else {
        const now = new Date().toISOString()
        const id = randomUUID()
        await this.db.insertCategory({
          id,
          name: raw.category,
          slug: await this.uniqueCategorySlug(raw.category),
          parentId: null,
          level: 0,
          createdAt: now,
        })
        categoryId = id
        this.catalog.invalidate().catch(() => undefined)
      }
    }

    let modelId: string | null = null
    if (raw.model) {
      const model = ctx.models.find(
        (m) => m.name.toLowerCase() === raw.model!.toLowerCase() && (brandId ? m.brandId === brandId : true),
      )
      if (model) {
        modelId = model.id
      } else {
        const now = new Date().toISOString()
        const id = randomUUID()
        await this.db.insertModel({
          id,
          brandId,
          name: raw.model,
          normalizedName: normalizeText(raw.model),
          aliases: [],
          slug: `${brandId ? '' : 'u'}${slugify(raw.model)}-${id.slice(0, 6)}`,
          createdAt: now,
        })
        modelId = id
        this.catalog.invalidate().catch(() => undefined)
      }
    }

    const sizeCandidates = normalizeSize(raw.size ?? '')
    const sizeNormalized = sizeCandidates[0] ?? null

    // Only allow https external images.
    const images = raw.images.filter((u) => u.startsWith('https://')).slice(0, 8)

    return {
      id: randomUUID(),
      externalId: raw.externalId,
      source,
      sourceUrl: raw.url,
      title: raw.title,
      description: raw.description,
      brand: raw.brand,
      brandId,
      category: raw.category,
      categoryId,
      model: raw.model,
      modelId,
      gender: raw.gender,
      size: raw.size,
      sizeNormalized,
      color: raw.color,
      condition: raw.condition,
      price: raw.price,
      currency: raw.currency || 'EUR',
      images,
      sellerId: raw.sellerId,
      sellerName: raw.sellerName,
      location: raw.location,
      publishedAt: raw.publishedAt,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      isActive: true,
    }
  }

  private async uniqueCategorySlug(name: string): Promise<string> {
    let slug = slugify(name)
    let i = 2
    while (await this.db.getCategoryBySlug(slug)) {
      slug = `${slugify(name)}-${i}`
      i += 1
    }
    return slug
  }

  private async matchSavedSearches(newListings: Listing[]): Promise<void> {
    if (newListings.length === 0) return
    const searches = await this.db.listActiveSavedSearches()
    const notifiedUsers = new Map<string, Awaited<ReturnType<typeof this.db.getUserById>> | null>()
    let matchedCount = 0

    for (const search of searches) {
      for (const listing of newListings) {
        if (!this.savedSearches.matches(listing, search)) continue
        let user = notifiedUsers.get(search.userId)
        if (user === undefined) {
          user = await this.db.getUserById(search.userId)
          notifiedUsers.set(search.userId, user)
        }
        if (!user) {
          matchedCount += 1
          continue
        }
        const already = await this.db.hasNotified(user.id, listing.id, search.id)
        if (already) continue
        await this.notifications.notifyNewMatch(user, search.id, listing)
        matchedCount += 1
      }
    }
    void matchedCount
  }

  /**
   * Background ingestion worker. Only streams from providers that are actually
   * available; in development that is the mock provider, clearly labelled.
   */
  async startWorker(intervalMs = 5 * 60_000): Promise<void> {
    if (this.workerRunning) return
    this.workerRunning = true
    const tick = async () => {
      try {
        const active = this.registry.active()
        if (active.id === 'mock' || active.id === 'vinted') {
          await this.run({ limit: config.ingestion.batchSize })
        }
      } catch (error) {
        console.error('[ingestion-worker]', error instanceof Error ? error.message : error)
      }
    }
    await tick()
    const timer = setInterval(tick, intervalMs)
    timer.unref()
  }
}