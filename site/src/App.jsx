import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from 'react'
import { Routes, Route, useLocation, useParams, Navigate, Outlet } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BoatsSearchPage from './pages/BoatsSearchPage.jsx'
import BoatDetailPage from './pages/BoatDetailPage.jsx'
import OwnerLandingPage from './pages/OwnerLandingPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
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
import DesktopTabRedirect from './mobile/screens/DesktopTabRedirect.jsx'

// Страницы-входы из поиска не делать lazy: createRoot перерисовывает пререндер, и пока грузится чанк, контент пропадает.
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'))
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'))
const LegalDocumentPage = lazy(() => import('./pages/LegalDocumentPage.jsx'))
const SitemapPage = lazy(() => import('./pages/SitemapPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))
const MobileFavoritesScreen = lazy(() => import('./mobile/screens/MobileFavoritesScreen.jsx'))
const MobileBookingsScreen = lazy(() => import('./mobile/screens/MobileBookingsScreen.jsx'))
const MobileChatScreen = lazy(() => import('./mobile/screens/MobileChatScreen.jsx'))
const MobileChatDetailScreen = lazy(() => import('./mobile/screens/MobileChatDetailScreen.jsx'))
const MobileProfileScreen = lazy(() => import('./mobile/screens/MobileProfileScreen.jsx'))

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
  const isBoatsSearch = pathname.replace(/\/+$/, '') === '/boats'
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('site-zoom-off', isBoatsSearch)
    return () => document.documentElement.classList.remove('site-zoom-off')
  }, [isBoatsSearch])
  return (
    <>
      <IosAppPrompt />
      <AndroidAppPrompt />
      <SiteHeader />
      <div className={`app-outlet${isBoatsSearch ? ' app-outlet--boatsMap' : ''}`}>
        <Suspense fallback={<div className="bd-loading">Загружаем…</div>}>
          <Outlet />
        </Suspense>
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
  return isMobileApp ? <MobileFavoritesScreen /> : <DesktopTabRedirect to="/account?tab=favorites" />
}

function BookingsEntry() {
  const isMobileApp = useIsMobileApp()
  return isMobileApp ? <MobileBookingsScreen /> : <DesktopTabRedirect to="/account" />
}

function ChatsEntry() {
  const isMobileApp = useIsMobileApp()
  return isMobileApp ? <MobileChatScreen /> : <DesktopTabRedirect to="/account?tab=messages" />
}

function ChatDetailEntry() {
  const isMobileApp = useIsMobileApp()
  const { chatId } = useParams()
  const to = chatId ? `/account?tab=messages&chat=${encodeURIComponent(chatId)}` : '/account?tab=messages'
  return isMobileApp ? <MobileChatDetailScreen /> : <DesktopTabRedirect to={to} />
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
