/** URL страницы катера: /boats/{id}-{slug-iz-nazvaniya} */

const CYR_TO_LAT = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

export function slugifyBoatTitle(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
  if (!s) return 'kater'
  let out = ''
  for (const ch of s) {
    const lat = CYR_TO_LAT[ch]
    if (lat !== undefined) {
      out += lat
      continue
    }
    if (/[a-z0-9]/.test(ch)) {
      out += ch
      continue
    }
    if (/\s/.test(ch) || ch === '_' || ch === '-' || ch === '.' || ch === ',') {
      out += '-'
      continue
    }
    if (/[№#%&+=/\\|"'«»()[\]{}]/.test(ch)) {
      out += '-'
    }
  }
  out = out.replace(/-+/g, '-').replace(/^-|-$/g, '')
  const trimmed = out.slice(0, 80).replace(/-+$/g, '')
  return trimmed || 'kater'
}

/** Сегмент пути без ведущего слеша: "42-nazvanie-katera". */
export function boatUrlSegment(boat) {
  const id = boat?.id
  if (id == null || id === '') return ''
  const title = boat?.title || boat?.type_name || 'Катер'
  const slug = slugifyBoatTitle(title)
  return `${id}-${slug}`
}

export function boatDetailPath(boat) {
  const seg = boatUrlSegment(boat)
  return seg ? `/boats/${seg}` : '/boats'
}

/**
 * Из параметра маршрута достаёт id катера (цифры в начале).
 * Поддерживает "5", "5-slug", "12-intrepid-470".
 */
export function parseBoatUrlParam(param) {
  if (param == null || param === '') return null
  const m = String(param).match(/^(\d+)/)
  if (!m) return null
  return m[1]
}
