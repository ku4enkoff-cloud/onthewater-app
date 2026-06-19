import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fetchBoatsForSeo,
  getApiBase,
  getPrerenderRoutes,
  getSiteOrigin,
  loadBuildEnv,
} from './seo-routes.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const siteRoot = join(__dirname, '..')
const distDir = join(siteRoot, 'dist')
const routesFile = join(siteRoot, 'public', 'prerender-routes.json')

const BLOCKED_HOST_FRAGMENTS = ['mc.yandex.ru', 'api-maps.yandex', 'yandex.net/maps']

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadPrerenderDeps() {
  try {
    const [puppeteerMod, sirvMod] = await Promise.all([import('puppeteer'), import('sirv')])
    return {
      puppeteer: puppeteerMod.default,
      sirv: sirvMod.default,
    }
  } catch (err) {
    const missing = String(err?.message || err)
    if (missing.includes('puppeteer') || missing.includes('sirv')) {
      console.warn('Prerender skipped: devDependencies not installed (puppeteer/sirv).')
      console.warn('  Full SEO HTML: npm install && npm run build')
      console.warn('  Or on server:    npm run build:no-prerender  (SPA only, no static HTML for bots)')
      return null
    }
    throw err
  }
}

function routeToOutPath(route) {
  if (route === '/') return join(distDir, 'index.html')
  const clean = route.replace(/^\//, '').replace(/\?.*$/, '')
  return join(distDir, clean, 'index.html')
}

function waitSelectorForRoute(route) {
  if (route === '/') return '.lp-heroTitle'
  if (route === '/boats') return '.bs-page'
  if (route.startsWith('/boats/')) return '.bd-heroBs__title'
  if (route === '/owners') return '.owner-page__title'
  if (route === '/privacy' || route === '/terms') return 'main'
  if (route === '/sitemap') return '.sitemap-page__nav'
  return '#root .app-outlet'
}

function startStaticServer(port, spaIndexPath, sirv) {
  return new Promise((resolve, reject) => {
    const serve = sirv(distDir, { dev: false })
    const server = http.createServer((req, res) => {
      serve(req, res, () => {
        const url = req.url?.split('?')[0] || '/'
        if (url.includes('.') && !url.endsWith('/')) {
          res.statusCode = 404
          res.end('Not found')
          return
        }
        const stream = readFileSync(spaIndexPath)
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(stream)
      })
    })
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

function normalizePrerenderHtml(html, localOrigin, publicOrigin) {
  return html.split(localOrigin).join(publicOrigin)
}

function printChromeDepsHint() {
  console.warn('')
  console.warn('Prerender skipped: Chrome (Puppeteer) не запустился на этом сервере.')
  console.warn('Варианты:')
  console.warn('  1) Один раз установить библиотеки Chrome:')
  console.warn('     sudo bash scripts/install-chrome-deps.sh')
  console.warn('     npm run build')
  console.warn('  2) Сборка без пререндера (sitemap + SPA всё равно соберутся):')
  console.warn('     npm run build:no-prerender')
  console.warn('  3) npm run build на ПК (Windows/macOS) и залить dist/ на сервер.')
  console.warn('')
}

async function launchBrowser(puppeteer) {
  try {
    return await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
  } catch (err) {
    console.warn(String(err?.message || err))
    printChromeDepsHint()
    return null
  }
}

async function loadRoutes(env) {
  if (existsSync(routesFile)) {
    try {
      const parsed = JSON.parse(readFileSync(routesFile, 'utf8'))
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      /* fall through */
    }
  }

  let boats = []
  try {
    boats = await fetchBoatsForSeo(getApiBase(env))
  } catch (err) {
    console.warn(`Prerender: could not fetch boats (${err.message})`)
  }
  return getPrerenderRoutes(boats)
}

async function main() {
  const env = loadBuildEnv()
  if (env.SKIP_PRERENDER === '1' || env.SKIP_PRERENDER === 'true') {
    console.log('SKIP_PRERENDER is set — prerender skipped')
    return
  }

  const deps = await loadPrerenderDeps()
  if (!deps) return

  const { puppeteer, sirv } = deps

  if (!existsSync(distDir)) {
    console.error('dist/ not found — run vite build first')
    process.exit(1)
  }

  const spaIndexPath = join(distDir, 'index.html')
  if (!existsSync(spaIndexPath)) {
    console.error('dist/index.html not found — run vite build first')
    process.exit(1)
  }

  const routes = await loadRoutes(env)
  const port = Number(env.PRERENDER_PORT) || 4173
  const publicOrigin = getSiteOrigin(env)
  const localOrigin = `http://127.0.0.1:${port}`
  const server = await startStaticServer(port, spaIndexPath, sirv)

  const browser = await launchBrowser(puppeteer)
  if (!browser) {
    await new Promise((resolve) => server.close(resolve))
    return
  }

  try {
    for (const route of routes) {
      const url = `${localOrigin}${route}`
      const selector = waitSelectorForRoute(route)
      console.log(`Prerender: ${route}`)

      const page = await browser.newPage()
      await page.setRequestInterception(true)
      page.on('request', (req) => {
        const reqUrl = req.url()
        if (BLOCKED_HOST_FRAGMENTS.some((frag) => reqUrl.includes(frag))) {
          req.abort()
          return
        }
        req.continue()
      })

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
        try {
          await page.waitForSelector(selector, { timeout: 20000 })
        } catch {
          console.warn(`  timeout waiting for ${selector}`)
        }
        await page.waitForSelector('#root .app-outlet', { timeout: 5000 }).catch(() => {})
        await sleep(800)

        const hasContent = await page.evaluate(
          () => document.querySelector('#root .app-outlet')?.children.length > 0,
        )
        if (!hasContent) {
          console.warn(`  skip ${route}: empty #root`)
          continue
        }

        let html = await page.evaluate(() => document.documentElement.outerHTML)
        html = normalizePrerenderHtml(html, localOrigin, publicOrigin)

        const outPath = routeToOutPath(route)
        mkdirSync(dirname(outPath), { recursive: true })
        writeFileSync(outPath, `<!DOCTYPE html>\n${html}\n`, 'utf8')
      } finally {
        await page.close()
      }
    }

    console.log(`Prerender complete: ${routes.length} routes`)
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
