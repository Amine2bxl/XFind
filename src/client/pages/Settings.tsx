import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PushConfigStatus } from '@shared/types'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSeo } from '../lib/seo'
import { Badge, Button, EmptyState, Input, Toggle } from '../components/ui'

export function SettingsPage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [inApp, setInApp] = useState(user?.notificationSettings.inApp ?? true)
  const [email, setEmail] = useState(user?.notificationSettings.email ?? false)
  const [push, setPush] = useState(user?.notificationSettings.push ?? false)
  const [pushStatus, setPushStatus] = useState<PushConfigStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useSeo('Settings — XFind', 'Account and notification preferences.')

  useEffect(() => {
    void api
      .get<PushConfigStatus>('/api/push/status')
      .then(setPushStatus)
      .catch(() => undefined)
  }, [])

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const updated = await api.patch<{ user: NonNullable<typeof user> }>('/api/me', {
        name: name.trim() || undefined,
        notificationSettings: { inApp, email, push },
      })
      setUser(updated.user)
      setMessage({ type: 'success', text: 'Settings saved.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not save settings.' })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mt-10">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Account and notification preferences.</p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Profile</h2>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-600">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>
            <div>
              <span className="text-xs font-medium text-neutral-600">Email</span>
              <p className="mt-1 text-sm text-neutral-900">{user.email}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">Notifications</h2>
          <div className="divide-y divide-neutral-100">
            <Toggle
              checked={inApp}
              onChange={setInApp}
              label="In-app notifications"
              description="Alerts appear in the notification bell when a saved search matches a new listing."
            />
            <Toggle
              checked={email}
              onChange={setEmail}
              label="Email notifications"
              description="Email delivery is not configured yet — this preference is stored for providers."
            />
            <Toggle
              checked={push}
              onChange={setPush}
              label="Browser push"
              description="Requires VAPID keys to be configured on the server."
            />
          </div>
          <div className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <div className="flex items-center gap-2">
              <Badge tone={pushStatus?.configured ? 'success' : 'neutral'}>
                {pushStatus?.configured ? 'Configured' : 'Not configured'}
              </Badge>
              <p className="text-xs text-neutral-500">
                {pushStatus?.message ?? 'Loading push status...'}
              </p>
            </div>
          </div>
        </section>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</p>
        )}

        <div className="flex gap-2">
          <Button onClick={save} loading={saving}>Save changes</Button>
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">Account</h2>
          <p className="text-sm text-neutral-500 mb-4">Sign out of this device.</p>
          <Button variant="secondary" onClick={() => navigate('/')} disabled>
            Signed in as {user.email}
          </Button>
          <div className="mt-3">
            <Button
              variant="ghost"
              onClick={async () => {
                await api.post('/api/auth/logout').catch(() => undefined)
                setUser(null)
                navigate('/')
              }}
            >
              Sign out
            </Button>
          </div>
        </section>

        <section>
          <EmptyState
            title="Browser push is infrastructure-ready"
            description="Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT to enable real push delivery. We never fake successful device subscriptions."
          />
        </section>
      </div>
    </div>
  )
}