import { useEffect, useRef } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BoatsSearchPage from './pages/BoatsSearchPage.jsx'
import BoatDetailPage from './pages/BoatDetailPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import OwnerLandingPage from './pages/OwnerLandingPage.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import AndroidAppPrompt from './components/AndroidAppPrompt.jsx'
import { startSiteGeolocation } from './lib/siteGeolocation.js'
import { metrikaHit } from './lib/yandexMetrika.js'
import { useAuth } from './context/AuthContext.jsx'

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

/** При клиентской навигации открываем новую страницу с начала. */
function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

export default function App() {
  const { user, loading } = useAuth()
  return (
    <>
      <ScrollToTopOnRouteChange />
      <YandexMetrikaSpa />
      <GeolocationOnAllowedRoutes />
      <AndroidAppPrompt />
      <div className="app-outlet">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boats" element={<BoatsSearchPage />} />
          <Route path="/boats/:boatSlug" element={<BoatDetailPage />} />
          <Route path="/owners" element={<OwnerLandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/account"
            element={
              loading ? (
                <div className="bd-loading">Загружаем профиль…</div>
              ) : user ? (
                <AccountPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
      <SiteFooter />
    </>
  )
}
