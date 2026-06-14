import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileDown, RefreshCw, Search, X } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import PageHeader from '../shared/PageHeader'
import LoadingState from '../shared/LoadingState'
import EmptyState from '../shared/EmptyState'
import { useAdminToast } from '../shared/adminContexts'
import { formatDateTime } from '../utils/adminFormatters'

const STATUS_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'forming', label: 'กำลังจัดทีม' },
  { value: 'submitted', label: 'ส่งโครงร่างแล้ว' },
  { value: 'passed', label: 'ผ่านคัดเลือก' },
  { value: 'failed', label: 'ไม่ผ่านคัดเลือก' },
  { value: 'confirmed', label: 'ยืนยันเข้าร่วมแล้ว' },
  { value: 'not_joined', label: 'ไม่เข้าร่วม' },
  { value: 'disbanded', label: 'ยุบทีม' },
]
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]))
const TRACK_OPTIONS = ['Phenome', 'Health', 'City']
const STAGE_LABELS = { pre_selection: 'ก่อนคัดเลือก', training: 'อบรม', onsite: 'หน้างาน' }

const EMPTY_FILTERS = { teamStatus: '', submissionTaskId: '', teamId: '', track: '', itemType: '' }

function getAttachmentFileName(disposition, fallback) {
  const encodedName = String(disposition || '').match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  return encodedName ? decodeURIComponent(encodedName) : fallback
}

async function downloadResponseFile(response, fallbackFileName) {
  const blob = await response.blob()
  const fileName = getAttachmentFileName(response.headers.get('content-disposition'), fallbackFileName)
  const downloadUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(downloadUrl)
  return fileName
}

export default function TeamSubmissionsPage() {
  const { pushToast } = useAdminToast()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [data, setData] = useState({ items: [], total: 0 })
  const [taskOptions, setTaskOptions] = useState([])
  const [teamOptions, setTeamOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (filters.teamStatus) params.set('teamStatus', filters.teamStatus)
      if (filters.submissionTaskId) params.set('submissionTaskId', filters.submissionTaskId)
      if (filters.teamId) params.set('teamId', filters.teamId)
      if (filters.track) params.set('track', filters.track)
      if (filters.itemType) params.set('itemType', filters.itemType)
      if (appliedSearch) params.set('search', appliedSearch)

      const res = await fetch(apiUrl(`/api/admin/submissions?${params.toString()}`), { credentials: 'include' })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'โหลดงานที่ส่งไม่สำเร็จ')
      setData(payload.data || { items: [], total: 0 })
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'โหลดงานที่ส่งไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters, appliedSearch, pushToast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [tasksRes, teamsRes] = await Promise.all([
          fetch(apiUrl('/api/admin/submission-tasks'), { credentials: 'include' }),
          fetch(apiUrl('/api/admin/selection/teams'), { credentials: 'include' }),
        ])
        const tasksPayload = await tasksRes.json()
        const teamsPayload = await teamsRes.json()
        if (!mounted) return
        if (tasksRes.ok && tasksPayload?.ok) setTaskOptions(tasksPayload.data || [])
        if (teamsRes.ok && teamsPayload?.ok) {
          const dedup = new Map()
          ;(teamsPayload.data || []).forEach((row) => {
            if (!row?.team_id || dedup.has(row.team_id)) return
            dedup.set(row.team_id, { teamId: row.team_id, status: row.status || '', label: `${row.team_name_th || '-'} [${row.team_code}]` })
          })
          setTeamOptions(Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label, 'th')))
        }
      } catch { /* ignore */ }
    })()
    return () => { mounted = false }
  }, [])

  const updateFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      // เปลี่ยนสถานะทีม -> รีเซ็ตทีมที่เลือก (ให้ dropdown ทีมเหลือเฉพาะตามสถานะ)
      if (key === 'teamStatus') next.teamId = ''
      return next
    })
    setPage(1)
  }

  const visibleTeamOptions = useMemo(
    () => (filters.teamStatus ? teamOptions.filter((t) => t.status === filters.teamStatus) : teamOptions),
    [teamOptions, filters.teamStatus],
  )

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.teamStatus) params.set('teamStatus', filters.teamStatus)
    if (filters.submissionTaskId) params.set('submissionTaskId', filters.submissionTaskId)
    if (filters.teamId) params.set('teamId', filters.teamId)
    if (filters.track) params.set('track', filters.track)
    if (filters.itemType) params.set('itemType', filters.itemType)
    if (appliedSearch) params.set('search', appliedSearch)
    return params
  }, [filters, appliedSearch])

  const exportSubmissions = async () => {
    if (data.total === 0) {
      pushToast({ variant: 'warning', title: 'ไม่มีรายการให้ export ตามตัวกรองนี้' })
      return
    }
    try {
      setExporting(true)
      const res = await fetch(apiUrl(`/api/admin/submissions/export?${buildFilterParams().toString()}`), { credentials: 'include' })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.message || 'Export ไม่สำเร็จ')
      }
      const fileName = await downloadResponseFile(res, `team_submissions_${Date.now()}.xlsx`)
      pushToast({ variant: 'success', title: 'Export สำเร็จ', description: `ดาวน์โหลดไฟล์แล้ว: ${fileName}` })
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'Export ไม่สำเร็จ' })
    } finally {
      setExporting(false)
    }
  }

  const applySearch = () => { setAppliedSearch(searchInput.trim()); setPage(1) }

  const clearAll = () => {
    setFilters(EMPTY_FILTERS)
    setSearchInput('')
    setAppliedSearch('')
    setPage(1)
  }

  const openItem = (item) => {
    if (item.itemType === 'link') {
      window.open(item.linkUrl, '_blank', 'noopener')
    } else {
      window.open(apiUrl(`/api/admin/submissions/files/${item.itemId}/open`), '_blank', 'noopener')
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize))
  const hasActiveFilter = useMemo(
    () => Boolean(appliedSearch) || Object.values(filters).some(Boolean),
    [appliedSearch, filters],
  )

  return (
    <div className="admin-ui-stack">
      <PageHeader
        title="งานที่ทีมส่ง"
        actions={
          <div className="admin-ui-header-actions">
            <button type="button" className="admin-ui-btn" onClick={load}>
              <RefreshCw size={14} />
              รีเฟรช
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={exporting || data.total === 0} onClick={exportSubmissions}>
              <Download size={14} />
              {exporting ? 'กำลัง Export...' : 'Export Excel'}
            </button>
          </div>
        }
      />

      <article className="admin-ui-panel" style={{ background: 'var(--admin-ui-surface-soft)' }}>
        <p className="admin-ui-text-muted" style={{ margin: 0 }}>
          ดูไฟล์และลิงก์งานที่แต่ละทีมส่งเข้ามา กรองตามสถานะทีม / งาน / ทีม / Track / ประเภท (ไฟล์-ลิงก์) แล้วกดเปิดดูได้ทันที
        </p>
      </article>

      <article className="admin-ui-panel">
        <div className="admin-log-filters">
          <form className="admin-log-search" onSubmit={(event) => { event.preventDefault(); applySearch() }}>
            <Search size={16} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ค้นหา รหัสทีม / ชื่อทีม"
            />
            {searchInput && (
              <button type="button" className="admin-log-search-clear" onClick={() => { setSearchInput(''); setAppliedSearch(''); setPage(1) }}>
                <X size={14} />
              </button>
            )}
            <button type="submit" className="admin-ui-btn admin-ui-btn-primary">ค้นหา</button>
          </form>

          <div className="admin-log-filter-row">
            <label>
              สถานะทีม
              <select value={filters.teamStatus} onChange={(event) => updateFilter('teamStatus', event.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>
              งาน
              <select value={filters.submissionTaskId} onChange={(event) => updateFilter('submissionTaskId', event.target.value)}>
                <option value="">ทุกงาน</option>
                {taskOptions.map((t) => (
                  <option key={t.submissionTaskId} value={t.submissionTaskId}>
                    {t.taskName}{t.taskType ? ` (${t.taskType === 'file' ? 'ไฟล์' : 'ลิงก์'})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ทีม
              <select value={filters.teamId} onChange={(event) => updateFilter('teamId', event.target.value)}>
                <option value="">{filters.teamStatus ? `ทุกทีม (${visibleTeamOptions.length})` : 'ทุกทีม'}</option>
                {visibleTeamOptions.map((t) => <option key={t.teamId} value={t.teamId}>{t.label}</option>)}
              </select>
            </label>
            <label>
              Track
              <select value={filters.track} onChange={(event) => updateFilter('track', event.target.value)}>
                <option value="">ทุก Track</option>
                {TRACK_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>
              ประเภท
              <select value={filters.itemType} onChange={(event) => updateFilter('itemType', event.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value="file">ไฟล์</option>
                <option value="link">ลิงก์</option>
              </select>
            </label>
            <button type="button" className="admin-ui-mini-btn" disabled={!hasActiveFilter} onClick={clearAll}>ล้างตัวกรอง</button>
          </div>
        </div>

        <div className="admin-log-summary">
          <span className="admin-log-chip admin-log-chip-total">พบ {data.total} รายการ</span>
        </div>
      </article>

      <article className="admin-ui-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-ui-table-wrap">
          <table className="admin-ui-table admin-log-table">
            <thead>
              <tr>
                <th>ทีม</th>
                <th>สถานะ</th>
                <th>งาน</th>
                <th>ประเภท</th>
                <th>Track</th>
                <th>งานที่ส่ง</th>
                <th>ส่งเมื่อ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><LoadingState compact label="กำลังโหลด..." /></td></tr>
              ) : data.items.length ? (
                data.items.map((item) => (
                  <tr key={`${item.itemType}-${item.itemId}`}>
                    <td>
                      <div className="admin-log-recipient">
                        <strong>{item.teamNameTh || '-'}</strong>
                        <span>{item.teamCode}</span>
                      </div>
                    </td>
                    <td className="admin-log-nowrap">{STATUS_LABELS[item.teamStatus] || item.teamStatus || '-'}</td>
                    <td>
                      <div className="admin-log-recipient">
                        <strong style={{ fontWeight: 600 }}>{item.taskName}</strong>
                        <span>{STAGE_LABELS[item.stage] || item.stage || ''}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-log-badge ${item.itemType === 'file' ? 'admin-log-badge-info' : 'admin-log-badge-warn'}`}>
                        {item.itemType === 'file' ? 'ไฟล์' : 'ลิงก์'}
                      </span>
                    </td>
                    <td className="admin-log-nowrap">{item.track || '-'}</td>
                    <td className="admin-log-subject" title={item.title || ''}>{item.title || '-'}</td>
                    <td className="admin-log-nowrap">{formatDateTime(item.submittedAt)}</td>
                    <td>
                      <button type="button" className="admin-ui-mini-btn" onClick={() => openItem(item)}>
                        {item.itemType === 'file' ? <><FileDown size={13} /> เปิดไฟล์</> : <><ExternalLink size={13} /> เปิดลิงก์</>}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8}><EmptyState compact title="ไม่พบงานที่ส่งตามเงื่อนไข" /></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-ui-table-pager">
          <div className="admin-ui-page-size-selector">
            <span>Rows:</span>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
          <span>หน้า {page} / {totalPages} ({data.total} รายการ)</span>
          <div>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={16} /></button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
      </article>
    </div>
  )
}
