import './App.css'

const DESTINATIONS = [
  'Сочи',
  'Санкт-Петербург',
  'Москва',
  'Казань',
  'Крым',
  'Владивосток',
]

const CATEGORIES = [
  'Яхты',
  'Катера',
  'Парусные суда',
  'Рыбалка',
  'Праздники на воде',
  'Премиум-аренда',
]

const TRUST_ITEMS = [
  {
    title: 'Защита от непогоды',
    text: 'Если погода срывает выход на воду, бронирование можно перенести или вернуть деньги по правилам сервиса.',
  },
  {
    title: 'Проверенные суда',
    text: 'Каждый катер проходит модерацию: безопасность, чистота, актуальные фото и документы владельца.',
  },
  {
    title: 'Безопасная оплата',
    text: 'Оплата проходит онлайн через защищённый платёжный сценарий с подтверждением в приложении.',
  },
  {
    title: 'Поддержка 24/7',
    text: 'Команда поддержки поможет до брони, во время аренды и после завершения поездки.',
  },
]

function App() {
  return (
    <div className="page">
      <header className="header">
        <div className="logo">ONTHEWATER</div>
        <nav className="nav">
          <a href="#">Поиск судов</a>
          <a href="#">Направления</a>
          <a href="#">Для владельцев</a>
          <a href="#">Поддержка</a>
        </nav>
        <div className="auth">
          <button className="btn ghost">Войти</button>
          <button className="btn primary">Разместить судно</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-text">
            <p className="eyebrow">Бронируйте, выходите на воду, наслаждайтесь</p>
            <h1>Аренда катеров, яхт и прогулок с капитаном</h1>
            <p>
              ONTHEWATER помогает найти проверенное судно в популярных локациях России:
              от короткой прогулки на 2 часа до целого дня на воде.
            </p>
            <div className="hero-search">
              <input
                className="input city"
                placeholder="Куда хотите выйти на воду?"
              />
              <input className="input date" placeholder="Дата и время" />
              <button className="btn primary">Найти судно</button>
            </div>
            <div className="hero-tags">
              <span>600+ судов</span>
              <span>Мгновенное бронирование</span>
              <span>Подтверждённые владельцы</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel-image" />
            <div className="hero-panel-body">
              <h3>Сейчас в Сочи</h3>
              <p>Тёплая вода, живописные маршруты и закаты в море. Лучшее время для прогулки — с 16:00.</p>
              <button className="btn dark">Смотреть варианты</button>
            </div>
          </div>
        </section>

        <section className="section section-padded">
          <div className="section-head">
            <h2>Популярные направления</h2>
            <a href="#">Смотреть все</a>
          </div>
          <div className="destinations-grid">
            {DESTINATIONS.map((city) => (
              <article key={city} className="destination-card">
                <div className="destination-thumb" />
                <h3>{city}</h3>
                <p>Частные прогулки и аренда катеров с капитаном</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-muted">
          <div className="section-head">
            <h2>Почему бронируют в ONTHEWATER</h2>
          </div>
          <div className="trust-grid">
            {TRUST_ITEMS.map((item) => (
              <article key={item.title} className="trust-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-padded">
          <div className="section-head">
            <h2>Категории отдыха</h2>
          </div>
          <div className="category-chips">
            {CATEGORIES.map((c) => (
              <button key={c} className="chip">{c}</button>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>© {new Date().getFullYear()} ONTHEWATER</strong>
          <p>Маркетплейс аренды катеров и яхт</p>
        </div>
        <div className="footer-links">
          <a href="#">Политика конфиденциальности</a>
          <a href="#">Условия использования</a>
          <a href="#">Поддержка</a>
        </div>
      </footer>
    </div>
  )
}

export default App
