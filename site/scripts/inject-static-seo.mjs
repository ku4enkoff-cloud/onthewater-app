/**
 * Без Puppeteer: для каждой страницы катера пишет dist/boats/{slug}/index.html
 * с готовыми <title>, meta description, canonical, JSON-LD и SEO-fallback
 * (<h1> + описание) внутри #root — краулеры видят контент до гидрации React.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { boatUrlSegment } from '../src/boatUrl.js'
import {
  absoluteMediaUrl,
  fetchBoatsForSeo,
  getApiBase,
  getSiteOrigin,
  loadBuildEnv,
} from './seo-routes.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const siteRoot = join(__dirname, '..')
const distDir = join(siteRoot, 'dist')

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

function truncateMeta(text, maxLen = 160) {
  const s = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length <= maxLen) return s
  const cut = s.slice(0, maxLen - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut
  return `${trimmed.trim()}…`
}

function firstPhoto(boat) {
  let photos = boat?.photos
  if (typeof photos === 'string') {
    try {
      photos = JSON.parse(photos)
    } catch {
      photos = []
    }
  }
  if (!Array.isArray(photos) || !photos.length) return null
  const raw = photos[0]
  return typeof raw === 'string' ? raw : raw?.url || null
}

function boatCity(boat) {
  return String(boat?.location_city || boat?.locationCity || '').trim()
}

function boatDescription(boat, title, city) {
  const raw = String(boat?.description || '').trim()
  if (raw) return truncateMeta(raw, 300)
  const parts = [
    `Аренда «${title}»${city ? ` в ${city}` : ''}.`,
    'Бронирование на ONTHEWATER.',
  ]
  return truncateMeta(parts.join(' '), 300)
}

function replaceOrInsertMetaName(html, name, content) {
  const re = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i')
  const tag = `<meta name="${name}" content="${escapeAttr(content)}" />`
  if (re.test(html)) return html.replace(re, tag)
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`)
}

function replaceOrInsertMetaProperty(html, property, content) {
  const re = new RegExp(`<meta\\s+property=["']${property}["'][^>]*>`, 'i')
  const tag = `<meta property="${property}" content="${escapeAttr(content)}" />`
  if (re.test(html)) return html.replace(re, tag)
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`)
}

function replaceOrInsertLinkRel(html, rel, href) {
  const re = new RegExp(`<link\\s+rel=["']${rel}["'][^>]*>`, 'i')
  const tag = `<link rel="${rel}" href="${escapeAttr(href)}" />`
  if (re.test(html)) return html.replace(re, tag)
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`)
}

function replaceTitle(html, title) {
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
  }
  return html.replace(/<\/head>/i, `    <title>${escapeHtml(title)}</title>\n  </head>`)
}

function upsertJsonLd(html, id, data) {
  const script = `<script type="application/ld+json" id="${id}">${JSON.stringify(data)}</script>`
  const re = new RegExp(`<script[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`, 'i')
  if (re.test(html)) return html.replace(re, script)
  return html.replace(/<\/head>/i, `    ${script}\n  </head>`)
}

function injectRootFallback(html, innerHtml) {
  // Вкладываем SEO-контент в #root — React заменит его при гидрации.
  return html.replace(
    /<div id="root"><\/div>|<div id="root">\s*<\/div>/i,
    `<div id="root">${innerHtml}</div>`,
  )
}

function buildBoatPageHtml(template, boat, origin, apiBase) {
  const seg = boatUrlSegment(boat)
  if (!seg) return null
  const title = String(boat.title || boat.type_name || 'Катер').trim()
  const city = boatCity(boat)
  const pageTitle = city
    ? `${title} — аренда в ${city} | ONTHEWATER`
    : `${title} — аренда катера | ONTHEWATER`
  const description = boatDescription(boat, title, city)
  const path = `/boats/${seg}`
  const canonicalUrl = `${origin}${path}`
  const photo = absoluteMediaUrl(apiBase, firstPhoto(boat))
  const fullDesc = String(boat.description || '').trim() || description
  const typeName = String(boat.type_name || '').trim()
  const locLine = [boat.location_country, boat.location_region, boat.location_city, boat.location_address]
    .map((x) => (x != null ? String(x).trim() : ''))
    .filter(Boolean)
    .join(', ')

  let html = template
  html = replaceTitle(html, pageTitle)
  html = replaceOrInsertMetaName(html, 'description', truncateMeta(description))
  html = replaceOrInsertMetaName(
    html,
    'robots',
    'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  )
  html = replaceOrInsertLinkRel(html, 'canonical', canonicalUrl)
  html = replaceOrInsertMetaProperty(html, 'og:title', pageTitle)
  html = replaceOrInsertMetaProperty(html, 'og:description', truncateMeta(description))
  html = replaceOrInsertMetaProperty(html, 'og:url', canonicalUrl)
  html = replaceOrInsertMetaProperty(html, 'og:type', 'product')
  if (photo) {
    html = replaceOrInsertMetaProperty(html, 'og:image', photo)
    html = replaceOrInsertMetaProperty(html, 'og:image:alt', title)
  }
  html = replaceOrInsertMetaName(html, 'twitter:title', pageTitle)
  html = replaceOrInsertMetaName(html, 'twitter:description', truncateMeta(description))
  if (photo) html = replaceOrInsertMetaName(html, 'twitter:image', photo)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: pageTitle,
        description: truncateMeta(description),
        inLanguage: 'ru-RU',
      },
      {
        '@type': 'Product',
        '@id': `${canonicalUrl}#product`,
        name: title,
        description: truncateMeta(description),
        ...(photo ? { image: [photo] } : {}),
        category: typeName || 'Аренда катера',
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'RUB',
          availability: 'https://schema.org/InStock',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Катера', item: `${origin}/boats` },
          ...(city
            ? [
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: city,
                  item: `${origin}/boats?city=${encodeURIComponent(city)}`,
                },
              ]
            : []),
          {
            '@type': 'ListItem',
            position: city ? 4 : 3,
            name: title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  }
  html = upsertJsonLd(html, 'seo-jsonld-boat-static', jsonLd)

  const fallback = `
    <article class="seo-ssr" itemscope itemtype="https://schema.org/Product" data-seo-fallback="1">
      <header>
        <h1 itemprop="name">${escapeHtml(title)}</h1>
        ${locLine ? `<p>${escapeHtml(locLine)}</p>` : ''}
        ${typeName ? `<p>Тип судна: <span itemprop="category">${escapeHtml(typeName)}</span></p>` : ''}
      </header>
      <section>
        <h2>Описание</h2>
        <p itemprop="description">${escapeHtml(fullDesc)}</p>
      </section>
      <p><a href="${escapeAttr(canonicalUrl)}">Страница объявления на ONTHEWATER</a></p>
      <p><a href="${escapeAttr(`${origin}/boats`)}">Все катера</a></p>
    </article>
  `

  html = injectRootFallback(html, fallback)
  return { seg, html }
}

async function main() {
  const spaIndex = join(distDir, 'index.html')
  if (!existsSync(spaIndex)) {
    console.error('inject-static-seo: dist/index.html not found — run vite build first')
    process.exit(1)
  }

  const env = loadBuildEnv()
  const origin = getSiteOrigin(env)
  const apiBase = getApiBase(env)
  const template = readFileSync(spaIndex, 'utf8')

  let boats = []
  try {
    boats = await fetchBoatsForSeo(apiBase)
  } catch (err) {
    console.warn(`inject-static-seo: boats fetch failed (${err.message})`)
    process.exit(0)
  }

  let written = 0
  for (const boat of boats) {
    const built = buildBoatPageHtml(template, boat, origin, apiBase)
    if (!built) continue
    const outDir = join(distDir, 'boats', built.seg)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, 'index.html'), built.html, 'utf8')
    written += 1
  }

  console.log(`inject-static-seo: wrote ${written} boat HTML pages with <h1> + description`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
