import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { boatDetailPath, boatUrlSegment, parseBoatUrlParam } from '../boatUrl'
import { Link, useNavigate, useParams } from 'react-router-dom'
import './boatDetail.css'
import './boatsSearch.css'
import { fetchBoatById, fetchBoatReviews, fetchBoatsSearch, fetchPopularBoats } from '../api/boats'
import { SITE_MAIN_URL, getPhotoUrl } from '../config'
import {
  allPhotoUrls,
  buildBookingDurationTiers,
  formatCardLocation,
  formatGuestLabelRu,
  formatPriceRu,
  getEffectiveMinDurationMinutes,
  getMinDurationPrice,
  minDurationLabel,
} from '../boatUtils'
import {
  getBoatAmenities,
  getBookingPeriodLabel,
  isRegion,
  LOCATION_OPTIONS,
  pluralizeBookings,
  pluralizeReviews,
} from '../boatSearchUtils'
import BookingCalendarModal, { formatBookingDateRu } from '../components/booking/BookingCalendarModal.jsx'
import TimePickerModal from '../components/booking/TimePickerModal.jsx'
import BoatHeroSpecStrip from '../components/boat/BoatHeroSpecStrip.jsx'
import BoatResultCard from '../components/search/BoatResultCard.jsx'

const PLACEHOLDER = 'https://placehold.co/1200x750/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'
const DESC_PREVIEW = 480
const AMENITIES_PREVIEW = 15
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
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [bookStartTime, setBookStartTime] = useState('')
  const [bookGuests, setBookGuests] = useState(1)
  const [galleryLightboxOpen, setGalleryLightboxOpen] = useState(false)
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false)
  const [similarBoats, setSimilarBoats] = useState([])
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
      setAmenitiesExpanded(false)
      const minD = getEffectiveMinDurationMinutes(b)
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

  useEffect(() => {
    setBookStartTime('')
  }, [bookDate, bookDuration, resolvedId])

  useEffect(() => {
    setBookGuests(1)
  }, [resolvedId])

  useEffect(() => {
    if (!boat?.id) {
      setSimilarBoats([])
      return
    }
    let cancelled = false
    const locKeys = LOCATION_OPTIONS.map((o) => o.value).filter((v) => v !== '__all')
    ;(async () => {
      try {
        const city = String(boat.location_city || boat.locationCity || '').trim()
        const region = String(boat.location_region || boat.locationRegion || '').trim()
        let list = []
        if (city && locKeys.includes(city)) {
          list = await fetchBoatsSearch({ city })
        } else if (region && isRegion(region)) {
          list = await fetchBoatsSearch({ region })
        } else {
          list = await fetchPopularBoats(40)
        }
        if (cancelled) return
        const ex = Number(boat.id)
        setSimilarBoats(list.filter((b) => Number(b.id) !== ex).slice(0, 8))
      } catch {
        if (!cancelled) setSimilarBoats([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [boat?.id, boat?.location_city, boat?.location_region, boat?.locationCity, boat?.locationRegion])

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

  const tiers = useMemo(() => (boat ? buildBookingDurationTiers(boat) : []), [boat])

  useEffect(() => {
    if (!boat || tiers.length === 0) return
    const minD = getEffectiveMinDurationMinutes(boat)
    const has = tiers.some((t) => t.duration === minD)
    setBookDuration(String(has ? minD : tiers[0].duration))
  }, [boat, tiers])

  const selectedTierPrice = useMemo(() => {
    if (!boat) return 0
    const d = Number(bookDuration) || getEffectiveMinDurationMinutes(boat)
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

  /** Диплинк в приложение с выбранными датой, длительностью, временем и гостями (как в бывшей модалке). */
  const bookAppHref = useMemo(() => {
    const base = SITE_MAIN_URL.replace(/\/$/, '')
    const q = new URLSearchParams()
    if (resolvedId) q.set('boat', String(resolvedId))
    if (bookDate) q.set('date', bookDate)
    if (bookDuration) q.set('duration', String(bookDuration))
    if (bookStartTime) q.set('time', bookStartTime)
    q.set('guests', String(bookGuests))
    const s = q.toString()
    return s ? `${base}/?${s}` : `${base}/`
  }, [resolvedId, bookDate, bookDuration, bookStartTime, bookGuests])

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

  const closeGalleryLightbox = useCallback(() => setGalleryLightboxOpen(false), [])

  const openGalleryLightboxAt = useCallback(
    (e, index) => {
      if (e.target.closest('button')) return
      const n = photos.length
      if (n < 1) return
      const i = ((index % n) + n) % n
      setPhotoIndex(i)
      setGalleryLightboxOpen(true)
    },
    [photos.length],
  )

  useEffect(() => {
    if (!galleryLightboxOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setGalleryLightboxOpen(false)
      }
      const n = photos.length
      if (n < 2) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPhotoIndex((idx) => (idx <= 0 ? n - 1 : idx - 1))
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setPhotoIndex((idx) => (idx >= n - 1 ? 0 : idx + 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [galleryLightboxOpen, photos.length])

  const maxBookGuests = useMemo(
    () => Math.max(1, Math.min(50, Number(boat?.capacity) || 20)),
    [boat?.capacity],
  )

  useEffect(() => {
    setBookGuests((g) => Math.min(maxBookGuests, Math.max(1, g)))
  }, [maxBookGuests])

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
      : [{ duration: getEffectiveMinDurationMinutes(boat), price: getMinDurationPrice(boat) }]

  return (
    <div className="bd-page bd-page--bs">
      <DetailPageHeader showCalendar={false} />

      <BookingCalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={bookDate}
        minDate={todayISO()}
        onApply={(iso) => setBookDate(iso)}
      />

      <TimePickerModal
        open={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        boat={boat}
        boatId={resolvedId}
        bookDate={bookDate}
        durationMin={Number(bookDuration) || getEffectiveMinDurationMinutes(boat)}
        value={bookStartTime}
        onApply={(slot) => {
          setBookStartTime(slot)
          setTimePickerOpen(false)
        }}
      />

      <section
        className="bd-galleryBleed"
        aria-label="Фотографии катера"
        onTouchStart={onGalleryTouchStart}
        onTouchEnd={onGalleryTouchEnd}
      >
        <div className={photos.length > 1 ? 'bd-galleryBleed__grid' : 'bd-galleryBleed__grid bd-galleryBleed__grid--single'}>
          <div
            className="bd-galleryBleed__pane bd-galleryBleed__pane--left"
            onClick={(e) => openGalleryLightboxAt(e, photoIndex)}
            role="presentation"
          >
            <img
              src={photos[photoIndex]}
              alt=""
              className="bd-galleryBleed__img"
              loading="eager"
              decoding="async"
            />
            {boat.instant_booking !== false ? (
              <div className="bd-galleryBleed__badge">
                <span aria-hidden>⚡</span> Мгновенное бронирование
              </div>
            ) : null}
            {photos.length > 1 ? (
              <>
                <button type="button" className="bd-galleryBleed__nav bd-galleryBleed__nav--prev" onClick={prevPhoto} aria-label="Предыдущее фото">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M15 6l-6 6 6 6" stroke="#0369a1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="bd-galleryBleed__counter" aria-live="polite">
                  {photoIndex + 1} / {photos.length}
                </div>
              </>
            ) : null}
            {photos.length <= 1 ? (
              <div className="bd-galleryBleed__actions">
                <button
                  type="button"
                  className="bd-galleryBleed__fab"
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
                  className="bd-galleryBleed__fab"
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
            ) : null}
          </div>
          {photos.length > 1 ? (
            <div
              className="bd-galleryBleed__pane bd-galleryBleed__pane--right"
              onClick={(e) => openGalleryLightboxAt(e, (photoIndex + 1) % photos.length)}
              role="presentation"
            >
              <img
                src={photos[(photoIndex + 1) % photos.length]}
                alt=""
                className="bd-galleryBleed__img"
                loading="lazy"
                decoding="async"
              />
              <div className="bd-galleryBleed__actions">
                <button
                  type="button"
                  className="bd-galleryBleed__fab"
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
                  className="bd-galleryBleed__fab"
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
              <button type="button" className="bd-galleryBleed__nav bd-galleryBleed__nav--next" onClick={nextPhoto} aria-label="Следующее фото">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="#0369a1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="bd-shell">
        {photos.length > 1 ? (
          <div className="bd-topZone__media">
            <div className="bd-thumbsBs bd-thumbsBs--belowBleed" role="tablist" aria-label="Миниатюры">
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
          </div>
        ) : null}

        <div className="bd-detailGrid">
          <div className="bd-detailGrid__leftCol">
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

              <BoatHeroSpecStrip
                lengthStr={lengthStr}
                capacity={capacity}
                boat={boat}
                responseRate={responseRate}
              />
            </header>
          </div>

          <div className="bd-detailGrid__primary">
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
            <section className="bd-blockBs bd-amenitiesBs">
              <h2 className="bd-blockBs__h">Удобства</h2>
              <ul className="bd-amenityColsBs" role="list">
                {(amenitiesExpanded || amenities.length <= AMENITIES_PREVIEW
                  ? amenities
                  : amenities.slice(0, AMENITIES_PREVIEW)
                ).map((a) => (
                  <li key={a} className="bd-amenityColsBs__item">
                    <span className="bd-amenityColsBs__check" aria-hidden />
                    <span className="bd-amenityColsBs__label">{a}</span>
                  </li>
                ))}
              </ul>
              {amenities.length > AMENITIES_PREVIEW && !amenitiesExpanded ? (
                <button
                  type="button"
                  className="bd-amenityColsBs__more"
                  onClick={() => setAmenitiesExpanded(true)}
                >
                  Показать все
                </button>
              ) : null}
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

          <aside className="bd-asideFloat">
            <div className="bd-bookCard bd-bookCard--bs bd-bookCard--setter">
              <header className="bd-bookCard__head">
                <div className="bd-bookCard__price">
                  <strong>{formatPriceRu(selectedTierPrice)} ₽</strong>
                  <span className="bd-bookCard__unit">
                    /{' '}
                    {minDurationLabel({
                      schedule_min_duration: Number(bookDuration) || getEffectiveMinDurationMinutes(boat),
                    })}
                  </span>
                </div>
              </header>

              <div className="bd-bookCard__stack">
                <div className="bd-bookCard__durBlock">
                  <p className="bd-bookCard__stackLabel">Длительность</p>
                  <div className="bd-bookCard__chips" role="group" aria-label="Длительность">
                    {durationOptions.map((t) => {
                      const active = String(t.duration) === String(bookDuration)
                      return (
                        <button
                          key={t.duration}
                          type="button"
                          className={`bd-bookCard__chip${active ? ' bd-bookCard__chip--on' : ''}`}
                          onClick={() => setBookDuration(String(t.duration))}
                        >
                          {minDurationLabel({ schedule_min_duration: t.duration })}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="bd-bookCard__row bd-bookCard__row--datePick">
                  <div className="bd-bookCard__rowMain">
                    <span className="bd-bookCard__rowLabel" id="bd-date-label">
                      Дата
                    </span>
                    <div className="bd-bookCard__dateRow">
                      <button
                        type="button"
                        className="bd-bookCard__dateBtn bd-bookCard__dateBtn--flex"
                        aria-labelledby="bd-date-label"
                        onClick={() => setCalendarOpen(true)}
                      >
                        {formatBookingDateRu(bookDate)}
                      </button>
                      <button
                        type="button"
                        className="bd-bookCard__dateClear"
                        onClick={() => setBookDate(todayISO())}
                        aria-label="Сбросить дату на сегодня"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <span className="bd-bookCard__rowIcon" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="16" rx="2" stroke="#757575" strokeWidth="1.5" />
                      <path d="M3 10h18M8 3v4M16 3v4" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </div>

                <button
                  type="button"
                  className="bd-bookCard__row bd-bookCard__row--tap"
                  onClick={() => setTimePickerOpen(true)}
                >
                  <span className="bd-bookCard__rowMain">
                    <span className="bd-bookCard__rowLabel">Время начала</span>
                    {bookStartTime ? (
                      <span className="bd-bookCard__rowValue">{bookStartTime}</span>
                    ) : (
                      <span className="bd-bookCard__rowValue bd-bookCard__rowValue--muted">Выберите время</span>
                    )}
                  </span>
                  <span className="bd-bookCard__rowIcon" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="#757575" strokeWidth="1.5" />
                      <path d="M12 7v5l3 2" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>

                <div className="bd-bookCard__guestRow" role="group" aria-label="Количество гостей">
                  <button
                    type="button"
                    className="bd-bookCard__guestStepBtn bd-bookCard__guestStepBtn--dec"
                    onClick={() => setBookGuests((g) => Math.max(1, g - 1))}
                    disabled={bookGuests <= 1}
                    aria-label="Меньше гостей"
                  >
                    −
                  </button>
                  <span className="bd-bookCard__guestStepLabel">{formatGuestLabelRu(bookGuests)}</span>
                  <button
                    type="button"
                    className="bd-bookCard__guestStepBtn bd-bookCard__guestStepBtn--inc"
                    onClick={() => setBookGuests((g) => Math.min(maxBookGuests, g + 1))}
                    disabled={bookGuests >= maxBookGuests}
                    aria-label="Больше гостей"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bd-bookCard__footer">
                <div className="bd-bookCard__footerTotal">
                  <span className="bd-bookCard__footerSum">{formatPriceRu(selectedTierPrice)}</span>
                  <span className="bd-bookCard__footerCur">₽</span>
                </div>
                {bookStartTime ? (
                  <a
                    className="bd-bookCard__footerCta"
                    href={bookAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Забронировать
                  </a>
                ) : (
                  <span className="bd-bookCard__footerCta bd-bookCard__footerCta--disabled" aria-disabled>
                    Забронировать
                  </span>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {similarBoats.length > 0 ? (
        <section className="bd-similar" aria-labelledby="bd-similar-heading">
          <div className="bd-similar__inner">
            <h2 id="bd-similar-heading" className="bd-similar__title">
              Похожие катера
            </h2>
            <div className="bd-similar__grid">
              {similarBoats.map((b) => (
                <BoatResultCard key={b.id} boat={b} filters={{}} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {galleryLightboxOpen
        ? createPortal(
            <div
              className="bd-galleryLightbox"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeGalleryLightbox()
              }}
            >
              <div
                className="bd-galleryLightbox__sheet"
                role="dialog"
                aria-modal="true"
                aria-label="Просмотр фотографий"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button type="button" className="bd-galleryLightbox__close" onClick={closeGalleryLightbox} aria-label="Закрыть">
                  ×
                </button>
                {photos.length > 1 ? (
                  <>
                    <button type="button" className="bd-galleryLightbox__nav bd-galleryLightbox__nav--prev" onClick={prevPhoto} aria-label="Предыдущее фото">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button type="button" className="bd-galleryLightbox__nav bd-galleryLightbox__nav--next" onClick={nextPhoto} aria-label="Следующее фото">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </>
                ) : null}
                <div className="bd-galleryLightbox__stage">
                  <img src={photos[photoIndex]} alt="" className="bd-galleryLightbox__img" decoding="async" />
                </div>
                {photos.length > 1 ? (
                  <div className="bd-galleryLightbox__counter" aria-live="polite">
                    {photoIndex + 1} / {photos.length}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
