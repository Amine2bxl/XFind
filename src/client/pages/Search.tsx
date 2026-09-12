import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ListingWithRelevance, SearchFilters, SearchIntent, SearchResponse } from '@shared/types'
import { api } from '../lib/api'
import { activeFilterCount, filtersKey, parseSearchParams, toSearchParams } from '../lib/search-params'
import { useSeo } from '../lib/seo'
import { SearchBar } from '../components/SearchBar'
import { ListingCard, ListingCardSkeleton } from '../components/ListingCard'
import { FilterPanel } from '../components/FilterPanel'
import { NewListingsFeed } from '../components/NewListingsFeed'
import { Badge, Button, EmptyState, ErrorState, Modal, Select } from '../components/ui'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'price_desc', label: 'Highest price' },
  { value: 'relevance', label: 'Relevance' },
]

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseSearchParams(searchParams), [searchParams])
  const key = useMemo(() => filtersKey(filters), [filters])
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [listings, setListings] = useState<ListingWithRelevance[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [intent, setIntent] = useState<SearchIntent | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showMatch, setShowMatch] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useSeo(
    filters.q
      ? `Search: ${filters.q} — XFind`
      : 'Search — XFind',
    `Search ${filters.q ?? 'listings'} across brands, models and categories.`,
  )

  useEffect(() => {
    setShowMatch((filters.sort ?? 'newest') === 'relevance')
  }, [filters.sort])

  // Reset pagination when filters change.
  useEffect(() => {
    setPage(1)
  }, [key])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadingMore(false)
    setError(null)
    const params = toSearchParams(filters)
    params.set('page', String(page))
    params.set('perPage', '24')

    api
      .get<SearchResponse>(`/api/search?${params.toString()}`)
      .then((res) => {
        if (controller.signal.aborted) return
        setTotal(res.total)
        setTotalPages(res.totalPages)
        setIntent(res.intent)
        setListings((prev) => (page === 1 ? res.listings : [...prev, ...res.listings]))
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Search failed.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
          setLoadingMore(false)
        }
      })
    return () => controller.abort()
  }, [key, page, filters])

  // Poll for newly ingested listings matching the current baseline.
  useEffect(() => {
    let cancelled = false
    const baseline = new Date().toISOString()
    const tick = async () => {
      try {
        const data = await api.get<{ count: number }>(`/api/live/new?since=${encodeURIComponent(baseline)}`)
        if (!cancelled) setNewCount(data.count)
      } catch {
        /* quiet */
      }
    }
    void tick()
    const timer = setInterval(tick, 15_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [key])

  const updateFilters = (next: SearchFilters) => {
    setSearchParams(toSearchParams(next), { replace: true })
  }

  const onSort = (sort: string) => {
    updateFilters({ ...filters, sort: sort as SearchFilters['sort'] })
  }

  const showNew = () => {
    setNewCount(0)
    setPage(1)
    setListings([])
  }

  async function saveCurrentSearch() {
    setSaveMsg(null)
    const userCheck = await api
      .get<{ user: { id: string } | null }>('/api/auth/me')
      .then((d) => d.user)
      .catch(() => null)
    if (!userCheck) {
      void navigate(`/login?next=${encodeURIComponent(`/search?${searchParams.toString()}`)}`)
      return
    }
    const name = filters.q ? filters.q : `Search saved on ${new Date().toLocaleDateString('en-GB')}`
    try {
      await api.post('/api/saved-searches', {
        name,
        query: filters.q ?? null,
        brandId: filters.brandId ?? null,
        categoryId: filters.categoryId ?? null,
        modelId: filters.modelId ?? null,
        minPrice: filters.minPrice ?? null,
        maxPrice: filters.maxPrice ?? null,
        sizes: filters.size ? [filters.size] : [],
        conditions: filters.condition ?? [],
        colors: filters.color ?? [],
        keywordsInclude: [],
        keywordsExclude: [],
        isActive: true,
        notificationEnabled: true,
        notificationChannel: 'in_app',
      })
      setSaveMsg('Search saved. You’ll be alerted on new matches.')
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Could not save this search.')
    }
  }

  const intentChips = useMemo(() => {
    if (!intent) return []
    const chips: Array<{ label: string; tone?: 'neutral' | 'success' | 'info' }> = []
    if (intent.brand)
      chips.push({ label: `Brand: ${intent.brand}`, tone: 'success' })
    if (intent.model)
      chips.push({ label: `Model: ${intent.model}`, tone: 'success' })
    if (intent.category) chips.push({ label: `Category: ${intent.category}` })
    if (intent.size) chips.push({ label: `Size: ${intent.size}` })
    if (intent.color) chips.push({ label: `Colour: ${intent.color}` })
    return chips
  }, [intent])

  const filterCount = useMemo(() => activeFilterCount(filters), [filters])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mt-6 flex flex-col gap-3">
        <SearchBar size="lg" initialValue={filters.q ?? ''} />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filters{filterCount > 0 ? ` (${filterCount})` : ''}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-neutral-400 sm:block">Sort by</span>
            <Select value={filters.sort ?? 'newest'} onChange={(e) => onSort(e.target.value)} className="h-9 w-40">
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-100">Filters</h3>
              {filterCount > 0 && (
                <button onClick={() => updateFilters({ sort: filters.sort })} className="text-xs font-medium text-neutral-400 hover:text-neutral-50">
                  Reset
                </button>
              )}
            </div>
            <FilterPanel filters={filters} onChange={updateFilters} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {newCount > 0 && (
            <button
              onClick={showNew}
              className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-blue-800 bg-blue-950/40 px-4 py-3 text-left"
            >
              <span className="text-sm font-medium text-blue-200">
                {newCount} new listing{newCount > 1 ? 's' : ''} available
              </span>
              <span className="text-sm font-semibold text-blue-300 underline underline-offset-2">Show new listings</span>
            </button>
          )}

          <div className="mb-6">
            <NewListingsFeed />
          </div>

          {intentChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-500">Interpreted as:</span>
              {intentChips.map((chip) => (
                <Badge key={chip.label} tone={chip.tone}>
                  {chip.label}
                </Badge>
              ))}
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              {loading && total === null
                ? 'Searching...'
                : total !== null
                  ? `${total.toLocaleString()} result${total === 1 ? '' : 's'}`
                  : ''}
            </p>
            <div className="flex items-center gap-3">
              {saveMsg && <span className="text-xs text-emerald-400">{saveMsg}</span>}
              <button
                onClick={() => void saveCurrentSearch()}
                className="text-xs font-medium text-neutral-400 hover:text-neutral-50"
              >
                Save this search
              </button>
            </div>
          </div>

          {error && (
            <ErrorState
              title="Search is temporarily unavailable"
              description={error}
              onRetry={() => setPage(1)}
            />
          )}

          {!error && loading && total === null && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!error && total === 0 && !loading && (
            <EmptyState
              icon={<SearchIcon />}
              title="No listings found"
              description="Try removing a filter, changing your search, or broadening the price range."
              action={
                <Button variant="secondary" onClick={() => navigate('/search')}>
                  Start a new search
                </Button>
              }
            />
          )}

          {listings.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} showMatch={showMatch} />
              ))}
            </div>
          )}

          {loadingMore && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!error && total !== null && page < totalPages && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" loading={loadingMore} onClick={() => setPage((p) => p + 1)}>
                Load more
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <FilterPanel filters={filters} onChange={updateFilters} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => updateFilters({ sort: filters.sort })}>
            Reset
          </Button>
          <Button onClick={() => setFiltersOpen(false)}>Show results{total !== null ? ` (${total})` : ''}</Button>
        </div>
      </Modal>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}