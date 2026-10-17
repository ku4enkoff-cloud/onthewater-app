import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBoatTypes } from '../api/boats'
import { getCardImageUrl, getPhotoUrl } from '../config'

const FALLBACK_IMAGE = 'https://placehold.co/900x600/e2e8f0/334155?text=%D0%A2%D0%B8%D0%BF+%D1%81%D1%83%D0%B4%D0%BD%D0%B0'

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function HomeCategoriesSection({ variant = 'default' }) {
  const [types, setTypes] = useState([])
  const scrollerRef = useRef(null)
  const isPrecision = variant === 'precision'

  useEffect(() => {
    let cancelled = false
    fetchBoatTypes()
      .then((res) => {
        if (cancelled) return
        const normalized = Array.isArray(res)
          ? res
              .map((t) => ({
                id: String(t?.id ?? ''),
                name: String(t?.name || '').trim(),
                image: getCardImageUrl(t?.image) || getPhotoUrl(t?.image) || FALLBACK_IMAGE,
              }))
              .filter((t) => t.id && t.name)
          : []
        setTypes(normalized)
      })
      .catch(() => {
        if (!cancelled) setTypes([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const scrollBy = (dir) => {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector('.pm-catCard')
    const step = card ? card.getBoundingClientRect().width + 16 : Math.min(el.clientWidth * 0.75, 320)
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  if (types.length === 0) return null

  if (isPrecision) {
    return (
      <section className="pm-section" id="categories" aria-label="Категории катеров">
        <div className="pm-container">
          <div className="pm-sectionHead pm-catHead">
            <h2 className="pm-sectionTitle">Категории катеров</h2>
            <div className="pm-catHead__right">
              <div className="pm-catNav" role="group" aria-label="Прокрутка категорий">
                <button type="button" className="pm-catNav__btn" aria-label="Назад" onClick={() => scrollBy(-1)}>
                  <ChevronLeft />
                </button>
                <button type="button" className="pm-catNav__btn" aria-label="Вперёд" onClick={() => scrollBy(1)}>
                  <ChevronRight />
                </button>
              </div>
              <Link to="/boats" className="pm-viewAll">
                Смотреть все →
              </Link>
            </div>
          </div>

          <div className="pm-catRail">
            <div
              ref={scrollerRef}
              className="pm-catScroller"
              tabIndex={0}
              role="region"
              aria-label="Список категорий"
            >
              {types.map((type) => {
                const q = new URLSearchParams({
                  typeId: type.id,
                  typeName: type.name,
                })
                return (
                  <Link
                    key={type.id}
                    to={`/boats?${q.toString()}`}
                    className="pm-catCard pm-catCard--photo"
                    aria-label={`Перейти к поиску катеров: ${type.name}`}
                  >
                    <div className="pm-catCard__imgWrap">
                      <img
                        src={type.image}
                        alt={type.name}
                        className="pm-catCard__img"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <span className="pm-catCard__name">{type.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="lp-section lp-cats" aria-label="Категории судов">
      <div className="lp-container">
        <div className="lp-catsLayout">
          <header className="lp-catsHead">
            <h2 className="lp-catsTitle">Категории</h2>
          </header>

          <div className="lp-catsRail" role="region" aria-label="Категории судов">
            <div className="lp-catsMosaic">
              {types.map((type) => (
                <Link
                  key={type.id}
                  to="/boats"
                  className="lp-catCard"
                  aria-label={`Перейти к поиску катеров: ${type.name}`}
                >
                  <img src={type.image} alt={type.name} className="lp-catCard__img" loading="lazy" decoding="async" />
                  <span className="lp-catCard__name">{type.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
