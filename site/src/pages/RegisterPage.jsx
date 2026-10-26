import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { registerAuth } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useNoIndexSeo } from '../seo/useNoIndexSeo.js'
import googlePlayIcon from '../assets/icon-g-p.webp'
import {
  CLIENT_ANDROID_PLAY_URL,
  CLIENT_IOS_APP_STORE_URL,
  OWNER_ANDROID_PLAY_URL,
  OWNER_IOS_APP_STORE_URL,
} from '../constants/appStores'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const BENEFITS = [
  {
    id: 'favorites',
    title: 'Избранные катера',
    text: 'Сохраняйте понравившиеся суда и находите их в один клик.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3.5v17M8.2 7.2h7.6M7 11.2h10M9.2 20.5h5.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M12 3.5c2.2 1.4 3.6 2.6 3.6 4.4S14.2 10.5 12 10.5 8.4 9.7 8.4 7.9 9.8 4.9 12 3.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'booking',
    title: 'Быстрое бронирование',
    text: 'Бронируйте катера быстро и без лишних шагов.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5" width="16" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M4 10h16M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path
          d="M9.4 14.6 11.1 16.3l3.7-3.7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'chat',
    title: 'Чат с владельцем',
    text: 'Связывайтесь с владельцами напрямую и уточняйте детали.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 17.2V8.7A2.7 2.7 0 0 1 7.7 6h8.6A2.7 2.7 0 0 1 19 8.7v5.2a2.7 2.7 0 0 1-2.7 2.7H9l-4 2.6v-1.9Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M9 11.2h.01M12 11.2h.01M15 11.2h.01"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

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

function FieldIconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4.5 19.5c1.5-3 4-4.5 7.5-4.5s6 1.5 7.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FieldIconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m4.5 7.5 7.5 6 7.5-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FieldIconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.2 4.8h2.1l1 4.2-1.6 1a11.5 11.5 0 0 0 4.3 4.3l1-1.6 4.2 1v2.1a1.6 1.6 0 0 1-1.7 1.6A13.8 13.8 0 0 1 4.6 6.5 1.6 1.6 0 0 1 6.2 4.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FieldIconEye({ crossed = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      {crossed ? (
        <>
          <path
            d="M3 3l18 18M10.6 10.6A3 3 0 0 0 13.4 13.4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.8 4.2 9.8 7-.4 1.1-1.2 2.5-2.4 3.7M6.1 6.1C4.5 7.4 3.4 9 2.9 12c1 2.8 4.6 7 9.1 7 1.4 0 2.7-.3 3.9-.9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M2.9 12c1-2.8 4.6-7 9.1-7s8.1 4.2 9.1 7c-1 2.8-4.6 7-9.1 7s-8.1-4.2-9.1-7Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
        </>
      )}
    </svg>
  )
}

export default function RegisterPage() {
  useNoIndexSeo('Регистрация | ONTHEWATER')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordRepeat: '',
  })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false)
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
    if (!acceptedTerms) {
      setError('Нужно согласиться с условиями использования')
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
    <div className="auth-page auth-page--register">
      <div className="auth-register">
        <aside className="auth-register__benefits" aria-labelledby="auth-register-benefits-title">
          <h2 id="auth-register-benefits-title" className="auth-register__benefitsTitle">
            Преимущества с ONTHEWATER
          </h2>
          <ul className="auth-register__benefitList">
            {BENEFITS.map((item) => (
              <li key={item.id} className="auth-register__benefit">
                <span className="auth-register__benefitIcon">{item.icon}</span>
                <div className="auth-register__benefitBody">
                  <p className="auth-register__benefitTitle">{item.title}</p>
                  <p className="auth-register__benefitText">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="auth-register__stores">
            <p className="auth-register__storesLabel">Приложение ONTHEWATER</p>
            <div className="auth-register__storeRow" aria-label="Скачать приложение">
              <a
                href={CLIENT_IOS_APP_STORE_URL}
                className="auth-register__badge"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Скачать ONTHEWATER в App Store"
              >
                <svg className="auth-register__badgeIcon" width="22" height="26" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3.1-1.6-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.4zM14.7 6.5c.6-.8 1.1-1.8.9-2.9-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-.9 2.8 1.1.1 2.1-.5 2.8-1.4z"
                  />
                </svg>
                <span className="auth-register__badgeText">
                  <span className="auth-register__badgeEyebrow">Загрузите в</span>
                  <span className="auth-register__badgeName">App Store</span>
                </span>
              </a>
              <a
                href={CLIENT_ANDROID_PLAY_URL}
                className="auth-register__badge"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Скачать ONTHEWATER в Google Play"
              >
                <img
                  className="auth-register__badgeIcon auth-register__badgeIcon--play"
                  src={googlePlayIcon}
                  alt=""
                  width="22"
                  height="22"
                  aria-hidden
                />
                <span className="auth-register__badgeText">
                  <span className="auth-register__badgeEyebrow">Доступно в</span>
                  <span className="auth-register__badgeName">Google Play</span>
                </span>
              </a>
            </div>
            <p className="auth-register__ownerHint">
              Владельцам судов — регистрация в{' '}
              <a href={OWNER_IOS_APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                приложении для владельцев
              </a>
              {' · '}
              <a href={OWNER_ANDROID_PLAY_URL} target="_blank" rel="noopener noreferrer">
                Google Play
              </a>
            </p>
          </div>
        </aside>

        <div className="auth-card auth-register__card">
          <h1 className="auth-card__title">Регистрация</h1>
          <p className="auth-card__sub">
            Создайте аккаунт, чтобы бронировать катера и общаться с владельцами.
          </p>
          <form className="auth-form auth-register__form" onSubmit={onSubmit}>
            <label className="auth-field auth-field--icon">
              <span>Имя</span>
              <span className="auth-field__control">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Ваше имя"
                  autoComplete="name"
                  required
                />
                <span className="auth-field__icon">
                  <FieldIconUser />
                </span>
              </span>
            </label>
            <label className="auth-field auth-field--icon">
              <span>Email</span>
              <span className="auth-field__control">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
                <span className="auth-field__icon">
                  <FieldIconMail />
                </span>
              </span>
            </label>
            <label className="auth-field auth-field--icon">
              <span>Телефон</span>
              <span className="auth-field__control">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((v) => ({ ...v, phone: formatPhoneRu(e.target.value) }))}
                  placeholder="+7 (___) ___-__-__"
                  autoComplete="tel"
                  maxLength={18}
                  required
                />
                <span className="auth-field__icon">
                  <FieldIconPhone />
                </span>
              </span>
            </label>
            <label className="auth-field auth-field--icon">
              <span>Пароль</span>
              <span className="auth-field__control">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                  placeholder="Придумайте пароль"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-field__iconBtn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <FieldIconEye crossed={showPassword} />
                </button>
              </span>
            </label>
            <label className="auth-field auth-field--icon">
              <span>Повторите пароль</span>
              <span className="auth-field__control">
                <input
                  type={showPasswordRepeat ? 'text' : 'password'}
                  value={form.passwordRepeat}
                  onChange={(e) => setForm((v) => ({ ...v, passwordRepeat: e.target.value }))}
                  placeholder="Повторите пароль"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-field__iconBtn"
                  onClick={() => setShowPasswordRepeat((v) => !v)}
                  aria-label={showPasswordRepeat ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <FieldIconEye crossed={showPasswordRepeat} />
                </button>
              </span>
            </label>

            <label className="auth-register__terms">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                Я соглашаюсь с <Link to="/terms">Условиями использования</Link> и{' '}
                <Link to="/privacy">Политикой конфиденциальности</Link>
              </span>
            </label>

            {error ? <p className="auth-error">{error}</p> : null}
            {success ? <p className="auth-success">{success}</p> : null}

            <button type="submit" className="auth-submit auth-submit--register" disabled={submitting}>
              {submitting ? 'Регистрируем…' : 'Создать аккаунт'}
            </button>
          </form>

          <div className="auth-register__divider" role="separator" aria-label="или">
            <span>или</span>
          </div>
          <p className="auth-card__hint auth-register__loginHint">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
