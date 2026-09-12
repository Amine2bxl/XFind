import { Hono } from 'hono'
import type { Context } from 'hono'
import { join } from 'node:path'
import { z } from 'zod'
import {
  favoriteInputSchema,
  ingestionRunSchema,
  loginSchema,
  outclickSchema,
  profileUpdateSchema,
  registerSchema,
  savedSearchInputSchema,
  savedSearchUpdateSchema,
  searchQuerySchema,
  suggestionQuerySchema,
} from '../shared/schemas'
import type { AppContext } from './context'
import { AuthError } from './auth/local'
import { ProviderUnavailableError } from './providers/marketplace'
import { config, isProduction } from './config'
import { clearSessionCookie, optionalAuth, rateLimit, readCookie, requireAuth, setSessionCookie } from './middleware'
import type { Category, CategoryNode, SearchFilters, SortOption, UserProfile } from '../shared/types'

type Env = { Variables: { user: UserProfile | null; userId: string | null } }

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const first = result.error.issues[0]
    const message = first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input'
    throw new HttpError(message, 400)
  }
  return result.data
}

function errorJson(_c: Context, status: number, message: string, details?: unknown): Response {
  return new Response(JSON.stringify({ error: 'error', message, details }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>(categories.map((c) => [c.id, { ...c, children: [] }]))
  const roots: CategoryNode[] = []
  for (const cat of categories) {
    const node = map.get(cat.id)!
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function buildApp(ctx: AppContext): Hono<Env> {
  const app = new Hono<Env>()

  app.use('*', optionalAuth(ctx))

  app.onError((err, c) => {
    if (err instanceof HttpError) {
      return errorJson(c, err.status, err.message)
    }
    if (err instanceof AuthError) {
      return errorJson(c, err.status, err.message)
    }
    if (err instanceof ProviderUnavailableError) {
      return errorJson(c, 503, 'Marketplace data is temporarily unavailable. Please try again shortly.', {
        provider: err.message,
      })
    }
    console.error('[api-error]', err)
    return errorJson(c, 500, 'An unexpected error occurred.')
  })

  app.get('/api/health', async (c) => {
    const listingCount = await ctx.db.countListings().catch(() => null)
    return c.json({
      ok: true,
      db: listingCount === null ? 'error' : 'up',
      listings: listingCount,
      provider: ctx.registry.status(),
    })
  })

  // ------------------------------------------------------------------
  // Auth
  // ------------------------------------------------------------------

  app.post('/api/auth/register', rateLimit(60_000, 10), async (c) => {
    const body = await c.req.json().catch(() => null)
    const input = validate(registerSchema, body ?? {})
    const result = await ctx.auth.register({
      email: input.email,
      password: input.password,
      name: input.name ?? null,
    })
    const session = await ctx.auth.createSession(result.userId)
    setSessionCookie(c, session.token, session.maxAgeSeconds)
    return c.json({ user: result.user }, 201)
  })

  app.post('/api/auth/login', rateLimit(60_000, 10), async (c) => {
    const body = await c.req.json().catch(() => null)
    const input = validate(loginSchema, body ?? {})
    const result = await ctx.auth.login(input)
    if (result.token) {
      setSessionCookie(c, result.token, result.maxAgeSeconds ?? 3600)
    } else {
      const session = await ctx.auth.createSession(result.userId)
      setSessionCookie(c, session.token, session.maxAgeSeconds)
    }
    return c.json({ user: result.user })
  })

  app.post('/api/auth/logout', async (c) => {
    const token = readCookie(c, config.auth.cookieName)
    if (token) await ctx.auth.logout(token).catch(() => undefined)
    clearSessionCookie(c)
    return c.json({ ok: true })
  })

  app.get('/api/auth/me', async (c) => {
    return c.json({ user: (c.get('user') as UserProfile | null) ?? null })
  })

  // ------------------------------------------------------------------
  // Search
  // ------------------------------------------------------------------

  app.get('/api/search', async (c) => {
    const raw: Record<string, unknown> = { ...c.req.query() }
    for (const key of ['condition', 'color']) {
      const values = c.req.queries(key)
      if (values && values.length > 0) raw[key] = values
    }
    const filters = validate(searchQuerySchema, raw)
    const userId = c.get('userId')
    const searchFilters: SearchFilters = {
      ...filters,
      condition: asStringArray(filters.condition),
      color: asStringArray(filters.color),
      brand: filters.brand,
      sort: (filters.sort as SortOption) ?? 'newest',
      page: filters.page ?? 1,
      perPage: filters.perPage ?? 24,
    }
    const response = await ctx.search.search(searchFilters, userId)
    return c.json(response)
  })

  app.get('/api/search/suggest', async (c) => {
    const { q, limit } = validate(suggestionQuerySchema, c.req.query())
    const suggestions = await ctx.catalog.suggestions(q, limit ?? 8)
    return c.json({ suggestions })
  })

  // ------------------------------------------------------------------
  // Listings
  // ------------------------------------------------------------------

  app.get('/api/listings/:id', async (c) => {
    const id = c.req.param('id')
    const q = c.req.query('q') ?? null
    const result = await ctx.listings.getListing(id, c.get('userId'), q)
    if (!result) return errorJson(c, 404, 'Listing not found.')
    return c.json(result)
  })

  app.get('/api/listings/:id/related', async (c) => {
    const listing = await ctx.db.getListingById(c.req.param('id'))
    if (!listing) return errorJson(c, 404, 'Listing not found.')
    const related = await ctx.listings.related(listing)
    return c.json({ listings: related })
  })

  app.get('/api/live/new', async (c) => {
    const since = c.req.query('since')
    if (!since) return errorJson(c, 400, 'Missing "since" parameter (ISO date).')
    const count = await ctx.listings.newListingsCountSince(since)
    return c.json({ count })
  })

  app.post('/api/outclick', async (c) => {
    const body = await c.req.json().catch(() => null)
    const input = validate(outclickSchema, body ?? {})
    await ctx.listings.trackOutclick(c.get('userId'), input.listingId)
    return c.json({ ok: true })
  })

  // ------------------------------------------------------------------
  // Brands & categories
  // ------------------------------------------------------------------

  app.get('/api/brands', async (c) => {
    const q = (c.req.query('q') ?? '').trim()
    const page = Number(c.req.query('page') ?? '1') || 1
    const perPage = Math.min(60, Number(c.req.query('perPage') ?? '48') || 48)
    const brands = await ctx.brands.searchBrands(q, perPage)
    const total = await ctx.db.countBrands(q || undefined)
    return c.json({ brands, total, page, perPage })
  })

  app.get('/api/brands/:slug', async (c) => {
    const brand = await ctx.brands.getBySlug(c.req.param('slug'))
    if (!brand) return errorJson(c, 404, 'Brand not found.')
    const models = await ctx.db.listModels(brand.id)
    const recent = await ctx.db.searchListings({
      brandId: brand.id,
      sort: 'newest',
      page: 1,
      perPage: 12,
    })
    return c.json({ brand, models, recentListings: recent.listings })
  })

  app.get('/api/categories', async (c) => {
    const categories = await ctx.db.listCategories()
    return c.json({ categories: buildCategoryTree(categories) })
  })

  // ------------------------------------------------------------------
  // Favorites (auth required)
  // ------------------------------------------------------------------

  app.get('/api/favorites', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    const favorites = await ctx.db.listFavorites(auth.userId)
    return c.json({ favorites })
  })

  app.post('/api/favorites', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    const body = await c.req.json().catch(() => null)
    const input = validate(favoriteInputSchema, body ?? {})
    const listing = await ctx.db.getListingById(input.listingId)
    if (!listing) return errorJson(c, 404, 'Listing not found.')
    await ctx.db.addFavorite(auth.userId, input.listingId)
    return c.json({ ok: true })
  })

  app.delete('/api/favorites/:listingId', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    await ctx.db.removeFavorite(auth.userId, c.req.param('listingId'))
    return c.json({ ok: true })
  })

  // ------------------------------------------------------------------
  // Saved searches (auth required)
  // ------------------------------------------------------------------

  app.get('/api/saved-searches', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    const searches = await ctx.savedSearches.list(auth.userId)
    return c.json({ savedSearches: searches })
  })

  app.post('/api/saved-searches', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    const body = await c.req.json().catch(() => null)
    const input = validate(savedSearchInputSchema, body ?? {})
    await assertReferencesExist(ctx, input)
    const saved = await ctx.savedSearches.create(auth.userId, {
      name: input.name,
      query: input.query ?? null,
      brandId: input.brandId ?? null,
      categoryId: input.categoryId ?? null,
      modelId: input.modelId ?? null,
      minPrice: input.minPrice ?? null,
      maxPrice: input.maxPrice ?? null,
      currency: input.currency ?? 'EUR',
      sizes: input.sizes ?? [],
      conditions: input.conditions ?? [],
      colors: input.colors ?? [],
      keywordsInclude: input.keywordsInclude ?? [],
      keywordsExclude: input.keywordsExclude ?? [],
      isActive: input.isActive ?? true,
      notificationEnabled: input.notificationEnabled ?? true,
      notificationChannel: input.notificationChannel ?? 'in_app',
    })
    return c.json({ savedSearch: saved }, 201)
  })

  app.get('/api/saved-searches/:id', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    const saved = await ctx.db.getSavedSearch(c.req.param('id'), auth.userId)
    if (!saved) return errorJson(c, 404, 'Saved search not found.')
    const matchCount = await ctx.savedSearches.countMatches(saved)
    const lastMatchAt = await ctx.db.lastMatchAt(auth.userId, saved.id)
    return c.json({ savedSearch: { ...saved, matchCount, lastMatchAt } })
  })

  app.patch('/api/saved-searches/:id', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    const body = await c.req.json().catch(() => null)
    const input = validate(savedSearchUpdateSchema, body ?? {})
    const updated = await ctx.savedSearches.update(auth.userId, c.req.param('id'), input)
    if (!updated) return errorJson(c, 404, 'Saved search not found.')
    return c.json({ savedSearch: updated })
  })

  app.delete('/api/saved-searches/:id', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    await ctx.savedSearches.remove(auth.userId, c.req.param('id'))
    return c.json({ ok: true })
  })

  // ------------------------------------------------------------------
  // Notifications (auth required)
  // ------------------------------------------------------------------

  app.get('/api/notifications', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    const limit = Math.min(100, Number(c.req.query('limit') ?? '60') || 60)
    const notifications = await ctx.notifications.list(auth.userId, limit)
    return c.json({ notifications })
  })

  app.get('/api/notifications/unread-count', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return c.json({ count: 0 })
    return c.json({ count: await ctx.notifications.unreadCount(auth.userId) })
  })

  app.post('/api/notifications/:id/read', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    await ctx.notifications.markRead(auth.userId, c.req.param('id'))
    return c.json({ ok: true })
  })

  app.post('/api/notifications/read-all', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    await ctx.notifications.markAllRead(auth.userId)
    return c.json({ ok: true })
  })

  // ------------------------------------------------------------------
  // Account / settings (auth required)
  // ------------------------------------------------------------------

  app.get('/api/me', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    return c.json({ user: auth.user })
  })

  app.patch('/api/me', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    const body = await c.req.json().catch(() => null)
    const input = validate(profileUpdateSchema, body ?? {})
    const current = auth.user
    const updated = await ctx.db.updateUser(auth.userId, {
      name: input.name,
      notificationSettings: {
        inApp: input.notificationSettings?.inApp ?? current.notificationSettings.inApp,
        email: input.notificationSettings?.email ?? current.notificationSettings.email,
        push: input.notificationSettings?.push ?? current.notificationSettings.push,
      },
    })
    return c.json({ user: updated })
  })

  // ------------------------------------------------------------------
  // Push notifications
  // ------------------------------------------------------------------

  app.get('/api/push/status', async (c) => {
    return c.json(ctx.notifications.pushStatus())
  })

  app.post('/api/push/subscribe', async (c) => {
    const auth = requireAuth(c)
    if (!auth) return errorJson(c, 401, 'Authentication required.')
    const status = ctx.notifications.pushStatus()
    if (!status.configured) {
      return errorJson(c, 501, 'Browser push is not configured. Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT.', {
        config: status,
      })
    }
    // VAPID is configured but sender dispatch is not wired yet.
    return errorJson(c, 501, 'Web push dispatch is not yet enabled for this deployment.', { config: status })
  })

  // ------------------------------------------------------------------
  // Admin / dev tools
  // ------------------------------------------------------------------

  function requireAdmin(c: Context): { user: UserProfile; userId: string } | null {
    const auth = requireAuth(c)
    if (!auth || !auth.user.isAdmin) return null
    return auth
  }

  app.get('/api/admin/overview', async (c) => {
    const admin = requireAdmin(c)
    if (!admin) return errorJson(c, 403, 'Admin access required.')
    const [listingCount, recentRuns, analytics] = await Promise.all([
      ctx.db.countListings(),
      ctx.db.listIngestionRuns(5),
      ctx.db.analyticsOverview(),
    ])
    return c.json({
      listingCount,
      brands: await ctx.db.countBrands(),
      recentRuns,
      analytics,
      providers: ctx.registry.status(),
      push: ctx.notifications.pushStatus(),
      lastRun: await ctx.db.latestIngestionRun(),
      activeProvider: ctx.registry.active().id,
    })
  })

  app.get('/api/admin/ingestion', async (c) => {
    const admin = requireAdmin(c)
    if (!admin) return errorJson(c, 403, 'Admin access required.')
    const limit = Math.min(100, Number(c.req.query('limit') ?? '30') || 30)
    const runs = await ctx.db.listIngestionRuns(limit)
    const errors = await ctx.db.listIngestionErrors(null, 50)
    return c.json({ runs, errors })
  })

  app.post('/api/admin/ingestion/run', async (c) => {
    const admin = requireAdmin(c)
    if (!admin) return errorJson(c, 403, 'Admin access required.')
    const body = await c.req.json().catch(() => null)
    const input = validate(ingestionRunSchema, body ?? {})
    const summary = await ctx.ingestion.run({
      provider: input.provider,
      limit: input.limit,
    })
    return c.json({ run: summary })
  })

  app.get('/api/admin/analytics', async (c) => {
    const admin = requireAdmin(c)
    if (!admin) return errorJson(c, 403, 'Admin access required.')
    const [overview, topSearches] = await Promise.all([ctx.db.analyticsOverview(), ctx.db.topSearches(10)])
    return c.json({ overview, topSearches })
  })

  // ------------------------------------------------------------------
  // Static assets (production, self-hosted Bun server only) — SPA served from dist/client.
  // On Vercel the static files are served by Vercel's CDN (see vercel.json), so we
  // skip Bun.file-based serving entirely there.
  // ------------------------------------------------------------------

  if (isProduction && process.env.VERCEL !== '1') {
    const distDir = join(process.cwd(), 'dist', 'client')
    app.get('/favicon.svg', async (c) => {
      const file = Bun.file(join(distDir, 'favicon.svg'))
      if (await file.exists()) return new Response(file, { headers: { 'content-type': 'image/svg+xml' } })
      return c.notFound()
    })
    app.get('/assets/*', async (c) => {
      const file = Bun.file(join(distDir, c.req.path))
      if (await file.exists()) return new Response(file)
      return c.notFound()
    })
    app.get('*', async (c) => {
      if (c.req.path.startsWith('/api')) return errorJson(c, 404, 'Unknown endpoint.')
      const file = Bun.file(join(distDir, 'index.html'))
      if (await file.exists()) {
        return new Response(file, { headers: { 'content-type': 'text/html; charset=utf-8' } })
      }
      return errorJson(c, 404, 'The client bundle is not built. Run "bun run build" first or use "bun run dev".')
    })
  }

  return app
}

function asStringArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined
  return Array.isArray(value) ? value : [value]
}

async function assertReferencesExist(
  ctx: AppContext,
  input: { brandId?: string | null; categoryId?: string | null; modelId?: string | null },
): Promise<void> {
  if (input.brandId) {
    const brand = await ctx.db.getBrandById(input.brandId)
    if (!brand) throw new HttpError('Unknown brandId.', 400)
  }
  if (input.categoryId) {
    const category = await ctx.db.getCategoryById(input.categoryId)
    if (!category) throw new HttpError('Unknown categoryId.', 400)
  }
  if (input.modelId) {
    const model = await ctx.db.getModelById(input.modelId)
    if (!model) throw new HttpError('Unknown modelId.', 400)
  }
}