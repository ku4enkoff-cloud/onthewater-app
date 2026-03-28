import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BoatsSearchPage from './pages/BoatsSearchPage.jsx'
import BoatDetailPage from './pages/BoatDetailPage.jsx'
import { startSiteGeolocation } from './lib/siteGeolocation.js'

export default function App() {
  useEffect(() => {
    startSiteGeolocation()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/boats" element={<BoatsSearchPage />} />
      <Route path="/boats/:boatSlug" element={<BoatDetailPage />} />
    </Routes>
  )
}
