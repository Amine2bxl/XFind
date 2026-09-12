import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { Suggestion } from '@shared/types'
import { api } from '../lib/api'
import { cn } from './ui'

const TYPE_LABEL: Record<Suggestion['type'], string> = {
  brand: 'Brand',
  model: 'Model',
  category: 'Category',
}

export function SearchBar({
  size = 'md',
  initialValue = '',
  autoFocus = false,
  onNavigate,
}: {
  size?: 'sm' | 'md' | 'lg'
  initialValue?: string
  autoFocus?: boolean
  onNavigate?: () => void
}) {
  const navigate = useNavigate()
  const [value, setValue] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const submit = useCallback(
    (term: string) => {
      const q = term.trim()
      setOpen(false)
      setActiveIndex(-1)
      if (onNavigate) onNavigate()
      if (q) {
        void navigate(`/search?q=${encodeURIComponent(q)}`)
      } else {
        void navigate('/search')
      }
    },
    [navigate, onNavigate],
  )

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const term = value.trim()
    if (term.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const data = await api.get<{ suggestions: Suggestion[] }>(
          `/api/search/suggest?q=${encodeURIComponent(term)}&limit=8`,
        )
        if (!controller.signal.aborted) {
          setSuggestions(data.suggestions)
          setOpen(true)
          setActiveIndex(data.suggestions.length > 0 ? 0 : -1)
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([])
          setOpen(false)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 160)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const active = suggestions[activeIndex]
      if (active && open) {
        submit(active.value)
      } else {
        submit(value)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (suggestions.length > 0 ? (i + 1) % suggestions.length : 0))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (suggestions.length > 0 ? (i - 1 + suggestions.length) % suggestions.length : 0))
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const sizeClass =
    size === 'lg' ? 'h-12 pl-4 pr-16 text-base rounded-2xl' : 'h-10 pl-3.5 pr-10 text-sm rounded-xl'

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="absolute inset-y-0 left-3 flex items-center text-neutral-400 pointer-events-none">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          setValue(e.target.value)
        }}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        placeholder="Search brands, models, sneakers, jackets..."
        role="combobox"
        aria-expanded={open}
        aria-controls="search-suggestions"
        aria-autocomplete="list"
        className={cn(
          'w-full border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10',
          sizeClass,
        )}
      />
      {loading && (
        <div className="absolute inset-y-0 right-3 flex items-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.type}-${s.value}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                submit(s.value)
              }}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-sm',
                i === activeIndex ? 'bg-neutral-100' : 'bg-white',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold uppercase tracking-wide',
                  s.type === 'brand' ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600',
                )}
              >
                {s.type === 'brand' ? 'B' : s.type === 'model' ? 'M' : 'C'}
              </span>
              <span className="flex-1 truncate font-medium text-neutral-900">{s.label}</span>
              {s.brandName && <span className="text-xs text-neutral-400">{s.brandName}</span>}
              <span className="text-[10px] text-neutral-300">{TYPE_LABEL[s.type]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}