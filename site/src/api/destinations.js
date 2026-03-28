import { API_BASE } from '../config'

/** Как mobile SearchScreen: GET /destinations */
export async function fetchDestinations() {
  const base = API_BASE || ''
  const res = await fetch(`${base}/destinations`, { credentials: 'omit' })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
