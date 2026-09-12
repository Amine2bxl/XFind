import { useCallback, useEffect, useState } from 'react'
import type { IngestionRun } from '@shared/types'
import { api } from '../lib/api'
import { useSeo } from '../lib/seo'
import { Badge, Button, EmptyState, Spinner } from '../components/ui'

interface ProviderStatusInfo {
  id: string
  name: string
  available: boolean
  live: boolean
  message: string
}

interface Overview {
  listingCount: number
  brands: number
  providers: ProviderStatusInfo[]
  activeProvider: string
  lastRun: IngestionRun | null
  analytics: {
    searches: number
    zeroResultSearches: number
    outclicks: number
    favorites: number
    savedSearches: number
    notifications: number
  }
}

interface IngestionPayload {
  runs: IngestionRun[]
  errors: { id: string; provider: string; externalId: string | null; message: string; createdAt: string }[]
}

export function AdminIngestionPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [ingestion, setIngestion] = useState<IngestionPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [runMessage, setRunMessage] = useState<string | null>(null)

  useSeo('Admin · Ingestion — XFind')

  const load = useCallback(async () => {
    setError(null)
    try {
      const [o, i] = await Promise.all([
        api.get<Overview>('/api/admin/overview'),
        api.get<IngestionPayload>('/api/admin/ingestion'),
      ])
      setOverview(o)
      setIngestion(i)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin data.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function runIngestion() {
    setRunning(true)
    setRunMessage(null)
    try {
      await api.post('/api/admin/ingestion/run', { provider: 'mock', limit: 100 })
      setRunMessage('Ingestion run completed.')
      await load()
    } catch (err) {
      setRunMessage(err instanceof Error ? err.message : 'Run failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mt-10 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100 sm:text-3xl">Ingestion</h1>
          <p className="mt-1 text-sm text-neutral-400">Data engine diagnostics and provider status.</p>
        </div>
        <Button onClick={runIngestion} loading={running}>Run ingestion now</Button>
      </div>

      {error && (
        <div className="mt-6">
          <EmptyState title="Could not load admin data" description={error} />
        </div>
      )}

      {!overview && !error && (
        <div className="flex justify-center py-20"><Spinner className="h-7 w-7" /></div>
      )}

      {overview && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Listings" value={overview.listingCount.toLocaleString()} />
            <Stat label="Brands" value={overview.brands.toLocaleString()} />
            <Stat label="Searches" value={overview.analytics.searches.toLocaleString()} />
            <Stat label="Zero-result" value={overview.analytics.zeroResultSearches.toLocaleString()} />
            <Stat label="Outclicks" value={overview.analytics.outclicks.toLocaleString()} />
            <Stat label="Notifications" value={overview.analytics.notifications.toLocaleString()} />
          </div>

          <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">Providers</h2>
            <div className="flex flex-col gap-3">
              {overview.providers.map((provider) => (
                <div key={provider.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={provider.available ? 'success' : 'neutral'}>{provider.id}</Badge>
                    <span className="text-sm font-medium text-neutral-100">{provider.name}</span>
                    <Badge tone={provider.live ? 'info' : 'neutral'}>{provider.live ? 'LIVE' : 'not live'}</Badge>
                  </div>
                  <p className="max-w-xl text-xs text-neutral-400">{provider.message}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              Active provider: <span className="font-semibold text-neutral-300">{overview.activeProvider}</span>. The LIVE badge only appears when a data stream is genuinely live.
            </p>
          </section>

          {overview.lastRun && (
            <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">Last ingestion run</h2>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <RunStat label="Found" value={String(overview.lastRun.listingsFound)} />
                <RunStat label="New" value={String(overview.lastRun.listingsNew)} />
                <RunStat label="Updated" value={String(overview.lastRun.listingsUpdated)} />
                <RunStat label="Duplicates" value={String(overview.lastRun.duplicates)} />
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                Status: <span className="font-semibold text-neutral-300">{overview.lastRun.status}</span>
                {' · '}Latency: {overview.lastRun.latencyMs != null ? `${overview.lastRun.latencyMs}ms` : '—'}
                {' · '}Started: {overview.lastRun.startedAt}
              </p>
            </section>
          )}

          {runMessage && (
            <p className={`mt-4 text-sm ${runMessage.includes('failed') ? 'text-red-400' : 'text-emerald-400'}`}>{runMessage}</p>
          )}

          {ingestion && ingestion.runs.length > 0 && (
            <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">Recent runs</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
                      <th className="py-2 pr-4">Provider</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Found</th>
                      <th className="py-2 pr-4">New</th>
                      <th className="py-2 pr-4">Dupes</th>
                      <th className="py-2 pr-4">Errors</th>
                      <th className="py-2 pr-4">Latency</th>
                      <th className="py-2">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingestion.runs.map((run) => (
                      <tr key={run.id} className="border-b border-neutral-50">
                        <td className="py-2 pr-4 font-medium">{run.provider}</td>
                        <td className="py-2 pr-4">
                          <Badge tone={run.status === 'success' ? 'success' : run.status === 'error' ? 'warning' : 'info'}>
                            {run.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4">{run.listingsFound}</td>
                        <td className="py-2 pr-4">{run.listingsNew}</td>
                        <td className="py-2 pr-4">{run.duplicates}</td>
                        <td className="py-2 pr-4">{run.errors}</td>
                        <td className="py-2 pr-4">{run.latencyMs != null ? `${run.latencyMs}ms` : '—'}</td>
                        <td className="py-2 text-neutral-400">{run.startedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {ingestion && ingestion.errors.length > 0 && (
            <section className="mt-6 rounded-2xl border border-red-900/60 bg-neutral-900 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-500">Ingestion errors</h2>
              <ul className="flex flex-col gap-1.5 text-sm">
                {ingestion.errors.slice(0, 15).map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning">{e.provider}</Badge>
                    <span className="text-neutral-400">{e.externalId ?? '—'}</span>
                    <span className="text-neutral-300">{e.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-2xl font-bold tracking-tight text-neutral-100">{value}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
    </div>
  )
}

function RunStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  )
}