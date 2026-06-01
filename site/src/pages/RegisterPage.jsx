import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { registerAuth } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import googlePlayIcon from '../assets/icon-g-p.webp'
import appleStoreIcon from '../assets/icon-a-s.webp'
import { OWNER_ANDROID_PLAY_URL, OWNER_IOS_APP_STORE_URL } from '../constants/appStores'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatPhoneRu(value) {
  const digits = String(value || '').replace(/\D/g, '')
  let d = digits
  if (d.startsWith('8')) d = `7${d.slice(1)}`
  else if (d && !d.startsWith('7')) d = `7${d}`
  if (!d) return ''
  if (d.length <= 1) return '+7'
  if (d.length <= 4) return `+7 (${d.slice(1)}`
  if (d.length <= 7) return `+7 (${d.slice(1, 4)}) ${d.slice(4)}`
  if (d.length <= 9) return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`
}

function getPhoneDigits(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (d.startsWith('8')) d = `7${d.slice(1)}`
  else if (d && !d.startsWith('7')) d = `7${d}`
  return d
}

export default function RegisterPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordRepeat: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (user) return <Navigate to="/account" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    const phoneDigits = getPhoneDigits(form.phone)
    const password = form.password
    const passwordRepeat = form.passwordRepeat

    if (name.length < 2) {
      setError('Имя должно содержать не менее 2 символов')
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      setError('Введите корректный email')
      return
    }
    if (phoneDigits.length < 11) {
      setError('Введите полный номер телефона')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    if (password !== passwordRepeat) {
      setError('Пароли не совпадают')
      return
    }

    setSubmitting(true)
    try {
      const data = await registerAuth({
        name,
        email,
        phone: phoneDigits,
        password,
        role: 'client',
      })
      const msg =
        data?.message ||
        'Аккаунт создан. Проверьте email для подтверждения и затем войдите в личный кабинет.'
      setSuccess(msg)
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err?.message || 'Не удалось зарегистрироваться')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="bd-topBar auth-loginTopBar">
        <div className="bd-topBar__left">
          <Link to="/" className="bd-topBar__logo" aria-label="ONTHEWATER — на главную">
            <span className="bd-topBar__logoMark" aria-hidden />
            <span className="bd-topBar__logoText">onthewater</span>
          </Link>
        </div>
        <nav className="bd-topBar__nav" aria-label="Разделы сайта">
          <Link to="/boats" className="bd-topBar__link">
            Поиск катеров
          </Link>
          <span className="authMenuBtn auth-loginTopBar__btn auth-loginTopBar__btn--active" aria-current="page">
            Регистрация
          </span>
          <Link className="authMenuBtn auth-loginTopBar__btn" to="/login">
            Войти
          </Link>
        </nav>
      </header>

      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-card__title">Регистрация</h1>
          <p className="auth-card__sub">Заполните поля для создания аккаунта.</p>
          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-field">
              <span>Имя</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                placeholder="Как к вам обращаться"
                autoComplete="name"
                required
              />
            </label>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                placeholder="example@mail.ru"
                autoComplete="email"
                required
              />
            </label>
            <label className="auth-field">
              <span>Телефон</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((v) => ({ ...v, phone: formatPhoneRu(e.target.value) }))}
                placeholder="+7 (999) 123-45-67"
                autoComplete="tel"
                maxLength={18}
                required
              />
            </label>
            <label className="auth-field">
              <span>Пароль</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                placeholder="Не менее 6 символов"
                autoComplete="new-password"
                required
              />
            </label>
            <label className="auth-field">
              <span>Повторите пароль</span>
              <input
                type="password"
                value={form.passwordRepeat}
                onChange={(e) => setForm((v) => ({ ...v, passwordRepeat: e.target.value }))}
                placeholder="Повторите пароль"
                autoComplete="new-password"
                required
              />
            </label>
            {error ? <p className="auth-error">{error}</p> : null}
            {success ? <p className="auth-success">{success}</p> : null}
            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? 'Регистрируем…' : 'Зарегистрироваться'}
            </button>
          </form>
          <p className="auth-card__hint">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
          <p className="auth-card__hint auth-card__hint--owner">
            Для владельцев судов регистрация доступна в мобильном приложении для владельцев.
          </p>
          <div className="auth-ownerStores" aria-label="Скачать приложение для владельцев">
            <a
              href={OWNER_IOS_APP_STORE_URL}
              className="auth-ownerStoreBadge auth-ownerStoreBadge--apple"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Скачать приложение для владельцев в App Store"
            >
              <img src={appleStoreIcon} alt="App Store" className="auth-ownerStoreBadge__img" />
            </a>
            <a
              href={OWNER_ANDROID_PLAY_URL}
              className="auth-ownerStoreBadge auth-ownerStoreBadge--google"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Скачать приложение для владельцев в Google Play"
            >
              <img src={googlePlayIcon} alt="Google Play" className="auth-ownerStoreBadge__img" />
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
