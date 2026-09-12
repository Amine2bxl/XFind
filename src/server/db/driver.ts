export interface RunResult {
  changes: number
}

export type SqlParam = string | number | bigint | null | boolean | Uint8Array

export interface SqlDriver {
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>
  get<T>(sql: string, params?: SqlParam[]): Promise<T | null>
  run(sql: string, params?: SqlParam[]): Promise<RunResult>
  exec(sql: string): Promise<void>
}