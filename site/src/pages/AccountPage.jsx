import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyBookings } from '../api/bookings'
import { changePassword, deleteMyAccount, updateProfile } from '../api/auth'

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
  const { user, token, logout, setCurrentUser } = useAuth()
  const [activeMenu, setActiveMenu] = useState('bookings')
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', phone: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
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

  useEffect(() => {
    setProfileForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    })
  }, [user?.first_name, user?.last_name, user?.phone])

  const saveProfile = async () => {
    try {
      setProfileSaving(true)
      setProfileMsg('')
      const updated = await updateProfile(token, {
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        phone: profileForm.phone.trim(),
      })
      setCurrentUser(updated)
      setProfileMsg('Данные сохранены.')
    } catch (err) {
      setProfileMsg(err?.message || 'Не удалось сохранить данные')
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async () => {
    try {
      setPasswordSaving(true)
      setPasswordMsg('')
      await changePassword(token, passwordForm)
      setPasswordForm({ current_password: '', new_password: '' })
      setPasswordMsg('Пароль успешно изменен.')
    } catch (err) {
      setPasswordMsg(err?.message || 'Не удалось изменить пароль')
    } finally {
      setPasswordSaving(false)
    }
  }

  const onDeleteAccount = async () => {
    const ok = window.confirm('Удалить аккаунт без возможности восстановления?')
    if (!ok) return
    try {
      setDeletingAccount(true)
      await deleteMyAccount(token)
      logout()
    } catch (err) {
      alert(err?.message || 'Не удалось удалить аккаунт')
    } finally {
      setDeletingAccount(false)
    }
  }

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
            <div className="account-form">
              <label className="auth-field">
                <span>Имя</span>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm((v) => ({ ...v, first_name: e.target.value }))}
                />
              </label>
              <label className="auth-field">
                <span>Фамилия</span>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm((v) => ({ ...v, last_name: e.target.value }))}
                />
              </label>
              <label className="auth-field">
                <span>Телефон</span>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((v) => ({ ...v, phone: e.target.value }))}
                />
              </label>
              <label className="auth-field">
                <span>Почта</span>
                <input type="text" value={user?.email || ''} readOnly />
              </label>
              <div className="account-inlineActions">
                <button type="button" className="auth-submit" onClick={saveProfile} disabled={profileSaving}>
                  {profileSaving ? 'Сохраняем…' : 'Сохранить данные'}
                </button>
                {profileMsg ? <p className="auth-card__sub">{profileMsg}</p> : null}
              </div>
            </div>

            <div className="account-form account-form--password">
              <h3 className="account-section__subtitle">Изменить пароль</h3>
              <label className="auth-field">
                <span>Текущий пароль</span>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm((v) => ({ ...v, current_password: e.target.value }))}
                />
              </label>
              <label className="auth-field">
                <span>Новый пароль</span>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm((v) => ({ ...v, new_password: e.target.value }))}
                />
              </label>
              <div className="account-inlineActions">
                <button type="button" className="auth-submit auth-submit--ghost" onClick={savePassword} disabled={passwordSaving}>
                  {passwordSaving ? 'Меняем…' : 'Изменить пароль'}
                </button>
                {passwordMsg ? <p className="auth-card__sub">{passwordMsg}</p> : null}
              </div>
            </div>

            <div className="account-inlineActions">
              <button type="button" className="auth-submit auth-submit--danger" onClick={onDeleteAccount} disabled={deletingAccount}>
                {deletingAccount ? 'Удаляем…' : 'Удалить аккаунт'}
              </button>
            </div>
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
