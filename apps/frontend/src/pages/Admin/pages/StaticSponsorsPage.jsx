import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Link2, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import DetailDrawer from '../shared/DetailDrawer'
import PageHeader from '../shared/PageHeader'
import StatusBadge from '../shared/StatusBadge'
import { useAdminToast } from '../shared/adminContexts'

export default function StaticSponsorsPage() {
  const { pushToast } = useAdminToast()
  const [groupItems, setGroupItems] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [groupErrors, setGroupErrors] = useState({})
  const [groupForm, setGroupForm] = useState({
    code: '',
    nameTh: '',
    nameEn: '',
    sortOrder: 1,
    isActive: true,
  })
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    sponsorNameEn: '',
    sponsorNameTh: '',
    websiteUrl: '',
    tierCode: 'co_organizer',
    tierNameTh: 'ผู้ร่วมจัด',
    tierNameEn: 'Co-Organizer',
    sponsorGroupId: null,
    sortOrder: 1,
    isEnabled: true,
    logoStorageKey: '',
    logoFile: null,
    logoFileName: '',
    logoType: '',
    logoSize: 0,
  })

  const fetchSponsors = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/sponsors'), { credentials: 'include' })
      const data = await response.json()
      if (data.ok) {
        setItems(
          data.data.map((item) => ({
            id: item.id,
            name: item.name,
            nameTh: item.nameTh,
            link: item.link,
            displayOrder: item.displayOrder,
            isActive: item.isActive,
            logo: item.logo,
            logoMeta: item.logoMeta,
            tierCode: item.tierCode,
            tierNameTh: item.tierNameTh,
            tierNameEn: item.tierNameEn,
            sponsorGroupId: item.sponsorGroupId,
            sponsorGroup: item.sponsorGroup,
            sponsorGroupNameTh: item.sponsorGroup?.nameTh || '',
            sponsorGroupNameEn: item.sponsorGroup?.nameEn || '',
          })),
        )
      }
    } catch (error) {
      console.error('Failed to fetch sponsors:', error)
      pushToast({ type: 'error', title: 'ไม่สามารถโหลดข้อมูล sponsor ได้' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  const fetchSponsorGroups = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/api/admin/sponsor-groups'), { credentials: 'include' })
      const data = await response.json()
      if (data.ok) {
        setGroupItems(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch sponsor groups:', error)
      pushToast({ type: 'error', title: 'ไม่สามารถโหลดข้อมูลกลุ่มภาคีได้' })
    }
  }, [pushToast])

  useEffect(() => {
    fetchSponsors()
    fetchSponsorGroups()
  }, [fetchSponsors, fetchSponsorGroups])

  const openCreateGroup = () => {
    setEditingGroupId(null)
    setGroupErrors({})
    setGroupForm({
      code: '',
      nameTh: '',
      nameEn: '',
      sortOrder: groupItems.length + 1,
      isActive: true,
    })
    setGroupDrawerOpen(true)
  }

  const openEditGroup = (group) => {
    setEditingGroupId(group.id)
    setGroupErrors({})
    setGroupForm({
      code: group.code || '',
      nameTh: group.nameTh || '',
      nameEn: group.nameEn || '',
      sortOrder: group.sortOrder,
      isActive: group.isActive !== false,
    })
    setGroupDrawerOpen(true)
  }

  const validateGroup = () => {
    const next = {}
    if (!groupForm.code.trim()) next.code = 'กรุณากรอก group_code'
    if (!groupForm.nameTh.trim()) next.nameTh = 'กรุณากรอกชื่อกลุ่ม (TH)'
    if (!groupForm.nameEn.trim()) next.nameEn = 'กรุณากรอกชื่อกลุ่ม (EN)'
    setGroupErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmitGroup = async () => {
    if (!validateGroup()) return

    const payload = {
      code: groupForm.code.trim(),
      nameTh: groupForm.nameTh.trim(),
      nameEn: groupForm.nameEn.trim(),
      sortOrder: Number(groupForm.sortOrder),
      isActive: groupForm.isActive,
    }

    try {
      const response = await fetch(
        apiUrl(editingGroupId ? `/api/admin/sponsor-groups/${editingGroupId}` : '/api/admin/sponsor-groups'),
        {
          method: editingGroupId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      )
      const data = await response.json()

      if (!data.ok) {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
        return
      }

      pushToast({
        title: editingGroupId ? 'อัปเดตกลุ่มภาคีสำเร็จ' : 'เพิ่มกลุ่มภาคีสำเร็จ',
        description: payload.nameTh,
      })
      fetchSponsorGroups()
      fetchSponsors()
      setGroupDrawerOpen(false)
    } catch (error) {
      console.error('Failed to save sponsor group:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึกกลุ่มภาคี' })
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setErrors({})
    setForm({
      sponsorNameEn: '',
      sponsorNameTh: '',
      websiteUrl: '',
      tierCode: 'co_organizer',
      tierNameTh: 'ผู้ร่วมจัด',
      tierNameEn: 'Co-Organizer',
      sponsorGroupId: groupItems[0]?.id ?? null,
      sortOrder: items.length + 1,
      isEnabled: true,
      logoStorageKey: '',
      logoFile: null,
      logoFileName: '',
      logoType: '',
      logoSize: 0,
    })
    setDrawerOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setErrors({})
    setForm({
      sponsorNameEn: item.name || '',
      sponsorNameTh: item.nameTh || '',
      websiteUrl: item.link || '',
      tierCode: item.tierCode || 'co_organizer',
      tierNameTh: item.tierNameTh || 'ผู้ร่วมจัด',
      tierNameEn: item.tierNameEn || 'Co-Organizer',
      sponsorGroupId: item.sponsorGroupId ?? null,
      sortOrder: item.displayOrder,
      isEnabled: item.isActive,
      logoStorageKey: item.logo || '',
      logoFile: null,
      logoFileName: item.logo?.split('/').pop() || '',
      logoType: item.logoMeta?.type || '',
      logoSize: (item.logoMeta?.sizeKb || 0) * 1024,
    })
    setDrawerOpen(true)
  }

  const tierFolder = useMemo(() => (form.tierCode || 'co_organizer').replace(/_/g, '-'), [form.tierCode])
  const previewLogoStorageKey = useMemo(
    () => (form.logoFileName ? `/static/content/sponsors/${tierFolder}/${form.logoFileName}` : form.logoStorageKey),
    [form.logoFileName, form.logoStorageKey, tierFolder],
  )

  const validate = () => {
    const next = {}
    if (!form.sponsorNameEn.trim()) next.sponsorNameEn = 'กรุณากรอก sponsor_name_en'
    if (!form.sponsorNameTh.trim()) next.sponsorNameTh = 'กรุณากรอก sponsor_name_th'
    if (!form.tierCode.trim()) next.tierCode = 'กรุณากรอก tier_code'
    if (!editingId && !form.logoFile) next.logo = 'กรุณาอัปโหลดโลโก้'
    if (form.logoFile && !form.logoFileName.trim()) next.logoFileName = 'กรุณาตั้งชื่อไฟล์ก่อนอัปโหลด'
    if (form.logoType && !['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(form.logoType)) {
      next.logo = 'รองรับเฉพาะ PNG/JPG/WEBP/SVG'
    }
    if (form.logoSize > 4 * 1024 * 1024) next.logo = 'ไฟล์ต้องไม่เกิน 4 MB'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async () => {
    if (!validate()) return
    const payload = {
      name: form.sponsorNameEn.trim(),
      nameTh: form.sponsorNameTh.trim(),
      link: form.websiteUrl.trim() || null,
      displayOrder: Number(form.sortOrder),
      isActive: form.isEnabled,
      tierCode: form.tierCode.trim(),
      tierNameTh: form.tierNameTh.trim() || null,
      tierNameEn: form.tierNameEn.trim() || null,
      sponsorGroupId:
        form.sponsorGroupId !== null && form.sponsorGroupId !== undefined ? Number(form.sponsorGroupId) : null,
    }

    const uploadLogoIfNeeded = async (sponsorId) => {
      if (!form.logoFile) return
      const formData = new FormData()
      formData.append('file', form.logoFile)
      formData.append('fileName', form.logoFileName.trim())
      formData.append('tierCode', form.tierCode.trim())

      const uploadResponse = await fetch(apiUrl(`/api/admin/sponsors/${sponsorId}/logo`), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const uploadData = await uploadResponse.json()
      if (!uploadData.ok) {
        throw new Error(uploadData.message || 'อัปโหลดโลโก้ไม่สำเร็จ')
      }
    }

    try {
      if (editingId) {
        const response = await fetch(apiUrl(`/api/admin/sponsors/${editingId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (data.ok) {
          await uploadLogoIfNeeded(editingId)
          pushToast({ title: 'อัปเดต Sponsor สำเร็จ', description: form.sponsorNameEn })
          fetchSponsors()
        } else {
          pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
        }
      } else {
        const response = await fetch(apiUrl('/api/admin/sponsors'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...payload,
            logo: previewLogoStorageKey,
          }),
        })
        const data = await response.json()
        if (data.ok) {
          await uploadLogoIfNeeded(data.data.id)
          pushToast({ title: 'เพิ่ม Sponsor สำเร็จ', description: form.sponsorNameEn })
          fetchSponsors()
        } else {
          pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
        }
      }
    } catch (error) {
      console.error('Failed to save sponsor:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึก' })
    }
    setDrawerOpen(false)
  }

  const remove = async (id) => {
    const target = items.find((item) => item.id === id)
    try {
      const response = await fetch(apiUrl(`/api/admin/sponsors/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (data.ok) {
        pushToast({
          type: 'warning',
          title: 'ลบ Sponsor แล้ว',
          description: target?.name || '',
        })
        fetchSponsors()
      } else {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
      }
    } catch (error) {
      console.error('Failed to delete sponsor:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบ' })
    }
  }

  const moveItem = async (id, direction) => {
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= items.length) return

    const next = [...items]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    const reordered = next.map((item, idx) => ({ ...item, displayOrder: idx + 1 }))
    setItems(reordered)

    try {
      const updates = reordered.map((item) => ({ id: item.id, displayOrder: item.displayOrder }))
      await fetch(apiUrl('/api/admin/sponsors/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
    } catch (error) {
      console.error('Failed to reorder sponsors:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับ' })
      fetchSponsors()
    }
  }

  const moveGroup = async (id, direction) => {
    const index = groupItems.findIndex((item) => item.id === id)
    if (index === -1) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= groupItems.length) return

    const next = [...groupItems]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    const reordered = next.map((item, idx) => ({ ...item, sortOrder: idx + 1 }))
    setGroupItems(reordered)

    try {
      const updates = reordered.map((item) => ({ id: item.id, sortOrder: item.sortOrder }))
      await fetch(apiUrl('/api/admin/sponsor-groups/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
      fetchSponsors()
    } catch (error) {
      console.error('Failed to reorder sponsor groups:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับกลุ่มภาคี' })
      fetchSponsorGroups()
    }
  }

  return (
    <div className="admin-ui-stack">
      <PageHeader
        title="ภาคีเครือข่าย"
        actions={
          <div className="admin-ui-header-actions">
            <button type="button" className="admin-ui-btn" onClick={openCreateGroup}>
              <Plus size={15} />
              เพิ่มกลุ่ม
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={openCreate}>
              <Plus size={15} />
              เพิ่มภาคีเครือข่าย
            </button>
          </div>
        }
      />

      <AdminDataTable
        loading={loading}
        rows={[...groupItems].sort((a, b) => a.sortOrder - b.sortOrder)}
        searchKeys={['nameTh', 'nameEn', 'code']}
        searchPlaceholder="ค้นหาชื่อกลุ่มภาคี"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'เปิดใช้งาน', value: 'active', predicate: (row) => row.isActive },
          { label: 'ปิดใช้งาน', value: 'inactive', predicate: (row) => !row.isActive },
        ]}
        columns={[
          {
            key: 'name',
            label: 'กลุ่มผู้สนับสนุน',
            render: (row) => (
              <div>
                <strong>{row.nameTh}</strong>
                <span>{row.nameEn}</span>
              </div>
            ),
          },
          {
            key: 'code',
            label: 'รหัสกลุ่ม',
          },
          {
            key: 'sortOrder',
            label: 'ลำดับกลุ่ม',
          },
          {
            key: 'isActive',
            label: 'สถานะ',
            render: (row) => (
              <StatusBadge status={row.isActive ? 'APPROVED' : 'RETURNED'} label={row.isActive ? 'Enable' : 'Disable'} />
            ),
          },
          {
            key: 'actions',
            label: 'การจัดการ',
            render: (row) => (
              <div className="admin-ui-row-actions">
                <button type="button" onClick={() => moveGroup(row.id, 'up')} aria-label="move up group">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => moveGroup(row.id, 'down')} aria-label="move down group">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => openEditGroup(row)} aria-label="edit group">
                  <Pencil size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <DetailDrawer
        open={groupDrawerOpen}
        onClose={() => setGroupDrawerOpen(false)}
        title={editingGroupId ? 'แก้ไขกลุ่มผู้สนับสนุน' : 'เพิ่มกลุ่มผู้สนับสนุน'}
        subtitle="จัดการชื่อกลุ่มและลำดับการแสดงผล"
      >
        <div className="admin-ui-form">
          <label htmlFor="sponsor-group-code">
            group_code *
            <input
              id="sponsor-group-code"
              value={groupForm.code}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, code: event.target.value }))}
            />
            {groupErrors.code ? <small>{groupErrors.code}</small> : null}
          </label>

          <label htmlFor="sponsor-group-name-th">
            group_name_th *
            <input
              id="sponsor-group-name-th"
              value={groupForm.nameTh}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, nameTh: event.target.value }))}
            />
            {groupErrors.nameTh ? <small>{groupErrors.nameTh}</small> : null}
          </label>

          <label htmlFor="sponsor-group-name-en">
            group_name_en *
            <input
              id="sponsor-group-name-en"
              value={groupForm.nameEn}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, nameEn: event.target.value }))}
            />
            {groupErrors.nameEn ? <small>{groupErrors.nameEn}</small> : null}
          </label>

          <label htmlFor="sponsor-group-order">
            sort_order
            <input
              id="sponsor-group-order"
              type="number"
              min={1}
              value={groupForm.sortOrder}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
            />
          </label>

          <div className="admin-ui-toggle-row">
            <label htmlFor="sponsor-group-active" className="admin-ui-toggle-label">
              Status
            </label>
            <label className="admin-ui-toggle">
              <input
                type="checkbox"
                checked={groupForm.isActive}
                onChange={(event) => setGroupForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              <span className="admin-ui-toggle-switch"></span>
              <span className="admin-ui-toggle-text">{groupForm.isActive ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <div className="admin-ui-form-actions">
            <button type="button" className="admin-ui-btn" onClick={() => setGroupDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={onSubmitGroup}>
              <Save size={14} />
              บันทึกกลุ่ม
            </button>
          </div>
        </div>
      </DetailDrawer>

      <AdminDataTable
        loading={loading}
        rows={[...items].sort((a, b) => {
          const leftGroupOrder = Number(a.sponsorGroup?.sortOrder ?? 999999)
          const rightGroupOrder = Number(b.sponsorGroup?.sortOrder ?? 999999)
          if (leftGroupOrder !== rightGroupOrder) return leftGroupOrder - rightGroupOrder
          return a.displayOrder - b.displayOrder
        })}
        searchKeys={['nameTh', 'name', 'link', 'sponsorGroupNameTh', 'sponsorGroupNameEn']}
        searchPlaceholder="ค้นหาชื่อ sponsor หรือลิงก์"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'เปิดใช้งาน', value: 'active', predicate: (row) => row.isActive },
          { label: 'ปิดใช้งาน', value: 'inactive', predicate: (row) => !row.isActive },
        ]}
        columns={[
          {
            key: 'logo',
            label: 'โลโก้และชื่อ',
            render: (row) => (
              <div className="admin-ui-inline-logo">
                <img src={apiUrl(row.logo)} alt={row.nameTh || row.name} loading="lazy" decoding="async" />
                <div>
                  <strong>{row.nameTh || row.name}</strong>
                  <span>{row.logoMeta?.type || '-'}</span>
                </div>
              </div>
            ),
          },
          {
            key: 'link',
            label: 'ลิงก์',
            render: (row) =>
              row.link ? (
                <a href={row.link} target="_blank" rel="noreferrer" className="admin-ui-link">
                  <Link2 size={13} />
                  {row.link}
                </a>
              ) : (
                <span>-</span>
              ),
          },
          {
            key: 'sponsorGroup',
            label: 'กลุ่ม',
            render: (row) => <span>{row.sponsorGroup?.nameTh || '-'}</span>,
          },
          {
            key: 'displayOrder',
            label: 'ลำดับแสดงผล',
          },
          {
            key: 'isActive',
            label: 'สถานะ',
            render: (row) => (
              <StatusBadge status={row.isActive ? 'APPROVED' : 'RETURNED'} label={row.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} />
            ),
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
        title={editingId ? 'แก้ไขผู้สนับสนุน' : 'เพิ่มผู้สนับสนุน'}
        subtitle="รองรับการอัปโหลดโลโก้และตรวจสอบไฟล์ภาพ"
      >
        <div className="admin-ui-form">
          <label htmlFor="sponsor-name-en">
            sponsor_name_en *
            <input
              id="sponsor-name-en"
              value={form.sponsorNameEn}
              onChange={(event) => setForm((prev) => ({ ...prev, sponsorNameEn: event.target.value }))}
            />
            {errors.sponsorNameEn ? <small>{errors.sponsorNameEn}</small> : null}
          </label>

          <label htmlFor="sponsor-name-th">
            sponsor_name_th *
            <input
              id="sponsor-name-th"
              value={form.sponsorNameTh}
              onChange={(event) => setForm((prev) => ({ ...prev, sponsorNameTh: event.target.value }))}
            />
            {errors.sponsorNameTh ? <small>{errors.sponsorNameTh}</small> : null}
          </label>

          <label htmlFor="sponsor-website-url">
            website_url
            <input
              id="sponsor-website-url"
              value={form.websiteUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
            />
          </label>

          <label htmlFor="sponsor-tier-code">
            tier_code *
            <input
              id="sponsor-tier-code"
              value={form.tierCode}
              onChange={(event) => setForm((prev) => ({ ...prev, tierCode: event.target.value }))}
            />
            {errors.tierCode ? <small>{errors.tierCode}</small> : null}
          </label>

          <label htmlFor="sponsor-tier-name-th">
            tier_name_th
            <input
              id="sponsor-tier-name-th"
              value={form.tierNameTh}
              onChange={(event) => setForm((prev) => ({ ...prev, tierNameTh: event.target.value }))}
            />
          </label>

          <label htmlFor="sponsor-tier-name-en">
            tier_name_en
            <input
              id="sponsor-tier-name-en"
              value={form.tierNameEn}
              onChange={(event) => setForm((prev) => ({ ...prev, tierNameEn: event.target.value }))}
            />
          </label>

          <label htmlFor="sponsor-group-id">
            sponsor_group
            <select
              id="sponsor-group-id"
              value={form.sponsorGroupId ?? ''}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  sponsorGroupId: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
              <option value="">-</option>
              {groupItems.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.nameTh} ({group.nameEn})
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="sponsor-order">
            sort_order
            <input
              id="sponsor-order"
              type="number"
              min={1}
              value={form.sortOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
            />
          </label>

          <label htmlFor="sponsor-logo">
            อัปโหลดโลโก้ {editingId ? '(ไม่บังคับ)' : '*'}
            <input
              id="sponsor-logo"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setForm((prev) => ({
                  ...prev,
                  logoFile: file,
                  logoFileName: file.name,
                  logoType: file.type,
                  logoSize: file.size,
                }))
              }}
            />
            {form.logoFileName ? (
              <span className="admin-ui-file-chip">
                <Upload size={13} />
                {form.logoFileName}
              </span>
            ) : null}
            {errors.logo ? <small>{errors.logo}</small> : null}
          </label>

          <label htmlFor="sponsor-logo-file-name">
            ชื่อไฟล์โลโก้
            <input
              id="sponsor-logo-file-name"
              value={form.logoFileName}
              placeholder="example-logo.png"
              onChange={(event) => setForm((prev) => ({ ...prev, logoFileName: event.target.value }))}
            />
            {errors.logoFileName ? <small>{errors.logoFileName}</small> : null}
          </label>

          <label htmlFor="sponsor-logo-key">
            logo_storage_key
            <input id="sponsor-logo-key" value={previewLogoStorageKey} readOnly />
          </label>

          <div className="admin-ui-toggle-row">
            <label htmlFor="sponsor-active" className="admin-ui-toggle-label">
              สถานะ
            </label>
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
