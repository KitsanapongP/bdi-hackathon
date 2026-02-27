import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/Home/Home'
import RegisterPage from './pages/Home/Register'
import TeamPage from './pages/Home/Team'
import AdminApp from './pages/Admin/AdminApp'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/home/register" element={<RegisterPage />} />
      <Route path="/home/team" element={<TeamPage />} />
      <Route path="/admin/*" element={<AdminApp />} />
    </Routes>
  )
}

export default App
