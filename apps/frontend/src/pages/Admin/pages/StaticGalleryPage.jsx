import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarClock,
  ChevronDown,
  ImagePlus,
  Images,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminConfirmModal from '../shared/AdminConfirmModal'
import DetailDrawer from '../shared/DetailDrawer'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'
import { formatDateInput, formatDateTime } from '../utils/adminFormatters'

const EMPTY_FORM = {
  captionTh: '',
  captionEn: '',
  imageStorageKey: '',
  imageFile: null,
  imageFileName: '',
  imageType: '',
  imageSize: 0,
  imageAltTh: '',
  imageAltEn: '',
  sortOrder: 1,
  isEnabled: true,
  startAt: '',
  endAt: '',
}

const FILTERS = [
  { label: 'ทั้งหมด', value: 'all' },
  { label: 'เปิดใช้งาน', value: 'active' },
  { label: 'ปิดใช้งาน', value: 'inactive' },
]

export default function StaticGalleryPage() {
  const { pushToast } = useAdminToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState(EMPTY_FORM)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [localPreview, setLocalPreview] = useState('')
  const [dragId, setDragId] = useState(null)
  const [dropId, setDropId] = useState(null)
  const [bulk, setBulk] = useState(null) // { done, total, failed } ระหว่างอัปโหลดหลายรูป
  const fileInputRef = useRef(null)
  const bulkInputRef = useRef(null)

  const fetchGallery = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/gallery'), { credentials: 'include' })
      const data = await response.json()
      if (data.ok) {
        setItems(
          data.data.map((item) => ({
            id: item.id,
            captionTh: item.captionTh || '',
            captionEn: item.captionEn || '',
            imageStorageKey: item.imageStorageKey || item.imageUrl || '',
            imageUrl: item.imageUrl || item.imageStorageKey || '',
            thumbUrl: item.thumbUrl || item.imageUrl || item.imageStorageKey || '',
            imageAltTh: item.imageAltTh || '',
            imageAltEn: item.imageAltEn || '',
            sortOrder: item.sortOrder || 0,
            isEnabled: item.isEnabled !== false,
            startAt: item.startAt || null,
            endAt: item.endAt || null,
          })),
        )
      }
    } catch (error) {
      console.error('Failed to fetch gallery:', error)
      pushToast({ type: 'error', title: 'ไม่สามารถโหลดข้อมูลรูปภาพได้' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchGallery()
  }, [fetchGallery])

  // ล้าง object URL ของรูปตัวอย่างเมื่อเปลี่ยน/ปิด
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const ordered = useMemo(() => [...items].sort((a, b) => a.sortOrder - b.sortOrder), [items])

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ordered.filter((item) => {
      if (filter === 'active' && !item.isEnabled) return false
      if (filter === 'inactive' && item.isEnabled) return false
      if (!q) return true
      return `${item.captionTh} ${item.captionEn}`.toLowerCase().includes(q)
    })
  }, [ordered, search, filter])

  const enabledCount = useMemo(() => items.filter((item) => item.isEnabled).length, [items])

  const resetPreview = () => {
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }

  const openCreate = () => {
    const nextSortOrder = items.length ? Math.max(...items.map((item) => Number(item.sortOrder) || 0)) + 1 : 1
    resetPreview()
    setEditingId(null)
    setErrors({})
    setShowAdvanced(false)
    setForm({ ...EMPTY_FORM, sortOrder: nextSortOrder })
    setDrawerOpen(true)
  }

  const openEdit = (item) => {
    resetPreview()
    setEditingId(item.id)
    setErrors({})
    setShowAdvanced(false)
    setForm({
      captionTh: item.captionTh || '',
      captionEn: item.captionEn || '',
      imageStorageKey: item.imageStorageKey || '',
      imageFile: null,
      imageFileName: item.imageStorageKey?.split('/').pop() || '',
      imageType: '',
      imageSize: 0,
      imageAltTh: item.imageAltTh || '',
      imageAltEn: item.imageAltEn || '',
      sortOrder: item.sortOrder || 0,
      isEnabled: item.isEnabled !== false,
      startAt: formatDateInput(item.startAt),
      endAt: formatDateInput(item.endAt),
    })
    setDrawerOpen(true)
  }

  const previewImageStorageKey = useMemo(
    () => (form.imageFileName ? `/static/content/gallery/${form.imageFileName}` : form.imageStorageKey),
    [form.imageFileName, form.imageStorageKey],
  )

  const drawerPreviewSrc = localPreview || (form.imageStorageKey ? apiUrl(form.imageStorageKey) : '')

  const onPickFile = (file) => {
    if (!file) return
    resetPreview()
    setLocalPreview(URL.createObjectURL(file))
    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imageFileName: file.name,
      imageType: file.type,
      imageSize: file.size,
    }))
    setErrors((prev) => ({ ...prev, image: undefined }))
  }

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  const extFromType = (type) =>
    ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg' })[type] || '.jpg'

  // อัปโหลดหลายรูปทีเดียว: สร้างแถว + อัปไฟล์ต่อรูป (ขนาน 3 งาน) โดยไม่ต้องกรอก caption
  const onBulkFiles = async (fileList) => {
    const all = Array.from(fileList || [])
    if (!all.length) return

    const valid = all.filter((file) => ALLOWED_TYPES.includes(file.type) && file.size <= 8 * 1024 * 1024)
    // เรียงตามชื่อไฟล์ (รองรับเลขในชื่อ เช่น 2 มาก่อน 10) เพื่อให้ลำดับตรงกับที่ผู้ใช้ตั้งชื่อไว้
    valid.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
    const skipped = all.length - valid.length
    if (!valid.length) {
      pushToast({ type: 'error', title: 'ไม่มีไฟล์ที่อัปโหลดได้', description: 'รองรับ PNG / JPG / WEBP / SVG ไม่เกิน 8 MB' })
      return
    }

    const baseSort = items.length ? Math.max(...items.map((item) => Number(item.sortOrder) || 0)) : 0
    let done = 0
    let failed = 0
    setBulk({ done: 0, total: valid.length, failed: 0 })

    const uploadOne = async (file, index) => {
      const uniqueName = `atmos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${extFromType(file.type)}`
      const createRes = await fetch(apiUrl('/api/admin/gallery'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          imageStorageKey: `/static/content/gallery/${uniqueName}`,
          isEnabled: true,
          sortOrder: baseSort + index + 1,
        }),
      })
      const created = await createRes.json()
      if (!created.ok) throw new Error(created.message || 'สร้างรายการไม่สำเร็จ')
      const id = created.data.id
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('fileName', uniqueName)
        const upRes = await fetch(apiUrl(`/api/admin/gallery/${id}/image`), { method: 'POST', credentials: 'include', body: fd })
        const up = await upRes.json()
        if (!up.ok) throw new Error(up.message || 'อัปโหลดรูปไม่สำเร็จ')
      } catch (err) {
        // ลบแถวที่สร้างไว้ ถ้าอัปไฟล์ไม่สำเร็จ กันรายการรูปเสีย
        await fetch(apiUrl(`/api/admin/gallery/${id}`), { method: 'DELETE', credentials: 'include' }).catch(() => {})
        throw err
      }
    }

    let cursor = 0
    const worker = async () => {
      while (cursor < valid.length) {
        const index = cursor++
        try {
          await uploadOne(valid[index], index)
        } catch (error) {
          failed++
          console.error('bulk upload failed:', error)
        }
        done++
        setBulk({ done, total: valid.length, failed })
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, valid.length) }, worker))

    setBulk(null)
    const okCount = valid.length - failed
    pushToast({
      type: failed ? 'warning' : 'success',
      title: `อัปโหลดสำเร็จ ${okCount} รูป`,
      description:
        [failed ? `ล้มเหลว ${failed}` : null, skipped ? `ข้าม ${skipped} (ไฟล์ไม่รองรับ/ใหญ่เกิน)` : null]
          .filter(Boolean)
          .join(' · ') || undefined,
    })
    await fetchGallery()
  }

  const validate = () => {
    const next = {}
    if (!editingId && !form.imageFile && !previewImageStorageKey.trim()) {
      next.image = 'กรุณาอัปโหลดรูปภาพ'
    }
    if (form.imageType && !['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(form.imageType)) {
      next.image = 'รองรับเฉพาะ PNG / JPG / WEBP / SVG'
    }
    if (form.imageSize > 8 * 1024 * 1024) {
      next.image = 'ไฟล์ต้องไม่เกิน 8 MB'
    }
    if (form.startAt && form.endAt) {
      const start = new Date(form.startAt).getTime()
      const end = new Date(form.endAt).getTime()
      if (!Number.isNaN(start) && !Number.isNaN(end) && start > end) {
        next.endAt = 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const uploadImageIfNeeded = async (photoId) => {
    if (!form.imageFile) return
    const formData = new FormData()
    formData.append('file', form.imageFile)
    formData.append('fileName', form.imageFileName.trim() || form.imageFile.name)
    const uploadResponse = await fetch(apiUrl(`/api/admin/gallery/${photoId}/image`), {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const uploadData = await uploadResponse.json()
    if (!uploadData.ok) throw new Error(uploadData.message || 'อัปโหลดรูปภาพไม่สำเร็จ')
  }

  const onSubmit = async () => {
    if (!validate()) return
    const payload = {
      captionTh: form.captionTh.trim() || null,
      captionEn: form.captionEn.trim() || null,
      imageStorageKey: previewImageStorageKey.trim(),
      imageAltTh: form.imageAltTh.trim() || null,
      imageAltEn: form.imageAltEn.trim() || null,
      sortOrder: Math.max(0, Number(form.sortOrder) || 0),
      isEnabled: Boolean(form.isEnabled),
      startAt: form.startAt || null,
      endAt: form.endAt || null,
    }

    try {
      if (editingId) {
        const response = await fetch(apiUrl(`/api/admin/gallery/${editingId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (data.ok) {
          await uploadImageIfNeeded(editingId)
          pushToast({ title: 'อัปเดตรูปภาพสำเร็จ', description: form.captionTh || form.captionEn })
          await fetchGallery()
        } else {
          pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
        }
      } else {
        const response = await fetch(apiUrl('/api/admin/gallery'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (data.ok) {
          await uploadImageIfNeeded(data.data.id)
          pushToast({ title: 'เพิ่มรูปภาพสำเร็จ', description: form.captionTh || form.captionEn })
          await fetchGallery()
        } else {
          pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
        }
      }
    } catch (error) {
      console.error('Failed to save gallery photo:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึก' })
    }

    resetPreview()
    setDrawerOpen(false)
  }

  const remove = async (id) => {
    const target = items.find((item) => item.id === id)
    try {
      const response = await fetch(apiUrl(`/api/admin/gallery/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (data.ok) {
        pushToast({ type: 'warning', title: 'ลบรูปภาพแล้ว', description: target?.captionTh || target?.captionEn || '' })
        await fetchGallery()
      } else {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
      }
    } catch (error) {
      console.error('Failed to delete gallery photo:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบ' })
    }
  }

  // เปิด/ปิดใช้งานเร็ว ๆ จากการ์ด (optimistic)
  const toggleEnabled = async (item) => {
    const nextEnabled = !item.isEnabled
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, isEnabled: nextEnabled } : row)))
    try {
      const response = await fetch(apiUrl(`/api/admin/gallery/${item.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isEnabled: nextEnabled }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) throw new Error(data?.message || 'อัปเดตสถานะไม่สำเร็จ')
    } catch (error) {
      console.error('Failed to toggle gallery photo:', error)
      pushToast({ type: 'error', title: 'เปลี่ยนสถานะไม่สำเร็จ' })
      fetchGallery()
    }
  }

  const persistOrder = async (reordered) => {
    setItems(reordered)
    try {
      const updates = reordered.map((item) => ({ id: item.id, sortOrder: item.sortOrder }))
      const response = await fetch(apiUrl('/api/admin/gallery/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) throw new Error(data?.message || 'จัดลำดับไม่สำเร็จ')
    } catch (error) {
      console.error('Failed to reorder gallery:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับ' })
      fetchGallery()
    }
  }

  const handleDrop = (targetId) => {
    if (dragId == null || dragId === targetId) return
    const sorted = [...ordered]
    const from = sorted.findIndex((item) => item.id === dragId)
    const to = sorted.findIndex((item) => item.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = sorted.splice(from, 1)
    sorted.splice(to, 0, moved)
    persistOrder(sorted.map((item, idx) => ({ ...item, sortOrder: idx + 1 })))
  }

  const isFiltering = search.trim() !== '' || filter !== 'all'

  return (
    <div className="admin-ui-stack">
      <PageHeader
        title="ภาพบรรยากาศงาน"
        subtitle="อัปโหลดและจัดการรูปบรรยากาศที่แสดงในหน้าแรก ลากการ์ดเพื่อจัดลำดับ"
        actions={
          <>
            <input
              ref={bulkInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              multiple
              style={{ display: 'none' }}
              onChange={(event) => {
                onBulkFiles(event.target.files)
                event.target.value = ''
              }}
            />
            <button type="button" className="admin-ui-btn" disabled={!!bulk} onClick={() => bulkInputRef.current?.click()}>
              <Images size={15} />
              อัปโหลดหลายรูป
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={!!bulk} onClick={openCreate}>
              <Plus size={15} />
              เพิ่มรูปภาพ
            </button>
          </>
        }
      />

      <div className="admin-ui-gallery-toolbar">
        <div className="admin-ui-table-search">
          <Search size={15} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาคำบรรยาย" />
        </div>
        <div className="admin-ui-filter-row">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? 'active' : ''}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="admin-ui-gallery-count">
          {items.length} รูป · เปิดใช้งาน {enabledCount}
        </span>
      </div>

      {bulk ? (
        <div className="admin-ui-panel admin-ui-bulk-bar">
          <div className="admin-ui-bulk-head">
            <Loader2 size={16} className="spin" />
            <strong>กำลังอัปโหลด {bulk.done}/{bulk.total} รูป…</strong>
            {bulk.failed ? <span className="admin-ui-text-muted">ล้มเหลว {bulk.failed}</span> : null}
          </div>
          <div className="admin-ui-progress-bar">
            <span style={{ width: `${Math.round((bulk.done / bulk.total) * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="admin-ui-loading-state">
          <span>กำลังโหลด…</span>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="admin-ui-empty-state">
          <div>
            <span className="admin-ui-empty-state-icon">
              <ImagePlus size={16} />
            </span>
            <strong>{isFiltering ? 'ไม่พบรูปภาพตามเงื่อนไข' : 'ยังไม่มีรูปภาพบรรยากาศ'}</strong>
            <p>{isFiltering ? 'ลองล้างตัวกรองหรือคำค้นหา' : 'กด “เพิ่มรูปภาพ” เพื่ออัปโหลดรูปแรก'}</p>
          </div>
        </div>
      ) : (
        <div className="admin-ui-gallery-grid">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className={`admin-ui-gallery-card ${item.isEnabled ? '' : 'is-disabled'} ${dragId === item.id ? 'is-dragging' : ''} ${dropId === item.id && dragId !== item.id ? 'is-drop-target' : ''}`}
            >
              <div
                className="admin-ui-gallery-thumb"
                draggable={!isFiltering}
                onDragStart={() => !isFiltering && setDragId(item.id)}
                onDragOver={(event) => {
                  if (isFiltering) return
                  event.preventDefault()
                  setDropId(item.id)
                }}
                onDrop={() => {
                  handleDrop(item.id)
                  setDragId(null)
                  setDropId(null)
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setDropId(null)
                }}
                title={isFiltering ? 'ล้างตัวกรองเพื่อจัดลำดับ' : 'ลากเพื่อจัดลำดับ'}
              >
                <img src={apiUrl(item.thumbUrl || item.imageUrl || item.imageStorageKey)} alt={item.captionTh || item.captionEn || 'gallery'} loading="lazy" decoding="async" />
                <span className="admin-ui-gallery-order">#{item.sortOrder}</span>
                <span className={`admin-ui-gallery-badge ${item.isEnabled ? 'enabled' : 'disabled'}`}>
                  {item.isEnabled ? 'เปิด' : 'ปิด'}
                </span>
                <div className="admin-ui-gallery-overlay">
                  <button type="button" onClick={() => openEdit(item)} title="แก้ไข" aria-label="แก้ไข">
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => setConfirmState({ id: item.id, label: item.captionTh || item.captionEn || '' })}
                    title="ลบ"
                    aria-label="ลบ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="admin-ui-gallery-body">
                <div className={`admin-ui-gallery-caption ${item.captionTh || item.captionEn ? '' : 'is-empty'}`}>
                  {item.captionTh || item.captionEn || 'ไม่มีคำบรรยาย'}
                </div>
                <div className="admin-ui-gallery-body-foot">
                  {item.startAt || item.endAt ? (
                    <span className="admin-ui-gallery-window">
                      <CalendarClock size={12} />
                      {formatDateTime(item.startAt) || '—'} → {formatDateTime(item.endAt) || '—'}
                    </span>
                  ) : (
                    <span className="admin-ui-gallery-window">แสดงตลอด</span>
                  )}
                  <label className="admin-ui-toggle" title={item.isEnabled ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                    <input type="checkbox" checked={item.isEnabled} onChange={() => toggleEnabled(item)} />
                    <span className="admin-ui-toggle-switch"></span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DetailDrawer
        open={drawerOpen}
        onClose={() => {
          resetPreview()
          setDrawerOpen(false)
        }}
        title={editingId ? 'แก้ไขรูปภาพ' : 'เพิ่มรูปภาพ'}
        subtitle="รูปบรรยากาศ + คำบรรยายสั้น"
      >
        <div className="admin-ui-form">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(event) => onPickFile(event.target.files?.[0])}
          />

          <div>
            <span className="admin-ui-label">รูปภาพ {editingId ? '' : '*'}</span>
            <div
              className={`admin-ui-dropzone ${drawerPreviewSrc ? 'has-image' : ''}`}
              onClick={() => !drawerPreviewSrc && fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault()
                event.currentTarget.classList.add('is-dragover')
              }}
              onDragLeave={(event) => event.currentTarget.classList.remove('is-dragover')}
              onDrop={(event) => {
                event.preventDefault()
                event.currentTarget.classList.remove('is-dragover')
                onPickFile(event.dataTransfer.files?.[0])
              }}
            >
              {drawerPreviewSrc ? (
                <>
                  <img className="admin-ui-dropzone-preview" src={drawerPreviewSrc} alt="preview" />
                  <button type="button" className="admin-ui-dropzone-change" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={14} />
                    เปลี่ยนรูป
                  </button>
                </>
              ) : (
                <>
                  <ImagePlus size={26} />
                  <span className="admin-ui-dropzone-strong">คลิกหรือลากไฟล์มาวางที่นี่</span>
                  <span className="admin-ui-dropzone-small">รองรับ PNG / JPG / WEBP / SVG · ไม่เกิน 8 MB</span>
                </>
              )}
            </div>
            {form.imageFileName ? (
              <span className="admin-ui-file-chip">
                <Upload size={13} />
                {form.imageFileName}
              </span>
            ) : null}
            {errors.image ? <small>{errors.image}</small> : null}
          </div>

          <label htmlFor="gallery-caption-th">
            คำบรรยาย (ไทย)
            <input
              id="gallery-caption-th"
              value={form.captionTh}
              placeholder="เช่น พิธีเปิดงาน"
              onChange={(event) => setForm((prev) => ({ ...prev, captionTh: event.target.value }))}
            />
          </label>

          <label htmlFor="gallery-caption-en">
            คำบรรยาย (อังกฤษ)
            <input
              id="gallery-caption-en"
              value={form.captionEn}
              placeholder="e.g. Opening ceremony"
              onChange={(event) => setForm((prev) => ({ ...prev, captionEn: event.target.value }))}
            />
          </label>

          <div className="admin-ui-toggle-row">
            <span className="admin-ui-toggle-label">แสดงบนหน้าแรก</span>
            <label className="admin-ui-toggle">
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(event) => setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span className="admin-ui-toggle-switch"></span>
              <span className="admin-ui-toggle-text">{form.isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
            </label>
          </div>

          <button type="button" className="admin-ui-advanced-toggle" onClick={() => setShowAdvanced((prev) => !prev)}>
            <ChevronDown size={15} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            ตัวเลือกเพิ่มเติม (alt text, ช่วงเวลาเผยแพร่, ลำดับ)
          </button>

          {showAdvanced ? (
            <>
              <div className="admin-ui-field-group">
                <label htmlFor="gallery-alt-th">
                  Alt text (ไทย)
                  <input
                    id="gallery-alt-th"
                    value={form.imageAltTh}
                    onChange={(event) => setForm((prev) => ({ ...prev, imageAltTh: event.target.value }))}
                  />
                </label>
                <label htmlFor="gallery-alt-en">
                  Alt text (อังกฤษ)
                  <input
                    id="gallery-alt-en"
                    value={form.imageAltEn}
                    onChange={(event) => setForm((prev) => ({ ...prev, imageAltEn: event.target.value }))}
                  />
                </label>
              </div>

              <div className="admin-ui-field-group">
                <label htmlFor="gallery-start-at">
                  เริ่มแสดง
                  <input
                    id="gallery-start-at"
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
                  />
                </label>
                <label htmlFor="gallery-end-at">
                  หยุดแสดง
                  <input
                    id="gallery-end-at"
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
                  />
                  {errors.endAt ? <small>{errors.endAt}</small> : null}
                </label>
              </div>

              <label htmlFor="gallery-sort-order">
                ลำดับ (sort order)
                <input
                  id="gallery-sort-order"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                />
              </label>
            </>
          ) : null}

          <div className="admin-ui-form-actions">
            <button
              type="button"
              className="admin-ui-btn"
              onClick={() => {
                resetPreview()
                setDrawerOpen(false)
              }}
            >
              ยกเลิก
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={onSubmit}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>

      <AdminConfirmModal
        open={Boolean(confirmState)}
        danger
        title="ยืนยันการลบรูปภาพ"
        description={confirmState ? `ต้องการลบรูปภาพ "${confirmState.label || '-'}" ใช่หรือไม่?` : ''}
        confirmLabel="ลบ"
        cancelLabel="ยกเลิก"
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          const id = confirmState?.id
          setConfirmState(null)
          if (id != null) remove(id)
        }}
      />
    </div>
  )
}
