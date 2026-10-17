import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/precision-home.css'
import DestinationsSection from '../components/DestinationsSection.jsx'
import PopularBoats from '../components/PopularBoats.jsx'
import HomeCategoriesSection from '../components/HomeCategoriesSection.jsx'
import { useHomePageSeo } from '../seo/useHomePageSeo.js'
import { fetchDestinations } from '../api/destinations.js'
import { LOCATION_OPTIONS, readNearestCityFromStorage } from '../boatSearchUtils.js'
import heroImg from '../assets/hero-aerial-boat.webp'
import appPhoneList from '../assets/app-phone-list.webp'
import appPhoneMap from '../assets/app-phone-map.webp'
import googlePlayIcon from '../assets/stores/google-play-icon.webp'
import NearbyBoatsSection from '../components/NearbyBoatsSection.jsx'
import HomeDateCalendar from '../components/HomeDateCalendar.jsx'
import { CLIENT_ANDROID_PLAY_URL, CLIENT_IOS_APP_STORE_URL } from '../constants/appStores'

const HOW_STEPS = [
  {
    num: '01',
    title: 'Выберите катер',
    text: 'Сравните суда по району, цене за час и наличию капитана.',
  },
  {
    num: '02',
    title: 'Забронируйте',
    text: 'Выберите дату и время, оплатите онлайн и получите подтверждение.',
  },
  {
    num: '03',
    title: 'Получите инструктаж',
    text: 'Владелец или капитан расскажет правила выхода и маршрут.',
  },
  {
    num: '04',
    title: 'Выходите на воду',
    text: 'Наслаждайтесь поездкой — поддержка Onthewater рядом.',
  },
]

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronIcon({ up = false }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const CITY_REGION_HINT = {
  Москва: 'Центральная Россия',
  'Московская область': 'Центральная Россия',
  'Санкт-Петербург': 'Северо-Запад',
  'Ленинградская область': 'Северо-Запад',
  Сочи: 'Краснодарский край',
  Крым: 'Юг России',
  Казань: 'Поволжье',
}

function regionHintFor(city) {
  return CITY_REGION_HINT[city] || 'Россия'
}

function formatDateRu(iso) {
  if (!iso) return 'Любая дата'
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return 'Любая дата'
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function HomePage() {
  useHomePageSeo(heroImg)
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const cityFilterRef = useRef(null)
  const userEditedCityRef = useRef(false)
  const [cityQuery, setCityQuery] = useState(() => readNearestCityFromStorage() || '')
  const [dateStr, setDateStr] = useState('')
  const [knownCities, setKnownCities] = useState([])
  const [cityOpen, setCityOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [cityFilter, setCityFilter] = useState('')
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
      if (!searchRef.current?.contains(e.target)) {
        setCityOpen(false)
        setDateOpen(false)
        setCityFilter('')
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setCityOpen(false)
        setDateOpen(false)
        setCityFilter('')
      }
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!cityOpen) return undefined
    const t = setTimeout(() => cityFilterRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [cityOpen])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault()
        setCityOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  const cityOptions = useMemo(() => {
    const base =
      knownCities.length > 0
        ? knownCities
        : LOCATION_OPTIONS.map((o) => o.value).filter((v) => v && v !== '__all')
    const q = cityFilter.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (c) => c.toLowerCase().includes(q) || regionHintFor(c).toLowerCase().includes(q),
    )
  }, [knownCities, cityFilter])

  const submitSearch = (rawCity) => {
    const value = String(rawCity ?? cityQuery).trim()
    const params = new URLSearchParams()
    if (value) params.set('city', value)
    if (dateStr) params.set('date', dateStr)
    const qs = params.toString()
    navigate(qs ? `/boats?${qs}` : '/boats')
  }

  const pickCity = (city) => {
    userEditedCityRef.current = true
    setCityQuery(city)
    setCityOpen(false)
    setCityFilter('')
  }

  return (
    <main className="pm">
      <section className="pm-hero">
        <div className="pm-hero__bg" aria-hidden="true">
          <img src={heroImg} alt="" decoding="async" width="1920" height="1080" fetchPriority="high" />
        </div>
        <div className="pm-container pm-hero__grid">
          <div className="pm-hero__copy">
            <h1 className="pm-hero__title">ONTHEWATER</h1>
            <p className="pm-hero__subtitle">Аренда катеров</p>
            <p className="pm-hero__lead">
              Точные маршруты, чистая вода и умное бронирование. Найдите катер с капитаном или без — цена видна сразу.
            </p>

            <form
              className="pm-search"
              role="search"
              ref={searchRef}
              onSubmit={(e) => {
                e.preventDefault()
                submitSearch(cityQuery)
              }}
            >
              <div className="pm-search__pill">
                <button
                  type="button"
                  className={`pm-search__seg pm-search__seg--where${cityOpen ? ' is-active' : ''}`}
                  aria-haspopup="listbox"
                  aria-expanded={cityOpen}
                  onClick={() => {
                    setCityOpen((o) => !o)
                    setDateOpen(false)
                  }}
                >
                  <span className="pm-search__segIcon" aria-hidden>
                    <PinIcon />
                  </span>
                  <span className="pm-search__segText">
                    <span className="pm-search__segLabel">Где</span>
                    <span className="pm-search__segValue">{cityQuery || 'Любой город'}</span>
                  </span>
                </button>

                <span className="pm-search__divider" aria-hidden />

                <button
                  type="button"
                  className={`pm-search__seg pm-search__seg--when${dateOpen ? ' is-active' : ''}`}
                  aria-haspopup="dialog"
                  aria-expanded={dateOpen}
                  onClick={() => {
                    setDateOpen((o) => !o)
                    setCityOpen(false)
                    setCityFilter('')
                  }}
                >
                  <span className="pm-search__segIcon" aria-hidden>
                    <CalendarIcon />
                  </span>
                  <span className="pm-search__segText">
                    <span className="pm-search__segLabel">Когда</span>
                    <span className="pm-search__segValue">{formatDateRu(dateStr)}</span>
                  </span>
                  <span className="pm-search__segChev" aria-hidden>
                    <ChevronIcon />
                  </span>
                </button>
              </div>

              {dateOpen ? (
                <div className="pm-calWrap">
                  <HomeDateCalendar
                    value={dateStr}
                    minDate={todayISO()}
                    onChange={setDateStr}
                    onClose={() => setDateOpen(false)}
                  />
                </div>
              ) : null}

              {cityOpen ? (
                <div className="pm-cityPanel" role="listbox" aria-label="Выбор города">
                  <div className="pm-cityPanel__search">
                    <span className="pm-cityPanel__searchIcon" aria-hidden>
                      <SearchIcon />
                    </span>
                    <input
                      ref={cityFilterRef}
                      className="pm-cityPanel__searchInput"
                      type="text"
                      placeholder="Поиск города…"
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setCityOpen(false)
                          setCityFilter('')
                        }
                      }}
                    />
                    <kbd className="pm-cityPanel__kbd">⌘ K</kbd>
                  </div>

                  <ul className="pm-cityPanel__list">
                    <li role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={!cityQuery}
                        className={`pm-cityPanel__item${!cityQuery ? ' is-selected' : ''}`}
                        onClick={() => pickCity('')}
                      >
                        <span className="pm-cityPanel__pin" aria-hidden>
                          <PinIcon />
                        </span>
                        <span className="pm-cityPanel__copy">
                          <span className="pm-cityPanel__name">Любой город</span>
                          <span className="pm-cityPanel__region">Все регионы</span>
                        </span>
                        {!cityQuery ? (
                          <span className="pm-cityPanel__check" aria-hidden>
                            <CheckIcon />
                          </span>
                        ) : null}
                      </button>
                    </li>
                    {cityOptions.map((city) => {
                      const selected = city === cityQuery
                      return (
                        <li key={city} role="presentation">
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`pm-cityPanel__item${selected ? ' is-selected' : ''}`}
                            onClick={() => pickCity(city)}
                          >
                            <span className="pm-cityPanel__pin" aria-hidden>
                              <PinIcon />
                            </span>
                            <span className="pm-cityPanel__copy">
                              <span className="pm-cityPanel__name">{city}</span>
                              <span className="pm-cityPanel__region">{regionHintFor(city)}</span>
                            </span>
                            {selected ? (
                              <span className="pm-cityPanel__check" aria-hidden>
                                <CheckIcon />
                              </span>
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {!cityFilter.trim() ? (
                    <p className="pm-cityPanel__foot">Популярные направления</p>
                  ) : null}
                </div>
              ) : null}

              <button type="submit" className="pm-search__submit">
                Найти катер <ArrowIcon />
              </button>
            </form>
          </div>
        </div>
      </section>

      <NearbyBoatsSection />
      <DestinationsSection variant="precision" />
      <PopularBoats variant="precision" />
      <HomeCategoriesSection variant="precision" />

      <section className="pm-section" id="how">
        <div className="pm-container">
          <div className="pm-sectionHead">
            <h2 className="pm-sectionTitle">Как это работает</h2>
          </div>
          <div className="pm-howGrid">
            {HOW_STEPS.map((step) => (
              <article key={step.num} className="pm-howStep">
                <div className="pm-howStep__num">{step.num}</div>
                <h3 className="pm-howStep__title">{step.title}</h3>
                <p className="pm-howStep__text">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pm-app" id="app" aria-label="Мобильное приложение ONTHEWATER">
        <div className="pm-container pm-app__panel">
          <div className="pm-app__copy">
            <p className="pm-app__eyebrow">Приложение</p>
            <h2 className="pm-app__title">Вся прогулка — в вашем телефоне</h2>
            <p className="pm-app__text">
              Ищите катера на карте, общайтесь с владельцем и управляйте бронированием в приложении
              ONTHEWATER.
            </p>
            <ul className="pm-app__features">
              <li>Поиск катеров списком и на карте</li>
              <li>Бронирование и избранное под рукой</li>
            </ul>
            <div className="pm-app__stores" aria-label="Скачать клиентское приложение">
              <a
                href={CLIENT_IOS_APP_STORE_URL}
                className="pm-app__badge"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Скачать ONTHEWATER в App Store"
              >
                <svg className="pm-app__badgeIcon" width="22" height="26" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3.1-1.6-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.4zM14.7 6.5c.6-.8 1.1-1.8.9-2.9-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-.9 2.8 1.1.1 2.1-.5 2.8-1.4z"
                  />
                </svg>
                <span className="pm-app__badgeText">
                  <span className="pm-app__badgeEyebrow">Загрузите в</span>
                  <span className="pm-app__badgeName">App Store</span>
                </span>
              </a>
              <a
                href={CLIENT_ANDROID_PLAY_URL}
                className="pm-app__badge"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Скачать ONTHEWATER в Google Play"
              >
                <img
                  className="pm-app__badgeIcon pm-app__badgeIcon--play"
                  src={googlePlayIcon}
                  alt=""
                  width="22"
                  height="22"
                  aria-hidden
                />
                <span className="pm-app__badgeText">
                  <span className="pm-app__badgeEyebrow">Доступно в</span>
                  <span className="pm-app__badgeName">Google Play</span>
                </span>
              </a>
            </div>
          </div>
          <div className="pm-app__phones" aria-label="Скриншоты приложения ONTHEWATER">
            <figure className="pm-app__device">
              <img
                className="pm-app__phoneImg"
                src={appPhoneList}
                alt="Список катеров в приложении"
                width="600"
                height="1230"
                sizes="(max-width: 720px) 45vw, 300px"
                loading="lazy"
                decoding="async"
              />
            </figure>
            <figure className="pm-app__device">
              <img
                className="pm-app__phoneImg"
                src={appPhoneMap}
                alt="Карта катеров в приложении"
                width="600"
                height="1230"
                sizes="(max-width: 720px) 45vw, 300px"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </div>
      </section>
    </main>
  )
}
