import { API_BASE } from '../config'

function chatsUrl(path = '') {
  const base = API_BASE || ''
  return `${base}/chats${path}`
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchChats(token, { archived = false } = {}) {
  const q = archived ? '?archived=1' : ''
  const res = await fetch(chatsUrl(q), {
    headers: authHeaders(token),
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('Не удалось загрузить чаты')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchUnreadMessagesCount(token) {
  const res = await fetch(chatsUrl('/unread-messages-count'), {
    headers: authHeaders(token),
    credentials: 'omit',
  })
  if (!res.ok) return 0
  const data = await res.json().catch(() => ({}))
  const count = Number(data?.count ?? 0)
  return Number.isFinite(count) ? count : 0
}

export async function createChat(token, boatId) {
  const res = await fetch(chatsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    credentials: 'omit',
    body: JSON.stringify({ boat_id: boatId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось создать чат')
  return data
}

export async function fetchChat(token, chatId) {
  const res = await fetch(chatsUrl(`/${encodeURIComponent(chatId)}`), {
    headers: authHeaders(token),
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('Чат не найден')
  return res.json()
}

export async function fetchChatMessages(token, chatId) {
  const res = await fetch(chatsUrl(`/${encodeURIComponent(chatId)}/messages`), {
    headers: authHeaders(token),
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('Не удалось загрузить сообщения')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function sendChatMessage(token, chatId, text) {
  const res = await fetch(chatsUrl(`/${encodeURIComponent(chatId)}/messages`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    credentials: 'omit',
    body: JSON.stringify({ text }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Не удалось отправить сообщение')
  return data
}

export async function archiveChat(token, chatId) {
  const res = await fetch(chatsUrl(`/${encodeURIComponent(chatId)}/archive`), {
    method: 'PATCH',
    headers: authHeaders(token),
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('Не удалось архивировать чат')
  return res.json().catch(() => ({}))
}

export async function unarchiveChat(token, chatId) {
  const res = await fetch(chatsUrl(`/${encodeURIComponent(chatId)}/unarchive`), {
    method: 'PATCH',
    headers: authHeaders(token),
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('Не удалось вернуть чат')
  return res.json().catch(() => ({}))
}

export async function deleteChat(token, chatId) {
  const res = await fetch(chatsUrl(`/${encodeURIComponent(chatId)}`), {
    method: 'DELETE',
    headers: authHeaders(token),
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('Не удалось удалить чат')
  return res.json().catch(() => ({}))
}
