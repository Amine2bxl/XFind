import { Pool } from 'pg'
import type { RunResult, SqlDriver, SqlParam } from './driver'

/**
 * PostgreSQL driver built on `pg`. Production path (Supabase / any Postgres).
 * Works on both the Bun runtime and plain Node, which keeps the Vercel
 * serverless function deployable without pinning a custom runtime.
 */
export class PostgresDriver implements SqlDriver {
  private readonly pool: Pool

  constructor(url: string) {
    this.pool = new Pool({ connectionString: url, max: 5 })
  }

  private translate(sql: string): string {
    let counter = 0
    return sql.replace(/\?/g, () => {
      counter += 1
      return `$${counter}`
    })
  }

  async all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const result = await this.pool.query(this.translate(sql), params as unknown[])
    return result.rows as T[]
  }

  async get<T>(sql: string, params: SqlParam[] = []): Promise<T | null> {
    const rows = await this.all<T>(sql, params)
    return rows.length > 0 ? rows[0] : null
  }

  async run(sql: string, params: SqlParam[] = []): Promise<RunResult> {
    const result = await this.pool.query(this.translate(sql), params as unknown[])
    return { changes: result.rowCount ?? 1 }
  }

  async exec(sql: string): Promise<void> {
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    for (const statement of statements) {
      await this.pool.query(statement)
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}