import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './boatsSearch.css'
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
  filterBoatsList,
  formatDurationListLabel,
  formatGuestsQuickLabel,
  formatPriceShort,
  isRegion,
  readNearestCityFromStorage,
} from '../boatSearchUtils'
import BoatResultCard from '../components/search/BoatResultCard.jsx'
import FiltersModal from '../components/search/FiltersModal.jsx'
import YandexBoatsMap from '../components/search/YandexBoatsMap.jsx'

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

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function BoatsSearchPage() {
  const [searchParams] = useSearchParams()
  const cityFromUrl = searchParams.get('city')?.trim() || ''

  const [locationKey, setLocationKey] = useState(readInitialLocationKey)
  const [dateStr] = useState(todayISO)
  const [allBoats, setAllBoats] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [mapVisible, setMapVisible] = useState(true)
  const [searchOnMove, setSearchOnMove] = useState(false)
  const [selectedBoatId, setSelectedBoatId] = useState(null)
  const [apiTypes, setApiTypes] = useState([])
  const [filtersModalOpen, setFiltersModalOpen] = useState(false)
  const [filtersModalKey, setFiltersModalKey] = useState(0)
  const [filtersModalFocus, setFiltersModalFocus] = useState(null)

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
        if (!cancelled) setAllBoats(list)
      } catch {
        if (!cancelled) setAllBoats([])
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

  const priceRange = useMemo(() => computePriceRange(allBoats), [allBoats])
  const boats = useMemo(
    () => filterBoatsList(allBoats, filters, priceRange),
    [allBoats, filters, priceRange],
  )
  const durationOptions = useMemo(() => computeDurationOptions(allBoats), [allBoats])
  const maxPassengers = useMemo(() => computeMaxPassengers(allBoats), [allBoats])
  const boatTypesFromList = useMemo(() => computeBoatTypesFromList(allBoats), [allBoats])

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

  const openFiltersModal = (focusSection) => {
    setFiltersModalFocus(focusSection ?? null)
    setFiltersModalKey((k) => k + 1)
    setFiltersModalOpen(true)
  }

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
        <Link to="/" className="bs-top__logo" aria-label="ONTHEWATER на главную">
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

        <div className="bs-searchBar" role="search">
          <div className="bs-searchBar__field">
            <span aria-hidden>📍</span>
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
          </div>
          <span className="bs-searchBar__divider" />
          <div className="bs-searchBar__field">
            <span aria-hidden>📅</span>
            <input className="bs-searchBar__input" type="date" value={dateStr} readOnly aria-label="Дата" />
          </div>
        </div>

        <div className="bs-top__auth">
          <a href={SITE_MAIN_URL} target="_blank" rel="noopener noreferrer">
            Регистрация
          </a>
          <a href={SITE_MAIN_URL} target="_blank" rel="noopener noreferrer">
            Вход
          </a>
        </div>
      </header>

      {categoryItems.length > 0 ? (
        <div className="bs-categories">
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

      <div className="bs-filtersRow">
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
            <div className="bs-quickChip bs-quickChip--value">
              <button
                type="button"
                className="bs-quickChip__main"
                onClick={() => openFiltersModal('price')}
                aria-label="Фильтр по цене"
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
            <button
              type="button"
              className="bs-quickChip"
              onClick={() => openFiltersModal('price')}
            >
              Цена
              <ChevronDownIcon />
            </button>
          )}

          {isGuestsActive ? (
            <div className="bs-quickChip bs-quickChip--value">
              <button
                type="button"
                className="bs-quickChip__main"
                onClick={() => openFiltersModal('passengers')}
                aria-label="Количество гостей"
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
            <button
              type="button"
              className="bs-quickChip"
              onClick={() => openFiltersModal('passengers')}
            >
              Гости
              <ChevronDownIcon />
            </button>
          )}

          {isDurationActive ? (
            <div className="bs-quickChip bs-quickChip--value">
              <button
                type="button"
                className="bs-quickChip__main"
                onClick={() => openFiltersModal('duration')}
                aria-label="Длительность аренды"
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
            <button
              type="button"
              className="bs-quickChip"
              onClick={() => openFiltersModal('duration')}
            >
              Длительность
              <ChevronDownIcon />
            </button>
          )}

          <button
            type="button"
            className={`bs-quickChip${isCaptainActive ? ' bs-quickChip--on' : ''}`}
            onClick={() => openFiltersModal('captain')}
          >
            Капитан
            <ChevronDownIcon />
          </button>
        </div>

        <label className="bs-mapToggle bs-mapToggle--mobileOnly">
          <span>Карта</span>
          <input
            type="checkbox"
            checked={mapVisible}
            onChange={(e) => setMapVisible(e.target.checked)}
            aria-label="Показать карту"
          />
        </label>
      </div>

      <div className={`bs-main${!mapVisible ? ' bs-main--mapOff' : ''}`}>
        <div className="bs-listCol">
          <h1 className="bs-resultsTitle">
            {loading ? 'Загрузка…' : `${boats.length} катеров — ${displayLocation}`}
          </h1>
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
            <p className="bs-loading">Ничего не найдено — измените фильтры или город.</p>
          ) : null}
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
              filters={filters}
            />
          </div>
        </div>
      </div>

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
          allBoats={allBoats}
          priceRange={priceRange}
          durationOptions={durationOptions}
          maxPassengers={maxPassengers}
        />
      ) : null}
    </div>
  )
}
