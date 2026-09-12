import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import type { RunResult, SqlDriver, SqlParam } from './driver'

/**
 * SQLite driver on better-sqlite3, used when running on a plain Node runtime
 * (e.g. the Vercel serverless function). Kept separate from the Bun-specific
 * driver so the development runtime never loads a native addon Bun can't open.
 */
export class NodeSqliteDriver implements SqlDriver {
  private readonly db: Database.Database

  constructor(path: string) {
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true })
    }
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  async all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...(params as unknown[])) as T[]
  }

  async get<T>(sql: string, params: SqlParam[] = []): Promise<T | null> {
    const row = this.db.prepare(sql).get(...(params as unknown[])) as T | undefined
    return row ?? null
  }

  async run(sql: string, params: SqlParam[] = []): Promise<RunResult> {
    const result = this.db.prepare(sql).run(...(params as unknown[]))
    return { changes: Number(result.changes ?? 0) }
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql)
  }
}