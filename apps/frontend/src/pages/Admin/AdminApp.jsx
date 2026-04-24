import { Navigate, Route, Routes } from 'react-router-dom'
import './shared/admin-shared.css'
import { AdminGuard, AdminLayout } from './legacy/AdminAppLegacy'
import managementNavGroups from './config/managementNavGroups'
import DashboardPage from './pages/DashboardPage'
import NotificationSettingsPage from './pages/NotificationSettingsPage'
import PrivilegesAdminPage from './pages/PrivilegesAdminPage'
import SelectionPage from './pages/SelectionPage'
import StaticAboutPage from './pages/StaticAboutPage'
import StaticCarouselsPage from './pages/StaticCarouselsPage'
import StaticContactsPage from './pages/StaticContactsPage'
import StaticRewardsPage from './pages/StaticRewardsPage'
import StaticSchedulePage from './pages/StaticSchedulePage'
import StaticSponsorsPage from './pages/StaticSponsorsPage'
import StaticVenuesPage from './pages/StaticVenuesPage'
import SubmissionTasksPage from './pages/SubmissionTasksPage'

function AdminAppRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout navGroups={managementNavGroups} />}>
        <Route index element={<DashboardPage />} />

        <Route path="static" element={<Navigate to="sponsors" replace />} />
        <Route path="static/sponsors" element={<StaticSponsorsPage />} />
        <Route path="static/carousels" element={<StaticCarouselsPage />} />
        <Route path="static/rewards" element={<StaticRewardsPage />} />
        <Route path="static/about" element={<StaticAboutPage />} />
        <Route path="static/schedule" element={<StaticSchedulePage />} />
        <Route path="static/venues" element={<StaticVenuesPage />} />
        <Route path="static/contacts" element={<StaticContactsPage />} />

        <Route path="review" element={<Navigate to="/admin/selection" replace />} />
        <Route path="selection" element={<SelectionPage />} />
        <Route path="submission-tasks" element={<SubmissionTasksPage />} />

        <Route path="notifications" element={<NotificationSettingsPage />} />
        <Route path="privileges" element={<PrivilegesAdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default function AdminApp() {
  return (
    <AdminGuard>
      <AdminAppRoutes />
    </AdminGuard>
  )
}
