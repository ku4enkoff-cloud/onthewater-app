import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNoIndexSeo } from '../seo/useNoIndexSeo.js'
import '../styles/precision-home.css'
import AuthSplitAside from '../components/auth/AuthSplitAside.jsx'
import { FieldIconEye, FieldIconUser } from '../components/auth/authFieldIcons.jsx'

export default function LoginPage() {
  useNoIndexSeo('Вход | ONTHEWATER')
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ login: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/account" replace />

  const next = location.state?.from?.pathname || '/account'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form)
      navigate(next, { replace: true })
    } catch (err) {
      setError(err?.message || 'Не удалось войти')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page auth-page--split">
      <div className="auth-register">
        <AuthSplitAside />

        <div className="auth-card auth-register__card">
          <h1 className="auth-card__title">Вход</h1>
          <p className="auth-card__sub">Введите email или телефон и пароль.</p>
          <form className="auth-form auth-register__form" onSubmit={onSubmit}>
            <label className="auth-field auth-field--icon">
              <span>Логин</span>
              <span className="auth-field__control">
                <input
                  type="text"
                  value={form.login}
                  onChange={(e) => setForm((v) => ({ ...v, login: e.target.value }))}
                  placeholder="Email или телефон"
                  autoComplete="username"
                  required
                />
                <span className="auth-field__icon">
                  <FieldIconUser />
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
                  placeholder="Введите пароль"
                  autoComplete="current-password"
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

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" className="auth-submit auth-submit--brand" disabled={submitting}>
              {submitting ? 'Входим…' : 'Войти'}
            </button>
          </form>

          <div className="auth-register__divider" role="separator" aria-label="или">
            <span>или</span>
          </div>
          <p className="auth-card__hint auth-register__loginHint">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
