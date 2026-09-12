import type { SqlDriver, SqlParam } from './driver'
import { DDL } from './ddl'
import type {
  AppNotification,
  Brand,
  Category,
  Favorite,
  IngestionErrorRecord,
  IngestionRun,
  Listing,
  MarketplaceSource,
  Model,
  NotificationSettings,
  SavedSearch,
  SortOption,
  UserProfile,
} from '../../shared/types'

export interface ListingInput {
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
}

export interface ListingSearchQuery {
  brandId?: string
  brandNames?: string[]
  categoryId?: string
  modelId?: string
  modelName?: string
  sizes?: string[]
  minPrice?: number
  maxPrice?: number
  conditions?: string[]
  colors?: string[]
  gender?: string
  keywords?: string[]
  sort: SortOption
  page: number
  perPage: number
}

export interface SearchListingsResult {
  listings: Listing[]
  total: number
}

interface ListingRow {
  id: string
  external_id: string
  source: string
  source_url: string
  title: string
  description: string | null
  brand: string | null
  brand_id: string | null
  category: string | null
  category_id: string | null
  model: string | null
  model_id: string | null
  gender: string | null
  size: string | null
  size_normalized: string | null
  color: string | null
  condition: string | null
  price: number
  currency: string
  images: string
  seller_id: string | null
  seller_name: string | null
  location: string | null
  published_at: string | null
  first_seen_at: string
  last_seen_at: string
  is_active: number
  created_at: string
  updated_at: string
}

interface BrandRow {
  id: string
  name: string
  normalized_name: string
  slug: string
  aliases: string
  image_url: string | null
  created_at: string
  updated_at: string
  listing_count?: number
}

interface CategoryRow {
  id: string
  name: string
  slug: string
  parent_id: string | null
  level: number
  created_at: string
}

interface ModelRow {
  id: string
  brand_id: string | null
  name: string
  normalized_name: string
  aliases: string
  slug: string
  created_at: string
}

interface SavedSearchRow {
  id: string
  user_id: string
  name: string
  query: string | null
  brand_id: string | null
  category_id: string | null
  model_id: string | null
  min_price: number | null
  max_price: number | null
  currency: string
  sizes: string
  conditions: string
  colors: string
  keywords_include: string
  keywords_exclude: string
  is_active: number
  notification_enabled: number
  notification_channel: string
  created_at: string
  updated_at: string
}

interface UserRow {
  id: string
  email: string
  password_hash: string | null
  name: string | null
  is_admin: number
  notification_settings: string
  created_at: string
  updated_at: string
}

interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  listing_id: string | null
  saved_search_id: string | null
  read_at: string | null
  created_at: string
}

interface IngestionRunRow {
  id: string
  provider: string
  started_at: string
  finished_at: string | null
  status: string
  listings_found: number
  listings_new: number
  listings_updated: number
  duplicates: number
  errors: number
  latency_ms: number | null
  meta: string | null
}

export interface BrandUpdate {
  name?: string
  normalizedName?: string
  slug?: string
  aliases?: string[]
  imageUrl?: string | null
}

export interface SavedSearchUpdate {
  name?: string
  query?: string | null
  brandId?: string | null
  categoryId?: string | null
  modelId?: string | null
  minPrice?: number | null
  maxPrice?: number | null
  currency?: string
  sizes?: string[]
  conditions?: string[]
  colors?: string[]
  keywordsInclude?: string[]
  keywordsExclude?: string[]
  isActive?: boolean
  notificationEnabled?: boolean
  notificationChannel?: string
}

export type SavedSearchInput = Omit<SavedSearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    externalId: row.external_id,
    source: row.source as MarketplaceSource,
    sourceUrl: row.source_url,
    title: row.title,
    description: row.description,
    brand: row.brand,
    brandId: row.brand_id,
    category: row.category,
    categoryId: row.category_id,
    model: row.model,
    modelId: row.model_id,
    gender: row.gender,
    size: row.size,
    sizeNormalized: row.size_normalized,
    color: row.color,
    condition: row.condition,
    price: Number(row.price),
    currency: row.currency,
    images: parseJson<string[]>(row.images, []),
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    location: row.location,
    publishedAt: row.published_at,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    slug: row.slug,
    aliases: parseJson<string[]>(row.aliases, []),
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    listingCount: row.listing_count !== undefined ? Number(row.listing_count) : undefined,
  }
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    level: row.level,
    createdAt: row.created_at,
  }
}

function rowToModel(row: ModelRow): Model {
  return {
    id: row.id,
    brandId: row.brand_id,
    name: row.name,
    normalizedName: row.normalized_name,
    aliases: parseJson<string[]>(row.aliases, []),
    slug: row.slug,
    createdAt: row.created_at,
  }
}

function rowToSavedSearch(row: SavedSearchRow): SavedSearch {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    query: row.query,
    brandId: row.brand_id,
    categoryId: row.category_id,
    modelId: row.model_id,
    minPrice: row.min_price === null ? null : Number(row.min_price),
    maxPrice: row.max_price === null ? null : Number(row.max_price),
    currency: row.currency,
    sizes: parseJson<string[]>(row.sizes, []),
    conditions: parseJson<string[]>(row.conditions, []),
    colors: parseJson<string[]>(row.colors, []),
    keywordsInclude: parseJson<string[]>(row.keywords_include, []),
    keywordsExclude: parseJson<string[]>(row.keywords_exclude, []),
    isActive: row.is_active === 1,
    notificationEnabled: row.notification_enabled === 1,
    notificationChannel: row.notification_channel,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToUser(row: UserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isAdmin: row.is_admin === 1,
    notificationSettings: parseJson<NotificationSettings>(row.notification_settings, {
      inApp: true,
      email: false,
      push: false,
    }),
    createdAt: row.created_at,
  }
}

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: (row.type as AppNotification['type']) ?? 'new_match',
    title: row.title,
    message: row.message,
    listingId: row.listing_id,
    savedSearchId: row.saved_search_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

export class Database {
  constructor(private readonly driver: SqlDriver) {}

  async migrate(): Promise<void> {
    const statements = DDL.split(';').map((s) => s.trim()).filter((s) => s.length > 0)
    for (const statement of statements) {
      await this.driver.exec(statement)
    }
  }

  // ------------------------------------------------------------------
  // Users & sessions
  // ------------------------------------------------------------------

  async createUser(input: {
    id: string
    email: string
    passwordHash: string | null
    name: string | null
  }): Promise<UserProfile> {
    const now = new Date().toISOString()
    await this.driver.run(
      `INSERT INTO users (id, email, password_hash, name, is_admin, notification_settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      [input.id, input.email, input.passwordHash, input.name, JSON.stringify({ inApp: true, email: false, push: false }), now, now],
    )
    const user = await this.getUserById(input.id)
    if (!user) throw new Error('Failed to create user')
    return user
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const row = await this.driver.get<UserRow>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
      [email],
    )
    return row ? rowToUser(row) : null
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const row = await this.driver.get<UserRow>('SELECT * FROM users WHERE id = ?', [id])
    return row ? rowToUser(row) : null
  }

  async getUserPasswordHash(id: string): Promise<string | null> {
    const row = await this.driver.get<{ password_hash: string | null }>(
      'SELECT password_hash FROM users WHERE id = ?',
      [id],
    )
    return row?.password_hash ?? null
  }

  async updateUser(id: string, fields: { name?: string; notificationSettings?: NotificationSettings }): Promise<UserProfile | null> {
    const sets: string[] = []
    const params: SqlParam[] = []
    if (fields.name !== undefined) {
      sets.push('name = ?')
      params.push(fields.name)
    }
    if (fields.notificationSettings !== undefined) {
      sets.push('notification_settings = ?')
      params.push(JSON.stringify(fields.notificationSettings))
    }
    if (sets.length === 0) return this.getUserById(id)
    sets.push('updated_at = ?')
    params.push(new Date().toISOString(), id)
    await this.driver.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params)
    return this.getUserById(id)
  }

  async setAdmin(id: string, isAdmin: boolean): Promise<void> {
    await this.driver.run('UPDATE users SET is_admin = ?, updated_at = ? WHERE id = ?', [
      isAdmin ? 1 : 0,
      new Date().toISOString(),
      id,
    ])
  }

  async createSession(token: string, userId: string, ttlDays: number): Promise<void> {
    const now = new Date()
    const expires = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
    await this.driver.run('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [
      token,
      userId,
      now.toISOString(),
      expires,
    ])
  }

  async getSession(token: string): Promise<{ token: string; userId: string; expiresAt: string } | null> {
    const row = await this.driver.get<{ token: string; user_id: string; expires_at: string }>(
      'SELECT token, user_id, expires_at FROM sessions WHERE token = ?',
      [token],
    )
    if (!row) return null
    if (row.expires_at <= new Date().toISOString()) {
      await this.deleteSession(token)
      return null
    }
    return { token: row.token, userId: row.user_id, expiresAt: row.expires_at }
  }

  async deleteSession(token: string): Promise<void> {
    await this.driver.run('DELETE FROM sessions WHERE token = ?', [token])
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.driver.run('DELETE FROM sessions WHERE user_id = ?', [userId])
  }

  // ------------------------------------------------------------------
  // Brands
  // ------------------------------------------------------------------

  async insertBrand(input: Omit<Brand, 'listingCount' | 'createdAt'> & { createdAt: string }): Promise<void> {
    await this.driver.run(
      `INSERT INTO brands (id, name, normalized_name, slug, aliases, image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.id, input.name, input.normalizedName, input.slug, JSON.stringify(input.aliases), input.imageUrl, input.createdAt, input.createdAt],
    )
  }

  async getBrandById(id: string): Promise<Brand | null> {
    const row = await this.driver.get<BrandRow>(
      `SELECT b.*, (SELECT COUNT(*) FROM listings l WHERE l.brand_id = b.id AND l.is_active = 1) AS listing_count
       FROM brands b WHERE b.id = ?`,
      [id],
    )
    return row ? rowToBrand(row) : null
  }

  async getBrandBySlug(slug: string): Promise<Brand | null> {
    const row = await this.driver.get<BrandRow>(
      `SELECT b.*, (SELECT COUNT(*) FROM listings l WHERE l.brand_id = b.id AND l.is_active = 1) AS listing_count
       FROM brands b WHERE b.slug = ?`,
      [slug],
    )
    return row ? rowToBrand(row) : null
  }

  async getBrandByNormalizedName(name: string): Promise<Brand | null> {
    const row = await this.driver.get<BrandRow>(
      `SELECT b.*, (SELECT COUNT(*) FROM listings l WHERE l.brand_id = b.id AND l.is_active = 1) AS listing_count
       FROM brands b WHERE b.normalized_name = ?`,
      [name],
    )
    return row ? rowToBrand(row) : null
  }

  async listBrands(params: { search?: string; limit: number; offset: number }): Promise<Brand[]> {
    const where: string[] = []
    const values: SqlParam[] = []
    if (params.search) {
      const like = `%${params.search.toLowerCase()}%`
      where.push('(LOWER(b.name) LIKE ? OR LOWER(b.normalized_name) LIKE ? OR LOWER(b.aliases) LIKE ?)')
      values.push(like, like, like)
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const rows = await this.driver.all<BrandRow>(
      `SELECT b.*, (SELECT COUNT(*) FROM listings l WHERE l.brand_id = b.id AND l.is_active = 1) AS listing_count
       FROM brands b ${whereSql}
       ORDER BY b.name ASC LIMIT ? OFFSET ?`,
      [...values, params.limit, params.offset],
    )
    return rows.map(rowToBrand)
  }

  async countBrands(search?: string): Promise<number> {
    const where: string[] = []
    const values: SqlParam[] = []
    if (search) {
      const like = `%${search.toLowerCase()}%`
      where.push('(LOWER(name) LIKE ? OR LOWER(normalized_name) LIKE ? OR LOWER(aliases) LIKE ?)')
      values.push(like, like, like)
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const row = await this.driver.get<{ c: number }>(`SELECT COUNT(*) AS c FROM brands ${whereSql}`, values)
    return row?.c ?? 0
  }

  async updateBrand(id: string, fields: BrandUpdate): Promise<Brand | null> {
    const sets: string[] = []
    const params: SqlParam[] = []
    if (fields.name !== undefined) {
      sets.push('name = ?')
      params.push(fields.name)
    }
    if (fields.normalizedName !== undefined) {
      sets.push('normalized_name = ?')
      params.push(fields.normalizedName)
    }
    if (fields.slug !== undefined) {
      sets.push('slug = ?')
      params.push(fields.slug)
    }
    if (fields.imageUrl !== undefined) {
      sets.push('image_url = ?')
      params.push(fields.imageUrl)
    }
    if (fields.aliases !== undefined) {
      sets.push('aliases = ?')
      params.push(JSON.stringify(fields.aliases))
    }
    if (sets.length === 0) return this.getBrandById(id)
    sets.push('updated_at = ?')
    params.push(new Date().toISOString(), id)
    await this.driver.run(`UPDATE brands SET ${sets.join(', ')} WHERE id = ?`, params)
    return this.getBrandById(id)
  }

  async deleteBrand(id: string): Promise<void> {
    await this.driver.run('UPDATE listings SET brand_id = NULL, brand = NULL WHERE brand_id = ?', [id])
    await this.driver.run('UPDATE models SET brand_id = NULL WHERE brand_id = ?', [id])
    await this.driver.run('DELETE FROM brands WHERE id = ?', [id])
  }

  // ------------------------------------------------------------------
  // Categories
  // ------------------------------------------------------------------

  async insertCategory(input: Omit<Category, 'createdAt'> & { createdAt: string }): Promise<void> {
    await this.driver.run(
      'INSERT INTO categories (id, name, slug, parent_id, level, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [input.id, input.name, input.slug, input.parentId, input.level, input.createdAt],
    )
  }

  async listCategories(): Promise<Category[]> {
    const rows = await this.driver.all<CategoryRow>('SELECT * FROM categories ORDER BY level ASC, name ASC')
    return rows.map(rowToCategory)
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const row = await this.driver.get<CategoryRow>('SELECT * FROM categories WHERE slug = ?', [slug])
    return row ? rowToCategory(row) : null
  }

  async getCategoryById(id: string): Promise<Category | null> {
    const row = await this.driver.get<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id])
    return row ? rowToCategory(row) : null
  }

  // ------------------------------------------------------------------
  // Models
  // ------------------------------------------------------------------

  async insertModel(input: Omit<Model, 'createdAt'> & { createdAt: string }): Promise<void> {
    await this.driver.run(
      'INSERT INTO models (id, brand_id, name, normalized_name, aliases, slug, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [input.id, input.brandId, input.name, input.normalizedName, JSON.stringify(input.aliases), input.slug, input.createdAt],
    )
  }

  async listModels(brandId?: string): Promise<Model[]> {
    const values: SqlParam[] = []
    const where = brandId ? 'WHERE brand_id = ?' : ''
    if (brandId) values.push(brandId)
    const rows = await this.driver.all<ModelRow>(
      `SELECT * FROM models ${where} ORDER BY name ASC`,
      values,
    )
    return rows.map(rowToModel)
  }

  async searchModelsLike(q: string, brandId?: string, limit = 8): Promise<Model[]> {
    const like = `%${q.toLowerCase()}%`
    const where = ['(LOWER(name) LIKE ? OR LOWER(normalized_name) LIKE ? OR LOWER(aliases) LIKE ?)']
    const values: SqlParam[] = [like, like, like]
    if (brandId) {
      where.push('brand_id = ?')
      values.push(brandId)
    }
    const rows = await this.driver.all<ModelRow>(
      `SELECT * FROM models WHERE ${where.join(' AND ')} ORDER BY name ASC LIMIT ?`,
      [...values, limit],
    )
    return rows.map(rowToModel)
  }

  async getModelById(id: string): Promise<Model | null> {
    const row = await this.driver.get<ModelRow>('SELECT * FROM models WHERE id = ?', [id])
    return row ? rowToModel(row) : null
  }

  // ------------------------------------------------------------------
  // Listings
  // ------------------------------------------------------------------

  async upsertListing(input: ListingInput): Promise<{ listing: Listing; created: boolean }> {
    const now = new Date().toISOString()
    await this.driver.run(
      `INSERT INTO listings (
        id, external_id, source, source_url, title, description, brand, brand_id, category, category_id,
        model, model_id, gender, size, size_normalized, color, condition, price, currency, images,
        seller_id, seller_name, location, published_at, first_seen_at, last_seen_at, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source, external_id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        brand = excluded.brand,
        brand_id = excluded.brand_id,
        category = excluded.category,
        category_id = excluded.category_id,
        model = excluded.model,
        model_id = excluded.model_id,
        gender = excluded.gender,
        size = excluded.size,
        size_normalized = excluded.size_normalized,
        color = excluded.color,
        condition = excluded.condition,
        price = excluded.price,
        currency = excluded.currency,
        images = excluded.images,
        seller_id = excluded.seller_id,
        seller_name = excluded.seller_name,
        location = excluded.location,
        published_at = excluded.published_at,
        last_seen_at = excluded.last_seen_at,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at`,
      [
        input.id,
        input.externalId,
        input.source,
        input.sourceUrl,
        input.title,
        input.description,
        input.brand,
        input.brandId,
        input.category,
        input.categoryId,
        input.model,
        input.modelId,
        input.gender,
        input.size,
        input.sizeNormalized,
        input.color,
        input.condition,
        input.price,
        input.currency,
        JSON.stringify(input.images),
        input.sellerId,
        input.sellerName,
        input.location,
        input.publishedAt,
        input.firstSeenAt,
        input.lastSeenAt,
        input.isActive ? 1 : 0,
        now,
        now,
      ],
    )
    const row = await this.driver.get<ListingRow>(
      'SELECT * FROM listings WHERE source = ? AND external_id = ?',
      [input.source, input.externalId],
    )
    if (!row) throw new Error('Insert failed')
    return { listing: rowToListing(row), created: row.first_seen_at === input.firstSeenAt }
  }

  async getListingById(id: string): Promise<Listing | null> {
    const row = await this.driver.get<ListingRow>('SELECT * FROM listings WHERE id = ?', [id])
    return row ? rowToListing(row) : null
  }

  async getListingByExternalId(source: string, externalId: string): Promise<Listing | null> {
    const row = await this.driver.get<ListingRow>(
      'SELECT * FROM listings WHERE source = ? AND external_id = ?',
      [source, externalId],
    )
    return row ? rowToListing(row) : null
  }

  async searchListings(query: ListingSearchQuery): Promise<SearchListingsResult> {
    const where: string[] = ['l.is_active = 1']
    const params: SqlParam[] = []

    if (query.brandId) {
      where.push('l.brand_id = ?')
      params.push(query.brandId)
    }
    if (query.brandNames && query.brandNames.length > 0) {
      const marks = query.brandNames.map(() => '?').join(', ')
      where.push(`(LOWER(COALESCE(l.brand, '')) IN (${marks}))`)
      params.push(...query.brandNames.map((b) => b.toLowerCase()))
    }
    if (query.categoryId) {
      where.push('l.category_id = ?')
      params.push(query.categoryId)
    }
    if (query.modelId) {
      where.push('l.model_id = ?')
      params.push(query.modelId)
    } else if (query.modelName) {
      where.push('(LOWER(COALESCE(l.model, \'\')) = ? OR LOWER(l.title) LIKE ?)')
      params.push(query.modelName.toLowerCase(), `%${query.modelName.toLowerCase()}%`)
    }
    if (query.sizes && query.sizes.length > 0) {
      const marks = query.sizes.map(() => '?').join(', ')
      where.push(`(l.size_normalized IN (${marks}) OR LOWER(COALESCE(l.size, '')) IN (${marks}))`)
      params.push(...query.sizes, ...query.sizes)
    }
    if (query.minPrice !== undefined) {
      where.push('l.price >= ?')
      params.push(query.minPrice)
    }
    if (query.maxPrice !== undefined) {
      where.push('l.price <= ?')
      params.push(query.maxPrice)
    }
    if (query.conditions && query.conditions.length > 0) {
      const marks = query.conditions.map(() => '?').join(', ')
      where.push(`l.condition IN (${marks})`)
      params.push(...query.conditions)
    }
    if (query.colors && query.colors.length > 0) {
      const marks = query.colors.map(() => '?').join(', ')
      where.push(`(LOWER(COALESCE(l.color, '')) IN (${marks}))`)
      params.push(...query.colors.map((c) => c.toLowerCase()))
    }
    if (query.gender) {
      where.push('LOWER(COALESCE(l.gender, \'\')) = ?')
      params.push(query.gender.toLowerCase())
    }
    if (query.keywords && query.keywords.length > 0) {
      const keywordGroups = query.keywords.map(
        () =>
          `(LOWER(l.title) LIKE ? OR LOWER(COALESCE(l.description, '')) LIKE ? OR LOWER(COALESCE(l.brand, '')) LIKE ? OR LOWER(COALESCE(l.model, '')) LIKE ? OR LOWER(COALESCE(l.category, '')) LIKE ?)`,
      )
      where.push(`(${keywordGroups.join(' AND ')})`)
      for (const kw of query.keywords) {
        const like = `%${kw.toLowerCase()}%`
        params.push(like, like, like, like, like)
      }
    }

    const whereSql = `WHERE ${where.join(' AND ')}`

    const countRow = await this.driver.get<{ c: number }>(`SELECT COUNT(*) AS c FROM listings l ${whereSql}`, params)
    const total = countRow?.c ?? 0

    const orderBy =
      query.sort === 'price_asc'
        ? 'l.price ASC'
        : query.sort === 'price_desc'
          ? 'l.price DESC'
          : 'CASE WHEN l.published_at IS NULL THEN 1 ELSE 0 END ASC, l.published_at DESC'

    const offset = (query.page - 1) * query.perPage
    const rows = await this.driver.all<ListingRow>(
      `SELECT l.* FROM listings l ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, query.perPage, offset],
    )

    return { listings: rows.map(rowToListing), total }
  }

  async countListings(): Promise<number> {
    const row = await this.driver.get<{ c: number }>('SELECT COUNT(*) AS c FROM listings')
    return row?.c ?? 0
  }

  async newListingsAvailableSince(since: string, limit = 50): Promise<Listing[]> {
    const rows = await this.driver.all<ListingRow>(
      `SELECT * FROM listings
       WHERE is_active = 1 AND first_seen_at > ?
       ORDER BY first_seen_at DESC LIMIT ?`,
      [since, limit],
    )
    return rows.map(rowToListing)
  }

  async countNewPublishedSince(since: string): Promise<number> {
    const row = await this.driver.get<{ c: number }>(
      'SELECT COUNT(*) AS c FROM listings WHERE is_active = 1 AND COALESCE(published_at, first_seen_at) > ?',
      [since],
    )
    return row?.c ?? 0
  }

  /** Newest published listings, for the live feed / ticker. */
  async latestPublished(limit = 40): Promise<Listing[]> {
    const rows = await this.driver.all<ListingRow>(
      `SELECT * FROM listings
       WHERE is_active = 1
       ORDER BY (published_at IS NULL) ASC, COALESCE(published_at, first_seen_at) DESC
       LIMIT ?`,
      [limit],
    )
    return rows.map(rowToListing)
  }

  // ------------------------------------------------------------------
  // Favorites
  // ------------------------------------------------------------------

  async addFavorite(userId: string, listingId: string): Promise<void> {
    await this.driver.run(
      'INSERT OR IGNORE INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, ?)',
      [userId, listingId, new Date().toISOString()],
    )
  }

  async removeFavorite(userId: string, listingId: string): Promise<void> {
    await this.driver.run('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId])
  }

  async listFavorites(userId: string, limit = 60): Promise<Favorite[]> {
    const rows = await this.driver.all<{ created_at: string; l: ListingRow }>(
      `SELECT f.created_at, l.* FROM favorites f
       JOIN listings l ON l.id = f.listing_id
       WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT ?`,
      [userId, limit],
    )
    return rows.map((r) => ({
      userId,
      listingId: r.l.id,
      createdAt: r.created_at,
      listing: rowToListing(r.l),
    }))
  }

  async favoriteIdsFor(userId: string, listingIds: string[]): Promise<Set<string>> {
    if (listingIds.length === 0) return new Set()
    const marks = listingIds.map(() => '?').join(', ')
    const rows = await this.driver.all<{ listing_id: string }>(
      `SELECT listing_id FROM favorites WHERE user_id = ? AND listing_id IN (${marks})`,
      [userId, ...listingIds],
    )
    return new Set(rows.map((r) => r.listing_id))
  }

  async countFavorites(userId: string): Promise<number> {
    const row = await this.driver.get<{ c: number }>(
      'SELECT COUNT(*) AS c FROM favorites WHERE user_id = ?',
      [userId],
    )
    return row?.c ?? 0
  }

  // ------------------------------------------------------------------
  // Saved searches
  // ------------------------------------------------------------------

  async createSavedSearch(userId: string, input: SavedSearchInput): Promise<SavedSearch> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    await this.driver.run(
      `INSERT INTO saved_searches (
        id, user_id, name, query, brand_id, category_id, model_id, min_price, max_price, currency,
        sizes, conditions, colors, keywords_include, keywords_exclude, is_active, notification_enabled,
        notification_channel, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        input.name,
        input.query ?? null,
        input.brandId ?? null,
        input.categoryId ?? null,
        input.modelId ?? null,
        input.minPrice ?? null,
        input.maxPrice ?? null,
        input.currency,
        JSON.stringify(input.sizes ?? []),
        JSON.stringify(input.conditions ?? []),
        JSON.stringify(input.colors ?? []),
        JSON.stringify(input.keywordsInclude ?? []),
        JSON.stringify(input.keywordsExclude ?? []),
        input.isActive ? 1 : 0,
        input.notificationEnabled ? 1 : 0,
        input.notificationChannel ?? 'in_app',
        now,
        now,
      ],
    )
    const row = await this.driver.get<SavedSearchRow>('SELECT * FROM saved_searches WHERE id = ?', [id])
    if (!row) throw new Error('Insert failed')
    return rowToSavedSearch(row)
  }

  async getSavedSearch(id: string, userId?: string): Promise<SavedSearch | null> {
    const row = userId
      ? await this.driver.get<SavedSearchRow>('SELECT * FROM saved_searches WHERE id = ? AND user_id = ?', [id, userId])
      : await this.driver.get<SavedSearchRow>('SELECT * FROM saved_searches WHERE id = ?', [id])
    return row ? rowToSavedSearch(row) : null
  }

  async listSavedSearches(userId: string): Promise<SavedSearch[]> {
    const rows = await this.driver.all<SavedSearchRow>(
      'SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    )
    return rows.map(rowToSavedSearch)
  }

  async listActiveSavedSearches(): Promise<SavedSearch[]> {
    const rows = await this.driver.all<SavedSearchRow>(
      'SELECT * FROM saved_searches WHERE is_active = 1',
    )
    return rows.map(rowToSavedSearch)
  }

  async updateSavedSearch(id: string, userId: string, fields: SavedSearchUpdate): Promise<SavedSearch | null> {
    const sets: string[] = []
    const params: SqlParam[] = []
    if (fields.name !== undefined) {
      sets.push('name = ?')
      params.push(fields.name)
    }
    if (fields.query !== undefined) {
      sets.push('query = ?')
      params.push(fields.query)
    }
    if (fields.brandId !== undefined) {
      sets.push('brand_id = ?')
      params.push(fields.brandId)
    }
    if (fields.categoryId !== undefined) {
      sets.push('category_id = ?')
      params.push(fields.categoryId)
    }
    if (fields.modelId !== undefined) {
      sets.push('model_id = ?')
      params.push(fields.modelId)
    }
    if (fields.minPrice !== undefined) {
      sets.push('min_price = ?')
      params.push(fields.minPrice)
    }
    if (fields.maxPrice !== undefined) {
      sets.push('max_price = ?')
      params.push(fields.maxPrice)
    }
    if (fields.currency !== undefined) {
      sets.push('currency = ?')
      params.push(fields.currency)
    }
    if (fields.sizes !== undefined) {
      sets.push('sizes = ?')
      params.push(JSON.stringify(fields.sizes))
    }
    if (fields.conditions !== undefined) {
      sets.push('conditions = ?')
      params.push(JSON.stringify(fields.conditions))
    }
    if (fields.colors !== undefined) {
      sets.push('colors = ?')
      params.push(JSON.stringify(fields.colors))
    }
    if (fields.keywordsInclude !== undefined) {
      sets.push('keywords_include = ?')
      params.push(JSON.stringify(fields.keywordsInclude))
    }
    if (fields.keywordsExclude !== undefined) {
      sets.push('keywords_exclude = ?')
      params.push(JSON.stringify(fields.keywordsExclude))
    }
    if (fields.isActive !== undefined) {
      sets.push('is_active = ?')
      params.push(fields.isActive ? 1 : 0)
    }
    if (fields.notificationEnabled !== undefined) {
      sets.push('notification_enabled = ?')
      params.push(fields.notificationEnabled ? 1 : 0)
    }
    if (fields.notificationChannel !== undefined) {
      sets.push('notification_channel = ?')
      params.push(fields.notificationChannel)
    }
    if (sets.length === 0) return this.getSavedSearch(id, userId)
    sets.push('updated_at = ?')
    params.push(new Date().toISOString(), id, userId)
    const result = await this.driver.run(
      `UPDATE saved_searches SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
      params,
    )
    if (result.changes === 0) return null
    return this.getSavedSearch(id, userId)
  }

  async deleteSavedSearch(id: string, userId: string): Promise<void> {
    await this.driver.run('DELETE FROM saved_searches WHERE id = ? AND user_id = ?', [id, userId])
  }

  // ------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------

  async createNotification(input: {
    id: string
    userId: string
    type: AppNotification['type']
    title: string
    message: string
    listingId: string | null
    savedSearchId: string | null
  }): Promise<AppNotification> {
    await this.driver.run(
      'INSERT INTO notifications (id, user_id, type, title, message, listing_id, saved_search_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [input.id, input.userId, input.type, input.title, input.message, input.listingId, input.savedSearchId, new Date().toISOString()],
    )
    return this.getNotification(input.id)
  }

  async getNotification(id: string): Promise<AppNotification> {
    const row = await this.driver.get<NotificationRow>('SELECT * FROM notifications WHERE id = ?', [id])
    if (!row) throw new Error('Notification not found')
    return rowToNotification(row)
  }

  async listNotifications(userId: string, limit = 60): Promise<AppNotification[]> {
    const rows = await this.driver.all<NotificationRow>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit],
    )
    return rows.map(rowToNotification)
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await this.driver.run(
      'UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL',
      [new Date().toISOString(), id, userId],
    )
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.driver.run(
      'UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL',
      [new Date().toISOString(), userId],
    )
  }

  async countUnreadNotifications(userId: string): Promise<number> {
    const row = await this.driver.get<{ c: number }>(
      'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [userId],
    )
    return row?.c ?? 0
  }

  async hasNotified(userId: string, listingId: string, savedSearchId: string | null): Promise<boolean> {
    const row = await this.driver.get<{ c: number }>(
      `SELECT COUNT(*) AS c FROM notifications
       WHERE user_id = ? AND listing_id = ?
         AND (saved_search_id = ? OR (saved_search_id IS NULL AND ? IS NULL))`,
      [userId, listingId, savedSearchId, savedSearchId],
    )
    return (row?.c ?? 0) > 0
  }

  async lastMatchAt(userId: string, savedSearchId: string): Promise<string | null> {
    const row = await this.driver.get<{ created_at: string }>(
      'SELECT MAX(created_at) AS created_at FROM notifications WHERE user_id = ? AND saved_search_id = ?',
      [userId, savedSearchId],
    )
    return row?.created_at ?? null
  }

  // ------------------------------------------------------------------
  // Search events / analytics
  // ------------------------------------------------------------------

  async recordSearchEvent(input: {
    userId: string | null
    query: string | null
    filters: Record<string, unknown>
    resultCount: number
  }): Promise<void> {
    await this.driver.run(
      'INSERT INTO search_events (id, user_id, query, filters, result_count, has_results, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        crypto.randomUUID(),
        input.userId,
        input.query,
        JSON.stringify(input.filters),
        input.resultCount,
        input.resultCount > 0 ? 1 : 0,
        new Date().toISOString(),
      ],
    )
  }

  async recordOutclick(userId: string | null, listingId: string): Promise<void> {
    await this.driver.run(
      'INSERT INTO search_events (id, user_id, query, filters, result_count, has_results, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        `out:${crypto.randomUUID()}`,
        userId,
        '__outclick__',
        JSON.stringify({ listingId }),
        1,
        1,
        new Date().toISOString(),
      ],
    )
  }

  async analyticsOverview(): Promise<Record<string, number>> {
    const searches = await this.driver.get<{ c: number }>(
      "SELECT COUNT(*) AS c FROM search_events WHERE query IS NOT NULL AND query <> '__outclick__'",
    )
    const zeroResults = await this.driver.get<{ c: number }>(
      "SELECT COUNT(*) AS c FROM search_events WHERE has_results = 0 AND query IS NOT NULL AND query <> '__outclick__'",
    )
    const outclicks = await this.driver.get<{ c: number }>(
      "SELECT COUNT(*) AS c FROM search_events WHERE query = '__outclick__'",
    )
    const favorites = await this.driver.get<{ c: number }>('SELECT COUNT(*) AS c FROM favorites')
    const savedSearches = await this.driver.get<{ c: number }>('SELECT COUNT(*) AS c FROM saved_searches')
    const notifications = await this.driver.get<{ c: number }>('SELECT COUNT(*) AS c FROM notifications')
    return {
      searches: searches?.c ?? 0,
      zeroResultSearches: zeroResults?.c ?? 0,
      outclicks: outclicks?.c ?? 0,
      favorites: favorites?.c ?? 0,
      savedSearches: savedSearches?.c ?? 0,
      notifications: notifications?.c ?? 0,
    }
  }

  async topSearches(limit = 10): Promise<{ term: string; count: number }[]> {
    const rows = await this.driver.all<{ term: string; count: number }>(
      `SELECT COALESCE(query, '') AS term, COUNT(*) AS count FROM search_events
       WHERE query IS NOT NULL AND query <> '' AND query <> '__outclick__'
       GROUP BY query ORDER BY count DESC LIMIT ?`,
      [limit],
    )
    return rows
  }

  // ------------------------------------------------------------------
  // Ingestion
  // ------------------------------------------------------------------

  async createIngestionRun(provider: string): Promise<IngestionRun> {
    const id = crypto.randomUUID()
    await this.driver.run(
      'INSERT INTO ingestion_runs (id, provider, started_at, status) VALUES (?, ?, ?, ?)',
      [id, provider, new Date().toISOString(), 'running'],
    )
    const created = await this.driver.get<IngestionRunRow>('SELECT * FROM ingestion_runs WHERE id = ?', [id])
    if (!created) throw new Error('Failed to create run')
    return this.rowToRun(created)
  }

  async finishIngestionRun(
    id: string,
    fields: {
      status: 'success' | 'error'
      listingsFound: number
      listingsNew: number
      listingsUpdated: number
      duplicates: number
      errors: number
      latencyMs: number
      meta?: Record<string, unknown>
    },
  ): Promise<void> {
    await this.driver.run(
      `UPDATE ingestion_runs SET finished_at = ?, status = ?, listings_found = ?, listings_new = ?,
       listings_updated = ?, duplicates = ?, errors = ?, latency_ms = ?, meta = ?
       WHERE id = ?`,
      [
        new Date().toISOString(),
        fields.status,
        fields.listingsFound,
        fields.listingsNew,
        fields.listingsUpdated,
        fields.duplicates,
        fields.errors,
        fields.latencyMs,
        JSON.stringify(fields.meta ?? {}),
        id,
      ],
    )
  }

  async listIngestionRuns(limit = 30): Promise<IngestionRun[]> {
    const rows = await this.driver.all<IngestionRunRow>(
      'SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT ?',
      [limit],
    )
    return rows.map((r) => this.rowToRun(r))
  }

  async latestIngestionRun(provider?: string): Promise<IngestionRun | null> {
    const row = provider
      ? await this.driver.get<IngestionRunRow>(
          "SELECT * FROM ingestion_runs WHERE provider = ? ORDER BY started_at DESC LIMIT 1",
          [provider],
        )
      : await this.driver.get<IngestionRunRow>(
          'SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT 1',
        )
    return row ? this.rowToRun(row) : null
  }

  async createIngestionError(runId: string | null, provider: string, externalId: string | null, message: string): Promise<void> {
    await this.driver.run(
      'INSERT INTO ingestion_errors (id, run_id, provider, external_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), runId, provider, externalId, message, new Date().toISOString()],
    )
  }

  async listIngestionErrors(runId: string | null, limit = 50): Promise<IngestionErrorRecord[]> {
    const rows = runId
      ? await this.driver.all<{ id: string; run_id: string | null; provider: string; external_id: string | null; message: string; created_at: string }>(
          'SELECT * FROM ingestion_errors WHERE run_id = ? ORDER BY created_at DESC LIMIT ?',
          [runId, limit],
        )
      : await this.driver.all<{ id: string; run_id: string | null; provider: string; external_id: string | null; message: string; created_at: string }>(
          'SELECT * FROM ingestion_errors ORDER BY created_at DESC LIMIT ?',
          [limit],
        )
    return rows.map((r) => ({
      id: r.id,
      runId: r.run_id,
      provider: r.provider,
      externalId: r.external_id,
      message: r.message,
      createdAt: r.created_at,
    }))
  }

  private rowToRun(row: IngestionRunRow): IngestionRun {
    return {
      id: row.id,
      provider: row.provider,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: row.status as IngestionRun['status'],
      listingsFound: row.listings_found,
      listingsNew: row.listings_new,
      listingsUpdated: row.listings_updated,
      duplicates: row.duplicates,
      errors: row.errors,
      latencyMs: row.latency_ms,
      meta: parseJson(row.meta, null),
    }
  }
}