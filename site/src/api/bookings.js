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
