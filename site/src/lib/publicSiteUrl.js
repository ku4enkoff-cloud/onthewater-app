import { SITE_MAIN_URL } from '../config'

/** Базовый URL сайта для canonical и Open Graph (без завершающего /). */
export function getPublicSiteOrigin() {
  const fromEnv = (import.meta.env.VITE_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return SITE_MAIN_URL.replace(/\/$/, '')
}
