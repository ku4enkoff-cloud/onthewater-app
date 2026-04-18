import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SITE_MAIN_URL } from '../../config'
import {
  formatPriceRu,
  getEffectiveMinDurationMinutes,
  getMinDurationPrice,
  minDurationLabel,
} from '../../boatUtils'
import BookingCalendarModal from './BookingCalendarModal.jsx'
import TimePickerModal from './TimePickerModal.jsx'
import './bookingRequestModal.css'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLongRu(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—'
  const [y, m, day] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, day)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function guestLabel(n) {
  const v = Math.max(1, Math.floor(n))
  const x = v % 100
  if (x >= 11 && x <= 14) return `${v} гостей`
  const d = v % 10
  if (d === 1) return `${v} гость`
  if (d >= 2 && d <= 4) return `${v} гостя`
  return `${v} гостей`
}

export default function BookingRequestModal({
  open,
  onClose,
  boat,
  boatId,
  bookDate,
  onBookDateChange,
  bookDuration,
  onBookDurationChange,
  tiers: tiersProp,
  minDate,
  heroImage,
}) {
  const [startTime, setStartTime] = useState('')
  const [guests, setGuests] = useState(1)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  const calendarOpenRef = useRef(false)
  const timeOpenRef = useRef(false)
  useEffect(() => {
    calendarOpenRef.current = calendarOpen
  }, [calendarOpen])
  useEffect(() => {
    timeOpenRef.current = timeOpen
  }, [timeOpen])

  const tiers = useMemo(() => {
    if (tiersProp && tiersProp.length > 0) return tiersProp
    if (!boat) return []
    const d0 = getEffectiveMinDurationMinutes(boat)
    return [{ duration: d0, price: getMinDurationPrice(boat) }]
  }, [tiersProp, boat])

  const maxGuests = Math.max(1, Math.min(50, Number(boat?.capacity) || 12))

  const selectedPrice = useMemo(() => {
    const d = Number(bookDuration) || (tiers[0] ? tiers[0].duration : 60)
    const t = tiers.find((x) => x.duration === d)
    return t ? t.price : 0
  }, [bookDuration, tiers])

  const canSubmit = Boolean(startTime)

  const appHref = useMemo(() => {
    const base = SITE_MAIN_URL.replace(/\/$/, '')
    const q = new URLSearchParams()
    if (boatId) q.set('boat', String(boatId))
    if (bookDate) q.set('date', bookDate)
    if (bookDuration) q.set('duration', String(bookDuration))
    if (startTime) q.set('time', startTime)
    q.set('guests', String(guests))
    const s = q.toString()
    return s ? `${base}/?${s}` : `${base}/`
  }, [boatId, bookDate, bookDuration, startTime, guests])

  useEffect(() => {
    if (!open) return
    setStartTime('')
    setGuests(1)
  }, [open, boatId])

  useEffect(() => {
    if (!open) return
    setStartTime('')
  }, [bookDate, bookDuration])

  useEffect(() => {
    if (open) return
    setCalendarOpen(false)
    setTimeOpen(false)
  }, [open])

  const onKey = useCallback(
    (e) => {
      if (e.key !== 'Escape') return
      if (timeOpenRef.current) {
        setTimeOpen(false)
        return
      }
      if (calendarOpenRef.current) {
        setCalendarOpen(false)
        return
      }
      onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onKey])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        className="brm-overlay"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="brm-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="brm-title"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {heroImage ? (
            <div className="brm-hero">
              <img src={heroImage} alt="" className="brm-heroImg" />
            </div>
          ) : null}
          <div className="brm-head">
            <button type="button" className="brm-back" onClick={onClose} aria-label="Назад">
              ‹
            </button>
            <h2 id="brm-title" className="brm-title">
              Запрос на бронирование
            </h2>
            <span className="brm-headSp" aria-hidden />
          </div>

          <div className="brm-body">
            <p className="brm-sectionLabel">Длительность</p>

            <div className="brm-chips" role="group" aria-label="Длительность">
              {tiers.map((t) => {
                const active = String(t.duration) === String(bookDuration)
                return (
                  <button
                    key={t.duration}
                    type="button"
                    className={`brm-chip${active ? ' brm-chip--on' : ''}`}
                    onClick={() => onBookDurationChange(String(t.duration))}
                  >
                    {minDurationLabel({ schedule_min_duration: t.duration })}
                  </button>
                )
              })}
            </div>

            <div className="brm-field">
              <span className="brm-lbl">Дата</span>
              <div className="brm-dateRow">
                <button type="button" className="brm-inputLike" onClick={() => setCalendarOpen(true)}>
                  {formatDateLongRu(bookDate)}
                </button>
                <button
                  type="button"
                  className="brm-clear"
                  aria-label="Сбросить дату на сегодня"
                  onClick={() => onBookDateChange(todayISO())}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="brm-field">
              <button
                type="button"
                className="brm-timeField"
                onClick={() => setTimeOpen(true)}
                aria-label="Выбрать время начала"
              >
                {startTime ? (
                  <span className="brm-timeFieldStack">
                    <span className="brm-timeFieldSublab">Время начала</span>
                    <span className="brm-timeFieldVal">{startTime}</span>
                  </span>
                ) : (
                  <span className="brm-timeFieldPh">Время начала</span>
                )}
                <span className="brm-timeFieldIcon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#9ca3af" strokeWidth="1.5" />
                    <path
                      d="M12 7v5l3 2"
                      stroke="#9ca3af"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </div>

            <div className="brm-field brm-guests">
              <span className="brm-lbl brm-sr">Число гостей</span>
              <button
                type="button"
                className="brm-step"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={guests <= 1}
                aria-label="Меньше гостей"
              >
                −
              </button>
              <span className="brm-guestsTxt">{guestLabel(guests)}</span>
              <button
                type="button"
                className="brm-step"
                onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                disabled={guests >= maxGuests}
                aria-label="Больше гостей"
              >
                +
              </button>
            </div>
          </div>

          <div className="brm-footerBar">
            <div className="brm-total">
              <span className="brm-totalNum">{formatPriceRu(selectedPrice)}</span>
              <span className="brm-totalCur">₽</span>
            </div>
            {canSubmit ? (
              <a
                className="brm-cta brm-cta--active"
                href={appHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onClose()}
              >
                ЗАБРОНИРОВАТЬ
              </a>
            ) : (
              <span className="brm-cta brm-cta--disabled" aria-disabled>
                ЗАБРОНИРОВАТЬ
              </span>
            )}
          </div>
        </div>
      </div>

      <BookingCalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={bookDate}
        onApply={onBookDateChange}
        minDate={minDate}
      />
      <TimePickerModal
        open={timeOpen}
        onClose={() => setTimeOpen(false)}
        boat={boat}
        boatId={boatId}
        bookDate={bookDate}
        durationMin={Number(bookDuration) || 60}
        value={startTime}
        onApply={(slot) => setStartTime(slot)}
      />
    </>,
    document.body,
  )
}
