/** Логика как в mobile/src/client/screens/SearchResultsScreen.js */

import { getMinDurationPrice } from './boatUtils.js'

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

/** localStorage: последний город по геолокации (значение из LOCATION_OPTIONS). */
export const NEAREST_CITY_STORAGE_KEY = 'boatrent_nearest_city'

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Отсечь явный мусор (Null Island, нечисла) и точки вне разумной области РФ для автогорода. */
export function isPlausibleRuGeo(lat, lng) {
  const la = Number(lat)
  const lo = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false
  if (Math.abs(la) < 0.05 && Math.abs(lo) < 0.05) return false
  if (la < 41 || la > 72 || lo < 19 || lo > 180) return false
  return true
}

/**
 * Ближайший к точке город из списка направлений (есть координаты в CITY_COORDS).
 * Сначала проверяем крупные агломерации по bbox — иначе грубые/IP-координаты могли
 * давать неверный «ближайший» центр (например Сочи вместо Москвы).
 */
export function getNearestCityKey(lat, lng) {
  const la = Number(lat)
  const lo = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return 'Москва'

  if (la >= 55.4 && la <= 56.45 && lo >= 36.7 && lo <= 39.2) return 'Москва'
  if (la >= 59.5 && la <= 60.55 && lo >= 28.8 && lo <= 31.45) return 'Санкт-Петербург'

  const keys = LOCATION_OPTIONS.map((o) => o.value).filter((v) => v !== '__all' && CITY_COORDS[v])
  if (keys.length === 0) return 'Москва'
  let best = keys[0]
  let bestD = Infinity
  for (const k of keys) {
    const c = CITY_COORDS[k]
    const d = haversineKm(la, lo, c.lat, c.lon)
    if (d < bestD) {
      bestD = d
      best = k
    }
  }
  return best
}

export function readNearestCityFromStorage() {
  try {
    const s = localStorage.getItem(NEAREST_CITY_STORAGE_KEY)?.trim()
    if (s && LOCATION_OPTIONS.some((o) => o.value === s)) return s
  } catch {
    /* ignore */
  }
  return null
}

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
    const p = getMinDurationPrice(boat)
    return p > 0 ? p : null
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

/** Подпись длительности в чипах и модалке (как в mobile SearchResultsScreen). */
export function formatDurationListLabel(mins) {
  const m = Number(mins) || 0
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (mm > 0) return `${h} ч ${mm} мин`
  if (h === 1) return '1 час'
  if (h >= 2 && h <= 4) return `${h} часа`
  return `${h} часов`
}

export function formatGuestsQuickLabel(n) {
  const x = Math.abs(Number(n)) || 1
  if (x === 1) return '1 гость'
  if (x >= 2 && x <= 4) return `${x} гостя`
  return `${x} гостей`
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

/** Ключ дня недели как в mobile BoatDetailScreen (getDay: 0 = вс). */
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function toLocalDateKeyFromDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** YYYY-MM-DD → локальная дата (без UTC-сдвига). */
function dateFromISOKey(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

/** Сколько дат в schedule_work_days.dates нужно, чтобы считать список «развёрнутым» графиком по дням недели (как в owner EditBoatScreen), а не ручным набором единичных дней. */
const MIN_DATES_FOR_WEEKLY_SCHEDULE_INFERENCE = 14

/**
 * Доступен ли катер в выбранный календарный день по schedule_work_days
 * (как в mobile: объект по дням недели или { dates: ['YYYY-MM-DD', ...] }).
 * Если расписание не задано — считаем день рабочим (дефолт «все дни»).
 */
export function isBoatWorkingOnDate(boat, dateISO) {
  const d = dateFromISOKey(dateISO)
  if (!d) return true

  let wd = boat?.schedule_work_days
  if (typeof wd === 'string') {
    try {
      wd = JSON.parse(wd)
    } catch {
      wd = null
    }
  }
  if (wd == null || typeof wd !== 'object') return true

  if (Array.isArray(wd.dates)) {
    const dates = wd.dates.filter((x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.trim()))
    if (dates.length === 0) {
      /* пустой dates — как отсутствие явного календаря */
    } else {
      const key = toLocalDateKeyFromDate(d)
      if (dates.includes(key)) return true
      /*
       * Владелец в приложении часто сохраняет не { mon, tue, … }, а список конкретных дней на ~180 дней вперёд.
       * Тогда даты дальше окна исчезают из списка, хотя по смыслу график недельный — продлеваем по дням недели.
       */
      if (dates.length >= MIN_DATES_FOR_WEEKLY_SCHEDULE_INFERENCE) {
        const allowed = new Set()
        for (const ds of dates) {
          const dt = dateFromISOKey(ds.trim())
          if (dt) allowed.add(WEEKDAY_KEYS[dt.getDay()])
        }
        if (allowed.size > 0) return allowed.has(WEEKDAY_KEYS[d.getDay()])
      }
      return false
    }
  }

  const defaults = {
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: true,
    sun: true,
  }
  const workDays = { ...defaults, ...wd }
  const key = WEEKDAY_KEYS[d.getDay()]
  return workDays[key] === true
}

export function filterBoatsByScheduleOnDate(boats, dateISO) {
  if (!Array.isArray(boats)) return []
  if (!dateISO) return boats
  return boats.filter((b) => isBoatWorkingOnDate(b, dateISO))
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
  if (Array.isArray(filters.waterSports) && filters.waterSports.length > 0) n++
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
