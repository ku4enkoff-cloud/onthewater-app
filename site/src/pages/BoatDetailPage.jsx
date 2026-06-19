import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { boatDetailPath, boatUrlSegment, parseBoatUrlParam } from '../boatUrl'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchBoatById, fetchBoatReviews, fetchBoatsSearch, fetchPopularBoats } from '../api/boats'
import { YANDEX_MAPS_API_KEY, getPhotoUrl } from '../config'
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
  formatDurationListLabel,
  getBoatAmenities,
  getBookingPeriodLabel,
  isRegion,
  LOCATION_OPTIONS,
  pluralizeBookings,
  pluralizeReviews,
} from '../boatSearchUtils'
import BookingCalendarModal, { formatBookingDateRu } from '../components/booking/BookingCalendarModal.jsx'
import TimePickerModal from '../components/booking/TimePickerModal.jsx'
import BoatDetailLocationMap from '../components/boat/BoatDetailLocationMap.jsx'
import BoatHeroSpecStrip from '../components/boat/BoatHeroSpecStrip.jsx'
import BoatResultCard from '../components/search/BoatResultCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { createBooking } from '../api/bookings'
import { useBoatDetailPageSeo } from '../seo/useBoatDetailPageSeo.js'

const PLACEHOLDER = 'https://placehold.co/1200x750/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'
const DESC_PREVIEW = 480
const AMENITIES_PREVIEW = 15
const BOOKING_TIERS_PREVIEW = 4
const FAVORITES_STORAGE_KEY = 'boatrent_site_favorites'

function DetailPageHeader({ bookDate, onOpenCalendar, showCalendar }) {
  const { user, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])
  return (
    <header className="bd-topBar">
      <div className="bd-topBar__lead">
        <div className="bd-topBar__left">
          <Link to="/" className="bd-topBar__logo" aria-label="ONTHEWATER — на главную" onClick={closeMobileNav}>
            <span className="bd-topBar__logoMark" aria-hidden />
            <span className="bd-topBar__logoText">onthewater</span>
          </Link>
        </div>
        <button
          type="button"
          className="bd-navToggle"
          aria-expanded={mobileNavOpen}
          aria-controls="bd-mobile-menu"
          aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
          onClick={() => setMobileNavOpen((o) => !o)}
        >
          {mobileNavOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      <nav className="bd-topBar__nav bd-topBar__navDesktop" aria-label="Разделы сайта">
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
        {user ? (
          <>
            <Link className="bd-topBar__link authMenuBtn" to="/account">
              Личный кабинет
            </Link>
            <button type="button" className="bd-topBar__link authMenuBtn authMenuBtn--action" onClick={logout}>
              Выйти
            </button>
          </>
        ) : (
          <>
            <Link className="bd-topBar__link authMenuBtn" to="/register">
              Регистрация
            </Link>
            <Link className="bd-topBar__link authMenuBtn" to="/login">
              Войти
            </Link>
          </>
        )}
      </nav>

      {mobileNavOpen ? (
        <button type="button" className="bd-navBackdrop" aria-label="Закрыть меню" onClick={closeMobileNav} />
      ) : null}

      <div id="bd-mobile-menu" className={`bd-mobileNav${mobileNavOpen ? ' bd-mobileNav--open' : ''}`} aria-hidden={!mobileNavOpen}>
        <div className="bd-mobileNavInner">
          <p className="bd-mobileNavEyebrow">Разделы</p>
          <nav className="bd-mobileNavLinks" aria-label="Меню страницы катера">
            <Link to="/boats" onClick={closeMobileNav}>
              Катера
            </Link>
            <Link to="/#how" onClick={closeMobileNav}>
              Как это работает
            </Link>
            <Link to="/#destinations" onClick={closeMobileNav}>
              Направления
            </Link>
            <Link to="/#contact" onClick={closeMobileNav}>
              Контакты
            </Link>
          </nav>

          <div className="bd-mobileNavActions">
            {showCalendar ? (
              <button
                type="button"
                className="bd-mobileNavBtn bd-mobileNavBtn--secondary"
                onClick={() => {
                  onOpenCalendar?.()
                  closeMobileNav()
                }}
              >
                {formatBookingDateRu(bookDate)}
              </button>
            ) : null}
            {user ? (
              <div className="bd-mobileNavBtns">
                <Link to="/account" className="bd-mobileNavBtn bd-mobileNavBtn--primary" onClick={closeMobileNav}>
                  Личный кабинет
                </Link>
                <button
                  type="button"
                  className="bd-mobileNavBtn bd-mobileNavBtn--secondary"
                  onClick={() => {
                    logout()
                    closeMobileNav()
                  }}
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="bd-mobileNavBtns">
                <Link to="/register" className="bd-mobileNavBtn bd-mobileNavBtn--primary" onClick={closeMobileNav}>
                  Регистрация
                </Link>
                <Link to="/login" className="bd-mobileNavBtn bd-mobileNavBtn--secondary" onClick={closeMobileNav}>
                  Войти
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
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

function normalizeReviewAuthorName(name) {
  const raw = String(name || '').trim()
  if (!raw) return 'Гость'
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2 && parts.length % 2 === 0) {
    const half = parts.length / 2
    const left = parts.slice(0, half).join(' ').toLowerCase()
    const right = parts.slice(half).join(' ').toLowerCase()
    if (left === right) return parts.slice(0, half).join(' ')
  }
  return raw
}

export default function BoatDetailPage() {
  /** В App.jsx параметр называется :boatId (значение вида "12" или "12-nazvanie-katera"). */
  const { user, token } = useAuth()
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
  const [bookingTiersExpanded, setBookingTiersExpanded] = useState(false)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false)
  const [knowOpen, setKnowOpen] = useState({
    cancellation: false,
    rules: false,
    payment: false,
  })
  const [similarBoats, setSimilarBoats] = useState([])
  const galleryTouchRef = useRef({ x: 0, y: 0 })

  useBoatDetailPageSeo(boat)

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
      setBookingTiersExpanded(false)
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
    setKnowOpen({ cancellation: false, rules: false, payment: false })
  }, [resolvedId])

  useEffect(() => {
    if (!authPromptOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setAuthPromptOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authPromptOpen])

  useEffect(() => {
    if (!bookingSuccessOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setBookingSuccessOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bookingSuccessOpen])

  useEffect(() => {
    if (!mobileBookingOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileBookingOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileBookingOpen])

  useEffect(() => {
    if (!mobileBookingOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mobileBookingOpen])

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
        const typeId = boat.type_id != null ? Number(boat.type_id) : null
        const typeName = String(boat.type_name || '').trim().toLowerCase()
        const cityPool = city && locKeys.includes(city) ? await fetchBoatsSearch({ city }) : []
        const regionPool = region && isRegion(region) ? await fetchBoatsSearch({ region }) : []
        const fallbackPool =
          cityPool.length === 0 && regionPool.length === 0 ? await fetchPopularBoats(60) : []
        const list = [...cityPool, ...regionPool, ...fallbackPool]
        if (cancelled) return
        const ex = Number(boat.id)
        const unique = []
        const seen = new Set()
        for (const item of list) {
          const id = Number(item?.id)
          if (!Number.isFinite(id) || id === ex || seen.has(id)) continue
          seen.add(id)
          unique.push(item)
        }
        const isSameType = (item) => {
          const itemTypeId = item?.type_id != null ? Number(item.type_id) : null
          const itemTypeName = String(item?.type_name || '').trim().toLowerCase()
          if (typeId != null && itemTypeId != null && Number.isFinite(itemTypeId)) return itemTypeId === typeId
          if (typeName && itemTypeName) return itemTypeName === typeName
          return false
        }
        const inSameCity = (item) =>
          city &&
          String(item?.location_city || item?.locationCity || '')
            .trim()
            .toLowerCase() === city.toLowerCase()
        const inSameRegion = (item) =>
          region &&
          String(item?.location_region || item?.locationRegion || '')
            .trim()
            .toLowerCase() === region.toLowerCase()

        const top = unique.filter((item) => isSameType(item) && (inSameCity(item) || inSameRegion(item)))
        const sameType = unique.filter((item) => isSameType(item) && !top.includes(item))
        const closeLocation = unique.filter(
          (item) => (inSameCity(item) || inSameRegion(item)) && !top.includes(item) && !sameType.includes(item),
        )
        const rest = unique.filter(
          (item) => !top.includes(item) && !sameType.includes(item) && !closeLocation.includes(item),
        )
        setSimilarBoats([...top, ...sameType, ...closeLocation, ...rest].slice(0, 8))
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

  const submitBookingRequest = useCallback(async () => {
    if (!boat || !resolvedId || !bookStartTime || bookingSubmitting) return
    setBookingError('')
    setBookingSubmitting(true)
    try {
      const start = new Date(`${bookDate}T${bookStartTime}:00`)
      const startAt = Number.isNaN(start.getTime()) ? new Date().toISOString() : start.toISOString()
      await createBooking(token, {
        boat_id: Number(resolvedId),
        start_at: startAt,
        hours: Number(bookDuration) || getEffectiveMinDurationMinutes(boat),
        passengers: Number(bookGuests) || 1,
        captain: boat.captain_included !== false,
        total_price: Number(selectedTierPrice) || 0,
      })
      setMobileBookingOpen(false)
      setBookingSuccessOpen(true)
    } catch (err) {
      setBookingError(err?.message || 'Не удалось отправить запрос на бронирование')
    } finally {
      setBookingSubmitting(false)
    }
  }, [boat, resolvedId, bookStartTime, bookingSubmitting, bookDate, token, bookDuration, bookGuests, selectedTierPrice])

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

  const locationFullLine = useMemo(() => {
    if (!boat) return '—'
    const loc = formatCardLocation(boat)
    const parts = [
      boat.location_country,
      boat.location_region,
      boat.location_city,
      boat.location_address,
    ]
      .map((x) => (x != null ? String(x).trim() : ''))
      .filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : loc
  }, [boat])

  const knowAccordionItems = useMemo(() => {
    if (!boat) return []
    const items = []
    const c = String(boat.cancellation_policy || '').trim()
    if (c) items.push({ id: 'cancellation', title: 'Отмена бронирования', body: c })
    const r = String(boat.rules || '').trim()
    if (r) items.push({ id: 'rules', title: 'Правила', body: r })
    const p = String(boat.payment_policy || '').trim()
    if (p) items.push({ id: 'payment', title: 'Оплата', body: p })
    return items
  }, [boat])

  const toggleKnow = useCallback((id) => {
    setKnowOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

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
  const bookingTierRows =
    bookingTiersExpanded || durationOptions.length <= BOOKING_TIERS_PREVIEW
      ? durationOptions
      : durationOptions.slice(0, BOOKING_TIERS_PREVIEW)
  const showBookingTiersToggle = durationOptions.length > BOOKING_TIERS_PREVIEW
  const renderBookingCard = () => (
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
            </div>
          </div>
          <span className="bd-bookCard__rowIcon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <div className="bd-bookCard__row bd-bookCard__row--dur">
          <div className="bd-bookCard__rowMain">
            <span className="bd-bookCard__rowLabel">Длительность</span>
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
          <span className="bd-bookCard__rowIcon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 9v4l2.5 1.5M9 3h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <button type="button" className="bd-bookCard__row bd-bookCard__row--tap" onClick={() => setTimePickerOpen(true)}>
          <span className="bd-bookCard__rowMain">
            <span className="bd-bookCard__rowLabel">Время начала</span>
            {bookStartTime ? (
              <span className="bd-bookCard__rowValue">{bookStartTime}</span>
            ) : (
              <span className="bd-bookCard__rowValue bd-bookCard__rowValue--muted">Нажмите, чтобы выбрать время</span>
            )}
          </span>
          <span className="bd-bookCard__rowIcon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </button>

        <div className="bd-bookCard__row bd-bookCard__row--guests" role="group" aria-label="Количество гостей">
          <div className="bd-bookCard__rowMain">
            <span className="bd-bookCard__rowLabel">Гости</span>
            <div className="bd-bookCard__guestRow bd-bookCard__guestRow--inline">
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
          <span className="bd-bookCard__rowIcon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>

      {bookingError ? <p className="bd-bookCard__error">{bookingError}</p> : null}
      {bookStartTime ? user ? (
        <button type="button" className="bd-bookCard__ctaFull" onClick={submitBookingRequest} disabled={bookingSubmitting}>
          {bookingSubmitting ? 'Отправляем…' : 'Запрос на бронирование'}
        </button>
      ) : (
        <button type="button" className="bd-bookCard__ctaFull" onClick={() => setAuthPromptOpen(true)}>
          Запрос на бронирование
        </button>
      ) : (
        <span className="bd-bookCard__ctaFull bd-bookCard__ctaFull--disabled" aria-disabled>
          Запрос на бронирование
        </span>
      )}
    </div>
  )

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
              alt={`${title}, фото ${photoIndex + 1}`}
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
                alt={`${title}, фото ${((photoIndex + 1) % photos.length) + 1}`}
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
                  <img src={src} alt={`${title}, миниатюра ${i + 1}`} />
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
            <h2 className="bd-blockBs__h">Описание</h2>
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

          {durationOptions.length > 0 ? (
            <section className="bd-blockBs bd-bookingTiersBs" aria-label="Варианты бронирования">
              <h2 className="bd-blockBs__h">Варианты бронирования</h2>
              <p className="bd-bookingTiersBs__kicker">
                {boat.captain_included ? 'С капитаном' : 'Аренда'}
              </p>
              <div className="bd-bookingTiersBs__card" role="list">
                {bookingTierRows.map((t) => {
                  const active = String(t.duration) === String(bookDuration)
                  const isBaseTier = t.duration === durationOptions[0]?.duration
                  return (
                    <button
                      key={t.duration}
                      type="button"
                      className={`bd-bookingTiersBs__row${active ? ' bd-bookingTiersBs__row--on' : ''}`}
                      onClick={() => setBookDuration(String(t.duration))}
                    >
                      <span className="bd-bookingTiersBs__dur">
                        {formatDurationListLabel(t.duration)}
                      </span>
                      <span
                        className={
                          isBaseTier
                            ? 'bd-bookingTiersBs__price bd-bookingTiersBs__price--base'
                            : 'bd-bookingTiersBs__price'
                        }
                      >
                        {formatPriceRu(t.price)} ₽
                      </span>
                    </button>
                  )
                })}
              </div>
              {showBookingTiersToggle ? (
                <button
                  type="button"
                  className="bd-readMore"
                  onClick={() => setBookingTiersExpanded((v) => !v)}
                >
                  {bookingTiersExpanded ? 'Скрыть' : 'Показать все'}
                </button>
              ) : null}
            </section>
          ) : null}

          <section className="bd-blockBs">
            <h2 className="bd-blockBs__h">Расположение</h2>
            {boat.lat != null && boat.lng != null ? (
              <BoatDetailLocationMap
                apiKey={YANDEX_MAPS_API_KEY}
                lat={boat.lat}
                lng={boat.lng}
                title={title}
              />
            ) : null}
            {boat.lat == null || boat.lng == null ? (
              <p className="bd-locationBs">
                Точные координаты и причал станут доступны после подтверждения бронирования.
              </p>
            ) : null}
            <p className="bd-locationBs bd-locationBs--muted">{locationFullLine}</p>
            {boat.location_yacht_club ? (
              <p className="bd-locationBs">Яхт-клуб: {boat.location_yacht_club}</p>
            ) : null}
          </section>

          <section className="bd-blockBs" aria-label="Владелец">
            <h2 className="bd-blockBs__h">Владелец</h2>
            <div className="bd-ownerStrip bd-ownerStrip--underH2">
              <div className="bd-ownerStrip__row">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={boat.owner_name || 'Владелец'} className="bd-ownerStrip__avatar" />
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
                      {boat.reviews_count != null
                        ? ` · ${boat.reviews_count} ${pluralizeReviews(boat.reviews_count)}`
                        : null}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <p className="bd-crewBs__text">
              Уточните детали выхода и маршрут в чате приложения — владелец ответит после запроса брони.
            </p>
          </section>

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
                      <span className="bd-review__author">{normalizeReviewAuthorName(r.user_name)}</span>
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

          {knowAccordionItems.length > 0 ? (
            <section className="bd-blockBs bd-knowAccordionSection">
              <h2 className="bd-blockBs__h">Важно знать</h2>
              <div className="bd-knowAccordion">
                {knowAccordionItems.map((item) => {
                  const open = knowOpen[item.id]
                  const panelId = `bd-know-panel-${item.id}`
                  const headId = `bd-know-head-${item.id}`
                  return (
                    <div key={item.id} className="bd-knowAccordion__item">
                      <button
                        type="button"
                        className="bd-knowAccordion__trigger"
                        id={headId}
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => toggleKnow(item.id)}
                      >
                        <span className="bd-knowAccordion__title">{item.title}</span>
                        <span className="bd-knowAccordion__chevWrap" aria-hidden>
                          <svg
                            className={`bd-knowAccordion__chev${open ? ' bd-knowAccordion__chev--open' : ''}`}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M6 9l6 6 6-6"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </button>
                      {open ? (
                        <div
                          id={panelId}
                          className="bd-knowAccordion__panel"
                          role="region"
                          aria-labelledby={headId}
                        >
                          <p className="bd-policy">{item.body}</p>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
          </main>
          </div>
          </div>

          <aside className="bd-asideFloat">
            {renderBookingCard()}
          </aside>
        </div>
      </div>

      <div className="bd-mobileBookBar" role="region" aria-label="Быстрое бронирование">
        <div className="bd-mobileBookBar__price">
          <strong>{formatPriceRu(selectedTierPrice)} ₽</strong>
          <span>{minDurationLabel({ schedule_min_duration: Number(bookDuration) || getEffectiveMinDurationMinutes(boat) })}</span>
        </div>
        <button type="button" className="bd-mobileBookBar__cta" onClick={() => setMobileBookingOpen(true)}>
          Забронировать
        </button>
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
                  <img src={photos[photoIndex]} alt={`${title}, фото ${photoIndex + 1}`} className="bd-galleryLightbox__img" decoding="async" />
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

      {mobileBookingOpen
        ? createPortal(
            <div
              className="bd-mobileBookModal"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setMobileBookingOpen(false)
              }}
            >
              <div
                className="bd-mobileBookModal__sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bd-mobile-booking-title"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="bd-mobileBookModal__close"
                  onClick={() => setMobileBookingOpen(false)}
                  aria-label="Закрыть окно бронирования"
                >
                  ×
                </button>
                <h3 id="bd-mobile-booking-title" className="bd-mobileBookModal__title">
                  Бронирование
                </h3>
                <div className="bd-mobileBookModal__body">{renderBookingCard()}</div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {authPromptOpen
        ? createPortal(
            <div
              className="bd-authPrompt"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setAuthPromptOpen(false)
              }}
            >
              <div
                className="bd-authPrompt__sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bd-authPrompt-title"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="bd-authPrompt__close"
                  onClick={() => setAuthPromptOpen(false)}
                  aria-label="Закрыть"
                >
                  ×
                </button>
                <h3 id="bd-authPrompt-title" className="bd-authPrompt__title">
                  Для бронирования нужна авторизация
                </h3>
                <p className="bd-authPrompt__text">
                  Чтобы отправить запрос на бронирование, войдите в личный кабинет или зарегистрируйтесь на сайте.
                </p>
                <div className="bd-authPrompt__actions">
                  <Link className="bd-authPrompt__btn bd-authPrompt__btn--primary" to="/register" onClick={() => setAuthPromptOpen(false)}>
                    Зарегистрироваться
                  </Link>
                  <Link className="bd-authPrompt__btn bd-authPrompt__btn--ghost" to="/login" onClick={() => setAuthPromptOpen(false)}>
                    Войти
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {bookingSuccessOpen
        ? createPortal(
            <div
              className="bd-authPrompt"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setBookingSuccessOpen(false)
              }}
            >
              <div
                className="bd-authPrompt__sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bd-bookingSuccess-title"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="bd-authPrompt__close"
                  onClick={() => setBookingSuccessOpen(false)}
                  aria-label="Закрыть"
                >
                  ×
                </button>
                <h3 id="bd-bookingSuccess-title" className="bd-authPrompt__title">
                  Запрос на бронирование отправлен
                </h3>
                <p className="bd-authPrompt__text">
                  Мы передали вашу заявку владельцу судна. Статус можно отслеживать в разделе «Мои бронирования».
                </p>
                <div className="bd-authPrompt__actions">
                  <button
                    type="button"
                    className="bd-authPrompt__btn bd-authPrompt__btn--primary"
                    onClick={() => {
                      setBookingSuccessOpen(false)
                      navigate('/account')
                    }}
                  >
                    Мои бронирования
                  </button>
                  <button
                    type="button"
                    className="bd-authPrompt__btn bd-authPrompt__btn--ghost"
                    onClick={() => setBookingSuccessOpen(false)}
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
