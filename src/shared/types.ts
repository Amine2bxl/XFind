export type MarketplaceSource = 'mock' | 'vinted' | (string & {})

export type SortOption = 'relevance' | 'newest' | 'price_asc' | 'price_desc'

export const SORT_OPTIONS: SortOption[] = ['relevance', 'newest', 'price_asc', 'price_desc']

export const LISTING_CONDITIONS = [
  'new_with_tags',
  'new_without_tags',
  'very_good',
  'good',
  'satisfactory',
] as const

export type ListingCondition = (typeof LISTING_CONDITIONS)[number]

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  new_with_tags: 'New with tags',
  new_without_tags: 'New without tags',
  very_good: 'Very good',
  good: 'Good',
  satisfactory: 'Satisfactory',
}

export const GENDERS = ['women', 'men', 'unisex', 'kids'] as const
export type Gender = (typeof GENDERS)[number]

export interface Listing {
  id: string
  externalId: string
  source: MarketplaceSource
  sourceUrl: string
  title: string
  description: string | null
  brand: string | null
  brandId: string | null
  category: string | null
  categoryId: string | null
  model: string | null
  modelId: string | null
  gender: string | null
  size: string | null
  sizeNormalized: string | null
  color: string | null
  condition: string | null
  price: number
  currency: string
  images: string[]
  sellerId: string | null
  sellerName: string | null
  location: string | null
  publishedAt: string | null
  firstSeenAt: string
  lastSeenAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ListingWithRelevance extends Listing {
  relevanceScore: number
  relevance: RelevanceBreakdown
  isFavorite?: boolean
}

export interface RelevanceBreakdown {
  score: number
  matchedBrand: boolean
  matchedModel: boolean
  matchedCategory: boolean
  matchedSize: boolean
  matchedPrice: boolean
  matchedColor: boolean
  matchedKeywords: string[]
  label: string
}

export interface Brand {
  id: string
  name: string
  normalizedName: string
  slug: string
  aliases: string[]
  imageUrl: string | null
  createdAt: string
  updatedAt: string
  listingCount?: number
}

export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
  level: number
  createdAt: string
}

export interface CategoryNode extends Category {
  children: CategoryNode[]
}

export interface Model {
  id: string
  brandId: string | null
  name: string
  normalizedName: string
  aliases: string[]
  slug: string
  createdAt: string
}

export interface SavedSearch {
  id: string
  userId: string
  name: string
  query: string | null
  brandId: string | null
  categoryId: string | null
  modelId: string | null
  minPrice: number | null
  maxPrice: number | null
  currency: string
  sizes: string[]
  conditions: string[]
  colors: string[]
  keywordsInclude: string[]
  keywordsExclude: string[]
  isActive: boolean
  notificationEnabled: boolean
  notificationChannel: string
  createdAt: string
  updatedAt: string
  matchCount?: number
  lastMatchAt?: string | null
}

export type NotificationType = 'new_match' | 'system'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  listingId: string | null
  savedSearchId: string | null
  readAt: string | null
  createdAt: string
  listing?: Listing | null
}

export interface Favorite {
  userId: string
  listingId: string
  createdAt: string
  listing?: Listing
}

export interface SearchFilters {
  q?: string
  brandId?: string
  brand?: string
  categoryId?: string
  modelId?: string
  size?: string
  minPrice?: number
  maxPrice?: number
  condition?: string[]
  color?: string[]
  gender?: string
  sort?: SortOption
  page?: number
  perPage?: number
}

export interface SearchIntent {
  brand: string | null
  brandId: string | null
  model: string | null
  modelId: string | null
  category: string | null
  categoryId: string | null
  color: string | null
  size: string | null
  gender: string | null
  keywords: string[]
}

export interface SearchResponse {
  listings: ListingWithRelevance[]
  total: number
  page: number
  perPage: number
  totalPages: number
  tookMs: number
  intent: SearchIntent
  providerStatus: ProviderStatus
}

export interface Suggestion {
  type: 'brand' | 'model' | 'category'
  label: string
  value: string
  slug?: string
  brandName?: string
}

export interface ProviderStatus {
  activeProvider: string
  live: boolean
  message: string
}

export interface IngestionRun {
  id: string
  provider: string
  startedAt: string
  finishedAt: string | null
  status: 'running' | 'success' | 'error'
  listingsFound: number
  listingsNew: number
  listingsUpdated: number
  duplicates: number
  errors: number
  latencyMs: number | null
  meta: Record<string, unknown> | null
}

export interface IngestionErrorRecord {
  id: string
  runId: string | null
  provider: string
  externalId: string | null
  message: string
  createdAt: string
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  isAdmin: boolean
  notificationSettings: NotificationSettings
  createdAt: string
}

export interface NotificationSettings {
  inApp: boolean
  email: boolean
  push: boolean
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  inApp: true,
  email: false,
  push: false,
}

export interface PushConfigStatus {
  configured: boolean
  publicKey: string | null
  message: string
}

export interface ApiError {
  error: string
  message: string
  details?: unknown
}

export interface SeedSummary {
  brands: number
  categories: number
  models: number
  listings: number
}
