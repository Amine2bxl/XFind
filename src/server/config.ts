export type DatabaseType = 'sqlite' | 'postgres'
export type AuthType = 'local' | 'supabase'

function str(value: string | undefined, fallback: string): string {
  const v = value?.trim()
  return v && v.length > 0 ? v : fallback
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

const databaseType: DatabaseType =
  str(process.env.DATABASE_TYPE, 'sqlite').toLowerCase() === 'postgres' ||
  str(process.env.DATABASE_TYPE, 'sqlite').toLowerCase() === 'supabase'
    ? 'postgres'
    : 'sqlite'

const rawAuth = str(process.env.AUTH_PROVIDER, 'local').toLowerCase()
const authType: AuthType = rawAuth === 'supabase' ? 'supabase' : 'local'

export const isProduction = str(process.env.NODE_ENV, 'development') === 'production'

export const config = {
  env: str(process.env.NODE_ENV, 'development'),
  isProduction,
  port: num(process.env.PORT, isProduction ? 3000 : 3001),
  appUrl: str(process.env.APP_URL, isProduction ? 'http://localhost:3000' : 'http://localhost:5173'),
  database: {
    type: databaseType,
    path: str(process.env.DATABASE_PATH, './data/xfind.db'),
    url: str(process.env.DATABASE_URL, ''),
    supabaseUrl: str(process.env.SUPABASE_URL, ''),
    supabaseAnonKey: str(process.env.SUPABASE_ANON_KEY, ''),
    supabaseServiceRoleKey: str(process.env.SUPABASE_SERVICE_ROLE_KEY, ''),
  },
  auth: {
    type: authType,
    sessionSecret: str(process.env.SESSION_SECRET, 'xfind-development-secret-do-not-use-in-production'),
    sessionTtlDays: num(process.env.SESSION_TTL_DAYS, 30),
    cookieName: 'xfind_session',
  },
  providers: {
    mockEnabled: bool(process.env.MOCK_PROVIDER_ENABLED, true),
    vintedEnabled: bool(process.env.VINTED_PROVIDER_ENABLED, false),
    vintedFeedUrl: process.env.VINTED_FEED_URL?.trim() ?? '',
  },
  push: {
    publicKey: process.env.VAPID_PUBLIC_KEY?.trim() ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY?.trim() ?? '',
    subject: str(process.env.VAPID_SUBJECT, 'mailto:admin@example.com'),
  },
  ingestion: {
    batchSize: num(process.env.INGESTION_BATCH_SIZE, 200),
  },
} as const

export function assertProductionConfig(): string[] {
  const problems: string[] = []
  if (!config.isProduction) return problems
  if (config.database.type === 'postgres' && !config.database.url && !config.database.supabaseUrl) {
    problems.push('DATABASE_URL or SUPABASE_URL is required in production (or set DATABASE_TYPE=postgres).')
  }
  if (config.auth.sessionSecret.includes('development-secret')) {
    problems.push('SESSION_SECRET must be set to a strong random value in production.')
  }
  return problems
}
