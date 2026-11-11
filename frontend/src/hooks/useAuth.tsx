import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi, clearToken, getToken, getStoredUser, setStoredUser, setToken } from '../lib/api'
import type { User } from '../lib/types'

interface AuthValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => getStoredUser())
  const [loading, setLoading] = useState<boolean>(() => Boolean(getToken()))

  // Restore session from a possibly-expired token, or consume ?token= from OAuth redirect.
  useEffect(() => {
    let cancelled = false

    const params = new URLSearchParams(window.location.search)
    const oauthToken = params.get('token')
    if (oauthToken) {
      setToken(oauthToken)
      params.delete('token')
      const next = params.toString()
      window.history.replaceState({}, '', next ? `/?${next}` : '/')
    }

    if (!getToken()) {
      setLoading(false)
      return
    }

    authApi
      .me()
      .then((me) => {
        if (cancelled) return
        setUserState(me)
        setStoredUser(me)
      })
      .catch(() => {
        if (cancelled) return
        clearToken()
        setUserState(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    setToken(res.access_token)
    setUserState(res.user)
    setStoredUser(res.user)
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await authApi.register({ email, password, name })
    setToken(res.access_token)
    setUserState(res.user)
    setStoredUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore network errors on logout
    }
    clearToken()
    setUserState(null)
  }, [])

  const setUser = useCallback((next: User) => {
    setUserState(next)
    setStoredUser(next)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, setUser }),
    [user, loading, login, register, logout, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
