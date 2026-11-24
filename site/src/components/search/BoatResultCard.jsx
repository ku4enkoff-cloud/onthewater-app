import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { getPhotoUrl, getThumbUrl } from '../../config'
import { useFavorites } from '../../context/FavoritesContext'
import { firstPhotoThumbUrl } from '../../boatUtils'
import { boatDetailPath } from '../../boatUrl'
import { getEffectiveMinDurationMinutes } from '../../boatUtils'
import {
  formatCardLocationCaps,
  formatDurationChipLabel,
  getBookingPeriodLabel,
  getExactPriceForDuration,
  pluralizeBookings,
  pluralizeReviews,
} from '../../boatSearchUtils'

const PLACEHOLDER = 'https://placehold.co/600x380/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'

function AppTrophyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8 6H5.5A2.5 2.5 0 0 0 8 10.2M16 6h2.5A2.5 2.5 0 0 1 16 10.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M12 13.2V16M9.5 20h5M10.2 16.5h3.6V20h-3.6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function ratingLabelOf(boat) {
  const ratingNum = Number(boat?.rating)
  if (!Number.isFinite(ratingNum)) return '0'
  return String(Math.round(ratingNum * 10) / 10).replace(/\.0$/, '')
}

function photoCount(boat) {
  let p = boat?.photos
  if (typeof p === 'string') {
    try {
      p = JSON.parse(p)
    } catch {
      p = []
    }
  }
  return Array.isArray(p) ? p.length : 0
}

export default function BoatResultCard({ boat, filters, selected, onHover, onLeave, layout = 'card' }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = boat?.id != null && isFavorite(boat.id)
  const img = firstPhotoThumbUrl(boat, getPhotoUrl, getThumbUrl) || PLACEHOLDER
  const nPhotos = photoCount(boat)
  const instantBook = boat.instant_booking !== false
  const hasTopOwner = Number(boat.rating) >= 4.8 && !instantBook
  const activeDuration = filters?.duration || getEffectiveMinDurationMinutes(boat)
  const activePrice =
    getExactPriceForDuration(boat, activeDuration) ?? (Number(boat.price_per_hour) || 0)
  const durLabel = formatDurationChipLabel(activeDuration)
  const isRow = layout === 'row'
  const isEditorial = layout === 'editorial'
  const loc = formatCardLocationCaps(boat)
  const locShort = (
    String(boat?.location_city || boat?.locationCity || '').trim() || loc
  ).toUpperCase()

  if (layout === 'app') {
    const veteran = Number(boat.rating) >= 4.8
    return (
      <article className="bs-card bs-card--app">
        <div className="bs-card__imageWrap">
          <Link to={boatDetailPath(boat)} className="bs-card__mediaLink">
            <img
              src={img}
              alt={`${boat.title || 'Катер'}, ${loc}`}
              className="bs-card__image"
              loading="lazy"
            />
          </Link>
          <button
            type="button"
            className={`bs-card__heart${fav ? ' is-on' : ''}`}
            aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={fav}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(boat)
            }}
          >
            <Heart size={18} fill={fav ? '#ef4444' : 'none'} color={fav ? '#ef4444' : '#111827'} strokeWidth={1.8} />
          </button>
          {nPhotos > 0 ? <div className="bs-card__photoCount bs-card__photoCount--app">1/{nPhotos}</div> : null}
          <div className="bs-card__priceBadge bs-card__priceBadge--app">
            <span className="bs-card__priceMain">от {activePrice.toLocaleString('ru-RU')} ₽</span>
            <span className="bs-card__priceUnit">/{durLabel}</span>
          </div>
        </div>
        <Link to={boatDetailPath(boat)} className="bs-card__body">
          <div className="bs-card__appLoc">
            {veteran ? (
              <span className="bs-card__veteran">
                <AppTrophyIcon />
                Бывалый
              </span>
            ) : null}
            <span className="bs-card__location">{loc}</span>
          </div>
          <div className="bs-card__appTitleRow">
            <h3 className="bs-card__title">{boat.title || 'Катер'}</h3>
            <div className="bs-card__appRating">
              <div className="bs-card__ratingLine">
                <span className="bs-card__star" aria-hidden>
                  ★
                </span>
                <span className="bs-card__ratingNum">{ratingLabelOf(boat)}</span>
                <span className="bs-card__reviews">
                  ({boat.reviews_count ?? 0} {pluralizeReviews(boat.reviews_count ?? 0)})
                </span>
              </div>
              <div className="bs-card__bookings">
                {boat.bookings_count ?? 0} {pluralizeBookings(boat.bookings_count ?? 0)}
              </div>
            </div>
          </div>
          <p className="bs-card__meta">
            До {boat.capacity ?? '—'} гостей
            {boat.captain_included ? ' · С капитаном' : ''}
          </p>
        </Link>
      </article>
    )
  }

  return (
    <article
      id={boat.id != null ? `bs-boat-${boat.id}` : undefined}
      className={`bs-card${selected ? ' bs-card--selected' : ''}${isRow ? ' bs-card--row' : ''}${isEditorial ? ' bs-card--ed' : ''}`}
      onMouseEnter={() => onHover?.(boat.id)}
      onMouseLeave={() => onLeave?.()}
    >
      <Link to={boatDetailPath(boat)} className="bs-card__link">
        <div className="bs-card__imageWrap">
          <img
            src={img}
            alt={`${boat.title || 'Катер'}, ${loc}`}
            className="bs-card__image"
            loading="lazy"
          />
          {!isRow && !isEditorial && instantBook ? (
            <div className="bs-card__badge bs-card__badge--instant">
              <span className="bs-card__zap" aria-hidden>
                ⚡
              </span>
              Мгновенно
            </div>
          ) : null}
          {!isRow && !isEditorial && nPhotos > 0 ? (
            <div className="bs-card__photoCount">1/{nPhotos}</div>
          ) : null}
          {!isRow && !isEditorial ? (
            <div className="bs-card__priceBadge">
              <span className="bs-card__priceMain">от {activePrice.toLocaleString('ru-RU')} ₽</span>
              <span className="bs-card__priceUnit">/{durLabel}</span>
            </div>
          ) : null}
        </div>
        <div className="bs-card__body">
          {isEditorial ? (
            <>
              <div className="bs-card__location">{locShort}</div>
              <h3 className="bs-card__title">{boat.title || 'Катер'}</h3>
              <div className="bs-card__edPrice">
                от {activePrice.toLocaleString('ru-RU')} ₽{' '}
                <span className="bs-card__edPriceUnit">/ {durLabel}</span>
              </div>
              <p className="bs-card__meta">
                ★ {boat.rating ?? 0} · до {boat.capacity ?? '—'} гостей
                {boat.captain_included ? ' · С капитаном' : ''}
              </p>
            </>
          ) : isRow ? (
            <>
              <div className="bs-card__rowTop">
                <h3 className="bs-card__title">{boat.title || 'Катер'}</h3>
                <div className="bs-card__rowPrice">
                  <span className="bs-card__priceMain">от {activePrice.toLocaleString('ru-RU')} ₽</span>
                  <span className="bs-card__priceUnit">/{durLabel}</span>
                </div>
              </div>
              <p className="bs-card__rowMeta">
                {loc}
                {boat.captain_included ? ' · С капитаном' : ''}
              </p>
              <div className="bs-card__ratingLine">
                <span className="bs-card__star" aria-hidden>
                  ★
                </span>
                <span className="bs-card__ratingNum">{boat.rating ?? 0}</span>
                <span className="bs-card__reviews">
                  ({boat.reviews_count ?? 0} {pluralizeReviews(boat.reviews_count ?? 0)})
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="bs-card__badgeRow">
                {hasTopOwner ? (
                  <span className="bs-card__topOwner">
                    <span aria-hidden>🏆</span> Бывалый
                  </span>
                ) : null}
                <span className="bs-card__location">{loc}</span>
              </div>
              <div className="bs-card__titleRow">
                <h3 className="bs-card__title">{boat.title || 'Катер'}</h3>
                <div className="bs-card__ratingBlock">
                  <div className="bs-card__ratingLine">
                    <span className="bs-card__star" aria-hidden>
                      ★
                    </span>
                    <span className="bs-card__ratingNum">{boat.rating ?? 0}</span>
                    <span className="bs-card__reviews">
                      ({boat.reviews_count ?? 0} {pluralizeReviews(boat.reviews_count ?? 0)})
                    </span>
                  </div>
                  <div className="bs-card__bookings">
                    {boat.bookings_count ?? 0} {pluralizeBookings(boat.bookings_count ?? 0)}
                  </div>
                </div>
              </div>
              <p className="bs-card__meta">
                {getBookingPeriodLabel(boat)} • до {boat.capacity ?? '—'} гостей
                {boat.captain_included ? ' • С капитаном' : ''}
              </p>
            </>
          )}
        </div>
      </Link>
    </article>
  )
}
