import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Listing } from '@shared/types'
import { api } from '../lib/api'
import { formatPrice, relativeTime } from '../lib/format'
import { ImageWithFallback } from './ImageWithFallback'
import { cn } from './ui'

interface FeedResponse {
  listings: Listing[]
  since: string
}

const POLL_MS = 20_000

/**
 * Live "new arrivals" ticker. Polls the ingestion-backed endpoint and prepends
 * genuinely new listings with a small animation. The marquee is paused on hover.
 * Any "LIVE" language is only used for the poll itself — it never claims the
 * marketplace stream itself is live.
 */
export function NewListingsFeed({ className }: { className?: string }) {
  const [items, setItems] = useState<Listing[]>([])
  const [newCount, setNewCount] = useState(0)
  const sinceRef = useRef<string | null>(null)
  const idsRef = useRef<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async (showLoading: boolean) => {
    if (showLoading) setBusy(true)
    try {
      const suffix = sinceRef.current ? `&since=${encodeURIComponent(sinceRef.current)}` : ''
      const data = await api.get<FeedResponse>(`/api/live/feed?limit=24${suffix}`)
      sinceRef.current = data.since

      const seen = new Set<string>()
      const fresh: Listing[] = []
      for (const listing of data.listings) {
        if (seen.has(listing.id)) continue
        seen.add(listing.id)
        if (!idsRef.current.has(listing.id)) {
          fresh.push(listing)
        }
      }
      idsRef.current = new Set(data.listings.map((l) => l.id))

      setItems((prev) => {
        if (fresh.length === 0) return prev
        const merged = [...fresh, ...prev.filter((l) => !fresh.some((f) => f.id === l.id))].slice(0, 32)
        return merged
      })
      if (fresh.length > 0) {
        setNewCount((c) => c + fresh.length)
        setTimeout(() => setNewCount(0), 5000)
      }
      setError(false)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
    const timer = setInterval(() => void load(false), POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  const display = items.length > 1 ? [...items, ...items] : items

  return (
    <section className={cn('overflow-hidden', className)} aria-label="New arrivals">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-neutral-100">New arrivals</h2>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs text-neutral-500">auto-refreshing</span>
        </div>
        {newCount > 0 && (
          <span className="animate-pop rounded-full bg-emerald-500/90 px-2 py-0.5 text-[11px] font-semibold text-white">
            {newCount} new
          </span>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-neutral-400">
          The live feed is temporarily unavailable.
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-24 items-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/40 px-4 text-xs text-neutral-500">
          {busy ? 'Loading the latest listings…' : 'No listings yet. They will appear here as they are ingested.'}
        </div>
      ) : (
        <div className="marquee-pause relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
          <div
            className="animate-marquee flex w-max gap-3"
            style={{ ['--marquee-duration' as string]: `${display.length * 2.2}s` }}
          >
            {display.map((listing, i) => (
              <NewArrivalCard key={`${listing.id}-${i}`} listing={listing} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function NewArrivalCard({ listing }: { listing: Listing }) {
  const isMock = listing.source === 'mock'
  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group w-40 shrink-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition-colors hover:border-neutral-600"
      aria-label={listing.title}
    >
      <div className="relative">
        <ImageWithFallback
          src={listing.images[0]}
          alt={listing.title}
          className="aspect-[4/5] w-full"
          imgClassName="group-hover:scale-[1.03]"
        />
        {isMock && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-neutral-950/80 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white">
            Dev data
          </span>
        )}
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-neutral-950/80 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
          {relativeTime(listing.publishedAt ?? listing.firstSeenAt)}
        </span>
      </div>
      <div className="p-2">
        {listing.brand && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{listing.brand}</p>
        )}
        <p className="truncate text-xs font-medium text-neutral-100">{listing.title}</p>
        <p className="mt-1 text-sm font-bold text-neutral-50">{formatPrice(listing.price, listing.currency)}</p>
      </div>
    </Link>
  )
}