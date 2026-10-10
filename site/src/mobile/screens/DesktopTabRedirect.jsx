import { Navigate } from 'react-router-dom'

/** Новые app-маршруты на десктопе → кабинет / главная, без ломки закладок. */
export default function DesktopTabRedirect({ to = '/account' }) {
  return <Navigate to={to} replace />
}
