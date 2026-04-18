import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { boatDetailPath, boatUrlSegment, parseBoatUrlParam } from '../boatUrl'
import { Link, useNavigate, useParams } from 'react-router-dom'
import './boatDetail.css'
import { fetchBoatById, fetchBoatReviews } from '../api/boats'
import { SITE_MAIN_URL, getPhotoUrl } from '../config'
import {
  allPhotoUrls,
  formatCardLocation,
  formatPriceRu,
  getMinDurationPrice,
  minDurationLabel,
} from '../boatUtils'
import {
  getBoatAmenities,
  getBookingPeriodLabel,
  pluralizeBookings,
  pluralizeReviews,
} from '../boatSearchUtils'
import BookingCalendarModal, { formatBookingDateRu } from '../components/booking/BookingCalendarModal.jsx'

const PLACEHOLDER = 'https://placehold.co/1200x750/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'
const DESC_PREVIEW = 480
const FAVORITES_STORAGE_KEY = 'boatrent_site_favorites'

function siteBaseUrl() {
  return SITE_MAIN_URL.replace(/\/$/, '')
}

function DetailPageHeader({ bookDate, onOpenCalendar, showCalendar }) {
  const base = siteBaseUrl()
  return (
    <header className="bd-topBar">
      <div className="bd-topBar__left">
        <Link to="/" className="bd-topBar__logo" aria-label="ONTHEWATER — на главную">
          <span className="bd-topBar__logoMark" aria-hidden />
          <span className="bd-topBar__logoText">onthewater</span>
        </Link>
      </div>
      <nav className="bd-topBar__nav" aria-label="Разделы сайта">
        {showCalendar ? (
          <button type="button" className="bd-topBar__pill" onClick={onOpenCalendar} aria-label="Выбрать дату бронирования">
            <span className="bd-topBar__pillIcon" aria-hidden>
              📅
            </span>
            <span>{formatBookingDateRu(bookDate)}</span>
          </button>
        ) : null}
        <Link to="/boats" className="bd-topBar__link">
          Поиск катеров
        </Link>
        <a className="bd-topBar__link" href={`${base}/register`} target="_blank" rel="noopener noreferrer">
          Регистрация
        </a>
        <a className="bd-topBar__link" href={`${base}/login`} target="_blank" rel="noopener noreferrer">
          Войти
        </a>
      </nav>
    </header>
  )
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parsePriceTiers(boat) {
  let tiers = boat?.price_tiers
  if (typeof tiers === 'string') {
    try {
      tiers = JSON.parse(tiers)
    } catch {
      tiers = []
    }
  }
  if (!Array.isArray(tiers)) return []
  return tiers
    .map((t) => ({
      duration: Number(t?.duration) || 0,
      price: Number(t?.price) || 0,
    }))
    .filter((t) => t.duration > 0 && t.price > 0)
    .sort((a, b) => a.duration - b.duration)
}

function parseVideoUrls(boat) {
  let videos = boat?.video_uris
  if (typeof videos === 'string') {
    try {
      videos = JSON.parse(videos)
    } catch {
      videos = []
    }
  }
  if (!Array.isArray(videos)) return []
  return videos
    .map((src) => getPhotoUrl(src))
    .filter((src, idx, arr) => typeof src === 'string' && src.trim() && arr.indexOf(src) === idx)
}

function formatReviewDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function BoatDetailPage() {
  /** В App.jsx параметр называется :boatId (значение вида "12" или "12-nazvanie-katera"). */
  const { boatId: routeSegment, boatSlug: routeSlugAlt } = useParams()
  const routeSegmentResolved = (routeSlugAlt ?? routeSegment ?? '').trim()
  const navigate = useNavigate()
  const resolvedId = useMemo(() => parseBoatUrlParam(routeSegmentResolved), [routeSegmentResolved])
  const [boat, setBoat] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [descOpen, setDescOpen] = useState(false)
  const [bookDate, setBookDate] = useState(todayISO)
  const [bookDuration, setBookDuration] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const galleryTouchRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!resolvedId) return
    try {
      const list = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]')
      const ids = Array.isArray(list) ? list.map(Number) : []
      setFavorite(ids.includes(Number(resolvedId)))
    } catch {
      setFavorite(false)
    }
  }, [resolvedId])

  const toggleFavorite = useCallback(() => {
    if (!resolvedId) return
    const id = Number(resolvedId)
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
      const parsed = JSON.parse(raw || '[]')
      const list = Array.isArray(parsed) ? parsed.map(Number) : []
      const idx = list.indexOf(id)
      const next = idx >= 0 ? list.filter((x) => x !== id) : [...list, id]
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next))
      setFavorite(idx < 0)
    } catch {
      /* ignore */
    }
  }, [resolvedId])

  const handleShare = useCallback(async () => {
    if (!boat) return
    const path = boatDetailPath(boat)
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}` : path
    try {
      if (navigator.share) {
        await navigator.share({ title: boat.title || 'Катер', url })
        return
      }
    } catch {
      /* ignore */
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [boat])

  const load = useCallback(async () => {
    if (!resolvedId) {
      setBoat(null)
      setReviews([])
      setError('notfound')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [b, rev] = await Promise.all([fetchBoatById(resolvedId), fetchBoatReviews(resolvedId)])
      if (!b) {
        setBoat(null)
        setReviews([])
        setError('notfound')
        return
      }
      setBoat(b)
      setReviews(rev)
      setPhotoIndex(0)
      const minD = Number(b.schedule_min_duration) || 60
      setBookDuration(String(minD))
    } catch (e) {
      setError(e?.message || 'load')
      setBoat(null)
    } finally {
      setLoading(false)
    }
  }, [resolvedId])

  useEffect(() => {
    load()
  }, [load])

  /** Канонический URL с актуальным slug из названия (старые ссылки /boats/5 тоже работают). */
  useEffect(() => {
    if (!boat || !routeSegmentResolved) return
    const seg = boatUrlSegment(boat)
    if (seg && routeSegmentResolved !== seg) {
      navigate(boatDetailPath(boat), { replace: true })
    }
  }, [boat, routeSegmentResolved, navigate])

  const photos = useMemo(() => {
    if (!boat) return [PLACEHOLDER]
    const urls = allPhotoUrls(boat, getPhotoUrl)
    return urls.length > 0 ? urls : [PLACEHOLDER]
  }, [boat])
  const videos = useMemo(() => (boat ? parseVideoUrls(boat) : []), [boat])

  const tiers = useMemo(() => (boat ? parsePriceTiers(boat) : []), [boat])

  useEffect(() => {
    if (!boat || tiers.length === 0) return
    const minD = Number(boat.schedule_min_duration) || 60
    const has = tiers.some((t) => t.duration === minD)
    setBookDuration(String(has ? minD : tiers[0].duration))
  }, [boat, tiers])

  const selectedTierPrice = useMemo(() => {
    if (!boat) return 0
    const d = Number(bookDuration) || Number(boat.schedule_min_duration) || 60
    const t = tiers.find((x) => x.duration === d)
    if (t) return t.price
    return getMinDurationPrice(boat)
  }, [boat, bookDuration, tiers])

  const appBookingUrl = useMemo(() => {
    const base = SITE_MAIN_URL.replace(/\/$/, '')
    const q = new URLSearchParams()
    if (resolvedId) q.set('boat', String(resolvedId))
    const s = q.toString()
    return s ? `${base}/?${s}` : `${base}/`
  }, [resolvedId])

  const onGalleryTouchStart = useCallback((e) => {
    const t = e.changedTouches[0]
    if (!t) return
    galleryTouchRef.current = { x: t.clientX, y: t.clientY }
  }, [])

  const onGalleryTouchEnd = useCallback(
    (e) => {
      const n = photos.length
      if (n < 2) return
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - galleryTouchRef.current.x
      const dy = t.clientY - galleryTouchRef.current.y
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return
      if (dx < 0) setPhotoIndex((i) => (i >= n - 1 ? 0 : i + 1))
      else setPhotoIndex((i) => (i <= 0 ? n - 1 : i - 1))
    },
    [photos.length],
  )

  if (loading) {
    return (
      <div className="bd-page">
        <DetailPageHeader showCalendar={false} />
        <div className="bd-loading">Загружаем катер…</div>
      </div>
    )
  }

  if (error === 'notfound' || !boat) {
    return (
      <div className="bd-page">
        <DetailPageHeader showCalendar={false} />
        <div className="bd-error">
          <p>Катер не найден или снят с публикации.</p>
          <p>
            <Link to="/boats">Вернуться к поиску</Link>
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bd-page">
        <DetailPageHeader showCalendar={false} />
        <div className="bd-error">
          <p>Не удалось загрузить данные. Попробуйте позже.</p>
          <p>
            <Link to="/boats">К поиску катеров</Link>
          </p>
        </div>
      </div>
    )
  }

  const title = boat.title || boat.type_name || 'Катер'
  const loc = formatCardLocation(boat)
  const lengthStr =
    boat.length_m != null && String(boat.length_m).trim() !== ''
      ? `${String(boat.length_m).replace(',', '.')} м`
      : '—'
  const capacity = boat.capacity != null ? String(boat.capacity) : '—'
  const desc = (boat.description || '').trim()
  const descLong = desc.length > DESC_PREVIEW
  const amenities = getBoatAmenities(boat)
  const ownerInitial = (boat.owner_name || 'В')[0].toUpperCase()
  const avatarUrl = boat.owner_avatar ? getPhotoUrl(boat.owner_avatar) : null
  const responseRate =
    boat.response_rate != null && Number.isFinite(Number(boat.response_rate))
      ? Math.round(Number(boat.response_rate))
      : null
  const bookingsN = Math.max(0, Number(boat.bookings_count) || 0)

  const prevPhoto = () => setPhotoIndex((i) => (i <= 0 ? photos.length - 1 : i - 1))
  const nextPhoto = () => setPhotoIndex((i) => (i >= photos.length - 1 ? 0 : i + 1))

  const durationOptions =
    tiers.length > 0
      ? tiers
      : [{ duration: Number(boat.schedule_min_duration) || 60, price: getMinDurationPrice(boat) }]

  return (
    <div className="bd-page bd-page--bs">
      <DetailPageHeader
        bookDate={bookDate}
        onOpenCalendar={() => setCalendarOpen(true)}
        showCalendar
      />

      <BookingCalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={bookDate}
        minDate={todayISO()}
        onApply={(iso) => setBookDate(iso)}
      />

      <div className="bd-shell">
        <div className="bd-topZone">
          <div className={photos.length > 1 ? 'bd-galleryBs bd-galleryBs--split' : 'bd-galleryBs'}>
            <div className="bd-galleryBs__grid">
              <div
                className="bd-galleryBs__main"
                role="region"
                aria-label="Фотографии катера"
                onTouchStart={onGalleryTouchStart}
                onTouchEnd={onGalleryTouchEnd}
              >
                <img
                  src={photos[photoIndex]}
                  alt=""
                  className="bd-galleryBs__img bd-galleryBs__img--main"
                  loading="eager"
                  decoding="async"
                />
                {boat.instant_booking !== false ? (
                  <div className="bd-galleryBs__badge">
                    <span aria-hidden>⚡</span> Мгновенное бронирование
                  </div>
                ) : null}
                <div className="bd-galleryBs__actions">
                  <button
                    type="button"
                    className="bd-galleryBs__fab"
                    onClick={toggleFavorite}
                    aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
                    aria-pressed={favorite}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                      {favorite ? (
                        <path
                          fill="currentColor"
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        />
                      ) : (
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                        />
                      )}
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="bd-galleryBs__fab"
                    onClick={handleShare}
                    aria-label={shareCopied ? 'Ссылка скопирована' : 'Поделиться'}
                    title={shareCopied ? 'Ссылка скопирована' : 'Поделиться'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path
                        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                {photos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      className="bd-galleryBs__nav bd-galleryBs__nav--prev"
                      onClick={prevPhoto}
                      aria-label="Предыдущее фото"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="bd-galleryBs__nav bd-galleryBs__nav--next"
                      onClick={nextPhoto}
                      aria-label="Следующее фото"
                    >
                      ›
                    </button>
                    <div className="bd-galleryBs__counter" aria-live="polite">
                      {photoIndex + 1} / {photos.length}
                    </div>
                  </>
                ) : null}
              </div>
              {photos.length > 1 ? (
                <div className="bd-galleryBs__sideCol">
                  <button
                    type="button"
                    className="bd-galleryBs__side"
                    onClick={nextPhoto}
                    aria-label="Следующее фото (превью)"
                  >
                    <img src={photos[(photoIndex + 1) % photos.length]} alt="" className="bd-galleryBs__img bd-galleryBs__img--side" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {photos.length > 1 ? (
            <div className="bd-thumbsBs" role="tablist" aria-label="Миниатюры">
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  className={`bd-thumbBs${i === photoIndex ? ' bd-thumbBs--on' : ''}`}
                  onClick={() => setPhotoIndex(i)}
                  aria-label={`Фото ${i + 1}`}
                  aria-selected={i === photoIndex}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          ) : null}

          <aside className="bd-asideFloat">
            <div className="bd-bookCard bd-bookCard--bs">
              <div className="bd-bookCard__priceRow">
                <div className="bd-bookCard__price">
                  <strong>{formatPriceRu(selectedTierPrice)} ₽</strong>
                  <span className="bd-bookCard__unit">
                    / {minDurationLabel({ schedule_min_duration: Number(bookDuration) || boat.schedule_min_duration })}
                  </span>
                </div>
                <p className="bd-bookCard__priceNote">без доп. сборов (если не указано иное)</p>
              </div>

              <div className="bd-bookCard__field">
                <label id="bd-date-label">Дата</label>
                <button
                  type="button"
                  className="bd-bookCard__dateBtn"
                  aria-labelledby="bd-date-label"
                  onClick={() => setCalendarOpen(true)}
                >
                  {formatBookingDateRu(bookDate)}
                </button>
              </div>

              <div className="bd-bookCard__field">
                <label htmlFor="bd-dur">Длительность</label>
                <select
                  id="bd-dur"
                  value={bookDuration}
                  onChange={(e) => setBookDuration(e.target.value)}
                >
                  {durationOptions.map((t) => (
                    <option key={t.duration} value={String(t.duration)}>
                      {minDurationLabel({ schedule_min_duration: t.duration })} — {formatPriceRu(t.price)} ₽
                    </option>
                  ))}
                </select>
              </div>

              <a href={appBookingUrl} className="bd-bookCard__cta bd-bookCard__cta--bs" target="_blank" rel="noopener noreferrer">
                Запросить бронь
              </a>
              <p className="bd-bookCard__hint">Оформление и оплата — в приложении ONTHEWATER.</p>
              <hr className="bd-bookCard__rule" />
              <ul className="bd-bookCard__termsList">
                <li>Итоговая стоимость может включать сервисный сбор — смотрите в приложении при оформлении.</li>
                <li>Бронируя, вы принимаете правила аренды и политику отмены владельца.</li>
              </ul>
            </div>
          </aside>

          <div className="bd-heroUnder">
            <header className="bd-heroBs">
              <div className="bd-heroBs__top">
                {boat.rating != null ? (
                  <span className="bd-heroBs__rating">
                    <span className="bd-heroBs__star" aria-hidden>
                      ★
                    </span>
                    {Number(boat.rating).toFixed(1)}
                  </span>
                ) : null}
                {bookingsN > 0 ? (
                  <span className="bd-heroBs__bookings">
                    ({bookingsN} {pluralizeBookings(bookingsN)})
                  </span>
                ) : null}
              </div>
              <h1 className="bd-heroBs__title">{title}</h1>
              <p className="bd-heroBs__loc">{loc}</p>

              <div className="bd-statStrip">
                <div className="bd-statStrip__cell">
                  <span className="bd-statStrip__val">{lengthStr}</span>
                  <span className="bd-statStrip__lbl">Длина</span>
                </div>
                <div className="bd-statStrip__cell">
                  <span className="bd-statStrip__val">до {capacity}</span>
                  <span className="bd-statStrip__lbl">Гости</span>
                </div>
                <div className="bd-statStrip__cell bd-statStrip__cell--badge">
                  {boat.captain_included ? (
                    <span className="bd-pillCap">С капитаном</span>
                  ) : boat.has_captain_option ? (
                    <span className="bd-pillCap bd-pillCap--muted">Капитан по запросу</span>
                  ) : (
                    <span className="bd-pillCap bd-pillCap--muted">Без капитана</span>
                  )}
                </div>
              </div>
              {boat.captain_included ? <p className="bd-heroBs__capNote">Аренда только с капитаном владельца или назначенным капитаном.</p> : null}
              {responseRate != null ? (
                <p className="bd-heroBs__response">
                  <strong>{responseRate}%</strong> — отвечает на запросы
                </p>
              ) : null}
            </header>
          </div>
        </div>

        <main className="bd-main bd-main--below">
          {videos.length > 0 ? (
            <section className="bd-blockBs">
              <div className="bd-blockBs__head">
                <h2 className="bd-blockBs__h">Видео</h2>
                <span className="bd-blockBs__sub">{videos.length}</span>
              </div>
              <div className="bd-videoGrid">
                {videos.map((src, i) => (
                  <figure key={src} className="bd-videoCard">
                    <video
                      className="bd-videoCard__player"
                      src={src}
                      controls
                      playsInline
                      preload="metadata"
                    />
                    <figcaption className="bd-videoCard__caption">Видео {i + 1}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <section className="bd-blockBs">
            <h2 className="bd-blockBs__h">Катер</h2>
            {desc ? (
              <>
                <p className={`bd-desc${!descOpen && descLong ? ' bd-desc--clamp' : ''}`}>{desc}</p>
                {descLong ? (
                  <button type="button" className="bd-readMore" onClick={() => setDescOpen((v) => !v)}>
                    {descOpen ? 'Свернуть' : 'Читать полностью'}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="bd-desc">Владелец пока не добавил описание.</p>
            )}
          </section>

          <section className="bd-ownerStrip" aria-label="Владелец">
            <p className="bd-ownerStrip__label">Владелец</p>
            <div className="bd-ownerStrip__row">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="bd-ownerStrip__avatar" />
              ) : (
                <div className="bd-ownerStrip__avatar bd-ownerStrip__avatar--ph" aria-hidden>
                  {ownerInitial}
                </div>
              )}
              <div className="bd-ownerStrip__body">
                <p className="bd-ownerStrip__name">{boat.owner_name || 'Владелец'}</p>
                {boat.rating != null ? (
                  <p className="bd-ownerStrip__meta">
                    ★ {Number(boat.rating).toFixed(1)}
                    {boat.reviews_count != null ? ` · ${boat.reviews_count} ${pluralizeReviews(boat.reviews_count)}` : null}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {amenities.length > 0 ? (
            <section className="bd-blockBs">
              <h2 className="bd-blockBs__h">Удобства</h2>
              <ul className="bd-amenityListBs">
                {amenities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="bd-blockBs">
            <h2 className="bd-blockBs__h">Характеристики</h2>
            <dl className="bd-specTableBs">
              <div className="bd-specTableBs__row">
                <dt>Год</dt>
                <dd>{boat.year ? String(boat.year) : '—'}</dd>
              </div>
              <div className="bd-specTableBs__row">
                <dt>Длина</dt>
                <dd>{lengthStr}</dd>
              </div>
              <div className="bd-specTableBs__row">
                <dt>Производитель</dt>
                <dd>{boat.manufacturer?.trim() || '—'}</dd>
              </div>
              <div className="bd-specTableBs__row">
                <dt>Модель</dt>
                <dd>{boat.model?.trim() || '—'}</dd>
              </div>
              <div className="bd-specTableBs__row">
                <dt>Вместимость</dt>
                <dd>{capacity}</dd>
              </div>
              <div className="bd-specTableBs__row">
                <dt>Тип</dt>
                <dd>{boat.type_name || '—'}</dd>
              </div>
              <div className="bd-specTableBs__row">
                <dt>Длительность аренды</dt>
                <dd>{getBookingPeriodLabel(boat)}</dd>
              </div>
            </dl>
          </section>

          <section className="bd-blockBs">
            <h2 className="bd-blockBs__h">Место</h2>
            <p className="bd-locationBs">
              Точные координаты и причал станут доступны после подтверждения бронирования.
            </p>
            <p className="bd-locationBs bd-locationBs--muted">{loc}</p>
          </section>

          <section className="bd-blockBs bd-crewBs">
            <h2 className="bd-blockBs__h">Связь с владельцем</h2>
            <p className="bd-crewBs__text">
              Уточните детали выхода и маршрут в чате приложения — владелец ответит после запроса брони.
            </p>
            <a href={appBookingUrl} className="bd-crewBs__cta" target="_blank" rel="noopener noreferrer">
              Написать владельцу
            </a>
          </section>

          {(boat.cancellation_policy || boat.rules || boat.payment_policy) ? (
            <section className="bd-blockBs">
              <h2 className="bd-blockBs__h">Важно знать</h2>
              {boat.cancellation_policy ? (
                <div className="bd-knowBs">
                  <h3 className="bd-knowBs__h">Отмена бронирования</h3>
                  <p className="bd-policy">{boat.cancellation_policy}</p>
                </div>
              ) : null}
              {boat.rules ? (
                <div className="bd-knowBs">
                  <h3 className="bd-knowBs__h">Правила</h3>
                  <p className="bd-policy">{boat.rules}</p>
                </div>
              ) : null}
              {boat.payment_policy ? (
                <div className="bd-knowBs">
                  <h3 className="bd-knowBs__h">Оплата</h3>
                  <p className="bd-policy">{boat.payment_policy}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="bd-blockBs">
            <h2 className="bd-blockBs__h">
              Отзывы
              {boat.reviews_count != null ? (
                <span className="bd-blockBs__hSub">
                  {' '}
                  ({boat.reviews_count} {pluralizeReviews(boat.reviews_count)})
                </span>
              ) : null}
            </h2>
            {boat.rating != null ? (
              <p className="bd-reviewsBs__summary">
                <span className="bd-reviewsBs__star" aria-hidden>
                  ★
                </span>
                <strong>{Number(boat.rating).toFixed(1)}</strong>
                <span className="bd-reviewsBs__lbl">средняя оценка</span>
              </p>
            ) : null}
            {reviews.length === 0 ? (
              <p className="bd-emptyReviews">Пока нет опубликованных отзывов.</p>
            ) : (
              <div className="bd-reviews">
                {reviews.map((r, idx) => (
                  <article key={r.id ?? `rev-${idx}`} className="bd-review bd-review--bs">
                    <div className="bd-review__head">
                      <span className="bd-review__author">{r.user_name || 'Гость'}</span>
                      <span className="bd-review__stars" aria-label={`Оценка ${r.rating} из 5`}>
                        {'★'.repeat(Math.min(5, Math.max(1, Number(r.rating) || 5)))}
                      </span>
                    </div>
                    <div className="bd-review__date">{formatReviewDate(r.created_at)}</div>
                    {r.text ? <p className="bd-review__text">{r.text}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
