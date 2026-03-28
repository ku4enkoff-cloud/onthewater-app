const env = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')

/** Пустая строка в dev → запросы на тот же origin (Vite proxy → localhost:3000). */
export const API_BASE =
  env || (import.meta.env.DEV ? '' : 'https://api.onthewater.ru')

/** Ссылки «в приложение» / маркетинг (можно переопределить). */
export const SITE_MAIN_URL =
  (import.meta.env.VITE_MAIN_SITE_URL || '').trim() || 'https://onthewater.ru'

/** Ключ JavaScript API карт (developer.tech.yandex.ru → JavaScript API и HTTP Геокодер). */
export const YANDEX_MAPS_API_KEY =
  (import.meta.env.VITE_YANDEX_MAPS_API_KEY || import.meta.env.VITE_YANDEX_MAPKIT_API_KEY || '')
    .trim()

export function getPhotoUrl(src) {
  if (!src || typeof src !== 'string') return null
  const s = src.trim()
  if (!s) return null
  const uploadsMatch = s.match(/\/uploads\/[^?#]+/)
  if (uploadsMatch) {
    const path = uploadsMatch[0].startsWith('/') ? uploadsMatch[0] : `/${uploadsMatch[0]}`
    return `${API_BASE}${path}`
  }
  if (/^https?:\/\//i.test(s)) return s
  return `${API_BASE}${s.startsWith('/') ? s : `/${s}`}`
}
