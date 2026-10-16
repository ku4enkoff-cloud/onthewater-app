import { useEffect, useRef, useState } from 'react'
import { loadYandexMaps } from '../../lib/yandexMaps'
import { createBoatsClusterLayer } from '../../lib/yandexBoatsClusterLayer'
import { getPhotoUrl, getThumbUrl } from '../../config'
import { firstPhotoThumbUrl, getEffectiveMinDurationMinutes } from '../../boatUtils'
import {
  formatDurationChipLabel,
  formatDurationListLabel,
  getExactPriceForDuration,
  radiusKmFromBounds,
} from '../../boatSearchUtils'
import { getMapMarkerPriceLabel } from '../../lib/mapDisplayMarkers'
import MapBoatPreview from '../MapBoatPreview.jsx'

const PICK_THUMB_PLACEHOLDER =
  'https://placehold.co/144x96/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'

const PREVIEW_WIDTH = 320
const PREVIEW_GAP = 14

function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

/** Яндекс.Карты при 0×0 контейнере остаются серыми — ждём реальный размер (mobile shell). */
function waitForContainerSize(el, timeoutMs = 2500) {
  return new Promise((resolve) => {
    if (!el) {
      resolve(false)
      return
    }
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      resolve(true)
      return
    }
    let done = false
    const finish = (ok) => {
      if (done) return
      done = true
      try {
        ro.disconnect()
      } catch {
        /* ignore */
      }
      clearTimeout(timer)
      resolve(ok)
    }
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) finish(true)
    })
    ro.observe(el)
    const timer = setTimeout(() => finish(el.offsetWidth > 0 && el.offsetHeight > 0), timeoutMs)
  })
}

function buildPickCandidate(boat, durationFilter) {
  const minDur = getEffectiveMinDurationMinutes(boat)
  const activeDuration = durationFilter || minDur
  const price =
    getExactPriceForDuration(boat, activeDuration) ?? (Number(boat.price_per_hour) || 0)
  const n = Math.round(Number(price) || 0)
  return {
    id: boat.id,
    title: boat.title || 'Катер',
    priceLine: `от ${n.toLocaleString('ru-RU')} ₽ / ${formatDurationChipLabel(activeDuration)}`,
    minTimeLine: `минимум ${formatDurationListLabel(minDur)}`,
    photoUrl: firstPhotoThumbUrl(boat, getPhotoUrl, getThumbUrl) || PICK_THUMB_PLACEHOLDER,
  }
}

function priceTextForBoat(boat, durationFilter) {
  if (durationFilter) {
    const p = getExactPriceForDuration(boat, durationFilter) ?? (Number(boat.price_per_hour) || 0)
    const n = Math.round(Number(p) || 0)
    return n > 0 ? `${n.toLocaleString('ru-RU')} ₽` : getMapMarkerPriceLabel(boat)
  }
  return getMapMarkerPriceLabel(boat)
}

function reportMapViewport(map, onViewportChange, onGeoSearch) {
  try {
    const bounds = map.getBounds()
    const c = map.getCenter()
    const radius = radiusKmFromBounds(bounds)
    onViewportChange?.(bounds)
    onGeoSearch?.({ lat: c[0], lng: c[1], radius })
  } catch {
    /* ignore */
  }
}

function previewStyleFromHover(hover) {
  if (!hover) return null
  const w = Math.min(PREVIEW_WIDTH, Math.max(200, (hover.containerW || 400) - 24))
  let left = hover.x + PREVIEW_GAP
  let top = hover.y
  // Если справа не хватает места — слева от метки
  if (left + w > (hover.containerW || 0) - 8) {
    left = hover.x - PREVIEW_GAP - w
  }
  left = Math.max(8, Math.min(left, (hover.containerW || w) - w - 8))
  const maxTop = (hover.containerH || 400) - 24
  top = Math.max(40, Math.min(top, maxTop))
  return { left, top, width: w }
}

export default function YandexBoatsMap({
  apiKey,
  boats,
  center,
  zoom,
  selectedBoatId,
  autoFitBounds,
  onGeoSearch,
  onViewportChange,
  onPlacemarksPick,
  onHoverBoatOpen,
  filters,
  /** false когда режим «Список» — после возврата на карту нужен fitToViewport */
  isActive = true,
}) {
  const containerRef = useRef(null)
  const wrapRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const boatsRef = useRef(boats)
  const filtersRef = useRef(filters)
  const autoFitRef = useRef(autoFitBounds)
  const didAutoFitRef = useRef(false)
  const onGeoSearchRef = useRef(onGeoSearch)
  const onViewportChangeRef = useRef(onViewportChange)
  const onPlacemarksPickRef = useRef(onPlacemarksPick)
  const onHoverBoatOpenRef = useRef(onHoverBoatOpen)
  const suppressActionRef = useRef(0)
  const [mapReady, setMapReady] = useState(false)
  const [hoverPreview, setHoverPreview] = useState(null)

  useEffect(() => {
    onGeoSearchRef.current = onGeoSearch
  }, [onGeoSearch])
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange
  }, [onViewportChange])
  useEffect(() => {
    onPlacemarksPickRef.current = onPlacemarksPick
  }, [onPlacemarksPick])
  useEffect(() => {
    onHoverBoatOpenRef.current = onHoverBoatOpen
  }, [onHoverBoatOpen])
  useEffect(() => {
    boatsRef.current = boats
  }, [boats])
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])
  useEffect(() => {
    autoFitRef.current = autoFitBounds
  }, [autoFitBounds])

  useEffect(() => {
    if (!apiKey || !containerRef.current) return undefined
    let cancelled = false
    let map = null
    let onActionEnd = null
    let resizeObserver = null

    ;(async () => {
      try {
        await waitForContainerSize(containerRef.current)
        if (cancelled || !containerRef.current) return

        const ymaps = await loadYandexMaps(apiKey)
        if (cancelled || !containerRef.current) return

        const lat = Number(center?.lat)
        const lon = Number(center?.lon ?? center?.lng)
        map = new ymaps.Map(containerRef.current, {
          center: [Number.isFinite(lat) ? lat : 55.751244, Number.isFinite(lon) ? lon : 37.618423],
          zoom: zoom || 10,
          controls: ['zoomControl'],
        })
        mapRef.current = map

        // После появления высоты (mobile shell) — пересчитать размер тайлов
        try {
          map.container.fitToViewport()
        } catch {
          /* ignore */
        }
        resizeObserver = new ResizeObserver(() => {
          try {
            mapRef.current?.container?.fitToViewport()
          } catch {
            /* ignore */
          }
        })
        resizeObserver.observe(containerRef.current)

        layerRef.current = createBoatsClusterLayer(ymaps, map, {
          positionRoot: wrapRef.current || containerRef.current,
          getPriceLabel: (boat) => priceTextForBoat(boat, filtersRef.current?.duration || null),
          onSelect: ({ boats: selected }) => {
            suppressActionRef.current = Date.now() + 900
            setHoverPreview(null)
            const durationFilter = filtersRef.current?.duration || null
            const payload = selected
              .slice()
              .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ru'))
              .map((b) => buildPickCandidate(b, durationFilter))
            onPlacemarksPickRef.current?.(payload)
          },
          onHover: (payload) => {
            if (!payload?.boats?.length) {
              setHoverPreview(null)
              return
            }
            setHoverPreview({
              boats: payload.boats
                .slice()
                .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ru')),
              style: previewStyleFromHover(payload),
            })
          },
          selectedBoatId,
        })
        if (wrapRef.current) {
          layerRef.current.setPositionRoot?.(wrapRef.current)
        }

        onActionEnd = debounce(() => {
          if (Date.now() < suppressActionRef.current) {
            try {
              onViewportChangeRef.current?.(map.getBounds())
            } catch {
              /* ignore */
            }
            return
          }
          reportMapViewport(map, onViewportChangeRef.current, onGeoSearchRef.current)
        }, 450)
        map.events.add('actionend', onActionEnd)

        try {
          onViewportChangeRef.current?.(map.getBounds())
        } catch {
          /* ignore */
        }

        // ещё раз после layout
        requestAnimationFrame(() => {
          try {
            mapRef.current?.container?.fitToViewport()
          } catch {
            /* ignore */
          }
        })

        if (!cancelled) setMapReady(true)
      } catch {
        if (!cancelled) setMapReady(false)
      }
    })()

    return () => {
      cancelled = true
      setMapReady(false)
      didAutoFitRef.current = false
      setHoverPreview(null)
      try {
        resizeObserver?.disconnect()
      } catch {
        /* ignore */
      }
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
    }
  }, [apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    try {
      suppressActionRef.current = Date.now() + 400
      const lat = Number(center?.lat)
      const lon = Number(center?.lon ?? center?.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return
      map.setCenter([lat, lon], zoom, { duration: 250 })
      map.container.fitToViewport()
    } catch {
      /* ignore */
    }
  }, [mapReady, center.lat, center.lon, center?.lng, zoom])

  useEffect(() => {
    if (!mapReady || !layerRef.current) return
    layerRef.current.setBoats(boatsRef.current || [])

    if (autoFitRef.current !== false && !didAutoFitRef.current) {
      const list = (boatsRef.current || []).filter((b) => b.lat != null && b.lng != null)
      const map = mapRef.current
      if (map && list.length > 1) {
        didAutoFitRef.current = true
        try {
          suppressActionRef.current = Date.now() + 700
          const ymaps = window.ymaps
          const bounds = ymaps.util.bounds.fromPoints(
            list.map((b) => [Number(b.lat), Number(b.lng)]),
          )
          const moved = map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 56 })
          const notify = () => {
            try {
              onViewportChangeRef.current?.(map.getBounds())
            } catch {
              /* ignore */
            }
          }
          if (moved && typeof moved.then === 'function') moved.then(notify)
          else notify()
        } catch {
          /* ignore */
        }
      } else if (map && list.length === 1) {
        didAutoFitRef.current = true
        try {
          suppressActionRef.current = Date.now() + 700
          map.setCenter([Number(list[0].lat), Number(list[0].lng)], 13)
          onViewportChangeRef.current?.(map.getBounds())
        } catch {
          /* ignore */
        }
      } else if (map) {
        try {
          onViewportChangeRef.current?.(map.getBounds())
        } catch {
          /* ignore */
        }
      }
    } else if (mapRef.current) {
      try {
        onViewportChangeRef.current?.(mapRef.current.getBounds())
      } catch {
        /* ignore */
      }
    }
  }, [mapReady, boats, filters?.duration])

  useEffect(() => {
    if (!mapReady) return
    layerRef.current?.setSelectedBoatId(selectedBoatId)
  }, [mapReady, selectedBoatId])

  useEffect(() => {
    if (!mapReady || !isActive) return
    const map = mapRef.current
    if (!map) return
    const id = requestAnimationFrame(() => {
      try {
        map.container.fitToViewport()
      } catch {
        /* ignore */
      }
    })
    return () => cancelAnimationFrame(id)
  }, [mapReady, isActive])

  if (!apiKey) {
    return (
      <div className="bs-map bs-map--empty">
        <p>Добавьте VITE_YANDEX_MAPS_API_KEY (JavaScript API) в окружение сборки.</p>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="bs-mapShell">
      <div ref={containerRef} className="bs-map" role="application" aria-label="Карта катеров" />
      {hoverPreview?.boats?.length && hoverPreview.style ? (
        <MapBoatPreview
          boats={hoverPreview.boats}
          anchored
          style={hoverPreview.style}
          onMouseEnter={() => layerRef.current?.keepHover?.()}
          onMouseLeave={() => layerRef.current?.releaseHover?.()}
          onOpenBoat={(boat) => {
            setHoverPreview(null)
            layerRef.current?.releaseHover?.()
            if (onHoverBoatOpenRef.current) {
              onHoverBoatOpenRef.current(boat)
              return
            }
            const durationFilter = filtersRef.current?.duration || null
            onPlacemarksPickRef.current?.([buildPickCandidate(boat, durationFilter)])
          }}
        />
      ) : null}
    </div>
  )
}
