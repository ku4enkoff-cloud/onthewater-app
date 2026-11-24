import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronDown, ChevronLeft, Heart, MapPin, Share2, Smile, Star, Users } from 'lucide-react'
import { boatDetailPath } from '../../boatUrl'
import { getPhotoUrl, getThumbUrl } from '../../config'
import {
  firstPhotoThumbUrl,
  formatCardLocation,
  formatPriceRu,
  getMinDurationPrice,
  minDurationLabelForBoat,
} from '../../boatUtils'
import { formatDurationListLabel, getBoatAmenities, pluralizeBookings, pluralizeReviews } from '../../boatSearchUtils'

const WATER_SPORTS = ['Вейксерф', 'Вейкборд', 'Водные лыжи']
const PLACEHOLDER = 'https://placehold.co/800x500/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'

function ratingText(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return String(Math.round(n * 10) / 10).replace(/\.0$/, '')
}

function responseBadge(boat) {
  const raw = boat?.response_rate
  if (raw == null || !Number.isFinite(Number(raw))) {
    return { label: '—', bg: '#E5E7EB', fg: '#4B5563' }
  }
  const value = Math.round(Number(raw))
  if (value < 50) return { label: `${value}%`, bg: '#FEE2E2', fg: '#B91C1C' }
  if (value < 80) return { label: `${value}%`, bg: '#FFEDD5', fg: '#C2410C' }
  return { label: `${value}%`, bg: '#DCFCE7', fg: '#166534' }
}

function reviewMonth(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function MobileBoatDetail({
  boat,
  photos,
  photoIndex,
  onPhotoIndex,
  videos,
  reviews,
  favorite,
  onToggleFavorite,
  onShare,
  onOpenGallery,
  onOpenVideo,
  durationOptions,
  bookDuration,
  onDurationChange,
  selectedTierPrice,
  onBook,
  onMessage,
  chatBusy,
  similarBoats,
}) {
  const navigate = useNavigate()
  const trackRef = useRef(null)
  const [descOpen, setDescOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [specsOpen, setSpecsOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [tiersOpen, setTiersOpen] = useState(false)

  const title = boat.title || boat.type_name || 'Катер'
  const slides = photos.length ? photos : [PLACEHOLDER]
  const amenitiesAll = getBoatAmenities(boat)
  const waterSports = amenitiesAll.filter((name) => WATER_SPORTS.includes(name))
  const amenities = amenitiesAll.filter((name) => !WATER_SPORTS.includes(name))
  const shownAmenities = featuresOpen ? amenities : amenities.slice(0, 6)
  const desc = String(boat.description || '').trim()
  const descShort = desc.length > 160 ? `${desc.slice(0, 160).trim()}…` : desc
  const rules = String(boat.rules || '').trim()
  const rulesShort = rules.length > 160 ? `${rules.slice(0, 160).trim()}…` : rules
  const payment = String(boat.payment_policy || '').trim()
  const cancellation = String(boat.cancellation_policy || '').trim()
  const location = [
    boat.location_country,
    boat.location_region,
    boat.location_city,
    boat.location_address,
  ]
    .map((part) => (part != null ? String(part).trim() : ''))
    .filter(Boolean)
    .join(', ') || formatCardLocation(boat)
  const mapsHref =
    boat.lat != null && boat.lng != null
      ? `https://yandex.ru/maps/?pt=${boat.lng},${boat.lat}&z=16`
      : location && location !== '—'
        ? `https://yandex.ru/maps/?text=${encodeURIComponent(location)}`
        : null
  const rating = ratingText(boat.rating)
  const reviewCount = Array.isArray(reviews) ? reviews.length : Number(boat.reviews_count) || 0
  const bookingsN = Math.max(0, Number(boat.bookings_count) || 0)
  const badge = responseBadge(boat)
  const tiers = tiersOpen || durationOptions.length <= 4 ? durationOptions : durationOptions.slice(0, 4)
  const activeDuration = Number(bookDuration) || Number(durationOptions[0]?.duration) || 0
  const durationLabel = activeDuration > 0 ? formatDurationListLabel(activeDuration) : ''
  const avatarUrl = boat.owner_avatar ? getPhotoUrl(boat.owner_avatar) : null
  const veteran = Number(boat.rating) >= 4.8
  const staticMap =
    boat.lat != null && boat.lng != null
      ? `https://static-maps.yandex.ru/1.x/?ll=${boat.lng},${boat.lat}&size=650,180&z=13&l=map&pt=${boat.lng},${boat.lat},pm2rdm`
      : null

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const left = photoIndex * el.clientWidth
    if (Math.abs(el.scrollLeft - left) > 2) el.scrollTo({ left })
  }, [photoIndex])

  const onTrackScroll = (event) => {
    const el = event.currentTarget
    if (!el.clientWidth) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    if (next !== photoIndex) onPhotoIndex(next)
  }

  return (
    <div className="bd-app">
      <section className="bd-appGallery" aria-label="Фотографии катера">
        <div className="bd-appGallery__track" ref={trackRef} onScroll={onTrackScroll}>
          {slides.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              className="bd-appGallery__slide"
              onClick={() => onOpenGallery(index)}
              aria-label={`Открыть фото ${index + 1}`}
            >
              <img src={src} alt={`${title}, фото ${index + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
        <div className="bd-appGallery__shade" aria-hidden />
        <div className="bd-appGallery__nav">
          <button type="button" className="bd-appGallery__btn" aria-label="Назад" onClick={() => navigate(-1)}>
            <ChevronLeft size={22} />
          </button>
          <div className="bd-appGallery__navRight">
            <button type="button" className="bd-appGallery__btn" aria-label="Поделиться" onClick={onShare}>
              <Share2 size={18} />
            </button>
            <button
              type="button"
              className={`bd-appGallery__btn${favorite ? ' is-on' : ''}`}
              aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
              aria-pressed={favorite}
              onClick={onToggleFavorite}
            >
              <Heart size={18} fill={favorite ? '#ef4444' : 'none'} color={favorite ? '#ef4444' : '#1b365d'} />
            </button>
          </div>
        </div>
        {slides.length > 1 ? (
          <div className="bd-appGallery__count">
            {photoIndex + 1}/{slides.length}
          </div>
        ) : null}
        {slides.length > 1 && slides.length <= 10 ? (
          <div className="bd-appGallery__dots" aria-hidden>
            {slides.map((_, index) => (
              <span key={index} className={index === photoIndex ? 'is-on' : ''} />
            ))}
          </div>
        ) : null}
        {videos.length > 0 ? (
          <button type="button" className="bd-appGallery__video" onClick={onOpenVideo}>
            Видео: {videos.length}
          </button>
        ) : null}
      </section>

      <div className="bd-appBody">
        <h1 className="bd-appTitle">{title}</h1>
        {boat.type_name ? <p className="bd-appMuted">Тип судна: {boat.type_name}</p> : null}
        {waterSports.length > 0 ? (
          <p className="bd-appMuted">Водные виды спорта: {waterSports.join(', ')}</p>
        ) : null}
        {mapsHref ? (
          <a className="bd-appLoc" href={mapsHref} target="_blank" rel="noopener noreferrer">
            {location}
          </a>
        ) : (
          <p className="bd-appMuted">{location}</p>
        )}
        <p className="bd-appMuted">
          {bookingsN} {pluralizeBookings(bookingsN)}
        </p>
        <p className="bd-appRating">
          <Star size={16} fill="#fbbf24" color="#fbbf24" aria-hidden />
          <strong>{rating}</strong>
          <span>
            ({reviewCount} {pluralizeReviews(reviewCount)})
          </span>
        </p>

        <div className="bd-appInfo" aria-label="Кратко о катере">
          <div className="bd-appInfo__cell">
            <span className="bd-appInfo__badge" style={{ background: badge.bg, color: badge.fg }}>
              {badge.label}
            </span>
            <span>Скорость ответа</span>
          </div>
          <button
            type="button"
            className="bd-appInfo__cell"
            onClick={() => document.getElementById('bd-app-know')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <span className={`bd-appInfo__badge${cancellation ? ' is-yes' : ''}`}>{cancellation ? 'Есть' : 'Нет'}</span>
            <span>Политика отмены</span>
          </button>
          <div className="bd-appInfo__cell">
            <Users size={22} aria-hidden />
            <span>До {boat.capacity || '—'} гостей</span>
          </div>
          <div className="bd-appInfo__cell">
            <Smile size={22} aria-hidden />
            <span>{boat.captain_included ? 'С капитаном' : 'Без капитана'}</span>
          </div>
        </div>

        <section className="bd-appSection">
          <h2>Описание</h2>
          <p>{desc ? (descOpen ? desc : descShort) : 'Владелец пока не добавил описание.'}</p>
          {desc.length > 160 ? (
            <button type="button" className="bd-appLink" onClick={() => setDescOpen((open) => !open)}>
              {descOpen ? 'Свернуть' : 'Подробнее'}
            </button>
          ) : null}
        </section>

        {amenities.length > 0 ? (
          <>
            <hr className="bd-app__rule" />
            <section className="bd-appSection">
              <h2>Удобства</h2>
              <ul className="bd-appAmenities">
                {shownAmenities.map((name) => (
                  <li key={name}>
                    <Check size={18} aria-hidden />
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
              {amenities.length > 6 ? (
                <button type="button" className="bd-appLink" onClick={() => setFeaturesOpen((open) => !open)}>
                  {featuresOpen ? 'Скрыть' : 'Показать все'}
                </button>
              ) : null}
            </section>
          </>
        ) : null}

        <hr className="bd-app__rule" />
        <button type="button" className="bd-appFold" aria-expanded={specsOpen} onClick={() => setSpecsOpen((open) => !open)}>
          <span>Характеристики</span>
          <ChevronDown size={22} className={specsOpen ? 'is-open' : ''} aria-hidden />
        </button>
        {specsOpen ? (
          <dl className="bd-appSpecs">
            {boat.manufacturer ? (
              <div>
                <dt>Производитель</dt>
                <dd>{boat.manufacturer}</dd>
              </div>
            ) : null}
            {boat.model ? (
              <div>
                <dt>Модель</dt>
                <dd>{boat.model}</dd>
              </div>
            ) : null}
            <div>
              <dt>Год выпуска</dt>
              <dd>{boat.year || '—'}</dd>
            </div>
            <div>
              <dt>Вместимость</dt>
              <dd>{boat.capacity ? `${boat.capacity} гостей` : '—'}</dd>
            </div>
            <div>
              <dt>Длина</dt>
              <dd>{boat.length_m ? `${String(boat.length_m).replace(',', '.')} м` : '—'}</dd>
            </div>
            <div>
              <dt>Тип судна</dt>
              <dd>{boat.type_name || '—'}</dd>
            </div>
          </dl>
        ) : null}

        <hr className="bd-app__rule" />
        <section className="bd-appSection">
          <h2>Варианты бронирования</h2>
          <div className="bd-appTiers">
            <p>{boat.captain_included ? 'С капитаном' : 'Аренда'}</p>
            {tiers.map((tier, index) => {
              const selected = String(tier.duration) === String(bookDuration)
              return (
                <button
                  key={tier.duration}
                  type="button"
                  className={selected ? 'is-on' : ''}
                  onClick={() => onDurationChange(String(tier.duration))}
                >
                  <span>{formatDurationListLabel(tier.duration)}</span>
                  <strong className={index === 0 ? 'is-base' : ''}>{formatPriceRu(tier.price)} ₽</strong>
                </button>
              )
            })}
          </div>
          {durationOptions.length > 4 ? (
            <button type="button" className="bd-appMore" onClick={() => setTiersOpen((open) => !open)}>
              {tiersOpen ? 'Скрыть' : 'Показать все'}
            </button>
          ) : null}
        </section>

        <hr className="bd-app__rule" />
        <section className="bd-appSection">
          <div className="bd-appSection__row">
            <h2>Отзывы</h2>
            <p className="bd-appRating bd-appRating--sm">
              <Star size={15} fill="#fbbf24" color="#fbbf24" aria-hidden />
              <strong>{rating}</strong>
              <span>({reviewCount} оценок)</span>
            </p>
          </div>
          {reviews.length > 0 ? (
            <div className="bd-appReviews">
              {reviews.slice(0, 5).map((review, index) => {
                const author = String(review.user_name || 'Гость').trim() || 'Гость'
                const stars = Math.min(5, Math.max(0, Number(review.rating) || 0))
                return (
                  <article key={review.id ?? index} className="bd-appReview">
                    <header>
                      <span className="bd-appReview__avatar" aria-hidden>
                        {author.charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <strong>{author}</strong>
                        <small>{reviewMonth(review.created_at)}</small>
                      </span>
                      <em>
                        {index + 1}/{reviews.length}
                      </em>
                    </header>
                    <p className="bd-appReview__stars" aria-label={`Оценка ${stars} из 5`}>
                      {Array.from({ length: 5 }, (_, star) => (
                        <Star
                          key={star}
                          size={14}
                          color={star < stars ? '#fbbf24' : '#d1d5db'}
                          fill={star < stars ? '#fbbf24' : 'transparent'}
                        />
                      ))}
                    </p>
                    {review.text ? <p>{review.text}</p> : null}
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="bd-appEmpty">Пока нет отзывов</p>
          )}
        </section>

        <hr className="bd-app__rule" />
        <section className="bd-appSection">
          <h2>Расположение</h2>
          {staticMap ? (
            <a className="bd-appMap" href={mapsHref} target="_blank" rel="noopener noreferrer">
              <img src={staticMap} alt="Карта: расположение катера" />
            </a>
          ) : (
            <div className="bd-appMap bd-appMap--empty">
              <MapPin size={28} aria-hidden />
            </div>
          )}
          <p className="bd-appAddress">
            <MapPin size={18} aria-hidden />
            <span>{location}</span>
          </p>
          {boat.location_yacht_club ? <p className="bd-appMuted">Яхт-клуб: {boat.location_yacht_club}</p> : null}
        </section>

        <hr className="bd-app__rule" />
        <section className="bd-appSection">
          <h2>Владелец</h2>
          <div className="bd-appOwner">
            <div>
              <strong>{boat.owner_name || 'Владелец'}</strong>
              <p>
                {veteran ? <span className="bd-appVeteran">Бывалый</span> : null}
                <Star size={14} fill="#fbbf24" color="#fbbf24" aria-hidden />
                {rating} ({reviewCount} оценок)
              </p>
            </div>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" />
            ) : (
              <span className="bd-appOwner__ph" aria-hidden>
                {(boat.owner_name || 'В').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <button type="button" className="bd-appMsg" disabled={chatBusy} onClick={onMessage}>
            {chatBusy ? 'Открываем чат…' : 'Написать владельцу'}
          </button>
        </section>

        <hr className="bd-app__rule" />
        <section className="bd-appSection" id="bd-app-know">
          <h2>Важно знать</h2>
          {payment ? (
            <div>
              <h3>Порядок оплаты</h3>
              <p>{payment}</p>
            </div>
          ) : null}
          {rules ? (
            <div>
              <h3>Правила поведения на катере</h3>
              <p>{rulesOpen ? rules : rulesShort}</p>
              {rules.length > 160 ? (
                <button type="button" className="bd-appLink" onClick={() => setRulesOpen((open) => !open)}>
                  {rulesOpen ? 'Свернуть' : 'Подробнее'}
                </button>
              ) : null}
            </div>
          ) : null}
          {cancellation ? (
            <div>
              <h3>Условия отмены бронирования</h3>
              <p>{cancellation}</p>
            </div>
          ) : null}
          {!payment && !rules && !cancellation ? <p>Информация не указана.</p> : null}
        </section>

        {similarBoats.length > 0 ? (
          <>
            <hr className="bd-app__rule" />
            <section className="bd-appSection">
              <h2>Похожие катера</h2>
              <div className="bd-appSimilar">
                {similarBoats.map((item) => {
                  const photo = firstPhotoThumbUrl(item, getPhotoUrl, getThumbUrl) || PLACEHOLDER
                  const price = getMinDurationPrice(item)
                  return (
                    <Link key={item.id} to={boatDetailPath(item)} className="bd-appSimilar__card">
                      <span className="bd-appSimilar__photo">
                        <img src={photo} alt="" />
                        {price > 0 ? <em>от {formatPriceRu(price)} ₽</em> : null}
                      </span>
                      <span className="bd-appSimilar__city">{(item.location_city || formatCardLocation(item) || '').toUpperCase()}</span>
                      <strong>{item.title || 'Катер'}</strong>
                      <small>
                        До {item.capacity ?? '—'} гостей
                        {item.captain_included ? ' · С капитаном' : ''}
                      </small>
                    </Link>
                  )
                })}
              </div>
            </section>
          </>
        ) : null}
      </div>

      <div className="bd-appBar">
        <div>
          <strong>от {formatPriceRu(selectedTierPrice)} ₽</strong>
          <span>{durationLabel || minDurationLabelForBoat(boat)}</span>
        </div>
        <button type="button" onClick={onBook}>
          Забронировать
        </button>
      </div>
    </div>
  )
}
