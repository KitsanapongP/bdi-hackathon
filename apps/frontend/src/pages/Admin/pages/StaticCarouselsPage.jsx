import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Link2, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import DetailDrawer from '../shared/DetailDrawer'
import PageHeader from '../shared/PageHeader'
import StatusBadge from '../shared/StatusBadge'
import { useAdminToast } from '../shared/adminContexts'
import { formatDateInput, formatDateTime } from '../utils/adminFormatters'

export default function StaticCarouselsPage() {
  const { pushToast } = useAdminToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    titleTh: '',
    titleEn: '',
    descriptionTh: '',
    descriptionEn: '',
    imageStorageKey: '',
    imageFile: null,
    imageFileName: '',
    imageType: '',
    imageSize: 0,
    imageAltTh: '',
    imageAltEn: '',
    targetUrl: '',
    openInNewTab: true,
    sortOrder: 1,
    isEnabled: true,
    startAt: '',
    endAt: '',
  })

  const fetchCarousels = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/carousels'), { credentials: 'include' })
      const data = await response.json()
      if (data.ok) {
        setItems(
          data.data.map((item) => ({
            id: item.id,
            titleTh: item.titleTh || '',
            titleEn: item.titleEn || '',
            descriptionTh: item.descriptionTh || '',
            descriptionEn: item.descriptionEn || '',
            imageStorageKey: item.imageStorageKey || item.imageUrl || '',
            imageUrl: item.imageUrl || item.imageStorageKey || '',
            imageAltTh: item.imageAltTh || '',
            imageAltEn: item.imageAltEn || '',
            targetUrl: item.targetUrl || '',
            openInNewTab: item.openInNewTab !== false,
            sortOrder: item.sortOrder || 0,
            isEnabled: item.isEnabled !== false,
            startAt: item.startAt || null,
            endAt: item.endAt || null,
          })),
        )
      }
    } catch (error) {
      console.error('Failed to fetch carousels:', error)
      pushToast({ type: 'error', title: 'ไม่สามารถโหลดข้อมูล carousel ได้' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchCarousels()
  }, [fetchCarousels])

  const openCreate = () => {
    const nextSortOrder = items.length ? Math.max(...items.map((item) => Number(item.sortOrder) || 0)) + 1 : 1

    setEditingId(null)
    setErrors({})
    setForm({
      titleTh: '',
      titleEn: '',
      descriptionTh: '',
      descriptionEn: '',
      imageStorageKey: '',
      imageFile: null,
      imageFileName: '',
      imageType: '',
      imageSize: 0,
      imageAltTh: '',
      imageAltEn: '',
      targetUrl: '',
      openInNewTab: true,
      sortOrder: nextSortOrder,
      isEnabled: true,
      startAt: '',
      endAt: '',
    })
    setDrawerOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setErrors({})
    setForm({
      titleTh: item.titleTh || '',
      titleEn: item.titleEn || '',
      descriptionTh: item.descriptionTh || '',
      descriptionEn: item.descriptionEn || '',
      imageStorageKey: item.imageStorageKey || '',
      imageFile: null,
      imageFileName: item.imageStorageKey?.split('/').pop() || '',
      imageType: '',
      imageSize: 0,
      imageAltTh: item.imageAltTh || '',
      imageAltEn: item.imageAltEn || '',
      targetUrl: item.targetUrl || '',
      openInNewTab: item.openInNewTab !== false,
      sortOrder: item.sortOrder || 0,
      isEnabled: item.isEnabled !== false,
      startAt: formatDateInput(item.startAt),
      endAt: formatDateInput(item.endAt),
    })
    setDrawerOpen(true)
  }

  const previewImageStorageKey = useMemo(
    () => (form.imageFileName ? `/static/content/carousels/${form.imageFileName}` : form.imageStorageKey),
    [form.imageFileName, form.imageStorageKey],
  )

  const validate = () => {
    const next = {}

    if (!form.titleTh.trim() && !form.titleEn.trim()) {
      next.title = 'กรุณากรอก title อย่างน้อย 1 ภาษา'
    }

    if (!editingId && !form.imageFile && !previewImageStorageKey.trim()) {
      next.image = 'กรุณาอัปโหลดรูปภาพหรือระบุ imageStorageKey'
    }

    if (form.imageFile && !form.imageFileName.trim()) {
      next.imageFileName = 'กรุณาตั้งชื่อไฟล์ก่อนอัปโหลด'
    }

    if (form.imageType && !['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(form.imageType)) {
      next.image = 'รองรับเฉพาะ PNG/JPG/WEBP/SVG'
    }

    if (form.imageSize > 8 * 1024 * 1024) {
      next.image = 'ไฟล์ต้องไม่เกิน 8 MB'
    }

    if (form.targetUrl.trim()) {
      try {
        const parsedUrl = new URL(form.targetUrl.trim())
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          next.targetUrl = 'targetUrl ต้องขึ้นต้นด้วย http:// หรือ https://'
        }
      } catch (error) {
        void error
        next.targetUrl = 'targetUrl ไม่ถูกต้อง'
      }
    }

    if (form.startAt && form.endAt) {
      const start = new Date(form.startAt).getTime()
      const end = new Date(form.endAt).getTime()
      if (!Number.isNaN(start) && !Number.isNaN(end) && start > end) {
        next.endAt = 'endAt ต้องมากกว่าหรือเท่ากับ startAt'
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async () => {
    if (!validate()) return

    const payload = {
      titleTh: form.titleTh.trim() || null,
      titleEn: form.titleEn.trim() || null,
      descriptionTh: form.descriptionTh.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
      imageStorageKey: previewImageStorageKey.trim(),
      imageAltTh: form.imageAltTh.trim() || null,
      imageAltEn: form.imageAltEn.trim() || null,
      targetUrl: form.targetUrl.trim() || null,
      openInNewTab: Boolean(form.openInNewTab),
      sortOrder: Math.max(0, Number(form.sortOrder) || 0),
      isEnabled: Boolean(form.isEnabled),
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
    }

    const uploadImageIfNeeded = async (slideId) => {
      if (!form.imageFile) return
      const formData = new FormData()
      formData.append('file', form.imageFile)
      formData.append('fileName', form.imageFileName.trim())

      const uploadResponse = await fetch(apiUrl(`/api/admin/carousels/${slideId}/image`), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const uploadData = await uploadResponse.json()
      if (!uploadData.ok) {
        throw new Error(uploadData.message || 'อัปโหลดรูปภาพไม่สำเร็จ')
      }
    }

    try {
      if (editingId) {
        const response = await fetch(apiUrl(`/api/admin/carousels/${editingId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (data.ok) {
          await uploadImageIfNeeded(editingId)
          pushToast({ title: 'อัปเดต Carousel สำเร็จ', description: form.titleTh || form.titleEn })
          await fetchCarousels()
        } else {
          pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
        }
      } else {
        const response = await fetch(apiUrl('/api/admin/carousels'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (data.ok) {
          await uploadImageIfNeeded(data.data.id)
          pushToast({ title: 'เพิ่ม Carousel สำเร็จ', description: form.titleTh || form.titleEn })
          await fetchCarousels()
        } else {
          pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
        }
      }
    } catch (error) {
      console.error('Failed to save carousel:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึก' })
    }

    setDrawerOpen(false)
  }

  const remove = async (id) => {
    const target = items.find((item) => item.id === id)
    try {
      const response = await fetch(apiUrl(`/api/admin/carousels/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (data.ok) {
        pushToast({
          type: 'warning',
          title: 'ลบ Carousel แล้ว',
          description: target?.titleTh || target?.titleEn || '',
        })
        await fetchCarousels()
      } else {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
      }
    } catch (error) {
      console.error('Failed to delete carousel:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบ' })
    }
  }

  const moveItem = async (id, direction) => {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
    const index = sorted.findIndex((item) => item.id === id)
    if (index < 0) return

    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return

    const next = [...sorted]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    const reordered = next.map((item, idx) => ({ ...item, sortOrder: idx + 1 }))
    setItems(reordered)

    try {
      const updates = reordered.map((item) => ({ id: item.id, sortOrder: item.sortOrder }))
      await fetch(apiUrl('/api/admin/carousels/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
    } catch (error) {
      console.error('Failed to reorder carousels:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับ' })
      fetchCarousels()
    }
  }

  return (
    <div className="admin-ui-stack">
      <PageHeader
        title="แบนเนอร์"
        actions={
          <div className="admin-ui-header-actions">
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={openCreate}>
              <Plus size={15} />
              เพิ่มสไลด์
            </button>
          </div>
        }
      />

      <AdminDataTable
        loading={loading}
        rows={[...items].sort((a, b) => a.sortOrder - b.sortOrder)}
        searchKeys={['titleTh', 'titleEn', 'targetUrl', 'descriptionTh', 'descriptionEn']}
        searchPlaceholder="ค้นหา title / description / target URL"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'เปิดใช้งาน', value: 'active', predicate: (row) => row.isEnabled },
          { label: 'ปิดใช้งาน', value: 'inactive', predicate: (row) => !row.isEnabled },
        ]}
        columns={[
          {
            key: 'image',
            label: 'รูปภาพและชื่อ',
            render: (row) => (
              <div className="admin-ui-inline-banner">
                <img src={apiUrl(row.imageUrl || row.imageStorageKey)} alt={row.titleTh || row.titleEn || 'carousel'} loading="lazy" decoding="async" />
                <div className="admin-ui-col-stack">
                  <strong>{row.titleTh || row.titleEn || '-'}</strong>
                  <span>{row.titleEn && row.titleTh ? row.titleEn : row.descriptionTh || row.descriptionEn || '-'}</span>
                </div>
              </div>
            ),
          },
          {
            key: 'targetUrl',
            label: 'ลิงก์ปลายทาง',
            render: (row) =>
              row.targetUrl ? (
                <a href={row.targetUrl} target="_blank" rel="noreferrer" className="admin-ui-link">
                  <Link2 size={13} />
                  {row.targetUrl}
                </a>
              ) : (
                <span>-</span>
              ),
          },
          {
            key: 'publishWindow',
            label: 'ช่วงเวลาเผยแพร่',
            render: (row) => (
              <div className="admin-ui-col-stack">
                <strong>{formatDateTime(row.startAt)}</strong>
                <span>{formatDateTime(row.endAt)}</span>
              </div>
            ),
          },
          {
            key: 'sortOrder',
            label: 'ลำดับ',
          },
          {
            key: 'isEnabled',
            label: 'สถานะ',
            render: (row) => <StatusBadge status={row.isEnabled ? 'ENABLED' : 'DISABLED'} />,
          },
          {
            key: 'actions',
            label: 'การจัดการ',
            render: (row) => (
              <div className="admin-ui-row-actions">
                <button type="button" onClick={() => moveItem(row.id, 'up')} aria-label="move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => moveItem(row.id, 'down')} aria-label="move down">
                  <ArrowDown size={14} />
                </button>
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
        title={editingId ? 'แก้ไขสไลด์' : 'เพิ่มสไลด์'}
        subtitle="รองรับ image upload, URL click-through, และช่วงเวลาเผยแพร่"
      >
        <div className="admin-ui-form">
          <label htmlFor="carousel-title-th">
            title_th
            <input
              id="carousel-title-th"
              value={form.titleTh}
              onChange={(event) => setForm((prev) => ({ ...prev, titleTh: event.target.value }))}
            />
          </label>

          <label htmlFor="carousel-title-en">
            title_en
            <input
              id="carousel-title-en"
              value={form.titleEn}
              onChange={(event) => setForm((prev) => ({ ...prev, titleEn: event.target.value }))}
            />
            {errors.title ? <small>{errors.title}</small> : null}
          </label>

          <label htmlFor="carousel-description-th">
            description_th
            <textarea
              id="carousel-description-th"
              rows={3}
              value={form.descriptionTh}
              onChange={(event) => setForm((prev) => ({ ...prev, descriptionTh: event.target.value }))}
            />
          </label>

          <label htmlFor="carousel-description-en">
            description_en
            <textarea
              id="carousel-description-en"
              rows={3}
              value={form.descriptionEn}
              onChange={(event) => setForm((prev) => ({ ...prev, descriptionEn: event.target.value }))}
            />
          </label>

          <label htmlFor="carousel-image-upload">
            Image Upload {editingId ? '(optional)' : '*'}
            <input
              id="carousel-image-upload"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setForm((prev) => ({
                  ...prev,
                  imageFile: file,
                  imageFileName: file.name,
                  imageType: file.type,
                  imageSize: file.size,
                }))
              }}
            />
            {form.imageFileName ? (
              <span className="admin-ui-file-chip">
                <Upload size={13} />
                {form.imageFileName}
              </span>
            ) : null}
            {errors.image ? <small>{errors.image}</small> : null}
          </label>

          <label htmlFor="carousel-image-file-name">
            Image File Name
            <input
              id="carousel-image-file-name"
              value={form.imageFileName}
              placeholder="hero-slide-01.jpg"
              onChange={(event) => setForm((prev) => ({ ...prev, imageFileName: event.target.value }))}
            />
            {errors.imageFileName ? <small>{errors.imageFileName}</small> : null}
          </label>

          <label htmlFor="carousel-image-storage-key">
            image_storage_key
            <input id="carousel-image-storage-key" value={previewImageStorageKey} readOnly />
          </label>

          <label htmlFor="carousel-image-alt-th">
            image_alt_th
            <input
              id="carousel-image-alt-th"
              value={form.imageAltTh}
              onChange={(event) => setForm((prev) => ({ ...prev, imageAltTh: event.target.value }))}
            />
          </label>

          <label htmlFor="carousel-image-alt-en">
            image_alt_en
            <input
              id="carousel-image-alt-en"
              value={form.imageAltEn}
              onChange={(event) => setForm((prev) => ({ ...prev, imageAltEn: event.target.value }))}
            />
          </label>

          <label htmlFor="carousel-target-url">
            target_url
            <input
              id="carousel-target-url"
              value={form.targetUrl}
              placeholder="https://example.com"
              onChange={(event) => setForm((prev) => ({ ...prev, targetUrl: event.target.value }))}
            />
            {errors.targetUrl ? <small>{errors.targetUrl}</small> : null}
          </label>

          <div className="admin-ui-toggle-row">
            <label htmlFor="carousel-open-in-new-tab" className="admin-ui-toggle-label">
              open_in_new_tab
            </label>
            <label className="admin-ui-toggle">
              <input
                id="carousel-open-in-new-tab"
                type="checkbox"
                checked={form.openInNewTab}
                onChange={(event) => setForm((prev) => ({ ...prev, openInNewTab: event.target.checked }))}
              />
              <span className="admin-ui-toggle-switch"></span>
              <span className="admin-ui-toggle-text">{form.openInNewTab ? 'Open New Tab' : 'Open Same Tab'}</span>
            </label>
          </div>

          <label htmlFor="carousel-sort-order">
            sort_order
            <input
              id="carousel-sort-order"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
            />
          </label>

          <label htmlFor="carousel-start-at">
            start_at
            <input
              id="carousel-start-at"
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
            />
          </label>

          <label htmlFor="carousel-end-at">
            end_at
            <input
              id="carousel-end-at"
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
            />
            {errors.endAt ? <small>{errors.endAt}</small> : null}
          </label>

          <div className="admin-ui-toggle-row">
            <label htmlFor="carousel-is-enabled" className="admin-ui-toggle-label">
              Status
            </label>
            <label className="admin-ui-toggle">
              <input
                id="carousel-is-enabled"
                type="checkbox"
                checked={form.isEnabled}
                onChange={(event) => setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span className="admin-ui-toggle-switch"></span>
              <span className="admin-ui-toggle-text">{form.isEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <div className="admin-ui-form-actions">
            <button type="button" className="admin-ui-btn" onClick={() => setDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={onSubmit}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}
