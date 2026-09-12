import type { Brand, Category, Model, SearchIntent } from '../../shared/types'

/** Strip accents, lowercase, collapse whitespace, drop non-alphanumerics. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function tokenize(input: string): string[] {
  const normalized = normalizeText(input)
  return normalized.length > 0 ? normalized.split(' ') : []
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function displayNormalize(input: string): string {
  return input
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const COLORS: Record<string, string[]> = {
  black: ['black', 'noir'],
  white: ['white', 'blanc'],
  grey: ['grey', 'gray', 'gris'],
  red: ['red', 'rouge'],
  blue: ['blue', 'bleu', 'navy', 'navy blue'],
  green: ['green', 'vert', 'olive', 'olive green'],
  yellow: ['yellow', 'jaune'],
  orange: ['orange'],
  purple: ['purple', 'violet'],
  pink: ['pink', 'rose', 'blush'],
  brown: ['brown', 'marron', 'chocolate'],
  beige: ['beige', 'ecru', 'cream', 'sand'],
  burgundy: ['burgundy', 'bordeaux', 'maroon'],
  gold: ['gold', 'golden'],
  silver: ['silver', 'grey silver'],
  khaki: ['khaki', 'military green'],
  multi: ['multi', 'multicolor', 'multicolour'],
}

export const COLOR_NAMES = Object.keys(COLORS)

const GENDER_MAP: Record<string, string> = {
  women: 'women',
  woman: 'women',
  femme: 'women',
  girl: 'women',
  mens: 'men',
  men: 'men',
  man: 'men',
  homme: 'men',
  boy: 'men',
  unisex: 'unisex',
  kids: 'kids',
  kid: 'kids',
  child: 'kids',
}

const SIZE_RANGE_MIN = 14
const SIZE_RANGE_MAX = 70

const NOISE_TOKENS = new Set([
  'size',
  'sizes',
  'eu',
  'euro',
  'euros',
  'eur',
  'us',
  'usa',
  'uk',
  'fr',
  'new',
  'rrp',
  'nv',
  'avec',
  'free',
  'shipping',
  'brand',
  'model',
  'color',
])

export function normalizeSize(input: string): string[] {
  const cleaned = normalizeText(input).replace(/\s+/g, ' ')
  const candidates: string[] = []

  const euMatch = cleaned.match(/^(eu|europe)?\s*(\d{2}(?:\.5)?)$/)
  if (euMatch) candidates.push(euMatch[2])

  const usMatch = cleaned.match(/^us\s*(\d{1,2}(?:\.5)?)$/)
  if (usMatch) candidates.push(`us${usMatch[1]}`)

  const ukMatch = cleaned.match(/^uk\s*(\d{1,2}(?:\.5)?)$/)
  if (ukMatch) candidates.push(`uk${ukMatch[1]}`)

  const genericMatch = cleaned.match(/^(\d{2}(?:\.5)?)$/)
  if (genericMatch) candidates.push(genericMatch[1])

  if (['s', 'm', 'l', 'xl', 'xxl', 'xs'].includes(cleaned)) candidates.push(cleaned.toUpperCase())

  return candidates.length > 0 ? Array.from(new Set(candidates)) : []
}

interface PhraseMatch {
  phrase: string
  start: number
  end: number
}

/**
 * Finds the longest contiguous match of any phrase (as normalized word
 * sequences) within the query tokens.
 */
export function findBestPhrase(qTokens: string[], phrases: string[]): PhraseMatch | null {
  const normalized = phrases.map((p) => ({ norm: normalizeText(p), raw: p }))
  const entries: Array<{ words: string[]; raw: string }> = []
  for (const n of normalized) {
    const words = n.norm.split(' ').filter((w) => w.length > 0)
    if (words.length > 0) entries.push({ words, raw: n.raw })
  }
  entries.sort((a, b) => {
    if (b.words.length !== a.words.length) return b.words.length - a.words.length
    return b.raw.length - a.raw.length
  })

  for (const entry of entries) {
    const n = entry.words.length
    for (let i = 0; i <= qTokens.length - n; i++) {
      let matches = true
      for (let j = 0; j < n; j++) {
        if (qTokens[i + j] !== entry.words[j]) {
          matches = false
          break
        }
      }
      if (matches) return { phrase: entry.raw, start: i, end: i + n }
    }
  }
  return null
}

export interface IntentContext {
  brands: Brand[]
  models: Model[]
  categories: Category[]
}

export function detectIntent(query: string, ctx: IntentContext): SearchIntent {
  const tokens = tokenize(query).filter((t) => t.length > 0)
  const consumed = new Set<number>()
  const result: SearchIntent = {
    brand: null,
    brandId: null,
    model: null,
    modelId: null,
    category: null,
    categoryId: null,
    color: null,
    size: null,
    gender: null,
    keywords: [],
  }

  // 1. Brand detection (longest phrase match over canonical names + aliases)
  const brandPhrases: string[] = []
  for (const brand of ctx.brands) {
    brandPhrases.push(brand.name, ...brand.aliases)
  }
  const brandMatch = findBestPhrase(tokens, brandPhrases)
  let matchedBrandId: string | null = null
  if (brandMatch) {
    for (let i = brandMatch.start; i < brandMatch.end; i++) consumed.add(i)
    const matchedBrand = ctx.brands.find(
      (b) => normalizeText(b.name) === normalizeText(brandMatch.phrase) || b.aliases.some((a) => normalizeText(a) === normalizeText(brandMatch.phrase)),
    )
    result.brand = matchedBrand?.name ?? displayNormalize(brandMatch.phrase)
    result.brandId = matchedBrand?.id ?? null
    matchedBrandId = matchedBrand?.id ?? null
  }

  // 2. Model detection (restrict to the matched brand when possible)
  const remainingTokens = tokens.filter((_, i) => !consumed.has(i))
  const modelPhrases: string[] = []
  const modelReferences = new Map<string, Model>()
  const candidates = matchedBrandId
    ? ctx.models.filter((m) => m.brandId === matchedBrandId)
    : ctx.models
  for (const model of candidates) {
    modelPhrases.push(model.name, ...model.aliases)
    modelReferences.set(normalizeText(model.name), model)
    for (const a of model.aliases) modelReferences.set(normalizeText(a), model)
  }
  const modelMatch = findBestPhrase(remainingTokens, modelPhrases)
  if (modelMatch) {
    const model = modelReferences.get(normalizeText(modelMatch.phrase))
    result.model = model?.name ?? displayNormalize(modelMatch.phrase)
    result.modelId = model?.id ?? null
    removeConsumedFromOriginal(tokens, consumed, remainingTokens, modelMatch)
  }

  // 3. Category detection
  const remainingTokens2 = tokens.filter((_, i) => !consumed.has(i))
  const categoryPhrases = ctx.categories.map((c) => c.name)
  const categoryReferences = new Map<string, Category>()
  for (const c of ctx.categories) categoryReferences.set(normalizeText(c.name), c)
  const categoryMatch = findBestPhrase(remainingTokens2, categoryPhrases)
  if (categoryMatch) {
    const category = categoryReferences.get(normalizeText(categoryMatch.phrase))
    result.category = category?.name ?? displayNormalize(categoryMatch.phrase)
    result.categoryId = category?.id ?? null
    removeConsumedFromOriginal(tokens, consumed, remainingTokens2, categoryMatch)
  }

  // 4. Size detection
  const remainingTokens3 = tokens.filter((_, i) => !consumed.has(i))
  for (let i = 0; i < remainingTokens3.length; i++) {
    const token = remainingTokens3[i]
    const numeric = token.match(/^(\d{1,3}(?:\.5)?)$/)
    if (numeric) {
      const value = Number(numeric[1])
      if (value >= SIZE_RANGE_MIN && value <= SIZE_RANGE_MAX) {
        result.size = numeric[1]
        removeTokenFromOriginal(tokens, consumed, token)
        break
      }
    }
    if (token === 'us' && i + 1 < remainingTokens3.length && /^\d{1,2}$/.test(remainingTokens3[i + 1])) {
      result.size = `us${remainingTokens3[i + 1]}`
      removeTokenFromOriginal(tokens, consumed, token)
      removeTokenFromOriginal(tokens, consumed, remainingTokens3[i + 1])
      break
    }
  }

  // 5. Color detection
  const remainingTokens4 = tokens.filter((_, i) => !consumed.has(i))
  for (const token of remainingTokens4) {
    for (const [colorName, aliases] of Object.entries(COLORS)) {
      if (aliases.map(normalizeText).includes(token)) {
        result.color = colorName
        removeTokenFromOriginal(tokens, consumed, token)
        break
      }
    }
  }

  // 6. Gender detection (a soft hint; does not restrict keywords)
  const remainingTokens5 = tokens.filter((_, i) => !consumed.has(i))
  for (const token of remainingTokens5) {
    const gender = GENDER_MAP[token]
    if (gender) {
      result.gender = gender
      removeTokenFromOriginal(tokens, consumed, token)
      break
    }
  }

  // 7. Remaining tokens become keywords (minus structural noise words)
  const remainingTokens6 = tokens
    .filter((_, i) => !consumed.has(i))
    .filter((t) => !NOISE_TOKENS.has(t) && !/^\d+(\.5)?$/.test(t))
  result.keywords = remainingTokens6

  return result
}

function removeConsumedFromOriginal(tokens: string[], consumed: Set<number>, slice: string[], match: PhraseMatch): void {
  // The slice indices are relative to the sliced array, which keeps the same
  // relative order as tokens. Find the run in `tokens` matching the phrase.
  const phraseNorm = normalizeText(match.phrase).split(' ').filter((w) => w.length > 0)
  for (let i = 0; i <= tokens.length - phraseNorm.length; i++) {
    let matches = true
    for (let j = 0; j < phraseNorm.length; j++) {
      if (tokens[i + j] !== phraseNorm[j] || consumed.has(i + j)) {
        matches = false
        break
      }
    }
    if (matches) {
      for (let j = 0; j < phraseNorm.length; j++) consumed.add(i + j)
      return
    }
  }
  void slice
}

function removeTokenFromOriginal(tokens: string[], consumed: Set<number>, token: string): void {
  for (let i = 0; i < tokens.length; i++) {
    if (!consumed.has(i) && tokens[i] === token) {
      consumed.add(i)
      return
    }
  }
}