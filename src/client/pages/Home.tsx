import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Brand, ListingWithRelevance, SearchResponse } from '@shared/types'
import { api } from '../lib/api'
import { useSeo } from '../lib/seo'
import { SearchBar } from '../components/SearchBar'
import { ListingCard, ListingCardSkeleton } from '../components/ListingCard'
import { NewListingsFeed } from '../components/NewListingsFeed'
import { Badge, Button } from '../components/ui'

export function HomePage() {
  const navigate = useNavigate()
  const [brands, setBrands] = useState<Brand[]>([])
  const [recent, setRecent] = useState<ListingWithRelevance[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  useSeo("XFind — Find exactly what you're looking for on Vinted", 'Intelligent search and live monitoring for Vinted listings.')

  useEffect(() => {
    void api
      .get<{ brands: Brand[] }>('/api/brands?perPage=12')
      .then((d) => setBrands(d.brands))
      .catch(() => undefined)
    void api
      .get<SearchResponse>('/api/search?sort=newest&page=1&perPage=8')
      .then((d) => setRecent(d.listings))
      .catch(() => undefined)
      .finally(() => setLoadingRecent(false))
  }, [])

  return (
    <div className="mx-auto max-w-5xl">
      <section className="pb-6 pt-14 text-center sm:pt-20">
        <Badge tone="neutral" className="mb-5">
          Built for collectors, resellers and fashion buyers
        </Badge>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-neutral-100 sm:text-6xl">
          Find exactly what you're looking for on Vinted.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-neutral-400 sm:text-lg">
          Normalized brand and model search, smart filters, saved searches and alerts for new listings —
          so you stop scrolling and start finding.
        </p>
        <div className="mx-auto mt-8 max-w-2xl">
          <SearchBar size="lg" />
        </div>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button size="lg" onClick={() => navigate('/search')}>
            Start searching
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/brands')}>
            Explore listings
          </Button>
        </div>
      </section>

      <section className="mt-12">
        <NewListingsFeed />
      </section>

      {brands.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Popular brands</h2>
            <Link to="/brands" className="text-sm font-medium text-neutral-400 hover:text-neutral-50">
              View all
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <Link
                key={b.id}
                to={`/brand/${b.slug}`}
                className="rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-neutral-50"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-100">Recently listed</h2>
          <Link to="/search" className="text-sm font-medium text-neutral-400 hover:text-neutral-50">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {loadingRecent
            ? Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)
            : recent.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      </section>

      <section className="mt-14 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center sm:p-10">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-100">Never miss the good stuff</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
          Save a search and get notified the moment a matching listing appears. Set a max price, a size, a condition — and let XFind watch.
        </p>
        <Button className="mt-5" onClick={() => navigate('/saved-searches')}>
          Create a saved search
        </Button>
      </section>
    </div>
  )
}