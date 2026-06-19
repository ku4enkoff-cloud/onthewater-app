import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { boatUrlSegment } from '../src/boatUrl.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const siteRoot = join(__dirname, '..')

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

export async function fetchBoatsForSeo(apiBase) {
  const url = `${apiBase}/boats?popular=1&limit=500`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`boats ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export function getSitemapEntries(origin, boats, lastmod) {
  const entries = []
  const add = (path, priority, changefreq) => {
    entries.push({
      loc: `${origin}${path}`,
      priority,
      changefreq,
      lastmod,
    })
  }

  add('/', '1.0', 'daily')
  add('/boats', '0.9', 'daily')
  for (const city of SEO_CITIES) {
    add(`/boats?city=${encodeURIComponent(city)}`, '0.85', 'daily')
  }
  add('/owners', '0.7', 'weekly')
  add('/privacy', '0.3', 'monthly')
  add('/terms', '0.3', 'monthly')
  add('/sitemap', '0.4', 'monthly')

  for (const boat of boats) {
    const seg = boatUrlSegment(boat)
    if (seg) add(`/boats/${seg}`, '0.8', 'weekly')
  }

  return entries
}

export function getPrerenderRoutes(boats) {
  // /boats не пререндерим в dist/boats/index.html — иначе ломается SPA для /boats/:slug
  const staticRoutes = ['/', '/owners', '/privacy', '/terms', '/sitemap']
  const boatRoutes = boats
    .map((boat) => {
      const seg = boatUrlSegment(boat)
      return seg ? `/boats/${seg}` : null
    })
    .filter(Boolean)
  return [...staticRoutes, ...boatRoutes]
}
