import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import AdminConfirmModal from '../shared/AdminConfirmModal'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'
import { formatDateInput, formatDateTime } from '../utils/adminFormatters'
import './SelectionPage.css'

const selectionStatusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'forming', label: 'กำลังจัดทีม' },
  { value: 'submitted', label: 'ส่งโครงร่างแล้ว' },
  { value: 'passed', label: 'ผ่านคัดเลือก' },
  { value: 'failed', label: 'ไม่ผ่านคัดเลือก' },
  { value: 'confirmed', label: 'ยืนยันเข้าร่วมแล้ว' },
  { value: 'not_joined', label: 'ไม่เข้าร่วม' },
  { value: 'disbanded', label: 'ยุบทีม' },
]

const selectionStatusLabelMap = {
  forming: 'กำลังจัดทีม',
  submitted: 'ส่งโครงร่างแล้ว',
  passed: 'ผ่านคัดเลือก',
  failed: 'ไม่ผ่านคัดเลือก',
  confirmed: 'ยืนยันเข้าร่วมแล้ว',
  not_joined: 'ไม่เข้าร่วม',
  disbanded: 'ยุบทีม',
}

export default function SelectionPage() {
  const { pushToast } = useAdminToast()
  const [loading, setLoading] = useState(true)
  const [allRows, setAllRows] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [openAt, setOpenAt] = useState('')
  const [closeAt, setCloseAt] = useState('')
  const [savingWindow, setSavingWindow] = useState(false)
  const [expiringSelection, setExpiringSelection] = useState(false)
  const [expireConfirmOpen, setExpireConfirmOpen] = useState(false)
  const [changingResult, setChangingResult] = useState(false)
  const [resultConfirmOpen, setResultConfirmOpen] = useState(false)
  const [resultCandidate, setResultCandidate] = useState(null)

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(apiUrl('/api/admin/selection/teams'), { credentials: 'include' })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ไม่สามารถโหลดข้อมูลได้')
      setAllRows(payload.data || [])
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'โหลดข้อมูลคัดเลือกทีมไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

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
      pushToast({ variant: 'danger', title: 'รูปแบบวันเวลาไม่ถูกต้อง' })
      return
    }
    if (openMs > closeMs) {
      pushToast({ variant: 'danger', title: 'วันเวลาเปิดต้องไม่มากกว่าวันเวลาปิด' })
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
      pushToast({ variant: 'success', title: 'บันทึกช่วงเวลายืนยันสำเร็จ' })
      fetchRows()
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'บันทึกช่วงเวลายืนยันไม่สำเร็จ' })
    } finally {
      setSavingWindow(false)
    }
  }

  const setResult = useCallback(async (teamId, nextStatus) => {
    try {
      setChangingResult(true)
      const res = await fetch(apiUrl(`/api/admin/selection/teams/${teamId}/result`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'อัปเดตข้อมูลไม่สำเร็จ')
      pushToast({ variant: 'success', title: 'บันทึกผลคัดเลือกสำเร็จ' })
      fetchRows()
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'บันทึกผลคัดเลือกไม่สำเร็จ' })
    } finally {
      setChangingResult(false)
    }
  }, [fetchRows, pushToast])

  const requestResultChange = useCallback((row, nextStatus) => {
    setResultCandidate({
      teamId: row.team_id,
      nextStatus,
      teamCode: row.team_code,
      teamName: row.team_name_th || '-',
    })
    setResultConfirmOpen(true)
  }, [])

  const confirmResultChange = useCallback(async () => {
    if (!resultCandidate?.teamId || !resultCandidate?.nextStatus) return
    await setResult(resultCandidate.teamId, resultCandidate.nextStatus)
    setResultConfirmOpen(false)
    setResultCandidate(null)
  }, [resultCandidate, setResult])

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
      pushToast({ variant: 'success', title: `อัปเดตสถานะสำเร็จ ${updatedCount} ทีม` })
      fetchRows()
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'อัปเดตทีมหมดเวลาไม่สำเร็จ' })
    } finally {
      setExpiringSelection(false)
      setExpireConfirmOpen(false)
    }
  }

  const rows = useMemo(() => {
    if (statusFilter === 'all') return allRows
    return allRows.filter((row) => String(row.status || '') === statusFilter)
  }, [allRows, statusFilter])

  return (
    <div className="admin-ui-stack admin-selection-v2">
      <PageHeader
        title="คัดเลือกทีม"
        actions={
          <div className="admin-ui-header-actions admin-selection-v2-actions">
            <button type="button" className="admin-ui-btn" onClick={fetchRows}>
              <RefreshCw size={14} />
              รีเฟรช
            </button>
            <button
              type="button"
              className="admin-ui-btn"
              onClick={() => setExpireConfirmOpen(true)}
              disabled={expiringSelection}
              title="อัปเดตทีมที่หมดเวลายืนยันให้เป็นไม่เข้าร่วม"
            >
              {expiringSelection ? 'กำลังอัปเดต...' : 'อัปเดตทีมที่หมดเวลา'}
            </button>
          </div>
        }
      />

      <article className="admin-ui-panel admin-selection-v2-window-panel">
        <div className="admin-selection-v2-window-head">
          <div>
            <h3>ตั้งค่าช่วงเวลายืนยันเข้าร่วมโครงการ</h3>
            <p>เวลานี้จะถูกใช้กับทีมที่ผ่านคัดเลือกเพื่อกำหนดวันหมดเขตยืนยันเข้าร่วม</p>
          </div>
          <div>
            <button
              type="button"
              className="admin-ui-btn admin-ui-btn-primary"
              onClick={saveGlobalConfirmWindow}
              disabled={savingWindow || !openAt || !closeAt}
              title="บันทึกช่วงเวลาเปิด/ปิดการยืนยันสำหรับทุกทีมที่ผ่านคัดเลือก"
            >
              {savingWindow ? 'กำลังบันทึก...' : 'บันทึกช่วงเวลายืนยัน'}
            </button>
          </div>
        </div>

        <div className="admin-selection-v2-window-fields">
          <label>
            เปิดยืนยันเวลา
            <input type="datetime-local" value={openAt} onChange={(event) => setOpenAt(event.target.value)} />
          </label>
          <label>
            ปิดยืนยันเวลา
            <input type="datetime-local" value={closeAt} onChange={(event) => setCloseAt(event.target.value)} />
          </label>
        </div>
      </article>

      <AdminDataTable
        rows={rows.map((row) => ({ ...row, id: row.team_id }))}
        loading={loading}
        searchKeys={['team_code', 'team_name_th', 'leader_name']}
        searchPlaceholder="ค้นหา team code / team name / leader"
        toolbarExtra={
          <label className="admin-selection-v2-status-filter">
            <span>สถานะทีม</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {selectionStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        }
        columns={[
          { key: 'team_code', label: 'รหัสทีม' },
          {
            key: 'team_name_th',
            label: 'ชื่อทีม',
            render: (row) => row.team_name_th || '-',
          },
          { key: 'leader_name', label: 'หัวหน้าทีม' },
          {
            key: 'status',
            label: 'สถานะ',
            render: (row) => selectionStatusLabelMap[row.status] || row.status || '-',
          },
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
                <button
                  type="button"
                  className="admin-ui-mini-btn"
                  onClick={() => requestResultChange(row, 'passed')}
                  disabled={changingResult}
                >
                  ตั้งเป็นผ่าน
                </button>
                <button
                  type="button"
                  className="admin-ui-mini-btn"
                  onClick={() => requestResultChange(row, 'failed')}
                  disabled={changingResult}
                >
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
        description="ระบบจะเปลี่ยนทีมที่หมดเวลายืนยันจากผ่านคัดเลือกไปเป็นไม่เข้าร่วมทันที"
        confirmLabel={expiringSelection ? 'กำลังอัปเดต...' : 'อัปเดตเลย'}
        cancelLabel="ยกเลิก"
        onCancel={() => {
          if (!expiringSelection) setExpireConfirmOpen(false)
        }}
        onConfirm={expireTimedOutSelectionTeams}
      />

      <AdminConfirmModal
        open={resultConfirmOpen}
        title="ยืนยันการเปลี่ยนสถานะทีม"
        description={`ทีม ${resultCandidate?.teamCode || '-'} (${resultCandidate?.teamName || '-'}) จะถูกเปลี่ยนเป็น "${selectionStatusLabelMap[resultCandidate?.nextStatus] || '-'}"`}
        confirmLabel={changingResult ? 'กำลังบันทึก...' : 'ยืนยันเปลี่ยนสถานะ'}
        cancelLabel="ยกเลิก"
        onCancel={() => {
          if (!changingResult) {
            setResultConfirmOpen(false)
            setResultCandidate(null)
          }
        }}
        onConfirm={confirmResultChange}
      />
    </div>
  )
}
