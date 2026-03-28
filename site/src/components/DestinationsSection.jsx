import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDestinations } from '../api/destinations'
import { API_BASE, getPhotoUrl } from '../config'

const PLACEHOLDER = 'https://placehold.co/400x260/e8eef4/64748b?text=%D0%9D%D0%B0%D0%BF%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5'

export default function DestinationsSection() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const scrollerRef = useRef(null)

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

  return (
    <section className="lp-section lp-destinations" id="destinations">
      <div className="lp-container lp-destinationsInner">
        <div className="lp-destHead">
          <div className="lp-destHeadText">
            <h2 className="lp-destTitle">Откройте направления на катере</h2>
            <p className="lp-destSub">
              Забронируйте катер или яхту в любом из городов — с капитаном или без.
            </p>
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
          <p className="lp-destDevHint">
            Локально направления грузятся через proxy на бэкенд :3000.
          </p>
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
                    <Link
                      key={d.id}
                      to={`/boats?city=${q}`}
                      className="lp-destCard"
                    >
                      <div className="lp-destCardImgWrap">
                        <img src={img} alt="" className="lp-destCardImg" loading="lazy" />
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
