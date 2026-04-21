import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyBookings } from '../api/bookings'

const STATUS_LABELS = {
  pending: 'На рассмотрении',
  confirmed: 'Подтверждено',
  completed: 'Завершено',
  cancelled: 'Отменено',
}

const ACCOUNT_MENU = [
  { id: 'bookings', label: 'Мои бронирования' },
  { id: 'messages', label: 'Сообщения' },
  { id: 'favorites', label: 'Избранное' },
  { id: 'account', label: 'Данные аккаунта' },
  { id: 'help', label: 'Помощь' },
  { id: 'reviews', label: 'Отзывы' },
]

function formatBookingDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export default function AccountPage() {
  const { user, token, logout } = useAuth()
  const [activeMenu, setActiveMenu] = useState('bookings')
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setBookingsLoading(true)
        setBookingsError('')
        const rows = await fetchMyBookings(token)
        if (cancelled) return
        setBookings(rows)
      } catch (err) {
        if (!cancelled) setBookingsError(err?.message || 'Не удалось загрузить бронирования')
      } finally {
        if (!cancelled) setBookingsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const bookingsSorted = useMemo(
    () =>
      [...bookings].sort(
        (a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime(),
      ),
    [bookings],
  )

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <h1 className="auth-card__title">Личный кабинет</h1>
        <p className="auth-card__sub">Добро пожаловать, {user?.name || user?.email || 'пользователь'}.</p>

        <nav className="account-menu" aria-label="Разделы личного кабинета">
          {ACCOUNT_MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`account-menu__item${activeMenu === item.id ? ' account-menu__item--active' : ''}`}
              onClick={() => setActiveMenu(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {activeMenu === 'bookings' ? (
          <section className="account-section">
            <h2 className="account-section__title">Мои бронирования</h2>
            {bookingsLoading ? (
              <p className="auth-card__sub">Загружаем бронирования…</p>
            ) : bookingsError ? (
              <p className="auth-error">{bookingsError}</p>
            ) : bookingsSorted.length === 0 ? (
              <p className="auth-card__sub">Пока нет бронирований.</p>
            ) : (
              <div className="account-bookings">
                {bookingsSorted.map((b) => (
                  <article key={b.id} className="account-bookingCard">
                    <div className="account-bookingCard__head">
                      <h3>{b.boat_title || 'Катер'}</h3>
                      <span className={`account-bookingCard__status account-bookingCard__status--${b.status || 'pending'}`}>
                        {STATUS_LABELS[b.status] || b.status || '—'}
                      </span>
                    </div>
                    <p>Дата выхода: {formatBookingDate(b.start_at)}</p>
                    <p>Длительность: {Number(b.hours) || 0} мин</p>
                    <p>Гостей: {Number(b.passengers) || 1}</p>
                    <p>Сумма: {(Number(b.total_price) || 0).toLocaleString('ru-RU')} ₽</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {activeMenu === 'account' ? (
          <section className="account-section">
            <h2 className="account-section__title">Данные аккаунта</h2>
            <dl className="account-meta">
              <div>
                <dt>Имя</dt>
                <dd>{user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user?.email || '—'}</dd>
              </div>
              <div>
                <dt>Телефон</dt>
                <dd>{user?.phone || '—'}</dd>
              </div>
              <div>
                <dt>Роль</dt>
                <dd>{user?.role || 'client'}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        {activeMenu !== 'bookings' && activeMenu !== 'account' ? (
          <section className="account-section">
            <h2 className="account-section__title">{ACCOUNT_MENU.find((m) => m.id === activeMenu)?.label}</h2>
            <p className="auth-card__sub">Раздел в разработке. Добавлю логику этого пункта следующим шагом.</p>
          </section>
        ) : null}
        <div className="account-actions">
          <Link className="auth-submit auth-submit--ghost" to="/boats">
            К поиску катеров
          </Link>
          <button
            type="button"
            className="auth-submit"
            onClick={() => {
              logout()
            }}
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  )
}
