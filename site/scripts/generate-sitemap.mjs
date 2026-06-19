import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fetchBoatsForSeo,
  getApiBase,
  getPrerenderRoutes,
  getSiteOrigin,
  getSitemapEntries,
  loadBuildEnv,
} from './seo-routes.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSitemapXml(entries) {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${escapeXml(e.lastmod)}</lastmod>
    <changefreq>${escapeXml(e.changefreq)}</changefreq>
    <priority>${escapeXml(e.priority)}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

async function main() {
  const env = loadBuildEnv()
  const origin = getSiteOrigin(env)
  const apiBase = getApiBase(env)
  const lastmod = new Date().toISOString().slice(0, 10)

  let boats = []
  try {
    boats = await fetchBoatsForSeo(apiBase)
    console.log(`Sitemap: fetched ${boats.length} boats from ${apiBase}`)
  } catch (err) {
    console.warn(`Sitemap: could not fetch boats (${err.message}), static URLs only`)
  }

  const entries = getSitemapEntries(origin, boats, lastmod)
  const xml = buildSitemapXml(entries)
  writeFileSync(join(publicDir, 'sitemap.xml'), xml, 'utf8')

  const routes = getPrerenderRoutes(boats)
  writeFileSync(join(publicDir, 'prerender-routes.json'), JSON.stringify(routes, null, 2), 'utf8')

  console.log(`Wrote sitemap.xml (${entries.length} URLs) and prerender-routes.json (${routes.length} routes)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
