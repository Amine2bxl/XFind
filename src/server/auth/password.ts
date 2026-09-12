import { scrypt as scryptCb, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>

export const PASSWORD_SCHEME = 'scrypt'

/** Hash a password with scrypt. Works on Bun and Node runtimes. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return `${PASSWORD_SCHEME}$${salt}$${derived.toString('hex')}`
}

async function verifyScrypt(password: string, salt: string, expectedHex: string): Promise<boolean> {
  const derived = await scrypt(password, salt, 64)
  const expected = Buffer.from(expectedHex, 'hex')
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

/**
 * Verify a password against a stored hash.
 * Supports the current `scrypt` format and legacy Bun `$2b$` bcrypt hashes.
 */
export async function verifyPasswordStored(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith(`${PASSWORD_SCHEME}$`)) {
    const [_scheme, salt, hash] = stored.split('$').slice(0, 3)
    if (!salt || !hash) return false
    return verifyScrypt(password, salt, hash)
  }
  if (stored.startsWith('$2')) {
    const runtime = globalThis as unknown as { Bun?: { password?: { verify?: (pw: string, hash: string) => Promise<boolean> } } }
    if (runtime.Bun?.password?.verify) {
      return runtime.Bun.password.verify(password, stored)
    }
    return false
  }
  return false
}