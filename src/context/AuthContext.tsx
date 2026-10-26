import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, AUTH_EXPIRED_EVENT } from '../api/client'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (emailOrUsername: string, password: string) => Promise<void>
  register: (input: {
    username: string
    email: string
    password: string
    country: string
  }) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const current = await api.me()
      setUser(current)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const expire = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, expire)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expire)
  }, [refresh])

  const login = useCallback(async (emailOrUsername: string, password: string) => {
    const current = await api.login(emailOrUsername, password)
    setUser(current)
  }, [])

  const register = useCallback(
    async (input: { username: string; email: string; password: string; country: string }) => {
      await api.register(input)
      const current = await api.login(input.username, input.password)
      setUser(current)
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      setUser(null)
      return
    }
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, refresh, setUser }),
    [user, loading, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return value
}
