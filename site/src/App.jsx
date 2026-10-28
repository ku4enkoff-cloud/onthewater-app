import { useEffect, useRef } from 'react'
import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BoatsSearchPage from './pages/BoatsSearchPage.jsx'
import BoatDetailPage from './pages/BoatDetailPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import OwnerLandingPage from './pages/OwnerLandingPage.jsx'
import LegalDocumentPage from './pages/LegalDocumentPage.jsx'
import SitemapPage from './pages/SitemapPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import AndroidAppPrompt from './components/AndroidAppPrompt.jsx'
import IosAppPrompt from './components/IosAppPrompt.jsx'
import { startSiteGeolocation } from './lib/siteGeolocation.js'
import { metrikaHit } from './lib/yandexMetrika.js'
import { useAuth } from './context/AuthContext.jsx'
import { useIsMobileApp } from './hooks/useIsMobileApp.js'
import MobileAppShell from './mobile/MobileAppShell.jsx'
import MobileHomeScreen from './mobile/screens/MobileHomeScreen.jsx'
import MobileFavoritesScreen from './mobile/screens/MobileFavoritesScreen.jsx'
import MobileBookingsScreen from './mobile/screens/MobileBookingsScreen.jsx'
import MobileChatScreen from './mobile/screens/MobileChatScreen.jsx'
import MobileChatDetailScreen from './mobile/screens/MobileChatDetailScreen.jsx'
import MobileProfileScreen from './mobile/screens/MobileProfileScreen.jsx'
import DesktopTabRedirect from './mobile/screens/DesktopTabRedirect.jsx'

function GeolocationOnAllowedRoutes() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname !== '/' && pathname !== '/boats') return
    startSiteGeolocation()
  }, [pathname])
  return null
}

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

function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

function PrivacyPage() {
  return (
    <LegalDocumentPage
      slug="privacy_policy"
      defaultTitle="Политика конфиденциальности"
      pathForCanonical="/privacy"
    />
  )
}

function TermsPage() {
  return (
    <LegalDocumentPage
      slug="terms_of_service"
      defaultTitle="Условия использования"
      pathForCanonical="/terms"
    />
  )
}

function DesktopLayout() {
  const { pathname } = useLocation()
  const isBoatsSearch = pathname === '/boats'
  return (
    <>
      <IosAppPrompt />
      <AndroidAppPrompt />
      <SiteHeader />
      <div className={`app-outlet${isBoatsSearch ? ' app-outlet--boatsMap' : ''}`}>
        <Outlet />
      </div>
      {isBoatsSearch ? null : <SiteFooter />}
    </>
  )
}

function HomeEntry() {
  const isMobileApp = useIsMobileApp()
  return isMobileApp ? <MobileHomeScreen /> : <HomePage />
}

function FavoritesEntry() {
  const isMobileApp = useIsMobileApp()
  return isMobileApp ? <MobileFavoritesScreen /> : <DesktopTabRedirect to="/account" />
}

function BookingsEntry() {
  const isMobileApp = useIsMobileApp()
  return isMobileApp ? <MobileBookingsScreen /> : <DesktopTabRedirect to="/account" />
}

function ChatsEntry() {
  const isMobileApp = useIsMobileApp()
  return isMobileApp ? <MobileChatScreen /> : <DesktopTabRedirect to="/account" />
}

function ChatDetailEntry() {
  const isMobileApp = useIsMobileApp()
  return isMobileApp ? <MobileChatDetailScreen /> : <DesktopTabRedirect to="/account" />
}

function AccountEntry() {
  const isMobileApp = useIsMobileApp()
  const { user, loading } = useAuth()
  if (isMobileApp) return <MobileProfileScreen />
  if (loading) return <div className="bd-loading">Загружаем профиль…</div>
  if (user) return <AccountPage />
  return <Navigate to="/login" replace />
}

function AppLayout() {
  const isMobileApp = useIsMobileApp()
  return isMobileApp ? <MobileAppShell /> : <DesktopLayout />
}

export default function App() {
  return (
    <>
      <ScrollToTopOnRouteChange />
      <YandexMetrikaSpa />
      <GeolocationOnAllowedRoutes />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeEntry />} />
          <Route path="/boats" element={<BoatsSearchPage />} />
          <Route path="/boats/:boatSlug" element={<BoatDetailPage />} />
          <Route path="/owners" element={<OwnerLandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/sitemap" element={<SitemapPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/favorites" element={<FavoritesEntry />} />
          <Route path="/bookings" element={<BookingsEntry />} />
          <Route path="/chats" element={<ChatsEntry />} />
          <Route path="/chats/:chatId" element={<ChatDetailEntry />} />
          <Route path="/account" element={<AccountEntry />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
