import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, CalendarDays, Camera, Heart, HelpCircle, LogOut, MessageSquare, Star, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { fetchMyBookings } from '../api/bookings'
import { fetchMyReviews, uploadAvatar } from '../api/auth'
import { createChat, fetchUnreadMessagesCount } from '../api/chats'
import { getPhotoUrl } from '../config'
import { useNoIndexSeo } from '../seo/useNoIndexSeo.js'
import { useVisiblePolling } from '../hooks/useVisiblePolling.js'
import { useChatMessageEvents } from '../context/RealtimeContext.jsx'
import { bookingGroup } from '../components/account/accountUtils'
import AccountBookings from '../components/account/AccountBookings.jsx'
import AccountMessages from '../components/account/AccountMessages.jsx'
import AccountFavorites from '../components/account/AccountFavorites.jsx'
import AccountReviews from '../components/account/AccountReviews.jsx'
import AccountNotifications from '../components/account/AccountNotifications.jsx'
import AccountProfile from '../components/account/AccountProfile.jsx'
import AccountHelp from '../components/account/AccountHelp.jsx'
import '../styles/precision-home.css'
import '../styles/account.css'

const MENU = [
  { id: 'bookings', label: 'Мои бронирования', icon: CalendarDays },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare },
  { id: 'favorites', label: 'Избранное', icon: Heart },
  { id: 'reviews', label: 'Отзывы', icon: Star },
  { id: 'notifications', label: 'Уведомления', icon: Bell },
  { id: 'account', label: 'Данные аккаунта', icon: User },
  { id: 'help', label: 'Помощь', icon: HelpCircle },
]

const TAB_IDS = new Set(MENU.map((m) => m.id))

export default function AccountPage() {
  useNoIndexSeo('Личный кабинет | ONTHEWATER')
  const { user, token, logout, setCurrentUser } = useAuth()
  const { favoriteBoats } = useFavorites()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('tab')
  const tab = TAB_IDS.has(rawTab) ? rawTab : 'bookings'
  const chatId = params.get('chat')

  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState('')
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  const [avatarError, setAvatarError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setBookingsLoading(true)
        setBookingsError('')
        const rows = await fetchMyBookings(token)
        if (!cancelled) setBookings(rows)
      } catch (err) {
        if (!cancelled) setBookingsError(err?.message || 'Не удалось загрузить бронирования')
      } finally {
        if (!cancelled) setBookingsLoading(false)
      }
    })()
    fetchUnreadMessagesCount(token).then((n) => {
      if (!cancelled) setUnread(n)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  const loadReviews = useCallback(async () => {
    try {
      setReviews(await fetchMyReviews(token))
    } catch {
      setReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const refreshInBackground = useCallback(async () => {
    const [rows, count, reviewRows] = await Promise.all([
      fetchMyBookings(token).catch(() => null),
      tab === 'messages' ? Promise.resolve(null) : fetchUnreadMessagesCount(token).catch(() => null),
      fetchMyReviews(token).catch(() => null),
    ])
    if (rows) {
      setBookings(rows)
      setBookingsError('')
    }
    if (count != null) setUnread(count)
    if (reviewRows) setReviews(reviewRows)
  }, [token, tab])

  useVisiblePolling(refreshInBackground, 45000)

  useChatMessageEvents(({ message } = {}) => {
    if (tab === 'messages' || !message) return
    if (message.is_own === true || message.sender === 'me') return
    fetchUnreadMessagesCount(token).then(setUnread).catch(() => {})
  })

  const reviewedBoatIds = useMemo(() => new Set(reviews.map((r) => String(r.boat_id))), [reviews])
  const tripsCount = useMemo(() => bookings.filter((b) => bookingGroup(b) === 'completed').length, [bookings])

  const goTab = useCallback(
    (id, extra = {}) => {
      const next = new URLSearchParams()
      if (id !== 'bookings') next.set('tab', id)
      Object.entries(extra).forEach(([k, v]) => {
        if (v != null && v !== '') next.set(k, String(v))
      })
      setParams(next)
    },
    [setParams],
  )

  const selectChat = useCallback((id) => goTab('messages', { chat: id }), [goTab])

  const messageOwner = useCallback(
    async (boatId) => {
      try {
        const chat = await createChat(token, boatId)
        if (chat?.id) selectChat(chat.id)
        else goTab('messages')
      } catch (err) {
        window.alert(err?.message || 'Не удалось открыть чат')
      }
    },
    [token, selectChat, goTab],
  )

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setAvatarError('')
      const data = await uploadAvatar(token, file)
      if (data?.user) setCurrentUser(data.user)
      else if (data?.avatar) setCurrentUser({ ...user, avatar: data.avatar })
    } catch (err) {
      setAvatarError(err?.message || 'Не удалось загрузить фото')
    }
  }

  const onLogout = () => {
    if (!window.confirm('Выйти из аккаунта?')) return
    logout()
    navigate('/')
  }

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || user?.email || 'Гость'
  const avatar = user?.avatar ? getPhotoUrl(user.avatar) : null
  const initial = displayName.trim().charAt(0).toUpperCase() || 'О'

  const counts = {
    messages: unread,
  }

  return (
    <div className="pm acc-page">
      <div className="pm-container acc-layout">
        <aside className="acc-side" aria-label="Профиль">
          <div className="acc-profile">
            <label className="acc-profile__avatar" title="Сменить фото">
              {avatar ? <img src={avatar} alt="" /> : <span aria-hidden>{initial}</span>}
              <span className="acc-profile__camera" aria-hidden>
                <Camera size={14} />
              </span>
              <input type="file" accept="image/*" hidden onChange={onAvatarChange} />
              <span className="pm-srOnly">Сменить фото профиля</span>
            </label>
            <p className="acc-profile__name">{displayName}</p>
            {user?.email ? <p className="acc-profile__mail">{user.email}</p> : null}
            {avatarError ? <p className="acc-error">{avatarError}</p> : null}
          </div>

          <dl className="acc-stats">
            <button type="button" className="acc-stats__item" onClick={() => goTab('bookings')}>
              <dd>{tripsCount}</dd>
              <dt>Поездки</dt>
            </button>
            <button type="button" className="acc-stats__item" onClick={() => goTab('reviews')}>
              <dd>{reviews.length}</dd>
              <dt>Отзывы</dt>
            </button>
            <button type="button" className="acc-stats__item" onClick={() => goTab('favorites')}>
              <dd>{favoriteBoats.length}</dd>
              <dt>Избранное</dt>
            </button>
          </dl>

          <nav className="acc-nav" aria-label="Разделы личного кабинета">
            {MENU.map(({ id, label, icon: Icon }) => {
              const count = counts[id] || 0
              return (
                <button
                  key={id}
                  type="button"
                  className={`acc-nav__item${tab === id ? ' is-on' : ''}`}
                  aria-current={tab === id ? 'page' : undefined}
                  onClick={() => goTab(id)}
                >
                  <Icon size={18} strokeWidth={1.7} aria-hidden />
                  <span>{label}</span>
                  {count > 0 ? <span className="acc-badge">{count > 99 ? '99+' : count}</span> : null}
                </button>
              )
            })}
            <button type="button" className="acc-nav__item acc-nav__item--logout" onClick={onLogout}>
              <LogOut size={18} strokeWidth={1.7} aria-hidden />
              <span>Выйти</span>
            </button>
          </nav>
        </aside>

        <main className="acc-main">
          {tab === 'bookings' ? (
            <AccountBookings
              token={token}
              bookings={bookings}
              setBookings={setBookings}
              loading={bookingsLoading}
              error={bookingsError}
              onMessageOwner={messageOwner}
              reviewedBoatIds={reviewedBoatIds}
              onReviewCreated={loadReviews}
            />
          ) : null}
          {tab === 'messages' ? (
            <AccountMessages token={token} activeChatId={chatId} onSelectChat={selectChat} onUnreadChange={setUnread} />
          ) : null}
          {tab === 'favorites' ? <AccountFavorites /> : null}
          {tab === 'reviews' ? (
            <AccountReviews token={token} reviews={reviews} loading={reviewsLoading} onChanged={loadReviews} />
          ) : null}
          {tab === 'notifications' ? <AccountNotifications token={token} email={user?.email} /> : null}
          {tab === 'account' ? (
            <AccountProfile token={token} user={user} setCurrentUser={setCurrentUser} logout={logout} />
          ) : null}
          {tab === 'help' ? <AccountHelp /> : null}
        </main>
      </div>
    </div>
  )
}
