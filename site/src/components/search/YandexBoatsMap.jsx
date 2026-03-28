import { useEffect, useRef, useState, useCallback } from 'react'
import { loadYandexMaps } from '../../lib/yandexMaps'
import { getExactPriceForDuration, radiusKmFromBounds } from '../../boatSearchUtils'

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

export default function YandexBoatsMap({
  apiKey,
  boats,
  center,
  zoom,
  selectedBoatId,
  searchOnMove,
  autoFitBounds,
  onGeoSearch,
  filters,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layoutRef = useRef(null)
  const placemarksRef = useRef(new Map())
  const [mapReady, setMapReady] = useState(false)
  const onGeoSearchRef = useRef(onGeoSearch)
  const searchOnMoveRef = useRef(searchOnMove)

  useEffect(() => {
    onGeoSearchRef.current = onGeoSearch
  }, [onGeoSearch])
  useEffect(() => {
    searchOnMoveRef.current = searchOnMove
  }, [searchOnMove])

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
      const pm = new window.ymaps.Placemark(
        [Number(boat.lat), Number(boat.lng)],
        {
          priceText: markerPriceText(boat, durationFilter),
          pinClass: 'yw-pin',
          instantHtml: instant ? '<span class="yw-pin__zap">⚡</span>' : '',
          hintContent: boat.title || 'Катер',
        },
        {
          iconLayout: LayoutClass,
          iconOffset: [-40, -18],
          iconShape: {
            type: 'Rectangle',
            coordinates: [
              [-42, -36],
              [42, 4],
            ],
          },
        },
      )
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
