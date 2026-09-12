import { createContext } from '../src/server/context'
import { config } from '../src/server/config'

/**
 * Marks an existing user as an admin (used for the /admin/ingestion area).
 * Usage: bun run db:set-admin -- you@example.com
 */
async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: bun run db:set-admin -- <email>')
    process.exit(1)
  }
  const ctx = await createContext()
  const user = await ctx.db.getUserByEmail(email)
  if (!user) {
    console.error(`No user found for ${email}.`)
    process.exit(1)
  }
  await ctx.db.setAdmin(user.id, true)
  console.log(`Marked ${user.email} as admin. (database: ${config.database.type})`)
  process.exit(0)
}

void main()