import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Contact,
  Crown,
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Filter,
  FolderArchive,
  Gift,
  Globe,
  History,
  LayoutDashboard,
  Link2,
  ListChecks,
  Lock,
  LogOut,
  Mail,
  Menu,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ScrollText,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  TriangleAlert,
  Upload,
  UserRoundCheck,
  UserRoundX,
  Users,
  X,
} from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'
import GameShapes from '../../components/GameShapes'
import { apiUrl } from '../../lib/api'
import {
  aboutSeed,
  approvedTeamsSeed,
  auditLogsSeed,
  dashboardDeadlines,
  dashboardStats,
  returnedTeamsSeed,
  rewardsSeed,
  reviewTeamDetailsSeed,
  reviewTeamsSeed,
  settingsSeed,
  winnersSeed,
} from './adminMockData'
import './Admin.css'

const AdminSessionContext = createContext({
  adminUser: null,
  demoMode: false,
})

const AdminToastContext = createContext({
  pushToast: () => {},
})

const adminNavGroups = [
  {
    title: 'Dashboard',
    links: [
      {
        to: '/admin',
        label: 'ภาพรวม',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Static Website',
    links: [
      {
        to: '/admin/static/sponsors',
        label: 'Sponsors',
        icon: Building2,
      },
      {
        to: '/admin/static/rewards',
        label: 'Rewards',
        icon: Gift,
      },
      {
        to: '/admin/static/about',
        label: 'About',
        icon: FileText,
      },
      {
        to: '/admin/static/schedule',
        label: 'Schedule',
        icon: Clock3,
      },
      {
        to: '/admin/static/contacts',
        label: 'Contacts',
        icon: Contact,
      },
      {
        to: '/admin/static/winners',
        label: 'Winners',
        icon: Crown,
      },
    ],
  },
  {
    title: 'Team Review',
    links: [
      {
        to: '/admin/review/queue',
        label: 'Review Queue',
        icon: ClipboardCheck,
      },
      {
        to: '/admin/review/returned',
        label: 'Returned / Waiting Fix',
        icon: RotateCcw,
      },
      {
        to: '/admin/review/approved',
        label: 'Approved Teams',
        icon: CheckCircle2,
      },
    ],
  },
  {
    title: 'System',
    links: [
      {
        to: '/admin/audit',
        label: 'Audit Logs',
        icon: ScrollText,
      },
      {
        to: '/admin/settings',
        label: 'Settings',
        icon: Settings,
      },
    ],
  },
]

const teamStateLabel = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  RETURNED: 'RETURNED',
  READY_TO_RESUBMIT: 'READY_TO_RESUBMIT',
  APPROVED: 'APPROVED',
}

const memberStateLabel = {
  PENDING: 'PENDING',
  NEED_FIX: 'NEED_FIX',
  RESUBMITTED: 'RESUBMITTED',
  APPROVED: 'APPROVED',
}

const scheduleAudienceLabel = {
  public: 'Public',
  all_users: 'All Users',
  approved_teams: 'Approved Teams',
  specific_teams: 'Specific Teams',
}

function getStatusTone(status) {
  if (status === 'APPROVED' || status === 'ENABLED') return 'success'
  if (status === 'NEED_FIX' || status === 'RETURNED' || status === 'DISABLED') return 'danger'
  if (status === 'RESUBMITTED' || status === 'READY_TO_RESUBMIT') return 'warning'
  if (status === 'IN_REVIEW') return 'info'
  return 'neutral'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function normalizeTimeInput(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.length >= 5 ? raw.slice(0, 5) : raw
}

function toTimePayload(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.length === 5 ? `${raw}:00` : raw
}

function normalizeAdminMe(payload) {
  const possible = payload?.data || payload
  const isAdmin =
    possible?.is_admin === true ||
    possible?.isAdmin === true ||
    possible?.accessRole === 'admin' ||
    possible?.user?.accessRole === 'admin'

  const user =
    possible?.user ||
    (possible?.email || possible?.userName
      ? {
          userName: possible?.userName || 'Admin',
          email: possible?.email || '-',
        }
      : null)

  return { isAdmin, user }
}

function useAdminToast() {
  return useContext(AdminToastContext)
}

function useAdminSession() {
  return useContext(AdminSessionContext)
}

function StatusBadge({ status, label }) {
  return (
    <span className={`ad-status ad-status-${getStatusTone(status)}`}>
      {label || teamStateLabel[status] || memberStateLabel[status] || status}
    </span>
  )
}

function AdminToastViewport({ toasts, onClose }) {
  return (
    <div className="ad-toast-wrap" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`ad-toast ad-toast-${toast.type}`}>
          <div className="ad-toast-text">
            <strong>{toast.title}</strong>
            {toast.description ? <span>{toast.description}</span> : null}
          </div>
          <button type="button" onClick={() => onClose(toast.id)} aria-label="close toast">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function AdminDataTable({
  rows,
  columns,
  searchKeys = [],
  searchPlaceholder = 'ค้นหา',
  filters = [],
  pageSize: initialPageSize = 25,
  emptyMessage = 'ไม่มีข้อมูล',
  defaultFilter = 'all',
  toolbarExtra = null,
  loading = false,
}) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(defaultFilter)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const filterDef = filters.find((item) => item.value === activeFilter)
    return rows.filter((row) => {
      if (keyword) {
        const matched = searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(keyword))
        if (!matched) return false
      }
      if (!filterDef || typeof filterDef.predicate !== 'function') return true
      return filterDef.predicate(row)
    })
  }, [rows, search, searchKeys, filters, activeFilter])

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const effectivePageSize = pageSize === -1 ? filteredRows.length : pageSize

  useEffect(() => {
    if (pageSize === -1) return
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages, pageSize])

  useEffect(() => {
    setPage(1)
  }, [search, activeFilter, pageSize])

  const pagedRows = useMemo(() => {
    if (pageSize === -1) return filteredRows
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  return (
    <div className="ad-table-card">
      <div className="ad-table-tools">
        <div className="ad-table-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
            placeholder={searchPlaceholder}
          />
        </div>
        {filters.length ? (
          <div className="ad-filter-row">
            <Filter size={15} />
            {filters.map((filter) => (
              <button
                type="button"
                key={filter.value}
                className={filter.value === activeFilter ? 'active' : ''}
                onClick={() => {
                  setActiveFilter(filter.value)
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        ) : null}
        {toolbarExtra}
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="ad-table-empty">กำลังโหลด...</div>
                </td>
              </tr>
            ) : pagedRows.length ? (
              pagedRows.map((row) => (
                <tr key={row.id || row.teamId || row.memberId}>
                  {columns.map((column) => (
                    <td key={`${row.id || row.teamId || row.memberId}-${column.key}`}>
                      {typeof column.render === 'function' ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <div className="ad-table-empty">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ad-table-pager">
        <div className="ad-page-size-selector">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(event.target.value === 'all' ? -1 : Number(event.target.value))
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="all">All</option>
          </select>
        </div>
        <span>
          {pageSize === -1
            ? `${filteredRows.length} rows`
            : `Page ${page} / ${totalPages} (${filteredRows.length} rows)`}
        </span>
        <div>
          <button type="button" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" disabled={pageSize === -1 || page === totalPages} onClick={() => setPage((prev) => prev + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailDrawer({ open, title, subtitle, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ad-drawer-layer" role="dialog" aria-modal="true">
      <button type="button" className="ad-drawer-backdrop" onClick={onClose} aria-label="close drawer" />
      <aside className="ad-drawer">
        <header>
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="ad-drawer-body">{children}</div>
      </aside>
    </div>
  )
}

function FileListViewer({ files, teamCode, memberName }) {
  const { pushToast } = useAdminToast()
  const [selectedFileId, setSelectedFileId] = useState(files[0]?.fileId ?? null)
  const selectedFile = files.find((item) => item.fileId === selectedFileId) || files[0]

  useEffect(() => {
    setSelectedFileId(files[0]?.fileId ?? null)
  }, [files])

  return (
    <div className="ad-file-viewer">
      <div className="ad-file-header">
        <h4>Verification Files</h4>
        <div>
          <button
            type="button"
            onClick={() =>
              pushToast({
                type: 'info',
                title: 'กำลังเตรียม zip',
                description: `ดาวน์โหลดโฟลเดอร์ทีม ${teamCode}`,
              })
            }
          >
            <FolderArchive size={14} />
            Team Folder (.zip)
          </button>
          <button
            type="button"
            onClick={() =>
              pushToast({
                type: 'info',
                title: 'กำลังเตรียม zip',
                description: `ดาวน์โหลดโฟลเดอร์สมาชิก ${memberName}`,
              })
            }
          >
            <FolderArchive size={14} />
            Member Folder (.zip)
          </button>
        </div>
      </div>

      <div className="ad-file-list">
        {files.map((file) => (
          <button
            type="button"
            key={file.fileId}
            className={file.fileId === selectedFile?.fileId ? 'active' : ''}
            onClick={() => setSelectedFileId(file.fileId)}
          >
            <div>
              <strong>{file.filename}</strong>
              <span>
                {file.type} • {formatFileSize(file.size)}
              </span>
              <span>uploaded: {formatDateTime(file.uploadedAt)}</span>
            </div>
            <div className="ad-file-actions">
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation()
                  pushToast({
                    type: 'success',
                    title: 'Preview ready',
                    description: `${file.filename}`,
                  })
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.stopPropagation()
                    pushToast({
                      type: 'success',
                      title: 'Preview ready',
                      description: `${file.filename}`,
                    })
                  }
                }}
              >
                <Eye size={14} />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation()
                  pushToast({
                    type: 'info',
                    title: 'Download started',
                    description: file.filename,
                  })
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.stopPropagation()
                    pushToast({
                      type: 'info',
                      title: 'Download started',
                      description: file.filename,
                    })
                  }
                }}
              >
                <Download size={14} />
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="ad-file-preview">
        <h5>Inline Preview</h5>
        {selectedFile ? (
          <div className="ad-file-preview-box">
            {selectedFile.type.startsWith('image/') ? <FileImage size={28} /> : null}
            {selectedFile.type.includes('pdf') ? <FileType2 size={28} /> : null}
            {selectedFile.type.includes('spreadsheet') ? <FileSpreadsheet size={28} /> : null}
            {!selectedFile.type.startsWith('image/') &&
            !selectedFile.type.includes('pdf') &&
            !selectedFile.type.includes('spreadsheet') ? (
              <FileText size={28} />
            ) : null}
            <strong>{selectedFile.filename}</strong>
            <span>{selectedFile.type}</span>
            <small>หน้านี้เป็น UI mockup สำหรับ flow preview/download</small>
          </div>
        ) : (
          <div className="ad-file-preview-box">
            <span>ไม่มีไฟล์</span>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHeading({ title, description, right = null }) {
  return (
    <header className="ad-section-head">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {right}
    </header>
  )
}

function AdminGuard({ children }) {
  const [state, setState] = useState({
    loading: true,
    allowed: false,
    user: null,
    demoMode: false,
  })

  useEffect(() => {
    let active = true

    async function run() {
      try {
        const response = await fetch(apiUrl('/api/admin/me'), { credentials: 'include' })
        const payload = await response.json().catch(() => ({}))
        const normalized = normalizeAdminMe(payload)
        if (!active) return

        if (response.ok && normalized.isAdmin) {
          const userData = normalized.user || payload.user
          if (userData) {
            localStorage.setItem('gt_user', JSON.stringify(userData))
          }
          setState({
            loading: false,
            allowed: true,
            user: userData,
            demoMode: false,
          })
          return
        }

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('gt_user')
        }
      } catch {
        localStorage.removeItem('gt_user')
      }

      setState({
        loading: false,
        allowed: false,
        user: null,
        demoMode: false,
      })
    }

    run()
    return () => {
      active = false
    }
  }, [])

  if (state.loading) {
    return (
      <div className="ad-gate-screen">
        <RefreshCw size={20} className="spin" />
        <span>Checking admin capability...</span>
      </div>
    )
  }

  if (!state.allowed) {
    return <Navigate to="/home" replace />
  }

  return (
    <AdminSessionContext.Provider value={{ adminUser: state.user, demoMode: state.demoMode }}>
      {children}
    </AdminSessionContext.Provider>
  )
}

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { adminUser, demoMode } = useAdminSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toasts, setToasts] = useState([])

  useEffect(() => setMobileOpen(false), [location.pathname])

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random()}`
    const next = {
      id,
      type: toast.type || 'success',
      title: toast.title || '',
      description: toast.description || '',
    }
    setToasts((prev) => [...prev, next])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 3200)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const pageLabel = useMemo(() => {
    const map = {
      '/admin': 'Admin Dashboard',
      '/admin/static/sponsors': 'Static Website / Sponsors',
      '/admin/static/rewards': 'Static Website / Rewards',
      '/admin/static/about': 'Static Website / About',
      '/admin/static/schedule': 'Static Website / Schedule',
      '/admin/static/contacts': 'Static Website / Contacts',
      '/admin/static/winners': 'Static Website / Winners',
      '/admin/review/queue': 'Team Review / Queue',
      '/admin/review/returned': 'Team Review / Returned',
      '/admin/review/approved': 'Team Review / Approved',
      '/admin/audit': 'Audit Logs',
      '/admin/settings': 'Settings',
    }
    if (location.pathname.startsWith('/admin/review/teams/')) return 'Team Review / Detail'
    return map[location.pathname] || 'Admin'
  }, [location.pathname])

  const handleLogout = async () => {
    try {
      await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' })
    } catch {
      // no-op for mockup
    }
    localStorage.removeItem('gt_user')
    navigate('/home', { replace: true })
  }

  return (
    <AdminToastContext.Provider value={{ pushToast }}>
      <div className="ad-page">
        <GameShapes
          shapeCount={22}
          sizeRange={[20, 42]}
          depthLayers={2}
          interactionRadius={95}
          minDistance={120}
          seed={15}
        />

        <div className={`ad-shell ${mobileOpen ? 'mobile-open' : ''}`}>
          <aside className="ad-sidebar">
            <div className="ad-brand">
              <div className="ad-brand-icon">
                <ShieldAlert size={18} />
              </div>
              <div>
                <strong>Hackathon Admin</strong>
                <span>Management Console</span>
              </div>
            </div>

            <nav>
              {adminNavGroups.map((group) => (
                <div key={group.title} className="ad-nav-group">
                  <span>{group.title}</span>
                  {group.links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/admin'}
                      className={({ isActive }) => (isActive ? 'active' : '')}
                    >
                      <link.icon size={16} />
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </aside>

          <div className="ad-main">
            <header className="ad-topbar">
              <button type="button" className="ad-menu-btn" onClick={() => setMobileOpen((prev) => !prev)}>
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div className="ad-topbar-title">
                <h1>{pageLabel}</h1>
                {demoMode ? (
                  <span>
                    <TriangleAlert size={14} />
                    Demo gate: backend `/api/admin/me` ยังไม่เชื่อม
                  </span>
                ) : null}
              </div>
              <div className="ad-topbar-right">
                <ThemeToggle />
                <div className="ad-user-chip">
                  <strong>{adminUser?.userName || adminUser?.name || 'Admin User'}</strong>
                  <span>{adminUser?.email || '-'}</span>
                </div>
                <button type="button" onClick={handleLogout} className="ad-logout-btn">
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            </header>

            <main className="ad-content">
              <Outlet />
            </main>
          </div>
        </div>
        <AdminToastViewport toasts={toasts} onClose={removeToast} />
      </div>
    </AdminToastContext.Provider>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  return (
    <div className="ad-stack">
      <SectionHeading
        title="Admin Dashboard"
        description="ภาพรวมคิวตรวจสอบทีม, สถานะการแก้ไข และการจัดการเนื้อหาเว็บ"
        right={
          <button type="button" className="ad-btn ad-btn-primary" onClick={() => navigate('/admin/review/queue')}>
            <ClipboardCheck size={15} />
            เปิด Review Queue
          </button>
        }
      />

      <section className="ad-stat-grid">
        {dashboardStats.map((item) => (
          <article key={item.id} className={`ad-stat-card ${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </article>
        ))}
      </section>

      <section className="ad-two-col">
        <article className="ad-panel">
          <h3>
            <Clock3 size={17} />
            Upcoming Deadlines
          </h3>
          <div className="ad-timeline-mini">
            {dashboardDeadlines.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{formatDateTime(item.at)}</span>
                </div>
                <StatusBadge status={item.status === 'upcoming' ? 'IN_REVIEW' : 'SUBMITTED'} />
              </div>
            ))}
          </div>
        </article>

        <article className="ad-panel">
          <h3>
            <History size={17} />
            Recent Audit Activity
          </h3>
          <div className="ad-list-mini">
            {auditLogsSeed.slice(0, 4).map((item) => (
              <div key={item.id}>
                <strong>{item.actionType}</strong>
                <span>
                  {item.actor} • {formatDateTime(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="ad-panel">
        <h3>
          <ListChecks size={17} />
          Fast Links
        </h3>
        <div className="ad-quick-grid">
          <button type="button" onClick={() => navigate('/admin/static/sponsors')}>
            <Building2 size={16} />
            Manage Sponsors
          </button>
          <button type="button" onClick={() => navigate('/admin/static/winners')}>
            <Crown size={16} />
            Manage Winners
          </button>
          <button type="button" onClick={() => navigate('/admin/static/schedule')}>
            <Clock3 size={16} />
            Manage Schedule
          </button>
          <button type="button" onClick={() => navigate('/admin/review/returned')}>
            <RotateCcw size={16} />
            Returned Monitor
          </button>
          <button type="button" onClick={() => navigate('/admin/settings')}>
            <Settings size={16} />
            Site Settings
          </button>
        </div>
      </section>
    </div>
  )
}

function StaticSponsorsPage() {
  const { pushToast } = useAdminToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    sponsorNameEn: '',
    sponsorNameTh: '',
    websiteUrl: '',
    tierCode: 'co_organizer',
    tierNameTh: 'ผู้ร่วมจัด',
    tierNameEn: 'Co-Organizer',
    sortOrder: 1,
    isEnabled: true,
    logoStorageKey: '',
    logoFile: null,
    logoFileName: '',
    logoType: '',
    logoSize: 0,
  })

  const fetchSponsors = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/sponsors'), { credentials: 'include' })
      const data = await response.json()
      if (data.ok) {
        setItems(
          data.data.map((item) => ({
            id: item.id,
            name: item.name,
            nameTh: item.nameTh,
            link: item.link,
            displayOrder: item.displayOrder,
            isActive: item.isActive,
            logo: item.logo,
            logoMeta: item.logoMeta,
            tierCode: item.tierCode,
            tierNameTh: item.tierNameTh,
            tierNameEn: item.tierNameEn,
          }))
        )
      }
    } catch (err) {
      console.error('Failed to fetch sponsors:', err)
      pushToast({ type: 'error', title: 'ไม่สามารถโหลดข้อมูล sponsor ได้' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchSponsors()
  }, [fetchSponsors])

  const openCreate = () => {
    setEditingId(null)
    setErrors({})
    setForm({
      sponsorNameEn: '',
      sponsorNameTh: '',
      websiteUrl: '',
      tierCode: 'co_organizer',
      tierNameTh: 'ผู้ร่วมจัด',
      tierNameEn: 'Co-Organizer',
      sortOrder: items.length + 1,
      isEnabled: true,
      logoStorageKey: '',
      logoFile: null,
      logoFileName: '',
      logoType: '',
      logoSize: 0,
    })
    setDrawerOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setErrors({})
    setForm({
      sponsorNameEn: item.name || '',
      sponsorNameTh: item.nameTh || '',
      websiteUrl: item.link || '',
      tierCode: item.tierCode || 'co_organizer',
      tierNameTh: item.tierNameTh || 'ผู้ร่วมจัด',
      tierNameEn: item.tierNameEn || 'Co-Organizer',
      sortOrder: item.displayOrder,
      isEnabled: item.isActive,
      logoStorageKey: item.logo || '',
      logoFile: null,
      logoFileName: item.logo?.split('/').pop() || '',
      logoType: item.logoMeta?.type || '',
      logoSize: (item.logoMeta?.sizeKb || 0) * 1024,
    })
    setDrawerOpen(true)
  }

  const tierFolder = (form.tierCode || 'co_organizer').replace(/_/g, '-')
  const previewLogoStorageKey = form.logoFileName
    ? `/static/content/sponsors/${tierFolder}/${form.logoFileName}`
    : form.logoStorageKey

  const validate = () => {
    const next = {}
    if (!form.sponsorNameEn.trim()) next.sponsorNameEn = 'กรุณากรอก sponsor_name_en'
    if (!form.sponsorNameTh.trim()) next.sponsorNameTh = 'กรุณากรอก sponsor_name_th'
    if (!form.tierCode.trim()) next.tierCode = 'กรุณากรอก tier_code'
    if (!editingId && !form.logoFile) next.logo = 'กรุณาอัปโหลดโลโก้'
    if (form.logoFile && !form.logoFileName.trim()) next.logoFileName = 'กรุณาตั้งชื่อไฟล์ก่อนอัปโหลด'
    if (form.logoType && !['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(form.logoType)) {
      next.logo = 'รองรับเฉพาะ PNG/JPG/WEBP/SVG'
    }
    if (form.logoSize > 4 * 1024 * 1024) next.logo = 'ไฟล์ต้องไม่เกิน 4 MB'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async () => {
    if (!validate()) return
    const payload = {
      name: form.sponsorNameEn.trim(),
      nameTh: form.sponsorNameTh.trim(),
      link: form.websiteUrl.trim() || null,
      displayOrder: Number(form.sortOrder),
      isActive: form.isEnabled,
      tierCode: form.tierCode.trim(),
      tierNameTh: form.tierNameTh.trim() || null,
      tierNameEn: form.tierNameEn.trim() || null,
    }

    const uploadLogoIfNeeded = async (sponsorId) => {
      if (!form.logoFile) return
      const formData = new FormData()
      formData.append('file', form.logoFile)
      formData.append('fileName', form.logoFileName.trim())
      formData.append('tierCode', form.tierCode.trim())

      const uploadResponse = await fetch(apiUrl(`/api/admin/sponsors/${sponsorId}/logo`), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const uploadData = await uploadResponse.json()
      if (!uploadData.ok) {
        throw new Error(uploadData.message || 'Logo upload failed')
      }
    }

    try {
      if (editingId) {
        const response = await fetch(apiUrl(`/api/admin/sponsors/${editingId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (data.ok) {
          await uploadLogoIfNeeded(editingId)
          pushToast({ title: 'อัปเดต Sponsor สำเร็จ', description: form.sponsorNameEn })
          fetchSponsors()
        } else {
          pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
        }
      } else {
        const response = await fetch(apiUrl('/api/admin/sponsors'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...payload,
            logo: previewLogoStorageKey,
          }),
        })
        const data = await response.json()
        if (data.ok) {
          await uploadLogoIfNeeded(data.data.id)
          pushToast({ title: 'เพิ่ม Sponsor สำเร็จ', description: form.sponsorNameEn })
          fetchSponsors()
        } else {
          pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
        }
      }
    } catch (err) {
      console.error('Failed to save sponsor:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึก' })
    }
    setDrawerOpen(false)
  }

  const remove = async (id) => {
    const target = items.find((item) => item.id === id)
    try {
      const response = await fetch(apiUrl(`/api/admin/sponsors/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (data.ok) {
        pushToast({
          type: 'warning',
          title: 'ลบ Sponsor แล้ว',
          description: target?.name || '',
        })
        fetchSponsors()
      } else {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
      }
    } catch (err) {
      console.error('Failed to delete sponsor:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบ' })
    }
  }

  const moveItem = async (id, direction) => {
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= items.length) return

    const next = [...items]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    const reordered = next.map((item, idx) => ({ ...item, displayOrder: idx + 1 }))
    setItems(reordered)

    try {
      const updates = reordered.map((item) => ({ id: item.id, displayOrder: item.displayOrder }))
      await fetch(apiUrl('/api/admin/sponsors/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
    } catch (err) {
      console.error('Failed to reorder sponsors:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับ' })
      fetchSponsors()
    }
  }

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Static Content: Sponsors"
        description=""
        right={
          <button type="button" className="ad-btn ad-btn-primary" onClick={openCreate}>
            <Plus size={15} />
            Add Sponsor
          </button>
        }
      />

      <AdminDataTable
        loading={loading}
        rows={[...items].sort((a, b) => a.displayOrder - b.displayOrder)}
        searchKeys={['name', 'link']}
        searchPlaceholder="ค้นหาชื่อ sponsor หรือลิงก์"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'Active', value: 'active', predicate: (row) => row.isActive },
          { label: 'Inactive', value: 'inactive', predicate: (row) => !row.isActive },
        ]}
        columns={[
          {
            key: 'logo',
            label: 'Logo + Name',
            render: (row) => (
              <div className="ad-inline-logo">
                <img src={apiUrl(row.logo)} alt={row.name} loading="lazy" decoding="async" />
                <div>
                  <strong>{row.name}</strong>
                  <span>{row.logoMeta?.type || '-'}</span>
                </div>
              </div>
            ),
          },
          {
            key: 'link',
            label: 'Link',
            render: (row) => (
              row.link ? (
                <a href={row.link} target="_blank" rel="noreferrer" className="ad-link">
                  <Link2 size={13} />
                  {row.link}
                </a>
              ) : (
                <span>-</span>
              )
            ),
          },
          {
            key: 'displayOrder',
            label: 'Display Order',
          },
          {
            key: 'isActive',
            label: 'Status',
            render: (row) => <StatusBadge status={row.isActive ? 'APPROVED' : 'RETURNED'} label={row.isActive ? 'Enable' : 'Disable'} />,
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="ad-row-actions">
                <button type="button" onClick={() => moveItem(row.id, 'up')} aria-label="move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => moveItem(row.id, 'down')} aria-label="move down">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => openEdit(row)} aria-label="edit">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => remove(row.id)} aria-label="delete">
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'Edit Sponsor' : 'Create Sponsor'}
        subtitle="รองรับการอัปโหลดโลโก้และตรวจสอบไฟล์ภาพ"
      >
        <div className="ad-form">
          <label htmlFor="sponsor-name-en">
            sponsor_name_en *
            <input
              id="sponsor-name-en"
              value={form.sponsorNameEn}
              onChange={(event) => setForm((prev) => ({ ...prev, sponsorNameEn: event.target.value }))}
            />
            {errors.sponsorNameEn ? <small>{errors.sponsorNameEn}</small> : null}
          </label>

          <label htmlFor="sponsor-name-th">
            sponsor_name_th *
            <input
              id="sponsor-name-th"
              value={form.sponsorNameTh}
              onChange={(event) => setForm((prev) => ({ ...prev, sponsorNameTh: event.target.value }))}
            />
            {errors.sponsorNameTh ? <small>{errors.sponsorNameTh}</small> : null}
          </label>

          <label htmlFor="sponsor-website-url">
            website_url
            <input
              id="sponsor-website-url"
              value={form.websiteUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
            />
          </label>

          <label htmlFor="sponsor-tier-code">
            tier_code *
            <input
              id="sponsor-tier-code"
              value={form.tierCode}
              onChange={(event) => setForm((prev) => ({ ...prev, tierCode: event.target.value }))}
            />
            {errors.tierCode ? <small>{errors.tierCode}</small> : null}
          </label>

          <label htmlFor="sponsor-tier-name-th">
            tier_name_th
            <input
              id="sponsor-tier-name-th"
              value={form.tierNameTh}
              onChange={(event) => setForm((prev) => ({ ...prev, tierNameTh: event.target.value }))}
            />
          </label>

          <label htmlFor="sponsor-tier-name-en">
            tier_name_en
            <input
              id="sponsor-tier-name-en"
              value={form.tierNameEn}
              onChange={(event) => setForm((prev) => ({ ...prev, tierNameEn: event.target.value }))}
            />
          </label>

          <label htmlFor="sponsor-order">
            sort_order
            <input
              id="sponsor-order"
              type="number"
              min={1}
              value={form.sortOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
            />
          </label>

          <label htmlFor="sponsor-logo">
            Logo Upload {editingId ? '(optional)' : '*'}
            <input
              id="sponsor-logo"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setForm((prev) => ({
                  ...prev,
                  logoFile: file,
                  logoFileName: file.name,
                  logoType: file.type,
                  logoSize: file.size,
                }))
              }}
            />
            {form.logoFileName ? (
              <span className="ad-file-chip">
                <Upload size={13} />
                {form.logoFileName}
              </span>
            ) : null}
            {errors.logo ? <small>{errors.logo}</small> : null}
          </label>

          <label htmlFor="sponsor-logo-file-name">
            Logo File Name
            <input
              id="sponsor-logo-file-name"
              value={form.logoFileName}
              placeholder="example-logo.png"
              onChange={(event) => setForm((prev) => ({ ...prev, logoFileName: event.target.value }))}
            />
            {errors.logoFileName ? <small>{errors.logoFileName}</small> : null}
          </label>

          <label htmlFor="sponsor-logo-key">
            logo_storage_key
            <input
              id="sponsor-logo-key"
              value={previewLogoStorageKey}
              readOnly
            />
          </label>

          <div className="ad-toggle-row">
            <label htmlFor="sponsor-active" className="ad-toggle-label">
              Status
            </label>
            <label className="ad-toggle">
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(event) => setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span className="ad-toggle-switch"></span>
              <span className="ad-toggle-text">{form.isEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <div className="ad-form-actions">
            <button type="button" className="ad-btn" onClick={() => setDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={onSubmit}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}

function StaticRewardsPage() {
  const { pushToast } = useAdminToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    rank: 1,
    title: '',
    titleTh: '',
    amount: '',
    currency: 'THB',
    prizeTextTh: '',
    prizeTextEn: '',
    descriptionTh: '',
    descriptionEn: '',
    isActive: true,
  })

  const [errors, setErrors] = useState({})

  const fetchRewards = async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/rewards'), { credentials: 'include' })
      const data = await response.json()
      if (data.ok) {
        setItems(
          data.data.map((item) => ({
            id: item.id,
            rank: item.rank,
            title: item.title,
            titleTh: item.titleTh,
            amount: item.amount,
            currency: item.currency,
            prizeTextTh: item.prizeTextTh,
            prizeTextEn: item.prizeTextEn,
            descriptionTh: item.descriptionTh,
            descriptionEn: item.descriptionEn,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }))
        )
      }
    } catch (err) {
      console.error('Failed to fetch rewards:', err)
      pushToast({ type: 'error', title: 'ไม่สามารถโหลดข้อมูลรางวัลได้' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRewards()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      rank: items.length + 1,
      title: '',
      titleTh: '',
      amount: '',
      currency: 'THB',
      prizeTextTh: '',
      prizeTextEn: '',
      descriptionTh: '',
      descriptionEn: '',
      isActive: true,
    })
    setErrors({})
    setDrawerOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({
      rank: item.rank,
      title: item.title,
      titleTh: item.titleTh || '',
      amount: item.amount ?? '',
      currency: item.currency ?? 'THB',
      prizeTextTh: item.prizeTextTh || '',
      prizeTextEn: item.prizeTextEn || '',
      descriptionTh: item.descriptionTh || '',
      descriptionEn: item.descriptionEn || '',
      isActive: item.isActive,
    })
    setErrors({})
    setDrawerOpen(true)
  }

  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'กรุณากรอกหัวข้อรางวัล'
    if (Number(form.amount) <= 0) next.amount = 'จำนวนเงินต้องมากกว่า 0'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!validate()) return

    const payload = {
      rank: String(form.rank),
      title: form.title.trim(),
      titleTh: form.titleTh.trim() || form.title.trim(),
      amount: form.amount ? Number(form.amount) : null,
      currency: form.currency.trim() || null,
      prizeTextTh: form.prizeTextTh.trim() || null,
      prizeTextEn: form.prizeTextEn.trim() || null,
      descriptionTh: form.descriptionTh.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
      isActive: form.isActive,
    }

    try {
      const url = editingId
        ? apiUrl(`/api/admin/rewards/${editingId}`)
        : apiUrl('/api/admin/rewards')
      const method = editingId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (data.ok) {
        pushToast({ title: editingId ? 'อัปเดตรางวัลสำเร็จ' : 'เพิ่มรางวัลสำเร็จ' })
        await fetchRewards()
      } else {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
      }
    } catch (err) {
      console.error('Failed to save reward:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึก' })
    }
    setDrawerOpen(false)
  }

  const remove = async (id) => {
    try {
      const response = await fetch(apiUrl(`/api/admin/rewards/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (data.ok) {
        pushToast({ type: 'warning', title: 'ลบรางวัลแล้ว' })
        await fetchRewards()
      } else {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
      }
    } catch (err) {
      console.error('Failed to delete reward:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบ' })
    }
  }

  const moveItem = async (id, direction) => {
    const sorted = [...items].sort((a, b) => (a.sortOrder || a.rank) - (b.sortOrder || b.rank))
    const index = sorted.findIndex((item) => item.id === id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return

    const itemA = sorted[index]
    const itemB = sorted[swapIndex]

    try {
      await Promise.all([
        fetch(apiUrl(`/api/admin/rewards/${itemA.id}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sortOrder: itemB.sortOrder || itemB.rank }),
        }),
        fetch(apiUrl(`/api/admin/rewards/${itemB.id}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sortOrder: itemA.sortOrder || itemA.rank }),
        }),
      ])
      await fetchRewards()
    } catch (err) {
      console.error('Failed to reorder rewards:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการเรียงลำดับ' })
    }
  }

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Static Content: Rewards"
        description=""
        right={
          <button type="button" className="ad-btn ad-btn-primary" onClick={openCreate}>
            <Plus size={15} />
            Add Reward
          </button>
        }
      />

      <AdminDataTable
        rows={[...items].sort((a, b) => (a.sortOrder || a.rank) - (b.sortOrder || b.rank))}
        searchKeys={['title', 'titleTh', 'descriptionTh', 'descriptionEn']}
        searchPlaceholder="ค้นหา reward title / description"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'Enabled', value: 'active', predicate: (row) => row.isActive },
          { label: 'Disabled', value: 'inactive', predicate: (row) => !row.isActive },
        ]}
        columns={[
          { key: 'rank', label: 'Rank' },
          {
            key: 'title',
            label: 'Title',
            render: (row) => (
              <div>
                <div>{row.titleTh || row.title}</div>
                {(row.titleTh && row.title) && <div className="ad-text-muted">{row.title}</div>}
              </div>
            ),
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => row.amount ? Number(row.amount).toLocaleString('th-TH') : '-',
          },
          {
            key: 'currency',
            label: 'Currency',
            render: (row) => row.currency || '-',
          },
          {
            key: 'sortOrder',
            label: 'Order',
          },
          {
            key: 'isActive',
            label: 'Status',
            render: (row) => <StatusBadge status={row.isActive ? 'ENABLED' : 'DISABLED'} />,
          },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <div className="ad-row-actions">
                <button type="button" onClick={() => moveItem(row.id, 'up')} aria-label="move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => moveItem(row.id, 'down')} aria-label="move down">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => openEdit(row)} aria-label="edit">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => remove(row.id)} aria-label="delete">
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'Edit Reward' : 'Create Reward'}
        subtitle="ฟอร์มมี required validation และคง format ที่พร้อมต่อ API"
      >
        <div className="ad-form">
          <label htmlFor="reward-rank">
            Rank
            <input
              id="reward-rank"
              type="number"
              min={1}
              value={form.rank}
              onChange={(event) => setForm((prev) => ({ ...prev, rank: event.target.value }))}
            />
          </label>
          <label htmlFor="reward-title">
            Title (English) *
            <input
              id="reward-title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            {errors.title ? <small>{errors.title}</small> : null}
          </label>
          <label htmlFor="reward-title-th">
            Title (Thai)
            <input
              id="reward-title-th"
              value={form.titleTh}
              onChange={(event) => setForm((prev) => ({ ...prev, titleTh: event.target.value }))}
            />
          </label>
          <label htmlFor="reward-amount">
            Amount *
            <input
              id="reward-amount"
              type="number"
              min={0}
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
            {errors.amount ? <small>{errors.amount}</small> : null}
          </label>
          <label htmlFor="reward-currency">
            Currency
            <input
              id="reward-currency"
              value={form.currency}
              onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
            />
          </label>
          <label htmlFor="reward-prize-text-th">
            Prize Text (Thai)
            <input
              id="reward-prize-text-th"
              value={form.prizeTextTh}
              placeholder="เช่น พร้อมถ้วย, โล่ + ของรางวัล"
              onChange={(event) => setForm((prev) => ({ ...prev, prizeTextTh: event.target.value }))}
            />
          </label>
          <label htmlFor="reward-prize-text-en">
            Prize Text (English)
            <input
              id="reward-prize-text-en"
              value={form.prizeTextEn}
              placeholder="e.g. with trophy, shield + prize"
              onChange={(event) => setForm((prev) => ({ ...prev, prizeTextEn: event.target.value }))}
            />
          </label>
          <label htmlFor="reward-description-th">
            Description (Thai)
            <textarea
              id="reward-description-th"
              rows={3}
              value={form.descriptionTh}
              onChange={(event) => setForm((prev) => ({ ...prev, descriptionTh: event.target.value }))}
            />
          </label>
          <label htmlFor="reward-description-en">
            Description (English)
            <textarea
              id="reward-description-en"
              rows={3}
              value={form.descriptionEn}
              onChange={(event) => setForm((prev) => ({ ...prev, descriptionEn: event.target.value }))}
            />
          </label>
          <div className="ad-toggle-row">
            <label htmlFor="reward-active" className="ad-toggle-label">
              Status
            </label>
            <label className="ad-toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              <span className="ad-toggle-switch"></span>
              <span className="ad-toggle-text">{form.isActive ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <div className="ad-form-actions">
            <button type="button" className="ad-btn" onClick={() => setDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={save}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}

function renderMarkdownSimple(text) {
  return text.split('\n').map((line, index) => {
    if (line.startsWith('# ')) return <h3 key={`${line}-${index}`}>{line.slice(2)}</h3>
    if (line.startsWith('## ')) return <h4 key={`${line}-${index}`}>{line.slice(3)}</h4>
    if (line.startsWith('- ')) return <li key={`${line}-${index}`}>{line.slice(2)}</li>
    if (!line.trim()) return <br key={`${line}-${index}`} />
    return <p key={`${line}-${index}`}>{line}</p>
  })
}

function StaticAboutPage() {
  const { pushToast } = useAdminToast()
  const [contentTh, setContentTh] = useState(aboutSeed.contentTh)
  const [contentEn, setContentEn] = useState(aboutSeed.contentEn)
  const [tab, setTab] = useState('editor')
  const [lang, setLang] = useState('th')

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Static Content: About"
        description="Rich text editor (Markdown) + Preview mode รองรับ TH/EN"
        right={
          <button
            type="button"
            className="ad-btn ad-btn-primary"
            onClick={() =>
              pushToast({
                title: 'บันทึก About content แล้ว',
                description: 'พร้อมเชื่อม API PUT /api/admin/about',
              })
            }
          >
            <Save size={15} />
            Save About
          </button>
        }
      />

      <div className="ad-tab-row">
        <button type="button" className={tab === 'editor' ? 'active' : ''} onClick={() => setTab('editor')}>
          Editor
        </button>
        <button type="button" className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
          Preview
        </button>
      </div>

      <div className="ad-tab-row">
        <button type="button" className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>
          ภาษาไทย
        </button>
        <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
          English
        </button>
      </div>

      {tab === 'editor' ? (
        <article className="ad-panel">
          <label htmlFor="about-editor" className="ad-label">
            Markdown Content ({lang.toUpperCase()})
          </label>
          <textarea
            id="about-editor"
            rows={16}
            value={lang === 'th' ? contentTh : contentEn}
            onChange={(event) => (lang === 'th' ? setContentTh(event.target.value) : setContentEn(event.target.value))}
          />
        </article>
      ) : (
        <article className="ad-panel ad-markdown-preview">{renderMarkdownSimple(lang === 'th' ? contentTh : contentEn)}</article>
      )}
    </div>
  )
}

function StaticContactsPage() {
  const { pushToast } = useAdminToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false)
  const [channelDrawerOpen, setChannelDrawerOpen] = useState(false)
  const [editingContactId, setEditingContactId] = useState(null)
  const [editingChannelId, setEditingChannelId] = useState(null)
  const [contactErrors, setContactErrors] = useState({})
  const [channelErrors, setChannelErrors] = useState({})
  const [contactForm, setContactForm] = useState({
    displayNameTh: '',
    displayNameEn: '',
    roleTh: '',
    roleEn: '',
    organizationTh: '',
    organizationEn: '',
    departmentTh: '',
    departmentEn: '',
    bioTh: '',
    bioEn: '',
    avatarUrl: '',
    avatarAltTh: '',
    avatarAltEn: '',
    isFeatured: false,
    sortOrder: 1,
    isEnabled: true,
    publishedAt: '',
  })
  const [channelForm, setChannelForm] = useState({
    channelType: 'email',
    labelTh: '',
    labelEn: '',
    value: '',
    url: '',
    isPrimary: false,
    sortOrder: 10,
    isEnabled: true,
  })

  const sortedContacts = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [items],
  )

  const selectedContact = useMemo(
    () => sortedContacts.find((item) => item.id === selectedContactId) || null,
    [selectedContactId, sortedContacts],
  )

  const selectedChannels = useMemo(() => {
    if (!selectedContact) return []
    return [...(selectedContact.channels || [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
  }, [selectedContact])

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/contacts'), { credentials: 'include' })
      const data = await response.json()
      if (data.ok) {
        setItems(data.data || [])
      } else {
        pushToast({ type: 'error', title: data.message || 'ไม่สามารถโหลด contact ได้' })
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
      pushToast({ type: 'error', title: 'ไม่สามารถโหลด contact ได้' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const openCreateContact = () => {
    setEditingContactId(null)
    setContactErrors({})
    setContactForm({
      displayNameTh: '',
      displayNameEn: '',
      roleTh: '',
      roleEn: '',
      organizationTh: '',
      organizationEn: '',
      departmentTh: '',
      departmentEn: '',
      bioTh: '',
      bioEn: '',
      avatarUrl: '',
      avatarAltTh: '',
      avatarAltEn: '',
      isFeatured: false,
      sortOrder: sortedContacts.length + 1,
      isEnabled: true,
      publishedAt: formatDateInput(new Date().toISOString()),
    })
    setContactDrawerOpen(true)
  }

  const openEditContact = (item) => {
    setEditingContactId(item.id)
    setContactErrors({})
    setContactForm({
      displayNameTh: item.displayNameTh || '',
      displayNameEn: item.displayNameEn || '',
      roleTh: item.roleTh || '',
      roleEn: item.roleEn || '',
      organizationTh: item.organizationTh || '',
      organizationEn: item.organizationEn || '',
      departmentTh: item.departmentTh || '',
      departmentEn: item.departmentEn || '',
      bioTh: item.bioTh || '',
      bioEn: item.bioEn || '',
      avatarUrl: item.avatarUrl || '',
      avatarAltTh: item.avatarAltTh || '',
      avatarAltEn: item.avatarAltEn || '',
      isFeatured: Boolean(item.isFeatured),
      sortOrder: item.sortOrder || 1,
      isEnabled: Boolean(item.isEnabled),
      publishedAt: formatDateInput(item.publishedAt),
    })
    setContactDrawerOpen(true)
  }

  const validateContact = () => {
    const next = {}
    if (!contactForm.displayNameTh.trim()) next.displayNameTh = 'กรุณากรอก display_name_th'
    if (!contactForm.displayNameEn.trim()) next.displayNameEn = 'กรุณากรอก display_name_en'
    if (Number(contactForm.sortOrder) < 1) next.sortOrder = 'sort_order ต้องมากกว่าหรือเท่ากับ 1'
    setContactErrors(next)
    return Object.keys(next).length === 0
  }

  const saveContact = async () => {
    if (!validateContact()) return

    const payload = {
      displayNameTh: contactForm.displayNameTh.trim(),
      displayNameEn: contactForm.displayNameEn.trim(),
      roleTh: contactForm.roleTh.trim() || null,
      roleEn: contactForm.roleEn.trim() || null,
      organizationTh: contactForm.organizationTh.trim() || null,
      organizationEn: contactForm.organizationEn.trim() || null,
      departmentTh: contactForm.departmentTh.trim() || null,
      departmentEn: contactForm.departmentEn.trim() || null,
      bioTh: contactForm.bioTh.trim() || null,
      bioEn: contactForm.bioEn.trim() || null,
      avatarUrl: contactForm.avatarUrl.trim() || null,
      avatarAltTh: contactForm.avatarAltTh.trim() || null,
      avatarAltEn: contactForm.avatarAltEn.trim() || null,
      isFeatured: contactForm.isFeatured,
      sortOrder: Number(contactForm.sortOrder),
      isEnabled: contactForm.isEnabled,
      publishedAt: contactForm.publishedAt ? new Date(contactForm.publishedAt).toISOString() : null,
    }

    try {
      const isEdit = Boolean(editingContactId)
      const response = await fetch(
        apiUrl(isEdit ? `/api/admin/contacts/${editingContactId}` : '/api/admin/contacts'),
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      )
      const data = await response.json()
      if (!data.ok) {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาดในการบันทึก contact' })
        return
      }

      if (!isEdit && data.data?.id) {
        setSelectedContactId(data.data.id)
      }
      pushToast({ title: isEdit ? 'อัปเดตข้อมูล contact สำเร็จ' : 'เพิ่ม contact สำเร็จ' })
      await fetchContacts()
      setContactDrawerOpen(false)
    } catch (err) {
      console.error('Failed to save contact:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึก contact' })
    }
  }

  const removeContact = async (id) => {
    const target = items.find((item) => item.id === id)
    try {
      const response = await fetch(apiUrl(`/api/admin/contacts/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!data.ok) {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาดในการลบ contact' })
        return
      }

      if (selectedContactId === id) {
        setSelectedContactId(null)
      }
      pushToast({ type: 'warning', title: 'ลบ contact แล้ว', description: target?.displayNameEn || '' })
      await fetchContacts()
    } catch (err) {
      console.error('Failed to delete contact:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบ contact' })
    }
  }

  const moveContact = async (id, direction) => {
    const index = sortedContacts.findIndex((item) => item.id === id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= sortedContacts.length) return

    const next = [...sortedContacts]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    const reordered = next.map((item, idx) => ({ ...item, sortOrder: idx + 1 }))
    setItems(reordered)

    try {
      const updates = reordered.map((item) => ({ id: item.id, sortOrder: item.sortOrder }))
      const response = await fetch(apiUrl('/api/admin/contacts/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.message || 'reorder failed')
      }
    } catch (err) {
      console.error('Failed to reorder contacts:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับ contact' })
      await fetchContacts()
    }
  }

  const openCreateChannel = () => {
    if (!selectedContact) return
    const nextSortOrder = selectedChannels.length ? selectedChannels[selectedChannels.length - 1].sortOrder + 10 : 10
    setEditingChannelId(null)
    setChannelErrors({})
    setChannelForm({
      channelType: 'email',
      labelTh: '',
      labelEn: '',
      value: '',
      url: '',
      isPrimary: false,
      sortOrder: nextSortOrder,
      isEnabled: true,
    })
    setChannelDrawerOpen(true)
  }

  const openEditChannel = (channel) => {
    if (!selectedContact) return
    setEditingChannelId(channel.id)
    setChannelErrors({})
    setChannelForm({
      channelType: channel.channelType,
      labelTh: channel.labelTh || '',
      labelEn: channel.labelEn || '',
      value: channel.value || '',
      url: channel.url || '',
      isPrimary: Boolean(channel.isPrimary),
      sortOrder: channel.sortOrder || 10,
      isEnabled: Boolean(channel.isEnabled),
    })
    setChannelDrawerOpen(true)
  }

  const validateChannel = () => {
    const next = {}
    if (!channelForm.channelType.trim()) next.channelType = 'กรุณาเลือก channel_type'
    if (!channelForm.value.trim()) next.value = 'กรุณากรอก value'
    if (Number(channelForm.sortOrder) < 0) next.sortOrder = 'sort_order ต้องมากกว่าหรือเท่ากับ 0'
    setChannelErrors(next)
    return Object.keys(next).length === 0
  }

  const saveChannel = async () => {
    if (!validateChannel()) return
    if (!selectedContact) return

    const payload = {
      channelType: channelForm.channelType.trim(),
      labelTh: channelForm.labelTh.trim() || null,
      labelEn: channelForm.labelEn.trim() || null,
      value: channelForm.value.trim(),
      url: channelForm.url.trim() || null,
      isPrimary: channelForm.isPrimary,
      sortOrder: Number(channelForm.sortOrder),
      isEnabled: channelForm.isEnabled,
    }

    try {
      const isEdit = Boolean(editingChannelId)
      const response = await fetch(
        apiUrl(
          isEdit
            ? `/api/admin/contacts/${selectedContact.id}/channels/${editingChannelId}`
            : `/api/admin/contacts/${selectedContact.id}/channels`,
        ),
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      )
      const data = await response.json()
      if (!data.ok) {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาดในการบันทึกช่องทาง' })
        return
      }

      pushToast({ title: isEdit ? 'อัปเดตช่องทางติดต่อสำเร็จ' : 'เพิ่มช่องทางติดต่อสำเร็จ' })
      await fetchContacts()
      setChannelDrawerOpen(false)
    } catch (err) {
      console.error('Failed to save channel:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึกช่องทาง' })
    }
  }

  const removeChannel = async (channelId) => {
    if (!selectedContact) return

    try {
      const response = await fetch(apiUrl(`/api/admin/contacts/${selectedContact.id}/channels/${channelId}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!data.ok) {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาดในการลบช่องทาง' })
        return
      }

      pushToast({ type: 'warning', title: 'ลบช่องทางติดต่อแล้ว' })
      await fetchContacts()
    } catch (err) {
      console.error('Failed to delete channel:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบช่องทาง' })
    }
  }

  const moveChannel = async (channelId, direction) => {
    if (!selectedContact) return

    const index = selectedChannels.findIndex((item) => item.id === channelId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= selectedChannels.length) return

    const next = [...selectedChannels]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    const reordered = next.map((channel, idx) => ({ ...channel, sortOrder: (idx + 1) * 10 }))

    setItems((prev) =>
      prev.map((contact) =>
        contact.id === selectedContact.id
          ? {
              ...contact,
              channels: reordered,
            }
          : contact,
      ),
    )

    try {
      const updates = reordered.map((channel) => ({ id: channel.id, sortOrder: channel.sortOrder }))
      const response = await fetch(apiUrl(`/api/admin/contacts/${selectedContact.id}/channels/reorder`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.message || 'reorder channel failed')
      }
    } catch (err) {
      console.error('Failed to reorder channels:', err)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับช่องทาง' })
      await fetchContacts()
    }
  }

  const channelTypeOptions = ['email', 'phone', 'line', 'facebook', 'instagram', 'linkedin', 'x', 'website', 'map', 'other']

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Static Content: Contacts"
        description="จัดการ content_contacts และ content_contact_channels ครบทุกคอลัมน์ พร้อมโฟลว์ที่แก้ไขง่าย"
        right={
          <button type="button" className="ad-btn ad-btn-primary" onClick={openCreateContact}>
            <Plus size={15} />
            Add Contact
          </button>
        }
      />

      <AdminDataTable
        loading={loading}
        rows={sortedContacts}
        searchKeys={['displayNameTh', 'displayNameEn', 'roleTh', 'roleEn', 'organizationTh', 'organizationEn']}
        searchPlaceholder="ค้นหา display name / role / organization"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'Enabled', value: 'enabled', predicate: (row) => row.isEnabled },
          { label: 'Disabled', value: 'disabled', predicate: (row) => !row.isEnabled },
          { label: 'Featured', value: 'featured', predicate: (row) => row.isFeatured },
        ]}
        columns={[
          {
            key: 'displayName',
            label: 'Display Name / Role',
            render: (row) => (
              <div className="ad-col-stack">
                <strong>{row.displayNameTh || '-'}</strong>
                <span>{row.displayNameEn || '-'}</span>
                <span>{row.roleTh || row.roleEn || '-'}</span>
              </div>
            ),
          },
          {
            key: 'organization',
            label: 'Organization / Department',
            render: (row) => (
              <div className="ad-col-stack">
                <strong>{row.organizationTh || row.organizationEn || '-'}</strong>
                <span>{row.organizationEn || '-'}</span>
                <span>{row.departmentTh || row.departmentEn || '-'}</span>
              </div>
            ),
          },
          {
            key: 'channelsCount',
            label: 'Channels',
            render: (row) => (
              <span className="ad-icon-text">
                <Contact size={13} />
                {(row.channels || []).length}
              </span>
            ),
          },
          {
            key: 'publishedAt',
            label: 'Published At',
            render: (row) => formatDateTime(row.publishedAt),
          },
          { key: 'sortOrder', label: 'Order' },
          {
            key: 'state',
            label: 'Flags',
            render: (row) => (
              <div className="ad-col-stack">
                <StatusBadge status={row.isEnabled ? 'ENABLED' : 'DISABLED'} />
                {row.isFeatured ? <StatusBadge status="READY_TO_RESUBMIT" label="FEATURED" /> : <span className="ad-text-muted">-</span>}
              </div>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="ad-row-actions">
                <button type="button" onClick={() => moveContact(row.id, 'up')} aria-label="move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => moveContact(row.id, 'down')} aria-label="move down">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => openEditContact(row)} aria-label="edit">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => removeContact(row.id)} aria-label="delete">
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <article className="ad-panel ad-stack">
        <div className="ad-section-head">
          <div>
            <h3>Step 1: Select Contact</h3>
            <p>เลือก contact ที่ต้องการ แล้วค่อยเพิ่มหรือแก้ไข channels ของ contact นั้น</p>
          </div>
        </div>
        <div className="ad-contact-selector-row">
          <label htmlFor="channel-contact-select" className="ad-label">
            Selected Contact
            <select
              id="channel-contact-select"
              value={selectedContact?.id || ''}
              onChange={(event) => setSelectedContactId(Number(event.target.value) || null)}
            >
              <option value="">เลือก contact</option>
              {sortedContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.id} - {contact.displayNameEn || contact.displayNameTh}
                </option>
              ))}
            </select>
          </label>
          <div className="ad-chip-row">
            {sortedContacts.map((contact) => (
              <button
                type="button"
                key={contact.id}
                className={`ad-chip-btn ${selectedContact?.id === contact.id ? 'active' : ''}`}
                onClick={() => setSelectedContactId((prev) => (prev === contact.id ? null : contact.id))}
              >
                {contact.displayNameEn || contact.displayNameTh}
              </button>
            ))}
          </div>
        </div>
      </article>

      <article className="ad-panel ad-stack">
        <div className="ad-section-head">
          <div>
            <h3>Contact Channels</h3>
            <p>
              {selectedContact
                ? `กำลังแก้ไขช่องทางของ ${selectedContact.displayNameTh || selectedContact.displayNameEn}`
                : 'เลือก contact เพื่อจัดการช่องทางการติดต่อ'}
            </p>
          </div>
          <button type="button" className="ad-btn ad-btn-primary" onClick={openCreateChannel} disabled={!selectedContact}>
            <Plus size={15} />
            Add Channel
          </button>
        </div>

        {selectedContact ? (
          <AdminDataTable
            loading={loading}
            rows={selectedChannels.map((channel) => ({ ...channel, contactId: selectedContact.id }))}
            searchKeys={['channelType', 'labelTh', 'labelEn', 'value', 'url']}
            searchPlaceholder="ค้นหา channel type / label / value"
            filters={[
              { label: 'ทั้งหมด', value: 'all', predicate: () => true },
              { label: 'Enabled', value: 'enabled', predicate: (row) => row.isEnabled },
              { label: 'Disabled', value: 'disabled', predicate: (row) => !row.isEnabled },
              { label: 'Primary', value: 'primary', predicate: (row) => row.isPrimary },
            ]}
            columns={[
              {
                key: 'channelType',
                label: 'Type',
                render: (row) => <strong>{row.channelType}</strong>,
              },
              {
                key: 'labels',
                label: 'Label TH/EN',
                render: (row) => (
                  <div className="ad-col-stack">
                    <span>{row.labelTh || '-'}</span>
                    <span>{row.labelEn || '-'}</span>
                  </div>
                ),
              },
              {
                key: 'value',
                label: 'Value / URL',
                render: (row) => (
                  <div className="ad-col-stack">
                    <span>{row.value}</span>
                    {row.url ? (
                      <a className="ad-link" href={row.url} target="_blank" rel="noreferrer">
                        <Globe size={13} />
                        {row.url}
                      </a>
                    ) : (
                      <span className="ad-text-muted">-</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'flags',
                label: 'Flags',
                render: (row) => (
                  <div className="ad-col-stack">
                    <StatusBadge status={row.isEnabled ? 'ENABLED' : 'DISABLED'} />
                    {row.isPrimary ? <StatusBadge status="APPROVED" label="PRIMARY" /> : <span className="ad-text-muted">-</span>}
                  </div>
                ),
              },
              { key: 'sortOrder', label: 'Order' },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <div className="ad-row-actions">
                    <button type="button" onClick={() => moveChannel(row.id, 'up')} aria-label="move up">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" onClick={() => moveChannel(row.id, 'down')} aria-label="move down">
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" onClick={() => openEditChannel(row)} aria-label="edit">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => removeChannel(row.id)} aria-label="delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <div className="ad-table-empty">ยังไม่มี contact ให้กำหนดช่องทาง</div>
        )}
      </article>

      <DetailDrawer
        open={contactDrawerOpen}
        onClose={() => setContactDrawerOpen(false)}
        title={editingContactId ? 'Edit Contact' : 'Create Contact'}
        subtitle="ตั้งค่าทุกคอลัมน์ของ content_contacts"
      >
        <div className="ad-form">
          <label htmlFor="contact-display-name-th">
            display_name_th *
            <input
              id="contact-display-name-th"
              value={contactForm.displayNameTh}
              onChange={(event) => setContactForm((prev) => ({ ...prev, displayNameTh: event.target.value }))}
            />
            {contactErrors.displayNameTh ? <small>{contactErrors.displayNameTh}</small> : null}
          </label>

          <label htmlFor="contact-display-name-en">
            display_name_en *
            <input
              id="contact-display-name-en"
              value={contactForm.displayNameEn}
              onChange={(event) => setContactForm((prev) => ({ ...prev, displayNameEn: event.target.value }))}
            />
            {contactErrors.displayNameEn ? <small>{contactErrors.displayNameEn}</small> : null}
          </label>

          <div className="ad-two-col">
            <label htmlFor="contact-role-th">
              role_th
              <input
                id="contact-role-th"
                value={contactForm.roleTh}
                onChange={(event) => setContactForm((prev) => ({ ...prev, roleTh: event.target.value }))}
              />
            </label>
            <label htmlFor="contact-role-en">
              role_en
              <input
                id="contact-role-en"
                value={contactForm.roleEn}
                onChange={(event) => setContactForm((prev) => ({ ...prev, roleEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="ad-two-col">
            <label htmlFor="contact-organization-th">
              organization_th
              <input
                id="contact-organization-th"
                value={contactForm.organizationTh}
                onChange={(event) => setContactForm((prev) => ({ ...prev, organizationTh: event.target.value }))}
              />
            </label>
            <label htmlFor="contact-organization-en">
              organization_en
              <input
                id="contact-organization-en"
                value={contactForm.organizationEn}
                onChange={(event) => setContactForm((prev) => ({ ...prev, organizationEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="ad-two-col">
            <label htmlFor="contact-department-th">
              department_th
              <input
                id="contact-department-th"
                value={contactForm.departmentTh}
                onChange={(event) => setContactForm((prev) => ({ ...prev, departmentTh: event.target.value }))}
              />
            </label>
            <label htmlFor="contact-department-en">
              department_en
              <input
                id="contact-department-en"
                value={contactForm.departmentEn}
                onChange={(event) => setContactForm((prev) => ({ ...prev, departmentEn: event.target.value }))}
              />
            </label>
          </div>

          <label htmlFor="contact-bio-th">
            bio_th
            <textarea
              id="contact-bio-th"
              rows={3}
              value={contactForm.bioTh}
              onChange={(event) => setContactForm((prev) => ({ ...prev, bioTh: event.target.value }))}
            />
          </label>

          <label htmlFor="contact-bio-en">
            bio_en
            <textarea
              id="contact-bio-en"
              rows={3}
              value={contactForm.bioEn}
              onChange={(event) => setContactForm((prev) => ({ ...prev, bioEn: event.target.value }))}
            />
          </label>

          <label htmlFor="contact-avatar-url">
            avatar_url
            <input
              id="contact-avatar-url"
              value={contactForm.avatarUrl}
              onChange={(event) => setContactForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
            />
          </label>

          <div className="ad-two-col">
            <label htmlFor="contact-avatar-alt-th">
              avatar_alt_th
              <input
                id="contact-avatar-alt-th"
                value={contactForm.avatarAltTh}
                onChange={(event) => setContactForm((prev) => ({ ...prev, avatarAltTh: event.target.value }))}
              />
            </label>
            <label htmlFor="contact-avatar-alt-en">
              avatar_alt_en
              <input
                id="contact-avatar-alt-en"
                value={contactForm.avatarAltEn}
                onChange={(event) => setContactForm((prev) => ({ ...prev, avatarAltEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="ad-two-col">
            <label htmlFor="contact-sort-order">
              sort_order
              <input
                id="contact-sort-order"
                type="number"
                min={1}
                value={contactForm.sortOrder}
                onChange={(event) => setContactForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              />
              {contactErrors.sortOrder ? <small>{contactErrors.sortOrder}</small> : null}
            </label>
            <label htmlFor="contact-published-at">
              published_at
              <input
                id="contact-published-at"
                type="datetime-local"
                value={contactForm.publishedAt}
                onChange={(event) => setContactForm((prev) => ({ ...prev, publishedAt: event.target.value }))}
              />
            </label>
          </div>

          <div className="ad-two-col">
            <label className="ad-check">
              <input
                type="checkbox"
                checked={contactForm.isFeatured}
                onChange={(event) => setContactForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
              />
              <span>is_featured</span>
            </label>
            <label className="ad-check">
              <input
                type="checkbox"
                checked={contactForm.isEnabled}
                onChange={(event) => setContactForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span>is_enabled</span>
            </label>
          </div>

          <div className="ad-form-actions">
            <button type="button" className="ad-btn" onClick={() => setContactDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={saveContact}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={channelDrawerOpen}
        onClose={() => setChannelDrawerOpen(false)}
        title={editingChannelId ? 'Edit Contact Channel' : 'Create Contact Channel'}
        subtitle={`ตั้งค่าช่องทางของ ${selectedContact?.displayNameEn || selectedContact?.displayNameTh || '-'}`}
      >
        <div className="ad-form">
          <label htmlFor="channel-type">
            channel_type *
            <select
              id="channel-type"
              value={channelForm.channelType}
              onChange={(event) => setChannelForm((prev) => ({ ...prev, channelType: event.target.value }))}
            >
              {channelTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {channelErrors.channelType ? <small>{channelErrors.channelType}</small> : null}
          </label>

          <div className="ad-two-col">
            <label htmlFor="channel-label-th">
              label_th
              <input
                id="channel-label-th"
                value={channelForm.labelTh}
                onChange={(event) => setChannelForm((prev) => ({ ...prev, labelTh: event.target.value }))}
              />
            </label>
            <label htmlFor="channel-label-en">
              label_en
              <input
                id="channel-label-en"
                value={channelForm.labelEn}
                onChange={(event) => setChannelForm((prev) => ({ ...prev, labelEn: event.target.value }))}
              />
            </label>
          </div>

          <label htmlFor="channel-value">
            value *
            <input
              id="channel-value"
              value={channelForm.value}
              onChange={(event) => setChannelForm((prev) => ({ ...prev, value: event.target.value }))}
            />
            {channelErrors.value ? <small>{channelErrors.value}</small> : null}
          </label>

          <label htmlFor="channel-url">
            url
            <input
              id="channel-url"
              value={channelForm.url}
              onChange={(event) => setChannelForm((prev) => ({ ...prev, url: event.target.value }))}
            />
          </label>

          <label htmlFor="channel-sort-order">
            sort_order
            <input
              id="channel-sort-order"
              type="number"
              min={0}
              value={channelForm.sortOrder}
              onChange={(event) => setChannelForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
            />
            {channelErrors.sortOrder ? <small>{channelErrors.sortOrder}</small> : null}
          </label>

          <div className="ad-two-col">
            <label className="ad-check">
              <input
                type="checkbox"
                checked={channelForm.isPrimary}
                onChange={(event) => setChannelForm((prev) => ({ ...prev, isPrimary: event.target.checked }))}
              />
              <span>is_primary</span>
            </label>
            <label className="ad-check">
              <input
                type="checkbox"
                checked={channelForm.isEnabled}
                onChange={(event) => setChannelForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span>is_enabled</span>
            </label>
          </div>

          <div className="ad-panel">
            <h3>Preview</h3>
            <p className="ad-text-muted">{selectedContact?.displayNameEn || selectedContact?.displayNameTh || '-'}</p>
            <div className="ad-col-stack">
              <span>{channelForm.channelType}</span>
              <span>{channelForm.value || '-'}</span>
              <span>{channelForm.url || '-'}</span>
            </div>
          </div>

          <div className="ad-form-actions">
            <button type="button" className="ad-btn" onClick={() => setChannelDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={saveChannel}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}

function StaticSchedulePage() {
  const { pushToast } = useAdminToast()
  const [loading, setLoading] = useState(true)
  const [bundle, setBundle] = useState({
    schedules: [],
    days: [],
    tracks: [],
    items: [],
  })
  const [activeDayFilter, setActiveDayFilter] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    dayId: '',
    trackId: '',
    startTime: '09:00',
    endTime: '10:00',
    titleTh: '',
    titleEn: '',
    descriptionTh: '',
    descriptionEn: '',
    locationTh: '',
    locationEn: '',
    speakerTh: '',
    speakerEn: '',
    audience: 'public',
    sortOrder: 0,
    isHighlight: false,
    isEnabled: true,
  })

  const schedules = bundle.schedules || []
  const days = useMemo(() => [...(bundle.days || [])].sort((a, b) => {
    const dayCompare = String(a.dayDate || '').localeCompare(String(b.dayDate || ''))
    if (dayCompare !== 0) return dayCompare
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
  }), [bundle.days])
  const tracks = bundle.tracks || []
  const items = bundle.items || []

  const dayMap = useMemo(() => new Map(days.map((day) => [day.id, day])), [days])
  const trackMap = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks])
  const scheduleMap = useMemo(() => new Map(schedules.map((schedule) => [schedule.id, schedule])), [schedules])

  const fetchScheduleBundle = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/schedules'), { credentials: 'include' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'โหลดข้อมูล schedule ไม่สำเร็จ')
      }
      setBundle({
        schedules: payload?.data?.schedules || [],
        days: payload?.data?.days || [],
        tracks: payload?.data?.tracks || [],
        items: payload?.data?.items || [],
      })
    } catch (err) {
      console.error('Failed to fetch schedule bundle:', err)
      pushToast({ type: 'error', title: err?.message || 'โหลดข้อมูล schedule ไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchScheduleBundle()
  }, [fetchScheduleBundle])

  const buildFormFromItem = useCallback((item) => ({
    dayId: String(item.dayId || ''),
    trackId: item.trackId ? String(item.trackId) : '',
    startTime: normalizeTimeInput(item.startTime),
    endTime: normalizeTimeInput(item.endTime),
    titleTh: item.titleTh || '',
    titleEn: item.titleEn || '',
    descriptionTh: item.descriptionTh || '',
    descriptionEn: item.descriptionEn || '',
    locationTh: item.locationTh || '',
    locationEn: item.locationEn || '',
    speakerTh: item.speakerTh || '',
    speakerEn: item.speakerEn || '',
    audience: item.audience || 'public',
    sortOrder: Number(item.sortOrder || 0),
    isHighlight: Boolean(item.isHighlight),
    isEnabled: Boolean(item.isEnabled),
  }), [])

  const openCreate = useCallback(() => {
    const preferredDay = days.find((item) => item.isEnabled) || days[0]
    setEditingId(null)
    setErrors({})
    setForm({
      dayId: preferredDay ? String(preferredDay.id) : '',
      trackId: '',
      startTime: '09:00',
      endTime: '10:00',
      titleTh: '',
      titleEn: '',
      descriptionTh: '',
      descriptionEn: '',
      locationTh: '',
      locationEn: '',
      speakerTh: '',
      speakerEn: '',
      audience: 'public',
      sortOrder: 0,
      isHighlight: false,
      isEnabled: true,
    })
    setDrawerOpen(true)
  }, [days])

  const openEdit = useCallback((item) => {
    setEditingId(item.id)
    setErrors({})
    setForm(buildFormFromItem(item))
    setDrawerOpen(true)
  }, [buildFormFromItem])

  const selectedDay = dayMap.get(Number(form.dayId)) || null
  const trackOptions = useMemo(() => {
    if (!selectedDay) return []
    return tracks.filter((track) => track.scheduleId === selectedDay.scheduleId)
  }, [selectedDay, tracks])

  useEffect(() => {
    if (!form.trackId) return
    const trackExists = trackOptions.some((track) => String(track.id) === String(form.trackId))
    if (trackExists) return
    setForm((prev) => ({ ...prev, trackId: '' }))
  }, [trackOptions, form.trackId])

  const validate = useCallback(() => {
    const next = {}
    if (!form.dayId) next.dayId = 'กรุณาเลือกวันกำหนดการ'
    if (!form.startTime) next.startTime = 'กรุณากรอกเวลาเริ่ม'
    if (!form.endTime) next.endTime = 'กรุณากรอกเวลาสิ้นสุด'
    if (!form.titleTh.trim()) next.titleTh = 'กรุณากรอกหัวข้อภาษาไทย'
    if (!form.titleEn.trim()) next.titleEn = 'กรุณากรอกหัวข้อภาษาอังกฤษ'

    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      next.endTime = 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }, [form])

  const save = useCallback(async () => {
    if (!validate()) return

    const payload = {
      dayId: Number(form.dayId),
      trackId: form.trackId ? Number(form.trackId) : null,
      startTime: toTimePayload(form.startTime),
      endTime: toTimePayload(form.endTime),
      titleTh: form.titleTh.trim(),
      titleEn: form.titleEn.trim(),
      descriptionTh: form.descriptionTh.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
      locationTh: form.locationTh.trim() || null,
      locationEn: form.locationEn.trim() || null,
      speakerTh: form.speakerTh.trim() || null,
      speakerEn: form.speakerEn.trim() || null,
      audience: form.audience,
      sortOrder: Number(form.sortOrder || 0),
      isHighlight: form.isHighlight,
      isEnabled: form.isEnabled,
    }

    const isEdit = Boolean(editingId)

    try {
      const response = await fetch(
        apiUrl(isEdit ? `/api/admin/schedules/items/${editingId}` : '/api/admin/schedules/items'),
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || 'บันทึกรายการกำหนดการไม่สำเร็จ')
      }

      pushToast({
        title: isEdit ? 'อัปเดตกำหนดการแล้ว' : 'เพิ่มกำหนดการแล้ว',
        description: payload.titleEn,
      })
      setDrawerOpen(false)
      await fetchScheduleBundle()
    } catch (err) {
      console.error('Failed to save schedule item:', err)
      pushToast({ type: 'error', title: err?.message || 'บันทึกไม่สำเร็จ' })
    }
  }, [editingId, fetchScheduleBundle, form, pushToast, validate])

  const remove = useCallback(async (id) => {
    const target = items.find((item) => item.id === id)
    try {
      const response = await fetch(apiUrl(`/api/admin/schedules/items/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || 'ลบรายการไม่สำเร็จ')
      }
      pushToast({
        type: 'warning',
        title: 'ลบกำหนดการแล้ว',
        description: target?.titleEn || '',
      })
      await fetchScheduleBundle()
    } catch (err) {
      console.error('Failed to delete schedule item:', err)
      pushToast({ type: 'error', title: err?.message || 'ลบรายการไม่สำเร็จ' })
    }
  }, [fetchScheduleBundle, items, pushToast])

  const rows = useMemo(
    () =>
      items.map((item) => {
        const day = dayMap.get(item.dayId)
        const track = item.trackId ? trackMap.get(item.trackId) : null
        const schedule = day ? scheduleMap.get(day.scheduleId) : null
        const dayLabel = [day?.dayNameEn || day?.dayNameTh, day?.dayDate].filter(Boolean).join(' • ')

        return {
          ...item,
          dayLabel,
          scheduleLabel: schedule?.nameEn || schedule?.nameTh || '-',
          trackLabel: track ? track.trackNameEn || track.trackNameTh : 'Default Track',
          timeLabel: `${normalizeTimeInput(item.startTime)} - ${normalizeTimeInput(item.endTime)}`,
        }
      }),
    [items, dayMap, trackMap, scheduleMap]
  )

  const dayFilters = useMemo(
    () => [
      { label: 'All Days', value: 'all' },
      ...days.map((day) => ({
        label: day.dayNameEn || day.dayNameTh || day.dayDate,
        value: String(day.id),
      })),
    ],
    [days]
  )

  const filteredRows = useMemo(() => {
    if (activeDayFilter === 'all') return rows
    return rows.filter((row) => String(row.dayId) === activeDayFilter)
  }, [rows, activeDayFilter])

  const stats = useMemo(() => {
    const activeItems = items.filter((item) => item.isEnabled).length
    const highlighted = items.filter((item) => item.isHighlight).length
    const usedDays = new Set(items.map((item) => item.dayId)).size
    return {
      total: items.length,
      activeItems,
      highlighted,
      usedDays,
    }
  }, [items])

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Static Content: Schedule"
        description="จัดการรายการกำหนดการจากตาราง event_schedule_items พร้อมตัวกรองรายวันและการแสดงผลครบทุกข้อมูล"
        right={
          <div className="ad-form-actions">
            <button type="button" className="ad-btn" onClick={fetchScheduleBundle}>
              <RefreshCw size={15} />
              Refresh
            </button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={openCreate}>
              <Plus size={15} />
              Add Session
            </button>
          </div>
        }
      />

      <section className="ad-stat-grid">
        <article className="ad-stat-card">
          <span>Items</span>
          <strong>{stats.total}</strong>
          <small>sessions in schedule</small>
        </article>
        <article className="ad-stat-card success">
          <span>Enabled</span>
          <strong>{stats.activeItems}</strong>
          <small>visible on website</small>
        </article>
        <article className="ad-stat-card info">
          <span>Highlight</span>
          <strong>{stats.highlighted}</strong>
          <small>featured sessions</small>
        </article>
        <article className="ad-stat-card warn">
          <span>Active Days</span>
          <strong>{stats.usedDays}</strong>
          <small>days with sessions</small>
        </article>
      </section>

      <div className="ad-chip-row">
        {dayFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`ad-chip-btn ${activeDayFilter === filter.value ? 'active' : ''}`}
            onClick={() => setActiveDayFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <AdminDataTable
        loading={loading}
        rows={filteredRows}
        searchKeys={['titleTh', 'titleEn', 'locationTh', 'locationEn', 'speakerTh', 'speakerEn', 'dayLabel', 'trackLabel']}
        searchPlaceholder="ค้นหาหัวข้อ, วิทยากร, สถานที่"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'Enabled', value: 'enabled', predicate: (row) => row.isEnabled },
          { label: 'Disabled', value: 'disabled', predicate: (row) => !row.isEnabled },
          { label: 'Highlight', value: 'highlight', predicate: (row) => row.isHighlight },
        ]}
        columns={[
          {
            key: 'timeLabel',
            label: 'Time',
            render: (row) => (
              <div className="ad-col-stack">
                <strong>{row.timeLabel}</strong>
                <span>Sort #{row.sortOrder}</span>
              </div>
            ),
          },
          {
            key: 'dayLabel',
            label: 'Day / Track',
            render: (row) => (
              <div className="ad-col-stack">
                <strong>{row.dayLabel || '-'}</strong>
                <span>{row.trackLabel}</span>
              </div>
            ),
          },
          {
            key: 'titleEn',
            label: 'Session',
            render: (row) => (
              <div className="ad-col-stack">
                <strong>{row.titleEn}</strong>
                <span>{row.titleTh}</span>
                <span>{row.locationEn || row.locationTh || '-'}</span>
              </div>
            ),
          },
          {
            key: 'audience',
            label: 'Audience / State',
            render: (row) => (
              <div className="ad-col-stack">
                <span>{scheduleAudienceLabel[row.audience] || row.audience}</span>
                <StatusBadge status={row.isEnabled ? 'ENABLED' : 'DISABLED'} label={row.isEnabled ? 'Enabled' : 'Disabled'} />
                {row.isHighlight ? <StatusBadge status="RESUBMITTED" label="Highlight" /> : null}
              </div>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="ad-row-actions">
                <button type="button" onClick={() => openEdit(row)} aria-label="edit">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => remove(row.id)} aria-label="delete">
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'Edit Schedule Session' : 'Create Schedule Session'}
        subtitle="ข้อมูลจะถูก sync เข้าตาราง event_schedule_items และแสดงผลในหน้า Home"
      >
        <div className="ad-form">
          <div className="ad-two-col">
            <label htmlFor="schedule-day">
              Day *
              <select
                id="schedule-day"
                value={form.dayId}
                onChange={(event) => setForm((prev) => ({ ...prev, dayId: event.target.value }))}
              >
                <option value="">เลือกวัน</option>
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.dayNameEn || day.dayNameTh || day.dayDate} ({day.dayDate})
                  </option>
                ))}
              </select>
              {errors.dayId ? <small>{errors.dayId}</small> : null}
            </label>

            <label htmlFor="schedule-track">
              Track
              <select
                id="schedule-track"
                value={form.trackId}
                onChange={(event) => setForm((prev) => ({ ...prev, trackId: event.target.value }))}
              >
                <option value="">Default Track</option>
                {trackOptions.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.trackNameEn || track.trackNameTh}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ad-two-col">
            <label htmlFor="schedule-start-time">
              Start Time *
              <input
                id="schedule-start-time"
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
              />
              {errors.startTime ? <small>{errors.startTime}</small> : null}
            </label>

            <label htmlFor="schedule-end-time">
              End Time *
              <input
                id="schedule-end-time"
                type="time"
                value={form.endTime}
                onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
              />
              {errors.endTime ? <small>{errors.endTime}</small> : null}
            </label>
          </div>

          <div className="ad-two-col">
            <label htmlFor="schedule-title-th">
              title_th *
              <input
                id="schedule-title-th"
                value={form.titleTh}
                onChange={(event) => setForm((prev) => ({ ...prev, titleTh: event.target.value }))}
              />
              {errors.titleTh ? <small>{errors.titleTh}</small> : null}
            </label>

            <label htmlFor="schedule-title-en">
              title_en *
              <input
                id="schedule-title-en"
                value={form.titleEn}
                onChange={(event) => setForm((prev) => ({ ...prev, titleEn: event.target.value }))}
              />
              {errors.titleEn ? <small>{errors.titleEn}</small> : null}
            </label>
          </div>

          <div className="ad-two-col">
            <label htmlFor="schedule-location-th">
              location_th
              <input
                id="schedule-location-th"
                value={form.locationTh}
                onChange={(event) => setForm((prev) => ({ ...prev, locationTh: event.target.value }))}
              />
            </label>

            <label htmlFor="schedule-location-en">
              location_en
              <input
                id="schedule-location-en"
                value={form.locationEn}
                onChange={(event) => setForm((prev) => ({ ...prev, locationEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="ad-two-col">
            <label htmlFor="schedule-speaker-th">
              speaker_th
              <input
                id="schedule-speaker-th"
                value={form.speakerTh}
                onChange={(event) => setForm((prev) => ({ ...prev, speakerTh: event.target.value }))}
              />
            </label>

            <label htmlFor="schedule-speaker-en">
              speaker_en
              <input
                id="schedule-speaker-en"
                value={form.speakerEn}
                onChange={(event) => setForm((prev) => ({ ...prev, speakerEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="ad-two-col">
            <label htmlFor="schedule-audience">
              audience
              <select
                id="schedule-audience"
                value={form.audience}
                onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))}
              >
                {Object.entries(scheduleAudienceLabel).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="schedule-sort-order">
              sort_order
              <input
                id="schedule-sort-order"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              />
            </label>
          </div>

          <div className="ad-two-col">
            <label htmlFor="schedule-description-th">
              description_th
              <textarea
                id="schedule-description-th"
                rows={3}
                value={form.descriptionTh}
                onChange={(event) => setForm((prev) => ({ ...prev, descriptionTh: event.target.value }))}
              />
            </label>

            <label htmlFor="schedule-description-en">
              description_en
              <textarea
                id="schedule-description-en"
                rows={3}
                value={form.descriptionEn}
                onChange={(event) => setForm((prev) => ({ ...prev, descriptionEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="ad-two-col">
            <label className="ad-check">
              <input
                type="checkbox"
                checked={form.isHighlight}
                onChange={(event) => setForm((prev) => ({ ...prev, isHighlight: event.target.checked }))}
              />
              <span>is_highlight</span>
            </label>

            <label className="ad-check">
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(event) => setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span>is_enabled</span>
            </label>
          </div>

          <div className="ad-panel">
            <h3>Preview</h3>
            <div className="ad-col-stack">
              <strong>{form.titleEn || '-'}</strong>
              <span>{form.titleTh || '-'}</span>
              <span>
                {form.startTime || '--:--'} - {form.endTime || '--:--'}
              </span>
              <span>{selectedDay?.dayDate || '-'}</span>
              <span>{scheduleAudienceLabel[form.audience] || form.audience}</span>
            </div>
          </div>

          <div className="ad-form-actions">
            <button type="button" className="ad-btn" onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={save}>
              <Save size={14} />
              Save
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}

function StaticWinnersPage() {
  const { pushToast } = useAdminToast()
  const [items, setItems] = useState(winnersSeed)
  const [season, setSeason] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    season: new Date().getFullYear(),
    rank: 1,
    team: '',
    projectTitle: '',
    description: '',
    demoLink: '',
    imageName: '',
    isPublished: false,
  })

  const availableSeasons = useMemo(
    () => [...new Set(items.map((item) => item.season))].sort((a, b) => b - a),
    [items],
  )

  const filtered = season === 'all' ? items : items.filter((item) => String(item.season) === season)

  const openCreate = () => {
    setEditingId(null)
    setForm({
      season: new Date().getFullYear(),
      rank: 1,
      team: '',
      projectTitle: '',
      description: '',
      demoLink: '',
      imageName: '',
      isPublished: false,
    })
    setErrors({})
    setDrawerOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({
      season: item.season,
      rank: item.rank,
      team: item.team,
      projectTitle: item.projectTitle,
      description: item.description,
      demoLink: item.demoLink,
      imageName: item.image?.split('/').pop() || '',
      isPublished: item.isPublished,
    })
    setErrors({})
    setDrawerOpen(true)
  }

  const validate = () => {
    const next = {}
    if (!form.team.trim()) next.team = 'กรุณากรอกชื่อทีม'
    if (!form.projectTitle.trim()) next.projectTitle = 'กรุณากรอกชื่อผลงาน'
    if (!form.demoLink.trim()) next.demoLink = 'กรุณากรอก demo link'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = () => {
    if (!validate()) return
    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                season: Number(form.season),
                rank: Number(form.rank),
                team: form.team.trim(),
                projectTitle: form.projectTitle.trim(),
                description: form.description.trim(),
                demoLink: form.demoLink.trim(),
                isPublished: form.isPublished,
              }
            : item,
        ),
      )
      pushToast({ title: 'อัปเดต Winners สำเร็จ' })
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          season: Number(form.season),
          rank: Number(form.rank),
          team: form.team.trim(),
          projectTitle: form.projectTitle.trim(),
          description: form.description.trim(),
          demoLink: form.demoLink.trim(),
          image: '/content/winners/mock.jpg',
          isPublished: form.isPublished,
        },
      ])
      pushToast({ title: 'เพิ่ม Winner สำเร็จ' })
    }
    setDrawerOpen(false)
  }

  const togglePublish = (id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isPublished: !item.isPublished } : item)),
    )
    pushToast({
      type: 'info',
      title: 'สลับสถานะ publish แล้ว',
    })
  }

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Static Content: Winners"
        description="จัดการผลการแข่งขันตาม season/year พร้อม publish/unpublish"
        right={
          <button type="button" className="ad-btn ad-btn-primary" onClick={openCreate}>
            <Plus size={15} />
            Add Winner
          </button>
        }
      />

      <div className="ad-season-filter">
        <button type="button" className={season === 'all' ? 'active' : ''} onClick={() => setSeason('all')}>
          All Seasons
        </button>
        {availableSeasons.map((year) => (
          <button
            type="button"
            key={year}
            className={String(year) === season ? 'active' : ''}
            onClick={() => setSeason(String(year))}
          >
            {year}
          </button>
        ))}
      </div>

      <AdminDataTable
        rows={[...filtered].sort((a, b) => a.season - b.season || a.rank - b.rank)}
        searchKeys={['team', 'projectTitle', 'description']}
        searchPlaceholder="ค้นหา team / project title"
        columns={[
          {
            key: 'season',
            label: 'Season',
          },
          {
            key: 'rank',
            label: 'Rank',
          },
          {
            key: 'team',
            label: 'Team',
            render: (row) => (
              <div className="ad-col-stack">
                <strong>{row.team}</strong>
                <span>{row.projectTitle}</span>
              </div>
            ),
          },
          {
            key: 'description',
            label: 'Description',
            render: (row) => <span className="ad-truncate">{row.description}</span>,
          },
          {
            key: 'demoLink',
            label: 'Demo',
            render: (row) => (
              <a className="ad-link" href={row.demoLink} target="_blank" rel="noreferrer">
                <Link2 size={13} />
                Demo Link
              </a>
            ),
          },
          {
            key: 'publish',
            label: 'Publish',
            render: (row) => (
              <button type="button" className="ad-pill-btn" onClick={() => togglePublish(row.id)}>
                {row.isPublished ? (
                  <>
                    <Check size={13} />
                    Published
                  </>
                ) : (
                  <>
                    <Eye size={13} />
                    Draft
                  </>
                )}
              </button>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="ad-row-actions">
                <button type="button" onClick={() => openEdit(row)} aria-label="edit">
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItems((prev) => prev.filter((item) => item.id !== row.id))
                    pushToast({ type: 'warning', title: 'ลบ Winner แล้ว' })
                  }}
                  aria-label="delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'Edit Winner' : 'Create Winner'}
      >
        <div className="ad-form">
          <label htmlFor="winner-season">
            Season (Year)
            <input
              id="winner-season"
              type="number"
              value={form.season}
              onChange={(event) => setForm((prev) => ({ ...prev, season: event.target.value }))}
            />
          </label>
          <label htmlFor="winner-rank">
            Rank
            <input
              id="winner-rank"
              type="number"
              min={1}
              value={form.rank}
              onChange={(event) => setForm((prev) => ({ ...prev, rank: event.target.value }))}
            />
          </label>
          <label htmlFor="winner-team">
            Team *
            <input
              id="winner-team"
              value={form.team}
              onChange={(event) => setForm((prev) => ({ ...prev, team: event.target.value }))}
            />
            {errors.team ? <small>{errors.team}</small> : null}
          </label>
          <label htmlFor="winner-project">
            Project Title *
            <input
              id="winner-project"
              value={form.projectTitle}
              onChange={(event) => setForm((prev) => ({ ...prev, projectTitle: event.target.value }))}
            />
            {errors.projectTitle ? <small>{errors.projectTitle}</small> : null}
          </label>
          <label htmlFor="winner-description">
            Description
            <textarea
              id="winner-description"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <label htmlFor="winner-link">
            Demo Link *
            <input
              id="winner-link"
              value={form.demoLink}
              onChange={(event) => setForm((prev) => ({ ...prev, demoLink: event.target.value }))}
            />
            {errors.demoLink ? <small>{errors.demoLink}</small> : null}
          </label>
          <label htmlFor="winner-image">
            Images
            <input
              id="winner-image"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setForm((prev) => ({ ...prev, imageName: file.name }))
              }}
            />
            {form.imageName ? (
              <span className="ad-file-chip">
                <Upload size={13} />
                {form.imageName}
              </span>
            ) : null}
          </label>
          <label className="ad-check">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) => setForm((prev) => ({ ...prev, isPublished: event.target.checked }))}
            />
            <span>Publish now</span>
          </label>

          <div className="ad-form-actions">
            <button type="button" className="ad-btn" onClick={() => setDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={save}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}

function ReviewQueuePage() {
  const navigate = useNavigate()

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Team Review: Queue"
        description="คิวตรวจสอบทีม พร้อม filter/search/pagination สำหรับรีวิวเร็ว"
      />
      <AdminDataTable
        rows={reviewTeamsSeed}
        searchKeys={['teamCode', 'teamName', 'university']}
        searchPlaceholder="ค้นหา team_code, team_name, university"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'SUBMITTED', value: 'submitted', predicate: (row) => row.teamState === 'SUBMITTED' },
          { label: 'RETURNED', value: 'returned', predicate: (row) => row.teamState === 'RETURNED' },
          { label: 'READY_TO_RESUBMIT', value: 'ready', predicate: (row) => row.teamState === 'READY_TO_RESUBMIT' },
          { label: 'APPROVED', value: 'approved', predicate: (row) => row.teamState === 'APPROVED' },
        ]}
        columns={[
          {
            key: 'team',
            label: 'Team',
            render: (row) => (
              <div className="ad-col-stack">
                <strong>{row.teamCode}</strong>
                <span>
                  {row.teamName} • {row.university}
                </span>
              </div>
            ),
          },
          {
            key: 'counts',
            label: 'Member States',
            render: (row) => (
              <div className="ad-count-badges">
                <span className="ok">A {row.counts.approved}</span>
                <span className="warn">R {row.counts.resubmitted}</span>
                <span className="danger">F {row.counts.needFix}</span>
                <span>P {row.counts.pending}</span>
              </div>
            ),
          },
          {
            key: 'teamState',
            label: 'Team State',
            render: (row) => <StatusBadge status={row.teamState} />,
          },
          {
            key: 'submittedAt',
            label: 'Submitted At',
            render: (row) => formatDateTime(row.submittedAt),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="ad-row-actions">
                <button type="button" onClick={() => navigate(`/admin/review/teams/${row.teamId}`)}>
                  <Eye size={14} />
                </button>
                <button type="button">
                  <Lock size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

function TeamReviewDetailPage() {
  const params = useParams()
  const { pushToast } = useAdminToast()
  const teamId = Number(params.teamId)
  const initialTeam = reviewTeamDetailsSeed[teamId]
  const [team, setTeam] = useState(initialTeam || null)
  const [selectedMemberId, setSelectedMemberId] = useState(initialTeam?.members[0]?.memberId || null)
  const [bulkSelection, setBulkSelection] = useState([])
  const [reason, setReason] = useState('')

  useEffect(() => {
    const next = reviewTeamDetailsSeed[teamId]
    setTeam(next || null)
    setSelectedMemberId(next?.members[0]?.memberId || null)
    setBulkSelection([])
    setReason('')
  }, [teamId])

  const selectedMember = team?.members.find((item) => item.memberId === selectedMemberId) || null
  const allApproved = team?.members.every((member) => member.verifyState === 'APPROVED') || false

  if (!team) {
    return (
      <div className="ad-panel">
        <h3>ไม่พบทีมที่ต้องการ</h3>
        <p>กรุณากลับไปหน้า Review Queue</p>
      </div>
    )
  }

  const patchMemberState = (memberId, patch) => {
    setTeam((prev) => {
      if (!prev) return prev
      const nextMembers = prev.members.map((member) =>
        member.memberId === memberId
          ? {
              ...member,
              ...patch,
              lastUploadAt: patch.lastUploadAt || member.lastUploadAt,
            }
          : member,
      )

      const hasNeedFix = nextMembers.some((member) => member.verifyState === 'NEED_FIX')
      const nextTeamState = nextMembers.every((member) => member.verifyState === 'APPROVED')
        ? 'APPROVED'
        : hasNeedFix
          ? 'RETURNED'
          : 'IN_REVIEW'

      return {
        ...prev,
        members: nextMembers,
        teamState: nextTeamState,
      }
    })
  }

  const approveMember = () => {
    if (!selectedMember) return
    patchMemberState(selectedMember.memberId, {
      verifyState: 'APPROVED',
      needFixReason: '',
      needFixAt: null,
    })
    pushToast({
      title: 'Approve member สำเร็จ',
      description: selectedMember.fullName,
    })
  }

  const returnMember = () => {
    if (!selectedMember) return
    if (!reason.trim()) {
      pushToast({
        type: 'warning',
        title: 'กรุณาระบุ reason ก่อน Return',
      })
      return
    }
    patchMemberState(selectedMember.memberId, {
      verifyState: 'NEED_FIX',
      needFixReason: reason.trim(),
      needFixAt: new Date().toISOString(),
    })
    pushToast({
      type: 'warning',
      title: 'ส่งกลับเพื่อแก้ไขแล้ว',
      description: selectedMember.fullName,
    })
    setReason('')
  }

  const returnTeamBulk = () => {
    if (!bulkSelection.length) {
      pushToast({
        type: 'warning',
        title: 'ยังไม่ได้เลือกสมาชิก',
      })
      return
    }
    if (!reason.trim()) {
      pushToast({
        type: 'warning',
        title: 'กรุณากรอก reason สำหรับ bulk return',
      })
      return
    }
    const now = new Date().toISOString()
    setTeam((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        teamState: 'RETURNED',
        members: prev.members.map((member) =>
          bulkSelection.includes(member.memberId)
            ? {
                ...member,
                verifyState: 'NEED_FIX',
                needFixReason: reason.trim(),
                needFixAt: now,
              }
            : member,
        ),
      }
    })
    setReason('')
    setBulkSelection([])
    pushToast({
      type: 'warning',
      title: 'Return team สำเร็จ',
      description: `${bulkSelection.length} members marked as NEED_FIX`,
    })
  }

  const approveTeam = () => {
    if (!allApproved) {
      pushToast({
        type: 'warning',
        title: 'ยังอนุมัติทีมไม่ได้',
        description: 'ต้องให้ทุกคนเป็น APPROVED ก่อน',
      })
      return
    }
    setTeam((prev) => (prev ? { ...prev, teamState: 'APPROVED' } : prev))
    pushToast({ title: 'Approve team สำเร็จ', description: team.teamName })
  }

  return (
    <div className="ad-stack">
      <SectionHeading
        title={`${team.teamCode} • ${team.teamName}`}
        description={`State: ${team.teamState} • Submitted: ${formatDateTime(team.submittedAt)} • Lock owner: ${team.lockOwner}`}
        right={
          <div className="ad-head-actions">
            <button type="button" className="ad-btn" onClick={returnTeamBulk}>
              <UserRoundX size={15} />
              Return Team (Bulk)
            </button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={approveTeam}>
              <UserRoundCheck size={15} />
              Approve Team
            </button>
          </div>
        }
      />

      <div className="ad-review-layout">
        <aside className="ad-review-members">
          <h3>
            <Users size={15} />
            Members
          </h3>
          <div className="ad-member-list">
            {team.members.map((member) => (
              <button
                type="button"
                key={member.memberId}
                className={member.memberId === selectedMemberId ? 'active' : ''}
                onClick={() => setSelectedMemberId(member.memberId)}
              >
                <label className="ad-check-inline" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={bulkSelection.includes(member.memberId)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setBulkSelection((prev) => [...prev, member.memberId])
                      } else {
                        setBulkSelection((prev) => prev.filter((id) => id !== member.memberId))
                      }
                    }}
                  />
                </label>
                <div>
                  <strong>{member.fullName}</strong>
                  <span>{member.role}</span>
                </div>
                <StatusBadge status={member.verifyState} />
              </button>
            ))}
          </div>
        </aside>

        <section className="ad-review-detail">
          {selectedMember ? (
            <>
              <article className="ad-panel">
                <h3>Member Profile</h3>
                <div className="ad-profile-grid">
                  <div>
                    <span>Full name</span>
                    <strong>{selectedMember.fullName}</strong>
                  </div>
                  <div>
                    <span>University</span>
                    <strong>{selectedMember.university}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{selectedMember.email}</strong>
                  </div>
                  <div>
                    <span>Phone</span>
                    <strong>{selectedMember.phone}</strong>
                  </div>
                  <div>
                    <span>Need Fix At</span>
                    <strong>{selectedMember.needFixAt ? formatDateTime(selectedMember.needFixAt) : '-'}</strong>
                  </div>
                  <div>
                    <span>Last Upload At</span>
                    <strong>{formatDateTime(selectedMember.lastUploadAt)}</strong>
                  </div>
                </div>

                <label htmlFor="return-reason" className="ad-label">
                  Return Reason *
                </label>
                <textarea
                  id="return-reason"
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="ระบุเหตุผลที่ต้องแก้ไขไฟล์"
                />

                <div className="ad-form-actions">
                  <button type="button" className="ad-btn ad-btn-primary" onClick={approveMember}>
                    <UserRoundCheck size={14} />
                    Approve Member
                  </button>
                  <button type="button" className="ad-btn" onClick={returnMember}>
                    <UserRoundX size={14} />
                    Return Member (Need Fix)
                  </button>
                </div>
                {selectedMember.needFixReason ? (
                  <p className="ad-warning-text">
                    Current reason: <strong>{selectedMember.needFixReason}</strong>
                  </p>
                ) : null}
              </article>

              <FileListViewer files={selectedMember.files} teamCode={team.teamCode} memberName={selectedMember.fullName} />
            </>
          ) : null}
        </section>
      </div>

      <article className="ad-panel">
        <h3>Review Timeline</h3>
        <div className="ad-timeline-list">
          {team.timeline.map((item) => (
            <div key={item.id}>
              <strong>{item.action}</strong>
              <span>{item.detail}</span>
              <small>
                {item.actor} • {formatDateTime(item.at)}
              </small>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

function ReturnedMonitorPage() {
  const navigate = useNavigate()
  return (
    <div className="ad-stack">
      <SectionHeading
        title="Team Review: Returned Monitor"
        description="ติดตามทีมที่ถูกส่งกลับและความคืบหน้าการ resubmission แบบ real-time"
      />
      <AdminDataTable
        rows={returnedTeamsSeed}
        searchKeys={['teamCode', 'teamName']}
        searchPlaceholder="ค้นหา team_code / team_name"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'RETURNED', value: 'returned', predicate: (row) => row.state === 'RETURNED' },
          {
            label: 'READY_TO_RESUBMIT',
            value: 'ready',
            predicate: (row) => row.state === 'READY_TO_RESUBMIT',
          },
        ]}
        columns={[
          {
            key: 'team',
            label: 'Team',
            render: (row) => (
              <div className="ad-col-stack">
                <strong>{row.teamCode}</strong>
                <span>{row.teamName}</span>
              </div>
            ),
          },
          {
            key: 'needFixMembers',
            label: 'Need Fix Members',
            render: (row) => row.needFixMembers.join(', '),
          },
          {
            key: 'needFixAt',
            label: 'Need Fix At',
            render: (row) => formatDateTime(row.needFixAt),
          },
          {
            key: 'progress',
            label: 'Resubmission Progress',
            render: (row) => (
              <div className="ad-progress-wrap">
                <div className="ad-progress-bar">
                  <span style={{ width: `${Math.round((row.changedMembers / row.totalNeedFixMembers) * 100)}%` }} />
                </div>
                <small>
                  {row.changedMembers}/{row.totalNeedFixMembers} changed files
                </small>
              </div>
            ),
          },
          {
            key: 'state',
            label: 'State',
            render: (row) => <StatusBadge status={row.state} />,
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <button type="button" className="ad-mini-btn" onClick={() => navigate(`/admin/review/teams/${row.teamId}`)}>
                Open
              </button>
            ),
          },
        ]}
      />
    </div>
  )
}

function ApprovedTeamsPage() {
  return (
    <div className="ad-stack">
      <SectionHeading
        title="Team Review: Approved Teams"
        description="รายชื่อทีมที่ APPROVED แล้ว พร้อมข้อมูลผู้อนุมัติและเวลาอนุมัติ"
      />

      <AdminDataTable
        rows={approvedTeamsSeed}
        searchKeys={['teamCode', 'teamName', 'university']}
        searchPlaceholder="ค้นหา team"
        columns={[
          {
            key: 'team',
            label: 'Team',
            render: (row) => (
              <div className="ad-col-stack">
                <strong>{row.teamCode}</strong>
                <span>
                  {row.teamName} • {row.university}
                </span>
              </div>
            ),
          },
          {
            key: 'approvedAt',
            label: 'Approved At',
            render: (row) => formatDateTime(row.approvedAt),
          },
          {
            key: 'approvedBy',
            label: 'Approved By',
          },
          {
            key: 'state',
            label: 'State',
            render: () => <StatusBadge status="APPROVED" />,
          },
        ]}
      />
    </div>
  )
}

function AuditLogsPage() {
  const [selectedLog, setSelectedLog] = useState(null)
  return (
    <div className="ad-stack">
      <SectionHeading
        title="Audit Logs"
        description="ติดตามการเปลี่ยนแปลงว่าใครแก้อะไร เมื่อไร"
      />

      <AdminDataTable
        rows={auditLogsSeed}
        searchKeys={['actor', 'actionType', 'entityType']}
        searchPlaceholder="ค้นหา actor / action / entity"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          {
            label: 'Member Review',
            value: 'member',
            predicate: (row) => row.entityType.includes('member'),
          },
          {
            label: 'Static Content',
            value: 'content',
            predicate: (row) => ['sponsor', 'reward', 'about', 'winner', 'contact'].includes(row.entityType),
          },
          {
            label: 'Team',
            value: 'team',
            predicate: (row) => row.entityType === 'team',
          },
        ]}
        columns={[
          { key: 'actor', label: 'Actor' },
          { key: 'actionType', label: 'Action Type' },
          {
            key: 'entity',
            label: 'Entity',
            render: (row) => `${row.entityType}:${row.entityId}`,
          },
          {
            key: 'createdAt',
            label: 'Created At',
            render: (row) => formatDateTime(row.createdAt),
          },
          {
            key: 'payload',
            label: 'Payload',
            render: (row) => (
              <button type="button" className="ad-mini-btn" onClick={() => setSelectedLog(row)}>
                View JSON
              </button>
            ),
          },
        ]}
      />

      <DetailDrawer
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.actionType || ''}
        subtitle={selectedLog ? `${selectedLog.entityType}:${selectedLog.entityId}` : ''}
      >
        <pre className="ad-json-box">{selectedLog?.payload}</pre>
      </DetailDrawer>
    </div>
  )
}

function SettingsPage() {
  const { pushToast } = useAdminToast()
  const [form, setForm] = useState(settingsSeed)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const next = {}
    if (!form.teamSubmissionDeadline) next.teamSubmissionDeadline = 'กรุณากำหนด deadline'
    if (!form.verificationDeadline) next.verificationDeadline = 'กรุณากำหนด deadline'
    if (form.reviewLockTimeoutMinutes <= 0) next.reviewLockTimeoutMinutes = 'ต้องมากกว่า 0'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = () => {
    if (!validate()) return
    pushToast({
      title: 'บันทึก Site Settings แล้ว',
      description: 'พร้อมเชื่อม API /api/admin/settings',
    })
  }

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Site Settings"
        description="กำหนด deadline และ feature toggles ระดับระบบ"
      />
      <article className="ad-panel">
        <div className="ad-form ad-settings-form">
          <label className="ad-check">
            <input
              type="checkbox"
              checked={form.registrationOpen}
              onChange={(event) => setForm((prev) => ({ ...prev, registrationOpen: event.target.checked }))}
            />
            <span>เปิดรับสมัครทีม</span>
          </label>
          <label className="ad-check">
            <input
              type="checkbox"
              checked={form.allowTeamResubmission}
              onChange={(event) => setForm((prev) => ({ ...prev, allowTeamResubmission: event.target.checked }))}
            />
            <span>อนุญาตส่งซ้ำหลัง RETURNED</span>
          </label>

          <label htmlFor="setting-lock-timeout">
            Review Lock Timeout (minutes)
            <input
              id="setting-lock-timeout"
              type="number"
              min={1}
              value={form.reviewLockTimeoutMinutes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, reviewLockTimeoutMinutes: Number(event.target.value) }))
              }
            />
            {errors.reviewLockTimeoutMinutes ? <small>{errors.reviewLockTimeoutMinutes}</small> : null}
          </label>

          <label htmlFor="setting-submission-deadline">
            Team Submission Deadline
            <input
              id="setting-submission-deadline"
              type="datetime-local"
              value={formatDateInput(form.teamSubmissionDeadline)}
              onChange={(event) => setForm((prev) => ({ ...prev, teamSubmissionDeadline: event.target.value }))}
            />
            {errors.teamSubmissionDeadline ? <small>{errors.teamSubmissionDeadline}</small> : null}
          </label>

          <label htmlFor="setting-verify-deadline">
            Verification Deadline
            <input
              id="setting-verify-deadline"
              type="datetime-local"
              value={formatDateInput(form.verificationDeadline)}
              onChange={(event) => setForm((prev) => ({ ...prev, verificationDeadline: event.target.value }))}
            />
            {errors.verificationDeadline ? <small>{errors.verificationDeadline}</small> : null}
          </label>

          <label htmlFor="setting-banner">
            Maintenance Banner
            <textarea
              id="setting-banner"
              rows={3}
              value={form.maintenanceBanner}
              onChange={(event) => setForm((prev) => ({ ...prev, maintenanceBanner: event.target.value }))}
            />
          </label>

          <div className="ad-form-actions">
            <button type="button" className="ad-btn ad-btn-primary" onClick={save}>
              <Save size={14} />
              Save Settings
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}

function AdminAppRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />

        <Route path="static" element={<Navigate to="sponsors" replace />} />
        <Route path="static/sponsors" element={<StaticSponsorsPage />} />
        <Route path="static/rewards" element={<StaticRewardsPage />} />
        <Route path="static/about" element={<StaticAboutPage />} />
        <Route path="static/schedule" element={<StaticSchedulePage />} />
        <Route path="static/contacts" element={<StaticContactsPage />} />
        <Route path="static/winners" element={<StaticWinnersPage />} />

        <Route path="review" element={<Navigate to="queue" replace />} />
        <Route path="review/queue" element={<ReviewQueuePage />} />
        <Route path="review/teams/:teamId" element={<TeamReviewDetailPage />} />
        <Route path="review/returned" element={<ReturnedMonitorPage />} />
        <Route path="review/approved" element={<ApprovedTeamsPage />} />

        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
