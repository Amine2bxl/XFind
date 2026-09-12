import type { Database } from '../db/database'
import { config } from '../config'
import { LocalAuthProvider } from './local'
import { SupabaseAuthProvider } from './supabase'
import type { AuthProvider } from './types'

export function createAuthProvider(db: Database): AuthProvider {
  if (config.auth.type === 'supabase') {
    return new SupabaseAuthProvider(db)
  }
  return new LocalAuthProvider(db)
}

export type { AuthProvider, AuthResult } from './types'