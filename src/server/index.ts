import { createContext, seedIfEmpty } from './context'
import { buildApp } from './app'
import { assertProductionConfig, config, isProduction } from './config'

async function main() {
  const problems = assertProductionConfig()
  if (config.isProduction && problems.length > 0) {
    console.error('[xfind] Production configuration is incomplete:')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }

  const ctx = await createContext()

  if (!isProduction && config.providers.mockEnabled) {
    const summary = await seedIfEmpty(ctx)
    if (summary) {
      console.log(
        `[xfind] Seeded development data: ${summary.brands} brands, ${summary.categories} categories, ${summary.models} models, ${summary.listings} listings (labelled mock data).`,
      )
    }
  }

  if (!isProduction) {
    await ctx.ingestion
      .startWorker(Number(process.env.INGESTION_INTERVAL_MS || 300_000))
      .catch((error) => console.error('[xfind] ingestion worker failed to start', error))
  }

  const app = buildApp(ctx)

  console.log(`[xfind] API listening on http://localhost:${config.port}`)
  Bun.serve({ fetch: app.fetch, port: config.port })
}

void main()