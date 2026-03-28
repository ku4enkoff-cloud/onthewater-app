import { Link } from 'react-router-dom'
import { SITE_MAIN_URL } from '../config'
import { LOCATION_OPTIONS } from '../boatSearchUtils.js'
import './SiteFooter.css'

const base = SITE_MAIN_URL.replace(/\/$/, '')

function boatsCityHref(cityValue) {
  if (cityValue === '__all') return '/boats'
  return `/boats?city=${encodeURIComponent(cityValue)}`
}

const COL_COMPANY = [
  { label: 'О нас', href: `${base}/` },
  { label: 'ONTHEWATER — наши обязательства', href: `${base}/` },
  { label: 'Пресса', href: `${base}/` },
  { label: 'Карьера', href: `${base}/` },
  { label: 'Поддержка', href: `${base}/` },
]

const COL_COMMUNITY = [
  { label: 'Поиск катеров', to: '/boats' },
  { label: 'Разместить катер', href: `${base}/` },
  { label: 'Стать капитаном', href: `${base}/` },
  { label: 'Социальные проекты', href: `${base}/` },
  { label: 'Блог', href: `${base}/` },
  { label: 'Правила и требования', href: `${base}/` },
  { label: 'Гиды по катерам', href: `${base}/` },
  { label: 'Безопасность на воде', href: `${base}/` },
]

const COL_EXPERIENCES = [
  { label: 'Аренда катеров', to: '/boats' },
  { label: 'Рыбалка с катера', to: '/boats' },
  { label: 'Аренда катера для рыбалки', to: '/boats' },
  { label: 'Прогулки на яхте', to: '/boats' },
  { label: 'Аренда яхт', to: '/boats' },
  { label: 'Катер с капитаном', to: '/boats' },
  { label: 'Вечеринки на катере', to: '/boats' },
  { label: 'Девичник на катере', to: '/boats' },
  { label: 'Мальчишник на катере', to: '/boats' },
]

const SOCIAL = [
  { name: 'Instagram', href: `${base}/`, abbr: 'IG' },
  { name: 'YouTube', href: `${base}/`, abbr: 'YT' },
  { name: 'Facebook', href: `${base}/`, abbr: 'f' },
  { name: 'Pinterest', href: `${base}/`, abbr: 'P' },
  { name: 'X (Twitter)', href: `${base}/`, abbr: '𝕏' },
  { name: 'TikTok', href: `${base}/`, abbr: 'TT' },
]

function FooterCol({ title, children }) {
  return (
    <div className="sf-col">
      <h3 className="sf-col__title">{title}</h3>
      {children}
    </div>
  )
}

export default function SiteFooter() {
  const year = new Date().getFullYear()
  const topLocations = LOCATION_OPTIONS.filter((o) => o.value !== '__all')

  return (
    <footer className="sf">
      <div className="sf-top">
        <div className="sf-container">
          <div className="sf-cols">
            <FooterCol title="Компания">
              <nav className="sf-links" aria-label="Компания">
                {COL_COMPANY.map((item) => (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">
                    {item.label}
                  </a>
                ))}
              </nav>
            </FooterCol>

            <FooterCol title="Сообщество">
              <nav className="sf-links" aria-label="Сообщество">
                {COL_COMMUNITY.map((item) =>
                  item.to ? (
                    <Link key={item.label} to={item.to}>
                      {item.label}
                    </Link>
                  ) : (
                    <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">
                      {item.label}
                    </a>
                  ),
                )}
              </nav>
            </FooterCol>

            <FooterCol title="Сервисы">
              <nav className="sf-links" aria-label="Сервисы">
                {COL_EXPERIENCES.map((item) => (
                  <Link key={item.label} to={item.to}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </FooterCol>

            <FooterCol title="Популярные локации">
              <nav className="sf-links" aria-label="Популярные локации">
                {topLocations.map((o) => (
                  <Link key={o.value} to={boatsCityHref(o.value)}>
                    {o.label}
                  </Link>
                ))}
                <Link to="/boats">Все регионы</Link>
              </nav>
            </FooterCol>

            <FooterCol title="Связь с нами">
              <div className="sf-social" role="list">
                {SOCIAL.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    className="sf-social__btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    role="listitem"
                  >
                    <span className="sf-social__abbr" aria-hidden>
                      {s.abbr}
                    </span>
                  </a>
                ))}
              </div>
              <div className="sf-app">
                <div className="sf-app__brand" aria-hidden>
                  <span className="sf-app__logo" />
                </div>
                <div className="sf-app__text">
                  <p className="sf-app__name">Приложение ONTHEWATER</p>
                  <p className="sf-app__tagline">Найдите и забронируйте катер в десятках городов России</p>
                </div>
              </div>
              <div className="sf-stores">
                <a href={`${base}/`} className="sf-store sf-store--apple" target="_blank" rel="noopener noreferrer">
                  Загрузить в App&nbsp;Store
                </a>
                <a href={`${base}/`} className="sf-store sf-store--google" target="_blank" rel="noopener noreferrer">
                  Доступно в Google&nbsp;Play
                </a>
              </div>
            </FooterCol>
          </div>
        </div>
      </div>

      <div className="sf-bottom">
        <div className="sf-container sf-bottom__inner">
          <div className="sf-bottom__left">
            <Link to="/" className="sf-bottom__logo" aria-label="ONTHEWATER — на главную">
              <span className="sf-bottom__logoMark" aria-hidden />
              <span className="sf-bottom__logoText">onthewater</span>
            </Link>
            <span className="sf-bottom__trust">
              <span className="sf-bottom__check" aria-hidden>
                ✓
              </span>
              <span>Отзывы гостей</span>
            </span>
            <span className="sf-bottom__sep" aria-hidden />
            <span className="sf-bottom__rating">
              <span className="sf-bottom__star" aria-hidden>
                ★
              </span>
              <span>высокий рейтинг в приложении</span>
            </span>
          </div>
          <div className="sf-bottom__right">
            <p className="sf-bottom__copy">
              © {year} ONTHEWATER. Все права защищены.
            </p>
            <nav className="sf-bottom__legal" aria-label="Правовая информация">
              <a href={`${base}/`} target="_blank" rel="noopener noreferrer">
                Политика конфиденциальности
              </a>
              <span className="sf-bottom__dot" aria-hidden>
                ·
              </span>
              <a href={`${base}/`} target="_blank" rel="noopener noreferrer">
                Условия использования
              </a>
              <span className="sf-bottom__dot" aria-hidden>
                ·
              </span>
              <a href={`${base}/`} target="_blank" rel="noopener noreferrer">
                Карта сайта
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}
