import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchBoatTypes, fetchBoatsSearch } from '../api/boats'
import { YANDEX_MAPS_API_KEY, getPhotoUrl } from '../config'
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
  formatGuestsQuickLabel,
  isRegion,
  boatInMapBounds,
  readNearestCityFromStorage,
} from '../boatSearchUtils'
import BoatResultCard from '../components/search/BoatResultCard.jsx'
import FilterQuickDropdown from '../components/search/FilterQuickDropdown.jsx'
import FiltersModal from '../components/search/FiltersModal.jsx'
import YandexBoatsMap from '../components/search/YandexBoatsMap.jsx'
import { formatBookingDateDots, formatBookingDateRu } from '../components/booking/BookingCalendarModal.jsx'
import HomeDateCalendar from '../components/HomeDateCalendar.jsx'
import { useBoatsSearchPageSeo } from '../seo/useBoatsSearchPageSeo.js'
import '../styles/precision-home.css'
import '../styles/boats-search.css'

const CITY_REGION_HINT = {
  Москва: 'Россия',
  'Московская область': 'Россия',
  'Санкт-Петербург': 'Россия',
  Сочи: 'Россия',
  Казань: 'Россия',
}

function regionHintFor(city) {
  return CITY_REGION_HINT[city] || 'Россия'
}

function CityPanelPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function CityPanelSearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CityPanelCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function readInitialLocationKey() {
  try {
    const params = new URLSearchParams(window.location.search)
    const c = params.get('city')?.trim()
    if (c) return c
    // Как в приложении: переход по категории — все регионы
    if (params.get('typeId')?.trim() || params.get('typeName')?.trim()) return '__all'
  } catch {
    /* ignore */
  }
  return readNearestCityFromStorage() || 'Москва'
}

function SearchBarPinIcon() {
  return (
    <svg className="bs-searchBar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function SearchBarCalendarIcon() {
  return (
    <svg className="bs-searchBar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function SearchBarGuestsIcon() {
  return (
    <svg className="bs-searchBar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3.5 19c.7-3 2.8-4.8 5.5-4.8S14.8 16 15.5 19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="17.2" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 14.5c1.7.4 3 1.5 3.6 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SearchBarFindIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ChipBoatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 15.5h18l-2.2 3.2a2 2 0 0 1-1.7.9H6.9a2 2 0 0 1-1.7-.9L3 15.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6 15.5V10l6-4 6 4v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function FiltersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

function weekdayLabelRu(iso) {
  try {
    const d = new Date(`${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '1 день'
    const s = d.toLocaleDateString('ru-RU', { weekday: 'long' })
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '1 день'
  } catch {
    return '1 день'
  }
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
  const [searchParams] = useSearchParams()
  const cityFromUrl = searchParams.get('city')?.trim() || ''
  const dateFromUrl = searchParams.get('date')?.trim() || ''
  const guestsFromUrl = Number(searchParams.get('guests'))
  const typeIdFromUrl = searchParams.get('typeId')?.trim() || ''
  const typeNameFromUrl = searchParams.get('typeName')?.trim() || ''

  const [locationKey, setLocationKey] = useState(readInitialLocationKey)
  const [dateStr, setDateStr] = useState(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl)) return dateFromUrl
    return todayISO()
  })
  const [cityOpen, setCityOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [cityFilter, setCityFilter] = useState('')
  const [allBoats, setAllBoats] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    passengers: Number.isFinite(guestsFromUrl) && guestsFromUrl >= 1 ? guestsFromUrl : DEFAULT_FILTERS.passengers,
    boatTypeId: typeIdFromUrl || null,
    boatTypeName: typeNameFromUrl || null,
  }))
  const [mapVisible, setMapVisible] = useState(true)
  const [mapBounds, setMapBounds] = useState(null)
  const [selectedBoatId, setSelectedBoatId] = useState(null)
  const [mapPickCandidates, setMapPickCandidates] = useState(null)
  const [apiTypes, setApiTypes] = useState([])
  const [filtersModalOpen, setFiltersModalOpen] = useState(false)
  const [filtersModalKey, setFiltersModalKey] = useState(0)
  const [filtersModalFocus, setFiltersModalFocus] = useState(null)
  const [filterDropdown, setFilterDropdown] = useState(null)

  const searchBarRef = useRef(null)
  const cityFilterRef = useRef(null)
  const guestsFilterAnchorRef = useRef(null)
  const filterAnchorRefs = useMemo(
    () => ({
      guests: guestsFilterAnchorRef,
    }),
    [],
  )

  useEffect(() => {
    const onDown = (e) => {
      if (!searchBarRef.current?.contains(e.target)) {
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
    const t = window.setTimeout(() => cityFilterRef.current?.focus(), 30)
    return () => window.clearTimeout(t)
  }, [cityOpen])

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

  const cityPanelOptions = useMemo(() => {
    const q = cityFilter.trim().toLowerCase()
    if (!q) return locationSelectOptions
    return locationSelectOptions.filter(
      (o) =>
        String(o.label || '').toLowerCase().includes(q) ||
        String(o.value || '').toLowerCase().includes(q) ||
        regionHintFor(o.value).toLowerCase().includes(q),
    )
  }, [locationSelectOptions, cityFilter])

  const pickLocation = useCallback((value) => {
    setLocationKey(value)
    setCityOpen(false)
    setCityFilter('')
  }, [])

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

  const handleViewportChange = useCallback((bounds) => {
    setMapBounds(bounds || null)
  }, [])

  useEffect(() => {
    setMapBounds(null)
  }, [locationKey])

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

  /** Список слева — только катера в текущем viewport карты */
  const boatsInView = useMemo(() => {
    if (!mapVisible || !mapBounds) return boats
    return boats.filter((b) => boatInMapBounds(b, mapBounds))
  }, [boats, mapBounds, mapVisible])

  const seoBoats = useMemo(() => boats.slice(0, 20), [boats])
  useBoatsSearchPageSeo({
    locationKey,
    boatCount: boats.length,
    loading,
    boats: seoBoats,
  })
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
  const isGuestsActive = filters.passengers > 1

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)')
    const onChange = () => {
      if (mq.matches) setMapVisible(true)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const openFiltersModal = (focusSection) => {
    setFilterDropdown(null)
    setFiltersModalFocus(focusSection ?? null)
    setFiltersModalKey((k) => k + 1)
    setFiltersModalOpen(true)
  }

  const toggleFilterDropdown = useCallback((key) => {
    setFiltersModalOpen(false)
    setFilterDropdown((prev) => (prev === key ? null : key))
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
    <div className={`bs-page bs-page--mapFirst${!mapVisible ? ' bs-page--listOnly' : ''}`}>
      <div className="bs-stage">
        <div className="bs-mapCol" aria-hidden={!mapVisible}>
          <div className="bs-mapWrap">
            <YandexBoatsMap
              apiKey={YANDEX_MAPS_API_KEY}
              boats={boats}
              center={mapViewport.center}
              zoom={mapViewport.zoom}
              selectedBoatId={selectedBoatId}
              autoFitBounds
              onGeoSearch={handleGeoSearch}
              onViewportChange={handleViewportChange}
              onPlacemarksPick={handleMapPlacemarksPick}
              onHoverBoatOpen={(boat) => {
                if (boat?.id == null) return
                setSelectedBoatId(boat.id)
                openBoatCard(boat.id)
              }}
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
                              <img src={c.photoUrl} alt={c.title} loading="lazy" />
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

        <div className="bs-floatChrome">
          <div className="bs-searchBar" role="search" ref={searchBarRef}>
            <button
              type="button"
              className={`bs-searchBar__field bs-searchBar__field--location${cityOpen ? ' is-open' : ''}`}
              aria-haspopup="listbox"
              aria-expanded={cityOpen}
              aria-label="Город или регион"
              onClick={() => {
                setCityOpen((o) => !o)
                setDateOpen(false)
                setFilterDropdown(null)
              }}
            >
              <SearchBarPinIcon />
              <span className="bs-searchBar__stack">
                <span className="bs-searchBar__primary">{displayLocation}</span>
                <span className="bs-searchBar__secondary">
                  {locationKey === '__all' ? 'Все регионы' : regionHintFor(locationKey)}
                </span>
              </span>
            </button>
            <span className="bs-searchBar__divider" aria-hidden />
            <button
              type="button"
              className={`bs-searchBar__field bs-searchBar__field--date${dateOpen ? ' is-open' : ''}`}
              aria-haspopup="dialog"
              aria-expanded={dateOpen}
              aria-label="Выбрать дату"
              onClick={() => {
                setDateOpen((o) => !o)
                setCityOpen(false)
                setCityFilter('')
                setFilterDropdown(null)
              }}
            >
              <SearchBarCalendarIcon />
              <span className="bs-searchBar__stack">
                <span className="bs-searchBar__primary">
                  {formatBookingDateRu(dateStr).replace(/\s*г\.?\s*$/i, '')}
                </span>
                <span className="bs-searchBar__secondary">{weekdayLabelRu(dateStr)}</span>
              </span>
            </button>
            <span className="bs-searchBar__divider bs-searchBar__divider--desktop" aria-hidden />
            <button
              type="button"
              className="bs-searchBar__field bs-searchBar__field--guests"
              ref={guestsFilterAnchorRef}
              onClick={() => {
                setCityOpen(false)
                setDateOpen(false)
                toggleFilterDropdown('guests')
              }}
              aria-label="Количество гостей"
              aria-expanded={filterDropdown === 'guests'}
            >
              <SearchBarGuestsIcon />
              <span className="bs-searchBar__stack">
                <span className="bs-searchBar__primary">
                  {isGuestsActive ? formatGuestsQuickLabel(filters.passengers) : 'Гости'}
                </span>
                <span className="bs-searchBar__secondary">Взрослые + дети</span>
              </span>
            </button>
            <button
              type="button"
              className="bs-searchBar__find"
              onClick={() => {
                setFilterDropdown(null)
                setCityOpen(false)
                setDateOpen(false)
                if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches) {
                  setMapVisible(false)
                }
              }}
            >
              <SearchBarFindIcon />
              <span>Найти</span>
            </button>

            {cityOpen ? (
              <div className="bs-searchBar__cityPanel pm-cityPanel" role="listbox" aria-label="Выбор города">
                <div className="pm-cityPanel__search">
                  <span className="pm-cityPanel__searchIcon" aria-hidden>
                    <CityPanelSearchIcon />
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
                </div>
                <ul className="pm-cityPanel__list">
                  {cityPanelOptions.map((o) => {
                    const selected = o.value === locationKey
                    return (
                      <li key={o.value} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`pm-cityPanel__item${selected ? ' is-selected' : ''}`}
                          onClick={() => pickLocation(o.value)}
                        >
                          <span className="pm-cityPanel__pin" aria-hidden>
                            <CityPanelPinIcon />
                          </span>
                          <span className="pm-cityPanel__copy">
                            <span className="pm-cityPanel__name">{o.label}</span>
                            <span className="pm-cityPanel__region">
                              {o.value === '__all' ? 'По всей России' : regionHintFor(o.value)}
                            </span>
                          </span>
                          {selected ? (
                            <span className="pm-cityPanel__check" aria-hidden>
                              <CityPanelCheckIcon />
                            </span>
                          ) : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}

            {dateOpen ? (
              <div className="bs-searchBar__calWrap pm-calWrap">
                <HomeDateCalendar
                  value={dateStr}
                  minDate={todayISO()}
                  onChange={(iso) => {
                    if (!iso) return
                    setDateStr(iso)
                  }}
                  onClose={() => setDateOpen(false)}
                />
              </div>
            ) : null}
          </div>

          <div className="bs-floatFilters" role="region" aria-label="Типы катеров">
            <div className="bs-filtersRow__chips">
              <button
                type="button"
                className={`bs-quickChip${!filters.boatTypeId && !filters.boatTypeName ? ' bs-quickChip--on' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, boatTypeId: null, boatTypeName: null }))}
              >
                <ChipBoatIcon />
                Все катера
              </button>

              {categoryItems.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`bs-quickChip${typeSelected(t) ? ' bs-quickChip--on' : ''}`}
                  onClick={() => toggleType(t)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="bs-floatPanel">
          <div className="bs-listCol__head">
            <div className="bs-resultsHead">
              <h1 className="bs-resultsTitle">
                {loading
                  ? 'Загрузка…'
                  : `Найдено ${boatsInView.length} ${
                      boatsInView.length === 1
                        ? 'вариант'
                        : boatsInView.length > 1 && boatsInView.length < 5
                          ? 'варианта'
                          : 'вариантов'
                    }`}
              </h1>
              <div className="bs-resultsHead__actions">
                <button
                  type="button"
                  className={`bs-resultsFiltersBtn${activeFilters > 0 ? ' bs-resultsFiltersBtn--active' : ''}`}
                  onClick={() => openFiltersModal(null)}
                  aria-label={activeFilters > 0 ? `Фильтры, выбрано ${activeFilters}` : 'Фильтры'}
                >
                  <FiltersIcon />
                  <span>Фильтры</span>
                  {activeFilters > 0 ? (
                    <span className="bs-resultsFiltersBtn__count">{activeFilters}</span>
                  ) : null}
                </button>
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
          </div>
          <div className="bs-listCol__scroll" role="region" aria-label="Список катеров">
            {loading ? (
              <div className="bs-loading">Загружаем катера…</div>
            ) : (
              <div className="bs-grid">
                {boatsInView.map((boat) => (
                  <BoatResultCard
                    key={boat.id}
                    boat={boat}
                    filters={filters}
                    layout="row"
                    selected={selectedBoatId === boat.id}
                    onHover={(id) => setSelectedBoatId(id)}
                    onLeave={() => setSelectedBoatId(null)}
                  />
                ))}
              </div>
            )}
            {!loading && boatsInView.length === 0 ? (
              <p className="bs-loading">
                {allBoats.length > 0 && boatsOnDate.length === 0
                  ? `На ${formatBookingDateDots(dateStr)} в списке нет катеров с выходом в этот день — выберите другую дату.`
                  : boats.length > 0
                    ? 'В видимой области карты нет катеров — подвиньте или отдалите карту.'
                    : 'Ничего не найдено — измените фильтры или город.'}
              </p>
            ) : null}
          </div>
        </aside>
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
          boatTypes={categoryItems}
        />
      ) : null}
    </div>
  )
}
