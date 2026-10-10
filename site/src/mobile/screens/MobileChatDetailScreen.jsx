import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Send } from 'lucide-react'
import { fetchChat, fetchChatMessages, sendChatMessage } from '../../api/chats'
import { useAuth } from '../../context/AuthContext'
import { useNoIndexSeo } from '../../seo/useNoIndexSeo'
import { useChatUnread } from '../context/ChatUnreadContext'
import UnauthorizedCard from '../components/UnauthorizedCard.jsx'

export default function MobileChatDetailScreen() {
  useNoIndexSeo('Чат | ONTHEWATER')
  const { chatId } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const { refreshUnread } = useChatUnread()
  const [chat, setChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const load = useCallback(async () => {
    if (!token || !chatId) return
    try {
      const [c, msgs] = await Promise.all([fetchChat(token, chatId), fetchChatMessages(token, chatId)])
      setChat(c)
      setMessages(msgs)
      refreshUnread()
    } catch {
      setChat(null)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [token, chatId, refreshUnread])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!user) {
    return (
      <div className="mapp-screen">
        <UnauthorizedCard />
      </div>
    )
  }

  const title = chat?.boat_title || chat?.owner_name || 'Чат'

  return (
    <div className="mapp-chatDetail">
      <header className="mapp-screen__header">
        <button type="button" className="mapp-screen__back" onClick={() => navigate('/chats')} aria-label="Назад">
          <ChevronLeft size={22} />
        </button>
        <h1 className="mapp-screen__title" style={{ fontSize: 17 }}>
          {title}
        </h1>
      </header>
      <div className="mapp-chatDetail__msgs">
        {loading ? (
          <p className="mapp-empty">Загружаем…</p>
        ) : (
          messages.map((m) => {
            const mine = m.is_own === true || m.sender === 'me'
            return (
              <div key={m.id} className={`mapp-bubble${mine ? ' mapp-bubble--me' : ' mapp-bubble--them'}`}>
                {m.text || m.body || ''}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form
        className="mapp-chatDetail__composer"
        onSubmit={async (e) => {
          e.preventDefault()
          const value = text.trim()
          if (!value || sending) return
          setSending(true)
          try {
            const created = await sendChatMessage(token, chatId, value)
            setMessages((prev) => [...prev, created?.id ? created : { id: Date.now(), text: value, is_own: true }])
            setText('')
            refreshUnread()
          } catch (err) {
            window.alert(err?.message || 'Не удалось отправить')
          } finally {
            setSending(false)
          }
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение…"
          enterKeyHint="send"
        />
        <button type="submit" disabled={sending || !text.trim()} aria-label="Отправить">
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
