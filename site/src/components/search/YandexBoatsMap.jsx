import { useEffect, useRef, useState, useCallback } from 'react'
import { loadYandexMaps } from '../../lib/yandexMaps'
import { getPhotoUrl } from '../../config'
import { firstPhotoUrl } from '../../boatUtils'
import {
  formatDurationChipLabel,
  formatDurationListLabel,
  getExactPriceForDuration,
  radiusKmFromBounds,
} from '../../boatSearchUtils'

const PICK_THUMB_PLACEHOLDER =
  'https://placehold.co/144x96/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'

function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

function markerPriceText(boat, durationFilter) {
  const activeDuration = durationFilter || (Number(boat.schedule_min_duration) || 60)
  const p =
    getExactPriceForDuration(boat, activeDuration) ?? (Number(boat.price_per_hour) || 0)
  const n = Math.round(p)
  if (n >= 1000) return `${Math.round(n / 1000)}k ₽`
  return `${n} ₽`
}

/** Данные для строки в модалке выбора при наложении меток */
function buildPickCandidate(boat, durationFilter) {
  const minDur = Number(boat.schedule_min_duration) || 60
  const activeDuration = durationFilter || minDur
  const price =
    getExactPriceForDuration(boat, activeDuration) ?? (Number(boat.price_per_hour) || 0)
  const n = Math.round(Number(price) || 0)
  return {
    id: boat.id,
    title: boat.title || 'Катер',
    priceLine: `от ${n.toLocaleString('ru-RU')} ₽ / ${formatDurationChipLabel(activeDuration)}`,
    minTimeLine: `минимум ${formatDurationListLabel(minDur)}`,
    photoUrl: firstPhotoUrl(boat, getPhotoUrl) || PICK_THUMB_PLACEHOLDER,
  }
}

/** Расстояние по поверхности Земли, м */
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Расстояние между точками на карте в пикселях экрана (для визуально наложенных меток) */
function pixelDistanceOnMap(map, lat1, lon1, lat2, lon2) {
  try {
    const z = map.getZoom()
    const proj = map.options.get('projection')
    const p1 = proj.toGlobalPixels([lat1, lon1], z)
    const p2 = proj.toGlobalPixels([lat2, lon2], z)
    const dx = p1[0] - p2[0]
    const dy = p1[1] - p2[1]
    return Math.hypot(dx, dy)
  } catch {
    return Infinity
  }
}

/** Считаем метки «рядом», если близко на экране или по координатам */
function isSameVisualCluster(map, lat1, lon1, lat2, lon2) {
  const m = distanceMeters(lat1, lon1, lat2, lon2)
  const px = pixelDistanceOnMap(map, lat1, lon1, lat2, lon2)
  return px < 72 || m < 95
}

export default function YandexBoatsMap({
  apiKey,
  boats,
  center,
  zoom,
  selectedBoatId,
  searchOnMove,
  autoFitBounds,
  onGeoSearch,
  onPlacemarksPick,
  filters,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layoutRef = useRef(null)
  const placemarksRef = useRef(new Map())
  const [mapReady, setMapReady] = useState(false)
  const onGeoSearchRef = useRef(onGeoSearch)
  const searchOnMoveRef = useRef(searchOnMove)
  const onPlacemarksPickRef = useRef(onPlacemarksPick)

  useEffect(() => {
    onGeoSearchRef.current = onGeoSearch
  }, [onGeoSearch])
  useEffect(() => {
    searchOnMoveRef.current = searchOnMove
  }, [searchOnMove])
  useEffect(() => {
    onPlacemarksPickRef.current = onPlacemarksPick
  }, [onPlacemarksPick])

  const onActionEndRef = useRef(null)
  useEffect(() => {
    onActionEndRef.current = debounce(() => {
      const map = mapRef.current
      if (!map || !searchOnMoveRef.current) return
      try {
        const b = map.getBounds()
        const c = map.getCenter()
        const r = radiusKmFromBounds(b)
        onGeoSearchRef.current?.({ lat: c[0], lng: c[1], radius: r })
      } catch {
        /* ignore */
      }
    }, 500)
  }, [])

  useEffect(() => {
    if (!apiKey || !containerRef.current) return undefined
    let cancelled = false
    let map = null

    loadYandexMaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return

        const PricePinLayout = ymaps.templateLayoutFactory.createClass(
          '<div class="$[properties.pinClass]">' +
            '<span class="yw-pin__txt">$[properties.priceText]</span>' +
            '$[properties.instantHtml]' +
            '</div>',
          {
            build() {
              PricePinLayout.superclass.build.call(this)
            },
          },
        )
        layoutRef.current = PricePinLayout

        map = new ymaps.Map(containerRef.current, {
          center: [center.lat, center.lon],
          zoom,
          controls: ['zoomControl'],
        })
        mapRef.current = map

        map.events.add('actionend', () => onActionEndRef.current?.())

        setMapReady(true)
      })
      .catch(() => setMapReady(false))

    return () => {
      cancelled = true
      setMapReady(false)
      placemarksRef.current = new Map()
      if (map) {
        try {
          map.destroy()
        } catch {
          /* ignore */
        }
      }
      mapRef.current = null
      layoutRef.current = null
    }
  }, [apiKey]) // eslint-disable-line react-hooks/exhaustive-deps -- центр/zoom: отдельный эффект

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    try {
      map.setCenter([center.lat, center.lon], zoom, { duration: 250 })
    } catch {
      /* ignore */
    }
  }, [mapReady, center.lat, center.lon, zoom])

  const rebuildPlacemarks = useCallback(() => {
    const map = mapRef.current
    const LayoutClass = layoutRef.current
    if (!mapReady || !map || !LayoutClass || !window.ymaps) return

    map.geoObjects.removeAll()
    placemarksRef.current.clear()

    const durationFilter = filters?.duration || null
    const withCoords = boats.filter((b) => b.lat != null && b.lng != null)

    for (const boat of withCoords) {
      const id = String(boat.id)
      const instant = boat.instant_booking !== false
      const lat = Number(boat.lat)
      const lng = Number(boat.lng)
      const pm = new window.ymaps.Placemark(
        [lat, lng],
        {
          priceText: markerPriceText(boat, durationFilter),
          pinClass: 'yw-pin',
          instantHtml: instant ? '<span class="yw-pin__zap">⚡</span>' : '',
          hintContent: boat.title || 'Катер',
        },
        {
          iconLayout: LayoutClass,
          /* якорь ближе к центру плашки; область клика шире длинных цен вроде «50k ₽» */
          iconOffset: [-32, -20],
          iconShape: {
            type: 'Rectangle',
            coordinates: [
              [-12, -44],
              [112, 20],
            ],
          },
          interactiveZIndex: true,
          zIndex: 650,
          cursor: 'pointer',
        },
      )
      pm.events.add('click', (e) => {
        try {
          e.stopPropagation()
        } catch {
          /* ignore */
        }
        const neighbors = withCoords
          .filter((b) =>
            isSameVisualCluster(map, lat, lng, Number(b.lat), Number(b.lng)),
          )
          .sort((a, b) => {
            if (a.id === boat.id) return -1
            if (b.id === boat.id) return 1
            return String(a.title || '').localeCompare(String(b.title || ''), 'ru')
          })
        const payload = neighbors.map((b) => buildPickCandidate(b, durationFilter))
        onPlacemarksPickRef.current?.(payload)
      })
      map.geoObjects.add(pm)
      placemarksRef.current.set(id, pm)
    }

    if (autoFitBounds !== false) {
      if (withCoords.length > 1) {
        try {
          map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 56 })
        } catch {
          /* ignore */
        }
      } else if (withCoords.length === 1) {
        try {
          map.setCenter([Number(withCoords[0].lat), Number(withCoords[0].lng)], 13)
        } catch {
          /* ignore */
        }
      }
    }
  }, [mapReady, boats, filters?.duration, autoFitBounds])

  useEffect(() => {
    rebuildPlacemarks()
  }, [rebuildPlacemarks])

  useEffect(() => {
    if (!mapReady) return
    placemarksRef.current.forEach((pm, id) => {
      const selected = selectedBoatId != null && String(selectedBoatId) === id
      try {
        pm.properties.set('pinClass', `yw-pin${selected ? ' yw-pin--selected' : ''}`)
        pm.options.set('zIndex', selected ? 4000 : 650)
      } catch {
        /* ignore */
      }
    })
  }, [mapReady, selectedBoatId])

  if (!apiKey) {
    return (
      <div className="bs-map bs-map--empty">
        <p>Добавьте VITE_YANDEX_MAPS_API_KEY (JavaScript API) в окружение сборки.</p>
      </div>
    )
  }

  return <div ref={containerRef} className="bs-map" role="application" aria-label="Карта катеров" />
}
