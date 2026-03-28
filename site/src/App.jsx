import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BoatsSearchPage from './pages/BoatsSearchPage.jsx'
import BoatDetailPage from './pages/BoatDetailPage.jsx'
import { startSiteGeolocation } from './lib/siteGeolocation.js'

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

export default function App() {
  return (
    <>
      <GeolocationOnAllowedRoutes />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/boats" element={<BoatsSearchPage />} />
        <Route path="/boats/:boatSlug" element={<BoatDetailPage />} />
      </Routes>
    </>
  )
}
