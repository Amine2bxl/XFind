import { describe, expect, test } from 'bun:test'
import type { Listing, SearchIntent } from '../../shared/types'
import { ListingRelevanceService } from './relevance'

const baseListing: Listing = {
  id: 'l1',
  externalId: 'mock-1',
  source: 'mock',
  sourceUrl: 'https://mock.xfind.dev/items/mock-1',
  title: "America's Cup Black 42",
  description: null,
  brand: 'Prada',
  brandId: 'b-prada',
  category: 'Sneakers',
  categoryId: 'c-sneakers',
  model: "America's Cup",
  modelId: 'm-americas-cup',
  gender: 'women',
  size: '42',
  sizeNormalized: '42',
  color: 'Black',
  condition: 'very_good',
  price: 189,
  currency: 'EUR',
  images: [],
  sellerId: null,
  sellerName: 'vintage.find',
  location: 'Paris, France',
  publishedAt: new Date().toISOString(),
  firstSeenAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('ListingRelevanceService', () => {
  const service = new ListingRelevanceService()

  test('perfect explicit match scores high', () => {
    const intent: SearchIntent = {
      brand: 'Prada',
      brandId: 'b-prada',
      model: "America's Cup",
      modelId: 'm-americas-cup',
      category: null,
      categoryId: 'c-sneakers',
      color: 'black',
      size: '42',
      gender: null,
      keywords: [],
    }
    const breakdown = service.score(baseListing, intent, { minPrice: 100, maxPrice: 250 })
    expect(breakdown.score).toBeGreaterThanOrEqual(75)
    expect(breakdown.label).toBe('Strong match')
    expect(breakdown.matchedBrand).toBe(true)
    expect(breakdown.matchedModel).toBe(true)
    expect(breakdown.matchedSize).toBe(true)
    expect(breakdown.matchedPrice).toBe(true)
    expect(breakdown.matchedColor).toBe(true)
  })

  test('brand-only match scores moderately', () => {
    const intent: SearchIntent = {
      brand: 'Prada',
      brandId: 'b-prada',
      model: null,
      modelId: null,
      category: null,
      categoryId: null,
      color: null,
      size: null,
      gender: null,
      keywords: [],
    }
    const breakdown = service.score(baseListing, intent)
    expect(breakdown.matchedBrand).toBe(true)
    expect(breakdown.score).toBeLessThan(80)
  })

  test('no match scores lowest', () => {
    const intent: SearchIntent = {
      brand: null,
      brandId: null,
      model: null,
      modelId: null,
      category: null,
      categoryId: null,
      color: null,
      size: null,
      gender: null,
      keywords: [],
    }
    const breakdown = service.score(baseListing, intent)
    expect(breakdown.score).toBeGreaterThanOrEqual(0)
    expect(breakdown.matchedBrand).toBe(false)
  })

  test('is deterministic', () => {
    const intent: SearchIntent = {
      brand: 'Prada',
      brandId: 'b-prada',
      model: null,
      modelId: null,
      category: null,
      categoryId: null,
      color: null,
      size: '42',
      gender: null,
      keywords: ['black'],
    }
    const a = service.score(baseListing, intent)
    const b = service.score(baseListing, intent)
    expect(a.score).toBe(b.score)
  })
})