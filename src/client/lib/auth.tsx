import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { UserProfile } from '@shared/types'
import { api } from './api'

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<UserProfile>
  register: (email: string, password: string, name?: string) => Promise<UserProfile>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  setUser: (user: UserProfile | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: UserProfile | null }>('/api/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: UserProfile }>('/api/auth/login', { email, password })
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const data = await api.post<{ user: UserProfile }>('/api/auth/register', {
      email,
      password,
      ...(name ? { name } : {}),
    })
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => undefined)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, refresh, setUser }),
    [user, loading, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
