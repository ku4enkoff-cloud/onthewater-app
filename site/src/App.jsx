import './App.css'

function App() {
  return (
    <div className="page">
      <header className="header">
        <div className="logo">ONTHEWATER</div>
        <nav className="nav">
          <a href="#">Катера</a>
          <a href="#">Как это работает</a>
          <a href="#">Для владельцев</a>
        </nav>
        <div className="auth">
          <button className="btn ghost">Войти</button>
          <button className="btn primary">Зарегистрироваться</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-text">
            <h1>Аренда катеров и яхт на день и час</h1>
            <p>
              Выбирайте проверенные суда с капитаном или без, бронируйте онлайн и получайте
              мгновенное подтверждение.
            </p>
            <div className="hero-actions">
              <input
                className="input city"
                placeholder="Куда вы хотите выйти на воду?"
              />
              <button className="btn primary">Найти катер</button>
            </div>
          </div>
          <div className="hero-card">
            <div className="hero-card-photo" />
            <div className="hero-card-body">
              <div className="hero-card-title">Популярные катера в Сочи</div>
              <div className="hero-card-meta">Более 120 вариантов • рейтинг 4.9</div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>Популярные направления</h2>
          <div className="grid">
            <div className="card skeleton" />
            <div className="card skeleton" />
            <div className="card skeleton" />
            <div className="card skeleton" />
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} ONTHEWATER</span>
        <a href="#">Политика конфиденциальности</a>
      </footer>
    </div>
  )
}

export default App
