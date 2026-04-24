import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import SectionHeading from '../shared/SectionHeading'
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
    const confirmed = window.confirm('อัปเดตทีมที่หมดเวลายืนยันให้เป็น not_joined ตอนนี้ใช่หรือไม่?')
    if (!confirmed) return
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
    }
  }

  return (
    <div className="admin-ui-stack">
      <SectionHeading title="Selection Result" description="ประกาศผลผ่าน/ไม่ผ่าน และกำหนดเวลาให้ทีมยืนยันเข้าร่วม" />
      <article className="admin-ui-panel">
        <div className="admin-ui-dashboard-filters">
          <label>
            Team status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="submitted">submitted</option>
              <option value="passed">passed</option>
              <option value="failed">failed</option>
              <option value="confirmed">confirmed</option>
              <option value="not_joined">not_joined</option>
            </select>
          </label>
          <label>
            Confirm open at
            <input type="datetime-local" value={openAt} onChange={(event) => setOpenAt(event.target.value)} />
          </label>
          <label>
            Confirm close at
            <input type="datetime-local" value={closeAt} onChange={(event) => setCloseAt(event.target.value)} />
          </label>
          <button
            type="button"
            className="admin-ui-btn admin-ui-btn-primary"
            onClick={saveGlobalConfirmWindow}
            disabled={savingWindow || !openAt || !closeAt}
            title="บันทึกช่วงเวลาเปิด/ปิดการยืนยันสำหรับทุกทีมที่ passed"
          >
            {savingWindow ? 'Saving...' : 'Save Global window'}
          </button>
          <button
            type="button"
            className="admin-ui-btn"
            onClick={() => {
              setOpenAt('')
              setCloseAt('')
            }}
            title="ล้างค่าเวลาเปิด/ปิดที่กรอกไว้"
          >
            Clear window
          </button>
          <button type="button" className="admin-ui-btn" onClick={fetchRows}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            type="button"
            className="admin-ui-btn"
            onClick={expireTimedOutSelectionTeams}
            disabled={expiringSelection}
            title="อัปเดตทีม passed ที่หมดเวลายืนยันให้เป็น not_joined"
          >
            {expiringSelection ? 'Updating...' : 'Update expired teams'}
          </button>
        </div>
      </article>

      <AdminDataTable
        rows={rows.map((row) => ({ ...row, id: row.team_id }))}
        loading={loading}
        searchKeys={['team_code', 'team_name_th', 'team_name_en', 'leader_name']}
        searchPlaceholder="ค้นหา team code / team name / leader"
        columns={[
          { key: 'team_code', label: 'Team Code' },
          {
            key: 'team_name_th',
            label: 'Team',
            render: (row) => row.team_name_th || row.team_name_en,
          },
          { key: 'leader_name', label: 'Leader' },
          { key: 'status', label: 'Status' },
          {
            key: 'confirmation_deadline_at',
            label: 'Confirm Deadline',
            render: (row) => formatDateTime(row.confirmation_deadline_at),
          },
          {
            key: 'confirmed_at',
            label: 'Confirmed At',
            render: (row) => formatDateTime(row.confirmed_at),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="admin-ui-inline-actions">
                <button type="button" className="admin-ui-mini-btn" onClick={() => setResult(row.team_id, 'passed')}>
                  Set passed
                </button>
                <button type="button" className="admin-ui-mini-btn" onClick={() => setResult(row.team_id, 'failed')}>
                  Set failed
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
