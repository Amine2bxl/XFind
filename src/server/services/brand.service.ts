import { randomUUID } from 'node:crypto'
import type { Brand } from '../../shared/types'
import type { Database } from '../db/database'
import { normalizeText, slugify } from './normalization'

export class BrandService {
  constructor(private readonly db: Database) {}

  async getById(id: string): Promise<Brand | null> {
    return this.db.getBrandById(id)
  }

  async getBySlug(slug: string): Promise<Brand | null> {
    return this.db.getBrandBySlug(slug)
  }

  async searchBrands(q: string, limit = 20): Promise<Brand[]> {
    const normalized = q.trim()
    if (!normalized) return this.db.listBrands({ limit, offset: 0 })
    const exact = await this.db.getBrandByNormalizedName(normalizeText(q))
    const results = await this.db.listBrands({ search: q, limit, offset: 0 })
    if (exact && !results.some((b) => b.id === exact.id)) {
      return [exact, ...results].slice(0, limit)
    }
    return results
  }

  async createBrand(input: { name: string; aliases?: string[]; imageUrl?: string | null }): Promise<Brand> {
    const name = input.name.trim()
    if (!name) throw new Error('Brand name is required')
    const existing = await this.db.getBrandByNormalizedName(normalizeText(input.name))
    if (existing) return existing
    const brand: Brand = {
      id: randomUUID(),
      name,
      normalizedName: normalizeText(input.name),
      slug: slugify(name),
      aliases: input.aliases ?? [],
      imageUrl: input.imageUrl ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await this.db.insertBrand(brand)
    return this.getById(brand.id) as Promise<Brand>
  }

  /** Find a brand by canonical name, slug, id or any alias (case/accents insensitive). */
  async findBrand(term: string): Promise<Brand | null> {
    const trimmed = term.trim()
    if (!trimmed) return null
    const byId = await this.db.getBrandById(trimmed)
    if (byId) return byId
    const bySlug = await this.db.getBrandBySlug(slugify(term))
    if (bySlug) return bySlug
    const byName = await this.db.getBrandByNormalizedName(normalizeText(term))
    if (byName) return byName
    const candidates = await this.db.listBrands({ limit: 50, offset: 0 })
    return (
      candidates.find(
        (b) => b.aliases.some((a) => normalizeText(a) === normalizeText(term)) || normalizeText(b.name) === normalizeText(term),
      ) ?? null
    )
  }

  async mergeBrands(targetId: string, sourceIds: string[]): Promise<Brand | null> {
    const target = await this.db.getBrandById(targetId)
    if (!target) return null
    const mergedAliases = new Set(target.aliases)
    for (const sourceId of sourceIds) {
      if (sourceId === targetId) continue
      const source = await this.db.getBrandById(sourceId)
      if (!source) continue
      source.aliases.forEach((a) => mergedAliases.add(a))
      mergedAliases.add(source.name)
      await this.db.updateBrand(sourceId, { aliases: [] })
      await this.db.deleteBrand(sourceId)
    }
    await this.db.updateBrand(targetId, { aliases: Array.from(mergedAliases) })
    return this.getById(targetId)
  }

  async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name)
    let slug = base
    let i = 2
    while (await this.db.getBrandBySlug(slug)) {
      slug = `${base}-${i}`
      i += 1
    }
    return slug
  }

  /** Simplify accented names for display. */
  static normalizeName(name: string): string {
    return normalizeText(name)
  }
}