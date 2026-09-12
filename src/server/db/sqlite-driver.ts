import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { RunResult, SqlDriver, SqlParam } from './driver'

interface SqliteQuery {
  all(...bindings: unknown[]): unknown
  run(...bindings: unknown[]): { changes?: number | bigint }
}

interface SqliteDb {
  query(sql: string): SqliteQuery
  exec(sql: string): void
}

/**
 * SQLite driver on bun:sqlite (local development default).
 *
 * bun:sqlite is imported lazily so that bundlers targeting Node (e.g. the
 * Vercel serverless function) never fail to resolve the `bun:` builtin.
 * Vercel/Node runtimes use the better-sqlite3 driver instead
 * (`node-sqlite-driver.ts`), selected in `db/index.ts#createDriver`.
 */
export class SqliteDriver implements SqlDriver {
  private db: SqliteDb | null = null
  private readonly filePath: string

  constructor(path: string) {
    this.filePath = path
  }

  private async conn(): Promise<SqliteDb> {
    if (this.db) return this.db
    const mod = (await import('bun:sqlite')) as { Database: new (path: string, opts: { create: boolean }) => SqliteDb }
    if (this.filePath !== ':memory:') {
      mkdirSync(dirname(this.filePath), { recursive: true })
    }
    const db = new mod.Database(this.filePath, { create: true })
    db.exec('PRAGMA journal_mode = WAL;')
    db.exec('PRAGMA foreign_keys = ON;')
    this.db = db
    return db
  }

  async all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const db = await this.conn()
    return db.query(sql).all(...(params as unknown[])) as T[]
  }

  async get<T>(sql: string, params: SqlParam[] = []): Promise<T | null> {
    const db = await this.conn()
    const rows = db.query(sql).all(...(params as unknown[])) as T[]
    return rows.length > 0 ? rows[0] : null
  }

  async run(sql: string, params: SqlParam[] = []): Promise<RunResult> {
    const db = await this.conn()
    const result = db.query(sql).run(...(params as unknown[]))
    return { changes: Number(result.changes ?? 0) }
  }

  async exec(sql: string): Promise<void> {
    const db = await this.conn()
    db.exec(sql)
  }
}