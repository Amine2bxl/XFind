import type { Hono } from 'hono'
import { createContext, seedIfEmpty } from '../src/server/context'
import { buildApp } from '../src/server/app'
import { config } from '../src/server/config'

type AppEnv = { Variables: { user: unknown; userId: string | null } }

/**
 * Vercel serverless entry point (function mounted at /api/*).
 *
 * Required environment variables on Vercel:
 *  - DATABASE_TYPE=postgres
 *  - DATABASE_URL=<Supabase PostgreSQL connection string>   (or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 *  - AUTH_PROVIDER=supabase (recommended) with SUPABASE_URL + SUPABASE_ANON_KEY
 *  - SESSION_SECRET
 *  - MOCK_PROVIDER_ENABLED=true (default) to demo with clearly-labelled sample data
 *
 * The SQLite driver used for local development is never instantiated here,
 * and `bun:sqlite` is imported lazily, so this function builds and runs on
 * Vercel's standard Node runtime.
 */
let app: Hono<AppEnv> | null = null

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
  if (!app) {
    const created = await createApp()
    if (!created) {
      return json(500, {
        error: 'missing_configuration',
        message:
          'XFind requires a database on Vercel. Set DATABASE_TYPE=postgres and DATABASE_URL ' +
          '(a Supabase PostgreSQL connection string), then redeploy.',
        next_steps: ['See docs/DEPLOYMENT.md for the exact environment variables.'],
      })
    }
    app = created
  }
  return app.fetch(req, undefined, undefined)
}

async function createApp(): Promise<Hono<AppEnv> | null> {
  if (config.database.type !== 'postgres' || !config.database.url) {
    return null
  }
  try {
    const ctx = await createContext()

    // Demo & low-volume helper: when the active provider is the clearly-labelled
    // mock provider (no Vinted feed configured), seed sample data on a cold
    // database so a fresh deployment is immediately browsable.
    if (config.providers.mockEnabled && !config.providers.vintedEnabled) {
      const summary = await seedIfEmpty(ctx).catch(() => null)
      if (summary) {
        console.log(
          `[xfind] Seeded development data: ${summary.brands} brands, ${summary.categories} categories, ${summary.models} models, ${summary.listings} listings (labelled mock data).`,
        )
      }
    }

    return buildApp(ctx) as Hono<AppEnv>
  } catch (error) {
    console.error('[xfind] Failed to initialise on Vercel', error)
    return null
  }
}