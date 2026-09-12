import type { DatabaseType } from '../config'
import type { SqlDriver } from './driver'
import { SqliteDriver } from './sqlite-driver'
import { PostgresDriver } from './postgres-driver'
import { Database } from './database'

export interface OpenDbOptions {
  type: DatabaseType
  sqlitePath: string
  postgresUrl: string
}

export function createDriver(options: OpenDbOptions): SqlDriver {
  if (options.type === 'postgres') {
    if (!options.postgresUrl) {
      throw new Error(
        'DATABASE_DB type is "postgres" but no DATABASE_URL was provided. ' +
          'Set DATABASE_URL (a Supabase Postgres connection string) or use DATABASE_TYPE=sqlite for development.',
      )
    }
    return new PostgresDriver(options.postgresUrl)
  }
  return new SqliteDriver(options.sqlitePath)
}

export async function openDatabase(options: OpenDbOptions): Promise<Database> {
  const driver = createDriver(options)
  const db = new Database(driver)
  await db.migrate()
  return db
}

export { PostgresDriver } from './postgres-driver'
export { SqliteDriver } from './sqlite-driver'