import { Link } from 'react-router-dom'

export default function UnauthorizedCard({
  title = 'Войдите в аккаунт',
  text = 'Чтобы пользоваться этим разделом, войдите или зарегистрируйтесь.',
}) {
  return (
    <div className="mapp-unauthorized">
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="mapp-unauthorized__actions">
        <Link className="mapp-btn" to="/login">
          Войти
        </Link>
        <Link className="mapp-btn mapp-btn--ghost" to="/register">
          Регистрация
        </Link>
      </div>
    </div>
  )
}
