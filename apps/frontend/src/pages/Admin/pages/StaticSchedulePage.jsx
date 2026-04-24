import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import DetailDrawer from '../shared/DetailDrawer'
import SectionHeading from '../shared/SectionHeading'
import StatusBadge from '../shared/StatusBadge'
import { useAdminToast } from '../shared/adminContexts'
import { normalizeTimeInput, toTimePayload } from '../utils/adminFormatters'

const scheduleAudienceLabel = {
  public: 'Public',
  all_users: 'All Users',
  approved_teams: 'Approved Teams',
  specific_teams: 'Specific Teams',
}

export default function StaticSchedulePage() {
  const { pushToast } = useAdminToast()
  const [loading, setLoading] = useState(true)
  const [bundle, setBundle] = useState({
    schedules: [],
    days: [],
    tracks: [],
    items: [],
  })
  const [activeDayFilter, setActiveDayFilter] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [savingScheduleId, setSavingScheduleId] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    dayId: '',
    trackId: '',
    startTime: '09:00',
    endTime: '10:00',
    titleTh: '',
    titleEn: '',
    descriptionTh: '',
    descriptionEn: '',
    locationTh: '',
    locationEn: '',
    speakerTh: '',
    speakerEn: '',
    audience: 'public',
    sortOrder: 0,
    isHighlight: false,
    isEnabled: true,
    displayDateLabelTh: '',
    displayDateLabelEn: '',
    displayTimeLabelTh: '',
    displayTimeLabelEn: '',
  })

  const schedules = useMemo(() => bundle.schedules || [], [bundle.schedules])
  const days = useMemo(
    () =>
      [...(bundle.days || [])].sort((a, b) => {
        const dayCompare = String(a.dayDate || '').localeCompare(String(b.dayDate || ''))
        if (dayCompare !== 0) return dayCompare
        return Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      }),
    [bundle.days],
  )
  const tracks = useMemo(() => bundle.tracks || [], [bundle.tracks])
  const items = useMemo(() => bundle.items || [], [bundle.items])

  const dayMap = useMemo(() => new Map(days.map((day) => [day.id, day])), [days])
  const trackMap = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks])
  const scheduleMap = useMemo(() => new Map(schedules.map((schedule) => [schedule.id, schedule])), [schedules])

  const fetchScheduleBundle = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/schedules'), { credentials: 'include' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'โหลดข้อมูล schedule ไม่สำเร็จ')
      }
      setBundle({
        schedules: payload?.data?.schedules || [],
        days: payload?.data?.days || [],
        tracks: payload?.data?.tracks || [],
        items: payload?.data?.items || [],
      })
    } catch (error) {
      console.error('Failed to fetch schedule bundle:', error)
      pushToast({ type: 'error', title: error?.message || 'โหลดข้อมูล schedule ไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchScheduleBundle()
  }, [fetchScheduleBundle])

  const buildFormFromItem = useCallback(
    (item) => ({
      dayId: String(item.dayId || ''),
      trackId: item.trackId ? String(item.trackId) : '',
      startTime: normalizeTimeInput(item.startTime),
      endTime: normalizeTimeInput(item.endTime),
      titleTh: item.titleTh || '',
      titleEn: item.titleEn || '',
      descriptionTh: item.descriptionTh || '',
      descriptionEn: item.descriptionEn || '',
      locationTh: item.locationTh || '',
      locationEn: item.locationEn || '',
      speakerTh: item.speakerTh || '',
      speakerEn: item.speakerEn || '',
      audience: item.audience || 'public',
      sortOrder: Number(item.sortOrder || 0),
      isHighlight: Boolean(item.isHighlight),
      isEnabled: Boolean(item.isEnabled),
      displayDateLabelTh: item.displayDateLabelTh || '',
      displayDateLabelEn: item.displayDateLabelEn || '',
      displayTimeLabelTh: item.displayTimeLabelTh || '',
      displayTimeLabelEn: item.displayTimeLabelEn || '',
    }),
    [],
  )

  const openCreate = useCallback(() => {
    const preferredDay = days.find((item) => item.isEnabled) || days[0]
    setEditingId(null)
    setErrors({})
    setForm({
      dayId: preferredDay ? String(preferredDay.id) : '',
      trackId: '',
      startTime: '09:00',
      endTime: '10:00',
      titleTh: '',
      titleEn: '',
      descriptionTh: '',
      descriptionEn: '',
      locationTh: '',
      locationEn: '',
      speakerTh: '',
      speakerEn: '',
      audience: 'public',
      sortOrder: 0,
      isHighlight: false,
      isEnabled: true,
      displayDateLabelTh: '',
      displayDateLabelEn: '',
      displayTimeLabelTh: '',
      displayTimeLabelEn: '',
    })
    setDrawerOpen(true)
  }, [days])

  const openEdit = useCallback(
    (item) => {
      setEditingId(item.id)
      setErrors({})
      setForm(buildFormFromItem(item))
      setDrawerOpen(true)
    },
    [buildFormFromItem],
  )

  const selectedDay = dayMap.get(Number(form.dayId)) || null
  const trackOptions = useMemo(() => {
    if (!selectedDay) return []
    return tracks.filter((track) => track.scheduleId === selectedDay.scheduleId)
  }, [selectedDay, tracks])

  useEffect(() => {
    if (!form.trackId) return
    const trackExists = trackOptions.some((track) => String(track.id) === String(form.trackId))
    if (trackExists) return
    setForm((prev) => ({ ...prev, trackId: '' }))
  }, [trackOptions, form.trackId])

  const validate = useCallback(() => {
    const next = {}
    if (!form.dayId) next.dayId = 'กรุณาเลือกวันกำหนดการ'
    if (!form.startTime) next.startTime = 'กรุณากรอกเวลาเริ่ม'
    if (!form.endTime) next.endTime = 'กรุณากรอกเวลาสิ้นสุด'
    if (!form.titleTh.trim()) next.titleTh = 'กรุณากรอกหัวข้อภาษาไทย'
    if (!form.titleEn.trim()) next.titleEn = 'กรุณากรอกหัวข้อภาษาอังกฤษ'

    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      next.endTime = 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }, [form])

  const save = useCallback(async () => {
    if (!validate()) return

    const payload = {
      dayId: Number(form.dayId),
      trackId: form.trackId ? Number(form.trackId) : null,
      startTime: toTimePayload(form.startTime),
      endTime: toTimePayload(form.endTime),
      titleTh: form.titleTh.trim(),
      titleEn: form.titleEn.trim(),
      descriptionTh: form.descriptionTh.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
      locationTh: form.locationTh.trim() || null,
      locationEn: form.locationEn.trim() || null,
      speakerTh: form.speakerTh.trim() || null,
      speakerEn: form.speakerEn.trim() || null,
      audience: form.audience,
      sortOrder: Number(form.sortOrder || 0),
      isHighlight: form.isHighlight,
      isEnabled: form.isEnabled,
      displayDateLabelTh: form.displayDateLabelTh.trim() || null,
      displayDateLabelEn: form.displayDateLabelEn.trim() || null,
      displayTimeLabelTh: form.displayTimeLabelTh.trim() || null,
      displayTimeLabelEn: form.displayTimeLabelEn.trim() || null,
    }

    const isEdit = Boolean(editingId)

    try {
      const response = await fetch(apiUrl(isEdit ? `/api/admin/schedules/items/${editingId}` : '/api/admin/schedules/items'), {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || 'บันทึกรายการกำหนดการไม่สำเร็จ')
      }

      pushToast({
        title: isEdit ? 'อัปเดตกำหนดการแล้ว' : 'เพิ่มกำหนดการแล้ว',
        description: payload.titleEn,
      })
      setDrawerOpen(false)
      await fetchScheduleBundle()
    } catch (error) {
      console.error('Failed to save schedule item:', error)
      pushToast({ type: 'error', title: error?.message || 'บันทึกไม่สำเร็จ' })
    }
  }, [editingId, fetchScheduleBundle, form, pushToast, validate])

  const remove = useCallback(
    async (id) => {
      const target = items.find((item) => item.id === id)
      try {
        const response = await fetch(apiUrl(`/api/admin/schedules/items/${id}`), {
          method: 'DELETE',
          credentials: 'include',
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || !result?.ok) {
          throw new Error(result?.message || 'ลบรายการไม่สำเร็จ')
        }
        pushToast({
          type: 'warning',
          title: 'ลบกำหนดการแล้ว',
          description: target?.titleEn || '',
        })
        await fetchScheduleBundle()
      } catch (error) {
        console.error('Failed to delete schedule item:', error)
        pushToast({ type: 'error', title: error?.message || 'ลบรายการไม่สำเร็จ' })
      }
    },
    [fetchScheduleBundle, items, pushToast],
  )

  const updateScheduleViewType = useCallback(
    async (scheduleId, tableType) => {
      try {
        setSavingScheduleId(scheduleId)
        const response = await fetch(apiUrl(`/api/admin/schedules/${scheduleId}/view-type`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tableType }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || !result?.ok) {
          throw new Error(result?.message || 'อัปเดตรูปแบบตารางไม่สำเร็จ')
        }

        setBundle((prev) => ({
          ...prev,
          schedules: (prev.schedules || []).map((schedule) =>
            schedule.id === scheduleId ? { ...schedule, tableType } : schedule,
          ),
        }))
        pushToast({ title: 'อัปเดตรูปแบบตารางแล้ว' })
      } catch (error) {
        console.error('Failed to update schedule view type:', error)
        pushToast({ type: 'error', title: error?.message || 'อัปเดตรูปแบบตารางไม่สำเร็จ' })
      } finally {
        setSavingScheduleId(null)
      }
    },
    [pushToast],
  )

  const rows = useMemo(
    () =>
      items.map((item) => {
        const day = dayMap.get(item.dayId)
        const track = item.trackId ? trackMap.get(item.trackId) : null
        const schedule = day ? scheduleMap.get(day.scheduleId) : null
        const dayLabel = [day?.dayNameEn || day?.dayNameTh, day?.dayDate].filter(Boolean).join(' • ')

        return {
          ...item,
          dayLabel,
          scheduleLabel: schedule?.nameEn || schedule?.nameTh || '-',
          tableType: schedule?.tableType || 'onsite_timetable',
          trackLabel: track ? track.trackNameEn || track.trackNameTh : 'Default Track',
          timeLabel: `${normalizeTimeInput(item.startTime)} - ${normalizeTimeInput(item.endTime)}`,
        }
      }),
    [items, dayMap, trackMap, scheduleMap],
  )

  const dayFilters = useMemo(
    () => [
      { label: 'All Days', value: 'all' },
      ...days.map((day) => ({
        label: day.dayNameEn || day.dayNameTh || day.dayDate,
        value: String(day.id),
      })),
    ],
    [days],
  )

  const filteredRows = useMemo(() => {
    if (activeDayFilter === 'all') return rows
    return rows.filter((row) => String(row.dayId) === activeDayFilter)
  }, [rows, activeDayFilter])

  const stats = useMemo(() => {
    const activeItems = items.filter((item) => item.isEnabled).length
    const highlighted = items.filter((item) => item.isHighlight).length
    const usedDays = new Set(items.map((item) => item.dayId)).size
    return {
      total: items.length,
      activeItems,
      highlighted,
      usedDays,
    }
  }, [items])

  return (
    <div className="admin-ui-stack">
      <SectionHeading
        title="Static Content: Schedule"
        description="จัดการรายการกำหนดการจากตาราง event_schedule_items พร้อมตัวกรองรายวันและการแสดงผลครบทุกข้อมูล"
        right={
          <div className="admin-ui-form-actions">
            <button type="button" className="admin-ui-btn" onClick={fetchScheduleBundle}>
              <RefreshCw size={15} />
              Refresh
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={openCreate}>
              <Plus size={15} />
              Add Session
            </button>
          </div>
        }
      />

      <section className="admin-ui-stat-grid">
        <article className="admin-ui-stat-card">
          <span>Items</span>
          <strong>{stats.total}</strong>
          <small>sessions in schedule</small>
        </article>
        <article className="admin-ui-stat-card success">
          <span>Enabled</span>
          <strong>{stats.activeItems}</strong>
          <small>visible on website</small>
        </article>
        <article className="admin-ui-stat-card info">
          <span>Highlight</span>
          <strong>{stats.highlighted}</strong>
          <small>featured sessions</small>
        </article>
        <article className="admin-ui-stat-card warn">
          <span>Active Days</span>
          <strong>{stats.usedDays}</strong>
          <small>days with sessions</small>
        </article>
      </section>

      <div className="admin-ui-chip-row">
        {dayFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`admin-ui-chip-btn ${activeDayFilter === filter.value ? 'active' : ''}`}
            onClick={() => setActiveDayFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <section className="admin-ui-panel">
        <h4>Schedule Table Type</h4>
        <div className="admin-ui-two-col">
          {schedules.map((schedule) => (
            <label key={schedule.id}>
              {schedule.nameTh || schedule.nameEn || `Schedule #${schedule.id}`}
              <select
                value={schedule.tableType || 'onsite_timetable'}
                disabled={savingScheduleId === schedule.id}
                onChange={(event) => updateScheduleViewType(schedule.id, event.target.value)}
              >
                <option value="onsite_timetable">Onsite Timetable (เวลา + หัวข้อ)</option>
                <option value="milestone">Milestone (วันที่ + กิจกรรม)</option>
              </select>
            </label>
          ))}
        </div>
      </section>

      <AdminDataTable
        loading={loading}
        rows={filteredRows}
        searchKeys={[
          'titleTh',
          'titleEn',
          'locationTh',
          'locationEn',
          'speakerTh',
          'speakerEn',
          'dayLabel',
          'trackLabel',
          'displayDateLabelTh',
          'displayTimeLabelTh',
        ]}
        searchPlaceholder="ค้นหาหัวข้อ, วิทยากร, สถานที่"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'Enabled', value: 'enabled', predicate: (row) => row.isEnabled },
          { label: 'Disabled', value: 'disabled', predicate: (row) => !row.isEnabled },
          { label: 'Highlight', value: 'highlight', predicate: (row) => row.isHighlight },
        ]}
        columns={[
          {
            key: 'timeLabel',
            label: 'Time',
            render: (row) => (
              <div className="admin-ui-col-stack">
                <strong>{row.timeLabel}</strong>
                <span>Sort #{row.sortOrder}</span>
              </div>
            ),
          },
          {
            key: 'dayLabel',
            label: 'Day / Track',
            render: (row) => (
              <div className="admin-ui-col-stack">
                <strong>{row.dayLabel || '-'}</strong>
                <span>{row.trackLabel}</span>
              </div>
            ),
          },
          {
            key: 'titleEn',
            label: 'Session',
            render: (row) => (
              <div className="admin-ui-col-stack">
                <strong>{row.titleEn}</strong>
                <span>{row.titleTh}</span>
                <span>{row.locationEn || row.locationTh || '-'}</span>
              </div>
            ),
          },
          {
            key: 'audience',
            label: 'Audience / State',
            render: (row) => (
              <div className="admin-ui-col-stack">
                <span>{scheduleAudienceLabel[row.audience] || row.audience}</span>
                <StatusBadge status={row.isEnabled ? 'ENABLED' : 'DISABLED'} label={row.isEnabled ? 'Enabled' : 'Disabled'} />
                {row.isHighlight ? <StatusBadge status="RESUBMITTED" label="Highlight" /> : null}
              </div>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="admin-ui-row-actions">
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
        title={editingId ? 'Edit Schedule Session' : 'Create Schedule Session'}
        subtitle="ข้อมูลจะถูก sync เข้าตาราง event_schedule_items และแสดงผลในหน้า Home"
      >
        <div className="admin-ui-form">
          <div className="admin-ui-two-col">
            <label htmlFor="schedule-day">
              Day *
              <select
                id="schedule-day"
                value={form.dayId}
                onChange={(event) => setForm((prev) => ({ ...prev, dayId: event.target.value }))}
              >
                <option value="">เลือกวัน</option>
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.dayNameEn || day.dayNameTh || day.dayDate} ({day.dayDate})
                  </option>
                ))}
              </select>
              {errors.dayId ? <small>{errors.dayId}</small> : null}
            </label>

            <label htmlFor="schedule-track">
              Track
              <select
                id="schedule-track"
                value={form.trackId}
                onChange={(event) => setForm((prev) => ({ ...prev, trackId: event.target.value }))}
              >
                <option value="">Default Track</option>
                {trackOptions.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.trackNameEn || track.trackNameTh}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label htmlFor="schedule-start-time">
              Start Time *
              <input
                id="schedule-start-time"
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
              />
              {errors.startTime ? <small>{errors.startTime}</small> : null}
            </label>

            <label htmlFor="schedule-end-time">
              End Time *
              <input
                id="schedule-end-time"
                type="time"
                value={form.endTime}
                onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
              />
              {errors.endTime ? <small>{errors.endTime}</small> : null}
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label htmlFor="schedule-display-date-label-th">
              display_date_label_th (override)
              <input
                id="schedule-display-date-label-th"
                value={form.displayDateLabelTh}
                onChange={(event) => setForm((prev) => ({ ...prev, displayDateLabelTh: event.target.value }))}
                placeholder="เช่น 14 มิ.ย. - 18 มิ.ย."
              />
            </label>

            <label htmlFor="schedule-display-time-label-th">
              display_time_label_th (override)
              <input
                id="schedule-display-time-label-th"
                value={form.displayTimeLabelTh}
                onChange={(event) => setForm((prev) => ({ ...prev, displayTimeLabelTh: event.target.value }))}
                placeholder="เช่น 15.30 เป็นต้นไป ถึงเที่ยงคืน"
              />
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label htmlFor="schedule-title-th">
              title_th *
              <input
                id="schedule-title-th"
                value={form.titleTh}
                onChange={(event) => setForm((prev) => ({ ...prev, titleTh: event.target.value }))}
              />
              {errors.titleTh ? <small>{errors.titleTh}</small> : null}
            </label>

            <label htmlFor="schedule-title-en">
              title_en *
              <input
                id="schedule-title-en"
                value={form.titleEn}
                onChange={(event) => setForm((prev) => ({ ...prev, titleEn: event.target.value }))}
              />
              {errors.titleEn ? <small>{errors.titleEn}</small> : null}
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label htmlFor="schedule-location-th">
              location_th
              <input
                id="schedule-location-th"
                value={form.locationTh}
                onChange={(event) => setForm((prev) => ({ ...prev, locationTh: event.target.value }))}
              />
            </label>

            <label htmlFor="schedule-location-en">
              location_en
              <input
                id="schedule-location-en"
                value={form.locationEn}
                onChange={(event) => setForm((prev) => ({ ...prev, locationEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label htmlFor="schedule-speaker-th">
              speaker_th
              <input
                id="schedule-speaker-th"
                value={form.speakerTh}
                onChange={(event) => setForm((prev) => ({ ...prev, speakerTh: event.target.value }))}
              />
            </label>

            <label htmlFor="schedule-speaker-en">
              speaker_en
              <input
                id="schedule-speaker-en"
                value={form.speakerEn}
                onChange={(event) => setForm((prev) => ({ ...prev, speakerEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label htmlFor="schedule-audience">
              audience
              <select
                id="schedule-audience"
                value={form.audience}
                onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))}
              >
                {Object.entries(scheduleAudienceLabel).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="schedule-sort-order">
              sort_order
              <input
                id="schedule-sort-order"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              />
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label htmlFor="schedule-description-th">
              description_th
              <textarea
                id="schedule-description-th"
                rows={3}
                value={form.descriptionTh}
                onChange={(event) => setForm((prev) => ({ ...prev, descriptionTh: event.target.value }))}
              />
            </label>

            <label htmlFor="schedule-description-en">
              description_en
              <textarea
                id="schedule-description-en"
                rows={3}
                value={form.descriptionEn}
                onChange={(event) => setForm((prev) => ({ ...prev, descriptionEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label className="admin-ui-check">
              <input
                type="checkbox"
                checked={form.isHighlight}
                onChange={(event) => setForm((prev) => ({ ...prev, isHighlight: event.target.checked }))}
              />
              <span>is_highlight</span>
            </label>

            <label className="admin-ui-check">
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(event) => setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span>is_enabled</span>
            </label>
          </div>

          <div className="admin-ui-panel">
            <h3>Preview</h3>
            <div className="admin-ui-col-stack">
              <strong>{form.titleEn || '-'}</strong>
              <span>{form.titleTh || '-'}</span>
              <span>
                {form.startTime || '--:--'} - {form.endTime || '--:--'}
              </span>
              <span>{selectedDay?.dayDate || '-'}</span>
              <span>{scheduleAudienceLabel[form.audience] || form.audience}</span>
            </div>
          </div>

          <div className="admin-ui-form-actions">
            <button type="button" className="admin-ui-btn" onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={save}>
              <Save size={14} />
              Save
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}
