import { describe, expect, test } from 'bun:test'
import type { Brand, Category, Model } from '../../shared/types'
import { detectIntent, normalizeSize, normalizeText, tokenize } from './normalization'

const now = new Date().toISOString()

const brands: Brand[] = [
  {
    id: 'b-prada',
    name: 'Prada',
    normalizedName: 'prada',
    slug: 'prada',
    aliases: ['Prada Milano'],
    imageUrl: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'b-nike',
    name: 'Nike',
    normalizedName: 'nike',
    slug: 'nike',
    aliases: ['Nike Sportswear', 'Nike SB'],
    imageUrl: null,
    createdAt: now,
    updatedAt: now,
  },
]

const models: Model[] = [
  {
    id: 'm-americas-cup',
    brandId: 'b-prada',
    name: "America's Cup",
    normalizedName: "america's cup",
    aliases: ['Americas Cup', 'America Cup'],
    slug: 'prada-americas-cup',
    createdAt: now,
  },
  {
    id: 'm-airmax95',
    brandId: 'b-nike',
    name: 'Air Max 95',
    normalizedName: 'air max 95',
    aliases: ['AM95'],
    slug: 'nike-air-max-95',
    createdAt: now,
  },
  {
    id: 'm-dunk',
    brandId: 'b-nike',
    name: 'Dunk Low',
    normalizedName: 'dunk low',
    aliases: ['Dunk'],
    slug: 'nike-dunk-low',
    createdAt: now,
  },
]

const categories: Category[] = [
  { id: 'c-sneakers', name: 'Sneakers', slug: 'sneakers', parentId: null, level: 2, createdAt: now },
]

describe('normalizeText', () => {
  test('strips accents, punctuation and lowercases', () => {
    // Apostrophes and punctuation normalize to spaces; accents are stripped.
    expect(normalizeText('America\u2019s Cup')).toBe('america s cup')
    expect(normalizeText('NIKE')).toBe('nike')
    expect(normalizeText('  Arc\u2019teryx    Jacket ')).toBe('arc teryx jacket')
  })

  test('tokenizes', () => {
    expect(tokenize('Prada America\u2019s Cup black 42')).toEqual(['prada', 'america', 's', 'cup', 'black', '42'])
  })
})

describe('normalizeSize', () => {
  test('EU numeric', () => {
    expect(normalizeSize('42')).toEqual(['42'])
  })
  test('US size', () => {
    expect(normalizeSize('us 10')).toEqual(['us10'])
  })
  test('EU prefix', () => {
    expect(normalizeSize('EU 43')).toEqual(['43'])
  })
  test('letter size', () => {
    expect(normalizeSize('M')).toEqual(['M'])
  })
})

describe('detectIntent', () => {
  const ctx = { brands, models, categories }

  test("prada america's cup black 42", () => {
    const intent = detectIntent("prada america's cup black 42", ctx)
    expect(intent.brand).toBe('Prada')
    expect(intent.brandId).toBe('b-prada')
    expect(intent.model).toBe("America's Cup")
    expect(intent.modelId).toBe('m-americas-cup')
    expect(intent.color).toBe('black')
    expect(intent.size).toBe('42')
  })

  test('nike air max 95', () => {
    const intent = detectIntent('nike air max 95', ctx)
    expect(intent.brand).toBe('Nike')
    expect(intent.model).toBe('Air Max 95')
    expect(intent.keywords).toEqual([])
  })

  test('nike dunk size 42 drops noise word from keywords', () => {
    const intent = detectIntent('nike dunk size 42', ctx)
    expect(intent.brand).toBe('Nike')
    expect(intent.size).toBe('42')
    expect(intent.keywords).not.toContain('size')
  })

  test('unknown text becomes keywords', () => {
    const intent = detectIntent('handmade wool scarf', ctx)
    expect(intent.brand).toBeNull()
    expect(intent.keywords).toEqual(['handmade', 'wool', 'scarf'])
  })
})