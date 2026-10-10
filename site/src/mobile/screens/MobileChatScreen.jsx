import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, User } from 'lucide-react'
import {
  archiveChat,
  deleteChat,
  fetchChats,
  unarchiveChat,
} from '../../api/chats'
import { getPhotoUrl } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { useNoIndexSeo } from '../../seo/useNoIndexSeo'
import { useChatUnread } from '../context/ChatUnreadContext'
import UnauthorizedCard from '../components/UnauthorizedCard.jsx'

function previewText(item) {
  const mine = item.last_message_is_own || item.last_message_sender === 'me'
  const text = item.last_message || '—'
  return `${mine ? 'Вы: ' : ''}${text}`
}

export default function MobileChatScreen() {
  useNoIndexSeo('Сообщения | ONTHEWATER')
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const { refreshUnread } = useChatUnread()
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archived, setArchived] = useState([])

  const load = useCallback(async () => {
    if (!token) {
      setChats([])
      setLoading(false)
      return
    }
    try {
      const rows = await fetchChats(token)
      setChats(rows)
      refreshUnread()
    } catch {
      setChats([])
    } finally {
      setLoading(false)
    }
  }, [token, refreshUnread])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const openArchive = async () => {
    setArchiveOpen(true)
    try {
      setArchived(await fetchChats(token, { archived: true }))
    } catch {
      setArchived([])
    }
  }

  if (!user) {
    return (
      <div className="mapp-screen">
        <header className="mapp-screen__header">
          <h1 className="mapp-screen__title">Сообщения</h1>
        </header>
        <UnauthorizedCard text="Войдите, чтобы писать владельцам катеров." />
      </div>
    )
  }

  return (
    <div className="mapp-screen">
      <header className="mapp-screen__header">
        <h1 className="mapp-screen__title">Сообщения</h1>
        <button type="button" className="mapp-screen__back" onClick={openArchive} aria-label="Архив">
          <Archive size={18} />
        </button>
      </header>
      {loading ? (
        <p className="mapp-empty">Загружаем…</p>
      ) : chats.length === 0 ? (
        <p className="mapp-empty">Пока нет диалогов. Напишите владельцу с карточки катера.</p>
      ) : (
        <div className="mapp-list">
          {chats.map((chat) => {
            const avatar = getPhotoUrl(chat.owner_avatar)
            const unread = Number(chat.unread_count || 0)
            return (
              <button
                key={chat.id}
                type="button"
                className="mapp-chatRow"
                onClick={() => navigate(`/chats/${chat.id}`)}
                onContextMenu={async (e) => {
                  e.preventDefault()
                  if (!window.confirm('Архивировать чат?')) return
                  try {
                    await archiveChat(token, chat.id)
                    await load()
                  } catch (err) {
                    window.alert(err?.message || 'Ошибка')
                  }
                }}
              >
                <div className="mapp-chatRow__avatar">
                  {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} /> : <User size={28} />}
                </div>
                <div className="mapp-chatRow__body">
                  <h3 className="mapp-chatRow__title">{chat.boat_title || chat.owner_name || 'Чат'}</h3>
                  <p className="mapp-chatRow__preview">{previewText(chat)}</p>
                </div>
                {unread > 0 ? <span className="mapp-chatRow__unread">{unread > 99 ? '99+' : unread}</span> : null}
              </button>
            )
          })}
        </div>
      )}

      {archiveOpen ? (
        <div className="mapp-modal" onClick={() => setArchiveOpen(false)}>
          <div className="mapp-modal__sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mapp-modal__head">
              <h2>Архив</h2>
              <button type="button" className="mapp-modal__close" onClick={() => setArchiveOpen(false)}>
                ×
              </button>
            </div>
            {archived.length === 0 ? (
              <p className="mapp-empty">Архив пуст</p>
            ) : (
              <div className="mapp-list" style={{ padding: 0 }}>
                {archived.map((chat) => (
                  <div key={chat.id} className="mapp-chatRow" style={{ cursor: 'default' }}>
                    <div className="mapp-chatRow__body">
                      <h3 className="mapp-chatRow__title">{chat.boat_title || 'Чат'}</h3>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          type="button"
                          className="mapp-btn"
                          style={{ minHeight: 36, fontSize: 13 }}
                          onClick={async () => {
                            await unarchiveChat(token, chat.id)
                            setArchived((prev) => prev.filter((c) => c.id !== chat.id))
                            await load()
                          }}
                        >
                          Вернуть
                        </button>
                        <button
                          type="button"
                          className="mapp-btn mapp-btn--ghost"
                          style={{ minHeight: 36, fontSize: 13 }}
                          onClick={async () => {
                            if (!window.confirm('Удалить чат?')) return
                            await deleteChat(token, chat.id)
                            setArchived((prev) => prev.filter((c) => c.id !== chat.id))
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
