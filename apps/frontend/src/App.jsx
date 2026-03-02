import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/Home/Home'
import RegisterPage from './pages/Home/Register'
import TeamPage from './pages/Home/Team'
import AboutPage from './pages/Home/AboutPage'
import ContactPage from './pages/Home/ContactPage'
import AdminApp from './pages/Admin/AdminApp'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/home/about" element={<AboutPage />} />
      <Route path="/home/contact" element={<ContactPage />} />
      <Route path="/home/register" element={<RegisterPage />} />
      <Route path="/home/team" element={<TeamPage />} />
      <Route path="/admin/*" element={<AdminApp />} />
    </Routes>
  )
}

export default App
