import { createContext } from '../src/server/context'
import { buildApp } from '../src/server/app'
import { config } from '../src/server/config'
import type { Hono } from 'hono'

type AppEnv = { Variables: { user: unknown; userId: string | null } }

/**
 * Vercel serverless entry point.
 *
 * Requirements for a real deployment:
 *  - DATABASE_TYPE=postgres with a DATABASE_URL pointing at Supabase PostgreSQL
 *    (SQLite files do not persist on Vercel's ephemeral filesystem).
 *  - AUTH_PROVIDER=supabase with SUPABASE_URL / SUPABASE_ANON_KEY (or keep local
 *    auth with a persistent DATABASE_URL and SESSION_SECRET set).
 *  - SESSION_SECRET set.
 *
 * The Vercel "Bun" function runtime provides the Bun globals the server uses.
 */
let app: Hono<AppEnv> | null = null

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'HEAD') {
    return new Response(null, { status: 200 })
  }
  if (!app) {
    if (config.database.type !== 'postgres') {
      return new Response(
        JSON.stringify({
          error: 'Vercel deployments require DATABASE_TYPE=postgres (Supabase). SQLite is for development only.',
        }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      )
    }
    const ctx = await createContext()
    app = buildApp(ctx) as Hono<AppEnv>
  }
  return (await app.fetch(req, undefined, undefined)) as Response
}