import type { UserProfile } from '../../shared/types'

export interface AuthResult {
  userId: string
  user: UserProfile
  /** When the provider already created a session token (e.g. Supabase access token). */
  token?: string
  maxAgeSeconds?: number
}

export interface AuthProvider {
  readonly name: 'local' | 'supabase'
  /** Resolves the current user from a session token. */
  authenticateToken(token: string): Promise<{ userId: string; user: UserProfile } | null>
  register(input: { email: string; password: string; name: string | null }): Promise<AuthResult>
  login(input: { email: string; password: string }): Promise<AuthResult>
  logout(token: string): Promise<void>
  createSession(userId: string): Promise<{ token: string; maxAgeSeconds: number }>
}