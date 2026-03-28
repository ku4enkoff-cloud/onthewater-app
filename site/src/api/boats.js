import { API_BASE } from '../config'

/**
 * Тот же запрос, что на главном экране приложения: popular + limit.
 * @see mobile/src/client/screens/SearchScreen.js fetchBoats
 */
export async function fetchPopularBoats(limit = 20) {
  const lim = Math.min(50, Math.max(1, Number(limit) || 20))
  const base = API_BASE || ''
  const url = `${base}/boats?popular=1&limit=${lim}`
  const res = await fetch(url, { credentials: 'omit' })
  if (!res.ok) throw new Error(`boats ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
