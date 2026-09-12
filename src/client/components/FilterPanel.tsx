import { useEffect, useMemo, useState } from 'react'
import type { Brand, CategoryNode, SearchFilters } from '@shared/types'
import { api } from '../lib/api'
import { cn, Field, Input, Select } from './ui'

export const SIZE_OPTIONS = [
  '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47',
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size',
]

export const CONDITION_OPTIONS = [
  { value: 'new_with_tags', label: 'New with tags' },
  { value: 'new_without_tags', label: 'New without tags' },
  { value: 'very_good', label: 'Very good' },
  { value: 'good', label: 'Good' },
  { value: 'satisfactory', label: 'Satisfactory' },
]

export const COLOR_OPTIONS = [
  'Black', 'White', 'Grey', 'Navy', 'Blue', 'Green', 'Red', 'Brown', 'Beige',
  'Cream', 'Burgundy', 'Pink', 'Orange', 'Yellow', 'Purple', 'Khaki', 'Multi',
]

export const GENDER_OPTIONS = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'kids', label: 'Kids' },
]

export function FilterPanel({
  filters,
  onChange,
}: {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
}) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [brandQuery, setBrandQuery] = useState('')

  useEffect(() => {
    void api
      .get<{ categories: CategoryNode[] }>('/api/categories')
      .then((d) => setCategories(d.categories))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => {
      void api
        .get<{ brands: Brand[] }>(`/api/brands?q=${encodeURIComponent(brandQuery)}&perPage=40`)
        .then((d) => setBrands(d.brands))
        .catch(() => undefined)
    }, 150)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [brandQuery])

  const flatCategories = useMemo(() => {
    const result: Array<{ id: string; name: string; level: number }> = []
    const walk = (nodes: CategoryNode[], level: number) => {
      for (const node of nodes) {
        result.push({ id: node.id, name: node.name, level })
        walk(node.children, level + 1)
      }
    }
    walk(categories, 0)
    return result
  }, [categories])

  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch })
  const toggleIn = (field: 'condition' | 'color', value: string) => {
    const current = filters[field] ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    set({ [field]: next.length > 0 ? next : undefined } as Partial<SearchFilters>)
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Brand</h4>
        <input
          value={brandQuery}
          onChange={(e) => setBrandQuery(e.target.value)}
          placeholder="Find a brand..."
          className="mb-2 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm placeholder:text-neutral-400 outline-none focus:border-neutral-400"
        />
        <select
          value={filters.brandId ?? ''}
          onChange={(e) => set({ brandId: e.target.value || undefined, brand: undefined })}
          className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-neutral-400"
          size={Math.min(6, Math.max(1, brands.length))}
          style={{ minHeight: 44 }}
        >
          <option value="">Any brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.listingCount !== undefined ? `(${b.listingCount})` : ''}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Category</h4>
        <select
          value={filters.categoryId ?? ''}
          onChange={(e) => set({ categoryId: e.target.value || undefined })}
          className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-neutral-400"
        >
          <option value="">Any category</option>
          {flatCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.level > 0 ? `${'\u00A0'.repeat(c.level * 2)}${c.name}` : c.name}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Size</h4>
        <select
          value={filters.size ?? ''}
          onChange={(e) => set({ size: e.target.value || undefined })}
          className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-neutral-400"
        >
          <option value="">Any size</option>
          {SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Price (EUR)</h4>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Min"
            value={filters.minPrice ?? ''}
            onChange={(e) => set({ minPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="h-9"
          />
          <span className="text-neutral-400">–</span>
          <Input
            type="number"
            min={0}
            placeholder="Max"
            value={filters.maxPrice ?? ''}
            onChange={(e) => set({ maxPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="h-9"
          />
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Condition</h4>
        <div className="flex flex-col gap-1.5">
          {CONDITION_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={(filters.condition ?? []).includes(option.value)}
                onChange={() => toggleIn('condition', option.value)}
                className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
              />
              {option.label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Colour</h4>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map((color) => {
            const active = (filters.color ?? []).includes(color.toLowerCase())
            return (
              <button
                key={color}
                onClick={() => toggleIn('color', color.toLowerCase())}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400',
                )}
              >
                {color}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Gender</h4>
        <Field label="">
          <Select
            value={filters.gender ?? ''}
            onChange={(e) => set({ gender: (e.target.value || undefined) as SearchFilters['gender'] })}
          >
            <option value="">Any</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </Field>
      </section>
    </div>
  )
}