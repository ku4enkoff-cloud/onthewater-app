import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchBoatTypes, fetchBoatsSearch } from '../api/boats'
import { SITE_MAIN_URL, YANDEX_MAPS_API_KEY, getPhotoUrl } from '../config'
import {
  CITY_COORDS,
  DEFAULT_FILTERS,
  DEFAULT_MAP_CENTER,
  LOCATION_OPTIONS,
  computeBoatTypesFromList,
  computeDurationOptions,
  computeMaxPassengers,
  computePriceRange,
  countActiveFilters,
  filterBoatsByScheduleOnDate,
  filterBoatsList,
  formatDurationListLabel,
  formatGuestsQuickLabel,
  formatPriceShort,
  isRegion,
  readNearestCityFromStorage,
} from '../boatSearchUtils'
import BoatResultCard from '../components/search/BoatResultCard.jsx'
import FilterQuickDropdown from '../components/search/FilterQuickDropdown.jsx'
import FiltersModal from '../components/search/FiltersModal.jsx'
import YandexBoatsMap from '../components/search/YandexBoatsMap.jsx'
import BookingCalendarModal, { formatBookingDateDots } from '../components/booking/BookingCalendarModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function readInitialLocationKey() {
  try {
    const params = new URLSearchParams(window.location.search)
    const c = params.get('city')?.trim()
    if (c) return c
  } catch {
    /* ignore */
  }
  return readNearestCityFromStorage() || 'Москва'
}

function ChevronDownIcon() {
  return (
    <svg className="bs-quickChip__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function ClearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SearchBarPinIcon() {
  return (
    <svg className="bs-searchBar__iconPin" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z"
        fill="#ec4899"
        stroke="#db2777"
        strokeWidth="1"
      />
      <circle cx="12" cy="11" r="2.25" fill="#fff" />
    </svg>
  )
}

function SearchBarCalendarIcon() {
  return (
    <svg className="bs-searchBar__iconCal" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="#6366f1" strokeWidth="1.75" fill="#eef2ff" />
      <path d="M3 9.5h18" stroke="#6366f1" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1.5" fill="#3b82f6" />
    </svg>
  )
}

function SearchBarSelectChevron() {
  return (
    <svg className="bs-searchBar__selectChevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function BoatsSearchPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [searchParams] = useSearchParams()
  const cityFromUrl = searchParams.get('city')?.trim() || ''

  const [locationKey, setLocationKey] = useState(readInitialLocationKey)
  const [dateStr, setDateStr] = useState(todayISO)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [allBoats, setAllBoats] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [mapVisible, setMapVisible] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1025px)').matches : true,
  )
  const [searchOnMove, setSearchOnMove] = useState(false)
  const [selectedBoatId, setSelectedBoatId] = useState(null)
  const [mapPickCandidates, setMapPickCandidates] = useState(null)
  const [apiTypes, setApiTypes] = useState([])
  const [filtersModalOpen, setFiltersModalOpen] = useState(false)
  const [filtersModalKey, setFiltersModalKey] = useState(0)
  const [filtersModalFocus, setFiltersModalFocus] = useState(null)
  const [filterDropdown, setFilterDropdown] = useState(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const priceFilterAnchorRef = useRef(null)
  const guestsFilterAnchorRef = useRef(null)
  const durationFilterAnchorRef = useRef(null)
  const captainFilterAnchorRef = useRef(null)
  const filterAnchorRefs = useMemo(
    () => ({
      price: priceFilterAnchorRef,
      guests: guestsFilterAnchorRef,
      duration: durationFilterAnchorRef,
      captain: captainFilterAnchorRef,
    }),
    [],
  )

  useEffect(() => {
    let cancelled = false
    fetchBoatTypes()
      .then((rows) => {
        if (!cancelled) setApiTypes(rows)
      })
      .catch(() => {
        if (!cancelled) setApiTypes([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setSearchOnMove(false)
    ;(async () => {
      setLoading(true)
      try {
        let list = []
        if (locationKey === '__all') {
          list = await fetchBoatsSearch({ allRegions: true })
        } else if (isRegion(locationKey)) {
          list = await fetchBoatsSearch({ region: locationKey })
        } else {
          list = await fetchBoatsSearch({ city: locationKey })
        }
        if (!cancelled) {
          setAllBoats(list)
          const onDate = filterBoatsByScheduleOnDate(list, dateStr)
          const pr = computePriceRange(onDate)
          setFilters((prev) => ({
            ...prev,
            priceLow: pr.min,
            priceHigh: pr.max,
          }))
        }
      } catch {
        if (!cancelled) {
          setAllBoats([])
          const pr = computePriceRange([])
          setFilters((prev) => ({
            ...prev,
            priceLow: pr.min,
            priceHigh: pr.max,
          }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [locationKey])

  useEffect(() => {
    if (!cityFromUrl) return
    setLocationKey(cityFromUrl)
  }, [cityFromUrl])

  useEffect(() => {
    if (cityFromUrl) return
    const onNearest = (e) => {
      const city = e.detail?.city
      if (city && LOCATION_OPTIONS.some((o) => o.value === city)) {
        setLocationKey(city)
      }
    }
    window.addEventListener('boatrent:nearest-city', onNearest)
    return () => window.removeEventListener('boatrent:nearest-city', onNearest)
  }, [cityFromUrl])

  const locationSelectOptions = useMemo(() => {
    if (locationKey && !LOCATION_OPTIONS.some((o) => o.value === locationKey)) {
      return [{ value: locationKey, label: locationKey }, ...LOCATION_OPTIONS]
    }
    return LOCATION_OPTIONS
  }, [locationKey])

  const handleGeoSearch = useCallback(async ({ lat, lng, radius }) => {
    setLoading(true)
    try {
      const list = await fetchBoatsSearch({ lat, lng, radius })
      setAllBoats(list)
    } catch {
      setAllBoats([])
    } finally {
      setLoading(false)
    }
  }, [])

  const boatsOnDate = useMemo(
    () => filterBoatsByScheduleOnDate(allBoats, dateStr),
    [allBoats, dateStr],
  )

  const priceRange = useMemo(() => computePriceRange(boatsOnDate), [boatsOnDate])
  const prevPriceRangeRef = useRef(priceRange)

  useEffect(() => {
    const prevRange = prevPriceRangeRef.current
    const hadDefaultPriceFilter = filters.priceLow === prevRange.min && filters.priceHigh === prevRange.max
    const nextIsDifferent = filters.priceLow !== priceRange.min || filters.priceHigh !== priceRange.max

    if (hadDefaultPriceFilter && nextIsDifferent) {
      setFilters((prev) => {
        const stillDefault = prev.priceLow === prevRange.min && prev.priceHigh === prevRange.max
        if (!stillDefault) return prev
        return { ...prev, priceLow: priceRange.min, priceHigh: priceRange.max }
      })
    }

    prevPriceRangeRef.current = priceRange
  }, [filters.priceHigh, filters.priceLow, priceRange])

  const boats = useMemo(
    () => filterBoatsList(boatsOnDate, filters, priceRange),
    [boatsOnDate, filters, priceRange],
  )
  const durationOptions = useMemo(() => computeDurationOptions(boatsOnDate), [boatsOnDate])
  const maxPassengers = useMemo(() => computeMaxPassengers(boatsOnDate), [boatsOnDate])
  const boatTypesFromList = useMemo(() => computeBoatTypesFromList(boatsOnDate), [boatsOnDate])

  const mapViewport = useMemo(() => {
    if (locationKey === '__all') {
      return { center: DEFAULT_MAP_CENTER, zoom: 5 }
    }
    const c = CITY_COORDS[locationKey]
    if (c) {
      return { center: c, zoom: isRegion(locationKey) ? 8 : 10 }
    }
    return { center: DEFAULT_MAP_CENTER, zoom: 10 }
  }, [locationKey])

  const displayLocation =
    locationKey === '__all'
      ? 'Все регионы'
      : LOCATION_OPTIONS.find((o) => o.value === locationKey)?.label || locationKey

  const activeFilters = countActiveFilters(filters, priceRange)
  const isPriceActive = filters.priceLow > priceRange.min || filters.priceHigh < priceRange.max
  const isGuestsActive = filters.passengers > 1
  const isDurationActive = Boolean(filters.duration)
  const isCaptainActive = Boolean(filters.captain)

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)')
    const onChange = () => {
      if (mq.matches) setMapVisible(true)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const closeMobileNav = () => setMobileNavOpen(false)

  const openFiltersModal = (focusSection) => {
    setFilterDropdown(null)
    setMobileNavOpen(false)
    setFiltersModalFocus(focusSection ?? null)
    setFiltersModalKey((k) => k + 1)
    setFiltersModalOpen(true)
  }

  const toggleFilterDropdown = useCallback((key) => {
    setFiltersModalOpen(false)
    setMobileNavOpen(false)
    setFilterDropdown((prev) => (prev === key ? null : key))
  }, [])

  const scrollCardIntoView = useCallback((boatId) => {
    if (boatId == null) return
    queueMicrotask(() => {
      document.getElementById(`bs-boat-${boatId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [])

  const openBoatCard = useCallback(
    (boatId) => {
      if (boatId == null) return
      navigate(`/boats/${encodeURIComponent(String(boatId))}`)
    },
    [navigate],
  )

  const handleMapPlacemarksPick = useCallback((candidates) => {
    if (!candidates?.length) return
    if (candidates.length === 1) {
      const id = candidates[0].id
      setMapPickCandidates(null)
      setSelectedBoatId(id)
      openBoatCard(id)
      return
    }
    setMapPickCandidates(candidates)
  }, [openBoatCard])

  const finishMapPick = useCallback(
    (boatId) => {
      setMapPickCandidates(null)
      setSelectedBoatId(boatId)
      openBoatCard(boatId)
    },
    [openBoatCard],
  )

  useEffect(() => {
    if (!mapPickCandidates?.length) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMapPickCandidates(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mapPickCandidates])

  const categoryItems = useMemo(() => {
    if (apiTypes.length > 0) {
      return apiTypes.map((t) => ({
        id: String(t.id),
        name: t.name || '—',
        image: getPhotoUrl(t.image) || 'https://placehold.co/100?text=',
      }))
    }
    return boatTypesFromList.map((t) => ({
      id: t.id,
      name: t.name,
      image: 'https://placehold.co/100?text=',
    }))
  }, [apiTypes, boatTypesFromList])

  const toggleType = (t) => {
    setFilters((prev) => {
      const same =
        String(prev.boatTypeId) === String(t.id) &&
        (prev.boatTypeName || '').toLowerCase() === (t.name || '').toLowerCase()
      if (same) return { ...prev, boatTypeId: null, boatTypeName: null }
      return { ...prev, boatTypeId: t.id, boatTypeName: t.name }
    })
  }

  const typeSelected = (t) =>
    String(filters.boatTypeId) === String(t.id) ||
    (filters.boatTypeName &&
      (filters.boatTypeName || '').toLowerCase() === (t.name || '').toLowerCase())

  return (
    <div className="bs-page">
      <header className="bs-top">
        <div className="bs-topLead">
          <Link
            to="/"
            className="bs-top__logo"
            aria-label="ONTHEWATER на главную"
            onClick={closeMobileNav}
          >
            <svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden>
              <circle cx="20" cy="20" r="19" fill="#0061C1" />
              <path
                d="M8 22c3-4 7-6 12-6s9 2 12 6"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            onthewater
          </Link>
          <button
            type="button"
            className="bs-navToggle"
            aria-expanded={mobileNavOpen}
            aria-controls="bs-mobile-menu"
            aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {mobileNavOpen ? (
          <button
            type="button"
            className="bs-navBackdrop"
            aria-label="Закрыть меню"
            onClick={closeMobileNav}
          />
        ) : null}

        <div
          id="bs-mobile-menu"
          className={`bs-mobileNav${mobileNavOpen ? ' bs-mobileNav--open' : ''}`}
          aria-hidden={!mobileNavOpen}
        >
          <div className="bs-mobileNavInner">
            <p className="bs-mobileNavEyebrow">Разделы</p>
            <nav className="bs-mobileNavLinks" aria-label="Меню (мобильная версия)">
              <Link to="/" onClick={closeMobileNav}>
                Главная
              </Link>
              <Link to="/boats" onClick={closeMobileNav}>
                Катера
              </Link>
              <a href="/#how" onClick={closeMobileNav}>
                Как это работает
              </a>
              <a href="/#destinations" onClick={closeMobileNav}>
                Направления
              </a>
              <a href="/#contact" onClick={closeMobileNav}>
                Контакты
              </a>
            </nav>
            <div className="bs-mobileNavActions">
              <a
                href={SITE_MAIN_URL}
                className="bs-mobileNavMuted"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileNav}
              >
                Разместить объявление
              </a>
              <div className="bs-mobileNavBtns">
                {user ? (
                  <>
                    <Link
                      to="/account"
                      className="bs-mobileNavBtn bs-mobileNavBtn--primary authMenuBtn"
                      onClick={closeMobileNav}
                    >
                      Личный кабинет
                    </Link>
                    <button
                      type="button"
                      className="bs-mobileNavBtn bs-mobileNavBtn--secondary authMenuBtn authMenuBtn--action"
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
                      className="bs-mobileNavBtn bs-mobileNavBtn--primary authMenuBtn"
                      onClick={closeMobileNav}
                    >
                      Регистрация
                    </Link>
                    <Link
                      to="/login"
                      className="bs-mobileNavBtn bs-mobileNavBtn--secondary authMenuBtn"
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

        <div className="bs-searchBar" role="search">
          <div className="bs-searchBar__field bs-searchBar__field--location">
            <SearchBarPinIcon />
            <div className="bs-searchBar__selectWrap">
              <select
                className="bs-searchBar__select"
                value={locationKey}
                onChange={(e) => setLocationKey(e.target.value)}
                aria-label="Город или регион"
              >
                {locationSelectOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <SearchBarSelectChevron />
            </div>
          </div>
          <span className="bs-searchBar__divider" aria-hidden />
          <button
            type="button"
            className="bs-searchBar__field bs-searchBar__field--date"
            onClick={() => setCalendarOpen(true)}
            aria-label="Выбрать дату"
          >
            <SearchBarCalendarIcon />
            <span className="bs-searchBar__dateText">{formatBookingDateDots(dateStr)}</span>
          </button>
        </div>

        <div className="bs-top__auth bs-top__authDesktop">
          {user ? (
            <>
              <Link to="/account" className="authMenuBtn">
                Личный кабинет
              </Link>
              <button type="button" className="authMenuBtn authMenuBtn--action" onClick={logout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="authMenuBtn">
                Регистрация
              </Link>
              <Link to="/login" className="authMenuBtn">
                Вход
              </Link>
            </>
          )}
        </div>
      </header>

      <BookingCalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={dateStr}
        minDate={todayISO()}
        onApply={(iso) => setDateStr(iso)}
      />

      {categoryItems.length > 0 ? (
        <div className="bs-categories" role="region" aria-label="Тип катера">
          {categoryItems.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`bs-cat${typeSelected(t) ? ' bs-cat--on' : ''}`}
              onClick={() => toggleType(t)}
            >
              <img src={t.image} alt="" className="bs-cat__img" />
              <span className="bs-cat__label">{t.name}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="bs-filtersRow" role="region" aria-label="Фильтры и параметры">
        <div className="bs-filtersRow__chips">
          <button
            type="button"
            className={`bs-chip${activeFilters > 0 ? ' bs-chip--active' : ''}`}
            onClick={() => openFiltersModal(null)}
          >
            <span className="bs-filtersIcon" aria-hidden>
              ⚙
            </span>
            Фильтры
            {activeFilters > 0 ? ` (${activeFilters})` : ''}
          </button>

          {isPriceActive ? (
            <div className="bs-quickChip bs-quickChip--value" ref={priceFilterAnchorRef}>
              <button
                type="button"
                className="bs-quickChip__main"
                onClick={() => toggleFilterDropdown('price')}
                aria-label="Фильтр по цене"
                aria-expanded={filterDropdown === 'price'}
              >
                {formatPriceShort(filters.priceLow)} – {formatPriceShort(filters.priceHigh)} ₽
              </button>
              <button
                type="button"
                className="bs-quickChip__clear"
                onClick={(e) => {
                  e.stopPropagation()
                  setFilters((prev) => ({
                    ...prev,
                    priceLow: priceRange.min,
                    priceHigh: priceRange.max,
                  }))
                }}
                aria-label="Сбросить цену"
              >
                <ClearIcon />
              </button>
            </div>
          ) : (
            <span className="bs-filterChipAnchor" ref={priceFilterAnchorRef}>
              <button
                type="button"
                className="bs-quickChip"
                onClick={() => toggleFilterDropdown('price')}
                aria-expanded={filterDropdown === 'price'}
              >
                Цена
                <ChevronDownIcon />
              </button>
            </span>
          )}

          {isGuestsActive ? (
            <div className="bs-quickChip bs-quickChip--value" ref={guestsFilterAnchorRef}>
              <button
                type="button"
                className="bs-quickChip__main"
                onClick={() => toggleFilterDropdown('guests')}
                aria-label="Количество гостей"
                aria-expanded={filterDropdown === 'guests'}
              >
                {formatGuestsQuickLabel(filters.passengers)}
              </button>
              <button
                type="button"
                className="bs-quickChip__clear"
                onClick={(e) => {
                  e.stopPropagation()
                  setFilters((prev) => ({ ...prev, passengers: 1 }))
                }}
                aria-label="Сбросить гостей"
              >
                <ClearIcon />
              </button>
            </div>
          ) : (
            <span className="bs-filterChipAnchor" ref={guestsFilterAnchorRef}>
              <button
                type="button"
                className="bs-quickChip"
                onClick={() => toggleFilterDropdown('guests')}
                aria-expanded={filterDropdown === 'guests'}
              >
                Гости
                <ChevronDownIcon />
              </button>
            </span>
          )}

          {isDurationActive ? (
            <div className="bs-quickChip bs-quickChip--value" ref={durationFilterAnchorRef}>
              <button
                type="button"
                className="bs-quickChip__main"
                onClick={() => toggleFilterDropdown('duration')}
                aria-label="Длительность аренды"
                aria-expanded={filterDropdown === 'duration'}
              >
                {formatDurationListLabel(filters.duration)}
              </button>
              <button
                type="button"
                className="bs-quickChip__clear"
                onClick={(e) => {
                  e.stopPropagation()
                  setFilters((prev) => ({ ...prev, duration: null }))
                }}
                aria-label="Сбросить длительность"
              >
                <ClearIcon />
              </button>
            </div>
          ) : (
            <span className="bs-filterChipAnchor" ref={durationFilterAnchorRef}>
              <button
                type="button"
                className="bs-quickChip"
                onClick={() => toggleFilterDropdown('duration')}
                aria-expanded={filterDropdown === 'duration'}
              >
                Длительность
                <ChevronDownIcon />
              </button>
            </span>
          )}

          <span className="bs-filterChipAnchor" ref={captainFilterAnchorRef}>
            <button
              type="button"
              className={`bs-quickChip${isCaptainActive ? ' bs-quickChip--on' : ''}`}
              onClick={() => toggleFilterDropdown('captain')}
              aria-expanded={filterDropdown === 'captain'}
            >
              Капитан
              <ChevronDownIcon />
            </button>
          </span>
        </div>
      </div>

      <div className={`bs-main${!mapVisible ? ' bs-main--mapOff' : ''}`}>
        <div className="bs-listCol">
          <div className="bs-listCol__head">
            <div className="bs-resultsHead">
              <h1 className="bs-resultsTitle">
                {loading ? 'Загрузка…' : `${boats.length} катеров — ${displayLocation}`}
              </h1>
              <div className="bs-resultsHead__view" role="presentation">
                <div className="bs-viewSeg bs-viewSeg--mobileOnly" role="tablist" aria-label="Вид: список или карта">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!mapVisible}
                    className={`bs-viewSeg__btn${!mapVisible ? ' bs-viewSeg__btn--active' : ''}`}
                    onClick={() => setMapVisible(false)}
                  >
                    Список
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mapVisible}
                    className={`bs-viewSeg__btn${mapVisible ? ' bs-viewSeg__btn--active' : ''}`}
                    onClick={() => setMapVisible(true)}
                  >
                    Карта
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="bs-listCol__scroll" role="region" aria-label="Список катеров">
            {loading ? (
              <div className="bs-loading">Загружаем катера…</div>
            ) : (
              <div className="bs-grid">
                {boats.map((boat) => (
                  <BoatResultCard
                    key={boat.id}
                    boat={boat}
                    filters={filters}
                    selected={selectedBoatId === boat.id}
                    onHover={(id) => setSelectedBoatId(id)}
                    onLeave={() => setSelectedBoatId(null)}
                  />
                ))}
              </div>
            )}
            {!loading && boats.length === 0 ? (
              <p className="bs-loading">
                {allBoats.length > 0 && boatsOnDate.length === 0
                  ? `На ${formatBookingDateDots(dateStr)} в списке нет катеров с выходом в этот день — выберите другую дату.`
                  : 'Ничего не найдено — измените фильтры или город.'}
              </p>
            ) : null}
          </div>
        </div>

        <div className="bs-mapCol">
          <div className="bs-mapWrap">
            <label className="bs-mapSearchOpt">
              <input
                type="checkbox"
                checked={searchOnMove}
                onChange={(e) => setSearchOnMove(e.target.checked)}
              />
              Искать при движении карты
            </label>
            <YandexBoatsMap
              apiKey={YANDEX_MAPS_API_KEY}
              boats={boats}
              center={mapViewport.center}
              zoom={mapViewport.zoom}
              selectedBoatId={selectedBoatId}
              searchOnMove={searchOnMove}
              autoFitBounds={!searchOnMove}
              onGeoSearch={handleGeoSearch}
              onPlacemarksPick={handleMapPlacemarksPick}
              filters={filters}
            />
            {mapPickCandidates?.length ? (
              <div
                className="bs-mapPickOverlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bs-mapPick-title"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setMapPickCandidates(null)
                }}
              >
                <div className="bs-mapPickCard" onClick={(e) => e.stopPropagation()}>
                  <h2 id="bs-mapPick-title" className="bs-mapPickTitle">
                    Выберите катер
                  </h2>
                  <p className="bs-mapPickHint">Несколько судов рядом на карте — укажите нужное.</p>
                  <ul className="bs-mapPickList">
                    {mapPickCandidates.map((c) => (
                      <li key={String(c.id)}>
                        <button type="button" className="bs-mapPickBtn" onClick={() => finishMapPick(c.id)}>
                          <span className="bs-mapPickBtn__body">
                            <span className="bs-mapPickBtn__title">{c.title}</span>
                            {c.priceLine ? (
                              <span className="bs-mapPickBtn__price">{c.priceLine}</span>
                            ) : null}
                            {c.minTimeLine ? (
                              <span className="bs-mapPickBtn__min">{c.minTimeLine}</span>
                            ) : null}
                          </span>
                          {c.photoUrl ? (
                            <span className="bs-mapPickBtn__thumb">
                              <img src={c.photoUrl} alt="" loading="lazy" />
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="bs-mapPickCancel" onClick={() => setMapPickCandidates(null)}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <FilterQuickDropdown
        open={filterDropdown}
        anchorRefs={filterAnchorRefs}
        onClose={() => setFilterDropdown(null)}
        filters={filters}
        onFiltersChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
        priceRange={priceRange}
        durationOptions={
          durationOptions.length > 0 ? durationOptions : [30, 60, 120, 180, 240, 360, 480]
        }
        maxPassengers={maxPassengers}
        allBoats={boatsOnDate}
      />

      {filtersModalOpen ? (
        <FiltersModal
          key={filtersModalKey}
          focusSection={filtersModalFocus}
          onClose={() => {
            setFiltersModalOpen(false)
            setFiltersModalFocus(null)
          }}
          filters={filters}
          onApply={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
          allBoats={boatsOnDate}
          priceRange={priceRange}
          durationOptions={durationOptions}
          maxPassengers={maxPassengers}
        />
      ) : null}
    </div>
  )
}
