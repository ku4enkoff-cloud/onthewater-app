import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fetchBoatsForSeo,
  fetchSeoCities,
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
  const hasImages = entries.some((e) => Array.isArray(e.images) && e.images.length > 0)
  const urls = entries
    .map((e) => {
      const imagesXml = (e.images || [])
        .map(
          (img) => `    <image:image>
      <image:loc>${escapeXml(img.loc)}</image:loc>${
            img.title ? `\n      <image:title>${escapeXml(img.title)}</image:title>` : ''
          }
    </image:image>`,
        )
        .join('\n')
      return `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${escapeXml(e.lastmod)}</lastmod>
    <changefreq>${escapeXml(e.changefreq)}</changefreq>
    <priority>${escapeXml(e.priority)}</priority>${imagesXml ? `\n${imagesXml}` : ''}
  </url>`
    })
    .join('\n')

  const ns = hasImages
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${ns}>
${urls}
</urlset>
`
}

function buildSitemapIndexXml(origin, lastmod) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(`${origin}/sitemap.xml`)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
  </sitemap>
</sitemapindex>
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

  let cities = []
  try {
    cities = await fetchSeoCities(apiBase, boats)
    console.log(`Sitemap: ${cities.length} city landing pages`)
  } catch {
    cities = []
  }

  const entries = getSitemapEntries(origin, boats, lastmod, { apiBase, cities })
  const xml = buildSitemapXml(entries)
  writeFileSync(join(publicDir, 'sitemap.xml'), xml, 'utf8')
  writeFileSync(join(publicDir, 'sitemap-index.xml'), buildSitemapIndexXml(origin, lastmod), 'utf8')

  const routes = getPrerenderRoutes(boats)
  writeFileSync(join(publicDir, 'prerender-routes.json'), JSON.stringify(routes, null, 2), 'utf8')

  console.log(
    `Wrote sitemap.xml (${entries.length} URLs), sitemap-index.xml, prerender-routes.json (${routes.length} routes)`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
