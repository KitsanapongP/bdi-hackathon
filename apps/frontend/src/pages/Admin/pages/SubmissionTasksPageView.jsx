import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Menu, Pencil, RefreshCw, Save, Search, Trash2, Users, X } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminConfirmModal from '../shared/AdminConfirmModal'
import EmptyState from '../shared/EmptyState'
import FilterBar from '../shared/FilterBar'
import LoadingState from '../shared/LoadingState'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'
import './SubmissionTasksPage.css'

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

const STAGE_OPTIONS = [
  { value: 'pre_selection', label: 'ก่อนคัดเลือก' },
  { value: 'training', label: 'ช่วงอบรมหลังคัดเลือก' },
  { value: 'onsite', label: 'ช่วงแข่งขันหน้างาน' },
]

const TYPE_OPTIONS = [
  { value: 'link', label: 'ลิงก์' },
  { value: 'file', label: 'ไฟล์' },
]

const ASSIGN_STATUS_OPTIONS = [
  { value: 'forming', label: 'กำลังจัดทีม' },
  { value: 'submitted', label: 'ส่งทีมเข้าคัดเลือกแล้ว' },
  { value: 'passed', label: 'ผ่านคัดเลือก' },
  { value: 'failed', label: 'ไม่ผ่านคัดเลือก' },
  { value: 'confirmed', label: 'ยืนยันเข้าร่วมแล้ว' },
  { value: 'not_joined', label: 'ไม่เข้าร่วม' },
]

function getStageLabel(value) {
  return STAGE_OPTIONS.find((item) => item.value === value)?.label || value || '-'
}

function getTypeLabel(value) {
  return TYPE_OPTIONS.find((item) => item.value === value)?.label || value || '-'
}

function getTeamStatusLabel(status) {
  return ASSIGN_STATUS_OPTIONS.find((item) => item.value === status)?.label || status || '-'
}

export default function SubmissionTasksPage() {
  const { pushToast } = useAdminToast()
  const [rows, setRows] = useState([])
  const [teamOptions, setTeamOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [assignedTeams, setAssignedTeams] = useState([])
  const [loadingAssignedTeams, setLoadingAssignedTeams] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [stageFilter, setStageFilter] = useState('all')
  const [listSearch, setListSearch] = useState('')
  const [teamSearch, setTeamSearch] = useState('')
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [form, setForm] = useState({
    taskName: '',
    description: '',
    taskType: 'link',
    stage: 'pre_selection',
    isRequired: false,
    isDefault: false,
    isEnabled: true,
    allowedExtensions: '.pdf,.pptx,.zip',
    deadlineAt: '',
    isSubmissionOpen: true,
    teamStatuses: ['submitted'],
    teamIds: [],
  })

  const hasAssignmentTargets = form.teamStatuses.length > 0 || form.teamIds.length > 0

  const resetForm = useCallback(() => {
    setEditingTaskId(null)
    setAssignedTeams([])
    setTeamSearch('')
    setForm({
      taskName: '',
      description: '',
      taskType: 'link',
      stage: 'pre_selection',
      isRequired: false,
      isDefault: false,
      isEnabled: true,
      allowedExtensions: '.pdf,.pptx,.zip',
      deadlineAt: '',
      isSubmissionOpen: true,
      teamStatuses: ['submitted'],
      teamIds: [],
    })
  }, [])

  const loadAssignedTeams = useCallback(
    async (submissionTaskId) => {
      if (!submissionTaskId) {
        setAssignedTeams([])
        return
      }

      try {
        setLoadingAssignedTeams(true)
        const res = await fetch(apiUrl(`/api/admin/submission-tasks/${submissionTaskId}/teams`), { credentials: 'include' })
        const payload = await res.json()
        if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'โหลดทีมที่มอบหมายแล้วไม่สำเร็จ')
        setAssignedTeams(payload.data || [])
      } catch (err) {
        setAssignedTeams([])
        pushToast({ type: 'error', title: err?.message || 'โหลดทีมที่มอบหมายแล้วไม่สำเร็จ' })
      } finally {
        setLoadingAssignedTeams(false)
      }
    },
    [pushToast],
  )

  const loadTeamOptions = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/admin/selection/teams'), { credentials: 'include' })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) {
        setTeamOptions([])
        return
      }

      const dedup = new Map()
      ;(payload.data || []).forEach((row) => {
        if (row?.status === 'disbanded') return
        if (!row?.team_id || dedup.has(row.team_id)) return
        const teamName = row.team_name_th || row.team_name_en || '-'
        dedup.set(row.team_id, {
          teamId: row.team_id,
          teamCode: row.team_code || '-',
          teamName,
          status: row.status || '-',
          label: `${teamName} [${row.team_code}]`,
        })
      })

      setTeamOptions(Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label, 'th')))
    } catch {
      setTeamOptions([])
    }
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [tasksRes] = await Promise.all([
        fetch(apiUrl('/api/admin/submission-tasks'), { credentials: 'include' }),
        loadTeamOptions(),
      ])
      const tasksPayload = await tasksRes.json()
      if (!tasksRes.ok || !tasksPayload?.ok) throw new Error(tasksPayload?.message || 'ไม่สามารถโหลดข้อมูลได้')
      setRows(tasksPayload.data || [])
    } catch (err) {
      pushToast({ type: 'error', title: err?.message || 'โหลดรายการงานส่งผลงานไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [loadTeamOptions, pushToast])

  useEffect(() => {
    load()
  }, [load])

  const orderedRows = useMemo(
    () => [...rows].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.submissionTaskId - b.submissionTaskId),
    [rows],
  )

  const displayRows = useMemo(() => {
    const keyword = listSearch.trim().toLowerCase()
    return orderedRows.filter((row) => {
      if (stageFilter !== 'all' && row.stage !== stageFilter) return false
      if (!keyword) return true
      return [row.taskName, row.description, getStageLabel(row.stage), getTypeLabel(row.taskType)]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    })
  }, [listSearch, orderedRows, stageFilter])

  const reorderLocked = stageFilter !== 'all' || listSearch.trim().length > 0

  const teamOptionById = useMemo(() => {
    const map = new Map()
    teamOptions.forEach((item) => map.set(String(item.teamId), item))
    return map
  }, [teamOptions])

  const filteredTeamOptions = useMemo(() => {
    const keyword = teamSearch.trim().toLowerCase()
    if (!keyword) return teamOptions.slice(0, 180)
    return teamOptions
      .filter((item) => `${item.teamCode} ${item.teamName} ${item.status}`.toLowerCase().includes(keyword))
      .slice(0, 180)
  }, [teamOptions, teamSearch])

  const assignedTeamIdSet = useMemo(() => {
    const set = new Set()
    assignedTeams.forEach((item) => set.add(String(item.teamId)))
    return set
  }, [assignedTeams])

  const filteredAssignedTeams = useMemo(() => {
    if (!editingTaskId) return []
    const keyword = teamSearch.trim().toLowerCase()
    if (!keyword) return assignedTeams
    return assignedTeams.filter((item) => `${item.teamName} ${item.teamCode} ${item.status}`.toLowerCase().includes(keyword))
  }, [assignedTeams, editingTaskId, teamSearch])

  const filteredUnassignedTeams = useMemo(
    () => filteredTeamOptions.filter((item) => !assignedTeamIdSet.has(String(item.teamId))),
    [assignedTeamIdSet, filteredTeamOptions],
  )

  const startEdit = async (row) => {
    setEditingTaskId(row.submissionTaskId)
    setTeamSearch('')
    setAssignedTeams([])
    setForm({
      taskName: row.taskName || '',
      description: row.description || '',
      taskType: row.taskType || 'link',
      stage: row.stage || 'pre_selection',
      isRequired: Boolean(row.isRequired),
      isDefault: Boolean(row.isDefault),
      isEnabled: row.isEnabled !== false,
      allowedExtensions: row.allowedExtensions || '.pdf,.pptx,.zip',
      deadlineAt: formatDateInput(row.deadlineAt),
      isSubmissionOpen: true,
      teamStatuses: [],
      teamIds: [],
    })
    await loadAssignedTeams(row.submissionTaskId)
  }

  const saveTask = async () => {
    if (!form.taskName.trim()) {
      pushToast({ type: 'error', title: 'กรุณาระบุชื่องาน' })
      return
    }

    if (!editingTaskId && !form.isDefault && !hasAssignmentTargets) {
      pushToast({ type: 'error', title: 'กรุณาเลือกทีมอย่างน้อย 1 กลุ่มหรือ 1 ทีม' })
      return
    }

    try {
      setSaving(true)

      const payloadBase = {
        taskName: form.taskName.trim(),
        description: form.description.trim() || null,
        taskType: form.taskType,
        stage: form.stage,
        isRequired: form.isRequired,
        isDefault: form.isDefault,
        allowedExtensions: form.taskType === 'file' ? form.allowedExtensions : null,
        deadlineAt: form.deadlineAt || null,
        isEnabled: Boolean(form.isEnabled),
      }

      if (editingTaskId) {
        const res = await fetch(apiUrl(`/api/admin/submission-tasks/${editingTaskId}`), {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadBase),
        })
        const payload = await res.json()
        if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'บันทึกการแก้ไขไม่สำเร็จ')
        await load()
        pushToast({ title: 'บันทึกการแก้ไขเรียบร้อย' })
        return
      }

      const nextSortOrder = orderedRows.reduce((max, row) => Math.max(max, Number(row.sortOrder) || 0), 0) + 1
      const res = await fetch(apiUrl('/api/admin/submission-tasks'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payloadBase,
          sortOrder: nextSortOrder,
          isSubmissionOpen: Boolean(form.isSubmissionOpen),
          teamStatuses: form.teamStatuses,
          teamIds: form.teamIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0),
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'สร้างงานไม่สำเร็จ')
      await load()
      resetForm()
      pushToast({ title: `สร้างงานสำเร็จ (มอบหมายแล้ว ${payload.data?.assignedCount || 0} ทีม)` })
    } catch (err) {
      pushToast({ type: 'error', title: err?.message || 'บันทึกงานไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }

  const assignTeamsToTask = async () => {
    if (!editingTaskId) return
    if (!hasAssignmentTargets) {
      pushToast({ type: 'error', title: 'กรุณาเลือกทีมที่ต้องการมอบหมายเพิ่ม' })
      return
    }

    try {
      setAssigning(true)
      const res = await fetch(apiUrl(`/api/admin/submission-tasks/${editingTaskId}/assign`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSubmissionOpen: Boolean(form.isSubmissionOpen),
          teamStatuses: form.teamStatuses,
          teamIds: form.teamIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0),
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'มอบหมายเพิ่มไม่สำเร็จ')

      await load()
      setForm((prev) => ({ ...prev, teamStatuses: [], teamIds: [] }))
      await loadAssignedTeams(editingTaskId)
      pushToast({ title: `มอบหมายเพิ่มสำเร็จ (${payload.data?.assignedCount || 0} ทีม)` })
    } catch (err) {
      pushToast({ type: 'error', title: err?.message || 'มอบหมายเพิ่มไม่สำเร็จ' })
    } finally {
      setAssigning(false)
    }
  }

  const requestDeleteTask = (row) => {
    if (!row?.submissionTaskId) return
    setDeleteCandidate(row)
  }

  const confirmDeleteTask = async () => {
    if (!deleteCandidate?.submissionTaskId || deletingTaskId) return
    const row = deleteCandidate
    try {
      setDeletingTaskId(row.submissionTaskId)
      const res = await fetch(apiUrl(`/api/admin/submission-tasks/${row.submissionTaskId}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ลบงานไม่สำเร็จ')

      if (editingTaskId === row.submissionTaskId) {
        resetForm()
      }

      await load()
      pushToast({ type: 'warning', title: 'ลบงานเรียบร้อยแล้ว' })
    } catch (err) {
      pushToast({ type: 'error', title: err?.message || 'ลบงานไม่สำเร็จ' })
    } finally {
      setDeletingTaskId(null)
      setDeleteCandidate(null)
    }
  }

  const persistReorder = useCallback(
    async (nextRows) => {
      try {
        setReordering(true)
        const updates = nextRows.map((item, index) => ({ submissionTaskId: item.submissionTaskId, sortOrder: index + 1 }))
        const res = await fetch(apiUrl('/api/admin/submission-tasks/reorder'), {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        })
        const payload = await res.json()
        if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'จัดลำดับไม่สำเร็จ')
      } catch (err) {
        pushToast({ type: 'error', title: err?.message || 'จัดลำดับไม่สำเร็จ' })
        load()
      } finally {
        setReordering(false)
      }
    },
    [load, pushToast],
  )

  const reorderByIds = useCallback(
    async (fromTaskId, toTaskId) => {
      if (!fromTaskId || !toTaskId || fromTaskId === toTaskId) return
      const fromIndex = orderedRows.findIndex((item) => item.submissionTaskId === fromTaskId)
      const toIndex = orderedRows.findIndex((item) => item.submissionTaskId === toTaskId)
      if (fromIndex < 0 || toIndex < 0) return

      const next = [...orderedRows]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)

      const resequenced = next.map((item, index) => ({ ...item, sortOrder: index + 1 }))
      setRows(resequenced)
      await persistReorder(resequenced)
    },
    [orderedRows, persistReorder],
  )

  const moveTaskByStep = async (submissionTaskId, direction) => {
    if (reorderLocked) {
      pushToast({ type: 'info', title: 'ปิดการกรองก่อน แล้วค่อยจัดลำดับ' })
      return
    }
    const index = orderedRows.findIndex((item) => item.submissionTaskId === submissionTaskId)
    if (index < 0) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= orderedRows.length) return
    await reorderByIds(submissionTaskId, orderedRows[targetIndex].submissionTaskId)
  }

  const toggleStatus = (status) => {
    setForm((prev) => {
      const exists = prev.teamStatuses.includes(status)
      return {
        ...prev,
        teamStatuses: exists ? prev.teamStatuses.filter((item) => item !== status) : [...prev.teamStatuses, status],
      }
    })
  }

  const toggleTeam = (teamId) => {
    const value = String(teamId)
    setForm((prev) => {
      const exists = prev.teamIds.includes(value)
      return {
        ...prev,
        teamIds: exists ? prev.teamIds.filter((item) => item !== value) : [...prev.teamIds, value],
      }
    })
  }

  return (
    <div className="admin-ui-stack stp-page">
      <PageHeader
        title="งานที่ทีมต้องส่ง"
        actions={
          <div className="admin-ui-header-actions">
            <button type="button" className="admin-ui-btn" onClick={load}>
              <RefreshCw size={14} />
              รีเฟรชข้อมูล
            </button>
            {editingTaskId ? (
              <button type="button" className="admin-ui-btn" onClick={resetForm}>
                <X size={14} />
                ยกเลิกการแก้ไข
              </button>
            ) : null}
          </div>
        }
      />

      <section className="stp-layout">
        <article className="admin-ui-panel stp-list-panel">
          <FilterBar
            label="รายการงานทั้งหมด"
            right={
              <label>
                ขั้นตอน
                <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
                  <option value="all">ทั้งหมด</option>
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            }
          >
            <div className="stp-list-tools">
              <div className="stp-search">
                <Search size={14} />
                <input
                  value={listSearch}
                  onChange={(event) => setListSearch(event.target.value)}
                  placeholder="ค้นหาชื่องาน หรือรายละเอียด"
                />
              </div>
            </div>
          </FilterBar>

          <p className="stp-hint">
            {reorderLocked ? 'ปิดตัวกรองหรือค้นหาก่อน แล้วจึงลากจัดลำดับได้' : 'ลากการ์ดเพื่อจัดลำดับ หรือใช้ปุ่มขึ้น/ลง'}
          </p>

          <div className="stp-list">
            {loading ? (
              <LoadingState compact label="กำลังโหลดรายการงาน..." />
            ) : !displayRows.length ? (
              <EmptyState compact title="ไม่พบงานที่ตรงกับเงื่อนไข" description="ลองล้างคำค้นหา หรือเลือกขั้นตอนเป็นทั้งหมด" />
            ) : (
              displayRows.map((row) => {
                const index = orderedRows.findIndex((item) => item.submissionTaskId === row.submissionTaskId)
                const isFirst = index <= 0
                const isLast = index >= orderedRows.length - 1

                return (
                  <div
                    key={row.submissionTaskId}
                    className={`stp-card ${draggedTaskId === row.submissionTaskId ? 'is-dragging' : ''}`}
                    draggable={!reorderLocked && !reordering}
                    onDragStart={() => setDraggedTaskId(row.submissionTaskId)}
                    onDragOver={(event) => {
                      if (reorderLocked || reordering) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                    }}
                    onDrop={async (event) => {
                      event.preventDefault()
                      if (reorderLocked || reordering || !draggedTaskId) return
                      await reorderByIds(draggedTaskId, row.submissionTaskId)
                      setDraggedTaskId(null)
                    }}
                    onDragEnd={() => setDraggedTaskId(null)}
                  >
                    <div className="stp-card-main">
                      <div className={`stp-drag-handle ${reorderLocked ? 'disabled' : ''}`}>
                        <Menu size={14} />
                      </div>
                      <div className="stp-card-content">
                        <strong>{row.taskName}</strong>
                        <div className="stp-meta">
                          <span>{getStageLabel(row.stage)}</span>
                          <span>{getTypeLabel(row.taskType)}</span>
                          <span>{row.isRequired ? 'บังคับส่ง' : 'ไม่บังคับ'}</span>
                          <span>{row.isDefault ? 'งานตั้งต้นทีมใหม่' : 'งานเฉพาะทีมที่มอบหมาย'}</span>
                          <span>{row.isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                        </div>
                        {row.description ? <p>{row.description}</p> : null}
                        <small>กำหนดส่ง: {formatDateTime(row.deadlineAt)} | มอบหมายแล้ว {row.assignedTeamCount || 0} ทีม</small>
                      </div>
                    </div>

                    <div className="stp-card-actions">
                      <button type="button" className="admin-ui-mini-btn" onClick={() => startEdit(row)}>
                        <Pencil size={13} />
                        แก้ไข
                      </button>
                      <button type="button" className="admin-ui-mini-btn" onClick={() => moveTaskByStep(row.submissionTaskId, 'up')} disabled={reordering || isFirst}>
                        <ArrowUp size={13} />
                      </button>
                      <button type="button" className="admin-ui-mini-btn" onClick={() => moveTaskByStep(row.submissionTaskId, 'down')} disabled={reordering || isLast}>
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        className="admin-ui-mini-btn"
                        onClick={() => requestDeleteTask(row)}
                        disabled={deletingTaskId === row.submissionTaskId}
                      >
                        <Trash2 size={13} />
                        {deletingTaskId === row.submissionTaskId ? 'กำลังลบ...' : 'ลบ'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </article>

        <article className="admin-ui-panel stp-form-panel">
          <h3>{editingTaskId ? 'แก้ไขงานที่เลือก' : 'สร้างงานใหม่'}</h3>
          <p className="stp-hint">{editingTaskId ? 'แก้ข้อมูลแล้วกดบันทึกได้เลย' : 'กรอกข้อมูลงาน แล้วเลือกทีมที่จะมอบหมาย'}</p>

          <div className="stp-form-grid">
            <label>
              ชื่องาน
              <input value={form.taskName} onChange={(event) => setForm((prev) => ({ ...prev, taskName: event.target.value }))} placeholder="เช่น ลิงก์วิดีโอ Pitch" />
            </label>

            <label>
              ขั้นตอน
              <select value={form.stage} onChange={(event) => setForm((prev) => ({ ...prev, stage: event.target.value }))}>
                {STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label>
              ประเภทงาน
              <select value={form.taskType} onChange={(event) => setForm((prev) => ({ ...prev, taskType: event.target.value }))}>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label>
              กำหนดส่ง (ไม่บังคับ)
              <input type="datetime-local" value={form.deadlineAt} onChange={(event) => setForm((prev) => ({ ...prev, deadlineAt: event.target.value }))} />
            </label>

            <label className="full">
              รายละเอียด (ไม่บังคับ)
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} />
            </label>

            <div className="stp-check-grid full">
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(event) => setForm((prev) => ({ ...prev, isRequired: event.target.checked }))}
                />
                <span>เป็นงานบังคับส่ง</span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(event) => setForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
                  disabled={Boolean(editingTaskId)}
                />
                <span>ตั้งเป็นงานตั้งต้นสำหรับทีมใหม่</span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.isSubmissionOpen}
                  onChange={(event) => setForm((prev) => ({ ...prev, isSubmissionOpen: event.target.checked }))}
                />
                <span>เปิดให้ส่งได้ทันทีหลังมอบหมาย</span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.isEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
                />
                <span>เปิดใช้งานงานนี้</span>
              </label>
            </div>
            {editingTaskId ? <small>การเปลี่ยนสถานะงานตั้งต้น ทำได้เฉพาะตอนสร้างงานใหม่</small> : null}

            {form.taskType === 'file' ? (
              <label>
                ประเภทไฟล์ที่อนุญาต
                <input value={form.allowedExtensions} onChange={(event) => setForm((prev) => ({ ...prev, allowedExtensions: event.target.value }))} placeholder="เช่น .pdf,.pptx,.zip" />
              </label>
            ) : null}
          </div>

          <div className="stp-target-box">
            <strong>
              {editingTaskId
                ? 'มอบหมายเพิ่ม (ไม่ลบทีมเดิม)'
                : form.isDefault
                  ? 'เลือกทีมที่จะมอบหมายงานตอนนี้ (ไม่เลือกก็ได้ เพราะทีมใหม่จะได้อัตโนมัติ)'
                  : 'เลือกทีมที่จะมอบหมายงาน'}
            </strong>

            <div className="stp-chip-row">
              {ASSIGN_STATUS_OPTIONS.map((status) => (
                <button key={status.value} type="button" className={`stp-chip ${form.teamStatuses.includes(status.value) ? 'active' : ''}`} onClick={() => toggleStatus(status.value)}>
                  {status.label}
                </button>
              ))}
            </div>

            <div className="stp-team-tools">
              <div className="stp-search">
                <Search size={14} />
                <input value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} placeholder="ค้นหาชื่อทีม หรือรหัสทีม" />
              </div>
              <button type="button" className="admin-ui-btn" onClick={() => setForm((prev) => ({ ...prev, teamIds: [] }))} disabled={!form.teamIds.length}>
                ล้างทีมที่เลือก
              </button>
            </div>

            {editingTaskId ? (
              <div className="stp-assign-status-grid">
                <div className="stp-assigned-panel">
                  <div className="stp-assign-title">มอบหมายแล้ว ({assignedTeams.length})</div>
                  <div className="stp-team-list stp-team-list-assigned">
                    {loadingAssignedTeams ? (
                      <LoadingState compact label="กำลังโหลดทีมที่มอบหมายแล้ว..." />
                    ) : filteredAssignedTeams.length ? (
                      filteredAssignedTeams.map((team) => (
                        <div key={team.teamId} className="stp-team-item stp-team-item-readonly">
                          <div>
                            <strong>{team.teamName}</strong>
                            <span>{team.teamCode}</span>
                          </div>
                          <small>{getTeamStatusLabel(team.status)}</small>
                        </div>
                      ))
                    ) : (
                      <EmptyState compact title="ไม่พบทีมที่มอบหมายแล้ว" />
                    )}
                  </div>
                </div>

                <div className="stp-unassigned-panel">
                  <div className="stp-assign-title">ยังไม่มอบหมาย ({filteredUnassignedTeams.length})</div>
                  <div className="stp-team-list">
                    {filteredUnassignedTeams.map((option) => {
                      const selected = form.teamIds.includes(String(option.teamId))
                      return (
                        <label key={option.teamId} className={`stp-team-item ${selected ? 'active' : ''}`}>
                          <input type="checkbox" checked={selected} onChange={() => toggleTeam(option.teamId)} />
                          <div>
                            <strong>{option.teamName}</strong>
                            <span>{option.teamCode}</span>
                          </div>
                          <small>{getTeamStatusLabel(option.status)}</small>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="stp-team-list">
                {filteredUnassignedTeams.map((option) => {
                  const selected = form.teamIds.includes(String(option.teamId))
                  return (
                    <label key={option.teamId} className={`stp-team-item ${selected ? 'active' : ''}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleTeam(option.teamId)} />
                      <div>
                        <strong>{option.teamName}</strong>
                        <span>{option.teamCode}</span>
                      </div>
                      <small>{getTeamStatusLabel(option.status)}</small>
                    </label>
                  )
                })}
              </div>
            )}

            {!editingTaskId && !filteredUnassignedTeams.length ? (
              <EmptyState compact title="ไม่พบทีมที่ตรงกับคำค้นหา" />
            ) : null}

            {editingTaskId && !loadingAssignedTeams && !filteredAssignedTeams.length && !filteredUnassignedTeams.length ? (
              <EmptyState compact title="ไม่พบทีมที่ตรงกับคำค้นหา" />
            ) : null}

            <div className="stp-selected-row">
              {!!form.teamIds.length && form.teamIds.map((teamId) => {
                const option = teamOptionById.get(String(teamId))
                if (!option) return null
                return (
                  <button key={teamId} type="button" onClick={() => toggleTeam(teamId)}>
                    {option.teamName}
                    <X size={12} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="admin-ui-form-actions">
            <button
              type="button"
              className="admin-ui-btn admin-ui-btn-primary"
              onClick={saveTask}
              disabled={saving || !form.taskName.trim() || (!editingTaskId && !form.isDefault && !hasAssignmentTargets)}
            >
              <Save size={14} />
              {saving ? 'กำลังบันทึก...' : editingTaskId ? 'บันทึกการแก้ไข' : 'สร้างงานและมอบหมาย'}
            </button>
            {editingTaskId ? (
              <button type="button" className="admin-ui-btn" onClick={assignTeamsToTask} disabled={assigning || !hasAssignmentTargets}>
                <Users size={14} />
                {assigning ? 'กำลังมอบหมาย...' : 'มอบหมายเพิ่มให้ทีมที่เลือก'}
              </button>
            ) : null}
          </div>
        </article>
      </section>

      <AdminConfirmModal
        open={Boolean(deleteCandidate)}
        danger
        title={deleteCandidate ? `ยืนยันลบงาน "${deleteCandidate.taskName}"?` : 'ยืนยันลบงาน?'}
        description="ระบบจะลบงานนี้ออกจากรายการทันที และไม่สามารถย้อนกลับจากหน้านี้ได้"
        confirmLabel={deletingTaskId ? 'กำลังลบ...' : 'ลบงาน'}
        cancelLabel="ยกเลิก"
        onCancel={() => {
          if (!deletingTaskId) setDeleteCandidate(null)
        }}
        onConfirm={confirmDeleteTask}
      />
    </div>
  )
}
