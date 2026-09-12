import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AppNotification } from '@shared/types'
import { api } from '../lib/api'
import { formatPrice, relativeTime } from '../lib/format'
import { useSeo } from '../lib/seo'
import { Badge, Button, EmptyState, Spinner } from '../components/ui'
import { ImageWithFallback } from '../components/ImageWithFallback'

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useSeo('Notifications — XFind', 'Your listing alerts.')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ notifications: AppNotification[] }>('/api/notifications')
      setNotifications(data.notifications)
    } catch {
      /* guarded */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function markAllRead() {
    await api.post('/api/notifications/read-all').catch(() => undefined)
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
  }

  async function markRead(id: string) {
    await api.post(`/api/notifications/${id}/read`).catch(() => undefined)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)))
  }

  const unread = notifications.filter((n) => !n.readAt).length

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-10 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100 sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-neutral-400">Alerts from your saved searches.</p>
        </div>
        {unread > 0 && <Button variant="secondary" onClick={markAllRead}>Mark all as read</Button>}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7" /></div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<BellIcon />}
            title="No notifications yet"
            description="Create a saved search with notifications enabled and you'll be alerted here when new listings match."
            action={<Link to="/saved-searches"><Button>Manage saved searches</Button></Link>}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((notification) => {
              const listing = notification.listing
              const isUnread = !notification.readAt
              return (
                <div
                  key={notification.id}
                  className={`flex items-center gap-4 rounded-2xl border bg-neutral-900 p-3 transition-colors ${
                    isUnread ? 'border-neutral-700' : 'border-neutral-800'
                  }`}
                >
                  {listing ? (
                    <Link to={`/listing/${listing.id}`} onClick={() => markRead(notification.id)} className="shrink-0">
                      <ImageWithFallback src={listing.images[0]} alt="" className="h-16 w-16 rounded-xl border border-neutral-800" />
                    </Link>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-neutral-500">
                      <BellIcon />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${isUnread ? 'text-neutral-100' : 'text-neutral-300'}`}>{notification.title}</p>
                      {isUnread && <Badge tone="info">New</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-neutral-400">{notification.message}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                      <span>{relativeTime(notification.createdAt)}</span>
                      {listing && (
                        <>
                          <span>{formatPrice(listing.price, listing.currency)}</span>
                          {listing.size && <span>size {listing.size}</span>}
                          {notification.savedSearchId && <Link to="/saved-searches" className="hover:underline">from saved search</Link>}
                        </>
                      )}
                    </div>
                  </div>
                  {listing && (
                    <Link
                      to={`/listing/${listing.id}`}
                      onClick={() => markRead(notification.id)}
                      className="shrink-0 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500"
                    >
                      View
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}