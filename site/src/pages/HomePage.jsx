import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import heroImg from '../../images/app/hero.webp'
import DestinationsSection from '../components/DestinationsSection.jsx'
import PopularBoats from '../components/PopularBoats.jsx'
import HomeCategoriesSection from '../components/HomeCategoriesSection.jsx'
import googlePlayIcon from '../assets/icon-g-p.webp'
import appleStoreIcon from '../assets/icon-a-s.webp'
import { useHomePageSeo } from '../seo/useHomePageSeo.js'
import { fetchDestinations } from '../api/destinations.js'
import { LOCATION_OPTIONS, readNearestCityFromStorage } from '../boatSearchUtils.js'
import { useAuth } from '../context/AuthContext.jsx'

const HOW_STEPS = [
  {
    icon: 'shield',
    title: 'Защита вашей поездки',
    text: 'Если планы изменились из-за погоды или форс-мажора, мы поможем оформить возврат по правилам сервиса.',
  },
  {
    icon: 'check',
    title: 'Проверенные катера',
    text: 'Каждое судно проходит модерацию: состояние, безопасность, чистота и соответствие описанию.',
  },
  {
    icon: 'lock',
    title: 'Безопасная оплата',
    text: 'Оплачивайте онлайн через защищенный процессинг, а подтверждение бронирования получайте в одном месте.',
  },
  {
    icon: 'lifebuoy',
    title: 'Поддержка на каждом этапе',
    text: 'Команда ONTHEWATER подскажет по маршруту, правилам выхода и поможет в нестандартной ситуации.',
  },
]

function HowIcon({ kind }) {
  if (kind === 'shield') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3l7 3v6c0 5-3.6 8.5-7 9.8C8.6 20.5 5 17 5 12V6l7-3z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }
  if (kind === 'check') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 12l2.6 2.6L16 9.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'lock') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 10V8a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

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

export default function HomePage() {
  useHomePageSeo(heroImg)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const stickySearchRef = useRef(null)
  const userEditedCityRef = useRef(false)
  const [cityQuery, setCityQuery] = useState(() => readNearestCityFromStorage() || '')
  const [knownCities, setKnownCities] = useState([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [searchSurface, setSearchSurface] = useState('hero')
  const [activeIdx, setActiveIdx] = useState(-1)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [showStickyHeader, setShowStickyHeader] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const rows = await fetchDestinations()
        const apiCities = rows.map((d) => String(d?.name || '').trim()).filter(Boolean)
        const fallbackCities = LOCATION_OPTIONS.map((o) => String(o?.value || '').trim()).filter(
          (v) => v && v !== '__all',
        )
        const uniq = [...new Set([...apiCities, ...fallbackCities])]
        if (!cancelled) setKnownCities(uniq)
      } catch {
        const fallbackCities = LOCATION_OPTIONS.map((o) => String(o?.value || '').trim()).filter(
          (v) => v && v !== '__all',
        )
        if (!cancelled) setKnownCities([...new Set(fallbackCities)])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onDown = (e) => {
      const inHero = searchRef.current?.contains(e.target)
      const inSticky = stickySearchRef.current?.contains(e.target)
      if (!inHero && !inSticky) setSuggestOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 260
      setShowStickyHeader(next)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  const closeMobileNav = () => setMobileNavOpen(false)

  useEffect(() => {
    const onNearest = (e) => {
      const city = e.detail?.city
      if (!city || !LOCATION_OPTIONS.some((o) => o.value === city)) return
      if (userEditedCityRef.current) return
      setCityQuery(city)
    }
    window.addEventListener('boatrent:nearest-city', onNearest)
    return () => window.removeEventListener('boatrent:nearest-city', onNearest)
  }, [])

  const suggestions = useMemo(() => {
    const q = cityQuery.trim().toLowerCase()
    if (!q) return knownCities.slice(0, 8)
    return knownCities.filter((c) => c.toLowerCase().includes(q)).slice(0, 8)
  }, [cityQuery, knownCities])

  const submitSearch = (raw) => {
    const value = String(raw || '').trim()
    if (!value) {
      navigate('/boats')
      return
    }
    navigate(`/boats?city=${encodeURIComponent(value)}`)
  }

  const pickSuggestion = (city) => {
    userEditedCityRef.current = true
    setCityQuery(city)
    setSuggestOpen(false)
    setActiveIdx(-1)
    submitSearch(city)
  }

  const handleInputKeyDown = (e) => {
    if (!suggestOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        submitSearch(cityQuery)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1 >= suggestions.length ? 0 : i + 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
      return
    }
    if (e.key === 'Escape') {
      setSuggestOpen(false)
      setActiveIdx(-1)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        pickSuggestion(suggestions[activeIdx])
      } else {
        submitSearch(cityQuery)
      }
    }
  }

  const renderSearchBar = (mode) => (
    <div
      className={`lp-searchBar lp-searchBar--pill${mode === 'sticky' ? ' lp-searchBar--sticky' : ''}`}
      role="search"
      ref={mode === 'sticky' ? stickySearchRef : searchRef}
    >
      <div className="lp-searchField lp-searchField--pill lp-searchField--suggest">
        <span className="lp-searchPin" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="11" r="2.25" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        </span>
        <label className="lp-srOnly" htmlFor={mode === 'sticky' ? 'where-sticky' : 'where'}>
          Куда
        </label>
        <input
          id={mode === 'sticky' ? 'where-sticky' : 'where'}
          type="text"
          placeholder="Куда хотите выйти на воду?"
          className="lp-searchInput"
          autoComplete="off"
          value={cityQuery}
          onChange={(e) => {
            userEditedCityRef.current = true
            setCityQuery(e.target.value)
            setSearchSurface(mode)
            setSuggestOpen(true)
            setActiveIdx(-1)
          }}
          onFocus={() => {
            setSearchSurface(mode)
            setSuggestOpen(true)
          }}
          onKeyDown={handleInputKeyDown}
          aria-expanded={suggestOpen && searchSurface === mode && suggestions.length > 0}
        />
        {suggestOpen && (searchSurface === mode || (mode === 'sticky' && showStickyHeader)) && suggestions.length > 0 ? (
          <div className="lp-citySuggest" role="listbox" aria-label="Подсказки городов">
            {suggestions.map((city, idx) => (
              <button
                key={city}
                type="button"
                className={`lp-citySuggest__item${idx === activeIdx ? ' lp-citySuggest__item--active' : ''}`}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => pickSuggestion(city)}
              >
                {city}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button type="button" className="lp-searchBtn lp-searchBtn--pill" onClick={() => submitSearch(cityQuery)}>
        Найти
      </button>
    </div>
  )

  return (
    <main className="lp">
      <header className={`lp-stickySearch${showStickyHeader ? ' lp-stickySearch--show' : ''}`} aria-hidden={!showStickyHeader}>
        <div className="lp-stickySearch__inner">
          <Link to="/" className="lp-logo lp-logo--sticky" aria-label="ONTHEWATER">
            <span className="lp-logoIcon" aria-hidden>
              <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
                <circle cx="20" cy="20" r="19" fill="#0061C1" />
                <path d="M8 22c3-4 7-6 12-6s9 2 12 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
              </svg>
            </span>
            <span className="lp-logoText">onthewater</span>
          </Link>
          {renderSearchBar('sticky')}
        </div>
      </header>

      <section className="lp-heroWrap">
        <div className="lp-heroBg" style={{ backgroundImage: `url(${heroImg})` }} aria-hidden />
        <div className="lp-heroTint" aria-hidden />

        <header className="lp-header">
          <div className="lp-headerTop">
            <Link to="/" className="lp-logo" aria-label="ONTHEWATER" onClick={closeMobileNav}>
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

            <button
              type="button"
              className="lp-navToggle"
              aria-expanded={mobileNavOpen}
              aria-controls="lp-mobile-menu"
              aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>

          <nav className="lp-nav lp-navDesktop" aria-label="Основное меню">
            <Link to="/boats">Катера</Link>
            <a href="#how">Как это работает</a>
            <a href="#destinations">Направления</a>
            <a href="#contact">Контакты</a>
          </nav>

          <div className="lp-headerActions lp-headerActionsDesktop">
            <Link to="/owners" className="lp-linkMuted">
              Разместить объявление
            </Link>
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
            <button
              type="button"
              className="lp-navBackdrop"
              aria-label="Закрыть меню"
              onClick={closeMobileNav}
            />
          ) : null}

          <div
            id="lp-mobile-menu"
            className={`lp-mobileNav${mobileNavOpen ? ' lp-mobileNav--open' : ''}`}
            aria-hidden={!mobileNavOpen}
          >
            <div className="lp-mobileNavInner">
              <p className="lp-mobileNavEyebrow">Разделы</p>
              <nav className="lp-mobileNavLinks" aria-label="Меню (мобильная версия)">
                <Link to="/boats" onClick={closeMobileNav}>
                  Катера
                </Link>
                <a href="#how" onClick={closeMobileNav}>
                  Как это работает
                </a>
                <a href="#destinations" onClick={closeMobileNav}>
                  Направления
                </a>
                <a href="#contact" onClick={closeMobileNav}>
                  Контакты
                </a>
              </nav>
              <div className="lp-mobileNavActions">
                <Link to="/owners" className="lp-mobileNavMuted" onClick={closeMobileNav}>
                  Разместить объявление
                </Link>
                <div className="lp-mobileNavBtns">
                  {user ? (
                    <>
                      <Link
                        to="/account"
                        className="lp-btnGhost lp-btnGhost--block lp-mobileNavBtnPrimary authMenuBtn"
                        onClick={closeMobileNav}
                      >
                        Личный кабинет
                      </Link>
                      <button
                        type="button"
                        className="lp-btnGhost lp-btnGhost--block lp-mobileNavBtnSecondary authMenuBtn authMenuBtn--action"
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
                      <Link
                        to="/register"
                        className="lp-btnGhost lp-btnGhost--block lp-mobileNavBtnPrimary authMenuBtn"
                        onClick={closeMobileNav}
                      >
                        Регистрация
                      </Link>
                      <Link
                        to="/login"
                        className="lp-btnGhost lp-btnGhost--block lp-mobileNavBtnSecondary authMenuBtn"
                        onClick={closeMobileNav}
                      >
                        Вход
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="lp-heroContent">
          <h1 className="lp-heroTitle">
            Арендуйте идеальный катер
            <br />
            для вашего отдыха
          </h1>

          {renderSearchBar('hero')}
        </div>
      </section>

      <DestinationsSection />

      <PopularBoats />
      <HomeCategoriesSection />

      <section className="lp-section lp-how" id="how">
        <div className="lp-container">
          <div className="lp-howBadge">
            <span className="lp-howBadge__accent">on</span>thewater
          </div>
          <div className="lp-howCard">
            <h2 className="lp-howTitle">Как это работает</h2>
            <div className="lp-howRow">
            {HOW_STEPS.map((step) => (
              <div key={step.title} className="lp-howStep">
                <div className="lp-howIconWrap">
                  <HowIcon kind={step.icon} />
                </div>
                <h3 className="lp-howStepTitle">{step.title}</h3>
                <p className="lp-howStepText">{step.text}</p>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-cta" id="contact">
        <div className="lp-ctaBg" aria-hidden />
        <div className="lp-ctaInner">
          <h2 className="lp-ctaTitle">Владеете катером? Зарабатывайте</h2>
          <p className="lp-ctaSub">Сдавайте судно в аренду через ONTHEWATER.</p>
          <div className="lp-ctaStores" aria-label="Скачать приложение ONTHEWATER">
            <span className="lp-ctaStoreBadge lp-ctaStoreBadge--apple" aria-disabled="true">
              <img src={appleStoreIcon} alt="App Store (скоро)" className="lp-ctaStoreBadge__img" />
            </span>
            <a
              href="https://play.google.com/store/apps/details?id=com.anonymous.onthewater.owner"
              className="lp-ctaStoreBadge lp-ctaStoreBadge--google"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Скачать приложение в Google Play"
            >
              <img src={googlePlayIcon} alt="Google Play" className="lp-ctaStoreBadge__img" />
            </a>
          </div>
        </div>
      </section>

    </main>
  )
}
