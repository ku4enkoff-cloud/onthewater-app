import { API_BASE } from '../config'

function bookingsUrl(path = '') {
  const base = API_BASE || ''
  return `${base}/bookings${path}`
}

export async function fetchMyBookings(token) {
  const res = await fetch(bookingsUrl(), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('Не удалось загрузить бронирования')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function createBooking(token, payload) {
  const res = await fetch(bookingsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'omit',
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось отправить запрос на бронирование')
  return data
}

export async function cancelBooking(token, bookingId) {
  const res = await fetch(bookingsUrl(`/${encodeURIComponent(bookingId)}/cancel`), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось отменить бронирование')
  return data
}
