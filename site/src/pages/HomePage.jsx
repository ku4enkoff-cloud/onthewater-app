import { Link } from 'react-router-dom'
import '../App.css'
import heroImg from '../../images/app/hero.webp'
import PopularBoats from '../components/PopularBoats.jsx'
import { SITE_MAIN_URL } from '../config'

const SERVICE_CATEGORIES = [
  {
    title: 'Аренда катеров',
    text: 'Подберите идеальное судно для поездки.',
    img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop',
  },
  {
    title: 'Чартер яхт',
    text: 'Комфорт и статус на воде.',
    img: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400&h=400&fit=crop',
  },
  {
    title: 'Рыбалка',
    text: 'Рыболовные туры с гидом.',
    img: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400&h=400&fit=crop',
  },
]

const HOW_STEPS = [
  {
    n: 1,
    title: 'Выберите катер',
    text: 'Найдите и забронируйте подходящее судно.',
    img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=280&h=200&fit=crop',
  },
  {
    n: 2,
    title: 'Онлайн-бронь',
    text: 'Быстрое и безопасное оформление.',
    img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=280&h=200&fit=crop',
  },
  {
    n: 3,
    title: 'Наслаждайтесь',
    text: 'Выходите на воду и отдыхайте.',
    img: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=280&h=200&fit=crop',
  },
]

export default function HomePage() {
  return (
    <div className="lp">
      <section className="lp-heroWrap">
        <div className="lp-heroBg" style={{ backgroundImage: `url(${heroImg})` }} aria-hidden />
        <div className="lp-heroTint" aria-hidden />

        <header className="lp-header">
          <Link to="/" className="lp-logo" aria-label="ONTHEWATER">
            <span className="lp-logoIcon" aria-hidden>
              <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
                <circle cx="20" cy="20" r="19" fill="#0061C1" />
                <path
                  d="M8 22c3-4 7-6 12-6s9 2 12 6"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M10 26c2.5-2 5.5-3 10-3s7.5 1 10 3"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.85"
                  fill="none"
                />
              </svg>
            </span>
            <span className="lp-logoText">onthewater</span>
          </Link>

          <nav className="lp-nav" aria-label="Основное меню">
            <Link to="/boats">Катера</Link>
            <a href="#how">Как это работает</a>
            <a href="#services">Услуги</a>
            <a href="#contact">Контакты</a>
          </nav>

          <div className="lp-headerActions">
            <a href={SITE_MAIN_URL} className="lp-linkMuted" target="_blank" rel="noopener noreferrer">
              Разместить катер
            </a>
            <a href={SITE_MAIN_URL} className="lp-btnGhost" target="_blank" rel="noopener noreferrer">
              Регистрация
            </a>
            <a href={SITE_MAIN_URL} className="lp-btnGhost" target="_blank" rel="noopener noreferrer">
              Вход
            </a>
          </div>
        </header>

        <div className="lp-heroContent">
          <h1 className="lp-heroTitle">
            Арендуйте идеальный катер
            <br />
            для вашего отдыха
          </h1>
          <p className="lp-heroSub">
            Найдите и забронируйте судно для любого случая — с капитаном или без.
          </p>

          <div className="lp-searchBar" role="search">
            <div className="lp-searchField">
              <label className="lp-srOnly" htmlFor="where">
                Куда
              </label>
              <input id="where" type="text" placeholder="Куда?" className="lp-searchInput" />
            </div>
            <span className="lp-searchDivider" />
            <div className="lp-searchField">
              <label className="lp-srOnly" htmlFor="date">
                Дата
              </label>
              <select id="date" className="lp-searchSelect" defaultValue="">
                <option value="" disabled>
                  Выберите дату
                </option>
                <option>Сегодня</option>
                <option>Завтра</option>
              </select>
            </div>
            <span className="lp-searchDivider" />
            <div className="lp-searchField">
              <label className="lp-srOnly" htmlFor="guests">
                Гости
              </label>
              <select id="guests" className="lp-searchSelect" defaultValue="2">
                <option value="1">1 гость</option>
                <option value="2">2 гостя</option>
                <option value="4">4 гостя</option>
                <option value="8">8+ гостей</option>
              </select>
            </div>
            <Link to="/boats" className="lp-searchBtn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              Найти
            </Link>
          </div>
        </div>
      </section>

      <section className="lp-section lp-services" id="services">
        <div className="lp-container lp-servicesGrid">
          {SERVICE_CATEGORIES.map((item) => (
            <article key={item.title} className="lp-serviceCard">
              <div className="lp-serviceImgWrap">
                <img src={item.img} alt="" className="lp-serviceImg" loading="lazy" />
              </div>
              <h3 className="lp-serviceTitle">{item.title}</h3>
              <p className="lp-serviceText">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <PopularBoats />

      <section className="lp-section lp-how" id="how">
        <div className="lp-container">
          <h2 className="lp-howTitle">Как это работает</h2>
          <div className="lp-howRow">
            {HOW_STEPS.map((step) => (
              <div key={step.n} className="lp-howStep">
                <div className="lp-howCircle">{step.n}</div>
                <div className="lp-howImgOval">
                  <img src={step.img} alt="" loading="lazy" />
                </div>
                <h3 className="lp-howStepTitle">{step.title}</h3>
                <p className="lp-howStepText">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta" id="contact">
        <div className="lp-ctaBg" aria-hidden />
        <div className="lp-ctaInner">
          <h2 className="lp-ctaTitle">Владелец катера? Зарабатывайте</h2>
          <p className="lp-ctaSub">Сдавайте судно в аренду через ONTHEWATER.</p>
          <a href={SITE_MAIN_URL} className="lp-ctaBtn" target="_blank" rel="noopener noreferrer">
            Разместить катер
          </a>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container lp-footerInner">
          <div>
            <strong>© {new Date().getFullYear()} ONTHEWATER</strong>
            <p>Маркетплейс аренды катеров и яхт</p>
          </div>
          <div className="lp-footerLinks">
            <Link to="/boats">Катера</Link>
            <a href={SITE_MAIN_URL} target="_blank" rel="noopener noreferrer">
              Политика конфиденциальности
            </a>
            <a href={SITE_MAIN_URL} target="_blank" rel="noopener noreferrer">
              Условия
            </a>
            <a href={SITE_MAIN_URL} target="_blank" rel="noopener noreferrer">
              Поддержка
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
