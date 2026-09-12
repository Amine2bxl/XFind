import { randomBytes } from 'node:crypto'
import type { Database } from '../db/database'
import { config } from '../config'
import { hashPassword, verifyPasswordStored } from './password'
import type { AuthProvider, AuthResult } from './types'

export class LocalAuthProvider implements AuthProvider {
  readonly name = 'local' as const

  constructor(private readonly db: Database) {}

  async register(input: { email: string; password: string; name: string | null }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const existing = await this.db.getUserByEmail(email)
    if (existing) {
      throw new AuthError('An account with this email already exists.', 409)
    }
    const passwordHash = await hashPassword(input.password)
    const user = await this.db.createUser({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      name: input.name,
    })
    return { userId: user.id, user }
  }

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const user = await this.db.getUserByEmail(email)
    if (!user) {
      throw new AuthError('Invalid email or password.', 401)
    }
    const hash = await this.db.getUserPasswordHash(user.id)
    if (!hash) {
      throw new AuthError('This account has no local password. Use email login instead.', 401)
    }
    const valid = await verifyPasswordStored(input.password, hash)
    if (!valid) {
      throw new AuthError('Invalid email or password.', 401)
    }
    return { userId: user.id, user }
  }

  async authenticateToken(token: string): Promise<{ userId: string; user: import('../../shared/types').UserProfile } | null> {
    const session = await this.db.getSession(token)
    if (!session) return null
    const user = await this.db.getUserById(session.userId)
    if (!user) return null
    return { userId: user.id, user }
  }

  async logout(token: string): Promise<void> {
    await this.db.deleteSession(token)
  }

  async createSession(userId: string): Promise<{ token: string; maxAgeSeconds: number }> {
    const token = randomBytes(32).toString('hex')
    await this.db.createSession(token, userId, config.auth.sessionTtlDays)
    return { token, maxAgeSeconds: config.auth.sessionTtlDays * 24 * 60 * 60 }
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}