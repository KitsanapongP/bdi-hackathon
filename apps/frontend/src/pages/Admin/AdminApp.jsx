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
  contactsSeed,
  dashboardDeadlines,
  dashboardStats,
  returnedTeamsSeed,
  rewardsSeed,
  reviewTeamDetailsSeed,
  reviewTeamsSeed,
  settingsSeed,
  sponsorsSeed,
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

function getStatusTone(status) {
  if (status === 'APPROVED') return 'success'
  if (status === 'NEED_FIX' || status === 'RETURNED') return 'danger'
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

function StatusBadge({ status }) {
  return (
    <span className={`ad-status ad-status-${getStatusTone(status)}`}>
      {teamStateLabel[status] || memberStateLabel[status] || status}
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
  pageSize = 8,
  emptyMessage = 'ไม่มีข้อมูล',
  defaultFilter = 'all',
  toolbarExtra = null,
}) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(defaultFilter)
  const [page, setPage] = useState(1)

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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pagedRows = useMemo(() => {
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
              setPage(1)
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
                  setPage(1)
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
            {pagedRows.length ? (
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
        <span>
          Page {page} / {totalPages} ({filteredRows.length} rows)
        </span>
        <div>
          <button type="button" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" disabled={page === totalPages} onClick={() => setPage((prev) => prev + 1)}>
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
    const local = localStorage.getItem('gt_user')
    const localUser = local ? JSON.parse(local) : null

    async function run() {
      try {
        const response = await fetch(apiUrl('/api/admin/me'), { credentials: 'include' })
        const payload = await response.json().catch(() => ({}))
        const normalized = normalizeAdminMe(payload)
        if (!active) return

        if (response.ok && normalized.isAdmin) {
          setState({
            loading: false,
            allowed: true,
            user: normalized.user || localUser,
            demoMode: false,
          })
          return
        }
      } catch {
        // fallback below
      }

      if (!active) return

      if (localUser?.accessRole === 'admin') {
        setState({
          loading: false,
          allowed: true,
          user: localUser,
          demoMode: true,
        })
        return
      }

      if (import.meta.env.DEV) {
        setState({
          loading: false,
          allowed: true,
          user: {
            userName: 'Design Preview Admin',
            email: 'preview@local.dev',
          },
          demoMode: true,
        })
        return
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
  const [items, setItems] = useState(sponsorsSeed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    name: '',
    link: '',
    displayOrder: 1,
    isActive: true,
    logoFileName: '',
    logoType: '',
    logoSize: 0,
  })

  const openCreate = () => {
    setEditingId(null)
    setErrors({})
    setForm({
      name: '',
      link: '',
      displayOrder: items.length + 1,
      isActive: true,
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
      name: item.name,
      link: item.link,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      logoFileName: item.logo?.split('/').pop() || '',
      logoType: item.logoMeta?.type || '',
      logoSize: (item.logoMeta?.sizeKb || 0) * 1024,
    })
    setDrawerOpen(true)
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'กรุณากรอกชื่อ sponsor'
    if (!form.link.trim()) next.link = 'กรุณากรอกลิงก์'
    if (!editingId && !form.logoFileName) next.logo = 'กรุณาอัปโหลดโลโก้'
    if (form.logoType && !['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(form.logoType)) {
      next.logo = 'รองรับเฉพาะ PNG/JPG/WEBP/SVG'
    }
    if (form.logoSize > 4 * 1024 * 1024) next.logo = 'ไฟล์ต้องไม่เกิน 4 MB'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = () => {
    if (!validate()) return
    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: form.name.trim(),
                link: form.link.trim(),
                displayOrder: Number(form.displayOrder),
                isActive: form.isActive,
                logoMeta: form.logoType
                  ? {
                      type: form.logoType,
                      sizeKb: Math.round(form.logoSize / 1024),
                    }
                  : item.logoMeta,
              }
            : item,
        ),
      )
      pushToast({ title: 'อัปเดต Sponsor สำเร็จ', description: form.name })
    } else {
      const id = Date.now()
      setItems((prev) => [
        ...prev,
        {
          id,
          name: form.name.trim(),
          link: form.link.trim(),
          displayOrder: Number(form.displayOrder),
          isActive: form.isActive,
          logo: '/content/sponsors/mock-upload.png',
          logoMeta: {
            type: form.logoType || 'image/png',
            sizeKb: Math.round(form.logoSize / 1024) || 120,
          },
        },
      ])
      pushToast({ title: 'เพิ่ม Sponsor สำเร็จ', description: form.name })
    }
    setDrawerOpen(false)
  }

  const remove = (id) => {
    const target = items.find((item) => item.id === id)
    setItems((prev) => prev.filter((item) => item.id !== id))
    pushToast({
      type: 'warning',
      title: 'ลบ Sponsor แล้ว',
      description: target?.name || '',
    })
  }

  const moveItem = (id, direction) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id)
      if (index === -1) return prev
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
      return next.map((item, idx) => ({ ...item, displayOrder: idx + 1 }))
    })
  }

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Static Content: Sponsors"
        description="CRUD + Reorder + Logo upload validation สำหรับหน้าเว็บไซต์หลัก"
        right={
          <button type="button" className="ad-btn ad-btn-primary" onClick={openCreate}>
            <Plus size={15} />
            Add Sponsor
          </button>
        }
      />

      <AdminDataTable
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
                <img src={apiUrl(row.logo)} alt={row.name} onError={(event) => (event.currentTarget.style.display = 'none')} />
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
              <a href={row.link} target="_blank" rel="noreferrer" className="ad-link">
                <Link2 size={13} />
                {row.link}
              </a>
            ),
          },
          {
            key: 'displayOrder',
            label: 'Display Order',
          },
          {
            key: 'isActive',
            label: 'Status',
            render: (row) => <StatusBadge status={row.isActive ? 'APPROVED' : 'RETURNED'} />,
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
          <label htmlFor="sponsor-name">
            Name *
            <input
              id="sponsor-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            {errors.name ? <small>{errors.name}</small> : null}
          </label>

          <label htmlFor="sponsor-link">
            Link *
            <input
              id="sponsor-link"
              value={form.link}
              onChange={(event) => setForm((prev) => ({ ...prev, link: event.target.value }))}
            />
            {errors.link ? <small>{errors.link}</small> : null}
          </label>

          <label htmlFor="sponsor-order">
            Display Order
            <input
              id="sponsor-order"
              type="number"
              min={1}
              value={form.displayOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
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

          <label className="ad-check">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <span>Active</span>
          </label>

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
  const [items, setItems] = useState(rewardsSeed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    rank: 1,
    title: '',
    amount: '',
    currency: 'THB',
    description: '',
    isActive: true,
  })

  const [errors, setErrors] = useState({})

  const openCreate = () => {
    setEditingId(null)
    setForm({
      rank: items.length + 1,
      title: '',
      amount: '',
      currency: 'THB',
      description: '',
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
      amount: item.amount,
      currency: item.currency,
      description: item.description,
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

  const save = () => {
    if (!validate()) return
    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                rank: Number(form.rank),
                title: form.title.trim(),
                amount: Number(form.amount),
                currency: form.currency.trim(),
                description: form.description.trim(),
                isActive: form.isActive,
              }
            : item,
        ),
      )
      pushToast({ title: 'อัปเดตรางวัลสำเร็จ' })
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          rank: Number(form.rank),
          title: form.title.trim(),
          amount: Number(form.amount),
          currency: form.currency.trim(),
          description: form.description.trim(),
          isActive: form.isActive,
        },
      ])
      pushToast({ title: 'เพิ่มรางวัลสำเร็จ' })
    }
    setDrawerOpen(false)
  }

  const remove = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    pushToast({
      type: 'warning',
      title: 'ลบรางวัลแล้ว',
    })
  }

  const moveItem = (id, direction) => {
    setItems((prev) => {
      const sorted = [...prev].sort((a, b) => a.rank - b.rank)
      const index = sorted.findIndex((item) => item.id === id)
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return prev
      ;[sorted[index], sorted[swapIndex]] = [sorted[swapIndex], sorted[index]]
      return sorted.map((item, idx) => ({ ...item, rank: idx + 1 }))
    })
  }

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Static Content: Rewards"
        description="จัดการข้อมูลรางวัลแบบ editable table + sort by rank"
        right={
          <button type="button" className="ad-btn ad-btn-primary" onClick={openCreate}>
            <Plus size={15} />
            Add Reward
          </button>
        }
      />

      <AdminDataTable
        rows={[...items].sort((a, b) => a.rank - b.rank)}
        searchKeys={['title', 'description']}
        searchPlaceholder="ค้นหา reward title / description"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'Active', value: 'active', predicate: (row) => row.isActive },
          { label: 'Inactive', value: 'inactive', predicate: (row) => !row.isActive },
        ]}
        columns={[
          { key: 'rank', label: 'Rank' },
          { key: 'title', label: 'Title' },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => `${Number(row.amount).toLocaleString('th-TH')} ${row.currency}`,
          },
          {
            key: 'description',
            label: 'Description',
            render: (row) => <span className="ad-truncate">{row.description}</span>,
          },
          {
            key: 'isActive',
            label: 'Status',
            render: (row) => <StatusBadge status={row.isActive ? 'APPROVED' : 'RETURNED'} />,
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
            Title *
            <input
              id="reward-title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            {errors.title ? <small>{errors.title}</small> : null}
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
          <label htmlFor="reward-description">
            Description
            <textarea
              id="reward-description"
              rows={4}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <label className="ad-check">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <span>Active</span>
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
  const [items, setItems] = useState(contactsSeed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    name: '',
    role: '',
    phone: '',
    email: '',
    social: '',
    displayOrder: 1,
    isActive: true,
  })

  const openCreate = () => {
    setEditingId(null)
    setErrors({})
    setForm({
      name: '',
      role: '',
      phone: '',
      email: '',
      social: '',
      displayOrder: items.length + 1,
      isActive: true,
    })
    setDrawerOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setErrors({})
    setForm({
      name: item.name,
      role: item.role,
      phone: item.phone,
      email: item.email,
      social: item.social,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
    })
    setDrawerOpen(true)
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'กรุณากรอกชื่อ'
    if (!form.role.trim()) next.role = 'กรุณากรอก role'
    if (!form.email.trim()) next.email = 'กรุณากรอก email'
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
                ...form,
                displayOrder: Number(form.displayOrder),
              }
            : item,
        ),
      )
      pushToast({ title: 'อัปเดต Contact สำเร็จ' })
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...form,
          displayOrder: Number(form.displayOrder),
        },
      ])
      pushToast({ title: 'เพิ่ม Contact สำเร็จ' })
    }
    setDrawerOpen(false)
  }

  const moveItem = (id, direction) => {
    setItems((prev) => {
      const sorted = [...prev].sort((a, b) => a.displayOrder - b.displayOrder)
      const index = sorted.findIndex((item) => item.id === id)
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return prev
      ;[sorted[index], sorted[swapIndex]] = [sorted[swapIndex], sorted[index]]
      return sorted.map((item, idx) => ({ ...item, displayOrder: idx + 1 }))
    })
  }

  return (
    <div className="ad-stack">
      <SectionHeading
        title="Static Content: Contacts"
        description="จัดการข้อมูลผู้ติดต่อ Add/Edit/Delete/Reorder"
        right={
          <button type="button" className="ad-btn ad-btn-primary" onClick={openCreate}>
            <Plus size={15} />
            Add Contact
          </button>
        }
      />

      <AdminDataTable
        rows={[...items].sort((a, b) => a.displayOrder - b.displayOrder)}
        searchKeys={['name', 'email', 'role']}
        searchPlaceholder="ค้นหา contact"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'Active', value: 'active', predicate: (row) => row.isActive },
          { label: 'Inactive', value: 'inactive', predicate: (row) => !row.isActive },
        ]}
        columns={[
          {
            key: 'name',
            label: 'Name / Role',
            render: (row) => (
              <div className="ad-col-stack">
                <strong>{row.name}</strong>
                <span>{row.role}</span>
              </div>
            ),
          },
          {
            key: 'contact',
            label: 'Contact',
            render: (row) => (
              <div className="ad-col-stack">
                <span className="ad-icon-text">
                  <Phone size={13} />
                  {row.phone}
                </span>
                <span className="ad-icon-text">
                  <Mail size={13} />
                  {row.email}
                </span>
              </div>
            ),
          },
          {
            key: 'social',
            label: 'Social Link',
            render: (row) => (
              <a className="ad-link" href={row.social} target="_blank" rel="noreferrer">
                <Globe size={13} />
                {row.social}
              </a>
            ),
          },
          { key: 'displayOrder', label: 'Order' },
          {
            key: 'status',
            label: 'Status',
            render: (row) => <StatusBadge status={row.isActive ? 'APPROVED' : 'RETURNED'} />,
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
                <button type="button" onClick={() => setItems((prev) => prev.filter((item) => item.id !== row.id))} aria-label="delete">
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
        title={editingId ? 'Edit Contact' : 'Create Contact'}
      >
        <div className="ad-form">
          <label htmlFor="contact-name">
            Name *
            <input
              id="contact-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            {errors.name ? <small>{errors.name}</small> : null}
          </label>
          <label htmlFor="contact-role">
            Role *
            <input
              id="contact-role"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            />
            {errors.role ? <small>{errors.role}</small> : null}
          </label>
          <label htmlFor="contact-phone">
            Phone
            <input
              id="contact-phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>
          <label htmlFor="contact-email">
            Email *
            <input
              id="contact-email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            {errors.email ? <small>{errors.email}</small> : null}
          </label>
          <label htmlFor="contact-social">
            Social Link
            <input
              id="contact-social"
              value={form.social}
              onChange={(event) => setForm((prev) => ({ ...prev, social: event.target.value }))}
            />
          </label>
          <label htmlFor="contact-order">
            Display Order
            <input
              id="contact-order"
              type="number"
              min={1}
              value={form.displayOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
            />
          </label>
          <label className="ad-check">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <span>Active</span>
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
