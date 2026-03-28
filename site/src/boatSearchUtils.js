/** Логика как в mobile/src/client/screens/SearchResultsScreen.js */

export const CITY_COORDS = {
  Москва: { lat: 55.751244, lon: 37.618423 },
  'Московская область': { lat: 55.5, lon: 38.0 },
  'Санкт-Петербург': { lat: 59.93428, lon: 30.335099 },
  Сочи: { lat: 43.585472, lon: 39.723098 },
  Крым: { lat: 44.952117, lon: 34.102417 },
  Казань: { lat: 55.830955, lon: 49.06608 },
}

export const DEFAULT_MAP_CENTER = { lat: 55.751244, lon: 37.618423 }

export const LOCATION_OPTIONS = [
  { value: 'Москва', label: 'Москва' },
  { value: 'Санкт-Петербург', label: 'Санкт-Петербург' },
  { value: 'Сочи', label: 'Сочи' },
  { value: 'Казань', label: 'Казань' },
  { value: 'Московская область', label: 'Московская область' },
  { value: '__all', label: 'Все регионы' },
]

export function isRegion(name) {
  return (
    name &&
    (String(name).includes('область') || String(name).trim().toLowerCase() === 'московская область')
  )
}

export function formatCardLocationCaps(item) {
  const city = String(item?.location_city || item?.locationCity || '').trim()
  const region = String(item?.location_region || item?.locationRegion || '').trim()
  const country = String(item?.location_country || item?.locationCountry || '').trim()
  const address = String(item?.location_address || item?.locationAddress || '').trim()
  if (city && region && city.toLowerCase() !== region.toLowerCase()) {
    return `${city}, ${region}`.toUpperCase()
  }
  if (city) return city.toUpperCase()
  if (region) return region.toUpperCase()
  if (country) return country.toUpperCase()
  if (address) return address.toUpperCase()
  return '—'
}

export function normalizeBoatTiers(boat) {
  let tiers = boat?.price_tiers
  if (typeof tiers === 'string') {
    try {
      tiers = JSON.parse(tiers)
    } catch {
      tiers = []
    }
  }
  if (!Array.isArray(tiers)) tiers = []
  return tiers
    .map((t) => ({
      duration: Number(t?.duration) || 0,
      price: Number(t?.price) || 0,
    }))
    .filter((t) => t.duration > 0 && t.price > 0)
}

export function getExactPriceForDuration(boat, durationMin) {
  const d = Number(durationMin) || 0
  if (d <= 0) return null
  const minDuration = Number(boat?.schedule_min_duration) || 60
  if (d === minDuration) {
    const base = Number(boat?.price_per_hour) || 0
    return base > 0 ? base : null
  }
  const tier = normalizeBoatTiers(boat).find((t) => t.duration === d)
  return tier?.price || null
}

export function formatDurationChipLabel(mins) {
  const m = Number(mins) || 60
  if (m === 60) return 'час'
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (mm === 0) return h === 1 ? 'час' : `${h} ч`
  return `${h} ч ${mm} мин`
}

export function getBoatAmenities(boat) {
  const raw = boat?.amenities
  if (Array.isArray(raw)) return raw.map((v) => String(v || '').trim()).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map((v) => String(v || '').trim()).filter(Boolean)
    } catch {
      /* ignore */
    }
  }
  return []
}

function formatDuration(mins) {
  const m = Number(mins) || 0
  if (m <= 0) return '—'
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (mm === 0) return h === 1 ? '1 ч' : `${h} ч`
  return `${h} ч ${mm} мин`
}

export function getBookingPeriodLabel(boat) {
  const minDur = Number(boat?.schedule_min_duration) || 0
  const durations = [
    ...new Set(
      [minDur, ...normalizeBoatTiers(boat).map((t) => t.duration)].filter((d) => d > 0),
    ),
  ].sort((a, b) => a - b)
  if (durations.length === 0) return '—'
  if (durations.length === 1) return formatDuration(durations[0])
  return `${formatDuration(durations[0])} – ${formatDuration(durations[durations.length - 1])}`
}

export const DEFAULT_FILTERS = {
  priceLow: 0,
  priceHigh: 50000,
  passengers: 1,
  duration: null,
  captain: null,
  waterSports: [],
  boatTypeId: null,
  boatTypeName: null,
}

export function computePriceRange(allBoats) {
  const prices = allBoats.map((b) => Number(b.price_per_hour) || 0).filter((p) => p > 0)
  if (prices.length === 0) return { min: 0, max: 50000 }
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return { min, max: max > min ? max : min + 1000 }
}

export function computeMaxPassengers(allBoats) {
  const caps = allBoats.map((b) => Number(b.capacity) || 0).filter((c) => c > 0)
  if (caps.length === 0) return 20
  return Math.max(1, Math.max(...caps))
}

export function computeDurationOptions(allBoats) {
  const fallback = [30, 60, 120, 180, 240, 360, 480]
  if (allBoats.length === 0) return fallback
  const offeredSet = new Set()
  for (const b of allBoats) {
    const sm = Number(b.schedule_min_duration) || 60
    offeredSet.add(sm)
    let tiers = b.price_tiers
    if (typeof tiers === 'string') {
      try {
        tiers = JSON.parse(tiers)
      } catch {
        tiers = []
      }
    }
    if (Array.isArray(tiers)) {
      for (const t of tiers) {
        const d = Number(t.duration) || 0
        if (d > 0) offeredSet.add(d)
      }
    }
  }
  const offered = [...offeredSet].sort((a, b) => a - b)
  return offered.length > 0 ? offered : fallback
}

export function computeBoatTypesFromList(allBoats) {
  const seenByName = new Map()
  for (const b of allBoats) {
    const rawName = b.type_name || 'Без типа'
    const key = rawName.trim().toLowerCase()
    if (!key) continue
    if (!seenByName.has(key)) {
      const typeId = b.type_id ?? rawName
      const id = `${typeId}|${rawName}`
      seenByName.set(key, { id, typeId, name: rawName })
    }
  }
  return [...seenByName.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export function filterBoatsList(allBoats, filters, priceRange) {
  let list = [...allBoats]
  const { priceLow, priceHigh, passengers, captain } = filters
  if (priceLow > priceRange.min || priceHigh < priceRange.max) {
    list = list.filter((b) => {
      const p = filters.duration
        ? getExactPriceForDuration(b, filters.duration) ?? 0
        : Number(b.price_per_hour) || 0
      return p >= priceLow && p <= priceHigh
    })
  }
  if (passengers > 1) {
    list = list.filter((b) => (Number(b.capacity) || 0) >= passengers)
  }
  if (filters.duration) {
    list = list.filter((b) => getExactPriceForDuration(b, filters.duration) != null)
  }
  if (Array.isArray(filters.waterSports) && filters.waterSports.length > 0) {
    const selected = filters.waterSports.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
    list = list.filter((b) => {
      const am = getBoatAmenities(b).map((s) => s.toLowerCase())
      return selected.some((s) => am.includes(s))
    })
  }
  if (captain === 'С капитаном') {
    list = list.filter((b) => b.captain_included)
  } else if (captain === 'Без капитана') {
    list = list.filter((b) => !b.captain_included)
  }
  if (filters.boatTypeId || filters.boatTypeName) {
    const byName = (filters.boatTypeName || '').trim()
    const typeIdRaw = String(filters.boatTypeId || '')
    const typeIdPart = typeIdRaw.includes('|') ? typeIdRaw.split('|')[0] : typeIdRaw
    list = list.filter((b) => {
      if (byName) return (b.type_name || '').toLowerCase() === byName.toLowerCase()
      if (typeIdPart) return String(b.type_id) === typeIdPart
      return false
    })
  }
  return list
}

export function countActiveFilters(filters, priceRange) {
  let n = 0
  if (filters.priceLow > priceRange.min || filters.priceHigh < priceRange.max) n++
  if (filters.passengers !== 1) n++
  if (filters.duration) n++
  if (filters.boatTypeId || filters.boatTypeName) n++
  if (filters.captain) n++
  return n
}

export function pluralizeReviews(n) {
  const x = Number(n) || 0
  if (x === 1) return 'отзыв'
  if (x >= 2 && x <= 4) return 'отзыва'
  return 'отзывов'
}

export function pluralizeBookings(n) {
  const x = Number(n) || 0
  if (x === 1) return 'бронирование'
  if (x >= 2 && x <= 4) return 'бронирования'
  return 'бронирований'
}

export function formatPriceShort(v) {
  const n = Number(v) || 0
  if (n >= 1000) return `${Math.round(n / 1000).toLocaleString('ru-RU')} 000`
  return String(n)
}

/** Примерный радиус (км) по границам видимой области Яндекс.Карты */
export function radiusKmFromBounds(bounds) {
  if (!bounds || bounds.length !== 2) return 50
  const [[swLat, swLng], [neLat, neLng]] = bounds
  const latKm = Math.abs(neLat - swLat) * 111 * 0.5
  const midLat = (neLat + swLat) / 2
  const lngKm = Math.abs(neLng - swLng) * 111 * Math.cos((midLat * Math.PI) / 180) * 0.5
  return Math.min(200, Math.max(8, Math.max(latKm, lngKm) * 1.2))
}
