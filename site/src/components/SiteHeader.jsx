import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/site-header.css'

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19.5c.8-3.2 3.2-5 6.5-5s5.7 1.8 6.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function SiteHeader() {
  const { user, logout } = useAuth()
  const accountMenuRef = useRef(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const closeMobileNav = () => setMobileNavOpen(false)
  const closeAccountMenu = () => setAccountMenuOpen(false)

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  useEffect(() => {
    if (!accountMenuOpen) return undefined
    const onDown = (e) => {
      if (!accountMenuRef.current?.contains(e.target)) setAccountMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountMenuOpen])

  return (
    <header className="pm-header">
      <div className="pm-header__inner">
        <Link to="/" className="pm-brand" aria-label="ONTHEWATER — на главную" onClick={closeMobileNav}>
          <span className="pm-brand__name">ONTHEWATER</span>
          <span className="pm-brand__tag">Аренда водной техники</span>
        </Link>

        <nav className="pm-nav" aria-label="Основное меню">
          <Link to="/boats">Катера</Link>
          <Link to="/#destinations">Направления</Link>
          <Link to="/#categories">Тарифы</Link>
          <Link to="/#how">О нас</Link>
        </nav>

        <div className="pm-header__actions">
          <Link to="/owners" className="pm-btnOwner">
            Разместите объявление
          </Link>
          <div className="pm-account" ref={accountMenuRef}>
            <button
              type="button"
              className={`pm-accountBtn${accountMenuOpen ? ' is-open' : ''}`}
              aria-label={user ? 'Аккаунт' : 'Вход и регистрация'}
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              onClick={() => setAccountMenuOpen((o) => !o)}
            >
              <UserIcon />
            </button>
            {accountMenuOpen ? (
              <div className="pm-accountMenu" role="menu">
                {user ? (
                  <>
                    <Link to="/account" role="menuitem" className="pm-accountMenu__item" onClick={closeAccountMenu}>
                      Кабинет
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="pm-accountMenu__item"
                      onClick={() => {
                        logout()
                        closeAccountMenu()
                      }}
                    >
                      Выйти
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" role="menuitem" className="pm-accountMenu__item" onClick={closeAccountMenu}>
                      Войти
                    </Link>
                    <Link to="/register" role="menuitem" className="pm-accountMenu__item" onClick={closeAccountMenu}>
                      Регистрация
                    </Link>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="pm-navToggle"
          aria-expanded={mobileNavOpen}
          aria-controls="pm-mobile-menu"
          aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
          onClick={() => setMobileNavOpen((o) => !o)}
        >
          {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {mobileNavOpen ? (
        <button type="button" className="pm-navBackdrop" aria-label="Закрыть меню" onClick={closeMobileNav} />
      ) : null}

      <div
        id="pm-mobile-menu"
        className={`pm-mobileNav${mobileNavOpen ? ' pm-mobileNav--open' : ''}`}
        aria-hidden={!mobileNavOpen}
      >
        <Link to="/" className="pm-brand__name" onClick={closeMobileNav}>
          ONTHEWATER
        </Link>
        <nav className="pm-mobileNav__links" aria-label="Меню (мобильная версия)">
          <Link to="/boats" onClick={closeMobileNav}>
            Катера
          </Link>
          <Link to="/#destinations" onClick={closeMobileNav}>
            Направления
          </Link>
          <Link to="/#categories" onClick={closeMobileNav}>
            Тарифы
          </Link>
          <Link to="/#how" onClick={closeMobileNav}>
            О нас
          </Link>
        </nav>
        <div className="pm-mobileNav__actions">
          <Link to="/owners" className="pm-btnOwner" onClick={closeMobileNav}>
            Разместите объявление
          </Link>
          {user ? (
            <>
              <Link to="/account" className="pm-btnLogin" onClick={closeMobileNav}>
                Личный кабинет
              </Link>
              <button
                type="button"
                className="pm-btnGhost"
                onClick={() => {
                  logout()
                  closeMobileNav()
                }}
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="pm-btnGhost" onClick={closeMobileNav}>
                Регистрация
              </Link>
              <Link to="/login" className="pm-btnLogin" onClick={closeMobileNav}>
                Войти
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
