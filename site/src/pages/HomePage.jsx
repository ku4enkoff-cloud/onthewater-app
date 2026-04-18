import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'
import heroImg from '../../images/app/hero.webp'
import DestinationsSection from '../components/DestinationsSection.jsx'
import PopularBoats from '../components/PopularBoats.jsx'
import { SITE_MAIN_URL } from '../config'
import { useHomePageSeo } from '../seo/useHomePageSeo.js'
import { fetchDestinations } from '../api/destinations.js'
import { LOCATION_OPTIONS, readNearestCityFromStorage } from '../boatSearchUtils.js'

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
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const userEditedCityRef = useRef(false)
  const [cityQuery, setCityQuery] = useState(() => readNearestCityFromStorage() || '')
  const [knownCities, setKnownCities] = useState([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
      if (!searchRef.current) return
      if (!searchRef.current.contains(e.target)) setSuggestOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
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

  return (
    <main className="lp">
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
            <a href={SITE_MAIN_URL} className="lp-linkMuted" target="_blank" rel="noopener noreferrer">
              Разместить объявление
            </a>
            <a href={SITE_MAIN_URL} className="lp-btnGhost" target="_blank" rel="noopener noreferrer">
              Регистрация
            </a>
            <a href={SITE_MAIN_URL} className="lp-btnGhost" target="_blank" rel="noopener noreferrer">
              Вход
            </a>
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
                <a
                  href={SITE_MAIN_URL}
                  className="lp-mobileNavMuted"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileNav}
                >
                  Разместить объявление
                </a>
                <div className="lp-mobileNavBtns">
                  <a
                    href={SITE_MAIN_URL}
                    className="lp-btnGhost lp-btnGhost--block lp-mobileNavBtnPrimary"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMobileNav}
                  >
                    Регистрация
                  </a>
                  <a
                    href={SITE_MAIN_URL}
                    className="lp-btnGhost lp-btnGhost--block lp-mobileNavBtnSecondary"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMobileNav}
                  >
                    Вход
                  </a>
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
          <p className="lp-heroSub">
            Найдите и забронируйте судно для любого случая — с капитаном или без.
          </p>

          <div className="lp-searchBar lp-searchBar--pill" role="search" ref={searchRef}>
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
              <label className="lp-srOnly" htmlFor="where">
                Куда
              </label>
              <input
                id="where"
                type="text"
                placeholder="Куда хотите выйти на воду?"
                className="lp-searchInput"
                autoComplete="off"
                value={cityQuery}
                onChange={(e) => {
                  userEditedCityRef.current = true
                  setCityQuery(e.target.value)
                  setSuggestOpen(true)
                  setActiveIdx(-1)
                }}
                onFocus={() => setSuggestOpen(true)}
                onKeyDown={handleInputKeyDown}
                aria-expanded={suggestOpen && suggestions.length > 0}
                aria-controls="lp-city-suggest"
              />
              {suggestOpen && suggestions.length > 0 ? (
                <div className="lp-citySuggest" id="lp-city-suggest" role="listbox" aria-label="Подсказки городов">
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
            <button
              type="button"
              className="lp-searchBtn lp-searchBtn--pill"
              onClick={() => submitSearch(cityQuery)}
            >
              Найти
            </button>
          </div>
        </div>
      </section>

      <DestinationsSection />

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
            Разместить объявление
          </a>
        </div>
      </section>

    </main>
  )
}
