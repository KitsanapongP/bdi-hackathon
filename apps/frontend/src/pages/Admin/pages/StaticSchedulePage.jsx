import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, ChevronDown, ChevronUp, Clock, GripVertical, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import PageHeader from '../shared/PageHeader'
import LoadingState from '../shared/LoadingState'
import { useAdminToast } from '../shared/adminContexts'

const VIEW_TYPES = [
  { value: 'milestone', label: 'ไทม์ไลน์ (Milestone)', hint: 'วันที่/ช่วงเวลา | กิจกรรม' },
  { value: 'onsite_timetable', label: 'ตารางรายวัน (Onsite)', hint: 'แยกวัน • เวลา | กิจกรรม' },
]

function formatThaiDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function hhmm(t) {
  return String(t || '').slice(0, 5)
}

function formatTimeRange(start, end) {
  const s = hhmm(start)
  const e = hhmm(end)
  if (!s && !e) return '-'
  return e ? `${s} - ${e}` : s
}

const EMPTY_ITEM_FORM = { titleTh: '', startTime: '09:00', endTime: '10:00', displayDateLabelTh: '', displayTimeLabelTh: '' }
const EMPTY_DAY_FORM = { dayDate: '', dayNameTh: '' }

export default function StaticSchedulePage() {
  const { pushToast } = useAdminToast()
  const [bundle, setBundle] = useState({ schedules: [], days: [], items: [] })
  const [selectedScheduleId, setSelectedScheduleId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // modals
  const [dayModal, setDayModal] = useState(null) // { mode:'create'|'edit', dayId?, form }
  const [itemModal, setItemModal] = useState(null) // { mode, dayId, itemId?, form }
  const [confirm, setConfirm] = useState(null) // { kind:'day'|'item', id, label }
  const [dragItem, setDragItem] = useState(null) // { dayId, itemId }
  const [overItemId, setOverItemId] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(apiUrl('/api/admin/schedules'), { credentials: 'include' })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'โหลดกำหนดการไม่สำเร็จ')
      const data = payload.data || { schedules: [], days: [], items: [] }
      setBundle(data)
      setSelectedScheduleId((prev) => {
        if (prev && data.schedules.some((s) => s.id === prev)) return prev
        return data.schedules[0]?.id ?? null
      })
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'โหลดกำหนดการไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => { load() }, [load])

  const selectedSchedule = useMemo(
    () => bundle.schedules.find((s) => s.id === selectedScheduleId) || null,
    [bundle.schedules, selectedScheduleId],
  )
  const isMilestone = selectedSchedule?.tableType === 'milestone'

  const daysWithItems = useMemo(() => {
    if (!selectedSchedule) return []
    const days = bundle.days
      .filter((d) => d.scheduleId === selectedSchedule.id)
      .slice()
      .sort((a, b) => String(a.dayDate).localeCompare(String(b.dayDate)) || a.sortOrder - b.sortOrder)
    return days.map((day) => ({
      ...day,
      items: bundle.items
        .filter((it) => it.dayId === day.id)
        .slice()
        .sort((a, b) => (a.sortOrder - b.sortOrder) || String(a.startTime).localeCompare(String(b.startTime))),
    }))
  }, [bundle, selectedSchedule])

  const apiCall = async (method, path, body) => {
    const res = await fetch(apiUrl(path), {
      method,
      credentials: 'include',
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ดำเนินการไม่สำเร็จ')
    return payload
  }

  const changeViewType = async (tableType) => {
    if (!selectedSchedule || tableType === selectedSchedule.tableType) return
    try {
      setBusy(true)
      await apiCall('PATCH', `/api/admin/schedules/${selectedSchedule.id}/view-type`, { tableType })
      pushToast({ variant: 'success', title: 'เปลี่ยนรูปแบบตารางแล้ว' })
      await load()
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'เปลี่ยนรูปแบบไม่สำเร็จ' })
    } finally {
      setBusy(false)
    }
  }

  const saveDay = async () => {
    const form = dayModal.form
    if (!form.dayDate) { pushToast({ variant: 'danger', title: 'กรุณาเลือกวันที่' }); return }
    try {
      setBusy(true)
      if (dayModal.mode === 'create') {
        await apiCall('POST', `/api/admin/schedules/${selectedSchedule.id}/days`, {
          dayDate: form.dayDate,
          dayNameTh: form.dayNameTh.trim() || null,
        })
      } else {
        await apiCall('PATCH', `/api/admin/schedules/days/${dayModal.dayId}`, {
          dayDate: form.dayDate,
          dayNameTh: form.dayNameTh.trim() || null,
        })
      }
      setDayModal(null)
      pushToast({ variant: 'success', title: 'บันทึกวันสำเร็จ' })
      await load()
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'บันทึกวันไม่สำเร็จ' })
    } finally {
      setBusy(false)
    }
  }

  const saveItem = async () => {
    const form = itemModal.form
    if (!form.titleTh.trim()) { pushToast({ variant: 'danger', title: 'กรุณากรอกชื่อกิจกรรม' }); return }

    const body = {
      titleTh: form.titleTh.trim(),
      titleEn: form.titleTh.trim(),
    }
    if (isMilestone) {
      body.startTime = '00:00'
      body.endTime = '00:01'
      body.displayDateLabelTh = form.displayDateLabelTh.trim() || null
      body.displayDateLabelEn = form.displayDateLabelTh.trim() || null
    } else {
      if (!form.startTime || !form.endTime) { pushToast({ variant: 'danger', title: 'กรุณากรอกเวลาเริ่มและสิ้นสุด' }); return }
      body.startTime = form.startTime
      body.endTime = form.endTime
    }

    try {
      setBusy(true)
      if (itemModal.mode === 'create') {
        const dayItemCount = daysWithItems.find((d) => d.id === itemModal.dayId)?.items.length ?? 0
        await apiCall('POST', '/api/admin/schedules/items', { dayId: itemModal.dayId, sortOrder: dayItemCount, ...body })
      } else {
        await apiCall('PATCH', `/api/admin/schedules/items/${itemModal.itemId}`, body)
      }
      setItemModal(null)
      pushToast({ variant: 'success', title: 'บันทึกกิจกรรมสำเร็จ' })
      await load()
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'บันทึกกิจกรรมไม่สำเร็จ' })
    } finally {
      setBusy(false)
    }
  }

  // เขียนลำดับใหม่ของกิจกรรมในวันเดียวกันแบบ optimistic — อัปเดต state ทันที ไม่รีโหลดทั้งหน้า
  const applyItemOrder = async (day, orderedItems) => {
    const posById = new Map(orderedItems.map((it, idx) => [it.id, idx]))
    const updates = orderedItems
      .map((it, idx) => ({ id: it.id, sortOrder: idx }))
      .filter((u) => {
        const original = day.items.find((it) => it.id === u.id)
        return original && original.sortOrder !== u.sortOrder
      })
    if (!updates.length) return

    // อัปเดตเฉพาะ sortOrder ของกิจกรรมในวันนี้ — ลำดับใหม่จะสะท้อนทันทีโดยไม่ refetch
    setBundle((prev) => ({
      ...prev,
      items: prev.items.map((it) => (posById.has(it.id) ? { ...it, sortOrder: posById.get(it.id) } : it)),
    }))

    try {
      await Promise.all(updates.map((u) => apiCall('PATCH', `/api/admin/schedules/items/${u.id}`, { sortOrder: u.sortOrder })))
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'จัดลำดับไม่สำเร็จ' })
      load()
    }
  }

  // ปุ่มลูกศรขึ้น/ลง (สำรองสำหรับทัช/คีย์บอร์ด)
  const moveItem = (day, index, dir) => {
    const target = index + dir
    if (target < 0 || target >= day.items.length) return
    const ordered = day.items.slice()
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    applyItemOrder(day, ordered)
  }

  // ลากเพื่อจัดลำดับภายในวันเดียวกัน
  const handleItemDrop = (day) => {
    if (!dragItem || dragItem.dayId !== day.id || !overItemId || dragItem.itemId === overItemId) {
      resetItemDrag()
      return
    }
    const ordered = day.items.slice()
    const from = ordered.findIndex((it) => it.id === dragItem.itemId)
    const to = ordered.findIndex((it) => it.id === overItemId)
    if (from < 0 || to < 0) {
      resetItemDrag()
      return
    }
    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)
    applyItemOrder(day, ordered)
    resetItemDrag()
  }

  const resetItemDrag = () => {
    setDragItem(null)
    setOverItemId(null)
  }

  const doDelete = async () => {
    try {
      setBusy(true)
      if (confirm.kind === 'day') {
        await apiCall('DELETE', `/api/admin/schedules/days/${confirm.id}`)
      } else {
        await apiCall('DELETE', `/api/admin/schedules/items/${confirm.id}`)
      }
      setConfirm(null)
      pushToast({ variant: 'warning', title: 'ลบแล้ว' })
      await load()
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'ลบไม่สำเร็จ' })
    } finally {
      setBusy(false)
    }
  }

  const openCreateDay = () => setDayModal({ mode: 'create', form: { ...EMPTY_DAY_FORM } })
  const openEditDay = (day) => setDayModal({ mode: 'edit', dayId: day.id, form: { dayDate: String(day.dayDate).slice(0, 10), dayNameTh: day.dayNameTh || '' } })
  const openCreateItem = (dayId) => setItemModal({ mode: 'create', dayId, form: { ...EMPTY_ITEM_FORM } })
  const openEditItem = (item) => setItemModal({
    mode: 'edit', itemId: item.id, dayId: item.dayId,
    form: { titleTh: item.titleTh || '', startTime: hhmm(item.startTime) || '09:00', endTime: hhmm(item.endTime) || '10:00', displayDateLabelTh: item.displayDateLabelTh || '', displayTimeLabelTh: item.displayTimeLabelTh || '' },
  })

  return (
    <div className="admin-ui-stack">
      <PageHeader
        title="จัดการกำหนดการ"
        actions={<button type="button" className="admin-ui-btn" onClick={load}><RefreshCw size={14} /> รีเฟรช</button>}
      />

      <article className="admin-ui-panel" style={{ background: 'var(--admin-ui-surface-soft)' }}>
        <p className="admin-ui-text-muted" style={{ margin: 0 }}>
          จัดการกำหนดการแบบเดียวกับที่แสดงในหน้า home — เพิ่ม/แก้ไข/ลบ "วัน" และ "กิจกรรม" ได้ในที่เดียว
          สลับรูปแบบการแสดงผลได้ระหว่าง ไทม์ไลน์ (milestone) และ ตารางรายวัน (onsite)
        </p>
      </article>

      {loading ? (
        <article className="admin-ui-panel"><LoadingState compact label="กำลังโหลดกำหนดการ..." /></article>
      ) : !selectedSchedule ? (
        <article className="admin-ui-panel"><p className="admin-ui-text-muted">ยังไม่มีชุดกำหนดการ</p></article>
      ) : (
        <>
          {/* schedule tabs */}
          {bundle.schedules.length > 1 && (
            <div className="admin-sched-tabs">
              {bundle.schedules.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`admin-sched-tab ${s.id === selectedScheduleId ? 'is-active' : ''}`}
                  onClick={() => setSelectedScheduleId(s.id)}
                >
                  {s.nameTh || s.code}
                  <span className={`admin-log-badge ${s.tableType === 'milestone' ? 'admin-log-badge-info' : 'admin-log-badge-warn'}`}>
                    {s.tableType === 'milestone' ? 'Milestone' : 'Onsite'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* schedule toolbar */}
          <article className="admin-ui-panel">
            <div className="admin-sched-toolbar">
              <div>
                <h3 style={{ margin: 0 }}>{selectedSchedule.nameTh}</h3>
                <span className="admin-ui-text-muted" style={{ fontSize: '0.82rem' }}>{daysWithItems.length} วัน · {daysWithItems.reduce((n, d) => n + d.items.length, 0)} กิจกรรม</span>
              </div>
              <div className="admin-sched-viewtype">
                <span className="admin-ui-text-muted" style={{ fontSize: '0.78rem' }}>รูปแบบ:</span>
                {VIEW_TYPES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    title={v.hint}
                    disabled={busy}
                    className={`admin-ui-mini-btn ${selectedSchedule.tableType === v.value ? 'admin-ui-mini-btn-active' : ''}`}
                    onClick={() => changeViewType(v.value)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </article>

          {/* day cards */}
          {daysWithItems.length === 0 ? (
            <article className="admin-ui-panel" style={{ textAlign: 'center' }}>
              <p className="admin-ui-text-muted">ยังไม่มีวันในกำหนดการนี้</p>
              <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={openCreateDay}><CalendarPlus size={14} /> เพิ่มวันแรก</button>
            </article>
          ) : (
            daysWithItems.map((day) => (
              <article key={day.id} className="admin-ui-panel admin-sched-day">
                <div className="admin-sched-day-head">
                  <div>
                    <strong className="admin-sched-day-date">{formatThaiDate(day.dayDate)}</strong>
                    {day.dayNameTh ? <span className="admin-sched-day-name">{day.dayNameTh}</span> : null}
                  </div>
                  <div className="admin-ui-inline-actions">
                    <button type="button" className="admin-ui-mini-btn" onClick={() => openEditDay(day)}><Pencil size={13} /> แก้วัน</button>
                    <button type="button" className="admin-ui-mini-btn admin-ui-mini-btn-danger" onClick={() => setConfirm({ kind: 'day', id: day.id, label: `${formatThaiDate(day.dayDate)} (พร้อม ${day.items.length} กิจกรรม)` })}><Trash2 size={13} /> ลบวัน</button>
                  </div>
                </div>

                <div className="admin-sched-items">
                  {day.items.length === 0 ? (
                    <div className="admin-sched-item admin-sched-item-empty">ยังไม่มีกิจกรรมในวันนี้</div>
                  ) : (
                    day.items.map((item, itemIdx) => (
                      <div
                        key={item.id}
                        className={`admin-sched-item ${dragItem?.itemId === item.id ? 'is-dragging' : ''} ${overItemId === item.id && dragItem && dragItem.dayId === day.id && dragItem.itemId !== item.id ? 'is-drop-target' : ''}`}
                        draggable
                        onDragStart={() => setDragItem({ dayId: day.id, itemId: item.id })}
                        onDragOver={(event) => {
                          if (!dragItem || dragItem.dayId !== day.id) return
                          event.preventDefault()
                          if (overItemId !== item.id) setOverItemId(item.id)
                        }}
                        onDrop={() => handleItemDrop(day)}
                        onDragEnd={resetItemDrag}
                      >
                        <span className="admin-sched-item-grip" title="ลากเพื่อจัดลำดับ" aria-hidden="true"><GripVertical size={14} /></span>
                        <div className="admin-sched-item-order">
                          <button type="button" className="admin-ui-mini-btn" disabled={busy || itemIdx === 0} title="เลื่อนขึ้น" onClick={() => moveItem(day, itemIdx, -1)}><ChevronUp size={13} /></button>
                          <button type="button" className="admin-ui-mini-btn" disabled={busy || itemIdx === day.items.length - 1} title="เลื่อนลง" onClick={() => moveItem(day, itemIdx, 1)}><ChevronDown size={13} /></button>
                        </div>
                        <div className="admin-sched-item-time">
                          {isMilestone
                            ? (item.displayDateLabelTh?.trim() || formatThaiDate(day.dayDate))
                            : (item.displayTimeLabelTh?.trim() || formatTimeRange(item.startTime, item.endTime))}
                        </div>
                        <div className="admin-sched-item-title">{item.titleTh || item.titleEn || '-'}</div>
                        <div className="admin-ui-inline-actions">
                          <button type="button" className="admin-ui-mini-btn" onClick={() => openEditItem(item)}><Pencil size={12} /></button>
                          <button type="button" className="admin-ui-mini-btn admin-ui-mini-btn-danger" onClick={() => setConfirm({ kind: 'item', id: item.id, label: item.titleTh })}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))
                  )}
                  <button type="button" className="admin-sched-add-item" onClick={() => openCreateItem(day.id)}><Plus size={14} /> เพิ่มกิจกรรม</button>
                </div>
              </article>
            ))
          )}

          {daysWithItems.length > 0 && (
            <button type="button" className="admin-ui-btn admin-ui-btn-primary admin-sched-add-day" onClick={openCreateDay}>
              <CalendarPlus size={14} /> เพิ่มวัน
            </button>
          )}
        </>
      )}

      {/* day modal */}
      {dayModal && (
        <div className="admin-log-modal-layer" role="dialog" aria-modal="true">
          <button type="button" className="admin-log-modal-backdrop" aria-label="ปิด" onClick={() => !busy && setDayModal(null)} />
          <div className="admin-log-modal-card admin-ui-panel" style={{ width: 'min(460px, 100%)' }}>
            <div className="admin-log-modal-head">
              <h3>{dayModal.mode === 'create' ? 'เพิ่มวัน' : 'แก้ไขวัน'}</h3>
              <button type="button" className="admin-ui-mini-btn" onClick={() => !busy && setDayModal(null)}><X size={14} /></button>
            </div>
            <div className="admin-ui-form">
              <label>วันที่
                <input type="date" value={dayModal.form.dayDate} onChange={(e) => setDayModal((m) => ({ ...m, form: { ...m.form, dayDate: e.target.value } }))} />
              </label>
              <label>ชื่อวัน (ไม่บังคับ เช่น วันแรก)
                <input value={dayModal.form.dayNameTh} onChange={(e) => setDayModal((m) => ({ ...m, form: { ...m.form, dayNameTh: e.target.value } }))} placeholder="เว้นว่างได้" />
              </label>
              <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={busy} onClick={saveDay}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
          </div>
        </div>
      )}

      {/* item modal */}
      {itemModal && (
        <div className="admin-log-modal-layer" role="dialog" aria-modal="true">
          <button type="button" className="admin-log-modal-backdrop" aria-label="ปิด" onClick={() => !busy && setItemModal(null)} />
          <div className="admin-log-modal-card admin-ui-panel" style={{ width: 'min(480px, 100%)' }}>
            <div className="admin-log-modal-head">
              <h3>{itemModal.mode === 'create' ? 'เพิ่มกิจกรรม' : 'แก้ไขกิจกรรม'}</h3>
              <button type="button" className="admin-ui-mini-btn" onClick={() => !busy && setItemModal(null)}><X size={14} /></button>
            </div>
            <div className="admin-ui-form">
              <label>ชื่อกิจกรรม
                <input value={itemModal.form.titleTh} onChange={(e) => setItemModal((m) => ({ ...m, form: { ...m.form, titleTh: e.target.value } }))} placeholder="เช่น ลงทะเบียน / Keynote" />
              </label>
              {isMilestone ? (
                <label>ป้ายวันที่/ช่วงเวลา (ไม่บังคับ — เว้นว่างจะใช้วันที่ของวัน)
                  <input value={itemModal.form.displayDateLabelTh} onChange={(e) => setItemModal((m) => ({ ...m, form: { ...m.form, displayDateLabelTh: e.target.value } }))} placeholder="เช่น 15 มิ.ย. / ภายในมิถุนายน" />
                </label>
              ) : (
                <div className="admin-sched-time-row">
                  <label><Clock size={12} /> เวลาเริ่ม
                    <input type="time" value={itemModal.form.startTime} onChange={(e) => setItemModal((m) => ({ ...m, form: { ...m.form, startTime: e.target.value } }))} />
                  </label>
                  <label>เวลาสิ้นสุด
                    <input type="time" value={itemModal.form.endTime} onChange={(e) => setItemModal((m) => ({ ...m, form: { ...m.form, endTime: e.target.value } }))} />
                  </label>
                </div>
              )}
              <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={busy} onClick={saveItem}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
          </div>
        </div>
      )}

      {/* confirm delete */}
      {confirm && (
        <div className="admin-log-modal-layer" role="dialog" aria-modal="true">
          <button type="button" className="admin-log-modal-backdrop" aria-label="ปิด" onClick={() => !busy && setConfirm(null)} />
          <div className="admin-log-modal-card admin-ui-panel" style={{ width: 'min(420px, 100%)' }}>
            <div className="admin-log-modal-head">
              <h3>ยืนยันการลบ</h3>
              <button type="button" className="admin-ui-mini-btn" onClick={() => !busy && setConfirm(null)}><X size={14} /></button>
            </div>
            <p className="admin-ui-text-muted">
              {confirm.kind === 'day' ? `ลบวัน ${confirm.label}? กิจกรรมทั้งหมดในวันนี้จะถูกลบด้วย` : `ลบกิจกรรม "${confirm.label}"?`}
            </p>
            <div className="admin-ui-header-actions" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="admin-ui-btn" disabled={busy} onClick={() => setConfirm(null)}>ยกเลิก</button>
              <button type="button" className="admin-ui-btn admin-ui-btn-danger" disabled={busy} onClick={doDelete}>{busy ? 'กำลังลบ...' : 'ลบ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
