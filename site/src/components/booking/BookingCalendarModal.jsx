import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import './bookingCalendarModal.css'

/** Локальный календарный день → YYYY-MM-DD */
function toISOKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISOKey(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

/** Неделя с воскресенья (как в типичном календарном UI). */
const WEEK_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function BookingCalendarModal({ open, onClose, value, onApply, minDate }) {
  const minKey = minDate || toISOKey(new Date())
  const [viewYear, setViewYear] = useState(() => {
    const p = parseISOKey(value) || new Date()
    return p.getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    const p = parseISOKey(value) || new Date()
    return p.getMonth()
  })
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!open) return
    const base = parseISOKey(value) || new Date()
    setViewYear(base.getFullYear())
    setViewMonth(base.getMonth())
    setDraft(value)
  }, [open, value])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const { title, cells } = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const titleStr = first.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    const cap = titleStr.charAt(0).toUpperCase() + titleStr.slice(1)

    const list = []
    for (let i = 0; i < startPad; i++) list.push({ type: 'empty', key: `e-${i}` })
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day)
      list.push({ type: 'day', key: toISOKey(d), date: d, day })
    }
    return { title: cap, cells: list }
  }, [viewYear, viewMonth])

  const goPrev = () => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }

  const goNext = () => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }

  const handleApply = () => {
    if (draft && draft >= minKey) {
      onApply(draft)
    }
    onClose()
  }

  if (!open || typeof document === 'undefined') return null

  const node = (
    <div
      className="bcm-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bcm-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bcm-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="bcm-header">
          <button type="button" className="bcm-nav bcm-nav--prev" onClick={goPrev} aria-label="Предыдущий месяц">
            ‹
          </button>
          <h2 id="bcm-title" className="bcm-monthTitle">
            {title}
          </h2>
          <button type="button" className="bcm-nav bcm-nav--next" onClick={goNext} aria-label="Следующий месяц">
            ›
          </button>
        </div>

        <div className="bcm-weekdays">
          {WEEK_LABELS.map((label, i) => (
            <span key={i} className="bcm-weekday">
              {label}
            </span>
          ))}
        </div>

        <div className="bcm-grid">
          {cells.map((c) => {
            if (c.type === 'empty') return <div key={c.key} className="bcm-cell bcm-cell--empty" />
            const key = c.key
            const disabled = key < minKey
            const selected = key === draft
            return (
              <button
                key={c.key}
                type="button"
                disabled={disabled}
                className={`bcm-day${selected ? ' bcm-day--selected' : ''}${disabled ? ' bcm-day--disabled' : ''}`}
                onClick={() => setDraft(key)}
              >
                {c.day}
              </button>
            )
          })}
        </div>

        <div className="bcm-footer">
          <button type="button" className="bcm-cancel" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="bcm-apply" onClick={handleApply}>
            ПРИМЕНИТЬ
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}

export function formatBookingDateRu(iso) {
  const d = parseISOKey(iso)
  if (!d) return 'Дата'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}
