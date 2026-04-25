import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE_MAIN_URL } from '../config'
import { LOCATION_OPTIONS } from '../boatSearchUtils.js'

const MOBILE_FOOTER_MQ = '(max-width: 720px)'

function FooterChevron({ open }) {
  return (
    <svg
      className={`sf-col__chev${open ? ' sf-col__chev--open' : ''}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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

function FooterCol({ title, panelId, children }) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_FOOTER_MQ).matches : false,
  )
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' ? !window.matchMedia(MOBILE_FOOTER_MQ).matches : true,
  )

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_FOOTER_MQ)
    const sync = () => {
      const m = mq.matches
      setMobile(m)
      if (!m) setOpen(true)
      else setOpen(false)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <div className="sf-col">
      {mobile ? (
        <button
          type="button"
          className="sf-col__trigger"
          id={`${panelId}-btn`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sf-col__title">{title}</span>
          <FooterChevron open={open} />
        </button>
      ) : (
        <h3 className="sf-col__title">{title}</h3>
      )}
      <div id={panelId} className="sf-col__panel" hidden={mobile && !open}>
        {children}
      </div>
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
            <FooterCol title="Компания" panelId="sf-col-company">
              <nav className="sf-links" aria-label="Компания">
                {COL_COMPANY.map((item) => (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">
                    {item.label}
                  </a>
                ))}
              </nav>
            </FooterCol>

            <FooterCol title="Сообщество" panelId="sf-col-community">
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

            <FooterCol title="Сервисы" panelId="sf-col-services">
              <nav className="sf-links" aria-label="Сервисы">
                {COL_EXPERIENCES.map((item) => (
                  <Link key={item.label} to={item.to}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </FooterCol>

            <FooterCol title="Популярные локации" panelId="sf-col-locations">
              <nav className="sf-links" aria-label="Популярные локации">
                {topLocations.map((o) => (
                  <Link key={o.value} to={boatsCityHref(o.value)}>
                    {o.label}
                  </Link>
                ))}
                <Link to="/boats">Все регионы</Link>
              </nav>
            </FooterCol>

            <FooterCol title="Связь с нами" panelId="sf-col-contact">
              <a className="sf-contactEmail" href="mailto:info@onthewater.ru">
                info@onthewater.ru
              </a>
              <div className="sf-appCard">
                <div className="sf-appCard__head">
                  <div className="sf-appCard__logoWrap" aria-hidden>
                    <span className="sf-appCard__logoMark" />
                  </div>
                  <div className="sf-appCard__text">
                    <p className="sf-appCard__name">Приложение ONTHEWATER</p>
                    <p className="sf-appCard__tagline">Найдите и забронируйте катер в десятках городов России</p>
                  </div>
                </div>
                <div className="sf-appCard__stores">
                  <span className="sf-store sf-store--disabled" aria-disabled="true">
                    Скоро в App Store
                  </span>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.anonymous.onthewater"
                    className="sf-store"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Доступно в Google Play
                  </a>
                </div>
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
