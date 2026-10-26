import { useEffect, useMemo, useState } from 'react'
import { fetchBoatAvailability } from '../../api/boats.js'
import {
  getAvailableTimeSlotsBySchedule,
  isStartTimeValid,
  isTodayDateKey,
  slotToMinutes,
} from '../../bookingTimeSlots.js'
import { formatPriceRu, minDurationLabel } from '../../boatUtils.js'
import HomeDateCalendar from '../HomeDateCalendar.jsx'

function hoursLabelRu(mins) {
  const n = Number(mins) || 0
  if (n < 60 || n % 60 !== 0) return minDurationLabel({ schedule_min_duration: n })
  const h = Math.round(n / 60)
  const mod10 = h % 10
  const mod100 = h % 100
  if (mod100 >= 11 && mod100 <= 14) return `${h} часов`
  if (mod10 === 1) return `${h} час`
  if (mod10 >= 2 && mod10 <= 4) return `${h} часа`
  return `${h} часов`
}

function canStartSlot(slot, { boat, bookDate, durationMin, busyIntervals }) {
  const inSchedule = getAvailableTimeSlotsBySchedule(boat, bookDate, durationMin).includes(slot)
  const now = new Date()
  const isToday = isTodayDateKey(bookDate)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const isPast = isToday && slotToMinutes(slot) <= currentMinutes
  return !isPast && inSchedule && isStartTimeValid(slot, durationMin, busyIntervals)
}

/**
 * Booking-first панель (концепт 06): календарь + время + длительность + итог.
 */
export default function BookingPanelC06({
  boat,
  boatId,
  bookDate,
  onDateChange,
  bookDuration,
  onDurationChange,
  bookStartTime,
  onStartTimeChange,
  durationOptions,
  selectedTierPrice,
  bookingError,
  bookingSubmitting,
  user,
  onSubmit,
  onAuthRequired,
  minDate,
}) {
  const [busyIntervals, setBusyIntervals] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const durationMin = Number(bookDuration) || 60

  useEffect(() => {
    let cancelled = false
    if (!boatId || !bookDate) {
      setBusyIntervals([])
      return undefined
    }
    setLoadingSlots(true)
    fetchBoatAvailability(boatId, bookDate)
      .then((busy) => {
        if (!cancelled) setBusyIntervals(Array.isArray(busy) ? busy : [])
      })
      .catch(() => {
        if (!cancelled) setBusyIntervals([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })
    return () => {
      cancelled = true
    }
  }, [boatId, bookDate])

  const scheduleSlots = useMemo(
    () => getAvailableTimeSlotsBySchedule(boat, bookDate, durationMin),
    [boat, bookDate, durationMin],
  )

  // Слоты из API-графика; шаг 30/60 уже заложен в getAvailableTimeSlotsBySchedule
  const displaySlots = scheduleSlots

  useEffect(() => {
    if (!bookStartTime) return
    if (
      !canStartSlot(bookStartTime, {
        boat,
        bookDate,
        durationMin,
        busyIntervals,
      })
    ) {
      onStartTimeChange('')
    }
  }, [bookStartTime, boat, bookDate, durationMin, busyIntervals, onStartTimeChange])

  const hours = durationMin / 60
  const hourlyRate =
    hours > 0 && Number.isFinite(Number(selectedTierPrice))
      ? Math.round(Number(selectedTierPrice) / hours)
      : Number(selectedTierPrice) || 0
  const durationText = hoursLabelRu(durationMin)
  const canBook = Boolean(bookStartTime)

  return (
    <div className="bd-c06Book">
      <header className="bd-c06Book__head">
        <span className="bd-c06Book__headIcon" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <h2 className="bd-c06Book__title">Забронировать</h2>
      </header>

      <section className="bd-c06Book__section" aria-labelledby="bd-c06-date">
        <h3 id="bd-c06-date" className="bd-c06Book__label">
          Выберите дату
        </h3>
        <HomeDateCalendar
          className="bd-c06Book__cal"
          value={bookDate}
          minDate={minDate}
          onChange={onDateChange}
          hideFooter
        />
      </section>

      <section className="bd-c06Book__section" aria-labelledby="bd-c06-time">
        <h3 id="bd-c06-time" className="bd-c06Book__label">
          Выберите время
        </h3>
        {loadingSlots ? <p className="bd-c06Book__hint">Загружаем слоты…</p> : null}
        <div className="bd-c06Book__timeGrid" role="group" aria-label="Время начала">
          {displaySlots.map((slot) => {
            const ok = canStartSlot(slot, {
              boat,
              bookDate,
              durationMin,
              busyIntervals,
            })
            const active = bookStartTime === slot
            return (
              <button
                key={slot}
                type="button"
                className={`bd-c06Book__timeBtn${active ? ' is-on' : ''}`}
                disabled={!ok}
                onClick={() => onStartTimeChange(slot)}
              >
                {slot}
              </button>
            )
          })}
        </div>
        {displaySlots.length === 0 ? (
          <p className="bd-c06Book__hint">Нет доступных слотов на эту дату</p>
        ) : null}
      </section>

      <section className="bd-c06Book__section" aria-labelledby="bd-c06-dur">
        <h3 id="bd-c06-dur" className="bd-c06Book__label">
          Длительность
        </h3>
        <div className="bd-c06Book__durGrid" role="group" aria-label="Длительность">
          {durationOptions.map((t) => {
            const active = String(t.duration) === String(bookDuration)
            return (
              <button
                key={t.duration}
                type="button"
                className={`bd-c06Book__durBtn${active ? ' is-on' : ''}`}
                onClick={() => onDurationChange(String(t.duration))}
              >
                {hoursLabelRu(t.duration)}
              </button>
            )
          })}
        </div>
      </section>

      <div className="bd-c06Book__total">
        <div className="bd-c06Book__totalRow">
          <span className="bd-c06Book__totalLabel">Итого</span>
          <strong className="bd-c06Book__totalPrice">{formatPriceRu(selectedTierPrice)} ₽</strong>
        </div>
        <p className="bd-c06Book__totalMeta">
          {durationText} × {formatPriceRu(hourlyRate)} ₽/час
        </p>
      </div>

      {bookingError ? <p className="bd-c06Book__error">{bookingError}</p> : null}

      {canBook ? (
        user ? (
          <button
            type="button"
            className="bd-c06Book__cta"
            onClick={onSubmit}
            disabled={bookingSubmitting}
          >
            <span>{bookingSubmitting ? 'Отправляем…' : 'Забронировать'}</span>
            {!bookingSubmitting ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </button>
        ) : (
          <button type="button" className="bd-c06Book__cta" onClick={onAuthRequired}>
            <span>Забронировать</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )
      ) : (
        <button type="button" className="bd-c06Book__cta bd-c06Book__cta--disabled" disabled>
          Забронировать
        </button>
      )}
    </div>
  )
}
