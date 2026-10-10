import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { boatUrlSegment } from '../src/boatUrl.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const siteRoot = join(__dirname, '..')

/** Города/регионы с посадочными URL /boats?city=… */
export const SEO_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Сочи',
  'Казань',
  'Московская область',
]

function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

export function loadBuildEnv() {
  const merged = {}
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    Object.assign(merged, parseEnvFile(join(siteRoot, file)))
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (val != null && val !== '') merged[key] = val
  }
  return merged
}

export function getSiteOrigin(env = loadBuildEnv()) {
  return (env.VITE_PUBLIC_SITE_URL || env.VITE_MAIN_SITE_URL || 'https://onthewater.ru').replace(
    /\/$/,
    '',
  )
}

export function getApiBase(env = loadBuildEnv()) {
  const raw = (env.VITE_API_URL || 'https://api.onthewater.ru').trim()
  return raw.replace(/\/$/, '')
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

function mergeBoatsById(lists) {
  const map = new Map()
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const boat of list) {
      const id = Number(boat?.id)
      if (!Number.isFinite(id)) continue
      if (!map.has(id)) map.set(id, boat)
    }
  }
  return [...map.values()].sort((a, b) => Number(a.id) - Number(b.id))
}

function firstPhotoPath(boat) {
  let photos = boat?.photos
  if (typeof photos === 'string') {
    try {
      photos = JSON.parse(photos)
    } catch {
      photos = []
    }
  }
  if (!Array.isArray(photos) || photos.length === 0) return null
  const raw = photos[0]
  if (typeof raw === 'string') return raw
  if (raw && typeof raw.url === 'string') return raw.url
  return null
}

export function absoluteMediaUrl(apiBase, src) {
  if (!src || typeof src !== 'string') return null
  const s = src.trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  const uploadsMatch = s.match(/\/uploads\/[^?#]+/)
  const path = uploadsMatch
    ? uploadsMatch[0].startsWith('/')
      ? uploadsMatch[0]
      : `/${uploadsMatch[0]}`
    : s.startsWith('/')
      ? s
      : `/${s}`
  return `${apiBase}${path}`
}

/**
 * Собирает все активные катера для sitemap/prerender:
 * popular (до 500) + города + широкий радиус по Москве.
 */
export async function fetchBoatsForSeo(apiBase) {
  const base = apiBase.replace(/\/$/, '')
  const requests = [
    fetchJson(`${base}/boats?popular=1&limit=500`).catch(() => []),
    fetchJson(`${base}/boats?lat=55.75&lng=37.62&radius=2500`).catch(() => []),
    ...SEO_CITIES.map((city) =>
      fetchJson(`${base}/boats?city=${encodeURIComponent(city)}`).catch(() => []),
    ),
    fetchJson(`${base}/boats?region=${encodeURIComponent('Московская область')}`).catch(() => []),
  ]

  const lists = await Promise.all(requests)
  const boats = mergeBoatsById(lists)
  if (boats.length === 0) throw new Error('no boats returned')
  return boats
}

/**
 * Посадочные города для sitemap.
 * Базовый список + города API; мелкие/шумные локации с 1 катером не добавляем.
 */
export async function fetchSeoCities(apiBase, boats = []) {
  const set = new Set(SEO_CITIES)
  try {
    const rows = await fetchJson(`${apiBase.replace(/\/$/, '')}/boats/cities`)
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const city = String(row?.city || row || '').trim()
        if (city && city.length <= 40 && !/^городской округ/i.test(city)) set.add(city)
      }
    }
  } catch {
    /* ignore */
  }

  const counts = new Map()
  for (const boat of boats) {
    const city = String(boat?.location_city || '').trim()
    if (!city) continue
    counts.set(city, (counts.get(city) || 0) + 1)
  }
  for (const [city, n] of counts) {
    if (n >= 2 && city.length <= 40 && !/^городской округ/i.test(city)) set.add(city)
  }

  return [...set].sort((a, b) => a.localeCompare(b, 'ru'))
}

function boatLastmod(boat, fallback) {
  const raw = boat?.created_at || boat?.createdAt || fallback
  try {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  } catch {
    /* ignore */
  }
  return fallback
}

export function getSitemapEntries(origin, boats, lastmod, { apiBase, cities } = {}) {
  const mediaBase = (apiBase || 'https://api.onthewater.ru').replace(/\/$/, '')
  const cityList = Array.isArray(cities) && cities.length > 0 ? cities : SEO_CITIES
  const entries = []
  const add = (path, priority, changefreq, opts = {}) => {
    entries.push({
      loc: `${origin}${path}`,
      priority,
      changefreq,
      lastmod: opts.lastmod || lastmod,
      images: opts.images || [],
    })
  }

  add('/', '1.0', 'daily')
  add('/boats', '0.9', 'daily')
  for (const city of cityList) {
    add(`/boats?city=${encodeURIComponent(city)}`, '0.85', 'daily')
  }
  add('/owners', '0.7', 'weekly')
  add('/privacy', '0.3', 'yearly')
  add('/terms', '0.3', 'yearly')
  add('/sitemap', '0.5', 'weekly')

  for (const boat of boats) {
    const seg = boatUrlSegment(boat)
    if (!seg) continue
    const photo = absoluteMediaUrl(mediaBase, firstPhotoPath(boat))
    const title = String(boat.title || boat.type_name || 'Катер').trim()
    add(`/boats/${seg}`, '0.8', 'weekly', {
      lastmod: boatLastmod(boat, lastmod),
      images: photo ? [{ loc: photo, title }] : [],
    })
  }

  return entries
}

export function getPrerenderRoutes(boats) {
  // /boats → dist/boats/index.html обязателен: иначе nginx видит пустую папку boats/ и отдаёт 403
  const staticRoutes = ['/', '/boats', '/owners', '/privacy', '/terms', '/sitemap']
  const boatRoutes = boats
    .map((boat) => {
      const seg = boatUrlSegment(boat)
      return seg ? `/boats/${seg}` : null
    })
    .filter(Boolean)
  return [...staticRoutes, ...boatRoutes]
}
