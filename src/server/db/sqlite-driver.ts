import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { Database as BunDatabase } from 'bun:sqlite'
import type { RunResult, SqlDriver, SqlParam } from './driver'

export class SqliteDriver implements SqlDriver {
  private readonly db: BunDatabase

  constructor(path: string) {
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true })
    }
    this.db = new BunDatabase(path, { create: true })
    this.db.exec('PRAGMA journal_mode = WAL;')
    this.db.exec('PRAGMA foreign_keys = ON;')
  }

  async all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    return this.db.query(sql).all(...(params as unknown as any[])) as T[]
  }

  async get<T>(sql: string, params: SqlParam[] = []): Promise<T | null> {
    const rows = this.db.query(sql).all(...(params as unknown as any[])) as T[]
    return rows.length > 0 ? rows[0] : null
  }

  async run(sql: string, params: SqlParam[] = []): Promise<RunResult> {
    const result = this.db.query(sql).run(...(params as unknown as any[]))
    return { changes: Number(result.changes ?? 0) }
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql)
  }
}