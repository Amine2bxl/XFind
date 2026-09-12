import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { Listing, ListingWithRelevance } from '@shared/types'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { conditionLabel, formatDate, formatPrice, relativeTime, titleCase } from '../lib/format'
import { useSeo } from '../lib/seo'
import { ImageWithFallback } from '../components/ImageWithFallback'
import { ListingCard, MatchBadge } from '../components/ListingCard'
import { Badge, Button, EmptyState, Spinner } from '../components/ui'

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [listing, setListing] = useState<Listing | null>(null)
  const [relevance, setRelevance] = useState<ListingWithRelevance['relevance'] | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [related, setRelated] = useState<Listing[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useSeo(
    listing ? `${listing.title} · ${listing.brand ?? 'XFind'}` : 'Listing — XFind',
    listing ? `${listing.brand ?? ''} ${listing.model ?? ''} — ${formatPrice(listing.price, listing.currency)} on XFind.` : undefined,
  )

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    const q = searchParams.get('q')
    const query = `/api/listings/${encodeURIComponent(id)}${q ? `?q=${encodeURIComponent(q)}` : ''}`
    api
      .get<{
        listing: Listing
        isFavorite: boolean
        relevance: ListingWithRelevance['relevance'] | null
      }>(query)
      .then((d) => {
        setListing(d.listing)
        setIsFavorite(d.isFavorite)
        setRelevance(d.relevance)
        setActiveImage(0)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this listing.'))
      .finally(() => setLoading(false))
  }, [id, searchParams])

  useEffect(() => {
    if (!listing) return
    void api
      .get<{ listings: Listing[] }>(`/api/listings/${listing.id}/related`)
      .then((d) => setRelated(d.listings))
      .catch(() => undefined)
  }, [listing])

  async function toggleFavorite() {
    if (!user) return
    if (busy) return
    setBusy(true)
    try {
      if (isFavorite) {
        await api.delete(`/api/favorites/${listing!.id}`)
      } else {
        await api.post('/api/favorites', { listingId: listing!.id })
      }
      setIsFavorite(!isFavorite)
    } catch {
      alert('Could not update favorite. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function trackOutclick() {
    if (!listing) return
    void api.post('/api/outclick', { listingId: listing.id }).catch(() => undefined)
    window.open(listing.sourceUrl, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Listing not found"
          description={error ?? 'This listing may no longer be available.'}
          action={<Link to="/search"><Button variant="secondary">Back to search</Button></Link>}
        />
      </div>
    )
  }

  const images = listing.images.length > 0 ? listing.images : [null]
  const isMock = listing.source === 'mock'
  const canGoExternal = listing.source === 'vinted' && Boolean(listing.sourceUrl)

  return (
    <div className="mx-auto max-w-6xl">
      <nav className="py-4 text-xs text-neutral-400">
        <Link to="/search" className="hover:text-neutral-700">
          Search
        </Link>
        {' / '}
        {listing.category ? <Link to={`/search?categoryId=${listing.categoryId ?? ''}`} className="hover:text-neutral-700">{listing.category}</Link> : 'Listing'}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <ImageWithFallback
            src={images[activeImage]}
            alt={listing.title}
            className="aspect-[4/5] w-full rounded-2xl border border-neutral-200"
            eager
          />
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img ?? `empty-${i}`}
                  onClick={() => setActiveImage(i)}
                  className={
                    i === activeImage
                      ? 'rounded-lg ring-2 ring-neutral-900 ring-offset-2'
                      : 'opacity-70 hover:opacity-100'
                  }
                >
                  <ImageWithFallback src={img} alt="" className="h-16 w-16 rounded-lg border border-neutral-200" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {isMock && <Badge tone="warning">Development data — not a live Vinted listing</Badge>}
            {relevance && <MatchBadge score={relevance.score} />}
          </div>

          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-3xl">
            {listing.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
            {listing.brand && (
              <span>
                Brand:{' '}
                <Link to={listing.brandId ? `/brand/${listing.brandId}` : '/brands'} className="font-medium text-neutral-800 hover:underline">
                  {listing.brand}
                </Link>
              </span>
            )}
            {listing.model && <span>Model: {listing.model}</span>}
            {listing.category && <span>Category: {listing.category}</span>}
          </div>

          <div className="mt-6 text-3xl font-bold tracking-tight text-neutral-900">
            {formatPrice(listing.price, listing.currency)}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Meta label="Size" value={listing.size ?? '—'} />
            <Meta label="Condition" value={conditionLabel(listing.condition)} />
            <Meta label="Colour" value={listing.color ? titleCase(listing.color) : '—'} />
            <Meta label="Gender" value={listing.gender ? titleCase(listing.gender) : '—'} />
            <Meta label="Seller" value={listing.sellerName ?? '—'} />
            <Meta label="Location" value={listing.location ?? '—'} />
            <Meta label="Listed" value={relativeTime(listing.publishedAt ?? listing.firstSeenAt)} />
            <Meta label="First seen" value={relativeTime(listing.firstSeenAt)} />
            <Meta label="Updated" value={formatDate(listing.updatedAt)} />
          </div>

          {listing.description && (
            <p className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700">
              {listing.description}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-2">
            {canGoExternal ? (
              <Button size="lg" onClick={trackOutclick}>
                View on Vinted
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </Button>
            ) : (
              <Button size="lg" disabled title="External purchase is only available for live Vinted listings.">
                Buy on Vinted
                <Badge tone="neutral" className="bg-white/20 text-white">via provider</Badge>
              </Button>
            )}
            <Button size="lg" variant="secondary" onClick={toggleFavorite} disabled={!user}>
              {isFavorite ? 'Saved to favorites' : 'Save'}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </Button>
            {!user && (
              <p className="text-xs text-neutral-500">
                <Link to="/login" className="font-medium underline underline-offset-2">Sign in</Link> to save listings.
              </p>
            )}
            {isMock && (
              <p className="mt-1 text-xs text-neutral-400">
                Transactions happen on the marketplace. This development listing has no external checkout.
              </p>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-neutral-900">Similar listings</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((l) => (
              <ListingCard key={l.id} listing={{ ...l, relevanceScore: 0 } as ListingWithRelevance} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-neutral-900" title={value}>
        {value}
      </p>
    </div>
  )
}