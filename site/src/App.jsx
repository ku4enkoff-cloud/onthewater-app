import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BoatsSearchPage from './pages/BoatsSearchPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/boats" element={<BoatsSearchPage />} />
    </Routes>
  )
}
