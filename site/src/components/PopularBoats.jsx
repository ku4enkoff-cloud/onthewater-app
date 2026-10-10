import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPopularBoats } from '../api/boats'
import { API_BASE, getPhotoUrl, getThumbUrl } from '../config'
import { boatDetailPath } from '../boatUrl'
import {
  firstPhotoThumbUrl,
  formatCardLocation,
  formatPriceRu,
  getMinDurationPrice,
  minDurationLabelForBoat,
} from '../boatUtils'

const PLACEHOLDER = 'https://placehold.co/600x380/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'
const GRID_LIMIT = 4
const FETCH_LIMIT = 20

export default function PopularBoats({ variant = 'default' }) {
  const [boats, setBoats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isPrecision = variant === 'precision'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await fetchPopularBoats(FETCH_LIMIT)
        if (!cancelled) setBoats(list.slice(0, GRID_LIMIT))
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'load')
          setBoats([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (isPrecision) {
    return (
      <section className="pm-section" id="boats">
        <div className="pm-container">
          <div className="pm-sectionHead">
            <h2 className="pm-sectionTitle">Популярные катера</h2>
            <Link to="/boats" className="pm-viewAll">
              Смотреть все →
            </Link>
          </div>

          {import.meta.env.DEV && !API_BASE ? (
            <p className="pm-hint">Локально: запросы идут через Vite proxy на бэкенд (:3000).</p>
          ) : null}

          {error ? <p className="pm-error">Не удалось загрузить катера. Попробуйте позже.</p> : null}

          {loading ? (
            <div className="pm-boatsGrid" aria-busy="true">
              {Array.from({ length: GRID_LIMIT }).map((_, i) => (
                <div key={i} className="pm-boatCard--skeleton" />
              ))}
            </div>
          ) : boats.length === 0 && !error ? (
            <p className="pm-empty">Пока нет доступных катеров — загляните позже.</p>
          ) : (
            <div className="pm-boatsGrid">
              {boats.map((boat) => {
                const id = boat.id
                const title = boat.title || boat.type_name || 'Катер'
                const img = firstPhotoThumbUrl(boat, getPhotoUrl, getThumbUrl) || PLACEHOLDER
                const price = getMinDurationPrice(boat)
                const unit = minDurationLabelForBoat(boat)
                const loc = formatCardLocation(boat)
                return (
                  <Link key={String(id)} to={boatDetailPath(boat)} className="pm-boatCard">
                    <div className="pm-boatCard__imgWrap">
                      <img src={img} alt={`${title}, ${loc}`} className="pm-boatCard__img" loading="lazy" />
                    </div>
                    <div className="pm-boatCard__body">
                      <h3 className="pm-boatCard__title">{title}</h3>
                      <p className="pm-boatCard__loc">{loc}</p>
                      <div className="pm-boatCard__foot">
                        <p className="pm-boatCard__price">
                          от {formatPriceRu(price)} ₽ / {unit}
                        </p>
                        <span className="pm-boatCard__arrow" aria-hidden>
                          →
                        </span>
                      </div>
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
    <section className="lp-section lp-featured" id="boats">
      <div className="lp-container">
        <div className="lp-featuredHead">
          <div>
            <h2 className="lp-sectionTitle">Популярные катера</h2>
          </div>
          <Link to="/boats" className="lp-viewMore">
            Смотреть все <span aria-hidden>→</span>
          </Link>
        </div>

        {import.meta.env.DEV && !API_BASE ? (
          <p className="lp-boatsDevHint">
            Локально: запросы идут через Vite proxy на бэкенд (:3000). Без бэкенда список будет пустым.
          </p>
        ) : null}

        {error ? <p className="lp-boatsError">Не удалось загрузить катера. Попробуйте позже.</p> : null}

        {loading ? (
          <div className="lp-featuredGrid lp-featuredGrid--skeleton" aria-busy="true">
            {Array.from({ length: GRID_LIMIT }).map((_, i) => (
              <div key={i} className="lp-boatCard lp-boatCard--skeleton" />
            ))}
          </div>
        ) : boats.length === 0 && !error ? (
          <p className="lp-boatsEmpty">Пока нет доступных катеров — загляните позже.</p>
        ) : (
          <div className="lp-featuredGrid">
            {boats.map((boat) => {
              const id = boat.id
              const title = boat.title || boat.type_name || 'Катер'
              const img = firstPhotoThumbUrl(boat, getPhotoUrl, getThumbUrl) || PLACEHOLDER
              const price = getMinDurationPrice(boat)
              const unit = minDurationLabelForBoat(boat)
              const loc = formatCardLocation(boat)
              return (
                <Link key={String(id)} to={boatDetailPath(boat)} className="lp-boatCard">
                  <div className="lp-boatImgWrap">
                    <img src={img} alt={`${title}, ${loc}`} className="lp-boatImg" loading="lazy" />
                  </div>
                  <div className="lp-boatBody">
                    <h3 className="lp-boatTitle">{title}</h3>
                    <p className="lp-boatPrice">
                      от {formatPriceRu(price)} ₽ / {unit}
                    </p>
                    <p className="lp-boatLoc">{loc}</p>
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
