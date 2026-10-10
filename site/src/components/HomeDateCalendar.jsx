import { useMemo, useState } from 'react'

const WEEK_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

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

function monthTitle(year, month) {
  const s = new Date(year, month, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildCells(year, month) {
  const first = new Date(year, month, 1)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = 0; i < startPad; i++) {
    const day = prevMonthDays - startPad + 1 + i
    const d = new Date(year, month - 1, day)
    cells.push({ key: toISOKey(d), day, outside: true, date: d })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    cells.push({ key: toISOKey(d), day, outside: false, date: d })
  }
  let nextDay = 1
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const d = new Date(year, month + 1, nextDay)
    cells.push({ key: toISOKey(d), day: nextDay, outside: true, date: d })
    nextDay += 1
    if (cells.length >= 42) break
  }
  return cells
}

/**
 * Поповер календаря для поиска на главной (стиль precision-home).
 */
export default function HomeDateCalendar({ value, minDate, onChange, onClose, hideFooter = false, className = '' }) {
  const minKey = minDate || toISOKey(new Date())
  const initial = parseISOKey(value) || new Date()
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const cells = useMemo(() => buildCells(viewYear, viewMonth), [viewYear, viewMonth])
  const title = monthTitle(viewYear, viewMonth)
  const todayKey = toISOKey(new Date())

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

  const pick = (key) => {
    if (key < minKey) return
    onChange(key)
    onClose?.()
  }

  return (
    <div className={['pm-cal', className].filter(Boolean).join(' ')} role="dialog" aria-label="Выбор даты">
      <div className="pm-cal__head">
        <div className="pm-cal__titleWrap">
          <span className="pm-cal__title">{title}</span>
        </div>
        <div className="pm-cal__nav">
          <button type="button" className="pm-cal__navBtn" onClick={goPrev} aria-label="Предыдущий месяц">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="pm-cal__navBtn" onClick={goNext} aria-label="Следующий месяц">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 10l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="pm-cal__weekdays">
        {WEEK_LABELS.map((label) => (
          <span key={label} className="pm-cal__weekday">
            {label}
          </span>
        ))}
      </div>

      <div className="pm-cal__grid">
        {cells.map((c) => {
          const disabled = c.key < minKey
          const selected = value && c.key === value
          const isToday = c.key === todayKey
          return (
            <button
              key={c.key}
              type="button"
              disabled={disabled}
              className={[
                'pm-cal__day',
                c.outside ? 'is-outside' : '',
                selected ? 'is-selected' : '',
                isToday && !selected ? 'is-today' : '',
                disabled ? 'is-disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => pick(c.key)}
            >
              {c.day}
            </button>
          )
        })}
      </div>

      {hideFooter ? null : (
        <div className="pm-cal__footer">
          <button
            type="button"
            className="pm-cal__link"
            onClick={() => {
              onChange('')
              onClose?.()
            }}
          >
            Удалить
          </button>
          <button
            type="button"
            className="pm-cal__link"
            disabled={todayKey < minKey}
            onClick={() => pick(todayKey)}
          >
            Сегодня
          </button>
        </div>
      )}
    </div>
  )
}
