import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LOCATION_OPTIONS } from '../boatSearchUtils.js'
import { applyDocumentSeo } from '../seo/documentSeo.js'
import { getPublicSiteOrigin } from '../lib/publicSiteUrl.js'

function boatsCityHref(cityValue) {
  if (cityValue === '__all') return '/boats'
  return `/boats?city=${encodeURIComponent(cityValue)}`
}

export default function SitemapPage() {
  const cities = LOCATION_OPTIONS.filter((o) => o.value !== '__all')

  useEffect(() => {
    const origin = getPublicSiteOrigin()
    return applyDocumentSeo({
      title: 'Карта сайта — ONTHEWATER',
      description: 'Основные разделы сайта ONTHEWATER.',
      canonicalUrl: `${origin}/sitemap`,
    })
  }, [])

  return (
    <>
      <header className="bd-topBar auth-loginTopBar">
        <div className="bd-topBar__left">
          <Link to="/" className="bd-topBar__logo" aria-label="ONTHEWATER — на главную">
            <span className="bd-topBar__logoMark" aria-hidden />
            <span className="bd-topBar__logoText">onthewater</span>
          </Link>
        </div>
        <nav className="bd-topBar__nav" aria-label="Разделы сайта">
          <Link to="/boats" className="bd-topBar__link">
            Поиск катеров
          </Link>
        </nav>
      </header>

      <main className="legal-page">
        <article className="legal-page__inner">
          <h1 className="legal-page__title">Карта сайта</h1>
          <nav className="sitemap-page__nav" aria-label="Карта сайта">
            <section className="sitemap-page__section">
              <h2>Основное</h2>
              <ul>
                <li><Link to="/">Главная</Link></li>
                <li><Link to="/boats">Поиск катеров</Link></li>
                <li><Link to="/owners">Для владельцев катеров</Link></li>
                <li><Link to="/login">Вход</Link></li>
                <li><Link to="/register">Регистрация</Link></li>
                <li><Link to="/account">Личный кабинет</Link></li>
              </ul>
            </section>
            <section className="sitemap-page__section">
              <h2>Города и регионы</h2>
              <ul>
                {cities.map((o) => (
                  <li key={o.value}>
                    <Link to={boatsCityHref(o.value)}>{o.label}</Link>
                  </li>
                ))}
                <li><Link to="/boats">Все регионы</Link></li>
              </ul>
            </section>
            <section className="sitemap-page__section">
              <h2>Правовая информация</h2>
              <ul>
                <li><Link to="/privacy">Политика конфиденциальности</Link></li>
                <li><Link to="/terms">Условия использования</Link></li>
              </ul>
            </section>
          </nav>
        </article>
      </main>
    </>
  )
}
