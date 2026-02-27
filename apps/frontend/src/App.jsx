import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/Home/Home'
import RegisterPage from './pages/Home/Register'
import TeamPage from './pages/Home/Team'
import AdminGuard from './pages/Admin/AdminGuard'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminDashboard from './pages/Admin/AdminDashboard'
import AdminStaticPage from './pages/Admin/AdminStaticPage'
import AdminRequestsPage from './pages/Admin/AdminRequestsPage'
import AdminRequestDetailPage from './pages/Admin/AdminRequestDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/home/register" element={<RegisterPage />} />
      <Route path="/home/team" element={<TeamPage />} />

      <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
        <Route index element={<AdminDashboard />} />
        <Route path="static" element={<AdminStaticPage />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="requests/:submissionId" element={<AdminRequestDetailPage />} />
      </Route>
    </Routes>
  )
}

export default App
