import type { Hono } from 'hono'
import { createContext, seedIfEmpty } from '../src/server/context'
import { buildApp } from '../src/server/app'
import { config } from '../src/server/config'

type AppEnv = { Variables: { user: unknown; userId: string | null } }

/**
 * Vercel serverless entry point (function mounted at /api/*).
 *
 * Three supported configurations:
 *  1. DATABASE_TYPE=postgres + DATABASE_URL  → full persistent deployment (Supabase).
 *  2. DATABASE_TYPE unset (sqlite) on Vercel → DEMO mode: an ephemeral SQLite
 *     database seeded with clearly-labelled sample data. Works out of the box,
 *     data resets on cold start — labels always say "Dev data".
 *  3. sqlite elsewhere (local/self-hosted Bun) → normal file database.
 *
 * Optional: AUTH_PROVIDER=supabase + SUPABASE_URL + SUPABASE_ANON_KEY, and
 * SESSION_SECRET for signed cookies. Without them registration uses the built-in
 * local auth provider (hashed passwords + session table in the database).
 */
let booted: { app: Hono<AppEnv>; demo: boolean } | null = null

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'HEAD') {
    return new Response(null, { status: 200 })
  }
  if (!booted) {
    const created = await boot()
    if (!created) {
      return json(500, {
        error: 'missing_configuration',
        message:
          config.database.type === 'postgres' && !config.database.url
            ? 'DATABASE_TYPE=postgres is set but DATABASE_URL is missing. Add your Supabase PostgreSQL connection string, or remove DATABASE_TYPE to use demo mode.'
            : 'XFind could not initialise its database. Check docs/DEPLOYMENT.md.',
      })
    }
    booted = created
  }
  return booted.app.fetch(req, undefined, undefined)
}

async function boot(): Promise<{ app: Hono<AppEnv>; demo: boolean } | null> {
  const isSqlite = config.database.type === 'sqlite'
  const onVercel = process.env.VERCEL === '1'

  if (!isSqlite && !config.database.url) {
    return null
  }

  const dbPath =
    isSqlite && onVercel
      ? `/tmp/xfind-demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`
      : undefined
  const demo = Boolean(dbPath)

  try {
    const ctx = await createContext(dbPath ? { dbPath } : {})

    // Seed clearly-labelled sample data on an empty database when the active
    // provider is the mock provider (no Vinted feed configured yet).
    if (config.providers.mockEnabled && !config.providers.vintedEnabled) {
      const summary = await seedIfEmpty(ctx).catch(() => null)
      if (summary) {
        console.log(
          `[xfind] Seeded development data: ${summary.brands} brands, ${summary.categories} categories, ${summary.models} models, ${summary.listings} listings (labelled mock data).`,
        )
      }
    }

    return { app: buildApp(ctx) as Hono<AppEnv>, demo }
  } catch (error) {
    console.error('[xfind] Failed to initialise', error)
    return null
  }
}