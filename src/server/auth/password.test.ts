import { describe, expect, test } from 'bun:test'
import { hashPassword, verifyPasswordStored } from './password'

describe('password hashing (portable scrypt)', () => {
  test('hash then verify', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(await verifyPasswordStored('correct horse battery staple', hash)).toBe(true)
    expect(await verifyPasswordStored('wrong password', hash)).toBe(false)
  })

  test('different salts produce different hashes', async () => {
    const a = await hashPassword('same-password')
    const b = await hashPassword('same-password')
    expect(a).not.toBe(b)
  })

  test('rejects unknown scheme', async () => {
    expect(await verifyPasswordStored('x', 'nonsense-format')).toBe(false)
  })
})