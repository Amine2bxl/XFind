import type { DatabaseType } from '../config'
import type { SqlDriver } from './driver'
import { SqliteDriver } from './sqlite-driver'
import { NodeSqliteDriver } from './node-sqlite-driver'
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
        'DATABASE_TYPE is "postgres" but no DATABASE_URL was provided. ' +
          'Set DATABASE_URL (a Supabase Postgres connection string) or leave DATABASE_TYPE unset for the SQLite demo/development mode.',
      )
    }
    return new PostgresDriver(options.postgresUrl)
  }
  // SQLite: bun:sqlite on the Bun runtime, better-sqlite3 on Node (Vercel).
  if (typeof Bun !== 'undefined') {
    return new SqliteDriver(options.sqlitePath)
  }
  return new NodeSqliteDriver(options.sqlitePath)
}

export async function openDatabase(options: OpenDbOptions): Promise<Database> {
  const driver = createDriver(options)
  const db = new Database(driver)
  await db.migrate()
  return db
}

export { PostgresDriver } from './postgres-driver'
export { SqliteDriver } from './sqlite-driver'
export { NodeSqliteDriver } from './node-sqlite-driver'