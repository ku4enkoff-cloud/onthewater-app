import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { boatDetailPath, boatUrlSegment, parseBoatUrlParam } from '../boatUrl'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchBoatById, fetchBoatReviews, fetchBoatsSearch } from '../api/boats'
import { YANDEX_MAPS_API_KEY, getPhotoUrl } from '../config'
import {
  allPhotoUrls,
  buildBookingDurationTiers,
  formatCardLocation,
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
import BookingPanelC06 from '../components/booking/BookingPanelC06.jsx'
import BoatDetailLocationMap from '../components/boat/BoatDetailLocationMap.jsx'
import BoatResultCard from '../components/search/BoatResultCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { createBooking } from '../api/bookings'
import { useBoatDetailPageSeo } from '../seo/useBoatDetailPageSeo.js'
import '../styles/boat-detail-c06.css'

const PLACEHOLDER = 'https://placehold.co/1200x750/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'
const DESC_PREVIEW = 480
const AMENITIES_PREVIEW = 15
const BOOKING_TIERS_PREVIEW = 4
const FAVORITES_STORAGE_KEY = 'boatrent_site_favorites'

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
    .map((src) => getPhotoUrl(src) || (typeof src === 'string' ? src.trim() : null))
    .filter(
      (src, idx, arr) =>
        typeof src === 'string' &&
        src.trim() &&
        !src.startsWith('file://') &&
        !src.startsWith('content://') &&
        arr.indexOf(src) === idx,
    )
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
  const [favorite, setFavorite] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [bookStartTime, setBookStartTime] = useState('')
  const [bookGuests, setBookGuests] = useState(1)
  const [galleryLightboxOpen, setGalleryLightboxOpen] = useState(false)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [videoIndex, setVideoIndex] = useState(0)
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false)
  const [bookingTiersExpanded, setBookingTiersExpanded] = useState(false)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false)
  const [similarBoats, setSimilarBoats] = useState([])
  const galleryTouchRef = useRef({ x: 0, y: 0 })
  const similarScrollerRef = useRef(null)

  const scrollSimilarBy = useCallback((dir) => {
    const el = similarScrollerRef.current
    if (!el) return
    const step = Math.max(260, Math.round(el.clientWidth * 0.75))
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }, [])

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
        const typeName = String(boat.type_name || boat.type || '').trim().toLowerCase()
        const originLat = Number(boat.lat)
        const originLng = Number(boat.lng)
        const hasOrigin = Number.isFinite(originLat) && Number.isFinite(originLng)

        const pools = await Promise.all([
          hasOrigin ? fetchBoatsSearch({ lat: originLat, lng: originLng, radius: 80 }) : Promise.resolve([]),
          hasOrigin ? fetchBoatsSearch({ lat: originLat, lng: originLng, radius: 200 }) : Promise.resolve([]),
          city && locKeys.includes(city) ? fetchBoatsSearch({ city }) : Promise.resolve([]),
          region && isRegion(region) ? fetchBoatsSearch({ region }) : Promise.resolve([]),
          fetchBoatsSearch({ allRegions: true }),
        ])
        if (cancelled) return

        const ex = Number(boat.id)
        const unique = []
        const seen = new Set()
        for (const item of pools.flat()) {
          const id = Number(item?.id)
          if (!Number.isFinite(id) || id === ex || seen.has(id)) continue
          seen.add(id)
          unique.push(item)
        }

        const isSameType = (item) => {
          const itemTypeId = item?.type_id != null ? Number(item.type_id) : null
          const itemTypeName = String(item?.type_name || item?.type || '')
            .trim()
            .toLowerCase()
          if (typeId != null && Number.isFinite(typeId) && itemTypeId != null && Number.isFinite(itemTypeId)) {
            return itemTypeId === typeId
          }
          if (typeName && itemTypeName) return itemTypeName === typeName
          return false
        }

        /** Примерное расстояние в км (как на бэкенде: градусы × 111). */
        const distanceKm = (item) => {
          if (!hasOrigin) return Number.POSITIVE_INFINITY
          const lat = Number(item?.lat)
          const lng = Number(item?.lng)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Number.POSITIVE_INFINITY
          const dLat = lat - originLat
          const dLng = lng - originLng
          return Math.sqrt(dLat * dLat + dLng * dLng) * 111
        }

        const cityKey = city.toLowerCase()
        const regionKey = region.toLowerCase()
        const locationRank = (item) => {
          const itemCity = String(item?.location_city || item?.locationCity || '')
            .trim()
            .toLowerCase()
          const itemRegion = String(item?.location_region || item?.locationRegion || '')
            .trim()
            .toLowerCase()
          if (cityKey && itemCity === cityKey) return 0
          if (regionKey && itemRegion === regionKey) return 1
          return 2
        }

        const sameTypeNearby = unique
          .filter(isSameType)
          .sort((a, b) => {
            const da = distanceKm(a)
            const db = distanceKm(b)
            if (da !== db) return da - db
            const lr = locationRank(a) - locationRank(b)
            if (lr !== 0) return lr
            return (Number(b.bookings_count) || 0) - (Number(a.bookings_count) || 0)
          })
          .slice(0, 8)

        setSimilarBoats(sameTypeNearby)
      } catch {
        if (!cancelled) setSimilarBoats([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    boat?.id,
    boat?.lat,
    boat?.lng,
    boat?.type_id,
    boat?.type_name,
    boat?.type,
    boat?.location_city,
    boat?.location_region,
    boat?.locationCity,
    boat?.locationRegion,
  ])

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
  const closeVideoModal = useCallback(() => setVideoModalOpen(false), [])

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

  const openVideoModal = useCallback(
    (e) => {
      e.stopPropagation()
      if (videos.length < 1) return
      setVideoIndex(0)
      setVideoModalOpen(true)
    },
    [videos.length],
  )

  useEffect(() => {
    if (!galleryLightboxOpen && !videoModalOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (videoModalOpen) setVideoModalOpen(false)
        else setGalleryLightboxOpen(false)
        return
      }
      if (videoModalOpen) {
        const n = videos.length
        if (n < 2) return
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setVideoIndex((idx) => (idx <= 0 ? n - 1 : idx - 1))
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          setVideoIndex((idx) => (idx >= n - 1 ? 0 : idx + 1))
        }
        return
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
  }, [galleryLightboxOpen, videoModalOpen, photos.length, videos.length])

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

  if (loading) {
    return (
      <div className="bd-page">
        <div className="bd-loading">Загружаем катер…</div>
      </div>
    )
  }

  if (error === 'notfound' || !boat) {
    return (
      <div className="bd-page">
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
  const thumbPhotos = photos
  const typeLabel = (boat.type_name || boat.type || 'Катер').trim()
  const reviewCount = Array.isArray(reviews) ? reviews.length : 0

  const renderBookingCard = () => (
    <BookingPanelC06
      boat={boat}
      boatId={resolvedId}
      bookDate={bookDate}
      onDateChange={setBookDate}
      bookDuration={bookDuration}
      onDurationChange={setBookDuration}
      bookStartTime={bookStartTime}
      onStartTimeChange={setBookStartTime}
      durationOptions={durationOptions}
      selectedTierPrice={selectedTierPrice}
      bookingError={bookingError}
      bookingSubmitting={bookingSubmitting}
      user={user}
      onSubmit={submitBookingRequest}
      onAuthRequired={() => setAuthPromptOpen(true)}
      minDate={todayISO()}
    />
  )

  return (
    <div className="bd-page bd-page--bs bd-page--c06">
      <article
        className="bd-shell"
        itemScope
        itemType="https://schema.org/Product"
        data-boat-id={boat.id}
      >
        <div className="bd-detailGrid">
          <div className="bd-detailGrid__leftCol">
            <section
              className={`bd-c06Gallery${photos.length <= 1 ? ' bd-c06Gallery--single' : ''}`}
              aria-label="Фотографии катера"
              onTouchStart={onGalleryTouchStart}
              onTouchEnd={onGalleryTouchEnd}
            >
              <figure
                className="bd-c06Gallery__main"
                onClick={(e) => openGalleryLightboxAt(e, photoIndex)}
                role="presentation"
              >
                <img
                  src={photos[photoIndex]}
                  alt={`${title}, фото ${photoIndex + 1}`}
                  className="bd-c06Gallery__mainImg"
                  loading="eager"
                  decoding="async"
                />
                {photos.length > 1 ? (
                  <div className="bd-c06Gallery__counter" aria-live="polite">
                    {photoIndex + 1} / {photos.length}
                  </div>
                ) : null}
                {videos.length > 0 ? (
                  <button
                    type="button"
                    className="bd-c06Gallery__videoBadge"
                    onClick={openVideoModal}
                    aria-label={`Смотреть видео, ${videos.length}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <rect x="2" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M16 10l6-3v10l-6-3v-4z" fill="currentColor" />
                    </svg>
                    Видео: {videos.length}
                  </button>
                ) : null}
                <div className="bd-c06Gallery__actions">
                  <button
                    type="button"
                    className="bd-c06Gallery__fab"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite()
                    }}
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
                    className="bd-c06Gallery__fab"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShare()
                    }}
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
              </figure>
              {photos.length > 1 ? (
                <div className="bd-c06Gallery__thumbs" role="tablist" aria-label="Миниатюры">
                  {thumbPhotos.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      role="tab"
                      className={`bd-c06Gallery__thumb${i === photoIndex ? ' is-on' : ''}`}
                      onClick={() => setPhotoIndex(i)}
                      aria-label={`Фото ${i + 1}`}
                      aria-selected={i === photoIndex}
                    >
                      <img src={src} alt={`${title}, миниатюра ${i + 1}`} />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <header className="bd-c06Hero">
              <div className="bd-c06Hero__row">
                <h1 className="bd-c06Hero__title" itemProp="name">
                  {title}
                </h1>
                {boat.rating != null ? (
                  <span className="bd-c06Hero__rating">
                    <span className="bd-c06Hero__star" aria-hidden>
                      ★
                    </span>
                    {Number(boat.rating).toFixed(1)}
                    {reviewCount > 0 ? (
                      <span className="bd-c06Hero__ratingMeta">
                        ({reviewCount} {pluralizeReviews(reviewCount)})
                      </span>
                    ) : bookingsN > 0 ? (
                      <span className="bd-c06Hero__ratingMeta">
                        ({bookingsN} {pluralizeBookings(bookingsN)})
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              {locationFullLine && locationFullLine !== '—' ? (
                boat.lat != null && boat.lng != null ? (
                  <a
                    className="bd-heroBs__loc bd-heroBs__loc--link"
                    style={{ marginTop: 0 }}
                    href={`https://yandex.ru/maps/?pt=${boat.lng},${boat.lat}&z=16`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {locationFullLine}
                  </a>
                ) : (
                  <a
                    className="bd-heroBs__loc bd-heroBs__loc--link"
                    style={{ marginTop: 0 }}
                    href={`https://yandex.ru/maps/?text=${encodeURIComponent(locationFullLine)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {locationFullLine}
                  </a>
                )
              ) : (
                <p className="bd-heroBs__loc" style={{ marginTop: 0 }}>
                  —
                </p>
              )}
            </header>

            <ul className="bd-c06Specs" aria-label="Ключевые характеристики">
              <li className="bd-c06Specs__item">
                <span className="bd-c06Specs__icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 15l2-6h10l3 4h3v2H4l-1-0zM7 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span itemProp="category">{typeLabel}</span>
              </li>
              <li className="bd-c06Specs__item">
                <span className="bd-c06Specs__icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3c-2.5 3.5-5 6.2-5 9.5a5 5 0 1 0 10 0C17 9.2 14.5 6.5 12 3z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>Длина: {lengthStr}</span>
              </li>
              <li className="bd-c06Specs__item">
                <span className="bd-c06Specs__icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>Вместимость: {capacity} {capacity !== '—' ? 'человек' : ''}</span>
              </li>
            </ul>

          <div className="bd-detailGrid__primary">
          <main className="bd-main bd-main--below bd-qa">
          <section className="bd-qa__lead" aria-labelledby="bd-desc-heading">
            <h2 id="bd-desc-heading" className="bd-qa__leadH">
              Описание
            </h2>
            {desc ? (
              <>
                <div itemProp="description">
                  <p className={`bd-desc${!descOpen && descLong ? ' bd-desc--clamp' : ''}`}>{desc}</p>
                </div>
                {descLong ? (
                  <button type="button" className="bd-readMore" onClick={() => setDescOpen((v) => !v)}>
                    {descOpen ? 'Свернуть' : 'Читать полностью'}
                  </button>
                ) : null}
              </>
            ) : (
              <div itemProp="description">
                <p className="bd-desc">Владелец пока не добавил описание.</p>
              </div>
            )}
          </section>

          {videos.length > 0 ? (
            <details className="bd-qa__acc" open>
              <summary>Видео ({videos.length})</summary>
              <div className="bd-qa__body">
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
              </div>
            </details>
          ) : null}

          {amenities.length > 0 ? (
            <details className="bd-qa__acc" open>
              <summary>Удобства</summary>
              <div className="bd-qa__body">
                <ul className="bd-qaAmen" role="list">
                  {(amenitiesExpanded || amenities.length <= AMENITIES_PREVIEW
                    ? amenities
                    : amenities.slice(0, AMENITIES_PREVIEW)
                  ).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
                {amenities.length > AMENITIES_PREVIEW && !amenitiesExpanded ? (
                  <button type="button" className="bd-readMore" onClick={() => setAmenitiesExpanded(true)}>
                    Показать все
                  </button>
                ) : null}
              </div>
            </details>
          ) : null}

          <details className="bd-qa__acc">
            <summary>Характеристики</summary>
            <div className="bd-qa__body">
              <dl className="bd-qaSpecs">
                <div>
                  <dt>Год</dt>
                  <dd>{boat.year ? String(boat.year) : '—'}</dd>
                </div>
                <div>
                  <dt>Длина</dt>
                  <dd>{lengthStr}</dd>
                </div>
                <div>
                  <dt>Производитель</dt>
                  <dd>{boat.manufacturer?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt>Модель</dt>
                  <dd>{boat.model?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt>Вместимость</dt>
                  <dd>{capacity}</dd>
                </div>
                <div>
                  <dt>Тип</dt>
                  <dd>{boat.type_name || '—'}</dd>
                </div>
                <div>
                  <dt>Капитан</dt>
                  <dd>{boat.captain_included ? 'Включён' : 'Нет'}</dd>
                </div>
                <div>
                  <dt>Аренда</dt>
                  <dd>{getBookingPeriodLabel(boat)}</dd>
                </div>
              </dl>
            </div>
          </details>

          {durationOptions.length > 0 ? (
            <details className="bd-qa__acc" aria-label="Варианты бронирования">
              <summary>Варианты бронирования</summary>
              <div className="bd-qa__body">
                <p className="bd-qa__kicker">{boat.captain_included ? 'С капитаном' : 'Аренда'}</p>
                <div className="bd-qaTiers" role="list">
                  {bookingTierRows.map((t) => {
                    const active = String(t.duration) === String(bookDuration)
                    return (
                      <button
                        key={t.duration}
                        type="button"
                        className={`bd-qaTier${active ? ' is-on' : ''}`}
                        onClick={() => setBookDuration(String(t.duration))}
                      >
                        <span>{formatDurationListLabel(t.duration)}</span>
                        <strong>{formatPriceRu(t.price)} ₽</strong>
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
              </div>
            </details>
          ) : null}

          <details className="bd-qa__acc">
            <summary>Расположение</summary>
            <div className="bd-qa__body">
              {boat.lat != null && boat.lng != null ? (
                <BoatDetailLocationMap
                  apiKey={YANDEX_MAPS_API_KEY}
                  lat={boat.lat}
                  lng={boat.lng}
                  title={title}
                />
              ) : (
                <p className="bd-locationBs">
                  Точные координаты и причал станут доступны после подтверждения бронирования.
                </p>
              )}
              <p className="bd-locationBs bd-locationBs--muted">{locationFullLine}</p>
              {boat.location_yacht_club ? (
                <p className="bd-locationBs">Яхт-клуб: {boat.location_yacht_club}</p>
              ) : null}
            </div>
          </details>

          <details className="bd-qa__acc" open>
            <summary>Владелец</summary>
            <div className="bd-qa__body">
              <div className="bd-qaOwner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={boat.owner_name || 'Владелец'} className="bd-qaOwner__avatar" />
                ) : (
                  <div className="bd-qaOwner__avatar bd-qaOwner__avatar--ph" aria-hidden>
                    {ownerInitial}
                  </div>
                )}
                <div>
                  <p className="bd-qaOwner__name">{boat.owner_name || 'Владелец'}</p>
                  {boat.rating != null ? (
                    <p className="bd-qaOwner__meta">
                      ★ {Number(boat.rating).toFixed(1)}
                      {boat.reviews_count != null
                        ? ` · ${boat.reviews_count} ${pluralizeReviews(boat.reviews_count)}`
                        : null}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="bd-qaOwner__note">
                Уточните детали выхода и маршрут в чате приложения — владелец ответит после запроса брони.
              </p>
            </div>
          </details>

          <details className="bd-qa__acc" open>
            <summary>
              Отзывы
              {boat.reviews_count != null
                ? ` (${boat.reviews_count} ${pluralizeReviews(boat.reviews_count)})`
                : ''}
            </summary>
            <div className="bd-qa__body">
              {boat.rating != null ? (
                <p className="bd-qaReviews__summary">
                  <span aria-hidden>★</span>
                  <strong>{Number(boat.rating).toFixed(1)}</strong>
                  <span>средняя оценка</span>
                </p>
              ) : null}
              {reviews.length === 0 ? (
                <p className="bd-emptyReviews">Пока нет опубликованных отзывов.</p>
              ) : (
                <div className="bd-qaReviews">
                  {reviews.map((r, idx) => (
                    <article key={r.id ?? `rev-${idx}`} className="bd-qaReview">
                      <div className="bd-qaReview__head">
                        <span className="bd-qaReview__author">{normalizeReviewAuthorName(r.user_name)}</span>
                        <span className="bd-qaReview__stars" aria-label={`Оценка ${r.rating} из 5`}>
                          {'★'.repeat(Math.min(5, Math.max(1, Number(r.rating) || 5)))}
                        </span>
                      </div>
                      <div className="bd-qaReview__date">{formatReviewDate(r.created_at)}</div>
                      {r.text ? <p className="bd-qaReview__text">{r.text}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </details>

          {knowAccordionItems.length > 0 ? (
            <details className="bd-qa__acc">
              <summary>Важно знать</summary>
              <div className="bd-qa__body">
                <div className="bd-qaKnow">
                  {knowAccordionItems.map((item) => (
                    <div key={item.id} className="bd-qaKnow__item">
                      <strong>{item.title}</strong>
                      <p className="bd-policy">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ) : null}
          </main>
          </div>
          </div>

          <aside className="bd-asideFloat">
            {renderBookingCard()}
          </aside>
        </div>
      </article>

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
        <section className="bd-similar bd-similar--ed" aria-labelledby="bd-similar-heading">
          <div className="bd-similar__inner">
            <div className="bd-similar__head">
              <h2 id="bd-similar-heading" className="bd-similar__title">
                Похожие катера
              </h2>
              <div className="bd-similar__headRight">
                <div className="bd-similar__nav" role="group" aria-label="Прокрутка похожих катеров">
                  <button
                    type="button"
                    className="bd-similar__navBtn"
                    aria-label="Назад"
                    onClick={() => scrollSimilarBy(-1)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M15 18l-6-6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="bd-similar__navBtn"
                    aria-label="Вперёд"
                    onClick={() => scrollSimilarBy(1)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M9 18l6-6-6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <Link
                  to={
                    boat?.location_city
                      ? `/boats?city=${encodeURIComponent(String(boat.location_city).trim())}`
                      : '/boats'
                  }
                  className="bd-similar__more"
                >
                  Смотреть все →
                </Link>
              </div>
            </div>
            <div
              ref={similarScrollerRef}
              className="bd-similar__grid"
              tabIndex={0}
              role="region"
              aria-label="Список похожих катеров"
            >
              {similarBoats.map((b) => (
                <BoatResultCard key={b.id} boat={b} filters={{}} layout="editorial" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {videoModalOpen && videos.length > 0
        ? createPortal(
            <div
              className="bd-videoModal"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeVideoModal()
              }}
            >
              <div
                className="bd-videoModal__sheet"
                role="dialog"
                aria-modal="true"
                aria-label={`Видео: ${title}`}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="bd-videoModal__head">
                  <h3 className="bd-videoModal__title">{title}</h3>
                  <button type="button" className="bd-videoModal__close" onClick={closeVideoModal} aria-label="Закрыть">
                    ×
                  </button>
                </div>
                <div className="bd-videoModal__stage">
                  <video
                    key={videos[videoIndex] || videoIndex}
                    className="bd-videoModal__player"
                    src={videos[videoIndex]}
                    controls
                    playsInline
                    autoPlay
                    preload="metadata"
                  />
                </div>
                {videos.length > 1 ? (
                  <div className="bd-videoModal__pager">
                    <button
                      type="button"
                      className="bd-videoModal__nav"
                      onClick={() => setVideoIndex((i) => Math.max(0, i - 1))}
                      disabled={videoIndex <= 0}
                      aria-label="Предыдущее видео"
                    >
                      ‹
                    </button>
                    <span className="bd-videoModal__count">
                      {videoIndex + 1}/{videos.length}
                    </span>
                    <button
                      type="button"
                      className="bd-videoModal__nav"
                      onClick={() => setVideoIndex((i) => Math.min(videos.length - 1, i + 1))}
                      disabled={videoIndex >= videos.length - 1}
                      aria-label="Следующее видео"
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}

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
