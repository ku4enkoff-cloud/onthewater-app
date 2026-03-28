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
  formatPriceShort,
  isRegion,
} from '../boatSearchUtils'
import BoatResultCard from '../components/search/BoatResultCard.jsx'
import YandexBoatsMap from '../components/search/YandexBoatsMap.jsx'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function BoatsSearchPage() {
  const [searchParams] = useSearchParams()
  const initialCity = searchParams.get('city') || 'Москва'

  const [locationKey, setLocationKey] = useState(() =>
    LOCATION_OPTIONS.some((o) => o.value === initialCity) ? initialCity : 'Москва',
  )
  const [dateStr] = useState(todayISO)
  const [allBoats, setAllBoats] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [mapVisible, setMapVisible] = useState(true)
  const [searchOnMove, setSearchOnMove] = useState(false)
  const [selectedBoatId, setSelectedBoatId] = useState(null)
  const [apiTypes, setApiTypes] = useState([])

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

  useEffect(() => {
    if (priceRange.min === 0 && priceRange.max === 50000) return
    setFilters((prev) => {
      if (prev.priceLow === 0 && prev.priceHigh === 50000) {
        return { ...prev, priceLow: priceRange.min, priceHigh: priceRange.max }
      }
      return prev
    })
  }, [priceRange.min, priceRange.max])

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
              {LOCATION_OPTIONS.map((o) => (
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
        <details className="bs-details">
          <summary className="bs-details__summary">
            Фильтры{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </summary>
          <div className="bs-filterPanel" style={{ marginTop: 12 }}>
            <div className="bs-filterPanel__grid">
              <label>
                Цена от (₽)
                <input
                  type="number"
                  min={priceRange.min}
                  max={filters.priceHigh}
                  value={filters.priceLow}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, priceLow: Number(e.target.value) || 0 }))
                  }
                />
              </label>
              <label>
                Цена до (₽)
                <input
                  type="number"
                  min={filters.priceLow}
                  max={priceRange.max}
                  value={filters.priceHigh}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, priceHigh: Number(e.target.value) || 0 }))
                  }
                />
              </label>
              <label>
                Пассажиры (мин.)
                <select
                  value={filters.passengers}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, passengers: Number(e.target.value) || 1 }))
                  }
                >
                  {Array.from({ length: maxPassengers }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}+
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Длительность
                <select
                  value={filters.duration ?? ''}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      duration: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">Любая</option>
                  {durationOptions.map((m) => (
                    <option key={m} value={m}>
                      {m < 60 ? `${m} мин` : `${m / 60} ч`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Капитан
                <select
                  value={filters.captain ?? ''}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      captain: e.target.value || null,
                    }))
                  }
                >
                  <option value="">Любой</option>
                  <option value="С капитаном">С капитаном</option>
                  <option value="Без капитана">Без капитана</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              className="bs-chip"
              style={{ marginTop: 12 }}
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              Сбросить
            </button>
          </div>
        </details>

        {isPriceActive ? (
          <span className="bs-chip bs-chip--active">
            {formatPriceShort(filters.priceLow)} – {formatPriceShort(filters.priceHigh)} ₽
          </span>
        ) : null}

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
    </div>
  )
}
