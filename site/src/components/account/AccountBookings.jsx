import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, MapPin, Ship, Users, X } from 'lucide-react'
import { cancelBooking } from '../../api/bookings'
import { createBoatReview } from '../../api/boats'
import ReviewModal from './ReviewModal.jsx'
import { getPhotoUrl } from '../../config'
import { boatDetailPath } from '../../boatUrl'
import { formatGuestLabelRu } from '../../boatUtils'
import {
  STATUS_LABELS,
  bookingGroup,
  bookingStatus,
  canCancelBooking,
  formatBookingDate,
  formatDurationRu,
  formatMooring,
  formatRub,
} from './accountUtils'

const FILTERS = [
  { id: 'upcoming', label: 'Предстоящие', empty: 'Предстоящих поездок нет.' },
  { id: 'completed', label: 'Завершённые', empty: 'Завершённых поездок пока нет.' },
  { id: 'cancelled', label: 'Отменённые', empty: 'Отменённых бронирований нет.' },
]

function BookingPhoto({ booking }) {
  const src = booking.boat_photo ? getPhotoUrl(booking.boat_photo) : null
  const [failed, setFailed] = useState(false)
  return (
    <div className="acc-booking__photo">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <Ship size={28} strokeWidth={1.4} aria-hidden />
      )}
    </div>
  )
}

export default function AccountBookings({
  token,
  bookings,
  setBookings,
  loading,
  error,
  onMessageOwner,
  reviewedBoatIds,
  onReviewCreated,
}) {
  const [filter, setFilter] = useState(null)
  const [reviewFor, setReviewFor] = useState(null)
  const [detail, setDetail] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [actionError, setActionError] = useState('')

  const groups = useMemo(() => {
    const now = Date.now()
    const out = { upcoming: [], completed: [], cancelled: [] }
    for (const b of bookings) out[bookingGroup(b, now)].push(b)
    const byStart = (a, b) => new Date(a.start_at || 0) - new Date(b.start_at || 0)
    out.upcoming.sort(byStart)
    out.completed.sort((a, b) => byStart(b, a))
    out.cancelled.sort((a, b) => byStart(b, a))
    return out
  }, [bookings])

  const activeFilter = filter || (groups.upcoming.length === 0 && groups.completed.length > 0 ? 'completed' : 'upcoming')
  const list = groups[activeFilter]
  const emptyText = FILTERS.find((f) => f.id === activeFilter)?.empty

  useEffect(() => {
    if (!detail) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setDetail(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail])

  const handleCancel = async () => {
    if (!detail?.id) return
    if (!window.confirm('Вы уверены, что хотите отменить бронирование?')) return
    try {
      setCancelling(true)
      setActionError('')
      const updated = await cancelBooking(token, detail.id)
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)))
      setDetail((prev) => (prev ? { ...prev, ...updated } : prev))
    } catch (err) {
      setActionError(err?.message || 'Не удалось отменить бронирование')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <section className="acc-section" aria-labelledby="acc-bookings-title">
      <h1 id="acc-bookings-title" className="acc-title">
        Мои бронирования
      </h1>

      <div className="acc-seg" role="tablist" aria-label="Фильтр бронирований">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === f.id}
            className={`acc-seg__btn${activeFilter === f.id ? ' is-on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {groups[f.id].length > 0 ? <span className="acc-seg__count">{groups[f.id].length}</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="acc-muted">Загружаем бронирования…</p>
      ) : error ? (
        <p className="acc-error">{error}</p>
      ) : list.length === 0 ? (
        <div className="acc-empty">
          <p>{emptyText}</p>
          <Link className="acc-btn" to="/boats">
            Найти катер
          </Link>
        </div>
      ) : (
        <div className="acc-bookings">
          {list.map((b) => {
            const status = bookingStatus(b)
            const mooring = formatMooring(b)
            const group = bookingGroup(b)
            return (
              <article key={b.id} className="acc-booking">
                <button
                  type="button"
                  className="acc-booking__main"
                  onClick={() => {
                    setActionError('')
                    setDetail(b)
                  }}
                >
                  <BookingPhoto booking={b} />
                  <div className="acc-booking__body">
                    <h3 className="acc-booking__title">{b.boat_title || 'Катер'}</h3>
                    <ul className="acc-booking__meta">
                      <li>
                        <CalendarDays size={15} aria-hidden />
                        {formatBookingDate(b.start_at)}
                      </li>
                      <li>
                        <Clock size={15} aria-hidden />
                        {formatDurationRu(b.hours)} · {formatGuestLabelRu(b.passengers)}
                      </li>
                      {mooring ? (
                        <li>
                          <MapPin size={15} aria-hidden />
                          {mooring}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </button>
                <div className="acc-booking__side">
                  <strong className="acc-booking__price">{formatRub(b.total_price)}</strong>
                  <span className={`acc-status acc-status--${status}`}>{STATUS_LABELS[status] || status}</span>
                  <div className="acc-booking__links">
                    {b.boat_id && status !== 'cancelled' ? (
                      <button type="button" className="acc-link" onClick={() => onMessageOwner(b.boat_id)}>
                        Написать владельцу
                      </button>
                    ) : null}
                    {group === 'completed' && b.boat_id && !reviewedBoatIds.has(String(b.boat_id)) ? (
                      <button type="button" className="acc-link" onClick={() => setReviewFor(b)}>
                        Оставить отзыв
                      </button>
                    ) : null}
                    {group === 'cancelled' && b.boat_id ? (
                      <Link className="acc-link" to={boatDetailPath({ id: b.boat_id, title: b.boat_title })}>
                        Забронировать снова
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {detail ? (
        <div
          className="acc-modal"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetail(null)
          }}
        >
          <div className="acc-modal__sheet" role="dialog" aria-modal="true" aria-labelledby="acc-detail-title">
            <button type="button" className="acc-modal__close" onClick={() => setDetail(null)} aria-label="Закрыть">
              <X size={18} />
            </button>
            {detail.boat_photo ? (
              <img className="acc-modal__photo" src={getPhotoUrl(detail.boat_photo)} alt="" />
            ) : null}
            <div className="acc-modal__body">
              <span className={`acc-status acc-status--${bookingStatus(detail)}`}>
                {STATUS_LABELS[bookingStatus(detail)] || bookingStatus(detail)}
              </span>
              <h2 id="acc-detail-title" className="acc-modal__title">
                {detail.boat_title || 'Бронирование'}
              </h2>
              <dl className="acc-modal__grid">
                <div>
                  <dt>
                    <CalendarDays size={15} aria-hidden /> Дата и время
                  </dt>
                  <dd>{formatBookingDate(detail.start_at)}</dd>
                </div>
                <div>
                  <dt>
                    <Clock size={15} aria-hidden /> Длительность
                  </dt>
                  <dd>{formatDurationRu(detail.hours)}</dd>
                </div>
                <div>
                  <dt>
                    <Users size={15} aria-hidden /> Гостей
                  </dt>
                  <dd>{Number(detail.passengers) || 1}</dd>
                </div>
                <div>
                  <dt>
                    <MapPin size={15} aria-hidden /> Причал
                  </dt>
                  <dd>{formatMooring(detail) || 'Адрес появится после подтверждения'}</dd>
                </div>
              </dl>
              <div className="acc-modal__total">
                <span>Итого</span>
                <strong>{formatRub(detail.total_price)}</strong>
              </div>
              {actionError ? <p className="acc-error">{actionError}</p> : null}
              <div className="acc-modal__actions">
                {detail.boat_id && bookingStatus(detail) !== 'cancelled' ? (
                  <button
                    type="button"
                    className="acc-btn"
                    onClick={() => {
                      setDetail(null)
                      onMessageOwner(detail.boat_id)
                    }}
                  >
                    Написать владельцу
                  </button>
                ) : null}
                {canCancelBooking(detail) ? (
                  <button type="button" className="acc-btn acc-btn--ghost" onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? 'Отменяем…' : 'Отменить бронирование'}
                  </button>
                ) : null}
                {detail.boat_id ? (
                  <Link className="acc-link" to={boatDetailPath({ id: detail.boat_id, title: detail.boat_title })}>
                    Страница катера
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {reviewFor ? (
        <ReviewModal
          title={reviewFor.boat_title || 'Катер'}
          onClose={() => setReviewFor(null)}
          onSubmit={async (payload) => {
            await createBoatReview(token, reviewFor.boat_id, payload)
            onReviewCreated()
          }}
        />
      ) : null}
    </section>
  )
}
