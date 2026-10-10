import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPopularBoats } from '../api/boats.js'
import { LOCATION_OPTIONS } from '../boatSearchUtils.js'
import { boatDetailPath } from '../boatUrl.js'
import { applyDocumentSeo, buildJsonLd } from '../seo/documentSeo.js'
import { getPublicSiteOrigin } from '../lib/publicSiteUrl.js'

function boatsCityHref(cityValue) {
  if (cityValue === '__all') return '/boats'
  return `/boats?city=${encodeURIComponent(cityValue)}`
}

export default function SitemapPage() {
  const cities = LOCATION_OPTIONS.filter((o) => o.value !== '__all')
  const [boats, setBoats] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchPopularBoats(200)
        if (!cancelled) setBoats(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setBoats([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const origin = getPublicSiteOrigin()
    const description =
      'HTML-карта сайта ONTHEWATER: главная, поиск катеров по городам, объявления и правовые документы.'
    const revertDoc = applyDocumentSeo({
      title: 'Карта сайта — аренда катеров | ONTHEWATER',
      description,
      canonicalUrl: `${origin}/sitemap`,
      keywords: 'карта сайта, аренда катеров, ONTHEWATER',
    })
    const revertLd = buildJsonLd('seo-jsonld-sitemap', {
      '@type': 'WebPage',
      name: 'Карта сайта ONTHEWATER',
      description,
      url: `${origin}/sitemap`,
      isPartOf: { '@id': `${origin}/#website` },
      inLanguage: 'ru-RU',
    })
    return () => {
      revertLd()
      revertDoc()
    }
  }, [])

  return (
    <main className="legal-page">
      <article className="legal-page__inner">
        <h1 className="legal-page__title">Карта сайта</h1>
        <p className="legal-page__lead">
          Основные разделы ONTHEWATER для поиска и бронирования катеров.
        </p>
        <nav className="sitemap-page__nav" aria-label="Карта сайта">
          <section className="sitemap-page__section">
            <h2>Основное</h2>
            <ul>
              <li>
                <Link to="/">Главная</Link>
              </li>
              <li>
                <Link to="/boats">Поиск катеров</Link>
              </li>
              <li>
                <Link to="/owners">Для владельцев катеров</Link>
              </li>
            </ul>
          </section>

          <section className="sitemap-page__section">
            <h2>Города и регионы</h2>
            <ul>
              {cities.map((o) => (
                <li key={o.value}>
                  <Link to={boatsCityHref(o.value)}>Аренда катеров в {o.label}</Link>
                </li>
              ))}
              <li>
                <Link to="/boats">Все регионы</Link>
              </li>
            </ul>
          </section>

          {boats.length > 0 ? (
            <section className="sitemap-page__section">
              <h2>Катера ({boats.length})</h2>
              <ul>
                {boats.map((boat) => {
                  const path = boatDetailPath(boat)
                  if (!path || path === '/boats') return null
                  const city = String(boat.location_city || '').trim()
                  const label = boat.title || boat.type_name || `Катер #${boat.id}`
                  return (
                    <li key={boat.id}>
                      <Link to={path}>
                        {label}
                        {city ? ` — ${city}` : ''}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          <section className="sitemap-page__section">
            <h2>Правовая информация</h2>
            <ul>
              <li>
                <Link to="/privacy">Политика конфиденциальности</Link>
              </li>
              <li>
                <Link to="/terms">Условия использования</Link>
              </li>
            </ul>
          </section>
        </nav>
      </article>
    </main>
  )
}
