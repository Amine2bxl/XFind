import type { Database } from './db/database'
import { openDatabase } from './db'
import { config } from './config'
import { createProviderRegistry, ProviderRegistry } from './providers/marketplace'
import { createAuthProvider, AuthProvider } from './auth/auth'
import { BrandService } from './services/brand.service'
import { CatalogService } from './services/catalog.service'
import { SearchService } from './services/search.service'
import { ListingService } from './services/listing.service'
import { SavedSearchService } from './services/saved-search.service'
import { NotificationService } from './services/notification.service'
import { IngestionService } from './services/ingestion.service'
import { seedDatabase } from './seed/seed'
import type { SeedSummary } from '../shared/types'

export interface AppContext {
  db: Database
  registry: ProviderRegistry
  auth: AuthProvider
  catalog: CatalogService
  brands: BrandService
  search: SearchService
  listings: ListingService
  savedSearches: SavedSearchService
  notifications: NotificationService
  ingestion: IngestionService
}

export async function createContext(): Promise<AppContext> {
  const db = await openDatabase({
    type: config.database.type,
    sqlitePath: config.database.path,
    postgresUrl: config.database.url,
  })
  const registry = createProviderRegistry()
  const auth = createAuthProvider(db)
  const catalog = new CatalogService(db)
  const brands = new BrandService(db)
  const notifications = new NotificationService(db)
  const search = new SearchService({ db, catalog, registry })
  const savedSearches = new SavedSearchService(db, search)
  const listings = new ListingService(db, catalog, registry)
  const ingestion = new IngestionService(db, registry, brands, catalog, savedSearches, notifications)

  return { db, registry, auth, catalog, brands, search, listings, savedSearches, notifications, ingestion }
}

export async function seedIfEmpty(ctx: AppContext): Promise<SeedSummary | null> {
  const count = await ctx.db.countListings()
  if (count > 0) return null
  return seedDatabase(ctx.db, {
    brands: ctx.brands,
    catalog: ctx.catalog,
    ingestion: ctx.ingestion,
  })
}