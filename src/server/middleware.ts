import type { Context, MiddlewareHandler } from 'hono'
import type { UserProfile } from '../shared/types'
import { config } from './config'
import type { AppContext } from './context'

export function readCookie(c: Context, name: string): string | null {
  const header = c.req.header('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq > -1 && part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim())
      } catch {
        return part.slice(eq + 1).trim()
      }
    }
  }
  return null
}

export function setSessionCookie(c: Context, token: string, maxAgeSeconds: number): void {
  const secure = config.isProduction ? '; Secure' : ''
  c.header(
    'Set-Cookie',
    `${config.auth.cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`,
  )
}

export function clearSessionCookie(c: Context): void {
  c.header('Set-Cookie', `${config.auth.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

/** Resolves the authenticated user from the request, attaching it to context vars. */
export const optionalAuth = (ctx: AppContext): MiddlewareHandler => {
  return async (c, next) => {
    const token = readCookie(c, config.auth.cookieName)
    let user: UserProfile | null = null
    if (token) {
      try {
        const session = await ctx.auth.authenticateToken(token)
        if (session) user = session.user
      } catch (error) {
        console.error('[auth]', error)
      }
    }
    c.set('user', user)
    c.set('userId', user?.id ?? null)
    await next()
  }
}

export function requireAuth(c: Context): { user: UserProfile; userId: string } | null {
  const user = c.get('user') as UserProfile | null
  if (!user) return null
  return { user, userId: user.id }
}

/** Simple in-memory per-IP rate limiter (dev-grade). */
const rateBuckets = new Map<string, number[]>()

export function rateLimit(windowMs: number, max: number): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    const now = Date.now()
    const recent = (rateBuckets.get(ip) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      return c.json({ error: 'rate_limited', message: 'Too many requests. Please slow down.' }, 429)
    }
    recent.push(now)
    rateBuckets.set(ip, recent)
    await next()
  }
}