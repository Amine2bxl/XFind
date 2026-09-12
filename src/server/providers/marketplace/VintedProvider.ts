import {
  MarketplaceProvider,
  MonitoringParams,
  ProviderListing,
  ProviderStatusInfo,
  SearchParams,
} from './MarketplaceProvider'

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderUnavailableError'
  }
}

/**
 * The Vinted integration boundary.
 *
 * XFind does NOT scrape Vinted, bypass CAPTCHA/anti-bot protections, use
 * private/stolen endpoints or violate access controls. See
 * docs/VINTED_INTEGRATION.md for the full status and options.
 *
 * This provider is a clean adapter around whatever *compliant* data source
 * becomes available (e.g. an official partnership feed or a data licence).
 * It expects a JSON feed of listing objects at VINTED_FEED_URL:
 *
 *   { "listings": [ { "externalId", "title", "price", ... } ] }
 *
 * When no feed is configured the provider reports itself as unavailable and
 * every data call raises ProviderUnavailableError — the rest of the
 * application keeps working with the mock provider.
 */
export class VintedProvider implements MarketplaceProvider {
  readonly id = 'vinted'
  readonly displayName = 'Vinted'
  readonly live = false

  constructor(
    private readonly feedUrl: string,
    private readonly enabled = false,
  ) {}

  status(): ProviderStatusInfo {
    if (!this.enabled || !this.feedUrl) {
      return {
        id: this.id,
        name: this.displayName,
        available: false,
        live: false,
        message:
          'Vinted integration is a cold integration point. No compliant data source is configured yet (VINTED_PROVIDER_ENABLED / VINTED_FEED_URL).',
      }
    }
    return {
      id: this.id,
      name: this.displayName,
      available: true,
      live: false,
      message: 'Configured but not yet validated by an ingestion run.',
    }
  }

  private async fetchFeed(): Promise<ProviderListing[]> {
    if (!this.enabled || !this.feedUrl) {
      throw new ProviderUnavailableError(
        'Vinted provider is not configured. Set VINTED_PROVIDER_ENABLED=true and VINTED_FEED_URL to a compliant listings feed.',
      )
    }
    const res = await fetch(this.feedUrl, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      throw new ProviderUnavailableError(`Vinted feed returned HTTP ${res.status}.`)
    }
    const body = (await res.json()) as { listings?: ProviderListing[] }
    if (!Array.isArray(body.listings)) {
      throw new ProviderUnavailableError('Vinted feed did not contain a "listings" array.')
    }
    return body.listings
  }

  async searchListings(params: SearchParams): Promise<ProviderListing[]> {
    const all = await this.fetchFeed()
    const q = (params.query ?? '').toLowerCase()
    return all
      .filter(
        (l) =>
          !q ||
          l.title.toLowerCase().includes(q) ||
          (l.brand ?? '').toLowerCase().includes(q) ||
          (l.model ?? '').toLowerCase().includes(q),
      )
      .slice((params.offset ?? 0), (params.offset ?? 0) + (params.limit ?? 50))
  }

  async getListing(externalId: string): Promise<ProviderListing | null> {
    const all = await this.fetchFeed()
    return all.find((l) => l.externalId === externalId) ?? null
  }

  async getNewListings(params: MonitoringParams): Promise<ProviderListing[]> {
    const all = await this.fetchFeed()
    const cutoff = params.since.toISOString()
    return all
      .filter((l) => (l.publishedAt ?? '') >= cutoff)
      .slice(0, params.limit ?? 50)
  }

  async fetchListings(limit: number): Promise<ProviderListing[]> {
    return (await this.fetchFeed()).slice(0, limit)
  }
}