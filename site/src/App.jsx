import { useEffect, useRef } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BoatsSearchPage from './pages/BoatsSearchPage.jsx'
import BoatDetailPage from './pages/BoatDetailPage.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import { startSiteGeolocation } from './lib/siteGeolocation.js'
import { metrikaHit } from './lib/yandexMetrika.js'

/**
 * Геолокацию для автовыбора города на /boats запускаем только с главной и со списка поиска.
 * Страница катера /boats/:slug не должна перезаписывать город в localStorage при открытии ссылки.
 */
function GeolocationOnAllowedRoutes() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname !== '/' && pathname !== '/boats') return
    startSiteGeolocation()
  }, [pathname])
  return null
}

/** Метрика: виртуальный hit при клиентской навигации (первая загрузка учитывается init в index.html). */
function YandexMetrikaSpa() {
  const location = useLocation()
  const isFirst = useRef(true)
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    const path = `${location.pathname}${location.search || ''}`
    metrikaHit(path, document.title)
  }, [location.pathname, location.search])
  return null
}

export default function App() {
  return (
    <>
      <YandexMetrikaSpa />
      <GeolocationOnAllowedRoutes />
      <div className="app-outlet">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boats" element={<BoatsSearchPage />} />
          <Route path="/boats/:boatSlug" element={<BoatDetailPage />} />
        </Routes>
      </div>
      <SiteFooter />
    </>
  )
}
