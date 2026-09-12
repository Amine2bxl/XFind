import type { Database } from '../db/database'
import { config } from '../config'
import type { AuthProvider, AuthResult } from './types'
import { AuthError } from './local'

interface SupabaseAuthResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: {
    id: string
    email?: string
    user_metadata?: { name?: string }
  }
  error?: string
  error_description?: string
  msg?: string
}

export class SupabaseAuthProvider implements AuthProvider {
  readonly name = 'supabase' as const

  private readonly url: string
  private readonly anonKey: string

  constructor(private readonly db: Database) {
    this.url = config.database.supabaseUrl.replace(/\/$/, '')
    this.anonKey = config.database.supabaseAnonKey
    if (!this.url || !this.anonKey) {
      throw new AuthError('SUPABASE_URL/SUPABASE_ANON_KEY are required for AUTH_PROVIDER=supabase.', 500)
    }
  }

  private headers(): Record<string, string> {
    return {
      apikey: this.anonKey,
      'Content-Type': 'application/json',
    }
  }

  private async ensureUserRow(supabaseUserId: string, email: string, name: string | null): Promise<import('../../shared/types').UserProfile> {
    const existing = await this.db.getUserById(supabaseUserId)
    if (existing) return existing
    return this.db.createUser({
      id: supabaseUserId,
      email: email.toLowerCase(),
      passwordHash: null,
      name,
    })
  }

  private async storeSession(token: string, userId: string): Promise<void> {
    await this.db.createSession(token, userId, config.auth.sessionTtlDays)
  }

  async register(input: { email: string; password: string; name: string | null }): Promise<AuthResult> {
    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        data: { name: input.name ?? undefined },
      }),
    })
    const data = (await res.json().catch(() => ({}))) as SupabaseAuthResponse
    if (!res.ok || !data.user) {
      throw new AuthError(data.error_description ?? data.msg ?? data.error ?? 'Registration failed.', res.status)
    }
    const user = await this.ensureUserRow(data.user.id, data.user.email ?? input.email, input.name)
    const token = data.access_token
    if (token) {
      await this.storeSession(token, user.id)
    }
    return {
      userId: user.id,
      user,
      token,
      maxAgeSeconds: config.auth.sessionTtlDays * 24 * 60 * 60,
    }
  }

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email: input.email, password: input.password }),
    })
    const data = (await res.json().catch(() => ({}))) as SupabaseAuthResponse
    if (!res.ok || !data.user || !data.access_token) {
      throw new AuthError(data.error_description ?? data.error ?? 'Invalid email or password.', res.status)
    }
    const user = await this.ensureUserRow(data.user.id, data.user.email ?? input.email, null)
    await this.storeSession(data.access_token, user.id)
    return {
      userId: user.id,
      user,
      token: data.access_token,
      maxAgeSeconds: data.expires_in ?? config.auth.sessionTtlDays * 24 * 60 * 60,
    }
  }

  async authenticateToken(token: string): Promise<{ userId: string; user: import('../../shared/types').UserProfile } | null> {
    const res = await fetch(`${this.url}/auth/v1/user`, {
      headers: { ...this.headers(), Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      await this.db.deleteSession(token).catch(() => undefined)
      return null
    }
    const data = (await res.json()) as SupabaseAuthResponse
    if (!data.user) return null
    const user = await this.ensureUserRow(data.user.id, data.user.email ?? '', null)
    return { userId: user.id, user }
  }

  async logout(token: string): Promise<void> {
    await fetch(`${this.url}/auth/v1/logout`, {
      method: 'POST',
      headers: { ...this.headers(), Authorization: `Bearer ${token}` },
    }).catch(() => undefined)
    await this.db.deleteSession(token).catch(() => undefined)
  }

  async createSession(_userId: string): Promise<{ token: string; maxAgeSeconds: number }> {
    throw new AuthError('Supabase auth manages its own tokens; call login() to obtain a session.', 500)
  }
}