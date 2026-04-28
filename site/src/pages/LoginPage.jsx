import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SITE_MAIN_URL } from '../config'

export default function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ login: '', password: '' })
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
          <a className="authMenuBtn auth-loginTopBar__btn" href={`${SITE_MAIN_URL}/register`} target="_blank" rel="noopener noreferrer">
            Регистрация
          </a>
          <span className="authMenuBtn auth-loginTopBar__btn auth-loginTopBar__btn--active" aria-current="page">
            Войти
          </span>
        </nav>
      </header>

      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-card__title">Вход</h1>
          <p className="auth-card__sub">Введите email или телефон и пароль.</p>
          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-field">
              <span>Логин</span>
              <input
                type="text"
                value={form.login}
                onChange={(e) => setForm((v) => ({ ...v, login: e.target.value }))}
                placeholder="email или телефон"
                autoComplete="username"
                required
              />
            </label>
            <label className="auth-field">
              <span>Пароль</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <p className="auth-error">{error}</p> : null}
            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? 'Входим…' : 'Войти'}
            </button>
          </form>
          <p className="auth-card__hint">
            Нет аккаунта? <Link to="/">Вернуться на главную</Link>
          </p>
        </div>
      </div>
    </>
  )
}
