export const STATUS_LABELS = {
  pending: 'На рассмотрении',
  pending_payment: 'Ожидает оплаты',
  confirmed: 'Подтверждено',
  completed: 'Завершено',
  cancelled: 'Отменено',
  rejected: 'Отклонено',
}

export const REVIEW_STATUS_LABELS = {
  approved: 'Опубликован',
  rejected: 'Отклонён',
  pending: 'На модерации',
}

export function bookingStatus(b) {
  return String(b?.status || 'pending').toLowerCase()
}

/** upcoming | completed | cancelled — группировка как в приложении. */
export function bookingGroup(b, now = Date.now()) {
  const s = bookingStatus(b)
  if (s === 'cancelled' || s === 'rejected') return 'cancelled'
  if (s === 'completed') return 'completed'
  const start = new Date(b?.start_at || 0).getTime()
  const hours = Number(b?.hours) || 0
  const end = start + hours * 60 * 1000
  if (s === 'confirmed' && Number.isFinite(end) && end > 0 && end < now) return 'completed'
  return 'upcoming'
}

export function canCancelBooking(b) {
  return ['pending', 'pending_payment'].includes(bookingStatus(b))
}

export function formatBookingDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${date.replace(/\s?г\.$/, '')}, ${time}`
}

/** bookings.hours хранит минуты. */
export function formatDurationRu(minutes) {
  const n = Math.max(0, Math.round(Number(minutes) || 0))
  if (n < 60) return `${n} мин`
  const h = Math.floor(n / 60)
  const m = n % 60
  const mod10 = h % 10
  const mod100 = h % 100
  let word = 'часов'
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) word = 'час'
    else if (mod10 >= 2 && mod10 <= 4) word = 'часа'
  }
  return m ? `${h} ${word} ${m} мин` : `${h} ${word}`
}

export function formatMooring(b) {
  if (!b) return ''
  const parts = [b.location_city, b.location_address].map((v) => String(v || '').trim()).filter(Boolean)
  const club = String(b.location_yacht_club || '').trim()
  if (club) parts.push(`яхт-клуб ${club}`)
  if (parts.length === 0) {
    const region = String(b.location_region || '').trim()
    if (region) parts.push(region)
  }
  return parts.join(', ')
}

export function formatRub(n) {
  return `${(Number(n) || 0).toLocaleString('ru-RU')} ₽`
}

export function formatChatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
