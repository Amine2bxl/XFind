import { useState } from 'react'
import { cn } from './ui'

export function ImageWithFallback({
  src,
  alt,
  className,
  imgClassName,
  eager = false,
}: {
  src: string | null | undefined
  alt: string
  className?: string
  imgClassName?: string
  eager?: boolean
}) {
  const [errored, setErrored] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (!src || errored) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-neutral-800 text-neutral-600',
          className,
        )}
        aria-label={alt}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.5-3.5L9 20" />
        </svg>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden bg-neutral-800', className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-neutral-800" />}
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />
    </div>
  )
}
