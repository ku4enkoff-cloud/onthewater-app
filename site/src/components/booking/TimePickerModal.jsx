import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchBoatAvailability } from '../../api/boats.js'
import {
  getAvailableTimeSlotsBySchedule,
  isStartTimeValid,
  isTodayDateKey,
  slotToMinutes,
  TIME_SLOTS,
} from '../../bookingTimeSlots.js'

const NAVY = '#002b5b'

function canStartSlot(slot, { boat, bookDate, durationMin, busyIntervals }) {
  const inSchedule = getAvailableTimeSlotsBySchedule(boat, bookDate, durationMin).includes(slot)
  const now = new Date()
  const isToday = isTodayDateKey(bookDate)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const isPast = isToday && slotToMinutes(slot) <= currentMinutes
  return !isPast && inSchedule && isStartTimeValid(slot, durationMin, busyIntervals)
}

export default function TimePickerModal({
  open,
  onClose,
  boat,
  boatId,
  bookDate,
  durationMin,
  value,
  onApply,
}) {
  const [busyIntervals, setBusyIntervals] = useState([])
  const [loading, setLoading] = useState(false)
  const [pendingTime, setPendingTime] = useState(null)

  const boatScheduleKey = useMemo(
    () =>
      [boat?.id, String(boat?.schedule_weekday_hours), String(boat?.schedule_weekend_hours)]
        .filter(Boolean)
        .join('|') || 'no-boat',
    [boat],
  )

  const load = useCallback(async () => {
    if (!open || !boatId || !bookDate) {
      setBusyIntervals([])
      return
    }
    setLoading(true)
    try {
      const busy = await fetchBoatAvailability(boatId, bookDate)
      setBusyIntervals(Array.isArray(busy) ? busy : [])
    } catch {
      setBusyIntervals([])
    } finally {
      setLoading(false)
    }
  }, [open, boatId, bookDate])

  useEffect(() => {
    if (!open) {
      setPendingTime(null)
      setBusyIntervals([])
      return
    }
    load()
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const slots = getAvailableTimeSlotsBySchedule(boat, bookDate, durationMin)
    let valid = value && slots.includes(value)
    if (valid && isTodayDateKey(bookDate)) {
      const now = new Date()
      const currMin = now.getHours() * 60 + now.getMinutes()
      valid = slotToMinutes(value) > currMin
    }
    setPendingTime(valid ? value : null)
  }, [open, bookDate, durationMin, value, boatScheduleKey])

  useEffect(() => {
    if (!open) return
    setPendingTime((p) => {
      if (!p) return p
      return canStartSlot(p, { boat, bookDate, durationMin, busyIntervals }) ? p : null
    })
  }, [open, busyIntervals, bookDate, durationMin, boatScheduleKey])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="tpm-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="tpm-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpm-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tpm-header">
          <button type="button" className="tpm-close" onClick={onClose} aria-label="Закрыть">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke={NAVY}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h2 id="tpm-title" className="tpm-headerTitle">
            Время начала
          </h2>
          <span className="tpm-headerSp" aria-hidden />
        </div>
        <div className="tpm-hint">
          {loading ? (
            <div className="tpm-loading" aria-live="polite" />
          ) : (
            <p className="tpm-hintText">Доступное время — зелёным, недоступное — красным.</p>
          )}
        </div>
        <div className="tpm-gridWrap">
          <div className="tpm-grid" role="list">
            {TIME_SLOTS.map((slot) => {
              const canStart = canStartSlot(slot, { boat, bookDate, durationMin, busyIntervals })
              const isSelected = pendingTime === slot
              const disabled = !canStart
              return (
                <button
                  key={slot}
                  type="button"
                  role="listitem"
                  className={[
                    'tpm-slot',
                    isSelected && 'tpm-slot--selected',
                    canStart && !isSelected && 'tpm-slot--ok',
                    !canStart && 'tpm-slot--off',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={disabled}
                  onClick={() => {
                    if (canStart) setPendingTime(slot)
                  }}
                >
                  <span
                    className={[
                      'tpm-slotText',
                      isSelected && 'tpm-slotText--selected',
                      canStart && !isSelected && 'tpm-slotText--ok',
                      !canStart && 'tpm-slotText--off',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {slot}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="tpm-footer">
          <button
            type="button"
            className={`tpm-apply${!pendingTime ? ' tpm-apply--disabled' : ''}`}
            disabled={!pendingTime}
            onClick={() => {
              if (pendingTime) onApply(pendingTime)
              onClose()
            }}
          >
            ПРИМЕНИТЬ
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
