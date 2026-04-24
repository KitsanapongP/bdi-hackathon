import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock3, Filter, FolderArchive, Globe, History, ListChecks, RefreshCw, ShieldAlert, Users } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import { auditLogsSeed, dashboardDeadlines } from '../legacy/adminMockData.legacy'
import SectionHeading from '../shared/SectionHeading'
import StatusBadge from '../shared/StatusBadge'
import { useAdminToast } from '../shared/adminContexts'
import { formatDateTime } from '../utils/adminFormatters'

const dashboardStatusOptions = [
  { value: 'submitted', label: 'Submitted', color: '#3b82f6' },
  { value: 'passed', label: 'Passed', color: '#10b981' },
  { value: 'failed', label: 'Failed', color: '#ef4444' },
]

const genderLabelMap = {
  male: 'Male',
  female: 'Female',
  other: 'Not specified / Other',
  unknown: 'Unknown',
}

function DashboardDonut({ values }) {
  const total = values.reduce((sum, item) => sum + item.count, 0)
  if (!total) return <div className="admin-ui-donut-empty">No data</div>

  const segments = values
    .reduce(
      (acc, item) => {
        const start = acc.current
        const end = start + (item.count / total) * 360
        return {
          current: end,
          parts: [...acc.parts, `${item.color} ${start}deg ${end}deg`],
        }
      },
      { current: 0, parts: [] },
    )
    .parts.join(', ')

  return (
    <div className="admin-ui-donut-wrap">
      <div className="admin-ui-donut" style={{ background: `conic-gradient(${segments})` }}>
        <div>
          <strong>{total}</strong>
          <span>teams</span>
        </div>
      </div>
      <div className="admin-ui-donut-legend">
        {values.map((item) => (
          <div key={item.key}>
            <span style={{ backgroundColor: item.color }} />
            <strong>{item.label}</strong>
            <small>{item.count}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardBars({ rows, max = 0, valueKey = 'count', labelKey = 'label' }) {
  const maxValue = max || rows.reduce((acc, row) => Math.max(acc, row[valueKey]), 0)
  return (
    <div className="admin-ui-chart-bars">
      {rows.map((row) => (
        <div key={row[labelKey]}>
          <span>{row[labelKey]}</span>
          <div>
            <i style={{ width: `${maxValue ? Math.max(6, (row[valueKey] / maxValue) * 100) : 0}%` }} />
          </div>
          <strong>{row[valueKey]}</strong>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { pushToast } = useAdminToast()
  const [selectedStatuses, setSelectedStatuses] = useState(['submitted', 'passed'])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [overview, setOverview] = useState(null)

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams({
        statuses: selectedStatuses.join(','),
        days: String(days),
      })
      const response = await fetch(apiUrl(`/api/admin/dashboard/overview?${query.toString()}`), {
        credentials: 'include',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'ไม่สามารถโหลดข้อมูลได้')
      setOverview(payload.data)
    } catch (error) {
      console.error(error)
      setOverview(null)
      pushToast({ type: 'error', title: 'โหลด dashboard ไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [days, pushToast, selectedStatuses])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const handleExportSubmittedTeams = useCallback(async () => {
    try {
      setExporting(true)
      pushToast({
        title: 'กำลังเริ่ม Export',
        description: 'ระบบจะดึงเฉพาะทีมที่สถานะ submitted เท่านั้น',
      })

      const response = await fetch(apiUrl('/api/admin/exports/submitted-verification-bundle'), {
        credentials: 'include',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.message || 'ไม่สามารถ export ได้')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') || ''
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
      const fileName = encodedName ? decodeURIComponent(encodedName) : `verification_export_${Date.now()}.zip`

      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)

      pushToast({
        title: 'Export สำเร็จ',
        description: 'ไฟล์จะมีเฉพาะทีมสถานะ submitted พร้อมข้อมูลสมาชิกแต่ละทีม',
      })
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'ไม่สามารถ export ได้' })
    } finally {
      setExporting(false)
    }
  }, [pushToast])

  const statusCards = useMemo(() => {
    const map = new Map((overview?.statusCounts || []).map((item) => [item.status, item.count]))
    return dashboardStatusOptions.map((item) => ({
      id: item.value,
      label: item.label,
      value: map.get(item.value) || 0,
      color: item.color,
    }))
  }, [overview])

  const teamSizeRows = useMemo(
    () => (overview?.teamSizeBuckets || []).map((item) => ({ label: `${item.bucket} members`, count: item.count })),
    [overview],
  )

  const genderRows = useMemo(
    () =>
      (overview?.genderCounts || [])
        .map((item) => ({ label: genderLabelMap[item.gender] || item.gender, count: item.count }))
        .filter((item) => item.count > 0),
    [overview],
  )

  const provinceRows = useMemo(
    () => (overview?.provinceCounts || []).slice(0, 8).map((item) => ({ label: item.province, count: item.count })),
    [overview],
  )

  const duplicateRows = overview?.duplicateNames || []

  return (
    <div className="admin-ui-stack">
      <SectionHeading
        title="Admin Dashboard"
        description="ภาพรวมทีมตามสถานะ, demographic, และตรวจชื่อซ้ำของผู้ส่งเข้าพิจารณา (ปุ่ม Export จะดึงเฉพาะทีม status = submitted)"
        right={
          <div className="admin-ui-headmin-ui-actions">
            <button type="button" className="admin-ui-btn" onClick={fetchOverview}>
              <RefreshCw size={15} />
              Refresh
            </button>
            <button
              type="button"
              className="admin-ui-btn admin-ui-btn-primary"
              onClick={handleExportSubmittedTeams}
              disabled={exporting}
              title="Export เฉพาะทีมสถานะ submitted"
            >
              <FolderArchive size={15} />
              {exporting ? 'กำลัง Export...' : 'Export Submitted Teams'}
            </button>
          </div>
        }
      />

      <section className="admin-ui-panel">
        <div className="admin-ui-dashboard-filters">
          <strong>Status filter</strong>
          <div className="admin-ui-chip-row">
            {dashboardStatusOptions.map((option) => {
              const active = selectedStatuses.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`admin-ui-chip-btn ${active ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedStatuses((prev) => {
                      if (prev.includes(option.value)) {
                        if (prev.length === 1) return prev
                        return prev.filter((status) => status !== option.value)
                      }
                      return [...prev, option.value]
                    })
                  }}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
          <label className="admin-ui-days-filter">
            Trend days
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={14}>14</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
            </select>
          </label>
        </div>
      </section>

      <section className="admin-ui-stat-grid">
        {[
          {
            id: 'teamsCreated',
            label: 'Teams Created',
            value: overview?.totals?.teamsCreated ?? 0,
            trend: 'ทีมที่ถูกสร้างทั้งหมด',
            tone: 'info',
          },
          {
            id: 'filtered',
            label: 'Teams In Selected Statuses',
            value: overview?.totals?.teamsInSelectedStatuses ?? 0,
            trend: `filter: ${selectedStatuses.join(', ')}`,
            tone: 'warn',
          },
          {
            id: 'submittedOrApproved',
            label: 'Submitted + Approved',
            value: overview?.totals?.submittedOrApproved ?? 0,
            trend: 'ตรงกับโจทย์ทีมที่ส่งเข้าพิจารณา',
            tone: 'success',
          },
          {
            id: 'members',
            label: 'Members In Selection',
            value: overview?.totals?.totalMembersInSelectedStatuses ?? 0,
            trend: `${duplicateRows.length} duplicate-name groups`,
            tone: 'neutral',
          },
        ].map((item) => (
          <article key={item.id} className={`admin-ui-stat-card ${item.tone} ${loading ? 'is-loading' : ''}`}>
            <span>{item.label}</span>
            <strong>{loading ? '-' : item.value}</strong>
            <small>{item.trend}</small>
          </article>
        ))}
      </section>

      <section className="admin-ui-two-col">
        <article className="admin-ui-panel">
          <h3>
            <Filter size={17} />
            Team Status Distribution
          </h3>
          <DashboardDonut
            values={statusCards.map((item) => ({
              key: item.id,
              label: item.label,
              count: item.value,
              color: item.color,
            }))}
          />
        </article>

        <article className="admin-ui-panel">
          <h3>
            <Users size={17} />
            Team Size Distribution
          </h3>
          <DashboardBars rows={teamSizeRows} />
        </article>
      </section>

      <section className="admin-ui-two-col">
        <article className="admin-ui-panel">
          <h3>
            <Users size={17} />
            Gender Breakdown
          </h3>
          <DashboardBars rows={genderRows} />
        </article>

        <article className="admin-ui-panel">
          <h3>
            <Globe size={17} />
            Top Provinces
          </h3>
          <DashboardBars rows={provinceRows} />
        </article>
      </section>

      <section className="admin-ui-panel">
        <h3>
          <Clock3 size={17} />
          Status Trend (Last {days} Days)
        </h3>
        <div className="admin-ui-trend-grid">
          {(overview?.submissionTrend || []).slice(-14).map((row) => {
            const total = row.submitted + row.passed + row.failed
            return (
              <div key={row.date}>
                <div>
                  <i style={{ height: `${Math.max(4, row.submitted * 8)}px`, background: '#3b82f6' }} />
                  <i style={{ height: `${Math.max(4, row.passed * 8)}px`, background: '#10b981' }} />
                  <i style={{ height: `${Math.max(4, row.failed * 8)}px`, background: '#ef4444' }} />
                </div>
                <strong>{total}</strong>
                <span>{row.date.slice(5)}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="admin-ui-panel">
        <h3>
          <ShieldAlert size={17} />
          Duplicate Real Names
        </h3>
        <div className="admin-ui-duplicate-list">
          {duplicateRows.length ? (
            duplicateRows.slice(0, 10).map((group) => (
              <div key={group.normalizedName}>
                <div>
                  <strong>{group.fullNameTh || group.fullNameEn || group.normalizedName}</strong>
                  <span>{group.count} records</span>
                </div>
                <small>
                  {group.members.map((member) => `${member.userName} (${member.teamCode}, ${member.status})`).join(' | ')}
                </small>
              </div>
            ))
          ) : (
            <div className="admin-ui-table-empty">ไม่พบชื่อซ้ำในสถานะที่เลือก</div>
          )}
        </div>
      </section>

      <section className="admin-ui-panel">
        <h3>
          <History size={17} />
          Recent Audit Activity
        </h3>
        <div className="admin-ui-list-mini">
          {auditLogsSeed.slice(0, 4).map((item) => (
            <div key={item.id}>
              <strong>{item.actionType}</strong>
              <span>
                {item.actor} • {formatDateTime(item.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-ui-panel">
        <h3>
          <ListChecks size={17} />
          Upcoming Deadlines
        </h3>
        <div className="admin-ui-timeline-mini">
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
      </section>
    </div>
  )
}
