import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchMe, loginAuth } from '../api/auth'

const TOKEN_KEY = 'boatrent_site_token'

export const OWNER_ACCOUNT_ERROR = 'OWNER_ACCOUNT'

/** Сайт — только для клиентов; владельцы работают в отдельном приложении. */
function isOwnerAccount(user) {
  return user?.role === 'owner'
}

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
        if (isOwnerAccount(me)) {
          localStorage.removeItem(TOKEN_KEY)
          return
        }
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
    if (isOwnerAccount(nextUser)) {
      const err = new Error('Это аккаунт владельца. Управляйте катерами в приложении ONTHEWATER для владельцев.')
      err.code = OWNER_ACCOUNT_ERROR
      throw err
    }
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

  const setCurrentUser = useCallback((nextUser) => {
    setUser(nextUser || null)
  }, [])

  const value = useMemo(
    () => ({ token, user, loading, login, logout, setCurrentUser }),
    [token, user, loading, login, logout, setCurrentUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
