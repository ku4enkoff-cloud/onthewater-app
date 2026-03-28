let loadPromise = null

/**
 * JavaScript API 2.1 (тот же ключ, что MapKit в кабинете Яндекса — включите HTTP Геокодер / JS API для домена).
 */
export function loadYandexMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.ymaps) {
    return new Promise((resolve) => {
      window.ymaps.ready(() => resolve(window.ymaps))
    })
  }
  if (loadPromise) return loadPromise
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-yandex-maps-api]')
    if (existing) {
      existing.addEventListener('load', () => window.ymaps.ready(() => resolve(window.ymaps)))
      existing.addEventListener('error', reject)
      return
    }
    const s = document.createElement('script')
    s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`
    s.async = true
    s.dataset.yandexMapsApi = '1'
    s.onload = () => {
      if (window.ymaps) window.ymaps.ready(() => resolve(window.ymaps))
      else reject(new Error('ymaps missing'))
    }
    s.onerror = () => reject(new Error('Yandex Maps script failed'))
    document.head.appendChild(s)
  })
  return loadPromise
}
