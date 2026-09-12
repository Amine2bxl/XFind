import { z } from 'zod'
import { GENDERS, LISTING_CONDITIONS, SORT_OPTIONS } from './types'

const optionalString = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v))

export const searchQuerySchema = z.object({
  q: optionalString(160),
  brandId: optionalString(64),
  brand: optionalString(80),
  categoryId: optionalString(64),
  modelId: optionalString(64),
  size: optionalString(16),
  minPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  maxPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  condition: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => normalizeList(v, LISTING_CONDITIONS as unknown as string[])),
  color: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => normalizeList(v)),
  gender: z.enum(GENDERS).optional(),
  sort: z.enum(SORT_OPTIONS as unknown as [string, ...string[]]).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  perPage: z.coerce.number().int().min(1).max(60).optional(),
})

export type SearchQueryInput = z.infer<typeof searchQuerySchema>

export const suggestionQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(20).optional(),
})

export const registerSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  name: optionalString(80),
})

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
})

export const savedSearchInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  query: optionalString(200),
  brandId: optionalString(64),
  categoryId: optionalString(64),
  modelId: optionalString(64),
  minPrice: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  maxPrice: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  currency: z.string().trim().length(3).optional(),
  sizes: z.array(z.string().max(16)).max(30).optional(),
  conditions: z.array(z.string().max(40)).max(10).optional(),
  colors: z.array(z.string().max(30)).max(20).optional(),
  keywordsInclude: z.array(z.string().max(40)).max(20).optional(),
  keywordsExclude: z.array(z.string().max(40)).max(20).optional(),
  isActive: z.boolean().optional(),
  notificationEnabled: z.boolean().optional(),
  notificationChannel: z.enum(['in_app', 'email', 'push']).optional(),
})

export const savedSearchUpdateSchema = savedSearchInputSchema.partial()

export const notificationSettingsSchema = z.object({
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
})

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  notificationSettings: notificationSettingsSchema.optional(),
})

export const favoriteInputSchema = z.object({
  listingId: z.string().trim().min(1).max(64),
})

export const outclickSchema = z.object({
  listingId: z.string().trim().min(1).max(64),
})

export const ingestionRunSchema = z.object({
  provider: z.enum(['mock', 'vinted']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

function normalizeList(
  value: string | string[] | undefined,
  allowed?: string[],
): string[] | undefined {
  if (value === undefined) return undefined
  const raw = Array.isArray(value) ? value : value.split(',')
  const cleaned = raw
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .filter((v) => (allowed ? allowed.includes(v) : true))
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : undefined
}

export { normalizeList }
