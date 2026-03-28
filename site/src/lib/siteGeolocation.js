import {
  NEAREST_CITY_STORAGE_KEY,
  getNearestCityKey,
} from '../boatSearchUtils.js'

let started = false

/** Один запрос геолокации за загрузку SPA: сохраняет город и шлёт событие для /boats. */
export function startSiteGeolocation() {
  if (started) return
  if (typeof window === 'undefined' || !navigator?.geolocation) return
  started = true

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const key = getNearestCityKey(pos.coords.latitude, pos.coords.longitude)
      try {
        localStorage.setItem(NEAREST_CITY_STORAGE_KEY, key)
      } catch {
        /* ignore */
      }
      window.dispatchEvent(
        new CustomEvent('boatrent:nearest-city', { detail: { city: key } }),
      )
    },
    () => {},
    {
      enableHighAccuracy: false,
      maximumAge: 300_000,
      timeout: 15_000,
    },
  )
}
