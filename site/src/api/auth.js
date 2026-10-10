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

export async function registerAuth({ name, email, phone, password, role = 'client' }) {
  const res = await fetch(authUrl('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify({ name, email, phone, password, role }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось зарегистрироваться')
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

export async function updateProfile(token, payload) {
  const res = await fetch(authUrl('/auth/profile'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'omit',
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось обновить профиль')
  return data
}

export async function changePassword(token, payload) {
  const res = await fetch(authUrl('/auth/password'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'omit',
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось изменить пароль')
  return data
}

export async function deleteMyAccount(token) {
  const res = await fetch(authUrl('/auth/account'), {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось удалить аккаунт')
  return data
}

export async function fetchMyReviews(token) {
  const res = await fetch(authUrl('/auth/reviews'), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchMyReviewsCount(token) {
  const res = await fetch(authUrl('/auth/reviews-count'), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
  })
  if (!res.ok) return 0
  const data = await res.json().catch(() => ({}))
  return Number(data?.count ?? data ?? 0) || 0
}

export async function updateMyReview(token, reviewId, payload) {
  const res = await fetch(authUrl(`/auth/reviews/${encodeURIComponent(reviewId)}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'omit',
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось обновить отзыв')
  return data
}

export async function deleteMyReview(token, reviewId) {
  const res = await fetch(authUrl(`/auth/reviews/${encodeURIComponent(reviewId)}`), {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Не удалось удалить отзыв')
  }
}

export async function fetchNotificationSettings(token) {
  const res = await fetch(authUrl('/auth/notification-settings'), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('Не удалось загрузить настройки')
  return res.json()
}

export async function updateNotificationSettings(token, payload) {
  const res = await fetch(authUrl('/auth/notification-settings'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'omit',
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось сохранить настройки')
  return data
}

export async function uploadAvatar(token, file) {
  const form = new FormData()
  form.append('avatar', file)
  const res = await fetch(authUrl('/auth/avatar'), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить фото')
  return data
}
