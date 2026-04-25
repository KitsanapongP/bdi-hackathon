import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import AdminConfirmModal from '../shared/AdminConfirmModal'
import FilterBar from '../shared/FilterBar'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'
import { formatDateInput, formatDateTime } from '../utils/adminFormatters'

export default function SelectionPage() {
  const { pushToast } = useAdminToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('submitted')
  const [openAt, setOpenAt] = useState('')
  const [closeAt, setCloseAt] = useState('')
  const [savingWindow, setSavingWindow] = useState(false)
  const [expiringSelection, setExpiringSelection] = useState(false)
  const [expireConfirmOpen, setExpireConfirmOpen] = useState(false)

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams()
      if (status) query.set('status', status)
      const res = await fetch(apiUrl(`/api/admin/selection/teams?${query.toString()}`), { credentials: 'include' })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ไม่สามารถโหลดข้อมูลได้')
      setRows(payload.data || [])
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'โหลดข้อมูล selection ไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [pushToast, status])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(apiUrl('/api/admin/selection/global-deadline'), { credentials: 'include' })
        const payload = await res.json()
        if (!mounted) return
        if (res.ok && payload?.ok) {
          const openRaw = payload?.data?.openAt
          const closeRaw = payload?.data?.closeAt
          setOpenAt(formatDateInput(openRaw))
          setCloseAt(formatDateInput(closeRaw))
        }
      } catch (error) {
        void error
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const saveGlobalConfirmWindow = async () => {
    const openMs = new Date(openAt).getTime()
    const closeMs = new Date(closeAt).getTime()
    if (!Number.isFinite(openMs) || !Number.isFinite(closeMs)) {
      pushToast({ type: 'error', title: 'รูปแบบวันเวลาไม่ถูกต้อง' })
      return
    }
    if (openMs > closeMs) {
      pushToast({ type: 'error', title: 'วันเวลาเปิดต้องไม่มากกว่าวันเวลาปิด' })
      return
    }

    try {
      setSavingWindow(true)
      const res = await fetch(apiUrl('/api/admin/selection/global-deadline'), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openAt, closeAt }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'บันทึกข้อมูลไม่สำเร็จ')
      pushToast({ title: 'บันทึก Global confirm window สำเร็จ' })
      fetchRows()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'บันทึก Global confirm window ไม่สำเร็จ' })
    } finally {
      setSavingWindow(false)
    }
  }

  const setResult = async (teamId, nextStatus) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/selection/teams/${teamId}/result`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'อัปเดตข้อมูลไม่สำเร็จ')
      pushToast({ title: 'บันทึกผลคัดเลือกสำเร็จ' })
      fetchRows()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'บันทึกผลคัดเลือกไม่สำเร็จ' })
    }
  }

  const expireTimedOutSelectionTeams = async () => {
    try {
      setExpiringSelection(true)
      const res = await fetch(apiUrl('/api/admin/selection/expire-not-joined'), {
        method: 'POST',
        credentials: 'include',
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'เปลี่ยนสถานะหมดอายุไม่สำเร็จ')
      const updatedCount = Number(payload?.data?.updatedCount || 0)
      pushToast({ title: `อัปเดตสถานะสำเร็จ ${updatedCount} ทีม` })
      fetchRows()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'อัปเดตทีมหมดเวลาไม่สำเร็จ' })
    } finally {
      setExpiringSelection(false)
      setExpireConfirmOpen(false)
    }
  }

  const statusCounts = useMemo(() => {
    const counts = {
      submitted: 0,
      passed: 0,
      failed: 0,
      confirmed: 0,
      not_joined: 0,
    }
    rows.forEach((row) => {
      const key = String(row.status || '')
      if (key in counts) counts[key] += 1
    })
    return counts
  }, [rows])

  return (
    <div className="admin-ui-stack">
      <PageHeader
        title="คัดเลือกทีม"
        actions={
          <div className="admin-ui-header-actions">
            <button type="button" className="admin-ui-btn" onClick={fetchRows}>
              <RefreshCw size={14} />
              รีเฟรช
            </button>
            <button
              type="button"
              className="admin-ui-btn"
              onClick={() => setExpireConfirmOpen(true)}
              disabled={expiringSelection}
              title="อัปเดตทีม passed ที่หมดเวลายืนยันให้เป็น not_joined"
            >
              {expiringSelection ? 'กำลังอัปเดต...' : 'อัปเดตทีมที่หมดเวลา'}
            </button>
          </div>
        }
      />

      <section className="admin-ui-stat-grid">
        <article className="admin-ui-stat-card info">
          <span>ส่งแล้ว</span>
          <strong>{statusCounts.submitted}</strong>
          <small>ทีมรอประกาศผล</small>
        </article>
        <article className="admin-ui-stat-card success">
          <span>ผ่านคัดเลือก</span>
          <strong>{statusCounts.passed}</strong>
          <small>ทีมผ่านคัดเลือก</small>
        </article>
        <article className="admin-ui-stat-card warn">
          <span>ไม่ผ่าน</span>
          <strong>{statusCounts.failed}</strong>
          <small>ทีมไม่ผ่านคัดเลือก</small>
        </article>
        <article className="admin-ui-stat-card neutral">
          <span>ยืนยันแล้ว</span>
          <strong>{statusCounts.confirmed}</strong>
          <small>ยืนยันแล้ว {statusCounts.not_joined} ทีมไม่เข้าร่วม</small>
        </article>
      </section>

      <article className="admin-ui-panel">
        <FilterBar
          label="ตัวกรองการคัดเลือก"
          right={
            <button
              type="button"
              className="admin-ui-btn admin-ui-btn-primary"
              onClick={saveGlobalConfirmWindow}
              disabled={savingWindow || !openAt || !closeAt}
              title="บันทึกช่วงเวลาเปิด/ปิดการยืนยันสำหรับทุกทีมที่ passed"
            >
              {savingWindow ? 'กำลังบันทึก...' : 'บันทึกช่วงเวลายืนยัน'}
            </button>
          }
        >
          <label>
            สถานะทีม
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="submitted">ส่งแล้ว</option>
              <option value="passed">ผ่านคัดเลือก</option>
              <option value="failed">ไม่ผ่าน</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="not_joined">ไม่เข้าร่วม</option>
            </select>
          </label>
          <label>
            เปิดยืนยันเวลา
            <input type="datetime-local" value={openAt} onChange={(event) => setOpenAt(event.target.value)} />
          </label>
          <label>
            ปิดยืนยันเวลา
            <input type="datetime-local" value={closeAt} onChange={(event) => setCloseAt(event.target.value)} />
          </label>
          <button
            type="button"
            className="admin-ui-btn"
            onClick={() => {
              setOpenAt('')
              setCloseAt('')
            }}
            title="ล้างค่าเวลาเปิด/ปิดที่กรอกไว้"
          >
            ล้างช่วงเวลา
          </button>
        </FilterBar>
      </article>

      <AdminDataTable
        rows={rows.map((row) => ({ ...row, id: row.team_id }))}
        loading={loading}
        searchKeys={['team_code', 'team_name_th', 'team_name_en', 'leader_name']}
        searchPlaceholder="ค้นหา team code / team name / leader"
        columns={[
          { key: 'team_code', label: 'รหัสทีม' },
          {
            key: 'team_name_th',
            label: 'ชื่อทีม',
            render: (row) => row.team_name_th || row.team_name_en,
          },
          { key: 'leader_name', label: 'หัวหน้าทีม' },
          { key: 'status', label: 'สถานะ' },
          {
            key: 'confirmation_deadline_at',
            label: 'หมดเขตยืนยัน',
            render: (row) => formatDateTime(row.confirmation_deadline_at),
          },
          {
            key: 'confirmed_at',
            label: 'เวลาที่ยืนยัน',
            render: (row) => formatDateTime(row.confirmed_at),
          },
          {
            key: 'actions',
            label: 'การจัดการ',
            render: (row) => (
              <div className="admin-ui-inline-actions">
                <button type="button" className="admin-ui-mini-btn" onClick={() => setResult(row.team_id, 'passed')}>
                  ตั้งเป็นผ่าน
                </button>
                <button type="button" className="admin-ui-mini-btn" onClick={() => setResult(row.team_id, 'failed')}>
                  ตั้งเป็นไม่ผ่าน
                </button>
              </div>
            ),
          },
        ]}
      />

      <AdminConfirmModal
        open={expireConfirmOpen}
        danger
        title="ยืนยันอัปเดตทีมที่หมดเวลา?"
        description="ระบบจะเปลี่ยนทีมที่หมดเวลายืนยันจาก passed ไปเป็น not_joined ทันที"
        confirmLabel={expiringSelection ? 'กำลังอัปเดต...' : 'อัปเดตเลย'}
        cancelLabel="ยกเลิก"
        onCancel={() => {
          if (!expiringSelection) setExpireConfirmOpen(false)
        }}
        onConfirm={expireTimedOutSelectionTeams}
      />
    </div>
  )
}
