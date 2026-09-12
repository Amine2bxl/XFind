import type { Brand, Suggestion } from '../../shared/types'
import type { Database } from '../db/database'
import type { IntentContext } from './normalization'

const CACHE_TTL_MS = 60_000

export class CatalogService {
  private ctxCache: { at: number; ctx: IntentContext } | null = null

  constructor(private readonly db: Database) {}

  async intentContext(force = false): Promise<IntentContext> {
    if (force) this.ctxCache = null
    if (this.ctxCache && Date.now() - this.ctxCache.at < CACHE_TTL_MS) {
      return this.ctxCache.ctx
    }
    const [brands, models, categories] = await Promise.all([
      this.db.listBrands({ limit: 500, offset: 0 }),
      this.db.listModels(),
      this.db.listCategories(),
    ])
    const ctx: IntentContext = { brands, models, categories }
    this.ctxCache = { at: Date.now(), ctx }
    return ctx
  }

  async invalidate(): Promise<void> {
    this.ctxCache = null
  }

  async suggestions(q: string, limit = 8): Promise<Suggestion[]> {
    const query = q.trim().toLowerCase()
    if (!query) return []

    const ctx = await this.intentContext()

    const brandMatches: Suggestion[] = []
    const modelMatches: Suggestion[] = []
    const categoryMatches: Suggestion[] = []

    for (const brand of ctx.brands) {
      const text = `${brand.name} ${brand.aliases.join(' ')}`.toLowerCase()
      if (text.includes(query)) {
        brandMatches.push({
          type: 'brand',
          label: brand.name,
          value: brand.name,
          slug: brand.slug,
        })
        if (brandMatches.length >= limit) break
      }
    }

    for (const model of ctx.models) {
      const brand = ctx.brands.find((b) => b.id === model.brandId)
      const brandName = brand?.name ?? ''
      const text = `${brandName} ${model.name} ${model.aliases.join(' ')}`.toLowerCase()
      if (text.includes(query)) {
        modelMatches.push({
          type: 'model',
          label: model.name,
          value: `${brandName} ${model.name}`.trim(),
          slug: model.slug,
          brandName,
        })
        if (modelMatches.length >= limit) break
      }
    }

    for (const category of ctx.categories) {
      const text = category.name.toLowerCase()
      if (text.includes(query)) {
        categoryMatches.push({
          type: 'category',
          label: category.name,
          value: category.name,
          slug: category.slug,
        })
      }
    }

    const grouped: Suggestion[] = [
      ...brandMatches.slice(0, 4),
      ...modelMatches.slice(0, 5),
      ...categoryMatches.slice(0, 2),
    ].slice(0, limit)

    return grouped
  }

  async latestListingsBrands(limit = 8): Promise<Brand[]> {
    return this.db.listBrands({ limit, offset: 0 })
  }
}

export type { IntentContext }