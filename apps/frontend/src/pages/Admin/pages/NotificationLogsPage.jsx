import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Search, X } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import PageHeader from '../shared/PageHeader'
import LoadingState from '../shared/LoadingState'
import EmptyState from '../shared/EmptyState'
import { useAdminToast } from '../shared/adminContexts'
import { formatDateTime } from '../utils/adminFormatters'

const CHANNEL_LABELS = { in_app: 'ในเว็บ', email: 'อีเมล' }
const STATUS_META = {
  sent: { label: 'ส่งแล้ว', cls: 'ok' },
  read: { label: 'อ่านแล้ว', cls: 'info' },
  queued: { label: 'รอส่งซ้ำ', cls: 'warn' },
  skipped: { label: 'ไม่ส่ง/ข้าม', cls: 'muted' },
  failed: { label: 'ล้มเหลว', cls: 'danger' },
}
const STATUS_ORDER = ['sent', 'read', 'queued', 'skipped', 'failed']

const EMPTY_FILTERS = { channel: '', status: '', eventCode: '', fromDate: '', toDate: '' }

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || '-', cls: 'muted' }
  return <span className={`admin-log-badge admin-log-badge-${meta.cls}`}>{meta.label}</span>
}

export default function NotificationLogsPage() {
  const { pushToast } = useAdminToast()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [data, setData] = useState({ items: [], total: 0, summary: { total: 0, byStatus: {} } })
  const [eventCodes, setEventCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showEmailHtml, setShowEmailHtml] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (filters.channel) params.set('channel', filters.channel)
      if (filters.status) params.set('status', filters.status)
      if (filters.eventCode) params.set('eventCode', filters.eventCode)
      if (filters.fromDate) params.set('fromDate', filters.fromDate)
      if (filters.toDate) params.set('toDate', filters.toDate)
      if (appliedSearch) params.set('search', appliedSearch)

      const res = await fetch(apiUrl(`/api/notifications/admin/logs?${params.toString()}`), { credentials: 'include' })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'โหลด logs ไม่สำเร็จ')
      setData(payload.data || { items: [], total: 0, summary: { total: 0, byStatus: {} } })
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'โหลด logs ไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters, appliedSearch, pushToast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(apiUrl('/api/notifications/admin/logs/event-codes'), { credentials: 'include' })
        const payload = await res.json()
        if (mounted && res.ok && payload?.ok) setEventCodes(payload.data || [])
      } catch { /* ignore */ }
    })()
    return () => { mounted = false }
  }, [])

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const applySearch = () => {
    setAppliedSearch(searchInput.trim())
    setPage(1)
  }

  const clearAll = () => {
    setFilters(EMPTY_FILTERS)
    setSearchInput('')
    setAppliedSearch('')
    setPage(1)
  }

  const openDetail = async (notificationLogId) => {
    setShowEmailHtml(false)
    setDetail({ notificationLogId })
    try {
      setDetailLoading(true)
      const res = await fetch(apiUrl(`/api/notifications/admin/logs/${notificationLogId}`), { credentials: 'include' })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'โหลดรายละเอียดไม่สำเร็จ')
      setDetail(payload.data)
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'โหลดรายละเอียดไม่สำเร็จ' })
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize))
  const summary = data.summary || { total: 0, byStatus: {} }

  return (
    <div className="admin-ui-stack">
      <PageHeader
        title="Logs การแจ้งเตือน"
        actions={
          <button type="button" className="admin-ui-btn" onClick={load}>
            <RefreshCw size={14} />
            รีเฟรช
          </button>
        }
      />

      <article className="admin-ui-panel" style={{ background: 'var(--admin-ui-surface-soft)' }}>
        <p className="admin-ui-text-muted" style={{ margin: 0 }}>
          ดูประวัติการแจ้งเตือนทั้งในเว็บและอีเมลที่ระบบส่งออกไป ใช้ตรวจสอบกรณีมีผู้แจ้งว่าไม่ได้รับ —
          ค้นหาด้วยอีเมล / ชื่อ / รหัสผู้ใช้ / รหัสทีม / หัวข้อ แล้วดูสถานะการส่งและสาเหตุที่ไม่สำเร็จได้
        </p>
      </article>

      {/* ตัวกรอง */}
      <article className="admin-ui-panel">
        <div className="admin-log-filters">
          <form
            className="admin-log-search"
            onSubmit={(event) => { event.preventDefault(); applySearch() }}
          >
            <Search size={16} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ค้นหา อีเมล / ชื่อ / รหัสผู้ใช้ / รหัสทีม / หัวข้อ"
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
              ช่องทาง
              <select value={filters.channel} onChange={(event) => updateFilter('channel', event.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value="in_app">ในเว็บ</option>
                <option value="email">อีเมล</option>
              </select>
            </label>
            <label>
              สถานะ
              <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">ทั้งหมด</option>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </select>
            </label>
            <label>
              เหตุการณ์
              <select value={filters.eventCode} onChange={(event) => updateFilter('eventCode', event.target.value)}>
                <option value="">ทั้งหมด</option>
                {eventCodes.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
            <label>
              ตั้งแต่วันที่
              <input type="date" value={filters.fromDate} onChange={(event) => updateFilter('fromDate', event.target.value)} />
            </label>
            <label>
              ถึงวันที่
              <input type="date" value={filters.toDate} onChange={(event) => updateFilter('toDate', event.target.value)} />
            </label>
            <button type="button" className="admin-ui-mini-btn" onClick={clearAll}>ล้างตัวกรอง</button>
          </div>
        </div>

        {/* สรุปตามสถานะ (ตามตัวกรองปัจจุบัน) */}
        <div className="admin-log-summary">
          <span className="admin-log-chip admin-log-chip-total">ทั้งหมด {summary.total}</span>
          {STATUS_ORDER.map((s) => (
            <span key={s} className={`admin-log-chip admin-log-badge-${STATUS_META[s].cls}`}>
              {STATUS_META[s].label} {summary.byStatus?.[s] || 0}
            </span>
          ))}
        </div>
      </article>

      {/* ตาราง */}
      <article className="admin-ui-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-ui-table-wrap">
          <table className="admin-ui-table admin-log-table">
            <thead>
              <tr>
                <th>เวลา</th>
                <th>ช่องทาง</th>
                <th>สถานะ</th>
                <th>เหตุการณ์</th>
                <th>ผู้รับ</th>
                <th>ทีม</th>
                <th>หัวข้อ</th>
                <th>ผล/ปลายทาง</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><LoadingState compact label="กำลังโหลด logs..." /></td></tr>
              ) : data.items.length ? (
                data.items.map((item) => (
                  <tr key={item.notificationLogId}>
                    <td className="admin-log-nowrap">{formatDateTime(item.createdAt)}</td>
                    <td><span className="admin-log-badge admin-log-badge-channel">{CHANNEL_LABELS[item.channel] || item.channel}</span></td>
                    <td><StatusBadge status={item.status} /></td>
                    <td className="admin-log-event">{item.eventCode}</td>
                    <td>
                      <div className="admin-log-recipient">
                        <strong>{item.recipientName || '-'}</strong>
                        <span>{item.recipientUserCode ? `${item.recipientUserCode} · ` : ''}{item.recipientAccountEmail || '-'}</span>
                      </div>
                    </td>
                    <td className="admin-log-nowrap">{item.teamCode || '-'}</td>
                    <td className="admin-log-subject">{item.subject || '-'}</td>
                    <td>
                      {item.channel === 'email' ? (
                        <div className="admin-log-recipient">
                          <span>{item.recipientEmail || '-'}</span>
                          {item.errorMessage ? <span className="admin-log-error">{item.errorMessage}</span> : null}
                        </div>
                      ) : (
                        <span className="admin-ui-text-muted">{item.readAt ? 'อ่านแล้ว' : 'ยังไม่อ่าน'}</span>
                      )}
                    </td>
                    <td>
                      <button type="button" className="admin-ui-mini-btn" onClick={() => openDetail(item.notificationLogId)}>ดู</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={9}><EmptyState compact title="ไม่พบ logs ตามเงื่อนไข" /></td></tr>
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

      {/* รายละเอียด */}
      {detail && (
        <div className="admin-log-modal-layer" role="dialog" aria-modal="true">
          <button type="button" className="admin-log-modal-backdrop" aria-label="ปิด" onClick={() => setDetail(null)} />
          <div className="admin-log-modal-card admin-ui-panel">
            <div className="admin-log-modal-head">
              <h3>รายละเอียด log #{detail.notificationLogId}</h3>
              <button type="button" className="admin-ui-mini-btn" onClick={() => setDetail(null)}><X size={14} /> ปิด</button>
            </div>
            {detailLoading ? (
              <LoadingState compact label="กำลังโหลด..." />
            ) : (
              <div className="admin-log-detail">
                <div className="admin-log-detail-grid">
                  <div><span>ช่องทาง</span><strong>{CHANNEL_LABELS[detail.channel] || detail.channel}</strong></div>
                  <div><span>สถานะ</span><strong><StatusBadge status={detail.status} /></strong></div>
                  <div><span>เหตุการณ์</span><strong>{detail.eventCode}</strong></div>
                  <div><span>ผู้รับ</span><strong>{detail.recipientName || '-'} {detail.recipientUserCode ? `(${detail.recipientUserCode})` : ''}</strong></div>
                  <div><span>อีเมลบัญชี</span><strong>{detail.recipientAccountEmail || '-'}</strong></div>
                  <div><span>อีเมลปลายทางที่ส่ง</span><strong>{detail.recipientEmail || '-'}</strong></div>
                  <div><span>ทีม</span><strong>{detail.teamCode ? `${detail.teamCode} - ${detail.teamNameTh || ''}` : '-'}</strong></div>
                  <div><span>ผู้ดำเนินการ</span><strong>{detail.actorName || '-'}</strong></div>
                  <div><span>สร้างเมื่อ</span><strong>{formatDateTime(detail.createdAt)}</strong></div>
                  <div><span>ส่งเมื่อ</span><strong>{detail.sentAt ? formatDateTime(detail.sentAt) : '-'}</strong></div>
                  <div><span>อ่านเมื่อ</span><strong>{detail.readAt ? formatDateTime(detail.readAt) : '-'}</strong></div>
                  <div><span>รอส่งซ้ำ (retry)</span><strong>{detail.retryCount || 0}{detail.retryAfterAt ? ` · ${formatDateTime(detail.retryAfterAt)}` : ''}</strong></div>
                  <div><span>Provider message id</span><strong>{detail.providerMessageId || '-'}</strong></div>
                </div>

                <div className="admin-log-detail-block">
                  <span>หัวข้อ</span>
                  <div className="admin-log-detail-text">{detail.subject || '-'}</div>
                </div>
                <div className="admin-log-detail-block">
                  <span>ข้อความ</span>
                  <div className="admin-log-detail-text" style={{ whiteSpace: 'pre-wrap' }}>{detail.message || '-'}</div>
                </div>
                {detail.errorMessage ? (
                  <div className="admin-log-detail-block">
                    <span>ข้อผิดพลาด</span>
                    <div className="admin-log-detail-text admin-log-error">{detail.errorMessage}</div>
                  </div>
                ) : null}

                {detail.channel === 'email' && detail.emailHtml ? (
                  <div className="admin-log-detail-block">
                    <div className="admin-log-detail-email-head">
                      <span>เนื้อหาอีเมลที่ส่งจริง</span>
                      <button type="button" className="admin-ui-mini-btn" onClick={() => setShowEmailHtml((v) => !v)}>
                        {showEmailHtml ? 'ซ่อน' : 'แสดงตัวอย่างอีเมล'}
                      </button>
                    </div>
                    {showEmailHtml ? (
                      <iframe className="admin-log-email-frame" title="email-preview" sandbox="" srcDoc={detail.emailHtml} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
