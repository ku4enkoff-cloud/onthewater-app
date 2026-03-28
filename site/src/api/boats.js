import { API_BASE } from '../config'

function boatsUrl(query) {
  const base = API_BASE || ''
  const q = new URLSearchParams(query)
  return `${base}/boats?${q.toString()}`
}

async function fetchBoatsJson(url) {
  const res = await fetch(url, { credentials: 'omit' })
  if (!res.ok) throw new Error(`boats ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

/**
 * Тот же запрос, что на главном экране приложения: popular + limit.
 * @see mobile/src/client/screens/SearchScreen.js fetchBoats
 */
export async function fetchPopularBoats(limit = 20) {
  const lim = Math.min(50, Math.max(1, Number(limit) || 20))
  return fetchBoatsJson(boatsUrl({ popular: 1, limit: lim }))
}

/**
 * Параметры как в mobile SearchResultsScreen fetchBoats.
 */
export async function fetchBoatsSearch(params) {
  if (params.allRegions) {
    return fetchBoatsJson(boatsUrl({ popular: 1, limit: 200 }))
  }
  if (params.region) {
    return fetchBoatsJson(boatsUrl({ region: params.region }))
  }
  if (params.city) {
    return fetchBoatsJson(boatsUrl({ city: params.city }))
  }
  const lat = Number(params.lat) || 55.751244
  const lng = Number(params.lng) || 37.618423
  const radius = Math.min(200, Math.max(5, Number(params.radius) || 50))
  return fetchBoatsJson(boatsUrl({ lat, lng, radius }))
}

export async function fetchBoatTypes() {
  const base = API_BASE || ''
  const res = await fetch(`${base}/boat-types`, { credentials: 'omit' })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
