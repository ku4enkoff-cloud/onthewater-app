import { API_BASE } from '../config'

function authUrl(path) {
  const base = API_BASE || ''
  return `${base}${path}`
}

export async function loginAuth({ login, password }) {
  const res = await fetch(authUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify({ login, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось выполнить вход')
  return data
}

export async function fetchMe(token) {
  const res = await fetch(authUrl('/auth/me'), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('unauthorized')
  return res.json()
}
