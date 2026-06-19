import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'
import sirv from 'sirv'
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

function routeToOutPath(route) {
  if (route === '/') return join(distDir, 'index.html')
  const clean = route.replace(/^\//, '').replace(/\?.*$/, '')
  return join(distDir, clean, 'index.html')
}

function waitSelectorForRoute(route) {
  if (route === '/') return '.lp-heroTitle'
  if (route.startsWith('/boats/')) return '.bd-heroBs__title'
  if (route === '/owners') return '.owner-page__title'
  if (route === '/privacy' || route === '/terms') return 'main'
  if (route === '/sitemap') return '.sitemap-page__nav'
  return '#root .app-outlet'
}

function startStaticServer(port, spaIndexPath) {
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

async function loadRoutes(env) {
  if (existsSync(routesFile)) {
    try {
      const parsed = JSON.parse(readFileSync(routesFile, 'utf8'))
      const filtered = parsed.filter((route) => route !== '/boats')
      if (filtered.length > 0) return filtered
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

  if (!existsSync(distDir)) {
    console.error('dist/ not found — run vite build first')
    process.exit(1)
  }

  const spaIndexPath = join(distDir, 'index.html')
  if (!existsSync(spaIndexPath)) {
    console.error('dist/index.html not found — run vite build first')
    process.exit(1)
  }

  const boatsIndex = join(distDir, 'boats', 'index.html')
  if (existsSync(boatsIndex)) {
    rmSync(boatsIndex, { force: true })
  }

  const routes = await loadRoutes(env)
  const port = Number(env.PRERENDER_PORT) || 4173
  const publicOrigin = getSiteOrigin(env)
  const localOrigin = `http://127.0.0.1:${port}`
  const server = await startStaticServer(port, spaIndexPath)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

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
