import {
  firstPhotoThumbUrl,
  formatCardLocation,
  formatPriceRu,
  getMinDurationPrice,
  minDurationLabelForBoat,
} from '../boatUtils'
import { getPhotoUrl, getThumbUrl } from '../config'
import { getMapMarkerPriceLabel } from '../lib/mapDisplayMarkers'

const THUMB_PLACEHOLDER =
  'https://placehold.co/160x112/e8eef4/64748b?text=%D0%9A%D0%B0%D1%82%D0%B5%D1%80'

function pluralBoats(n) {
  if (n === 1) return 'катер'
  if (n >= 2 && n <= 4) return 'катера'
  return 'катеров'
}

function boatPreviewPrice(boat) {
  const price = getMinDurationPrice(boat)
  const dur = minDurationLabelForBoat(boat)
  if (!(price > 0)) {
    const fallback = getMapMarkerPriceLabel(boat)
    if (!fallback) return ''
    return dur ? `от ${fallback} / ${dur}` : `от ${fallback}`
  }
  const base = `от ${formatPriceRu(price)} ₽`
  return dur ? `${base} / ${dur}` : base
}

function boatPreviewSub(boat) {
  const guests = Number(boat?.capacity) || Number(boat?.max_guests) || 0
  if (guests > 0) return `до ${guests} гостей`
  return ''
}

function previewHeader(boats) {
  if (!boats?.length) return ''
  if (boats.length === 1) {
    const loc = formatCardLocation(boats[0])
    return loc && loc !== '—' ? loc : boats[0].title || 'Катер на карте'
  }
  const locs = boats.map((b) => formatCardLocation(b)).filter((l) => l && l !== '—')
  if (locs.length) {
    const first = locs[0]
    if (locs.every((l) => l === first)) return first
  }
  return `${boats.length} ${pluralBoats(boats.length)} здесь`
}

function BoatPreviewRow({ boat, onOpen }) {
  const img = firstPhotoThumbUrl(boat, getPhotoUrl, getThumbUrl) || THUMB_PLACEHOLDER
  const price = boatPreviewPrice(boat)
  const sub = boatPreviewSub(boat)
  return (
    <button type="button" className="pm-mapPreview__row" onClick={() => onOpen(boat)}>
      <span className="pm-mapPreview__thumb">
        <img src={img} alt="" loading="lazy" />
      </span>
      <span className="pm-mapPreview__meta">
        <span className="pm-mapPreview__name">{boat.title || 'Катер'}</span>
        {sub ? <span className="pm-mapPreview__loc">{sub}</span> : null}
        {price ? <span className="pm-mapPreview__price">{price}</span> : null}
      </span>
    </button>
  )
}

/**
 * @param {{
 *   boats: object[],
 *   onOpenBoat: (boat: object) => void,
 *   onClose?: () => void,
 *   className?: string,
 *   style?: object,
 *   anchored?: boolean,
 *   onMouseEnter?: () => void,
 *   onMouseLeave?: () => void,
 * }} props
 */
export default function MapBoatPreview({
  boats,
  onOpenBoat,
  onClose,
  className = '',
  style,
  anchored = false,
  onMouseEnter,
  onMouseLeave,
}) {
  const list = boats || []
  const count = list.length
  if (!count) return null

  const title = previewHeader(list)

  return (
    <div
      className={`pm-mapPreview${anchored ? ' pm-mapPreview--anchored' : ''} ${className}`.trim()}
      style={style}
      role="dialog"
      aria-label="Катера на метке"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="pm-mapPreview__head">
        <p className="pm-mapPreview__title">{title}</p>
        {onClose && !anchored ? (
          <button type="button" className="pm-mapPreview__close" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        ) : null}
      </div>
      {count === 1 ? (
        <BoatPreviewRow boat={list[0]} onOpen={onOpenBoat} />
      ) : (
        <ul className="pm-mapPreview__list">
          {list.map((boat) => (
            <li key={String(boat.id)}>
              <BoatPreviewRow boat={boat} onOpen={onOpenBoat} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
