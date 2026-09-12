import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Brand, Listing, ListingWithRelevance, Model } from '@shared/types'
import { api } from '../lib/api'
import { useSeo } from '../lib/seo'
import { ListingCard, ListingCardSkeleton } from '../components/ListingCard'
import { EmptyState } from '../components/ui'

interface BrandPayload {
  brand: Brand
  models: Model[]
  recentListings: Listing[]
}

export function BrandDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<BrandPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useSeo(
    data ? `${data.brand.name} — XFind` : 'Brand — XFind',
    data ? `Browse ${data.brand.name} listings, models and sizes on XFind.` : undefined,
  )

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    void api
      .get<BrandPayload>(`/api/brands/${encodeURIComponent(slug)}`)
      .then((d) => {
        setData(d)
        document.title = `${d.brand.name} — XFind`
      })
      .catch(() => setError('Brand not found.'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mt-10 h-10 w-56 animate-pulse rounded bg-neutral-800" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Brand not found"
          description="This brand might not be in the catalogue yet."
          action={<Link to="/brands"><button className="text-sm font-medium text-neutral-400 underline underline-offset-4">Browse all brands</button></Link>}
        />
      </div>
    )
  }

  const { brand, models, recentListings } = data

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mt-10">
        <nav className="text-xs text-neutral-500">
          <Link to="/brands" className="hover:text-neutral-200">Brands</Link>
          {' / '}
          <span className="text-neutral-400">{brand.name}</span>
        </nav>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-100">{brand.name}</h1>
          {brand.listingCount !== undefined && (
            <span className="text-sm text-neutral-400">{brand.listingCount} listings</span>
          )}
        </div>
        {brand.aliases.length > 0 && (
          <p className="mt-2 text-sm text-neutral-400">
            Also known as: {brand.aliases.join(', ')}
          </p>
        )}
      </div>

      {models.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Popular models
          </h2>
          <div className="flex flex-wrap gap-2">
            {models.map((model) => (
              <Link
                key={model.id}
                to={`/search?q=${encodeURIComponent(`${brand.name} ${model.name}`)}`}
                className="rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-neutral-50"
              >
                {brand.name} {model.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-neutral-100">Latest {brand.name} listings</h2>
        {recentListings.length === 0 ? (
          <EmptyState title="No listings yet" description={`No ${brand.name} listings have been ingested yet.`} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={{ ...listing, relevanceScore: 0 } as ListingWithRelevance} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}