import type { AppNotification, Listing, PushConfigStatus, UserProfile } from '../../shared/types'
import type { Database } from '../db/database'
import { config } from '../config'

export class NotificationService {
  constructor(private readonly db: Database) {}

  async list(userId: string, limit = 60): Promise<Array<AppNotification & { listing?: Listing | null }>> {
    const rows = await this.db.listNotifications(userId, limit)
    const result: Array<AppNotification & { listing?: Listing | null }> = []
    for (const row of rows) {
      const listing = row.listingId ? await this.db.getListingById(row.listingId) : null
      result.push({ ...row, listing })
    }
    return result
  }

  unreadCount(userId: string): Promise<number> {
    return this.db.countUnreadNotifications(userId)
  }

  markRead(userId: string, id: string): Promise<void> {
    return this.db.markNotificationRead(id, userId)
  }

  markAllRead(userId: string): Promise<void> {
    return this.db.markAllNotificationsRead(userId)
  }

  /** Web Push infrastructure status. Never fakes a subscription. */
  pushStatus(): PushConfigStatus {
    const configured = Boolean(config.push.publicKey && config.push.privateKey && config.push.subject)
    return {
      configured,
      publicKey: configured ? config.push.publicKey : null,
      message: configured
        ? 'Push notifications are configured. Subscribe in settings.'
        : 'Browser push is not configured. Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT to enable it.',
    }
  }

  async notifyNewMatch(
    user: UserProfile,
    savedSearchId: string,
    listing: Listing,
  ): Promise<AppNotification | null> {
    const settings = user.notificationSettings
    if (settings.inApp === false) return null

    const title = 'New match found'
    const message = `${listing.brand ?? ''} ${listing.model ?? ''}${listing.model || listing.brand ? ' — ' : ''}€${formatPrice(listing.price)}${listing.size ? ` · size ${listing.size}` : ''}`.trim()

    const already = await this.db.hasNotified(user.id, listing.id, savedSearchId)
    if (already) return null

    return this.db.createNotification({
      id: crypto.randomUUID(),
      userId: user.id,
      type: 'new_match',
      title,
      message,
      listingId: listing.id,
      savedSearchId,
    })
  }
}

export function formatPrice(price: number): string {
  return price.toLocaleString('en-GB', { maximumFractionDigits: 0 })
}