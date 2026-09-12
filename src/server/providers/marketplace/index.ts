import { config } from '../../config'
import { MarketplaceProvider, ProviderStatusInfo } from './MarketplaceProvider'
import { MockMarketplaceProvider } from './MockMarketplaceProvider'
import { VintedProvider } from './VintedProvider'

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderUnavailableError'
  }
}

export interface ProviderRegistry {
  active(): MarketplaceProvider
  all(): MarketplaceProvider[]
  status(): ProviderStatusInfo[]
}

export function createProviderRegistry(mockSeed = 20240115): ProviderRegistry {
  const mock = new MockMarketplaceProvider(mockSeed)
  const vinted = new VintedProvider(config.providers.vintedFeedUrl, config.providers.vintedEnabled)

  const allProviders: MarketplaceProvider[] = [mock, vinted]

  function active(): MarketplaceProvider {
    if (config.providers.vintedEnabled && config.providers.vintedFeedUrl) {
      return vinted
    }
    if (config.providers.mockEnabled) {
      return mock
    }
    throw new ProviderUnavailableError('No marketplace provider is enabled. Enable the mock provider for development.')
  }

  return {
    active,
    all: () => allProviders,
    status: () => allProviders.map((p) => p.status()),
  }
}

export type { MarketplaceProvider } from './MarketplaceProvider'