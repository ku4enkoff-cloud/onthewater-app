/**
 * Слой катеров на Яндекс.Картах (сайт).
 *
 * 1) Своя группировка по zoom (buildMapDisplayMarkers) — без ClusterPlacemark.
 * 2) Каждая группа — Placemark + pricePinIcon («N от цена»).
 * 3) Hover → красная метка + onHover для React-превью справа от пина.
 */

import {
  boatsToMapMarkers,
  buildMapDisplayMarkers,
  formatClusterMarkerLabel,
  getMapMarkerPriceLabel,
} from './mapDisplayMarkers'
import { DOT_ICON, pricePinIcon } from './mapMarkerIcons'

const NEARBY_METERS = 90
const MAX_ZOOM = 18
const ENTER_PRICE_ZOOM = 13

function fingerprintBoats(boats, getPriceLabel) {
  return (boats || [])
    .map((b) => {
      const id = b?.id != null ? String(b.id) : ''
      const lat = Number(b?.lat)
      const lng = Number(b?.lng)
      const price = getPriceLabel(b) || ''
      return `${id}:${lat.toFixed(5)},${lng.toFixed(5)}:${price}`
    })
    .sort()
    .join('|')
}

function imageIconOptions(icon, zIndex = 600) {
  const [w, h] = icon.size
  const [ox, oy] = icon.offset
  return {
    iconLayout: 'default#image',
    iconImageHref: icon.href,
    iconImageSize: icon.size,
    iconImageOffset: icon.offset,
    iconShape: {
      type: 'Rectangle',
      coordinates: [
        [ox, oy],
        [ox + w, oy + h],
      ],
    },
    hasBalloon: false,
    openBalloonOnClick: false,
    hideIconOnBalloonOpen: false,
    cursor: 'pointer',
    interactivityModel: 'default#opaque',
    zIndex,
    zIndexHover: zIndex + 50,
  }
}

function groupIcon(boats, getPriceLabel, { selected = false, hovered = false } = {}) {
  if (!boats?.length) return imageIconOptions(DOT_ICON, 600)
  const label = formatClusterMarkerLabel(boats, getPriceLabel)
  const z = hovered ? 820 : selected ? 720 : boats.length > 1 ? 650 : 620
  return imageIconOptions(pricePinIcon(label, { selected, hovered }), z)
}

function readDomClientPoint(e) {
  try {
    const dom = typeof e?.get === 'function' ? e.get('domEvent') : null
    if (!dom) return null
    if (typeof dom.get === 'function') {
      const x = dom.get('clientX')
      const y = dom.get('clientY')
      if (Number.isFinite(x) && Number.isFinite(y)) return { clientX: x, clientY: y }
    }
    const orig = dom.getOriginalEvent?.() || dom.originalEvent || dom
    const x = Number(orig?.clientX)
    const y = Number(orig?.clientY)
    if (Number.isFinite(x) && Number.isFinite(y)) return { clientX: x, clientY: y }
  } catch {
    /* ignore */
  }
  return null
}

/** Пиксели относительно контейнера превью (shell / map pane) */
function offsetInContainer(containerEl, clientX, clientY, map, lat, lon) {
  if (!containerEl) return null
  const rect = containerEl.getBoundingClientRect()
  if (!(rect.width > 0) || !(rect.height > 0)) return null

  let x = null
  let y = null

  if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
    x = clientX - rect.left
    y = clientY - rect.top
  } else if (map) {
    try {
      const zoom = map.getZoom()
      const globalPixels = map.converter.coordinatesToGlobalPixels([lat, lon], zoom)
      const pagePixels = map.converter.globalToPage(globalPixels)
      const px = Array.isArray(pagePixels) ? pagePixels[0] : pagePixels?.x
      const py = Array.isArray(pagePixels) ? pagePixels[1] : pagePixels?.y
      if (Number.isFinite(px) && Number.isFinite(py)) {
        x = px - rect.left
        y = py - rect.top
      }
    } catch {
      /* ignore */
    }
  }

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return {
    x,
    y,
    containerW: rect.width,
    containerH: rect.height,
  }
}

/**
 * @param {object} ymaps
 * @param {object} map
 * @param {{
 *   onSelect?: (payload: { boats: object[], lat: number, lon: number, isCluster: boolean }) => void,
 *   onHover?: (payload: null | {
 *     boats: object[],
 *     lat: number,
 *     lon: number,
 *     x: number,
 *     y: number,
 *     containerW: number,
 *     containerH: number,
 *   }) => void,
 *   getPriceLabel?: (boat: object) => string,
 *   selectedBoatId?: string|number|null,
 *   positionRoot?: HTMLElement|null,
 * }} [options]
 */
export function createBoatsClusterLayer(ymaps, map, options = {}) {
  const onSelectRef = { current: options.onSelect }
  const onHoverRef = { current: options.onHover }
  const getPriceLabel =
    options.getPriceLabel || ((boat) => getMapMarkerPriceLabel(boat) || '')
  let selectedId =
    options.selectedBoatId != null ? String(options.selectedBoatId) : null

  /** @type {object[]} */
  let allBoats = []
  /** @type {Map<object, { boats: object[], lat: number, lon: number }>} */
  let groupByPlacemark = new Map()
  let lastRenderKey = ''
  let lastZoomBucket = null
  /** @type {object|null} */
  let hoveredPm = null
  let leaveTimer = null

  const collection = new ymaps.GeoObjectCollection()
  /** Контейнер для absolute-превью; задаётся снаружи (shell), иначе pane карты */
  let positionRoot =
    options.positionRoot ||
    (typeof map.container?.getElement === 'function' ? map.container.getElement() : null)

  const emitSelect = (boats, lat, lon, isCluster) => {
    const list = (boats || []).filter(Boolean)
    if (!list.length) return
    onSelectRef.current?.({ boats: list, lat, lon, isCluster })
  }

  const clearLeaveTimer = () => {
    if (leaveTimer != null) {
      window.clearTimeout(leaveTimer)
      leaveTimer = null
    }
  }

  const paintPm = (pm, group, { hovered = false } = {}) => {
    if (!pm || !group) return
    const selected =
      selectedId != null && group.boats.some((b) => String(b.id) === selectedId)
    pm.options.set(groupIcon(group.boats, getPriceLabel, { selected, hovered }))
  }

  const emitHover = (group, pointer) => {
    if (!group?.boats?.length) {
      onHoverRef.current?.(null)
      return
    }
    const root =
      positionRoot ||
      (typeof map.container?.getElement === 'function' ? map.container.getElement() : null)
    const pos = offsetInContainer(
      root,
      pointer?.clientX,
      pointer?.clientY,
      map,
      group.lat,
      group.lon,
    )
    if (!pos) {
      onHoverRef.current?.(null)
      return
    }
    onHoverRef.current?.({
      boats: group.boats,
      lat: group.lat,
      lon: group.lon,
      x: pos.x,
      y: pos.y,
      containerW: pos.containerW,
      containerH: pos.containerH,
    })
  }

  const setHoveredPm = (pm, pointer) => {
    clearLeaveTimer()
    if (hoveredPm && hoveredPm !== pm) {
      const prev = groupByPlacemark.get(hoveredPm)
      paintPm(hoveredPm, prev, { hovered: false })
    }
    hoveredPm = pm
    if (!pm) {
      emitHover(null)
      return
    }
    const group = groupByPlacemark.get(pm)
    paintPm(pm, group, { hovered: true })
    emitHover(group, pointer)
  }

  const scheduleClearHover = () => {
    clearLeaveTimer()
    leaveTimer = window.setTimeout(() => {
      leaveTimer = null
      setHoveredPm(null)
    }, 180)
  }

  const zoomToPoint = (lat, lon, nextZoom) => {
    try {
      const cur = map.getZoom()
      const z = Math.min(MAX_ZOOM, Math.max(cur, Number(nextZoom) || cur))
      map.setCenter([lat, lon], z, { duration: 280 })
    } catch {
      /* ignore */
    }
  }

  const selectGroup = (group) => {
    if (!group?.boats?.length) return
    const { boats, lat, lon } = group
    const zoom = map.getZoom()

    if (boats.length === 1) {
      zoomToPoint(lat, lon, 14)
      emitSelect(boats, lat, lon, false)
      return
    }

    if (zoom < ENTER_PRICE_ZOOM) {
      const beforeZoom = zoom
      try {
        const points = boats
          .map((b) => [Number(b.lat), Number(b.lng)])
          .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
        if (points.length) {
          map.setBounds(ymaps.util.bounds.fromPoints(points), {
            checkZoomRange: true,
            zoomMargin: [56, 56, 56, 56],
            duration: 280,
          })
          window.setTimeout(() => {
            try {
              if (map.getZoom() <= beforeZoom + 0.5) {
                emitSelect(boats, lat, lon, true)
              }
            } catch {
              emitSelect(boats, lat, lon, true)
            }
          }, 320)
          return
        }
      } catch {
        /* fall through */
      }
    }

    emitSelect(boats, lat, lon, true)
  }

  const rebuildPlacemarks = () => {
    const zoom = Number(map.getZoom()) || 10
    const zoomBucket = Math.round(zoom * 2) / 2
    const boatsFp = fingerprintBoats(allBoats, getPriceLabel)
    const renderKey = `${boatsFp}#z:${zoomBucket}#sel:${selectedId || ''}`
    if (renderKey === lastRenderKey) return
    lastRenderKey = renderKey
    lastZoomBucket = zoomBucket

    clearLeaveTimer()
    hoveredPm = null
    emitHover(null)

    const markers = boatsToMapMarkers(allBoats)
    const groups = buildMapDisplayMarkers(markers, {
      priceMode: zoom >= ENTER_PRICE_ZOOM,
      zoom,
      nearbyMeters: NEARBY_METERS,
      enterPriceZoom: ENTER_PRICE_ZOOM,
    })

    try {
      collection.removeAll()
    } catch {
      /* ignore */
    }
    groupByPlacemark = new Map()

    for (const group of groups) {
      const boats = group.boats || []
      if (!boats.length) continue
      const lat = Number(group.point.lat)
      const lon = Number(group.point.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

      const selected =
        selectedId != null && boats.some((b) => String(b.id) === selectedId)

      const pier = { boats, lat, lon }
      const pm = new ymaps.Placemark(
        [lat, lon],
        {},
        groupIcon(boats, getPriceLabel, { selected, hovered: false }),
      )

      pm.events.add('mouseenter', (e) => setHoveredPm(pm, readDomClientPoint(e)))
      pm.events.add('mouseleave', () => {
        if (hoveredPm === pm) scheduleClearHover()
      })
      pm.events.add('click', (e) => {
        try {
          e.stopPropagation?.()
        } catch {
          /* ignore */
        }
        selectGroup(pier)
      })

      groupByPlacemark.set(pm, pier)
      collection.add(pm)
    }
  }

  const setBoats = (boats) => {
    allBoats = boats || []
    lastRenderKey = ''
    rebuildPlacemarks()
  }

  const setSelectedBoatId = (boatId) => {
    const next = boatId != null ? String(boatId) : null
    if (next === selectedId) return
    selectedId = next
    lastRenderKey = ''
    rebuildPlacemarks()
  }

  const setOnSelect = (fn) => {
    onSelectRef.current = fn
  }

  const setOnHover = (fn) => {
    onHoverRef.current = fn
  }

  const setPositionRoot = (el) => {
    positionRoot = el || null
  }

  /** Держим превью открытым при наведении на карточку */
  const keepHover = () => {
    clearLeaveTimer()
  }

  const releaseHover = () => {
    scheduleClearHover()
  }

  const onBoundsChange = () => {
    const zoom = Number(map.getZoom()) || 10
    const zoomBucket = Math.round(zoom * 2) / 2
    if (zoomBucket === lastZoomBucket && lastRenderKey) {
      if (hoveredPm) {
        const group = groupByPlacemark.get(hoveredPm)
        if (group) emitHover(group)
      }
      return
    }
    rebuildPlacemarks()
  }

  map.geoObjects.add(collection)
  map.events.add('boundschange', onBoundsChange)

  return {
    setBoats,
    setSelectedBoatId,
    setOnSelect,
    setOnHover,
    setPositionRoot,
    keepHover,
    releaseHover,
    getClusterer: () => collection,
    destroy() {
      clearLeaveTimer()
      try {
        map.events.remove('boundschange', onBoundsChange)
      } catch {
        /* ignore */
      }
      try {
        collection.removeAll()
        map.geoObjects.remove(collection)
      } catch {
        /* ignore */
      }
      groupByPlacemark = new Map()
      allBoats = []
      lastRenderKey = ''
      hoveredPm = null
    },
  }
}
