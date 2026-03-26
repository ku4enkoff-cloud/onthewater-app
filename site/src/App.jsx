import './App.css'

const DESTINATIONS = [
  'Сочи',
  'Санкт-Петербург',
  'Москва',
  'Казань',
  'Крым',
  'Владивосток',
]

const BOAT_TYPES = [
  { title: 'Понтоны', size: 'small' },
  { title: 'Яхты', size: 'wide' },
  { title: 'Водный спорт', size: 'small' },
  { title: 'Парусные', size: 'small' },
  { title: 'Рыбалка', size: 'small' },
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
        <div className="logoWrap">
          <div className="logoMark">◌</div>
          <div className="logoWord">onthewater</div>
        </div>

        <div className="topRight">
          <nav className="nav navTop">
            <a href="#">Experiences</a>
            <a href="#">List your boat</a>
            <a href="#">Messages</a>
            <a href="#">Bookings</a>
          </nav>
          <div className="avatarTop">K</div>
        </div>
      </header>

      <main>
        <section className="hero heroClassic">
          <div className="heroClassicOverlay">
            <div className="heroClassicInner">
              <h1>Browse, book, boat</h1>
              <p>Boat rentals, Captain-led trips, &amp; on-the-water experiences.</p>

              <div className="heroSearchBar">
                <div className="heroSearchInputWrap">
                  <span className="heroSearchPin">◦</span>
                  <input
                    className="heroSearchInput"
                    placeholder="Where would you like to go boating?"
                  />
                </div>
                <button className="heroSearchButton">SEARCH</button>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-padded destinationsSection">
          <div className="destinationsContainer">
            <div className="section-head">
              <div>
                <h2>Explore destinations by boat</h2>
                <p className="sectionSub">Book a private boat rental, just about anywhere.</p>
              </div>
              <div className="destinationsNav">
                <button className="navCircle" aria-label="Назад">‹</button>
                <button className="navCircle" aria-label="Вперёд">›</button>
              </div>
            </div>
            <div className="destinations-grid">
              {DESTINATIONS.map((city) => (
                <article key={city} className="destination-card">
                  <div className="destination-thumb" />
                  <h3>{city}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-muted">
          <div className="promiseContainer">
            <div className="promiseBadge">onthewater promise</div>

            <div className="promisePanel">
              <div className="trust-grid">
                {TRUST_ITEMS.map((item) => (
                  <article key={item.title} className="trust-card">
                    <span className="trustIcon">◌</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section section-padded boatTypesSection">
          <div className="boatTypesContainer">
            <div className="boatTypesTitleWrap">
              <h2>Тип судна</h2>
            </div>

            <div className="boatTypesGrid">
              {BOAT_TYPES.map((item, index) => (
                <article
                  key={item.title}
                  className={`boatTypeCard boatTypeCard${index + 1} ${item.size === 'wide' ? 'boatTypeCardWide' : ''}`}
                >
                  <div className="boatTypeThumb" />
                  <h3>{item.title}</h3>
                </article>
              ))}
            </div>

            <div className="boatTypesNav">
              <button className="navCircle" aria-label="Назад">‹</button>
              <button className="navCircle" aria-label="Вперёд">›</button>
            </div>
            <div className="boatTypesDecor" aria-hidden />
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
