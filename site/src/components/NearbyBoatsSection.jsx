import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadYandexMaps } from '../lib/yandexMaps'
import { createBoatsClusterLayer } from '../lib/yandexBoatsClusterLayer'
import { getPhotoUrl, getThumbUrl, YANDEX_MAPS_API_KEY } from '../config'
import { fetchBoatsSearch } from '../api/boats'
import { boatDetailPath } from '../boatUrl'
import {
  firstPhotoThumbUrl,
  formatCardLocation,
  formatPriceRu,
  getMinDurationPrice,
  minDurationLabelForBoat,
} from '../boatUtils'

const PHOTO_PLACEHOLDER = 'https://placehold.co/96x96/e8eef4/64748b?text=%D0%9A'
import {
  CITY_COORDS,
  DEFAULT_MAP_CENTER,
  getNearestCityKey,
  isPlausibleRuGeo,
  NEAREST_CITY_STORAGE_KEY,
  radiusKmFromBounds,
  readNearestCityFromStorage,
} from '../boatSearchUtils'

const FALLBACK_RADIUS_KM = 50
const WIDE_RADIUS_KM = 120
const LIST_LIMIT = 8
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

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

function formatDistance(km) {
  if (!Number.isFinite(km)) return ''
  if (km < 1) return `${Math.max(0.1, Math.round(km * 10) / 10).toLocaleString('ru-RU')} км`
  if (km < 10) return `${(Math.round(km * 10) / 10).toLocaleString('ru-RU')} км`
  return `${Math.round(km).toLocaleString('ru-RU')} км`
}

function boatPriceLine(boat) {
  const price = getMinDurationPrice(boat)
  const unit = minDurationLabelForBoat(boat)
  if (!(price > 0)) return '—'
  return `${formatPriceRu(price)} ₽ / ${unit}`
}

function CompassIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function NearbyBoatsSection() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const boatsRef = useRef([])
  const userPlacemarkRef = useRef(null)
  const ymapsRef = useRef(null)
  const centerRef = useRef(resolveFallbackCenter())
  const allowViewportFetchRef = useRef(false)
  const lastViewportFetchRef = useRef({ lat: null, lng: null, radius: null })
  const fetchSeqRef = useRef(0)
  const suppressActionRef = useRef(0)
  const listRef = useRef(null)

  const [status, setStatus] = useState('locate')
  const [boats, setBoats] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [centerMeta, setCenterMeta] = useState(() => resolveFallbackCenter())
  const ranked = useMemo(() => {
    const c = centerMeta
    return boatsWithCoords(boats)
      .map((b) => ({
        boat: b,
        km: distanceKm(c.lat, c.lon, Number(b.lat), Number(b.lng)),
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, LIST_LIMIT)
  }, [boats, centerMeta])

  const maxKm = ranked.length ? ranked[ranked.length - 1].km : 0

  useEffect(() => {
    layerRef.current?.setSelectedBoatId(selectedId)
  }, [selectedId])

  useEffect(() => {
    if (!selectedId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-boat-id="${String(selectedId)}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY) {
      setStatus('nokey')
      return undefined
    }
    if (!containerRef.current) return undefined

    let cancelled = false
    let map = null
    let onActionEnd = null
    let resizeObserver = null

    const syncLayer = () => {
      layerRef.current?.setBoats(boatsRef.current)
    }

    const applyBoats = (list, meta) => {
      boatsRef.current = list
      setBoats(list)
      setCenterMeta(meta)
      syncLayer()
      setStatus(list.length ? 'ready' : 'empty')
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

      lastViewportFetchRef.current = { lat, lng, radius }
      const seq = ++fetchSeqRef.current
      const city = getNearestCityKey(lat, lng)
      centerRef.current = { lat, lon: lng, city, fromGeo: centerRef.current.fromGeo }

      try {
        const next = await fetchBoatsSearch({ lat, lng, radius })
        if (cancelled || seq !== fetchSeqRef.current) return
        applyBoats(boatsWithCoords(next), centerRef.current)
      } catch {
        /* ignore */
      }
    }

    const placeUserMark = (ymaps, m, center) => {
      try {
        if (userPlacemarkRef.current) {
          m.geoObjects.remove(userPlacemarkRef.current)
          userPlacemarkRef.current = null
        }
      } catch {
        /* ignore */
      }
      if (!center.fromGeo) return
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
      m.geoObjects.add(userPlacemarkRef.current)
    }

    const fitBoats = (ymaps, m, list) => {
      if (list.length > 1) {
        try {
          suppressActionRef.current = Date.now() + 800
          const bounds = ymaps.util.bounds.fromPoints(
            list.map((b) => [Number(b.lat), Number(b.lng)]),
          )
          m.setBounds(bounds, { checkZoomRange: true, zoomMargin: 56 })
        } catch {
          /* ignore */
        }
      } else if (list.length === 1) {
        try {
          suppressActionRef.current = Date.now() + 800
          m.setCenter([Number(list[0].lat), Number(list[0].lng)], 13)
        } catch {
          /* ignore */
        }
      }
    }

    const loadAround = async (center) => {
      centerRef.current = center
      setCenterMeta(center)
      setStatus('loading')
      let list = boatsWithCoords(
        await fetchBoatsSearch({ lat: center.lat, lng: center.lon, radius: FALLBACK_RADIUS_KM }),
      )
      let usedRadius = FALLBACK_RADIUS_KM
      if (!list.length) {
        list = boatsWithCoords(
          await fetchBoatsSearch({ lat: center.lat, lng: center.lon, radius: WIDE_RADIUS_KM }),
        )
        usedRadius = WIDE_RADIUS_KM
      }
      lastViewportFetchRef.current = { lat: center.lat, lng: center.lon, radius: usedRadius }
      applyBoats(list, center)
      return list
    }

    ;(async () => {
      try {
        setStatus('locate')
        const center = await requestUserCenter()
        if (cancelled) return

        const list = await loadAround(center)
        if (cancelled) return

        const ymaps = await loadYandexMaps(YANDEX_MAPS_API_KEY)
        if (cancelled || !containerRef.current) return
        ymapsRef.current = ymaps

        map = new ymaps.Map(containerRef.current, {
          center: [center.lat, center.lon],
          zoom: 11,
          controls: ['zoomControl'],
        })
        map.controls.get('zoomControl')?.options.set({
          size: 'small',
          position: { right: 12, bottom: 12 },
        })
        mapRef.current = map

        layerRef.current = createBoatsClusterLayer(ymaps, map, {
          onSelect: ({ boats: selected }) => {
            suppressActionRef.current = Date.now() + 900
            const first = selected?.[0]
            if (first?.id != null) setSelectedId(first.id)
          },
        })
        syncLayer()
        placeUserMark(ymaps, map, center)

        onActionEnd = debounce(() => {
          fetchForViewport()
        }, 400)
        map.events.add('actionend', onActionEnd)

        const fitViewport = () => {
          try {
            map.container.fitToViewport()
          } catch {
            /* ignore */
          }
        }
        fitViewport()
        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
          resizeObserver = new ResizeObserver(() => fitViewport())
          resizeObserver.observe(containerRef.current.parentElement || containerRef.current)
        }

        fitBoats(ymaps, map, list)
        window.setTimeout(() => {
          if (!cancelled) {
            fitViewport()
            allowViewportFetchRef.current = true
          }
        }, 800)
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => {
      cancelled = true
      allowViewportFetchRef.current = false
      try {
        resizeObserver?.disconnect()
      } catch {
        /* ignore */
      }
      resizeObserver = null
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

  const locateMe = async () => {
    setStatus('locate')
    const center = await requestUserCenter()
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return
    allowViewportFetchRef.current = false
    suppressActionRef.current = Date.now() + 900
    try {
      map.setCenter([center.lat, center.lon], 12, { duration: 300 })
    } catch {
      /* ignore */
    }
    const list = boatsWithCoords(
      await fetchBoatsSearch({ lat: center.lat, lng: center.lon, radius: FALLBACK_RADIUS_KM }),
    )
    const finalList =
      list.length > 0
        ? list
        : boatsWithCoords(
            await fetchBoatsSearch({ lat: center.lat, lng: center.lon, radius: WIDE_RADIUS_KM }),
          )
    centerRef.current = center
    setCenterMeta(center)
    boatsRef.current = finalList
    setBoats(finalList)
    layerRef.current?.setBoats(finalList)
    setStatus(finalList.length ? 'ready' : 'empty')
    setSelectedId(null)
    try {
      if (userPlacemarkRef.current) {
        map.geoObjects.remove(userPlacemarkRef.current)
        userPlacemarkRef.current = null
      }
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
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      allowViewportFetchRef.current = true
    }, 700)
  }

  const selectBoat = (boat) => {
    if (!boat) return
    setSelectedId(boat.id)
    const map = mapRef.current
    if (!map) return
    suppressActionRef.current = Date.now() + 700
    try {
      map.setCenter([Number(boat.lat), Number(boat.lng)], Math.max(map.getZoom(), 14), {
        duration: 280,
      })
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="pm-nearby" id="nearby" aria-label="Катера поблизости">
      <div className="pm-container">
        <div className="pm-sectionHead pm-nearby__head">
          <div>
            <h2 className="pm-sectionTitle">Катера поблизости</h2>
            <p className="pm-nearby__lead">
              Смотрите доступные суда на карте и выбирайте ближайшую марину.
            </p>
          </div>
        </div>

        <div className="pm-nearby__layout">
          <div className="pm-nearby__mapWrap">
            {!YANDEX_MAPS_API_KEY ? (
              <div className="pm-nearby__mapFallback" role="status">
                Добавьте ключ Яндекс.Карт для отображения судов.
              </div>
            ) : (
              <div
                ref={containerRef}
                className="pm-nearby__map"
                role="application"
                aria-label="Карта катеров поблизости"
              />
            )}
            <button
              type="button"
              className="pm-nearby__locate"
              onClick={locateMe}
              title="Моё местоположение"
              aria-label="Моё местоположение"
            >
              <CompassIcon />
              <span>Моё местоположение</span>
            </button>
          </div>

          <aside className="pm-nearby__panel">
            <div className="pm-nearby__panelTop">
              <span>
                {status === 'locate' || status === 'loading'
                  ? 'Ищем…'
                  : `${ranked.length} ${ranked.length === 1 ? 'вариант' : ranked.length < 5 ? 'варианта' : 'вариантов'} рядом`}
              </span>
              <span>{ranked.length ? `до ${formatDistance(maxKm)}` : centerMeta.city}</span>
            </div>

            <div className="pm-nearby__list" ref={listRef}>
              {ranked.length ? (
                ranked.map(({ boat, km }) => {
                  const loc = formatCardLocation(boat)
                  const active = selectedId != null && String(selectedId) === String(boat.id)
                  const photo =
                    firstPhotoThumbUrl(boat, getPhotoUrl, getThumbUrl) || PHOTO_PLACEHOLDER
                  return (
                    <button
                      key={String(boat.id)}
                      type="button"
                      data-boat-id={String(boat.id)}
                      className={`pm-nearby__item${active ? ' is-active' : ''}`}
                      onClick={() => selectBoat(boat)}
                      onDoubleClick={() => {
                        const path = boatDetailPath(boat)
                        if (path) navigate(path)
                      }}
                    >
                      <span className="pm-nearby__thumb" aria-hidden>
                        <img src={photo} alt="" loading="lazy" decoding="async" />
                      </span>
                      <span className="pm-nearby__info">
                        <strong>{boat.title || 'Катер'}</strong>
                        <span>
                          {loc && loc !== '—' ? loc : centerMeta.city}
                          {km != null ? ` · ${formatDistance(km)}` : ''}
                        </span>
                      </span>
                      <span className="pm-nearby__price">{boatPriceLine(boat)}</span>
                    </button>
                  )
                })
              ) : (
                <p className="pm-nearby__empty">
                  {status === 'error'
                    ? 'Не удалось загрузить карту'
                    : status === 'locate' || status === 'loading'
                      ? 'Ищем катера рядом…'
                      : 'Пока нет катеров в этой области'}
                </p>
              )}
            </div>

            <button
              type="button"
              className="pm-nearby__catalog"
              onClick={() => navigate('/boats')}
            >
              Открыть каталог <ArrowIcon />
            </button>
          </aside>
        </div>
      </div>
    </section>
  )
}
