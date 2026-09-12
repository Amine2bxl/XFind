import { SEED_MODELS } from '../../seed/data/models'
import {
  MarketplaceProvider,
  MonitoringParams,
  ProviderListing,
  ProviderStatusInfo,
  SearchParams,
} from './MarketplaceProvider'

const SHOE_SIZES = ['37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL']
const JACKET_SIZES = ['44', '48', '50', '52', '54']
const UNISEX_SIZES = ['S', 'M', 'L', 'XL']
const ONE_SIZE = ['One size']

const COLOR_POOL = ['Black', 'White', 'Grey', 'Navy', 'Beige', 'Brown', 'Red', 'Green', 'Blue', 'Cream', 'Burgundy', 'Khaki']

const SELLERS = [
  'sneakerhead_92',
  'vintage.find',
  'julie.fashion',
  'amsterdam.closet',
  'the.reallist',
  'kicks.supply',
  'parispreme',
  'ben.archives',
  'larosamarket',
  'rarefinds.eu',
  'fabric.works',
  'thegoodkicks',
  'streetwear.hq',
  'nordic.wardrobe',
  'leo.vault',
  'mc.lookbook',
]

const LOCATIONS = [
  'Paris, France',
  'Brussels, Belgium',
  'Amsterdam, Netherlands',
  'Berlin, Germany',
  'Milan, Italy',
  'Madrid, Spain',
  'Lisbon, Portugal',
  'Lyon, France',
  'Antwerp, Belgium',
  'Munich, Germany',
]

interface Catalog {
  seed: number
  listings: ProviderListing[]
}

/** Deterministic PRNG so repeated ingestion runs produce identical catalogs. */
export function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(pool: T[], rnd: () => number): T {
  return pool[Math.floor(rnd() * pool.length)]
}

function pickWeighted<T>(pairs: Array<[T, number]>, rnd: () => number): T {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0)
  let roll = rnd() * total
  for (const [value, weight] of pairs) {
    roll -= weight
    if (roll <= 0) return value
  }
  return pairs[0][0]
}

const CONDITIONS: Array<[string, number]> = [
  ['very_good', 0.28],
  ['good', 0.3],
  ['new_without_tags', 0.2],
  ['new_with_tags', 0.12],
  ['satisfactory', 0.1],
]

function conditionLabel(condition: string): string {
  const map: Record<string, string> = {
    very_good: 'very good',
    good: 'good',
    new_without_tags: 'new without tags',
    new_with_tags: 'new with tags',
    satisfactory: 'satisfactory',
  }
  return map[condition] ?? condition
}

function genderForCategory(category: string, rnd: () => number): string | null {
  if (category === 'Bags') return pickWeighted([['women', 0.6], ['unisex', 0.4]], rnd)
  if (category === 'Caps') return pickWeighted([['men', 0.5], ['women', 0.25], ['unisex', 0.25]], rnd)
  return pickWeighted([['men', 0.42], ['women', 0.38], ['unisex', 0.2]], rnd)
}

function sizesFor(kind: string): string[] {
  switch (kind) {
    case 'shoes':
      return SHOE_SIZES
    case 'jackets':
      return JACKET_SIZES
    case 'accessory':
      return ONE_SIZE
    case 'unisex_S_M_L':
      return UNISEX_SIZES
    default:
      return APPAREL_SIZES
  }
}

export class MockMarketplaceProvider implements MarketplaceProvider {
  readonly id = 'mock'
  readonly displayName = 'Development marketplace'
  readonly live = false

  private readonly catalog: Catalog

  constructor(
    seed = 20240115,
    private readonly listingsPerModel = 6,
  ) {
    this.catalog = this.buildCatalog(seed)
  }

  status(): ProviderStatusInfo {
    return {
      id: this.id,
      name: this.displayName,
      available: true,
      live: false,
      message:
        'Mock development provider. Listings are clearly labelled development data, never presented as live Vinted data.',
    }
  }

  private buildCatalog(seed: number): Catalog {
    const rnd = mulberry32(seed)
    const now = Date.now()
    const listings: ProviderListing[] = []

    for (const [modelIndex, model] of SEED_MODELS.entries()) {
      const sizePool = sizesFor(model.sizes)
      const count = model.sizes === 'accessory' || model.sizes === 'shoes' ? Math.max(4, this.listingsPerModel) : Math.max(3, Math.floor(this.listingsPerModel * 0.8))
      for (let k = 0; k < count; k++) {
        const externalId = `mock-${modelIndex + 1}-${k + 1}-${Math.floor(rnd() * 1000)}`
        const color = pick(COLOR_POOL, rnd)
        const size = pick(sizePool, rnd)
        const condition = pickWeighted(CONDITIONS, rnd)
        const price = Math.max(8, Math.round((model.minPrice + rnd() * (model.maxPrice - model.minPrice)) / 5) * 5)
        const sellerId = `s-${modelIndex}-${k + 1}`
        const sellerName = pick(SELLERS, rnd)
        const location = pick(LOCATIONS, rnd)
        // Heavy weight towards recent listings so the "new listings" bar is demonstrable.
        const minutesAgo = pickWeighted(
          [
            [2, 0.08],
            [15, 0.07],
            [45, 0.12],
            [180, 0.2],
            [1440, 0.3],
            [4320, 0.23],
          ] as unknown as Array<[number, number]>,
          rnd,
        )
        const publishedAt = new Date(now - minutesAgo * 60_000).toISOString()
        const title = `${model.name} ${color}${model.sizes === 'shoes' ? ` ${size}` : ''}`.trim()
        const gender = genderForCategory(model.category, rnd)
        const images = [
          `https://picsum.photos/seed/${externalId}/600/450`,
          `https://picsum.photos/seed/${externalId}-2/600/450`,
          `https://picsum.photos/seed/${externalId}-3/600/450`,
        ]
        listings.push({
          externalId,
          title,
          description: `${model.brand} ${model.name}, size ${size}, ${conditionLabel(condition)}. Sold and shipped by the seller.`,
          brand: model.brand,
          category: model.category,
          model: model.name,
          gender,
          size,
          color,
          condition,
          price,
          currency: 'EUR',
          images,
          sellerId,
          sellerName,
          location,
          url: `https://mock.xfind.dev/items/${externalId}`,
          publishedAt,
        })
      }
    }
    return { seed, listings }
  }

  async searchListings(params: SearchParams): Promise<ProviderListing[]> {
    let result = this.catalog.listings
    const q = (params.query ?? '').trim().toLowerCase()
    if (q) {
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.brand ?? '').toLowerCase().includes(q) ||
          (l.model ?? '').toLowerCase().includes(q) ||
          (l.color ?? '').toLowerCase().includes(q),
      )
    }
    if (params.minPrice !== undefined) result = result.filter((l) => l.price >= params.minPrice!)
    if (params.maxPrice !== undefined) result = result.filter((l) => l.price <= params.maxPrice!)
    if (params.sort === 'price_asc') result = [...result].sort((a, b) => a.price - b.price)
    if (params.sort === 'price_desc') result = [...result].sort((a, b) => b.price - a.price)
    const offset = params.offset ?? 0
    return result.slice(offset, offset + (params.limit ?? 50))
  }

  async getListing(externalId: string): Promise<ProviderListing | null> {
    return this.catalog.listings.find((l) => l.externalId === externalId) ?? null
  }

  async getNewListings(params: MonitoringParams): Promise<ProviderListing[]> {
    const cutoff = params.since.toISOString()
    return this.catalog.listings
      .filter((l) => (l.publishedAt ?? '') >= cutoff)
      .sort((a, b) => (a.publishedAt ?? '').localeCompare(b.publishedAt ?? ''))
      .reverse()
      .slice(0, params.limit ?? 50)
  }

  async fetchListings(limit: number): Promise<ProviderListing[]> {
    return this.catalog.listings.slice(0, limit)
  }
}