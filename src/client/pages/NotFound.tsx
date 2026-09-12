import { Link } from 'react-router-dom'
import { useSeo } from '../lib/seo'
import { Button } from '../components/ui'

export function NotFoundPage() {
  useSeo('Page not found — XFind')
  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-24 text-center">
      <p className="text-6xl font-bold tracking-tight text-neutral-200">404</p>
      <h1 className="mt-4 text-xl font-semibold text-neutral-900">Page not found</h1>
      <p className="mt-1 text-sm text-neutral-500">The page you're looking for doesn't exist or has moved.</p>
      <div className="mt-6 flex gap-2">
        <Link to="/"><Button>Back home</Button></Link>
        <Link to="/search"><Button variant="secondary">Search listings</Button></Link>
      </div>
    </div>
  )
}