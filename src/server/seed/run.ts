import { createContext } from '../context'
import { seedDatabase } from './seed'
import { config } from '../config'

async function main() {
  const ctx = await createContext()
  const summary = await seedDatabase(ctx.db, {
    brands: ctx.brands,
    catalog: ctx.catalog,
    ingestion: ctx.ingestion,
  })
  console.log('Seeded database:')
  console.log(`  brands: ${summary.brands}`)
  console.log(`  categories: ${summary.categories}`)
  console.log(`  models: ${summary.models}`)
  console.log(`  listings: ${summary.listings}`)
  console.log(`  database: ${config.database.type} (${config.database.path})`)
  process.exit(0)
}

void main()