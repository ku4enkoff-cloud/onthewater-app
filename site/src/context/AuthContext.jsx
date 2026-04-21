import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchMe, loginAuth } from '../api/auth'

const TOKEN_KEY = 'boatrent_site_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY) || ''
    if (!saved) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const me = await fetchMe(saved)
        if (cancelled) return
        setToken(saved)
        setUser(me)
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        if (!cancelled) {
          setToken('')
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async ({ login, password }) => {
    const payload = await loginAuth({ login, password })
    const nextToken = String(payload?.token || '')
    const nextUser = payload?.user || null
    if (!nextToken || !nextUser) throw new Error('Сервер вернул некорректный ответ авторизации')
    localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    setUser(nextUser)
    return nextUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setUser(null)
  }, [])

  const value = useMemo(() => ({ token, user, loading, login, logout }), [token, user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
