import { Link } from 'react-router-dom'
import { useNoIndexSeo } from '../seo/useNoIndexSeo'

export default function NotFoundPage() {
  useNoIndexSeo('Страница не найдена | ONTHEWATER')

  return (
    <div className="bd-page">
      <div className="bd-error">
        <h1>Страница не найдена</h1>
        <p>Запрошенный адрес не существует или был удалён.</p>
        <p>
          <Link to="/">На главную</Link>
          {' · '}
          <Link to="/boats">К поиску катеров</Link>
        </p>
      </div>
    </div>
  )
}
