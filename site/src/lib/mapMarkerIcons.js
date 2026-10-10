/** SVG data-URI иконки меток — кликабельны через native Yandex default#image. */

const MARKER_BLUE = '#008BE8'
const MARKER_BLUE_SELECTED = '#006FBA'
/** Hover / active — как на референсе Яндекс.Недвижимость */
const MARKER_HOVER = '#F44336'
const WHITE = '#ffffff'

function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Пин причала с числом — синий, белое кольцо, белая цифра */
export function clusterCountIconUrl(count, { selected = false } = {}) {
  const n = String(count)
  const fontSize = n.length > 2 ? 15 : 17
  const ring = selected ? 3.5 : 3
  const fill = selected ? MARKER_BLUE_SELECTED : MARKER_BLUE
  return svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="52" height="66" viewBox="0 0 52 66">
  <path d="M26 64C26 64 8 46.5 8 28a18 18 0 1 1 36 0C44 46.5 26 64 26 64Z" fill="${fill}" stroke="${WHITE}" stroke-width="2"/>
  <circle cx="26" cy="26" r="11" fill="none" stroke="${WHITE}" stroke-width="${ring}"/>
  <text x="26" y="32" text-anchor="middle" font-family="Arial,sans-serif"
    font-size="${fontSize}" font-weight="700" fill="${WHITE}">${escapeXml(n)}</text>
</svg>
`.trim())
}

export const CLUSTER_ICON_SIZE = [52, 66]
export const CLUSTER_ICON_OFFSET = [-26, -66]

/** @deprecated use clusterCountIconUrl */
export const CLUSTER_BASE_ICON = clusterCountIconUrl('')

const priceIconCache = new Map()

function estimatePriceWidth(label) {
  const len = String(label || '').length
  return Math.min(240, Math.max(88, Math.round(len * 9.2 + 36)))
}

/**
 * Ценник-«таблетка» с хвостиком — синий фон, белый текст и обводка.
 * hovered → красный (как на референсе), selected → тёмно-синий.
 */
export function pricePinIcon(label, { selected = false, hovered = false } = {}) {
  const text = String(label || '•').slice(0, 24)
  const tone = hovered ? 'h' : selected ? 's' : '0'
  const cacheKey = `pill:${tone}:${text}`
  const cached = priceIconCache.get(cacheKey)
  if (cached) return cached

  const w = estimatePriceWidth(text)
  const bubbleH = 40
  const tipH = 10
  const h = bubbleH + tipH
  const fill = hovered ? MARKER_HOVER : selected ? MARKER_BLUE_SELECTED : MARKER_BLUE
  const strokeWidth = hovered || selected ? 3 : 2
  const r = bubbleH / 2
  const cx = w / 2
  const tipHalf = 8
  const bodyBottom = bubbleH
  const href = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="s" x="-20%" y="-30%" width="140%" height="170%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#003d6b" flood-opacity="0.28"/>
    </filter>
  </defs>
  <path
    d="M ${r} 1
       H ${w - r}
       A ${r - 1} ${r - 1} 0 0 1 ${w - 1} ${r}
       V ${bodyBottom - r}
       A ${r - 1} ${r - 1} 0 0 1 ${w - r} ${bodyBottom - 1}
       H ${cx + tipHalf}
       L ${cx} ${h - 1}
       L ${cx - tipHalf} ${bodyBottom - 1}
       H ${r}
       A ${r - 1} ${r - 1} 0 0 1 1 ${bodyBottom - r}
       V ${r}
       A ${r - 1} ${r - 1} 0 0 1 ${r} 1
       Z"
    fill="${fill}"
    stroke="${WHITE}"
    stroke-width="${strokeWidth}"
    filter="url(#s)"
  />
  <text x="${cx}" y="${Math.round(bubbleH * 0.68)}" text-anchor="middle"
    font-family="Arial,sans-serif" font-size="16" font-weight="700"
    fill="${WHITE}">${escapeXml(text)}</text>
</svg>
`.trim())

  const result = {
    href,
    size: [w, h],
    offset: [-Math.round(w / 2), -h],
  }
  priceIconCache.set(cacheKey, result)
  return result
}

/** Одиночная точка без цены (fallback). */
export const DOT_ICON = (() => {
  const href = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="11" fill="${MARKER_BLUE}" stroke="${WHITE}" stroke-width="3.5"/>
</svg>
`.trim())
  return { href, size: [36, 36], offset: [-18, -18] }
})()
