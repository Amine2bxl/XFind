import type { SearchFilters } from '@shared/types'

export function parseSearchParams(params: URLSearchParams): SearchFilters {
  const rawParse = (v: string | null): number | undefined => {
    if (!v || v.trim() === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  const list = (v: string | null): string[] | undefined => {
    if (!v) return undefined
    const parts = v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return parts.length > 0 ? parts : undefined
  }

  return {
    q: params.get('q') ?? undefined,
    brandId: params.get('brandId') ?? undefined,
    brand: params.get('brand') ?? undefined,
    categoryId: params.get('categoryId') ?? undefined,
    modelId: params.get('modelId') ?? undefined,
    size: params.get('size') ?? undefined,
    minPrice: rawParse(params.get('minPrice')),
    maxPrice: rawParse(params.get('maxPrice')),
    condition: list(params.get('condition')),
    color: list(params.get('color')),
    gender: (params.get('gender') as SearchFilters['gender']) ?? undefined,
    sort:
      (params.get('sort') as SearchFilters['sort']) ?? ('newest' as SearchFilters['sort']),
  }
}

export function toSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams()
  const set = (key: string, value: string | number | undefined | null) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  }
  set('q', filters.q)
  set('brandId', filters.brandId)
  set('brand', filters.brand)
  set('categoryId', filters.categoryId)
  set('modelId', filters.modelId)
  set('size', filters.size)
  set('minPrice', filters.minPrice)
  set('maxPrice', filters.maxPrice)
  if (filters.condition && filters.condition.length > 0) set('condition', filters.condition.join(','))
  if (filters.color && filters.color.length > 0) set('color', filters.color.join(','))
  set('gender', filters.gender)
  if (filters.sort && filters.sort !== 'newest') set('sort', filters.sort)
  return params
}

export function activeFilterCount(filters: SearchFilters): number {
  let count = 0
  if (filters.q) count += 1
  if (filters.brandId || filters.brand) count += 1
  if (filters.categoryId) count += 1
  if (filters.modelId) count += 1
  if (filters.size) count += 1
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1
  if (filters.condition && filters.condition.length) count += 1
  if (filters.color && filters.color.length) count += 1
  if (filters.gender) count += 1
  return count
}

export function filtersKey(filters: SearchFilters): string {
  return toSearchParams(filters).toString()
}