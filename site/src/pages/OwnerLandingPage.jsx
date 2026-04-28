import { useState } from 'react'
import { Link } from 'react-router-dom'
import googlePlayIcon from '../assets/icon-g-p.webp'
import appleStoreIcon from '../assets/icon-a-s.webp'
import { useAuth } from '../context/AuthContext'

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function OwnerLandingPage() {
  const { user, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <main className="owner-page">
      <header className="lp-header owner-page__header">
        <div className="lp-headerTop">
          <Link to="/" className="lp-logo" aria-label="ONTHEWATER" onClick={closeMobileNav}>
            <span className="lp-logoIcon" aria-hidden>
              <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
                <circle cx="20" cy="20" r="19" fill="#0061C1" />
                <path d="M8 22c3-4 7-6 12-6s9 2 12 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M10 26c2.5-2 5.5-3 10-3s7.5 1 10 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" fill="none" />
              </svg>
            </span>
            <span className="lp-logoText">onthewater</span>
          </Link>

          <button
            type="button"
            className="lp-navToggle"
            aria-expanded={mobileNavOpen}
            aria-controls="owner-mobile-menu"
            aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        <nav className="lp-nav lp-navDesktop" aria-label="Основное меню">
          <Link to="/boats">Катера</Link>
          <Link to="/#how">Как это работает</Link>
          <Link to="/#contact">Контакты</Link>
        </nav>

        <div className="lp-headerActions lp-headerActionsDesktop">
          {user ? (
            <>
              <Link to="/account" className="lp-btnGhost authMenuBtn">
                Личный кабинет
              </Link>
              <button type="button" className="lp-btnGhost authMenuBtn authMenuBtn--action" onClick={logout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="lp-btnGhost authMenuBtn">
                Регистрация
              </Link>
              <Link to="/login" className="lp-btnGhost authMenuBtn">
                Вход
              </Link>
            </>
          )}
        </div>

        {mobileNavOpen ? (
          <button type="button" className="lp-navBackdrop" aria-label="Закрыть меню" onClick={closeMobileNav} />
        ) : null}

        <div
          id="owner-mobile-menu"
          className={`lp-mobileNav${mobileNavOpen ? ' lp-mobileNav--open' : ''}`}
          aria-hidden={!mobileNavOpen}
        >
          <div className="lp-mobileNavInner">
            <p className="lp-mobileNavEyebrow">Разделы</p>
            <nav className="lp-mobileNavLinks" aria-label="Меню (мобильная версия)">
              <Link to="/boats" onClick={closeMobileNav}>
                Катера
              </Link>
              <Link to="/#how" onClick={closeMobileNav}>
                Как это работает
              </Link>
              <Link to="/#contact" onClick={closeMobileNav}>
                Контакты
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="owner-page__hero">
        <div className="owner-page__card">
          <h1 className="owner-page__title">Разместить объявление</h1>
          <p className="owner-page__text">
            Чтобы размещать объявления о сдаче судна, скачайте мобильное приложение для владельцев ONTHEWATER.
          </p>
          <div className="owner-page__stores" aria-label="Скачать приложение для владельцев">
            <span className="owner-page__store owner-page__store--apple" aria-disabled="true">
              <img src={appleStoreIcon} alt="App Store (скоро)" className="owner-page__storeImg" />
            </span>
            <a
              href="https://play.google.com/store/apps/details?id=com.anonymous.onthewater.owner"
              className="owner-page__store owner-page__store--google"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Скачать приложение для владельцев в Google Play"
            >
              <img src={googlePlayIcon} alt="Google Play" className="owner-page__storeImg" />
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
