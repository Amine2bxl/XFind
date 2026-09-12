import type { Listing, RelevanceBreakdown, SearchIntent } from '../../shared/types'
import { normalizeText } from './normalization'

export interface RelevanceOptions {
  minPrice?: number
  maxPrice?: number
}

const WEIGHTS = {
  brand: 25,
  model: 25,
  category: 10,
  size: 10,
  price: 5,
  color: 5,
  keywords: 20,
} as const

const MAX_KEYWORD_POINTS = WEIGHTS.keywords

export function scoreLabel(score: number): string {
  if (score >= 95) return 'Excellent match'
  if (score >= 80) return 'Strong match'
  if (score >= 60) return 'Good match'
  return 'Partial match'
}

export class ListingRelevanceService {
  score(listing: Listing, intent: SearchIntent, options: RelevanceOptions = {}): RelevanceBreakdown {
    const listingText = normalizeText(`${listing.title} ${listing.brand ?? ''} ${listing.model ?? ''} ${listing.category ?? ''} ${listing.color ?? ''}`)

    let score = 0
    const fields = { matchedBrand: false, matchedModel: false, matchedCategory: false, matchedSize: false, matchedPrice: false, matchedColor: false, matchedKeywords: [] as string[] }

    // Brand
    if (intent.brandId) {
      if (listing.brandId && listing.brandId === intent.brandId) {
        score += WEIGHTS.brand
        fields.matchedBrand = true
      } else if (intent.brand && listing.brand && normalizeText(intent.brand) === normalizeText(listing.brand)) {
        score += WEIGHTS.brand
        fields.matchedBrand = true
      }
    } else if (intent.brand && listing.brand && listingText.includes(normalizeText(intent.brand))) {
      score += WEIGHTS.brand
      fields.matchedBrand = true
    }

    // Model
    if (intent.modelId) {
      if (listing.modelId && listing.modelId === intent.modelId) {
        score += WEIGHTS.model
        fields.matchedModel = true
      } else if (intent.model && listing.model && normalizeText(intent.model) === normalizeText(listing.model)) {
        score += WEIGHTS.model
        fields.matchedModel = true
      }
    } else if (intent.model && listing.model && listingText.includes(normalizeText(intent.model))) {
      score += WEIGHTS.model
      fields.matchedModel = true
    }

    // Category
    if (intent.categoryId && listing.categoryId === intent.categoryId) {
      score += WEIGHTS.category
      fields.matchedCategory = true
    } else if (intent.category && listing.category && normalizeText(intent.category) === normalizeText(listing.category)) {
      score += WEIGHTS.category
      fields.matchedCategory = true
    }

    // Size
    if (intent.size) {
      const listingSize = (listing.sizeNormalized ?? listing.size ?? '').toLowerCase()
      const intentSize = intent.size.toLowerCase()
      if (listingSize === intentSize || listingSize.includes(intentSize) || intentSize.includes(listingSize)) {
        score += WEIGHTS.size
        fields.matchedSize = true
      }
    }

    // Price
    const price = listing.price
    if (options.minPrice !== undefined && options.maxPrice !== undefined) {
      if (price >= options.minPrice && price <= options.maxPrice) {
        score += WEIGHTS.price
        fields.matchedPrice = true
      }
    } else if (options.maxPrice !== undefined && price <= options.maxPrice) {
      score += WEIGHTS.price
      fields.matchedPrice = true
    }

    // Color
    if (intent.color && listing.color && normalizeText(intent.color) === normalizeText(listing.color)) {
      score += WEIGHTS.color
      fields.matchedColor = true
    }

    // Keywords
    const keywords = intent.keywords.filter((k) => k.length > 0)
    if (keywords.length > 0) {
      const allLower = listingText.toLowerCase()
      const matched: string[] = []
      for (const kw of keywords) {
        if (allLower.includes(kw.toLowerCase())) {
          matched.push(kw)
        }
      }
      const pointsPerKeyword = MAX_KEYWORD_POINTS / keywords.length
      score += Math.round(matched.length * pointsPerKeyword)
      fields.matchedKeywords = matched
    }

    const totalMax = WEIGHTS.brand + WEIGHTS.model + WEIGHTS.category + WEIGHTS.size + WEIGHTS.price + WEIGHTS.color + MAX_KEYWORD_POINTS
    const finalScore = Math.min(100, Math.round((score / totalMax) * 100))
    return {
      score: finalScore,
      label: scoreLabel(finalScore),
      matchedBrand: fields.matchedBrand,
      matchedModel: fields.matchedModel,
      matchedCategory: fields.matchedCategory,
      matchedSize: fields.matchedSize,
      matchedPrice: fields.matchedPrice,
      matchedColor: fields.matchedColor,
      matchedKeywords: fields.matchedKeywords,
    }
  }
}