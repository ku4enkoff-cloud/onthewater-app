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

export function getMinDurationPrice(boat) {
  const minDuration = Number(boat?.schedule_min_duration) || 60
  const base = Number(boat?.price_per_hour) || 0
  if (minDuration === 60) return base
  let tiers = boat?.price_tiers
  if (typeof tiers === 'string') {
    try {
      tiers = JSON.parse(tiers)
    } catch {
      tiers = []
    }
  }
  if (!Array.isArray(tiers)) tiers = []
  const match = tiers.find((t) => (Number(t?.duration) || 0) === minDuration)
  const tierPrice = Number(match?.price) || 0
  return tierPrice > 0 ? tierPrice : base
}

export function minDurationLabel(item) {
  const mins = item.schedule_min_duration != null ? Number(item.schedule_min_duration) : 60
  if (mins < 60) return `${mins} мин`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
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
