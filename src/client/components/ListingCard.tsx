import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ListingWithRelevance } from '@shared/types'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatPrice, relativeTime } from '../lib/format'
import { ImageWithFallback } from './ImageWithFallback'
import { Badge, cn } from './ui'

export function ListingCard({
  listing,
  showMatch = false,
  onFavoriteChange,
}: {
  listing: ListingWithRelevance
  showMatch?: boolean
  onFavoriteChange?: (listing: ListingWithRelevance, isFavorite: boolean) => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isFavorite, setIsFavorite] = useState(Boolean(listing.isFavorite))
  const [busy, setBusy] = useState(false)
  const isMock = listing.source === 'mock'

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/listing/${listing.id}`)}`)
      return
    }
    if (busy) return
    setBusy(true)
    try {
      if (isFavorite) {
        await api.delete(`/api/favorites/${listing.id}`)
      } else {
        await api.post('/api/favorites', { listingId: listing.id })
      }
      setIsFavorite(!isFavorite)
      onFavoriteChange?.(listing, !isFavorite)
    } catch {
      alert('Could not update favorite. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
    >
      <div className="relative">
        <ImageWithFallback
          src={listing.images[0]}
          alt={listing.title}
          className="aspect-[4/5] w-full"
        />
        <button
          onClick={toggleFavorite}
          aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          className={cn(
            'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950/85 shadow-sm backdrop-blur transition-colors hover:bg-neutral-900',
            isFavorite ? 'text-red-500' : 'text-neutral-400 hover:text-neutral-200',
          )}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>
        {isMock && (
          <span className="absolute left-2 top-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white backdrop-blur">
            Dev data
          </span>
        )}
        {showMatch && (
          <span className="absolute bottom-2 left-2">
            <MatchBadge score={listing.relevanceScore} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {listing.brand && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            {listing.brand}
          </p>
        )}
        <p className="line-clamp-2 text-sm font-medium leading-snug text-neutral-100">
          {listing.title}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="text-[15px] font-bold text-neutral-100">
            {formatPrice(listing.price, listing.currency)}
          </p>
          <p className="text-xs text-neutral-400">{relativeTime(listing.publishedAt ?? listing.firstSeenAt)}</p>
        </div>
        {(listing.size || listing.condition) && (
          <p className="text-xs text-neutral-400">
            {[listing.size, formatCondition(listing.condition)].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  )
}

export function MatchBadge({ score }: { score: number }) {
  const tone = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'neutral'
  return (
    <Badge tone={tone} className="bg-neutral-950/85 backdrop-blur">
      {score}% match
    </Badge>
  )
}

function formatCondition(condition: string | null | undefined): string | null {
  if (!condition) return null
  const map: Record<string, string> = {
    new_with_tags: 'New with tags',
    new_without_tags: 'New without tags',
    very_good: 'Very good',
    good: 'Good',
    satisfactory: 'Satisfactory',
  }
  return map[condition] ?? condition
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="aspect-[4/5] w-full animate-pulse bg-neutral-800" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="h-2.5 w-16 animate-pulse rounded bg-neutral-800" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-neutral-800" />
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="h-4 w-14 animate-pulse rounded bg-neutral-800" />
          <div className="h-3 w-10 animate-pulse rounded bg-neutral-800" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-neutral-800" />
      </div>
    </div>
  )
}