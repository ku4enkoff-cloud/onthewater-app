import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadYandexMaps } from '../lib/yandexMaps'
import { createBoatsClusterLayer } from '../lib/yandexBoatsClusterLayer'
import { YANDEX_MAPS_API_KEY } from '../config'
import { fetchBoatsSearch } from '../api/boats'
import { boatDetailPath } from '../boatUrl'
import {
  CITY_COORDS,
  DEFAULT_MAP_CENTER,
  getNearestCityKey,
  isPlausibleRuGeo,
  NEAREST_CITY_STORAGE_KEY,
  radiusKmFromBounds,
  readNearestCityFromStorage,
} from '../boatSearchUtils'
import MapBoatPreview from './MapBoatPreview.jsx'

const FALLBACK_RADIUS_KM = 50
const WIDE_RADIUS_KM = 120
const MAP_PAN_MIN_DEG = 0.03

function resolveFallbackCenter() {
  const city = readNearestCityFromStorage()
  if (city && CITY_COORDS[city]) {
    return { lat: CITY_COORDS[city].lat, lon: CITY_COORDS[city].lon, city, fromGeo: false }
  }
  return { lat: DEFAULT_MAP_CENTER.lat, lon: DEFAULT_MAP_CENTER.lon, city: 'Москва', fromGeo: false }
}

function requestUserCenter() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(resolveFallbackCenter())
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (!isPlausibleRuGeo(lat, lng)) {
          resolve(resolveFallbackCenter())
          return
        }
        const city = getNearestCityKey(lat, lng)
        try {
          localStorage.setItem(NEAREST_CITY_STORAGE_KEY, city)
        } catch {
          /* ignore */
        }
        window.dispatchEvent(
          new CustomEvent('boatrent:nearest-city', { detail: { city, lat, lng } }),
        )
        resolve({ lat, lon: lng, city, fromGeo: true })
      },
      () => resolve(resolveFallbackCenter()),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 12_000 },
    )
  })
}

function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

function boatsWithCoords(list) {
  return (list || []).filter((b) => b.lat != null && b.lng != null)
}

function pluralBoats(n) {
  if (n === 1) return 'катер'
  if (n >= 2 && n <= 4) return 'катера'
  return 'катеров'
}

function mergeBoatLists(prev, incoming) {
  const byId = new Map()
  for (const b of prev || []) {
    if (b?.id != null) byId.set(String(b.id), b)
  }
  for (const b of incoming || []) {
    if (b?.id != null) byId.set(String(b.id), b)
  }
  return [...byId.values()]
}

function sortByTitle(boats) {
  return (boats || [])
    .slice()
    .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ru'))
}

export default function HomeHeroMap() {
  const navigate = useNavigate()
  const shellRef = useRef(null)
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const boatsRef = useRef([])
  const userPlacemarkRef = useRef(null)
  const centerMetaRef = useRef({ city: 'Москва', fromGeo: false })
  const allowViewportFetchRef = useRef(false)
  const lastViewportFetchRef = useRef({ lat: null, lng: null, radius: null })
  const fetchSeqRef = useRef(0)
  const suppressActionRef = useRef(0)
  const ignoreMapClickUntilRef = useRef(0)
  const [status, setStatus] = useState('locate')
  const [label, setLabel] = useState('Определяем вашу локацию…')
  const [boatCount, setBoatCount] = useState(0)
  const [previewBoats, setPreviewBoats] = useState(null)
  const [hoverAnchor, setHoverAnchor] = useState(null)
  const [selectedBoatId, setSelectedBoatId] = useState(null)

  useEffect(() => {
    layerRef.current?.setSelectedBoatId(selectedBoatId)
  }, [selectedBoatId])

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY) {
      setStatus('nokey')
      setLabel('Карта недоступна')
      return undefined
    }
    if (!containerRef.current) return undefined

    let cancelled = false
    let map = null
    let onActionEnd = null
    let onMapClick = null

    const updateBadge = (count) => {
      setBoatCount(count)
      const { city, fromGeo } = centerMetaRef.current
      if (count === 0) {
        setStatus('empty')
        setLabel(`Пока нет катеров рядом · ${city}`)
        return
      }
      setStatus('ready')
      const radius = lastViewportFetchRef.current.radius
      if (radius != null && radius > 90) {
        setLabel(`${count} ${pluralBoats(count)} в этой области`)
      } else if (fromGeo) {
        setLabel(`${count} ${pluralBoats(count)} рядом с вами`)
      } else {
        setLabel(`${count} ${pluralBoats(count)} · ${city}`)
      }
    }

    const syncLayer = () => {
      layerRef.current?.setBoats(boatsRef.current)
    }

    const fetchForViewport = async () => {
      const m = mapRef.current
      if (!m || !allowViewportFetchRef.current || cancelled) return
      if (Date.now() < suppressActionRef.current) return

      let lat
      let lng
      let radius
      try {
        const bounds = m.getBounds()
        const center = m.getCenter()
        lat = center[0]
        lng = center[1]
        radius = radiusKmFromBounds(bounds)
      } catch {
        return
      }

      const last = lastViewportFetchRef.current
      if (last.lat != null) {
        const moved =
          Math.abs(last.lat - lat) > MAP_PAN_MIN_DEG || Math.abs(last.lng - lng) > MAP_PAN_MIN_DEG
        const radiusChanged =
          Math.abs((last.radius || 0) - radius) / Math.max(last.radius || 1, 1) > 0.15
        if (!moved && !radiusChanged) return
      }

      const prevRadius = last.radius ?? FALLBACK_RADIUS_KM
      lastViewportFetchRef.current = { lat, lng, radius }
      const seq = ++fetchSeqRef.current

      try {
        const boats = await fetchBoatsSearch({ lat, lng, radius })
        if (cancelled || seq !== fetchSeqRef.current) return
        const incoming = boatsWithCoords(boats)
        if (radius >= prevRadius * 0.85) {
          boatsRef.current = mergeBoatLists(boatsRef.current, incoming)
        } else if (incoming.length) {
          boatsRef.current = incoming
        }
        syncLayer()
        updateBadge(boatsRef.current.length)
      } catch {
        /* ignore */
      }
    }

    ;(async () => {
      try {
        setStatus('locate')
        setLabel('Определяем вашу локацию…')
        const center = await requestUserCenter()
        if (cancelled) return

        centerMetaRef.current = { city: center.city, fromGeo: center.fromGeo }
        setStatus('loading')
        setLabel(
          center.fromGeo
            ? `Ищем катера рядом · ${center.city}`
            : `Катера около · ${center.city}`,
        )

        let boats = await fetchBoatsSearch({
          lat: center.lat,
          lng: center.lon,
          radius: FALLBACK_RADIUS_KM,
        })
        if (cancelled) return

        let withCoords = boatsWithCoords(boats)
        if (withCoords.length === 0) {
          boats = await fetchBoatsSearch({
            lat: center.lat,
            lng: center.lon,
            radius: WIDE_RADIUS_KM,
          })
          if (cancelled) return
          withCoords = boatsWithCoords(boats)
        }

        boatsRef.current = withCoords
        lastViewportFetchRef.current = {
          lat: center.lat,
          lng: center.lon,
          radius: withCoords.length ? FALLBACK_RADIUS_KM : WIDE_RADIUS_KM,
        }

        const ymaps = await loadYandexMaps(YANDEX_MAPS_API_KEY)
        if (cancelled || !containerRef.current) return

        map = new ymaps.Map(containerRef.current, {
          center: [center.lat, center.lon],
          zoom: 11,
          controls: ['zoomControl'],
        })
        map.controls.get('zoomControl')?.options.set({ size: 'small', position: { right: 10, top: 10 } })
        mapRef.current = map

        layerRef.current = createBoatsClusterLayer(ymaps, map, {
          positionRoot: shellRef.current || containerRef.current,
          onSelect: ({ boats: selected }) => {
            ignoreMapClickUntilRef.current = Date.now() + 500
            suppressActionRef.current = Date.now() + 900
            const sorted = sortByTitle(selected)
            setPreviewBoats(sorted)
            setHoverAnchor(null)
            setSelectedBoatId(sorted.length === 1 ? sorted[0]?.id ?? null : null)
          },
          onHover: (payload) => {
            if (!payload?.boats?.length) {
              setHoverAnchor(null)
              return
            }
            const sorted = sortByTitle(payload.boats)
            const w = Math.min(320, Math.max(200, (payload.containerW || 400) - 24))
            let left = payload.x + 14
            if (left + w > (payload.containerW || 0) - 8) left = payload.x - 14 - w
            setHoverAnchor({
              boats: sorted,
              style: {
                left: Math.max(8, Math.min(left, (payload.containerW || w) - w - 8)),
                top: Math.max(40, Math.min(payload.y, (payload.containerH || 400) - 24)),
                width: w,
              },
            })
            setPreviewBoats(null)
          },
        })
        syncLayer()

        if (center.fromGeo) {
          const userLayout = ymaps.templateLayoutFactory.createClass(
            '<div class="pm-mapUser" title="Вы здесь"><span class="pm-mapUser__ring"></span><span class="pm-mapUser__dot"></span></div>',
          )
          userPlacemarkRef.current = new ymaps.Placemark(
            [center.lat, center.lon],
            {},
            {
              iconLayout: userLayout,
              iconOffset: [-14, -14],
              iconShape: { type: 'Circle', coordinates: [0, 0], radius: 16 },
              zIndex: 1000,
              interactivityModel: 'default#silent',
            },
          )
          map.geoObjects.add(userPlacemarkRef.current)
        }

        onActionEnd = debounce(() => {
          fetchForViewport()
        }, 400)
        map.events.add('actionend', onActionEnd)

        onMapClick = () => {
          if (Date.now() < ignoreMapClickUntilRef.current) return
          setPreviewBoats(null)
          setHoverAnchor(null)
          setSelectedBoatId(null)
        }
        map.events.add('click', onMapClick)

        if (withCoords.length > 1) {
          try {
            suppressActionRef.current = Date.now() + 800
            const bounds = ymaps.util.bounds.fromPoints(
              withCoords.map((b) => [Number(b.lat), Number(b.lng)]),
            )
            map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 56 })
          } catch {
            /* ignore */
          }
        } else if (withCoords.length === 1) {
          try {
            suppressActionRef.current = Date.now() + 800
            map.setCenter([Number(withCoords[0].lat), Number(withCoords[0].lng)], 13)
          } catch {
            /* ignore */
          }
        }

        updateBadge(withCoords.length)
        window.setTimeout(() => {
          if (!cancelled) allowViewportFetchRef.current = true
        }, 800)
      } catch {
        if (!cancelled) {
          setStatus('error')
          setLabel('Не удалось загрузить карту')
        }
      }
    })()

    return () => {
      cancelled = true
      allowViewportFetchRef.current = false
      try {
        layerRef.current?.destroy()
      } catch {
        /* ignore */
      }
      layerRef.current = null
      if (map && onActionEnd) {
        try {
          map.events.remove('actionend', onActionEnd)
        } catch {
          /* ignore */
        }
      }
      if (map && onMapClick) {
        try {
          map.events.remove('click', onMapClick)
        } catch {
          /* ignore */
        }
      }
      if (map) {
        try {
          map.destroy()
        } catch {
          /* ignore */
        }
      }
      mapRef.current = null
      userPlacemarkRef.current = null
      boatsRef.current = []
    }
  }, [])

  return (
    <div ref={shellRef} className="pm-map pm-map--live">
      <div
        ref={containerRef}
        className="pm-map__canvas"
        role="application"
        aria-label="Карта катеров рядом с вами"
      />
      {!previewBoats?.length && !hoverAnchor?.boats?.length ? (
        <div className={`pm-map__badge pm-map__badge--${status}`} aria-live="polite">
          <span className="pm-map__badgeDot" aria-hidden />
          <span>{label}</span>
          {status === 'ready' && boatCount > 0 ? (
            <button type="button" className="pm-map__badgeLink" onClick={() => navigate('/boats')}>
              Все →
            </button>
          ) : null}
          {status === 'empty' || status === 'error' ? (
            <button type="button" className="pm-map__badgeLink" onClick={() => navigate('/boats')}>
              Каталог →
            </button>
          ) : null}
        </div>
      ) : null}

      {hoverAnchor?.boats?.length ? (
        <MapBoatPreview
          boats={hoverAnchor.boats}
          anchored
          style={hoverAnchor.style}
          onMouseEnter={() => layerRef.current?.keepHover?.()}
          onMouseLeave={() => layerRef.current?.releaseHover?.()}
          onOpenBoat={(boat) => {
            const path = boatDetailPath(boat)
            if (path) navigate(path)
          }}
        />
      ) : previewBoats?.length ? (
        <MapBoatPreview
          boats={previewBoats}
          onClose={() => {
            setPreviewBoats(null)
            setSelectedBoatId(null)
          }}
          onOpenBoat={(boat) => {
            const path = boatDetailPath(boat)
            if (path) navigate(path)
          }}
        />
      ) : null}

      {status === 'nokey' ? (
        <div className="pm-map__fallback" role="status">
          <p>Добавьте ключ Яндекс.Карт для отображения судов на карте.</p>
        </div>
      ) : null}
    </div>
  )
}
