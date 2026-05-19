import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import HomePage from './pages/Home/Home'
import RegisterPage from './pages/Home/Register'
import TeamPage from './pages/Home/Team'
import AboutPage from './pages/Home/AboutPage'
import ContactPage from './pages/Home/ContactPage'
import FAQPage from './pages/Home/FAQPage'
import SponsorsPage from './pages/Home/SponsorsPage'
import DatasetsPage from './pages/Home/DatasetsPage'
import VenuesPage from './pages/Home/VenuesPage'
import NotificationsPage from './pages/Home/NotificationsPage'
import AdminApp from './pages/Admin/AdminApp'
import TeamReviewPage from './pages/Review/TeamReviewPage'

function App() {
  const location = useLocation()
  const isPublicRoute = !location.pathname.startsWith('/admin')

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    document.title = 'BDI Young Innovator Hackathon'
  }, [])

  return (
    <div key={isPublicRoute ? location.pathname : 'admin-shell'} className={isPublicRoute ? 'app-route-fade' : ''}>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/home/about" element={<AboutPage />} />
        <Route path="/home/contact" element={<ContactPage />} />
        <Route path="/home/faqs" element={<FAQPage />} />
        <Route path="/home/partner" element={<SponsorsPage />} />
        <Route path="/home/sponsors" element={<Navigate to="/home/partner" replace />} />
        <Route path="/home/venues" element={<VenuesPage />} />
        <Route path="/home/datasets" element={<DatasetsPage />} />
        <Route path="/home/notifications" element={<NotificationsPage />} />
        <Route path="/home/register" element={<RegisterPage />} />
        <Route path="/login" element={<RegisterPage />} />
        <Route path="/home/team" element={<TeamPage />} />
        <Route path="/review/team/:shareId" element={<TeamReviewPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </div>
  )
}

export default App
