import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Brand } from '@shared/types'
import { api } from '../lib/api'
import { useSeo } from '../lib/seo'
import { EmptyState, Input } from '../components/ui'

export function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useSeo('Brands — XFind', 'Explore the normalized brand catalogue used for Vinted search.')

  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => {
      void api
        .get<{ brands: Brand[]; total: number }>(`/api/brands?q=${encodeURIComponent(query)}&perPage=300`)
        .then((d) => setBrands(d.brands))
        .catch(() => undefined)
        .finally(() => setLoading(false))
    }, 120)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<string, Brand[]>()
    for (const brand of brands) {
      const letter = (brand.name.charAt(0) || '#').toUpperCase()
      const list = map.get(letter) ?? []
      list.push(brand)
      map.set(letter, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [brands])

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mt-10 max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Brands</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Canonical brands with unified names and aliases — so “NIKE”, “Nike SB” and “Jordan” all resolve cleanly.
        </p>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brands..."
          className="mt-5"
          autoFocus
        />
      </div>

      {loading && brands.length === 0 ? (
        <div className="mt-8 flex flex-wrap gap-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-10 w-32 animate-pulse rounded-full bg-neutral-200/70" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No brands found" description={`No brand matches “${query}”.`} />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {grouped.map(([letter, items]) => (
            <section key={letter}>
              <h2 className="mb-3 border-b border-neutral-200 pb-1 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                {letter}
              </h2>
              <div className="flex flex-wrap gap-2">
                {items.map((brand) => (
                  <Link
                    key={brand.id}
                    to={`/brand/${brand.slug}`}
                    className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1.5 pl-4 pr-3 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900"
                  >
                    {brand.name}
                    {brand.listingCount !== undefined && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                        {brand.listingCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}