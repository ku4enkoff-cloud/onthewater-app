import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MapPin, Ship } from 'lucide-react'
import { fetchBoatById } from '../../api/boats'
import { getPhotoUrl } from '../../config'
import { boatDetailPath } from '../../boatUrl'
import {
  firstPhotoUrl,
  formatCardLocation,
  formatPriceRu,
  getMinDurationPrice,
  minDurationLabelForBoat,
} from '../../boatUtils'
import { useFavorites } from '../../context/FavoritesContext'

function FavPhoto({ src }) {
  const [failed, setFailed] = useState(false)
  return src && !failed ? (
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <Ship size={32} strokeWidth={1.3} aria-hidden />
  )
}

export default function AccountFavorites() {
  const { favoriteBoats, removeFavorite } = useFavorites()
  const [boats, setBoats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const next = await Promise.all(
        favoriteBoats.map(async (b) => {
          if (b?.title || b?.photos) return b
          try {
            return (await fetchBoatById(b.id)) || b
          } catch {
            return b
          }
        }),
      )
      if (!cancelled) {
        setBoats(next.filter(Boolean))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [favoriteBoats])

  return (
    <section className="acc-section" aria-labelledby="acc-fav-title">
      <h1 id="acc-fav-title" className="acc-title">
        Избранное
      </h1>

      {loading ? (
        <p className="acc-muted">Загружаем…</p>
      ) : boats.length === 0 ? (
        <div className="acc-empty">
          <p>Пока нет избранных катеров. Добавляйте их сердечком в каталоге.</p>
          <Link className="acc-btn" to="/boats">
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="acc-favs">
          {boats.map((boat) => {
            const photo = firstPhotoUrl(boat, getPhotoUrl)
            const price = getMinDurationPrice(boat)
            const location = formatCardLocation(boat)
            return (
              <article key={boat.id} className="acc-fav">
                <Link className="acc-fav__photo" to={boatDetailPath(boat)}>
                  <FavPhoto src={photo} />
                </Link>
                <button
                  type="button"
                  className="acc-fav__heart"
                  onClick={() => removeFavorite(boat.id)}
                  aria-label="Убрать из избранного"
                  title="Убрать из избранного"
                >
                  <Heart size={17} fill="currentColor" />
                </button>
                <div className="acc-fav__body">
                  <Link className="acc-fav__title" to={boatDetailPath(boat)}>
                    {boat.title || boat.type_name || 'Катер'}
                  </Link>
                  {location ? (
                    <p className="acc-fav__loc">
                      <MapPin size={14} aria-hidden />
                      {location}
                    </p>
                  ) : null}
                  {price > 0 ? (
                    <p className="acc-fav__price">
                      от {formatPriceRu(price)} ₽ <span>/ {minDurationLabelForBoat(boat)}</span>
                    </p>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
