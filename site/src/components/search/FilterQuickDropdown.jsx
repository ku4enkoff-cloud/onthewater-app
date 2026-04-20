import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DualRangeSlider } from './FiltersModal.jsx'
import { filterBoatsList, formatDurationListLabel, formatPriceShort } from '../../boatSearchUtils'

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max)
}

function PricePanel({ filters, onFiltersChange, pMin, pMax }) {
  const lo = clamp(filters.priceLow ?? pMin, pMin, pMax)
  const hi = clamp(filters.priceHigh ?? pMax, pMin, pMax)
  const priceLow = Math.min(lo, hi)
  const priceHigh = Math.max(lo, hi)
  const handlePriceChange = (low, high) => {
    onFiltersChange({ priceLow: low, priceHigh: high })
  }
  return (
    <div className="fm-section">
      <div className="fm-sectionHead">
        <span className="fm-sectionTitle">Цена</span>
        <span className="fm-priceLabel">
          {formatPriceShort(priceLow)} – {formatPriceShort(priceHigh)} ₽
        </span>
      </div>
      <DualRangeSlider low={priceLow} high={priceHigh} min={pMin} max={pMax} onChange={handlePriceChange} />
    </div>
  )
}

function GuestsPanel({ filters, onFiltersChange, maxPassengers }) {
  const passengers = filters.passengers ?? 1
  return (
    <div className="fm-section">
      <div className="fm-sectionHead">
        <span className="fm-sectionTitle">Гости</span>
        <div className="fm-stepper">
          <button
            type="button"
            className="fm-stepBtn"
            disabled={passengers <= 1}
            onClick={() => onFiltersChange({ passengers: Math.max(1, passengers - 1) })}
            aria-label="Меньше гостей"
          >
            −
          </button>
          <span className="fm-stepVal">{passengers}</span>
          <button
            type="button"
            className="fm-stepBtn"
            disabled={passengers >= maxPassengers}
            onClick={() => onFiltersChange({ passengers: Math.min(maxPassengers, passengers + 1) })}
            aria-label="Больше гостей"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

function DurationPanel({ filters, onFiltersChange, durationOptions }) {
  const duration = filters.duration ?? null
  return (
    <div className="fm-section">
      <p className="fm-sectionTitle" style={{ marginBottom: 12 }}>
        Длительность
      </p>
      <div className="fm-chipRow fm-chipRow--scroll fqd-durationRow">
        {durationOptions.map((mins) => (
          <button
            key={mins}
            type="button"
            className={`fm-chip${duration === mins ? ' fm-chip--on' : ''}`}
            onClick={() => onFiltersChange({ duration: duration === mins ? null : mins })}
          >
            {formatDurationListLabel(mins)}
          </button>
        ))}
      </div>
    </div>
  )
}

function CaptainPanel({ filters, onFiltersChange, onPick }) {
  const captain = filters.captain ?? null
  const pick = (val) => {
    onFiltersChange({ captain: val })
    onPick?.()
  }
  return (
    <div className="fm-section">
      <p className="fm-sectionTitle" style={{ marginBottom: 12 }}>
        Капитан
      </p>
      <div className="fm-chipRow">
        <button
          type="button"
          className={`fm-chip${captain === 'С капитаном' ? ' fm-chip--on' : ''}`}
          onClick={() => pick(captain === 'С капитаном' ? null : 'С капитаном')}
        >
          С капитаном
        </button>
        <button
          type="button"
          className={`fm-chip${captain === 'Без капитана' ? ' fm-chip--on' : ''}`}
          onClick={() => pick(captain === 'Без капитана' ? null : 'Без капитана')}
        >
          Без капитана
        </button>
      </div>
    </div>
  )
}

function pluralizeResults(n) {
  const x = Math.abs(Number(n)) || 0
  const mod100 = x % 100
  const mod10 = x % 10
  if (mod100 >= 11 && mod100 <= 14) return 'результатов'
  if (mod10 === 1) return 'результат'
  if (mod10 >= 2 && mod10 <= 4) return 'результата'
  return 'результатов'
}

/**
 * Выпадающая панель под чипом фильтра (цена, гости, длительность, капитан).
 */
export default function FilterQuickDropdown({
  open,
  anchorRefs,
  onClose,
  filters,
  onFiltersChange,
  priceRange,
  durationOptions = [],
  maxPassengers = 20,
  allBoats = [],
}) {
  const panelRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 })

  const pMin = priceRange.min
  const pMax = priceRange.max > pMin ? priceRange.max : pMin + 1000

  const previewCount = useMemo(() => {
    if (!open || !allBoats.length) return null
    return filterBoatsList(allBoats, filters, priceRange).length
  }, [open, allBoats, filters, priceRange])

  const updatePosition = useCallback(() => {
    if (!open) return
    const ref = anchorRefs[open]
    const el = ref?.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const minW = Math.max(280, r.width)
    const w = Math.min(380, Math.max(minW, window.innerWidth - 24))
    let left = r.left
    if (left + w > window.innerWidth - 12) left = Math.max(12, window.innerWidth - 12 - w)
    if (left < 12) left = 12
    let top = r.bottom + 8
    const ph = panelRef.current?.getBoundingClientRect().height ?? 280
    if (top + ph > window.innerHeight - 12) {
      top = Math.max(12, r.top - 8 - ph)
    }
    setPos({ top, left, width: w })
  }, [open, anchorRefs])

  useLayoutEffect(() => {
    updatePosition()
  }, [open, updatePosition, filters.priceLow, filters.priceHigh, filters.passengers, filters.duration])

  useEffect(() => {
    if (!open) return undefined
    updatePosition()
    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target)) return
      const ref = anchorRefs[open]
      if (ref?.current?.contains(e.target)) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open, onClose, anchorRefs])

  if (!open || typeof document === 'undefined') return null

  const node = (
    <>
      <div className="fqd-backdrop" aria-hidden onMouseDown={onClose} />
      <div
        ref={panelRef}
        className="fqd-panel"
        role="dialog"
        aria-modal="true"
        aria-label={
          open === 'price'
            ? 'Фильтр по цене'
            : open === 'guests'
              ? 'Количество гостей'
              : open === 'duration'
                ? 'Длительность аренды'
                : 'Капитан'
        }
        style={{ top: pos.top, left: pos.left, width: pos.width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {open === 'price' ? (
          <PricePanel filters={filters} onFiltersChange={onFiltersChange} pMin={pMin} pMax={pMax} />
        ) : null}
        {open === 'guests' ? (
          <GuestsPanel
            filters={filters}
            onFiltersChange={onFiltersChange}
            maxPassengers={maxPassengers}
          />
        ) : null}
        {open === 'duration' ? (
          <DurationPanel
            filters={filters}
            onFiltersChange={onFiltersChange}
            durationOptions={durationOptions}
          />
        ) : null}
        {open === 'captain' ? (
          <CaptainPanel filters={filters} onFiltersChange={onFiltersChange} onPick={onClose} />
        ) : null}
        {previewCount != null ? (
          <p
            style={{
              margin: '14px 0 0',
              fontSize: 13,
              color: '#64748b',
              fontWeight: 600,
            }}
          >
            {previewCount} {pluralizeResults(previewCount)}
          </p>
        ) : null}
      </div>
    </>
  )

  return createPortal(node, document.body)
}
