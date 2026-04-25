import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, FileImage, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import DetailDrawer from '../shared/DetailDrawer'
import EmptyState from '../shared/EmptyState'
import PageHeader from '../shared/PageHeader'
import StatusBadge from '../shared/StatusBadge'
import { useAdminToast } from '../shared/adminContexts'
import { formatFileSize } from '../utils/adminFormatters'

export default function StaticVenuesPage() {
  const { pushToast } = useAdminToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVenueId, setSelectedVenueId] = useState(null)
  const [venueDrawerOpen, setVenueDrawerOpen] = useState(false)
  const [imageDrawerOpen, setImageDrawerOpen] = useState(false)
  const [editingVenueId, setEditingVenueId] = useState(null)
  const [editingImageId, setEditingImageId] = useState(null)
  const [venueErrors, setVenueErrors] = useState({})
  const [imageErrors, setImageErrors] = useState({})
  const [venueForm, setVenueForm] = useState({
    category: 'venue',
    nameTh: '',
    nameEn: '',
    descriptionTh: '',
    descriptionEn: '',
    googleMapsUrl: '',
    latitude: '',
    longitude: '',
    sortOrder: 0,
    isEnabled: true,
  })
  const [imageForm, setImageForm] = useState({
    imageStorageKey: '',
    imageFile: null,
    imageFileName: '',
    imageType: '',
    imageSize: 0,
    imageAltTh: '',
    imageAltEn: '',
    sortOrder: 0,
    isCover: false,
    isEnabled: true,
  })

  const venueCategoryOptions = useMemo(
    () => [
      { value: 'venue', label: 'สถานที่จัดงาน' },
      { value: 'accommodation', label: 'ที่พัก' },
      { value: 'transportation', label: 'การเดินทาง' },
      { value: 'attraction', label: 'สถานที่ท่องเที่ยว' },
    ],
    [],
  )

  const venueCategoryRank = useMemo(
    () => ({
      venue: 1,
      accommodation: 2,
      transportation: 3,
      attraction: 4,
    }),
    [],
  )

  const getVenueCategoryLabel = useCallback(
    (category) => venueCategoryOptions.find((item) => item.value === category)?.label || '-',
    [venueCategoryOptions],
  )

  const sortedVenues = useMemo(
    () =>
      [...items].sort((a, b) => {
        const rankA = venueCategoryRank[a.category] || 999
        const rankB = venueCategoryRank[b.category] || 999
        if (rankA !== rankB) return rankA - rankB
        if (a.sortOrder !== b.sortOrder) return Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
        return Number(a.id || 0) - Number(b.id || 0)
      }),
    [items, venueCategoryRank],
  )

  const selectedVenue = useMemo(
    () => sortedVenues.find((item) => item.id === selectedVenueId) || null,
    [selectedVenueId, sortedVenues],
  )

  const selectedImages = useMemo(() => {
    if (!selectedVenue) return []
    return [...(selectedVenue.images || [])].sort((a, b) => {
      if (Number(a.isCover) !== Number(b.isCover)) return Number(b.isCover) - Number(a.isCover)
      if (a.sortOrder !== b.sortOrder) return Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      return Number(a.id || 0) - Number(b.id || 0)
    })
  }, [selectedVenue])

  const getNextVenueSortOrder = useCallback((category, rows) => {
    const inCategory = rows.filter((item) => item.category === category)
    if (!inCategory.length) return 0
    return inCategory.reduce((max, item) => Math.max(max, Number(item.sortOrder) || 0), 0) + 1
  }, [])

  const fetchVenues = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/venues'), { credentials: 'include' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'โหลดข้อมูลสถานที่ไม่สำเร็จ')
      }

      const rows = Array.isArray(payload.data) ? payload.data : []
      setItems(rows)

      if (rows.length === 0) {
        setSelectedVenueId(null)
      } else {
        setSelectedVenueId((prev) => {
          if (prev && rows.some((row) => row.id === prev)) return prev
          return rows[0].id
        })
      }
    } catch (error) {
      console.error('Failed to fetch venues:', error)
      setItems([])
      setSelectedVenueId(null)
      pushToast({ type: 'error', title: error?.message || 'โหลดข้อมูลสถานที่ไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  const openCreateVenue = () => {
    setEditingVenueId(null)
    setVenueErrors({})
    const category = 'venue'
    setVenueForm({
      category,
      nameTh: '',
      nameEn: '',
      descriptionTh: '',
      descriptionEn: '',
      googleMapsUrl: '',
      latitude: '',
      longitude: '',
      sortOrder: getNextVenueSortOrder(category, sortedVenues),
      isEnabled: true,
    })
    setVenueDrawerOpen(true)
  }

  const openEditVenue = (venue) => {
    setEditingVenueId(venue.id)
    setVenueErrors({})
    setVenueForm({
      category: venue.category || 'venue',
      nameTh: venue.nameTh || '',
      nameEn: venue.nameEn || '',
      descriptionTh: venue.descriptionTh || '',
      descriptionEn: venue.descriptionEn || '',
      googleMapsUrl: venue.googleMapsUrl || '',
      latitude: venue.latitude === null || venue.latitude === undefined ? '' : String(venue.latitude),
      longitude: venue.longitude === null || venue.longitude === undefined ? '' : String(venue.longitude),
      sortOrder: Number(venue.sortOrder || 0),
      isEnabled: Boolean(venue.isEnabled),
    })
    setVenueDrawerOpen(true)
  }

  const validateVenue = () => {
    const next = {}
    const googleMapsUrl = String(venueForm.googleMapsUrl || '').trim()
    const latitudeRaw = String(venueForm.latitude || '').trim()
    const longitudeRaw = String(venueForm.longitude || '').trim()

    if (!venueForm.category.trim()) next.category = 'กรุณาเลือกหมวดหมู่'
    if (!venueForm.nameTh.trim()) next.nameTh = 'กรุณากรอก venue_name_th'
    if (googleMapsUrl) {
      try {
        new URL(googleMapsUrl)
      } catch (error) {
        void error
        next.googleMapsUrl = 'google_maps_url ต้องเป็น URL ที่ถูกต้อง'
      }
    }
    if ((latitudeRaw && !longitudeRaw) || (!latitudeRaw && longitudeRaw)) {
      next.latitude = 'latitude และ longitude ต้องระบุคู่กัน'
      next.longitude = 'latitude และ longitude ต้องระบุคู่กัน'
    }
    if (latitudeRaw) {
      const latitude = Number(latitudeRaw)
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        next.latitude = 'latitude ต้องอยู่ในช่วง -90 ถึง 90'
      }
    }
    if (longitudeRaw) {
      const longitude = Number(longitudeRaw)
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        next.longitude = 'longitude ต้องอยู่ในช่วง -180 ถึง 180'
      }
    }
    if (Number(venueForm.sortOrder) < 0) next.sortOrder = 'sort_order ต้องมากกว่าหรือเท่ากับ 0'
    setVenueErrors(next)
    return Object.keys(next).length === 0
  }

  const saveVenue = async () => {
    if (!validateVenue()) return

    const payload = {
      category: venueForm.category.trim(),
      nameTh: venueForm.nameTh.trim(),
      nameEn: venueForm.nameEn.trim() || null,
      descriptionTh: venueForm.descriptionTh.trim() || null,
      descriptionEn: venueForm.descriptionEn.trim() || null,
      googleMapsUrl: venueForm.googleMapsUrl.trim() || null,
      latitude: String(venueForm.latitude || '').trim() === '' ? null : Number(venueForm.latitude),
      longitude: String(venueForm.longitude || '').trim() === '' ? null : Number(venueForm.longitude),
      sortOrder: Number(venueForm.sortOrder),
      isEnabled: venueForm.isEnabled,
    }

    try {
      const isEdit = Boolean(editingVenueId)
      const response = await fetch(apiUrl(isEdit ? `/api/admin/venues/${editingVenueId}` : '/api/admin/venues'), {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        pushToast({ type: 'error', title: data?.message || 'เกิดข้อผิดพลาดในการบันทึกสถานที่' })
        return
      }

      if (!isEdit && data?.data?.id) {
        setSelectedVenueId(data.data.id)
      }
      pushToast({ title: isEdit ? 'อัปเดตสถานที่สำเร็จ' : 'เพิ่มสถานที่สำเร็จ' })
      await fetchVenues()
      setVenueDrawerOpen(false)
    } catch (error) {
      console.error('Failed to save venue:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึกสถานที่' })
    }
  }

  const removeVenue = async (id) => {
    const target = items.find((item) => item.id === id)
    try {
      const response = await fetch(apiUrl(`/api/admin/venues/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        pushToast({ type: 'error', title: data?.message || 'เกิดข้อผิดพลาดในการลบสถานที่' })
        return
      }

      if (selectedVenueId === id) {
        setSelectedVenueId(null)
      }
      pushToast({ type: 'warning', title: 'ลบสถานที่แล้ว', description: target?.nameTh || '' })
      await fetchVenues()
    } catch (error) {
      console.error('Failed to delete venue:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบสถานที่' })
    }
  }

  const moveVenue = async (id, direction) => {
    const index = sortedVenues.findIndex((item) => item.id === id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= sortedVenues.length) return

    const current = sortedVenues[index]
    const target = sortedVenues[swapIndex]
    if (!current || !target || current.category !== target.category) {
      pushToast({ type: 'info', title: 'เลื่อนข้ามหมวดไม่ได้', description: 'จัดลำดับได้เฉพาะรายการในหมวดเดียวกัน' })
      return
    }

    const next = [...sortedVenues]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]

    const counters = {
      venue: 0,
      accommodation: 0,
      transportation: 0,
      attraction: 0,
    }
    const reordered = next.map((item) => {
      counters[item.category] += 1
      return {
        ...item,
        sortOrder: counters[item.category] - 1,
      }
    })
    setItems(reordered)

    try {
      const updates = reordered.map((item) => ({ id: item.id, sortOrder: Number(item.sortOrder) || 0 }))
      const response = await fetch(apiUrl('/api/admin/venues/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'จัดลำดับข้อมูลไม่สำเร็จ')
      }
    } catch (error) {
      console.error('Failed to reorder venues:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับสถานที่' })
      await fetchVenues()
    }
  }

  const openCreateImage = () => {
    if (!selectedVenue) return
    const maxSort = selectedImages.reduce((max, item) => Math.max(max, Number(item.sortOrder) || 0), -1)
    setEditingImageId(null)
    setImageErrors({})
    setImageForm({
      imageStorageKey: '',
      imageFile: null,
      imageFileName: '',
      imageType: '',
      imageSize: 0,
      imageAltTh: '',
      imageAltEn: '',
      sortOrder: maxSort + 1,
      isCover: selectedImages.length === 0,
      isEnabled: true,
    })
    setImageDrawerOpen(true)
  }

  const openEditImage = (image) => {
    setEditingImageId(image.id)
    setImageErrors({})
    setImageForm({
      imageStorageKey: image.imageStorageKey || image.imageUrl || '',
      imageFile: null,
      imageFileName: '',
      imageType: '',
      imageSize: 0,
      imageAltTh: image.altTh || '',
      imageAltEn: image.altEn || '',
      sortOrder: Number(image.sortOrder || 0),
      isCover: Boolean(image.isCover),
      isEnabled: Boolean(image.isEnabled),
    })
    setImageDrawerOpen(true)
  }

  const validateImage = () => {
    const next = {}
    const hasUploadFile = Boolean(imageForm.imageFile)
    if (!imageForm.imageStorageKey.trim() && !hasUploadFile) {
      next.imageStorageKey = 'กรุณากรอก image_storage_key หรืออัปโหลดไฟล์รูป'
    }

    if (hasUploadFile && imageForm.imageType && !['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(imageForm.imageType)) {
      next.imageFile = 'รองรับเฉพาะ PNG/JPG/WEBP/SVG'
    }

    if (hasUploadFile && imageForm.imageSize > 4 * 1024 * 1024) {
      next.imageFile = 'ไฟล์ต้องไม่เกิน 4 MB'
    }

    if (Number(imageForm.sortOrder) < 0) next.sortOrder = 'sort_order ต้องมากกว่าหรือเท่ากับ 0'
    setImageErrors(next)
    return Object.keys(next).length === 0
  }

  const saveImage = async () => {
    if (!validateImage()) return
    if (!selectedVenue) return

    const categoryFolder = String(selectedVenue.category || 'venue').replace(/_/g, '-')
    const derivedStorageKey = imageForm.imageFileName.trim()
      ? `/static/content/venues/${categoryFolder}/${imageForm.imageFileName.trim()}`
      : ''

    const finalStorageKey = imageForm.imageStorageKey.trim() || derivedStorageKey

    const payload = {
      imageStorageKey: finalStorageKey,
      imageAltTh: imageForm.imageAltTh.trim() || null,
      imageAltEn: imageForm.imageAltEn.trim() || null,
      sortOrder: Number(imageForm.sortOrder),
      isCover: imageForm.isCover,
      isEnabled: imageForm.isEnabled,
    }

    try {
      const isEdit = Boolean(editingImageId)
      const response = await fetch(
        apiUrl(
          isEdit ? `/api/admin/venues/${selectedVenue.id}/images/${editingImageId}` : `/api/admin/venues/${selectedVenue.id}/images`,
        ),
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        pushToast({ type: 'error', title: data?.message || 'เกิดข้อผิดพลาดในการบันทึกรูป' })
        return
      }

      const targetImageId = editingImageId || data?.data?.id
      if (imageForm.imageFile && targetImageId) {
        const formData = new FormData()
        formData.append('file', imageForm.imageFile)
        formData.append('fileName', imageForm.imageFileName.trim() || imageForm.imageFile.name)

        const uploadResponse = await fetch(apiUrl(`/api/admin/venues/${selectedVenue.id}/images/${targetImageId}/upload`), {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        const uploadData = await uploadResponse.json().catch(() => ({}))
        if (!uploadResponse.ok || !uploadData?.ok) {
          pushToast({ type: 'error', title: uploadData?.message || 'อัปโหลดไฟล์รูปไม่สำเร็จ' })
          return
        }
      }

      pushToast({ title: isEdit ? 'อัปเดตรูปสถานที่สำเร็จ' : 'เพิ่มรูปสถานที่สำเร็จ' })
      await fetchVenues()
      setImageDrawerOpen(false)
    } catch (error) {
      console.error('Failed to save venue image:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึกรูป' })
    }
  }

  const removeImage = async (imageId) => {
    if (!selectedVenue) return

    try {
      const response = await fetch(apiUrl(`/api/admin/venues/${selectedVenue.id}/images/${imageId}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        pushToast({ type: 'error', title: data?.message || 'เกิดข้อผิดพลาดในการลบรูป' })
        return
      }

      pushToast({ type: 'warning', title: 'ลบรูปสถานที่แล้ว' })
      await fetchVenues()
    } catch (error) {
      console.error('Failed to delete venue image:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบรูป' })
    }
  }

  const moveImage = async (imageId, direction) => {
    if (!selectedVenue) return

    const index = selectedImages.findIndex((item) => item.id === imageId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= selectedImages.length) return

    const next = [...selectedImages]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    const reordered = next.map((image, idx) => ({
      ...image,
      sortOrder: idx,
    }))

    setItems((prev) =>
      prev.map((venue) =>
        venue.id === selectedVenue.id
          ? {
              ...venue,
              images: reordered,
            }
          : venue,
      ),
    )

    try {
      const updates = reordered.map((image) => ({ id: image.id, sortOrder: Number(image.sortOrder) || 0 }))
      const response = await fetch(apiUrl(`/api/admin/venues/${selectedVenue.id}/images/reorder`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'จัดลำดับรูปภาพไม่สำเร็จ')
      }
    } catch (error) {
      console.error('Failed to reorder venue images:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับรูป' })
      await fetchVenues()
    }
  }

  const imageCategoryFolder = String(selectedVenue?.category || 'venue').replace(/_/g, '-')
  const previewStorageKey = imageForm.imageStorageKey.trim() || (
    imageForm.imageFileName.trim() ? `/static/content/venues/${imageCategoryFolder}/${imageForm.imageFileName.trim()}` : ''
  )
  const imagePreviewUrl = previewStorageKey ? apiUrl(previewStorageKey) : ''

  return (
    <div className="admin-ui-stack">
      <PageHeader
        title="สถานที่"
        actions={
          <div className="admin-ui-header-actions">
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={openCreateVenue}>
              <Plus size={15} />
              เพิ่มสถานที่
            </button>
          </div>
        }
      />

      <AdminDataTable
        loading={loading}
        rows={sortedVenues}
        searchKeys={['category', 'nameTh', 'nameEn', 'descriptionTh', 'descriptionEn', 'googleMapsUrl', 'latitude', 'longitude']}
        searchPlaceholder="ค้นหา category / venue name / description"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'สถานที่จัดงาน', value: 'venue', predicate: (row) => row.category === 'venue' },
          { label: 'ที่พัก', value: 'accommodation', predicate: (row) => row.category === 'accommodation' },
          { label: 'การเดินทาง', value: 'transportation', predicate: (row) => row.category === 'transportation' },
          { label: 'ท่องเที่ยว', value: 'attraction', predicate: (row) => row.category === 'attraction' },
          { label: 'เปิดใช้งาน', value: 'enabled', predicate: (row) => row.isEnabled },
          { label: 'ปิดใช้งาน', value: 'disabled', predicate: (row) => !row.isEnabled },
        ]}
        columns={[
          {
            key: 'name',
            label: 'ชื่อสถานที่',
            render: (row) => (
              <div className="admin-ui-col-stack">
                <strong>{row.nameTh || '-'}</strong>
                <span>{row.nameEn || '-'}</span>
                <span>{row.descriptionTh || row.descriptionEn || '-'}</span>
                <span>{row.googleMapsUrl || (row.latitude !== null && row.longitude !== null ? `${row.latitude}, ${row.longitude}` : '-')}</span>
              </div>
            ),
          },
          {
            key: 'category',
            label: 'หมวดหมู่',
            render: (row) => getVenueCategoryLabel(row.category),
          },
          {
            key: 'images',
            label: 'รูปภาพ',
            render: (row) => (
              <span className="admin-ui-icon-text">
                <FileImage size={13} />
                {(row.images || []).length}
              </span>
            ),
          },
          { key: 'sortOrder', label: 'ลำดับ' },
          {
            key: 'isEnabled',
            label: 'เปิดใช้งาน',
            render: (row) => <StatusBadge status={row.isEnabled ? 'ENABLED' : 'DISABLED'} />,
          },
          {
            key: 'actions',
            label: 'การจัดการ',
            render: (row) => (
              <div className="admin-ui-row-actions">
                <button type="button" onClick={() => moveVenue(row.id, 'up')} aria-label="move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => moveVenue(row.id, 'down')} aria-label="move down">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => setSelectedVenueId(row.id)} aria-label="manage images">
                  <Eye size={14} />
                </button>
                <button type="button" onClick={() => openEditVenue(row)} aria-label="edit venue">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => removeVenue(row.id)} aria-label="delete venue">
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <article className="admin-ui-panel admin-ui-stack">
        <h3>เลือกสถานที่</h3>

        <div className="admin-ui-contact-selector-row">
          <label htmlFor="venue-select" className="admin-ui-label">
            สถานที่ที่เลือก
            <select
              id="venue-select"
              value={selectedVenue?.id || ''}
              onChange={(event) => setSelectedVenueId(Number(event.target.value) || null)}
            >
              <option value="">เลือกสถานที่</option>
              {sortedVenues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.id} - {venue.nameTh || venue.nameEn}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-ui-chip-row">
            {sortedVenues.map((venue) => (
              <button
                type="button"
                key={venue.id}
                className={`admin-ui-chip-btn ${selectedVenue?.id === venue.id ? 'active' : ''}`}
                onClick={() => setSelectedVenueId((prev) => (prev === venue.id ? null : venue.id))}
              >
                {venue.nameTh || venue.nameEn}
              </button>
            ))}
          </div>
        </div>
      </article>

      <article className="admin-ui-panel admin-ui-stack">
        <div className="admin-ui-page-header">
          <h3>
            {selectedVenue
              ? `รูปภาพของสถานที่: ${selectedVenue.nameTh || selectedVenue.nameEn}`
              : 'รูปภาพสถานที่'}
          </h3>
          <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={openCreateImage} disabled={!selectedVenue}>
            <Plus size={15} />
            เพิ่มรูปภาพ
          </button>
        </div>

        {selectedVenue ? (
          <AdminDataTable
            loading={loading}
            rows={selectedImages}
            searchKeys={['imageStorageKey', 'altTh', 'altEn']}
            searchPlaceholder="ค้นหา image_storage_key / alt"
            filters={[
              { label: 'ทั้งหมด', value: 'all', predicate: () => true },
               { label: 'ภาพหน้าปก', value: 'cover', predicate: (row) => row.isCover },
               { label: 'เปิดใช้งาน', value: 'enabled', predicate: (row) => row.isEnabled },
               { label: 'ปิดใช้งาน', value: 'disabled', predicate: (row) => !row.isEnabled },
            ]}
            columns={[
              {
                key: 'preview',
                label: 'ที่เก็บไฟล์รูป (image_storage_key)',
                render: (row) => (
                  <div className="admin-ui-inline-banner">
                    <img src={apiUrl(row.imageUrl || row.imageStorageKey)} alt={row.altTh || row.altEn || 'venue'} loading="lazy" decoding="async" />
                    <div className="admin-ui-col-stack">
                      <strong className="admin-ui-truncate">{row.imageStorageKey}</strong>
                      <span>รหัส: {row.id}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: 'alt',
                label: 'ข้อความแทนภาพ TH/EN',
                render: (row) => (
                  <div className="admin-ui-col-stack">
                    <span>{row.altTh || '-'}</span>
                    <span>{row.altEn || '-'}</span>
                  </div>
                ),
              },
              {
                key: 'flags',
                label: 'ตัวเลือก',
                render: (row) => (
                  <div className="admin-ui-col-stack">
                    <StatusBadge status={row.isEnabled ? 'ENABLED' : 'DISABLED'} />
                    {row.isCover ? <StatusBadge status="APPROVED" label="ภาพหน้าปก" /> : <span className="admin-ui-text-muted">-</span>}
                  </div>
                ),
              },
              { key: 'sortOrder', label: 'ลำดับ' },
              {
                key: 'actions',
                label: 'การจัดการ',
                render: (row) => (
                  <div className="admin-ui-row-actions">
                    <button type="button" onClick={() => moveImage(row.id, 'up')} aria-label="move up">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" onClick={() => moveImage(row.id, 'down')} aria-label="move down">
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" onClick={() => openEditImage(row)} aria-label="edit image">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => removeImage(row.id)} aria-label="delete image">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <EmptyState compact title="ยังไม่มีสถานที่ให้จัดการรูปภาพ" />
        )}
      </article>

      <DetailDrawer
        open={venueDrawerOpen}
        onClose={() => setVenueDrawerOpen(false)}
        title={editingVenueId ? 'แก้ไขสถานที่' : 'เพิ่มสถานที่'}
        subtitle="ตั้งค่าทุกคอลัมน์ของ content_venues"
      >
        <div className="admin-ui-form">
          <label htmlFor="venue-category">
            venue_category *
            <select
              id="venue-category"
              value={venueForm.category}
              onChange={(event) =>
                setVenueForm((prev) => ({
                  ...prev,
                  category: event.target.value,
                  sortOrder: editingVenueId ? prev.sortOrder : getNextVenueSortOrder(event.target.value, sortedVenues),
                }))
              }
            >
              {venueCategoryOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {venueErrors.category ? <small>{venueErrors.category}</small> : null}
          </label>

          <label htmlFor="venue-name-th">
            venue_name_th *
            <input
              id="venue-name-th"
              value={venueForm.nameTh}
              onChange={(event) => setVenueForm((prev) => ({ ...prev, nameTh: event.target.value }))}
            />
            {venueErrors.nameTh ? <small>{venueErrors.nameTh}</small> : null}
          </label>

          <label htmlFor="venue-name-en">
            venue_name_en
            <input
              id="venue-name-en"
              value={venueForm.nameEn}
              onChange={(event) => setVenueForm((prev) => ({ ...prev, nameEn: event.target.value }))}
            />
          </label>

          <label htmlFor="venue-description-th">
            description_th
            <textarea
              id="venue-description-th"
              rows={3}
              value={venueForm.descriptionTh}
              onChange={(event) => setVenueForm((prev) => ({ ...prev, descriptionTh: event.target.value }))}
            />
          </label>

          <label htmlFor="venue-description-en">
            description_en
            <textarea
              id="venue-description-en"
              rows={3}
              value={venueForm.descriptionEn}
              onChange={(event) => setVenueForm((prev) => ({ ...prev, descriptionEn: event.target.value }))}
            />
          </label>

          <label htmlFor="venue-sort-order">
            sort_order
            <input
              id="venue-sort-order"
              type="number"
              min={0}
              value={venueForm.sortOrder}
              onChange={(event) => setVenueForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
            />
            {venueErrors.sortOrder ? <small>{venueErrors.sortOrder}</small> : null}
          </label>

          <label htmlFor="venue-google-maps-url">
            google_maps_url
            <input
              id="venue-google-maps-url"
              value={venueForm.googleMapsUrl}
              onChange={(event) => setVenueForm((prev) => ({ ...prev, googleMapsUrl: event.target.value }))}
              placeholder="https://www.google.com/maps?q=13.7563,100.5018"
            />
            {venueErrors.googleMapsUrl ? <small>{venueErrors.googleMapsUrl}</small> : null}
          </label>

          <div className="admin-ui-two-col">
            <label htmlFor="venue-latitude">
              latitude
              <input
                id="venue-latitude"
                value={venueForm.latitude}
                onChange={(event) => setVenueForm((prev) => ({ ...prev, latitude: event.target.value }))}
                placeholder="13.7563000"
              />
              {venueErrors.latitude ? <small>{venueErrors.latitude}</small> : null}
            </label>
            <label htmlFor="venue-longitude">
              longitude
              <input
                id="venue-longitude"
                value={venueForm.longitude}
                onChange={(event) => setVenueForm((prev) => ({ ...prev, longitude: event.target.value }))}
                placeholder="100.5018000"
              />
              {venueErrors.longitude ? <small>{venueErrors.longitude}</small> : null}
            </label>
          </div>

          <label className="admin-ui-check">
            <input
              type="checkbox"
              checked={venueForm.isEnabled}
              onChange={(event) => setVenueForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
            />
            <span>เปิดใช้งาน</span>
          </label>

          <div className="admin-ui-form-actions">
            <button type="button" className="admin-ui-btn" onClick={() => setVenueDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={saveVenue}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={imageDrawerOpen}
        onClose={() => setImageDrawerOpen(false)}
        title={editingImageId ? 'แก้ไขรูปสถานที่' : 'เพิ่มรูปสถานที่'}
        subtitle={`ตั้งค่าคอลัมน์ใน content_venue_images ของ ${selectedVenue?.nameTh || selectedVenue?.nameEn || '-'}`}
      >
        <div className="admin-ui-form">
          <label htmlFor="venue-image-storage-key">
            image_storage_key *
            <input
              id="venue-image-storage-key"
              value={imageForm.imageStorageKey}
              onChange={(event) => setImageForm((prev) => ({ ...prev, imageStorageKey: event.target.value }))}
            />
            {imageErrors.imageStorageKey ? <small>{imageErrors.imageStorageKey}</small> : null}
          </label>

          <label htmlFor="venue-image-file">
            Upload image file
            <input
              id="venue-image-file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                setImageForm((prev) => ({
                  ...prev,
                  imageFile: file,
                  imageFileName: file ? file.name : '',
                  imageType: file?.type || '',
                  imageSize: file?.size || 0,
                }))
              }}
            />
            {imageErrors.imageFile ? <small>{imageErrors.imageFile}</small> : null}
          </label>

          {imageForm.imageFile ? (
            <span className="admin-ui-file-chip">
              <FileImage size={13} />
              {imageForm.imageFile.name} • {formatFileSize(imageForm.imageSize)}
            </span>
          ) : null}

          <label htmlFor="venue-image-file-name">
            upload_file_name (optional)
            <input
              id="venue-image-file-name"
              value={imageForm.imageFileName}
              onChange={(event) => setImageForm((prev) => ({ ...prev, imageFileName: event.target.value }))}
              placeholder="เช่น hotel-lobby.jpg"
            />
          </label>

          {selectedVenue ? (
            <p className="admin-ui-text-muted">
              upload path: <code>/static/content/venues/{String(selectedVenue.category || '').replace(/_/g, '-')}</code>
            </p>
          ) : null}

          <div className="admin-ui-two-col">
            <label htmlFor="venue-image-alt-th">
              image_alt_th
              <input
                id="venue-image-alt-th"
                value={imageForm.imageAltTh}
                onChange={(event) => setImageForm((prev) => ({ ...prev, imageAltTh: event.target.value }))}
              />
            </label>
            <label htmlFor="venue-image-alt-en">
              image_alt_en
              <input
                id="venue-image-alt-en"
                value={imageForm.imageAltEn}
                onChange={(event) => setImageForm((prev) => ({ ...prev, imageAltEn: event.target.value }))}
              />
            </label>
          </div>

          <label htmlFor="venue-image-sort-order">
            sort_order
            <input
              id="venue-image-sort-order"
              type="number"
              min={0}
              value={imageForm.sortOrder}
              onChange={(event) => setImageForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
            />
            {imageErrors.sortOrder ? <small>{imageErrors.sortOrder}</small> : null}
          </label>

          <div className="admin-ui-two-col">
            <label className="admin-ui-check">
              <input
                type="checkbox"
                checked={imageForm.isCover}
                onChange={(event) => setImageForm((prev) => ({ ...prev, isCover: event.target.checked }))}
              />
              <span>ตั้งเป็นภาพหน้าปก</span>
            </label>
            <label className="admin-ui-check">
              <input
                type="checkbox"
                checked={imageForm.isEnabled}
                onChange={(event) => setImageForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span>เปิดใช้งาน</span>
            </label>
          </div>

          <div className="admin-ui-file-preview">
            <h5>ตัวอย่าง</h5>
            <div className="admin-ui-file-preview-box admin-ui-venue-image-preview">
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt={imageForm.imageAltTh || imageForm.imageAltEn || 'venue preview'}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span>ระบุ image_storage_key เพื่อดูตัวอย่าง</span>
              )}
            </div>
          </div>

          <div className="admin-ui-form-actions">
            <button type="button" className="admin-ui-btn" onClick={() => setImageDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={saveImage}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}
