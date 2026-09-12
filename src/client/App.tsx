import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { Header } from './components/Header'
import { useAuth } from './lib/auth'
import { HomePage } from './pages/Home'
import { SearchPage } from './pages/Search'
import { ListingDetailPage } from './pages/ListingDetail'
import { BrandsPage } from './pages/Brands'
import { BrandDetailPage } from './pages/BrandDetail'
import { SavedSearchesPage } from './pages/SavedSearches'
import { FavoritesPage } from './pages/Favorites'
import { NotificationsPage } from './pages/Notifications'
import { SettingsPage } from './pages/Settings'
import { LoginPage } from './pages/Login'
import { AdminIngestionPage } from './pages/AdminIngestion'
import { NotFoundPage } from './pages/NotFound'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    )
  }
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  if (!user.isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-neutral-600">This area is restricted to administrators.</p>
      </div>
    )
  }
  return <>{children}</>
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 sm:px-6">{children}</main>
      <footer className="mt-16 border-t border-neutral-200 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-3 text-center text-xs text-neutral-500 sm:flex-row sm:text-left">
            <p>
              <span className="font-semibold text-neutral-700">XFind</span> — search intelligence for marketplaces.
            </p>
            <p>
              Development mode uses clearly labelled sample data. Live Vinted data is never faked.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/brand/:slug" element={<BrandDetailPage />} />
          <Route
            path="/saved-searches"
            element={
              <RequireAuth>
                <SavedSearchesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/favorites"
            element={
              <RequireAuth>
                <FavoritesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/ingestion"
            element={
              <RequireAdmin>
                <AdminIngestionPage />
              </RequireAdmin>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </>
  )
}