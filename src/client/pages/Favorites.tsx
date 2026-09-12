import { useCallback, useEffect, useState } from 'react'
import type { Favorite, ListingWithRelevance } from '@shared/types'
import { api } from '../lib/api'
import { useSeo } from '../lib/seo'
import { ListingCard } from '../components/ListingCard'
import { EmptyState, Spinner } from '../components/ui'

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<Array<Favorite['listing']>>([])
  const [loading, setLoading] = useState(true)

  useSeo('Favorites — XFind', 'Your saved listings.')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ favorites: Favorite[] }>('/api/favorites')
      setFavorites(
        data.favorites
          .map((f) => f.listing)
          .filter((l): l is NonNullable<typeof l> => Boolean(l)),
      )
    } catch {
      /* auth guard already redirects */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const removeFavorite = useCallback(
    (listing: NonNullable<Favorite['listing']>) => {
      setFavorites((prev) => prev.filter((l) => l?.id !== listing.id))
      void api.delete(`/api/favorites/${listing.id}`).catch(() => undefined)
    },
    [],
  )

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mt-10">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Favorites</h1>
        <p className="mt-1 text-sm text-neutral-500">Listings you've saved for later.</p>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7" /></div>
        ) : favorites.length === 0 ? (
          <EmptyState
            icon={<HeartIcon />}
            title="No favorites yet"
            description="Tap the heart on any listing to save it here."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {favorites.map(
              (listing) =>
                listing && (
                  <ListingCard
                    key={listing.id}
                    listing={{ ...listing, relevanceScore: 0 } as ListingWithRelevance}
                    onFavoriteChange={(l, isFav) => {
                      if (!isFav) removeFavorite(l)
                    }}
                  />
                ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}