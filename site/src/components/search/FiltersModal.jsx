import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './filtersModal.css'
import { filterBoatsList, formatDurationListLabel, formatPriceShort } from '../../boatSearchUtils'

const NAVY = '#1b365d'
const WATER_SPORTS_OPTIONS = ['Вейкборд', 'Вейксерф', 'Водные лыжи']

function pluralizeResults(n) {
  const x = Math.abs(Number(n)) || 0
  const mod100 = x % 100
  const mod10 = x % 10
  if (mod100 >= 11 && mod100 <= 14) return 'результатов'
  if (mod10 === 1) return 'результат'
  if (mod10 >= 2 && mod10 <= 4) return 'результата'
  return 'результатов'
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max)
}

export function DualRangeSlider({ low, high, min, max, onChange }) {
  const trackRef = useRef(null)
  const dragging = useRef(null)
  const lowRef = useRef(low)
  const highRef = useRef(high)
  const [, setLayoutTick] = useState(0)

  useEffect(() => {
    lowRef.current = low
    highRef.current = high
  }, [low, high])

  /** После открытия модалки ширина трека может быть 0 → оба thumb слева; перерисовываем при layout. */
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return undefined
    const bump = () => setLayoutTick((t) => t + 1)
    const ro = new ResizeObserver(() => bump())
    ro.observe(el)
    bump()
    return () => ro.disconnect()
  }, [])

  const valFromClientX = useCallback(
    (clientX) => {
      const el = trackRef.current
      if (!el) return min
      const rect = el.getBoundingClientRect()
      const w = rect.width
      if (w <= 0) return min
      const t = clamp((clientX - rect.left) / w, 0, 1)
      return Math.round(min + t * (max - min))
    },
    [min, max],
  )

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      if (e.cancelable && e.type === 'touchmove') e.preventDefault()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const val = valFromClientX(clientX)
      const gap = Math.min(500, Math.max(1, max - min - 1))
      if (dragging.current === 'low') {
        const hi = highRef.current
        onChange(Math.min(val, hi - gap), hi)
      } else {
        const lo = lowRef.current
        onChange(lo, Math.max(val, lo + gap))
      }
    }
    const onUp = () => {
      dragging.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [onChange, valFromClientX, min, max])

  const lo = Math.min(low, high)
  const hi = Math.max(low, high)
  const span = max > min ? max - min : 1
  const lowPct = clamp(((lo - min) / span) * 100, 0, 100)
  const highPct = clamp(((hi - min) / span) * 100, 0, 100)

  return (
    <div className="fm-rangeTrack" ref={trackRef}>
      <div className="fm-rangeTrackInner">
        <div
          className="fm-rangeFill"
          style={{
            left: `${lowPct}%`,
            width: `${Math.max(0, highPct - lowPct)}%`,
          }}
        />
      </div>
      <button
        type="button"
        className="fm-rangeThumb"
        style={{ left: `${lowPct}%` }}
        aria-label="Минимальная цена"
        onMouseDown={(e) => {
          e.preventDefault()
          dragging.current = 'low'
        }}
        onTouchStart={(e) => {
          e.preventDefault()
          dragging.current = 'low'
        }}
      />
      <button
        type="button"
        className="fm-rangeThumb fm-rangeThumb--high"
        style={{ left: `${highPct}%` }}
        aria-label="Максимальная цена"
        onMouseDown={(e) => {
          e.preventDefault()
          dragging.current = 'high'
        }}
        onTouchStart={(e) => {
          e.preventDefault()
          dragging.current = 'high'
        }}
      />
    </div>
  )
}

/**
 * Как mobile/src/client/components/FiltersModal.js — цена (два ползунка), гости, длительность, капитан, вейкборд.
 */
export default function FiltersModal({
  onClose,
  filters,
  onApply,
  allBoats,
  priceRange,
  durationOptions = [30, 60, 120, 180, 240, 360, 480],
  maxPassengers = 20,
  focusSection = null,
}) {
  const pMin = priceRange.min
  const pMax = priceRange.max > pMin ? priceRange.max : pMin + 1000

  const sectionPriceRef = useRef(null)
  const sectionGuestsRef = useRef(null)
  const sectionDurationRef = useRef(null)
  const sectionCaptainRef = useRef(null)

  useLayoutEffect(() => {
    if (!focusSection) return
    const map = {
      price: sectionPriceRef,
      passengers: sectionGuestsRef,
      duration: sectionDurationRef,
      captain: sectionCaptainRef,
    }
    const el = map[focusSection]?.current
    if (el) {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [focusSection])

  const [priceLow, setPriceLow] = useState(() => {
    const lo = clamp(filters.priceLow ?? pMin, pMin, pMax)
    const hi = clamp(filters.priceHigh ?? pMax, pMin, pMax)
    return Math.min(lo, hi)
  })
  const [priceHigh, setPriceHigh] = useState(() => {
    const lo = clamp(filters.priceLow ?? pMin, pMin, pMax)
    const hi = clamp(filters.priceHigh ?? pMax, pMin, pMax)
    return Math.max(lo, hi)
  })
  const [passengers, setPassengers] = useState(() => filters.passengers ?? 1)
  const [duration, setDuration] = useState(() => filters.duration ?? null)
  const [captain, setCaptain] = useState(() => filters.captain ?? null)
  const [waterSports, setWaterSports] = useState(() =>
    Array.isArray(filters.waterSports) ? [...filters.waterSports] : [],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handlePriceChange = useCallback((low, high) => {
    setPriceLow(low)
    setPriceHigh(high)
  }, [])

  const countActiveInModal = () => {
    let n = 0
    if (priceLow > pMin || priceHigh < pMax) n++
    if (passengers !== 1) n++
    if (duration) n++
    if (captain) n++
    if (waterSports.length > 0) n++
    return n
  }

  const previewCount = useMemo(() => {
    const merged = {
      ...filters,
      priceLow,
      priceHigh,
      passengers,
      duration,
      captain,
      waterSports,
    }
    return filterBoatsList(allBoats, merged, priceRange).length
  }, [
    allBoats,
    filters,
    priceLow,
    priceHigh,
    passengers,
    duration,
    captain,
    waterSports,
    priceRange,
  ])

  const handleClear = () => {
    setPriceLow(pMin)
    setPriceHigh(pMax)
    setPassengers(1)
    setDuration(null)
    setCaptain(null)
    setWaterSports([])
  }

  const handleApply = () => {
    onApply({
      priceLow,
      priceHigh,
      passengers,
      duration,
      captain,
      waterSports,
    })
    onClose()
  }

  const node = (
    <div
      className="fm-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="fm-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fm-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="fm-header">
          <button type="button" className="fm-close" onClick={onClose} aria-label="Закрыть">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke={NAVY}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="fm-headerCenter">
            <h2 id="fm-dialog-title" className="fm-title">
              Фильтры
            </h2>
            {countActiveInModal() > 0 ? (
              <span className="fm-badge">{countActiveInModal()}</span>
            ) : null}
          </div>
          <span style={{ width: 40 }} aria-hidden />
        </div>

        <div className="fm-scroll">
          <div className="fm-section" ref={sectionPriceRef}>
            <div className="fm-sectionHead">
              <span className="fm-sectionTitle">Цена</span>
              <span className="fm-priceLabel">
                {formatPriceShort(priceLow)} – {formatPriceShort(priceHigh)} ₽
              </span>
            </div>
            <DualRangeSlider
              low={priceLow}
              high={priceHigh}
              min={pMin}
              max={pMax}
              onChange={handlePriceChange}
            />
          </div>

          <div className="fm-divider" />

          <div className="fm-section" ref={sectionGuestsRef}>
            <div className="fm-sectionHead">
              <span className="fm-sectionTitle">Гости</span>
              <div className="fm-stepper">
                <button
                  type="button"
                  className="fm-stepBtn"
                  disabled={passengers <= 1}
                  onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                  aria-label="Меньше гостей"
                >
                  −
                </button>
                <span className="fm-stepVal">{passengers}</span>
                <button
                  type="button"
                  className="fm-stepBtn"
                  disabled={passengers >= maxPassengers}
                  onClick={() => setPassengers((p) => Math.min(maxPassengers, p + 1))}
                  aria-label="Больше гостей"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="fm-divider" />

          <div className="fm-section" ref={sectionDurationRef}>
            <p className="fm-sectionTitle" style={{ marginBottom: 12 }}>
              Длительность
            </p>
            <div className="fm-chipRow fm-chipRow--scroll">
              {durationOptions.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`fm-chip${duration === mins ? ' fm-chip--on' : ''}`}
                  onClick={() => setDuration(duration === mins ? null : mins)}
                >
                  {formatDurationListLabel(mins)}
                </button>
              ))}
            </div>
          </div>

          <div className="fm-divider" />

          <div className="fm-section" ref={sectionCaptainRef}>
            <p className="fm-sectionTitle" style={{ marginBottom: 12 }}>
              Капитан
            </p>
            <div className="fm-chipRow">
              <button
                type="button"
                className={`fm-chip${captain === 'С капитаном' ? ' fm-chip--on' : ''}`}
                onClick={() => setCaptain(captain === 'С капитаном' ? null : 'С капитаном')}
              >
                С капитаном
              </button>
              <button
                type="button"
                className={`fm-chip${captain === 'Без капитана' ? ' fm-chip--on' : ''}`}
                onClick={() => setCaptain(captain === 'Без капитана' ? null : 'Без капитана')}
              >
                Без капитана
              </button>
            </div>
          </div>

          <div className="fm-divider" />

          <div className="fm-section">
            <p className="fm-sectionTitle" style={{ marginBottom: 12 }}>
              Водные виды спорта
            </p>
            <div className="fm-chipRow">
              {WATER_SPORTS_OPTIONS.map((sport) => {
                const selected = waterSports.includes(sport)
                return (
                  <button
                    key={sport}
                    type="button"
                    className={`fm-chip${selected ? ' fm-chip--on' : ''}`}
                    onClick={() =>
                      setWaterSports((prev) =>
                        prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
                      )
                    }
                  >
                    {sport}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="fm-footer">
          <button type="button" className="fm-clear" onClick={handleClear}>
            Сбросить
          </button>
          <button type="button" className="fm-apply" onClick={handleApply}>
            Показать {previewCount} {pluralizeResults(previewCount)}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(node, document.body)
}
