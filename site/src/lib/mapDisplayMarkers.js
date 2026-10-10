/**
 * Подготовка маркеров для YaMap: JS-кластеризация (как в mobile mapDisplayMarkers.js).
 */

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

function sameCoordGroup(boatA, boatB, decimals = 4) {
  const latA = Number(boatA?.lat)
  const lonA = Number(boatA?.lng)
  const latB = Number(boatB?.lat)
  const lonB = Number(boatB?.lng)
  if (!Number.isFinite(latA) || !Number.isFinite(lonA) || !Number.isFinite(latB) || !Number.isFinite(lonB)) {
    return false
  }
  return (
    latA.toFixed(decimals) === latB.toFixed(decimals) &&
    lonA.toFixed(decimals) === lonB.toFixed(decimals)
  )
}

export function groupedMarkerKey(boats, fallback = 'x') {
  if (!Array.isArray(boats) || !boats.length) return fallback
  const ids = boats
    .map((b) => (b?.id != null ? String(b.id) : ''))
    .filter(Boolean)
    .sort()
  return ids.length ? ids.join('_') : fallback
}

/** Радиус группировки (м) зависит от zoom: дальше — крупнее кластеры. */
export function clusterRadiusForZoom(zoom, { enterPriceZoom = 13, nearbyMeters = 100 } = {}) {
  const z = Number.isFinite(Number(zoom)) ? Number(zoom) : 10
  if (z >= enterPriceZoom) return nearbyMeters
  return Math.max(120, 4000 / 2 ** Math.max(0, z - 8))
}

/** Близкие точки — одна метка с массивом boats. */
export function groupMarkersByProximity(markers, radiusMeters) {
  if (!Array.isArray(markers) || markers.length < 2) {
    return (markers || []).map((m) => ({
      point: m.point,
      boats: [m.data],
      key: groupedMarkerKey([m.data], `m-${m.data?.id ?? 'x'}`),
    }))
  }

  const groups = []
  const used = new Set()

  for (let i = 0; i < markers.length; i++) {
    if (used.has(i)) continue
    const base = markers[i]
    const members = [base]
    used.add(i)

    for (let j = i + 1; j < markers.length; j++) {
      if (used.has(j)) continue
      const other = markers[j]
      const blat = Number(base.point?.lat)
      const blon = Number(base.point?.lon)
      const olat = Number(other.point?.lat)
      const olon = Number(other.point?.lon)
      if (!Number.isFinite(blat) || !Number.isFinite(blon) || !Number.isFinite(olat) || !Number.isFinite(olon)) {
        continue
      }
      const near =
        distanceMeters(blat, blon, olat, olon) <= radiusMeters || sameCoordGroup(base.data, other.data)
      if (near) {
        members.push(other)
        used.add(j)
      }
    }

    const boats = members.map((m) => m.data).filter(Boolean)
    const latSum = members.reduce((s, m) => s + Number(m.point.lat), 0)
    const lonSum = members.reduce((s, m) => s + Number(m.point.lon), 0)
    groups.push({
      point: { lat: latSum / members.length, lon: lonSum / members.length },
      boats,
      key: groupedMarkerKey(boats, `g-${i}`),
    })
  }

  return groups
}

/**
 * @param {Array<{point: {lat, lon}, data: object}>} markers
 * @param {{ priceMode: boolean, zoom: number, limit?: number, enterPriceZoom?: number, nearbyMeters?: number }} opts
 */
export function buildMapDisplayMarkers(markers, opts = {}) {
  const {
    priceMode = false,
    zoom = 10,
    limit = 0,
    enterPriceZoom = 13,
    nearbyMeters = 100,
  } = opts

  if (!Array.isArray(markers) || !markers.length) return []

  const radius = priceMode
    ? nearbyMeters
    : clusterRadiusForZoom(zoom, { enterPriceZoom, nearbyMeters })

  let items = groupMarkersByProximity(markers, radius)
  if (limit > 0 && priceMode && items.length > limit) {
    items = items.slice(0, limit)
  }
  return items
}

export function boatsToMapMarkers(boats) {
  const seenIds = new Set()
  const markers = []
  for (const b of boats || []) {
    const lat = Number(b.lat)
    const lon = Number(b.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const id = b.id != null ? String(b.id) : null
    if (id) {
      if (seenIds.has(id)) continue
      seenIds.add(id)
    }
    markers.push({ point: { lat, lon }, data: b })
  }
  return markers
}

/** Минимальная цена катера (₽), 0 если неизвестна. */
export function getBoatMinPriceValue(boat) {
  if (!boat) return 0
  const prices = []
  const base = Number(boat.price_per_hour) || 0
  if (base > 0) prices.push(base)
  const raw = boat?.price_tiers
  let tiers = raw
  if (typeof raw === 'string') {
    try {
      tiers = JSON.parse(raw)
    } catch {
      tiers = []
    }
  }
  if (Array.isArray(tiers)) {
    for (const t of tiers) {
      const price = Number(t?.price) || 0
      if (price > 0) prices.push(price)
    }
  }
  if (!prices.length) return 0
  return Math.min(...prices)
}

/** Как getMapMarkerPriceLabel в mobile SearchResultsScreen. */
export function getMapMarkerPriceLabel(boat) {
  const min = getBoatMinPriceValue(boat)
  if (!(min > 0)) return ''
  return `${min.toLocaleString('ru-RU')} ₽`
}

/** Компактная цена для метки: «4 000 ₽» / «14,9 млн» */
export function formatCompactMapPrice(value) {
  const n = Number(value)
  if (!(n > 0)) return ''
  if (n >= 1_000_000) {
    const mln = n / 1_000_000
    const s =
      mln >= 100
        ? Math.round(mln).toLocaleString('ru-RU')
        : mln.toFixed(1).replace(/\.0$/, '').replace('.', ',')
    return `${s} млн`
  }
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`
}

/** Подпись кластера: «2 от 4 000 ₽» / «2 от 14,9 млн» */
export function formatClusterMarkerLabel(boats, getPriceLabel) {
  const list = Array.isArray(boats) ? boats.filter(Boolean) : []
  const n = list.length
  if (n === 0) return '•'
  if (n === 1) {
    const one = typeof getPriceLabel === 'function' ? getPriceLabel(list[0]) : getMapMarkerPriceLabel(list[0])
    return one || '•'
  }
  let min = Infinity
  for (const b of list) {
    const v = getBoatMinPriceValue(b)
    if (v > 0 && v < min) min = v
  }
  if (!Number.isFinite(min) || min === Infinity) return String(n)
  return `${n} от ${formatCompactMapPrice(min)}`
}

export const MAP_ZOOM_ENTER_PRICE_MODE = 13
export const MAP_ZOOM_EXIT_PRICE_MODE = 11
export const MAP_NEARBY_MARKER_METERS = 100
export const MAP_PRICE_MARKER_LIMIT = 48
