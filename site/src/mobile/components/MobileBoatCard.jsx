import { Link } from 'react-router-dom'
import { Heart, MapPin } from 'lucide-react'
import { boatDetailPath } from '../../boatUrl'
import { formatCardLocation, formatPriceRu, getMinDurationPrice, minDurationLabel } from '../../boatUtils'
import { getListPhotoUrl } from '../../config'
import { useFavorites } from '../../context/FavoritesContext'

const PLACEHOLDER = 'https://placehold.co/600x400/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'

export default function MobileBoatCard({ boat, horizontal = false }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  if (!boat) return null
  const fav = isFavorite(boat.id)
  const photo =
    getListPhotoUrl(
      Array.isArray(boat.photos)
        ? typeof boat.photos[0] === 'string'
          ? boat.photos[0]
          : boat.photos[0]?.url
        : null,
    ) || PLACEHOLDER
  const price = getMinDurationPrice(boat)
  const dur = minDurationLabel(boat)
  const to = boatDetailPath(boat)

  return (
    <article className={`mapp-boatCard${horizontal ? ' mapp-boatCard--h' : ''}`}>
      <Link to={to} className="mapp-boatCard__media">
        <img src={photo} alt={boat.title || 'Катер'} loading="lazy" />
        <button
          type="button"
          className={`mapp-boatCard__heart${fav ? ' is-on' : ''}`}
          aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleFavorite(boat)
          }}
        >
          <Heart size={18} fill={fav ? '#ef4444' : 'none'} color={fav ? '#ef4444' : '#fff'} />
        </button>
      </Link>
      <Link to={to} className="mapp-boatCard__body">
        <h3 className="mapp-boatCard__title">{boat.title || boat.type_name || 'Катер'}</h3>
        <p className="mapp-boatCard__loc">
          <MapPin size={14} />
          <span>{formatCardLocation(boat)}</span>
        </p>
        <p className="mapp-boatCard__price">
          {price != null ? (
            <>
              от {formatPriceRu(price)} ₽{dur ? ` / ${dur}` : ''}
            </>
          ) : (
            'Цена по запросу'
          )}
        </p>
      </Link>
    </article>
  )
}
