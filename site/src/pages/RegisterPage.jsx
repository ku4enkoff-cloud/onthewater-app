import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { registerAuth } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useNoIndexSeo } from '../seo/useNoIndexSeo.js'
import '../styles/precision-home.css'
import AuthSplitAside from '../components/auth/AuthSplitAside.jsx'
import {
  FieldIconEye,
  FieldIconMail,
  FieldIconPhone,
  FieldIconUser,
} from '../components/auth/authFieldIcons.jsx'

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
    <div className="auth-page auth-page--split">
      <div className="auth-register">
        <AuthSplitAside />

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

            <button type="submit" className="auth-submit auth-submit--brand" disabled={submitting}>
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
