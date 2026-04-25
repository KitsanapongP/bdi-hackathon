import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Download, Globe, GraduationCap, RefreshCw, Users } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import EmptyState from '../shared/EmptyState'
import { useAdminToast } from '../shared/adminContexts'
import { formatDateTime } from '../utils/adminFormatters'
import './DashboardPage.css'

const statusMeta = {
  forming: { label: 'กำลังจัดทีม', color: '#5f6e84' },
  submitted: { label: 'ส่งโครงร่างแล้ว', color: '#3f6df4' },
  passed: { label: 'ผ่านการคัดเลือก', color: '#0ea86f' },
  failed: { label: 'ไม่ผ่านการคัดเลือก', color: '#dd4e4e' },
  confirmed: { label: 'ยืนยันเข้าร่วม', color: '#0f9d76' },
  not_joined: { label: 'ไม่เข้าร่วม', color: '#d97706' },
  disbanded: { label: 'ยุบทีม', color: '#7f1d1d' },
}

const genderLabelMap = {
  male: 'Male',
  female: 'Female',
  other: 'Not specified / Other',
  unknown: 'Unknown',
}

const educationLabelMap = {
  secondary: 'มัธยมต้น',
  high_school: 'มัธยมปลาย',
  bachelor: 'ปริญญาตรี',
  master: 'ปริญญาโท',
  doctorate: 'ปริญญาเอก',
  unknown: 'ไม่ระบุ',
}

function HorizontalBars({ rows, emptyText }) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.count), 0)
  if (!rows.length) return <p className="admin-dash-v3-empty">{emptyText}</p>

  return (
    <div className="admin-dash-v3-bars">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <div>
            <i style={{ width: `${max ? Math.max(8, (row.count / max) * 100) : 0}%` }} />
          </div>
          <strong>{row.count}</strong>
        </div>
      ))}
    </div>
  )
}

function RegistrationTrendChart({ rows }) {
  if (!rows.length) return <p className="admin-dash-v3-empty">ยังไม่มีข้อมูลแนวโน้มผู้ลงทะเบียน</p>
  const max = rows.reduce((acc, row) => Math.max(acc, row.interestedParticipants), 0)

  return (
    <div className="admin-dash-v3-trend-users">
      {rows.map((row) => {
        const periodLabel = String(row.periodStart).slice(0, 10)
        const heightPercent = max ? Math.max(6, (row.interestedParticipants / max) * 100) : 0
        return (
          <div key={row.periodStart}>
            <div>
              <i style={{ height: `${heightPercent}%` }} />
            </div>
            <strong>{row.interestedParticipants}</strong>
            <span>{periodLabel}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { pushToast } = useAdminToast()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [overview, setOverview] = useState(null)
  const [participationMode, setParticipationMode] = useState('weekly')

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/dashboard/overview'), {
        credentials: 'include',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'ไม่สามารถโหลดข้อมูลได้')
      setOverview(payload.data)
    } catch (error) {
      console.error(error)
      setOverview(null)
      pushToast({ variant: 'danger', title: 'โหลด dashboard ไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const handleExportSubmittedTeams = useCallback(async () => {
    try {
      setExporting(true)
      pushToast({
        variant: 'info',
        title: 'กำลังส่งออกข้อมูลทีม',
        description: 'กำลังเตรียมไฟล์ ZIP สำหรับทีมที่ส่งโครงร่างแล้ว กรุณารอสักครู่',
        durationMs: 7000,
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
        variant: 'success',
        title: 'ส่งออกข้อมูลทีมสำเร็จ',
        description: `ดาวน์โหลดไฟล์แล้ว: ${fileName}`,
        durationMs: 9000,
      })
    } catch (error) {
      const message = error?.message || 'ไม่สามารถ export ได้'
      const isNoSubmittedTeams = /ไม่พบทีมสถานะ submitted|ไม่พบทีมที่ส่งโครงร่างแล้ว/i.test(String(message))
      pushToast({
        variant: isNoSubmittedTeams ? 'warning' : 'danger',
        title: isNoSubmittedTeams ? 'ยังไม่มีทีมที่ส่งโครงร่างแล้วสำหรับส่งออก' : 'ส่งออกข้อมูลทีมไม่สำเร็จ',
        description: isNoSubmittedTeams ? 'ตรวจสอบสถานะทีมในระบบก่อนแล้วลองใหม่อีกครั้ง' : message,
        durationMs: 10000,
      })
    } finally {
      setExporting(false)
    }
  }, [pushToast])

  const statusCountMap = useMemo(
    () => new Map((overview?.statusCounts || []).map((item) => [item.status, item.count])),
    [overview],
  )

  const genderRows = useMemo(() => {
    const genderCountMap = new Map((overview?.genderCounts || []).map((item) => [item.gender || 'unknown', item.count]))
    return ['male', 'female', 'other', 'unknown'].map((genderKey) => ({
      label: genderLabelMap[genderKey] || genderKey,
      count: Number(genderCountMap.get(genderKey) || 0),
    }))
  }, [overview])

  const provinceRows = useMemo(
    () => (overview?.provinceCounts || []).slice(0, 8).map((item) => ({ label: item.province, count: item.count })),
    [overview],
  )

  const educationRows = useMemo(
    () =>
      (overview?.educationLevelCounts || []).map((item) => ({
        label: educationLabelMap[item.educationLevel] || item.educationLevel,
        count: item.count,
      })),
    [overview],
  )

  const institutionRows = useMemo(
    () => (overview?.institutionCounts || []).map((item) => ({ label: item.institutionName, count: item.count })),
    [overview],
  )

  const participationRows = useMemo(() => {
    const rows = overview?.participation?.trend?.[participationMode] || []
    return rows.slice(-12)
  }, [overview, participationMode])

  const closeDeadlines = overview?.systemCloseDeadlines || []

  const duplicateRows = overview?.duplicateNames || []
  const totalTeams = overview?.totals?.teamsCreated || 0
  const registeredCount = overview?.participation?.interestedParticipants || 0

  const statusColumns = [
    { key: 'total', label: 'ทีมทั้งหมดในระบบ', count: totalTeams, color: '#1e3a8a' },
    { key: 'forming', ...statusMeta.forming, count: statusCountMap.get('forming') || 0 },
    { key: 'submitted', ...statusMeta.submitted, count: statusCountMap.get('submitted') || 0 },
    { key: 'passed', ...statusMeta.passed, count: statusCountMap.get('passed') || 0 },
    { key: 'failed', ...statusMeta.failed, count: statusCountMap.get('failed') || 0 },
    { key: 'confirmed', ...statusMeta.confirmed, count: statusCountMap.get('confirmed') || 0 },
    { key: 'not_joined', ...statusMeta.not_joined, count: statusCountMap.get('not_joined') || 0 },
    { key: 'disbanded', ...statusMeta.disbanded, count: statusCountMap.get('disbanded') || 0 },
  ]

  return (
    <div className="admin-dash-v3">
      <section className="admin-dash-v3-toolbar">
        <button type="button" className="admin-dash-v3-btn" onClick={fetchOverview}>
          <RefreshCw size={15} />
          รีเฟรชข้อมูล
        </button>
        <button
          type="button"
          className="admin-dash-v3-btn admin-dash-v3-btn-primary"
          onClick={handleExportSubmittedTeams}
          disabled={exporting}
        >
          <Download size={15} />
          {exporting ? 'กำลังส่งออก...' : 'ส่งออกข้อมูลทีม'}
        </button>
      </section>

      <section className="admin-dash-v3-panel">
        <header>
          <h3>
            <Users size={16} />
            ภาพรวมสถานะทีมทั้งหมด
          </h3>
        </header>

        <div className="admin-dash-v3-lifecycle">
          {statusColumns.map((item) => (
            <div key={item.key} className={item.key === 'total' ? 'is-total' : ''}>
              <span style={{ backgroundColor: item.color }} />
              <p>{item.label}</p>
              <strong>{loading ? '-' : item.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section>
        <article className="admin-dash-v3-panel">
          <header>
            <h3>
              <Users size={16} />
              จำนวนผู้ลงทะเบียน
            </h3>
            <strong className="admin-dash-v3-highlight-value">{loading ? '-' : registeredCount}</strong>
          </header>

          <div className="admin-dash-v3-mode-switch">
            <button
              type="button"
              className={participationMode === 'weekly' ? 'active' : ''}
              onClick={() => setParticipationMode('weekly')}
            >
              รายสัปดาห์
            </button>
            <button
              type="button"
              className={participationMode === 'monthly' ? 'active' : ''}
              onClick={() => setParticipationMode('monthly')}
            >
              รายเดือน
            </button>
          </div>

          <RegistrationTrendChart rows={participationRows} />
        </article>
      </section>

      <section className="admin-dash-v3-grid-sub">
        <article className="admin-dash-v3-panel">
          <header>
            <h3>
              <Users size={16} />
              เพศของผู้สมัคร
            </h3>
          </header>
          <HorizontalBars rows={genderRows} emptyText="ยังไม่มีข้อมูลเพศ" />
        </article>

        <article className="admin-dash-v3-panel">
          <header>
            <h3>
              <Globe size={16} />
              ภูมิลำเนาของผู้สมัคร
            </h3>
          </header>
          <HorizontalBars rows={provinceRows} emptyText="ยังไม่มีข้อมูลจังหวัด" />
        </article>

        <article className="admin-dash-v3-panel">
          <header>
            <h3>
              <GraduationCap size={16} />
              ระดับการศึกษาของผู้สมัคร
            </h3>
          </header>
          <div className="admin-dash-v3-scroll-area">
            <HorizontalBars rows={educationRows} emptyText="ยังไม่มีข้อมูลระดับการศึกษา" />
          </div>
        </article>

        <article className="admin-dash-v3-panel">
          <header>
            <h3>
              <GraduationCap size={16} />
              สถาบันการศึกษาของผู้สมัคร
            </h3>
          </header>
          <div className="admin-dash-v3-scroll-area">
            <div className="admin-dash-v3-list admin-dash-v3-list-compact">
              {institutionRows.length ? (
                institutionRows.map((item, index) => (
                  <div key={`${item.label}-${index}`}>
                    <strong>{item.label}</strong>
                    <span>{item.count} คน</span>
                  </div>
                ))
              ) : (
                <EmptyState compact title="ยังไม่มีข้อมูลสถาบันการศึกษา" />
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="admin-dash-v3-grid-bottom">
        <article className="admin-dash-v3-panel">
          <header>
            <h3>
              <AlertTriangle size={16} />
              ชื่อซ้ำที่น่าสงสัย
            </h3>
          </header>

          <div className="admin-dash-v3-list">
            {duplicateRows.length ? (
              duplicateRows.slice(0, 10).map((group) => (
                <div key={group.normalizedName}>
                  <div>
                    <strong>{group.fullNameTh || group.fullNameEn || group.normalizedName}</strong>
                    <span>{group.count} รายการ</span>
                  </div>
                  <small>
                    {group.members.map((member) => `${member.userName} (${member.teamCode}, ${member.status})`).join(' | ')}
                  </small>
                </div>
              ))
            ) : (
              <EmptyState compact title="ไม่พบชื่อซ้ำ" />
            )}
          </div>
        </article>

        <article className="admin-dash-v3-panel">
          <header>
            <h3>
              <CalendarClock size={16} />
              Deadline Radar
            </h3>
          </header>

          <div className="admin-dash-v3-list">
            {closeDeadlines.length ? (
              closeDeadlines.map((item) => (
                <div key={item.key}>
                  <strong>{item.label}</strong>
                  <span>ปิด: {formatDateTime(item.closeAt)}</span>
                </div>
              ))
            ) : (
              <EmptyState compact title="ยังไม่พบวันเวลาปิดจาก system config" />
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
