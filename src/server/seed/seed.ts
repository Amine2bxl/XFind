import { randomUUID } from 'node:crypto'
import type { Database } from '../db/database'
import type { BrandService } from '../services/brand.service'
import type { CatalogService } from '../services/catalog.service'
import type { IngestionService } from '../services/ingestion.service'
import { normalizeText, slugify } from '../services/normalization'
import { SEED_BRANDS } from './data/brands'
import { SEED_CATEGORIES } from './data/categories'
import { SEED_MODELS } from './data/models'
import type { SeedSummary } from '../../shared/types'

/**
 * Seeds the canonical brand/category/model catalog and then injects a batch of
 * clearly-labelled development listings through the ingestion pipeline.
 * Only used in development / demo setups with the mock provider.
 */
export async function seedDatabase(
  db: Database,
  services: { brands: BrandService; catalog: CatalogService; ingestion: IngestionService },
): Promise<SeedSummary> {
  const now = new Date().toISOString()

  const categorySlug = new Map<string, string>()
  for (const c of SEED_CATEGORIES) {
    const slug = slugify(c.name)
    const existing = await db.getCategoryBySlug(slug)
    if (!existing) {
      const parentSlug = c.parent ? categorySlug.get(c.parent) ?? slugify(c.parent) : null
      const parent = parentSlug ? await db.getCategoryBySlug(parentSlug) : null
      await db.insertCategory({
        id: randomUUID(),
        name: c.name,
        slug,
        parentId: parent?.id ?? null,
        level: parent ? parent.level + 1 : 0,
        createdAt: now,
      })
    }
    categorySlug.set(c.name, slug)
  }

  for (const b of SEED_BRANDS) {
    await services.brands.createBrand({ name: b.name, aliases: b.aliases })
  }

  const cats = await db.listCategories()
  const brandList = await db.listBrands({ limit: 200, offset: 0 })
  const brandByName = new Map(brandList.map((b) => [b.name.toLowerCase(), b]))
  const existingModels = await db.listModels()
  const seenModelKeys = new Set(existingModels.map((m) => m.name.toLowerCase()))

  for (const m of SEED_MODELS) {
    if (seenModelKeys.has(m.name.toLowerCase())) continue
    const brand = brandByName.get(m.brand.toLowerCase())
    await db.insertModel({
      id: randomUUID(),
      brandId: brand?.id ?? null,
      name: m.name,
      normalizedName: normalizeText(m.name),
      aliases: m.aliases ?? [],
      slug: `${brand ? `${slugify(brand.name)}-` : ''}${slugify(m.name)}-${randomUUID().slice(0, 6)}`,
      createdAt: now,
    })
    seenModelKeys.add(m.name.toLowerCase())
  }

  await services.catalog.invalidate()
  const run = await services.ingestion.run({ limit: 500 })
  await services.catalog.invalidate()

  return {
    brands: brandList.length,
    categories: cats.length,
    models: seenModelKeys.size,
    listings: run.listingsFound,
  }
}