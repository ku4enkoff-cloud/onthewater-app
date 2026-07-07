/** Совпадает с mobile/src/client/screens/SearchScreen.js (карточка катера). */

export function formatCardLocation(item) {
  const city = String(item?.location_city || item?.locationCity || '').trim()
  const region = String(item?.location_region || item?.locationRegion || '').trim()
  const country = String(item?.location_country || item?.locationCountry || '').trim()
  const address = String(item?.location_address || item?.locationAddress || '').trim()
  if (city && region && city.toLowerCase() !== region.toLowerCase()) return `${city}, ${region}`
  if (city) return city
  if (region) return region
  if (country) return country
  if (address) return address
  return '—'
}

export function formatPriceRu(n) {
  return n != null ? Number(n).toLocaleString('ru-RU') : '0'
}

/** Сырые строки price_tiers из API (как в mobile). */
export function parsePriceTierEntries(boat) {
  let tiers = boat?.price_tiers
  if (typeof tiers === 'string') {
    try {
      tiers = JSON.parse(tiers)
    } catch {
      tiers = []
    }
  }
  if (!Array.isArray(tiers)) return []
  return tiers
    .map((t) => ({
      duration: Number(t?.duration) || 0,
      price: Number(t?.price) || 0,
    }))
    .filter((t) => t.duration > 0 && t.price > 0)
}

/**
 * Минимальная длительность брони в минутах: schedule_min_duration, иначе минимум из price_tiers, иначе 60.
 * Учитывает пустую/битую строку в БД (Number('') === 0).
 */
export function getEffectiveMinDurationMinutes(boat) {
  if (!boat) return 60
  const raw = boat.schedule_min_duration
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n > 0) return Math.round(n)
  const fromTiers = parsePriceTierEntries(boat).map((t) => t.duration)
  if (fromTiers.length > 0) return Math.min(...fromTiers)
  return 60
}

/**
 * Варианты длительности + цена для UI брони (как mobile BoatDetailScreen: базовый слот + price_tiers).
 */
export function buildBookingDurationTiers(boat) {
  const minDuration = getEffectiveMinDurationMinutes(boat)
  const minPrice = getMinDurationPrice(boat)
  const baseHour = Number(boat?.price_per_hour) || 0
  let entries = parsePriceTierEntries(boat).sort((a, b) => a.duration - b.duration)
  const hasMinOnServer = entries.some((t) => t.duration === minDuration)
  if (entries.length === 0) {
    const p = minPrice > 0 ? minPrice : baseHour
    return p > 0 ? [{ duration: minDuration, price: p }] : []
  }
  if (hasMinOnServer) return entries
  const headPrice = minPrice > 0 ? minPrice : baseHour
  return [{ duration: minDuration, price: headPrice }, ...entries].sort((a, b) => a.duration - b.duration)
}

export function getMinDurationPrice(boat) {
  const minDuration = getEffectiveMinDurationMinutes(boat)
  const base = Number(boat?.price_per_hour) || 0
  if (minDuration === 60) return base
  const match = parsePriceTierEntries(boat).find((t) => t.duration === minDuration)
  const tierPrice = Number(match?.price) || 0
  return tierPrice > 0 ? tierPrice : base
}

export function minDurationLabel(item) {
  const raw = item?.schedule_min_duration
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  const mins = Number.isFinite(n) && n > 0 ? Math.round(n) : 60
  if (mins < 60) return `${mins} мин`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

/** Подпись минимума для карточки катера (учёт price_tiers, если в БД нет schedule_min_duration). */
export function minDurationLabelForBoat(boat) {
  return minDurationLabel({ schedule_min_duration: getEffectiveMinDurationMinutes(boat) })
}

/** «1 гость» / «2 гостя» / «5 гостей» — как в мобильном приложении. */
export function formatGuestLabelRu(n) {
  const v = Math.max(1, Math.floor(Number(n)) || 1)
  const x = v % 100
  if (x >= 11 && x <= 14) return `${v} гостей`
  const d = v % 10
  if (d === 1) return `${v} гость`
  if (d >= 2 && d <= 4) return `${v} гостя`
  return `${v} гостей`
}

export function parsePhotos(boat) {
  let p = boat?.photos
  if (typeof p === 'string') {
    try {
      p = JSON.parse(p)
    } catch {
      p = []
    }
  }
  if (!Array.isArray(p)) return []
  return p
}

export function firstPhotoUrl(boat, getPhotoUrlFn) {
  const photos = parsePhotos(boat)
  const first = photos[0]
  if (first == null) return null
  if (typeof first === 'string') return getPhotoUrlFn(first)
  if (typeof first === 'object' && first.url) return getPhotoUrlFn(first.url)
  return null
}

/** Первое фото — превью для списков (fallback на полное). */
export function firstPhotoThumbUrl(boat, getPhotoUrlFn, getThumbUrlFn) {
  const photos = parsePhotos(boat)
  const first = photos[0]
  if (first == null) return null
  const raw = typeof first === 'string' ? first : first?.url
  if (!raw) return null
  return (getThumbUrlFn && getThumbUrlFn(raw)) || getPhotoUrlFn(raw)
}

/** Все URL фото катера для галереи. */
export function allPhotoUrls(boat, getPhotoUrlFn) {
  const urls = []
  for (const p of parsePhotos(boat)) {
    if (typeof p === 'string') {
      const u = getPhotoUrlFn(p)
      if (u) urls.push(u)
    } else if (p && typeof p === 'object' && p.url) {
      const u = getPhotoUrlFn(p.url)
      if (u) urls.push(u)
    }
  }
  return urls
}
