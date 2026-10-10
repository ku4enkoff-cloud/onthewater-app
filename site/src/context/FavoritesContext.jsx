import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'boatrent_site_favorites_v2'
const LEGACY_IDS_KEY = 'boatrent_site_favorites'

const FavoritesContext = createContext(null)

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) return list.filter((b) => b && b.id != null)
    }
  } catch {
    /* ignore */
  }
  try {
    const legacy = localStorage.getItem(LEGACY_IDS_KEY)
    if (legacy) {
      const ids = JSON.parse(legacy)
      if (Array.isArray(ids)) {
        return ids.map((id) => ({ id })).filter((b) => b.id != null)
      }
    }
  } catch {
    /* ignore */
  }
  return []
}

export function FavoritesProvider({ children }) {
  const [boats, setBoats] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(boats))
      localStorage.setItem(
        LEGACY_IDS_KEY,
        JSON.stringify(boats.map((b) => b.id).filter((id) => id != null)),
      )
    } catch {
      /* ignore */
    }
  }, [boats])

  const addFavorite = useCallback((boat) => {
    if (!boat || boat.id == null) return
    setBoats((prev) => (prev.some((b) => String(b.id) === String(boat.id)) ? prev : [...prev, boat]))
  }, [])

  const removeFavorite = useCallback((boatId) => {
    setBoats((prev) => prev.filter((b) => String(b.id) !== String(boatId)))
  }, [])

  const toggleFavorite = useCallback((boat) => {
    if (!boat || boat.id == null) return
    setBoats((prev) => {
      const has = prev.some((b) => String(b.id) === String(boat.id))
      if (has) return prev.filter((b) => String(b.id) !== String(boat.id))
      return [...prev, boat]
    })
  }, [])

  const isFavorite = useCallback(
    (boatId) => boats.some((b) => String(b.id) === String(boatId)),
    [boats],
  )

  const value = useMemo(
    () => ({
      favoriteBoats: boats,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      isFavorite,
    }),
    [boats, addFavorite, removeFavorite, toggleFavorite, isFavorite],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
