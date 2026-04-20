import { useEffect, useRef, useState } from 'react'
import { loadYandexMaps } from '../../lib/yandexMaps'

/**
 * Одна точка на Яндекс.Картах (как на карте поиска / в мобильном клиенте).
 * Без ключа или при ошибке API — статическая static-maps.
 */
export default function BoatDetailLocationMap({ apiKey, lat, lng, title = 'Катер' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [useStatic, setUseStatic] = useState(!apiKey)

  useEffect(() => {
    if (useStatic) return undefined
    if (lat == null || lng == null || !apiKey) return undefined
    const la = Number(lat)
    const lo = Number(lng)
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
      setUseStatic(true)
      return undefined
    }
    let cancelled = false
    loadYandexMaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return
        const map = new ymaps.Map(containerRef.current, {
          center: [la, lo],
          zoom: 14,
          controls: ['zoomControl'],
        })
        mapRef.current = map
        try {
          map.behaviors.disable('scrollZoom')
        } catch {
          /* ignore */
        }
        map.geoObjects.add(
          new ymaps.Placemark(
            [la, lo],
            { hintContent: title },
            { preset: 'islands#blueDotIcon' },
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setUseStatic(true)
      })
    return () => {
      cancelled = true
      const m = mapRef.current
      mapRef.current = null
      if (m) {
        try {
          m.destroy()
        } catch {
          /* ignore */
        }
      }
    }
  }, [apiKey, lat, lng, useStatic, title])

  if (lat == null || lng == null) return null
  const la = Number(lat)
  const lo = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null

  if (useStatic) {
    const w = 640
    const h = 220
    const src = `https://static-maps.yandex.ru/1.x/?ll=${lo},${la}&size=${w},${h}&z=14&l=map&pt=${lo},${la},pm2rdm`
    return (
      <div className="bd-locationMap bd-locationMap--static">
        <img src={src} alt="Карта: расположение катера" width={w} height={h} loading="lazy" decoding="async" />
      </div>
    )
  }

  return <div ref={containerRef} className="bd-locationMap" role="presentation" />
}
