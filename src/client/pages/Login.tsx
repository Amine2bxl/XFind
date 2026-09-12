import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useSeo } from '../lib/seo'
import { Button, Input } from '../components/ui'

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useSeo(mode === 'login' ? 'Sign in — XFind' : 'Create an account — XFind')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, name)
      }
      const next = searchParams.get('next')
      navigate(next || '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col pt-14">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M4 6h2.6l2.7 3.9L12 6h2.8l-3.9 5.3L12.2 17H9.6L8 13.9 6.4 17H3.9l3.3-5.7L4 6Zm8.3 0h2.5l2.7 4h1.9V6h2.4v11h-2.4v-4h-1.9l-2.7 4h-2.6l3.2-5.4L12.3 6Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {mode === 'login'
              ? 'Sign in to save listings and searches.'
              : 'Sign up to save favorites, searches and alerts.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-600">Name (optional)</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-600">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-600">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'register' ? 8 : 1}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={busy} size="lg" className="w-full">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
          {mode === 'login' ? (
            <>
              No account yet?{' '}
              <button onClick={() => { setMode('register'); setError(null) }} className="font-medium text-neutral-900 underline underline-offset-4">
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(null) }} className="font-medium text-neutral-900 underline underline-offset-4">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-neutral-400">
        You can always browse listings without an account.{' '}
        <Link to="/search" className="underline underline-offset-2 hover:text-neutral-600">Start searching</Link>
      </p>
    </div>
  )
}