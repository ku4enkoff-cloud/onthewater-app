import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, MessageSquare, Search, Send, Trash2, User } from 'lucide-react'
import {
  archiveChat,
  deleteChat,
  fetchChatMessages,
  fetchChats,
  sendChatMessage,
  unarchiveChat,
} from '../../api/chats'
import { getPhotoUrl } from '../../config'
import { boatDetailPath } from '../../boatUrl'
import { formatChatTime } from './accountUtils'

function previewText(chat) {
  const mine = chat.last_message_is_own || chat.last_message_sender === 'me'
  const text = chat.last_message || 'Нет сообщений'
  return `${mine ? 'Вы: ' : ''}${text}`
}

function Avatar({ src }) {
  return (
    <span className="acc-chat__avatar">
      {src ? <img src={src} alt="" /> : <User size={20} strokeWidth={1.6} aria-hidden />}
    </span>
  )
}

export default function AccountMessages({ token, activeChatId, onSelectChat, onUnreadChange }) {
  const [view, setView] = useState('inbox')
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const loadChats = useCallback(async () => {
    if (!token) return
    try {
      const rows = await fetchChats(token, { archived: view === 'archive' })
      setChats(rows)
      if (view === 'inbox') {
        onUnreadChange(rows.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0))
      }
    } catch {
      setChats([])
    } finally {
      setLoading(false)
    }
  }, [token, view, onUnreadChange])

  useEffect(() => {
    setLoading(true)
    loadChats()
  }, [loadChats])

  const activeChat = useMemo(
    () => chats.find((c) => String(c.id) === String(activeChatId)) || null,
    [chats, activeChatId],
  )

  useEffect(() => {
    if (!activeChatId || !token) {
      setMessages([])
      return undefined
    }
    let cancelled = false
    setMessagesLoading(true)
    setError('')
    fetchChatMessages(token, activeChatId)
      .then((rows) => {
        if (cancelled) return
        setMessages(rows)
        setChats((prev) => prev.map((c) => (String(c.id) === String(activeChatId) ? { ...c, unread_count: 0 } : c)))
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeChatId, token])

  useEffect(() => {
    if (view !== 'inbox') return
    onUnreadChange(chats.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0))
  }, [chats, view, onUnreadChange])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, activeChatId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chats
    return chats.filter((c) =>
      [c.boat_title, c.owner_name, c.last_message].some((v) => String(v || '').toLowerCase().includes(q)),
    )
  }, [chats, query])

  const send = async (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || sending || !activeChatId) return
    try {
      setSending(true)
      setError('')
      const created = await sendChatMessage(token, activeChatId, value)
      setMessages((prev) => [
        ...prev,
        created?.id ? created : { id: `local-${Date.now()}`, text: value, is_own: true, created_at: new Date().toISOString() },
      ])
      setChats((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeChatId)
            ? { ...c, last_message: value, last_message_is_own: true, last_message_at: new Date().toISOString() }
            : c,
        ),
      )
      setText('')
    } catch (err) {
      setError(err?.message || 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  const toggleArchive = async () => {
    if (!activeChat) return
    try {
      if (view === 'archive') await unarchiveChat(token, activeChat.id)
      else await archiveChat(token, activeChat.id)
      onSelectChat(null)
      await loadChats()
    } catch (err) {
      setError(err?.message || 'Не удалось изменить чат')
    }
  }

  const removeChat = async () => {
    if (!activeChat || !window.confirm('Удалить чат без возможности восстановления?')) return
    try {
      await deleteChat(token, activeChat.id)
      onSelectChat(null)
      await loadChats()
    } catch (err) {
      setError(err?.message || 'Не удалось удалить чат')
    }
  }

  return (
    <section className="acc-section" aria-labelledby="acc-messages-title">
      <h1 id="acc-messages-title" className="acc-title">
        Сообщения
      </h1>

      <div className="acc-chat">
        <aside className="acc-chat__list" aria-label="Диалоги">
          <label className="acc-chat__search">
            <Search size={16} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по сообщениям"
            />
          </label>
          <div className="acc-chat__tabs" role="tablist">
            {[
              ['inbox', 'Все'],
              ['archive', 'Архив'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                className={`acc-chat__tab${view === id ? ' is-on' : ''}`}
                onClick={() => {
                  setView(id)
                  onSelectChat(null)
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="acc-chat__rows">
            {loading ? (
              <p className="acc-muted acc-chat__note">Загружаем…</p>
            ) : filtered.length === 0 ? (
              <p className="acc-muted acc-chat__note">
                {view === 'archive' ? 'Архив пуст.' : 'Пока нет диалогов. Напишите владельцу со страницы катера.'}
              </p>
            ) : (
              filtered.map((chat) => {
                const unread = Number(chat.unread_count) || 0
                const active = String(chat.id) === String(activeChatId)
                return (
                  <button
                    key={chat.id}
                    type="button"
                    className={`acc-chat__row${active ? ' is-on' : ''}`}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <Avatar src={chat.owner_avatar ? getPhotoUrl(chat.owner_avatar) : null} />
                    <span className="acc-chat__rowBody">
                      <span className="acc-chat__rowTop">
                        <strong>{chat.boat_title || chat.owner_name || 'Чат'}</strong>
                        <time>{formatChatTime(chat.last_message_at || chat.created_at)}</time>
                      </span>
                      <span className="acc-chat__rowBottom">
                        <span className="acc-chat__preview">{previewText(chat)}</span>
                        {unread > 0 ? <span className="acc-badge">{unread > 99 ? '99+' : unread}</span> : null}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <div className="acc-chat__thread">
          {!activeChat ? (
            <div className="acc-chat__placeholder">
              <MessageSquare size={32} strokeWidth={1.3} aria-hidden />
              <p>Выберите диалог слева</p>
            </div>
          ) : (
            <>
              <header className="acc-chat__head">
                <div>
                  <strong>{activeChat.boat_title || 'Чат'}</strong>
                  {activeChat.owner_name ? <span>Владелец: {activeChat.owner_name}</span> : null}
                </div>
                <div className="acc-chat__headActions">
                  {activeChat.boat_id ? (
                    <Link className="acc-link" to={boatDetailPath({ id: activeChat.boat_id, title: activeChat.boat_title })}>
                      Страница катера
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="acc-iconBtn"
                    onClick={toggleArchive}
                    aria-label={view === 'archive' ? 'Вернуть из архива' : 'В архив'}
                    title={view === 'archive' ? 'Вернуть из архива' : 'В архив'}
                  >
                    {view === 'archive' ? <ArchiveRestore size={17} /> : <Archive size={17} />}
                  </button>
                  {view === 'archive' ? (
                    <button type="button" className="acc-iconBtn" onClick={removeChat} aria-label="Удалить чат" title="Удалить чат">
                      <Trash2 size={17} />
                    </button>
                  ) : null}
                </div>
              </header>

              <div className="acc-chat__msgs">
                {messagesLoading ? (
                  <p className="acc-muted">Загружаем сообщения…</p>
                ) : messages.length === 0 ? (
                  <p className="acc-muted">Сообщений пока нет. Задайте вопрос владельцу.</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.is_own === true || m.sender === 'me'
                    return (
                      <div key={m.id} className={`acc-msg${mine ? ' acc-msg--me' : ''}`}>
                        <p>{m.text || m.body || ''}</p>
                        <time>{formatChatTime(m.created_at)}</time>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {error ? <p className="acc-error acc-chat__error">{error}</p> : null}

              {view === 'inbox' ? (
                <form className="acc-chat__composer" onSubmit={send}>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Напишите сообщение…"
                    aria-label="Сообщение"
                  />
                  <button type="submit" disabled={sending || !text.trim()} aria-label="Отправить">
                    <Send size={17} />
                  </button>
                </form>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
