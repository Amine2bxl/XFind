import type { RunResult, SqlDriver, SqlParam } from './driver'

interface BunSqlClient {
  unsafe: (query: string, ...values: unknown[]) => Promise<{ rows: Record<string, unknown>[]; meta: { rowCount?: number | bigint } }>
  close: () => Promise<void>
}

export class PostgresDriver implements SqlDriver {
  private client: BunSqlClient | null = null

  constructor(private readonly url: string) {}

  private async sql(): Promise<BunSqlClient> {
    if (this.client) return this.client
    // Bun.sql is Bun's native Postgres client. Imported lazily so the SQLite
    // development path never depends on it.
    const mod = (await import('bun')) as unknown as { SQL: new (url: string, opts: object) => BunSqlClient }
    this.client = new mod.SQL(this.url, { max: 5 })
    return this.client
  }

  private translatePlaceholders(sql: string): string {
    let counter = 0
    return sql.replace(/\?/g, () => {
      counter += 1
      return `$${counter}`
    })
  }

  async all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const client = await this.sql()
    const result = await client.unsafe(this.translatePlaceholders(sql), ...params)
    return (result.rows ?? []) as T[]
  }

  async get<T>(sql: string, params: SqlParam[] = []): Promise<T | null> {
    const client = await this.sql()
    const result = await client.unsafe(this.translatePlaceholders(sql), ...params)
    const rows = result.rows ?? []
    return ((rows.length > 0 ? rows[0] : null) as T) ?? null
  }

  async run(sql: string, params: SqlParam[] = []): Promise<RunResult> {
    const client = await this.sql()
    const result = await client.unsafe(this.translatePlaceholders(sql), ...params)
    const changes = result.meta?.rowCount !== undefined ? Number(result.meta.rowCount) : 1
    return { changes }
  }

  async exec(sql: string): Promise<void> {
    const client = await this.sql()
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    for (const statement of statements) {
      await client.unsafe(statement)
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close().catch(() => undefined)
      this.client = null
    }
  }
}