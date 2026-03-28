import { SITE_MAIN_URL, getPhotoUrl } from '../../config'
import { firstPhotoUrl } from '../../boatUtils'
import {
  formatCardLocationCaps,
  formatDurationChipLabel,
  getBookingPeriodLabel,
  getExactPriceForDuration,
  pluralizeBookings,
  pluralizeReviews,
} from '../../boatSearchUtils'

const PLACEHOLDER = 'https://placehold.co/600x380/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'

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

export default function BoatResultCard({ boat, filters, selected, onHover, onLeave }) {
  const img = firstPhotoUrl(boat, getPhotoUrl) || PLACEHOLDER
  const nPhotos = photoCount(boat)
  const instantBook = boat.instant_booking !== false
  const hasTopOwner = Number(boat.rating) >= 4.8 && !instantBook
  const activeDuration = filters.duration || (Number(boat.schedule_min_duration) || 60)
  const activePrice =
    getExactPriceForDuration(boat, activeDuration) ?? (Number(boat.price_per_hour) || 0)
  const durLabel = formatDurationChipLabel(activeDuration)

  return (
    <article
      className={`bs-card${selected ? ' bs-card--selected' : ''}`}
      onMouseEnter={() => onHover?.(boat.id)}
      onMouseLeave={() => onLeave?.()}
    >
      <a
        href={SITE_MAIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="bs-card__link"
      >
        <div className="bs-card__imageWrap">
          <img src={img} alt="" className="bs-card__image" loading="lazy" />
          {instantBook ? (
            <div className="bs-card__badge bs-card__badge--instant">
              <span className="bs-card__zap" aria-hidden>
                ⚡
              </span>
              Мгновенно
            </div>
          ) : null}
          {nPhotos > 0 ? (
            <div className="bs-card__photoCount">
              1/{nPhotos}
            </div>
          ) : null}
          <div className="bs-card__priceBadge">
            <span className="bs-card__priceMain">от {activePrice.toLocaleString('ru-RU')} ₽</span>
            <span className="bs-card__priceUnit">/{durLabel}</span>
          </div>
        </div>
        <div className="bs-card__body">
          <div className="bs-card__badgeRow">
            {hasTopOwner ? (
              <span className="bs-card__topOwner">
                <span aria-hidden>🏆</span> Бывалый
              </span>
            ) : null}
            <span className="bs-card__location">{formatCardLocationCaps(boat)}</span>
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
        </div>
      </a>
    </article>
  )
}
