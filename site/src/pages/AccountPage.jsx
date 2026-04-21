import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AccountPage() {
  const { user, logout } = useAuth()
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Личный кабинет</h1>
        <p className="auth-card__sub">Добро пожаловать, {user?.name || user?.email || 'пользователь'}.</p>
        <dl className="account-meta">
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
