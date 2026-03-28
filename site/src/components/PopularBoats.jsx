import { useEffect, useState } from 'react'
import { fetchPopularBoats } from '../api/boats'
import { API_BASE, SITE_MAIN_URL, getPhotoUrl } from '../config'
import {
  firstPhotoUrl,
  formatCardLocation,
  formatPriceRu,
  getMinDurationPrice,
  minDurationLabel,
} from '../boatUtils'

const PLACEHOLDER = 'https://placehold.co/600x380/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'
const GRID_LIMIT = 4
const FETCH_LIMIT = 20

export default function PopularBoats() {
  const [boats, setBoats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  return (
    <section className="lp-section lp-featured" id="boats">
      <div className="lp-container">
        <div className="lp-featuredHead">
          <div>
            <h2 className="lp-sectionTitle">Популярные катера</h2>
            <p className="lp-sectionItalic">Варианты рядом с вами</p>
          </div>
          <a href={SITE_MAIN_URL} className="lp-viewMore" target="_blank" rel="noopener noreferrer">
            Смотреть все <span aria-hidden>→</span>
          </a>
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
              const img = firstPhotoUrl(boat, getPhotoUrl) || PLACEHOLDER
              const price = getMinDurationPrice(boat)
              const unit = minDurationLabel(boat)
              const loc = formatCardLocation(boat)
              return (
                <article key={String(id)} className="lp-boatCard">
                  <div className="lp-boatImgWrap">
                    <img src={img} alt="" className="lp-boatImg" loading="lazy" />
                  </div>
                  <div className="lp-boatBody">
                    <h3 className="lp-boatTitle">{title}</h3>
                    <p className="lp-boatPrice">
                      от {formatPriceRu(price)} ₽ / {unit}
                    </p>
                    <p className="lp-boatLoc">{loc}</p>
                    <div className="lp-boatFooter">
                      <a
                        href={SITE_MAIN_URL}
                        className="lp-boatBtn"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Подробнее
                      </a>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
