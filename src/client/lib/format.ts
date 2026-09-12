import type { ListingCondition } from '@shared/types'
import { CONDITION_LABELS } from '@shared/types'

export function formatPrice(price: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price)
  } catch {
    return `${currency} ${price.toFixed(0)}`
  }
}

export function relativeTime(input: string | null | undefined): string {
  if (!input) return 'unknown'
  const date = new Date(input)
  const diff = Date.now() - date.getTime()
  if (Number.isNaN(diff)) return 'unknown'
  const seconds = Math.max(0, Math.floor(diff / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export function conditionLabel(condition: string | null | undefined): string {
  if (!condition) return 'Unknown condition'
  return CONDITION_LABELS[condition as ListingCondition] ?? condition.replace(/_/g, ' ')
}

export function formatDate(input: string | null | undefined): string {
  if (!input) return '—'
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function titleCase(input: string): string {
  return input
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function initials(input: string | null | undefined): string {
  if (!input) return '?'
  return input
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}
