export interface SearchParams {
  query?: string
  brand?: string
  category?: string
  size?: string
  minPrice?: number
  maxPrice?: number
  limit?: number
  offset?: number
  sort?: 'newest' | 'price_asc' | 'price_desc'
}

export interface MonitoringParams {
  since: Date
  limit?: number
}

/**
 * Normalized raw listing as returned by a marketplace provider, before the
 * ingestion pipeline applies its own normalization / deduplication.
 */
export interface ProviderListing {
  externalId: string
  title: string
  description: string | null
  brand: string | null
  category: string | null
  model: string | null
  gender: string | null
  size: string | null
  color: string | null
  condition: string | null
  price: number
  currency: string
  images: string[]
  sellerId: string | null
  sellerName: string | null
  location: string | null
  url: string
  publishedAt: string | null
}

export interface ProviderStatusInfo {
  id: string
  name: string
  available: boolean
  live: boolean
  message: string
}

export interface MarketplaceProvider {
  readonly id: string
  readonly displayName: string
  /** True only if this provider stream is genuinely live. */
  readonly live: boolean
  status(): ProviderStatusInfo
  searchListings(params: SearchParams): Promise<ProviderListing[]>
  getListing(externalId: string): Promise<ProviderListing | null>
  getNewListings(params: MonitoringParams): Promise<ProviderListing[]>
  /** Pull a batch of recent listings for ingestion. */
  fetchListings(limit: number): Promise<ProviderListing[]>
}