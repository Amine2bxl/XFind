import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SavedSearch } from '@shared/types'
import { api } from '../lib/api'
import { relativeTime } from '../lib/format'
import { useSeo } from '../lib/seo'
import { Badge, Button, EmptyState, Input, Modal, Spinner, Toggle } from '../components/ui'

interface SavedSearchRow extends SavedSearch {
  matchCount: number
  lastMatchAt: string | null
}

function searchSummary(search: SavedSearch): string[] {
  const parts: string[] = []
  if (search.query) parts.push(`“${search.query}”`)
  if (search.brandId || search.categoryId || search.modelId) parts.push('structured filters')
  if (search.minPrice !== null || search.maxPrice !== null) {
    const min = search.minPrice !== null ? `€${search.minPrice}` : ''
    const max = search.maxPrice !== null ? `€${search.maxPrice}` : ''
    parts.push(min && max ? `${min}–${max}` : min || max)
  }
  if (search.sizes.length) parts.push(`sizes ${search.sizes.join(', ')}`)
  if (search.conditions.length) parts.push(`${search.conditions.length} condition${search.conditions.length > 1 ? 's' : ''}`)
  if (search.colors.length) parts.push(`${search.colors.length} colour${search.colors.length > 1 ? 's' : ''}`)
  return parts
}

export function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SavedSearchRow | null>(null)

  useSeo('Saved searches — XFind', 'Manage your saved searches and listing alerts.')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ savedSearches: SavedSearchRow[] }>('/api/saved-searches')
      setSearches(data.savedSearches)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load saved searches.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleActive(search: SavedSearchRow) {
    const updated = await api
      .patch<{ savedSearch: SavedSearch }>(`/api/saved-searches/${search.id}`, {
        isActive: !search.isActive,
      })
      .catch(() => null)
    if (updated) await load()
  }

  async function toggleNotifications(search: SavedSearchRow) {
    const updated = await api
      .patch<{ savedSearch: SavedSearch }>(`/api/saved-searches/${search.id}`, {
        notificationEnabled: !search.notificationEnabled,
      })
      .catch(() => null)
    if (updated) await load()
  }

  async function remove(search: SavedSearchRow) {
    if (!window.confirm(`Delete saved search “${search.name}”?`)) return
    await api.delete(`/api/saved-searches/${search.id}`).catch(() => undefined)
    await load()
  }

  async function submit(input: { name: string; query?: string; maxPrice?: number }) {
    if (editing) {
      await api.patch(`/api/saved-searches/${editing.id}`, input)
    } else {
      await api.post('/api/saved-searches', {
        ...input,
        query: input.query ?? null,
        minPrice: null,
        maxPrice: input.maxPrice ?? null,
        sizes: [],
        conditions: [],
        colors: [],
        keywordsInclude: [],
        keywordsExclude: [],
        isActive: true,
        notificationEnabled: true,
        notificationChannel: 'in_app',
      })
    }
    setFormOpen(false)
    setEditing(null)
    await load()
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mt-10 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Saved searches</h1>
          <p className="mt-1 text-sm text-neutral-500">Get alerted the moment a matching listing appears.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>New saved search</Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7" /></div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-neutral-500">{error}</div>
        ) : searches.length === 0 ? (
          <EmptyState
            title="No saved searches yet"
            description="Save a search to monitor it. You'll be notified when new matching listings are ingested."
            action={
              <Button onClick={() => setFormOpen(true)}>Create your first saved search</Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {searches.map((search) => {
              const summary = searchSummary(search)
              return (
                <div key={search.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-neutral-900">{search.name}</h3>
                        <Badge tone={search.isActive ? 'success' : 'neutral'}>
                          {search.isActive ? 'Active' : 'Paused'}
                        </Badge>
                        {search.notificationEnabled && search.isActive && (
                          <Badge tone="info">Notifications on ({search.notificationChannel})</Badge>
                        )}
                      </div>
                      {summary.length > 0 && (
                        <p className="mt-1 truncate text-sm text-neutral-500">{summary.join(' · ')}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                        <span>
                          <strong className="font-semibold text-neutral-600">{search.matchCount}</strong> matches
                        </span>
                        <span>
                          Last match:{' '}
                          {search.lastMatchAt ? relativeTime(search.lastMatchAt) : 'never'}
                        </span>
                        <span>Updated {relativeTime(search.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link to={searchUrl(search)}>
                        <Button variant="ghost" size="sm">Run</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(search)
                          setFormOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(search)} className="text-red-600 hover:bg-red-50">
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-neutral-100 pt-1">
                    <Toggle
                      checked={search.isActive}
                      onChange={() => toggleActive(search)}
                      label="Monitoring on"
                      description="New matching listings are compared on every ingestion run."
                    />
                    <Toggle
                      checked={search.notificationEnabled}
                      onChange={() => toggleNotifications(search)}
                      label="Notify me"
                      description="Create an in-app notification when a new match is found."
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {formOpen && (
        <SavedSearchForm
          editing={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSubmit={submit}
        />
      )}
    </div>
  )
}

function searchUrl(search: SavedSearch): string {
  const params = new URLSearchParams()
  if (search.query) params.set('q', search.query)
  if (search.maxPrice !== null) params.set('maxPrice', String(search.maxPrice))
  return `/search?${params.toString()}`
}

function SavedSearchForm({
  editing,
  onClose,
  onSubmit,
}: {
  editing: SavedSearchRow | null
  onClose: () => void
  onSubmit: (input: { name: string; query?: string; maxPrice?: number }) => Promise<void>
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [query, setQuery] = useState(editing?.query ?? '')
  const [maxPrice, setMaxPrice] = useState(() => (editing?.maxPrice !== null && editing?.maxPrice !== undefined ? String(editing.maxPrice) : ''))
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        query: query.trim() || undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit saved search' : 'New saved search'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!name.trim()}>
            {editing ? 'Save changes' : 'Save search'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Prada America's Cup — size 42" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Search query</span>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. prada america's cup" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Max price (EUR)</span>
          <Input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="250" />
        </label>
        <p className="text-xs text-neutral-400">
          Tip: use the search page and add structured filters (brand, size, condition, colour) — richer saved searches get richer matches.
        </p>
      </div>
    </Modal>
  )
}