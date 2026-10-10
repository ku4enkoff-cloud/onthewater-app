import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Heart,
  HelpCircle,
  LogOut,
  Star,
  User,
} from 'lucide-react'
import {
  changePassword,
  fetchMyReviews,
  fetchMyReviewsCount,
  fetchNotificationSettings,
  updateNotificationSettings,
  updateProfile,
  uploadAvatar,
} from '../../api/auth'
import { fetchMyBookings } from '../../api/bookings'
import { getPhotoUrl } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { useFavorites } from '../../context/FavoritesContext'
import { useNoIndexSeo } from '../../seo/useNoIndexSeo'
import UnauthorizedCard from '../components/UnauthorizedCard.jsx'

export default function MobileProfileScreen() {
  useNoIndexSeo('Профиль | ONTHEWATER')
  const { user, token, logout, setCurrentUser } = useAuth()
  const { favoriteBoats } = useFavorites()
  const navigate = useNavigate()
  const [completedTrips, setCompletedTrips] = useState(0)
  const [reviewsCount, setReviewsCount] = useState(0)
  const [panel, setPanel] = useState(null)
  const [reviews, setReviews] = useState([])
  const [emailBooking, setEmailBooking] = useState(true)
  const [emailMessages, setEmailMessages] = useState(true)
  const [emailNews, setEmailNews] = useState(true)
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' })
  const [msg, setMsg] = useState('')

  const refreshStats = useCallback(async () => {
    if (!token) return
    try {
      const [bookings, count] = await Promise.all([fetchMyBookings(token), fetchMyReviewsCount(token)])
      setCompletedTrips(bookings.filter((b) => b.status === 'completed').length)
      setReviewsCount(count)
    } catch {
      /* ignore */
    }
  }, [token])

  useEffect(() => {
    if (!user) return
    setProfileForm({
      first_name: user.first_name || user.name?.split?.(' ')?.[0] || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
    })
    refreshStats()
    fetchNotificationSettings(token)
      .then((data) => {
        setEmailBooking(data?.email_booking_notifications !== false)
        setEmailMessages(data?.email_message_notifications !== false)
        setEmailNews(data?.email_news_notifications !== false)
      })
      .catch(() => {})
  }, [user, token, refreshStats])

  if (!user) {
    return (
      <div className="mapp-screen">
        <header className="mapp-screen__header">
          <h1 className="mapp-screen__title">Профиль</h1>
        </header>
        <UnauthorizedCard title="Профиль" text="Войдите, чтобы управлять аккаунтом." />
      </div>
    )
  }

  const avatar = getPhotoUrl(user.avatar)
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.email || 'Гость'

  return (
    <div className="mapp-screen mapp-profile">
      <div className="mapp-profile__hero">
        <div className="mapp-profile__row">
          <label className="mapp-profile__avatar" title="Сменить фото">
            {avatar ? <img src={avatar} alt="" /> : <User size={32} />}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const data = await uploadAvatar(token, file)
                  if (data?.user) setCurrentUser(data.user)
                  else if (data?.avatar) setCurrentUser({ ...user, avatar: data.avatar })
                } catch (err) {
                  window.alert(err?.message || 'Ошибка загрузки')
                }
              }}
            />
          </label>
          <div>
            <h1 className="mapp-profile__name">{displayName}</h1>
            <p className="mapp-profile__meta">{user.email || user.phone || ''}</p>
          </div>
        </div>
        <div className="mapp-profile__stats">
          <div className="mapp-profile__stat">
            <strong>{completedTrips}</strong>
            <span>поездки</span>
          </div>
          <div className="mapp-profile__stat">
            <strong>{favoriteBoats.length}</strong>
            <span>избранное</span>
          </div>
          <div className="mapp-profile__stat">
            <strong>{reviewsCount}</strong>
            <span>отзывы</span>
          </div>
        </div>
      </div>

      <div className="mapp-menu">
        <button type="button" onClick={() => setPanel('account')}>
          <User size={20} /> Данные аккаунта <ChevronRight className="mapp-menu__chev" size={18} />
        </button>
        <button
          type="button"
          onClick={async () => {
            setPanel('reviews')
            try {
              setReviews(await fetchMyReviews(token))
            } catch {
              setReviews([])
            }
          }}
        >
          <Star size={20} /> Мои отзывы <ChevronRight className="mapp-menu__chev" size={18} />
        </button>
        <button type="button" onClick={() => setPanel('notifications')}>
          <Bell size={20} /> Уведомления <ChevronRight className="mapp-menu__chev" size={18} />
        </button>
        <Link to="/favorites">
          <Heart size={20} /> Избранное <ChevronRight className="mapp-menu__chev" size={18} />
        </Link>
        <Link to="/privacy">
          <HelpCircle size={20} /> Помощь и документы <ChevronRight className="mapp-menu__chev" size={18} />
        </Link>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Выйти из аккаунта?')) {
              logout()
              navigate('/')
            }
          }}
        >
          <LogOut size={20} /> Выйти
        </button>
      </div>

      {panel ? (
        <div className="mapp-modal" onClick={() => setPanel(null)}>
          <div className="mapp-modal__sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mapp-modal__head">
              <h2>
                {panel === 'account'
                  ? 'Данные'
                  : panel === 'reviews'
                    ? 'Отзывы'
                    : 'Уведомления'}
              </h2>
              <button type="button" className="mapp-modal__close" onClick={() => setPanel(null)}>
                ×
              </button>
            </div>

            {panel === 'account' ? (
              <form
                className="mapp-form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setMsg('')
                  try {
                    const next = await updateProfile(token, profileForm)
                    setCurrentUser(next?.user || { ...user, ...profileForm })
                    setMsg('Сохранено')
                  } catch (err) {
                    setMsg(err?.message || 'Ошибка')
                  }
                }}
              >
                <label>
                  Имя
                  <input
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, first_name: e.target.value }))}
                  />
                </label>
                <label>
                  Фамилия
                  <input
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, last_name: e.target.value }))}
                  />
                </label>
                <label>
                  Телефон
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </label>
                <button type="submit" className="mapp-btn">
                  Сохранить
                </button>
                <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '8px 0' }} />
                <label>
                  Текущий пароль
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
                  />
                </label>
                <label>
                  Новый пароль
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
                  />
                </label>
                <button
                  type="button"
                  className="mapp-btn mapp-btn--ghost"
                  onClick={async () => {
                    setMsg('')
                    try {
                      await changePassword(token, passwordForm)
                      setPasswordForm({ current_password: '', new_password: '' })
                      setMsg('Пароль изменён')
                    } catch (err) {
                      setMsg(err?.message || 'Ошибка')
                    }
                  }}
                >
                  Сменить пароль
                </button>
                {msg ? <p className="mapp-profile__meta">{msg}</p> : null}
              </form>
            ) : null}

            {panel === 'reviews' ? (
              reviews.length === 0 ? (
                <p className="mapp-empty">Отзывов пока нет</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="mapp-reviewItem">
                    <h3>
                      {r.boat_title || 'Катер'} · {r.rating}★
                    </h3>
                    <p>{r.text || r.comment || '—'}</p>
                    <p style={{ marginTop: 4 }}>{r.status || ''}</p>
                  </div>
                ))
              )
            ) : null}

            {panel === 'notifications' ? (
              <div>
                {[
                  ['emailBooking', 'Бронирования', emailBooking, setEmailBooking, 'email_booking_notifications'],
                  ['emailMessages', 'Сообщения', emailMessages, setEmailMessages, 'email_message_notifications'],
                  ['emailNews', 'Новости', emailNews, setEmailNews, 'email_news_notifications'],
                ].map(([key, label, value, setter, apiKey]) => (
                  <label key={key} className="mapp-switchRow">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={async (e) => {
                        const next = e.target.checked
                        const prev = value
                        setter(next)
                        try {
                          await updateNotificationSettings(token, { [apiKey]: next })
                        } catch {
                          setter(prev)
                        }
                      }}
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
