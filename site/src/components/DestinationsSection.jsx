import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDestinations } from '../api/destinations'
import { API_BASE, getPhotoUrl } from '../config'

const PLACEHOLDER = 'https://placehold.co/400x260/e8eef4/64748b?text=%D0%9D%D0%B0%D0%BF%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5'

export default function DestinationsSection({ variant = 'default' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const scrollerRef = useRef(null)
  const isPrecision = variant === 'precision'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchDestinations()
        if (!cancelled) setItems(list)
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const scrollBy = (dir) => {
    const el = scrollerRef.current
    if (!el) return
    const delta = Math.min(el.clientWidth * 0.75, 320)
    el.scrollBy({ left: dir * delta, behavior: 'smooth' })
  }

  if (!loading && items.length === 0) {
    return null
  }

  if (isPrecision) {
    const grid = items.slice(0, 4)
    return (
      <section className="pm-section" id="destinations">
        <div className="pm-container">
          <div className="pm-sectionHead">
            <h2 className="pm-sectionTitle">Направления</h2>
            <Link to="/boats" className="pm-viewAll">
              Смотреть все →
            </Link>
          </div>

          {import.meta.env.DEV && !API_BASE ? (
            <p className="pm-hint">Локально направления грузятся через proxy на бэкенд :3000.</p>
          ) : null}

          {loading ? (
            <div className="pm-destGrid" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="pm-destCard pm-destCard--skeleton" aria-hidden />
              ))}
            </div>
          ) : (
            <div className="pm-destGrid">
              {grid.map((d) => {
                const name = String(d?.name || '').trim() || 'Направление'
                const img = getPhotoUrl(d?.image) || PLACEHOLDER
                const q = encodeURIComponent(name)
                return (
                  <Link key={d.id || name} to={`/boats?city=${q}`} className="pm-destCard">
                    <div className="pm-destCard__media">
                      <img src={img} alt={`Аренда катеров в ${name}`} className="pm-destCard__img" loading="lazy" />
                      <span className="pm-destCard__shade" aria-hidden />
                      <span className="pm-destCard__caption">
                        <span className="pm-destCard__name">{name}</span>
                        <span className="pm-destCard__line" aria-hidden />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="lp-section lp-destinations" id="destinations">
      <div className="lp-container lp-destinationsInner">
        <div className="lp-destHead">
          <div className="lp-destHeadText">
            <h2 className="lp-destTitle">Популярные направления</h2>
          </div>
          <div className="lp-destNav" role="group" aria-label="Прокрутка направлений">
            <button
              type="button"
              className="lp-destNavBtn"
              aria-label="Предыдущие"
              onClick={() => scrollBy(-1)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="lp-destNavBtn lp-destNavBtn--primary"
              aria-label="Следующие"
              onClick={() => scrollBy(1)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {import.meta.env.DEV && !API_BASE ? (
          <p className="lp-destDevHint">Локально направления грузятся через proxy на бэкенд :3000.</p>
        ) : null}

        <div className="lp-destScrollerWrap">
          <div
            ref={scrollerRef}
            className="lp-destScroller"
            tabIndex={0}
            role="region"
            aria-label="Список направлений"
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="lp-destCard lp-destCard--skeleton" aria-hidden />
                ))
              : items.map((d) => {
                  const name = String(d.name || '').trim() || '—'
                  const img = getPhotoUrl(d.image) || PLACEHOLDER
                  const q = encodeURIComponent(name)
                  return (
                    <Link key={d.id} to={`/boats?city=${q}`} className="lp-destCard">
                      <div className="lp-destCardImgWrap">
                        <img src={img} alt={`Аренда катеров в ${name}`} className="lp-destCardImg" loading="lazy" />
                      </div>
                      <span className="lp-destCardName">{name}</span>
                    </Link>
                  )
                })}
          </div>
        </div>
      </div>
    </section>
  )
}
