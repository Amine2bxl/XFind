import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { initials } from '../lib/format'
import { SearchBar } from './SearchBar'
import { cn } from './ui'

function NavItem({ to, label, badge, onClick }: { to: string; label: string; badge?: number; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'relative flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
          isActive ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-50',
        )
      }
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!user) {
      setUnread(0)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const data = await api.get<{ count: number }>('/api/notifications/unread-count')
        if (!cancelled) setUnread(data.count)
      } catch {
        /* quiet */
      }
    }
    void load()
    const timer = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [user])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function onLogout() {
    await logout()
    void navigate('/')
  }

  const desktopNav = (
    <nav className="hidden items-center gap-0.5 lg:flex">
      <NavItem to="/brands" label="Brands" />
      <NavItem to="/saved-searches" label="Saved searches" />
      <NavItem to="/favorites" label="Favorites" />
    </nav>
  )

  const mobileNav = (
    <nav className="flex items-center gap-0.5 lg:hidden">
      <NavItem to="/brands" label="Brands" />
      <NavItem to="/favorites" label="Favorites" />
    </nav>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="XFind home">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M4 6h2.6l2.7 3.9L12 6h2.8l-3.9 5.3L12.2 17H9.6L8 13.9 6.4 17H3.9l3.3-5.7L4 6Zm8.3 0h2.5l2.7 4h1.9V6h2.4v11h-2.4v-4h-1.9l-2.7 4h-2.6l3.2-5.4L12.3 6Z" />
            </svg>
          </span>
          <span className="text-[17px] font-semibold leading-none tracking-tight">XFind</span>
        </Link>

        <div className="hidden max-w-xl flex-1 md:block">
          <SearchBar initialValue={location.pathname === '/search' ? '' : ''} />
        </div>

        <div className="flex-1 md:hidden" />

        {desktopNav}
        {mobileNav}

        <div className="flex items-center gap-1">
          <Link
            to="/notifications"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-50"
            aria-label="Notifications"
          >
            <span className="relative">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </span>
          </Link>

          {user ? (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white transition-opacity hover:opacity-85"
                aria-label="Account menu"
              >
                {initials(user.name ?? user.email)}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-11 w-56 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-1 shadow-lg">
                  <div className="border-b border-neutral-800 px-3 py-2">
                    <p className="truncate text-sm font-medium text-neutral-100">{user.name ?? 'Account'}</p>
                    <p className="truncate text-xs text-neutral-400">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <MenuLink to="/saved-searches" label="Saved searches" />
                    <MenuLink to="/favorites" label="Favorites" />
                    <MenuLink to="/notifications" label="Notifications" />
                    <MenuLink to="/settings" label="Settings" />
                    {user.isAdmin && <MenuLink to="/admin/ingestion" label="Admin · Ingestion" />}
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-400 hover:bg-red-950/40"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="ml-1 h-9 rounded-lg px-4 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-neutral-800 px-4 py-2 lg:hidden">
          <div className="flex flex-col gap-0.5">
            <MenuLink to="/saved-searches" label="Saved searches" onClick={() => setMenuOpen(false)} />
            <MenuLink to="/notifications" label="Notifications" onClick={() => setMenuOpen(false)} />
            {user && <MenuLink to="/settings" label="Settings" onClick={() => setMenuOpen(false)} />}
          </div>
        </div>
      )}
    </header>
  )
}

function MenuLink({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800"
    >
      {label}
    </Link>
  )
}