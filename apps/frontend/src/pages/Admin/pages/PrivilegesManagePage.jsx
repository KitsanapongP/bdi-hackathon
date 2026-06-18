import { useCallback, useEffect, useState } from 'react'
import { Check, Gift, Pencil, Plus, RefreshCw, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminConfirmModal from '../shared/AdminConfirmModal'
import AdminDataTable from '../shared/AdminDataTable'
import DetailDrawer from '../shared/DetailDrawer'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'
import { PRIVILEGE_TYPE_OPTIONS, privilegeTypeLabel } from '../utils/privileges'
import './PrivilegesManagePage.css'

const TYPE_META = {
  souvenir_qr: { Icon: Gift, accent: 'pm-accent-amber' },
  auto_admin: { Icon: Sparkles, accent: 'pm-accent-indigo' },
}

function typeMeta(value) {
  return TYPE_META[value] || { Icon: Gift, accent: 'pm-accent-teal' }
}

const EMPTY_FORM = {
  privilegeCode: '',
  privilegeNameTh: '',
  privilegeNameEn: '',
  descriptionTh: '',
  descriptionEn: '',
  privilegeType: 'souvenir_qr',
  isActive: true,
  isPublished: false,
  sortOrder: 0,
}

export default function PrivilegesManagePage() {
  const { pushToast } = useAdminToast()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState(null)
  const [deleteTemplateCandidate, setDeleteTemplateCandidate] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/privileges/admin/templates'), { credentials: 'include' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'โหลดเทมเพลตไม่สำเร็จ')
      setTemplates(payload.data || [])
    } catch (error) {
      console.error(error)
      pushToast({ type: 'error', title: 'โหลดเทมเพลตไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDrawerOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.privilegeId)
    setForm({
      privilegeCode: row.privilegeCode,
      privilegeNameTh: row.privilegeNameTh,
      privilegeNameEn: row.privilegeNameEn || '',
      descriptionTh: row.descriptionTh || '',
      descriptionEn: row.descriptionEn || '',
      privilegeType: row.privilegeType,
      isActive: row.isActive,
      isPublished: row.isPublished,
      sortOrder: row.sortOrder,
    })
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    if (saving) return
    setDrawerOpen(false)
  }

  const submitTemplate = async () => {
    if (!form.privilegeCode.trim() || !form.privilegeNameTh.trim()) {
      pushToast({ type: 'error', title: 'กรุณากรอก code และชื่อสิทธิ์' })
      return
    }
    try {
      setSaving(true)
      const trimOrNull = (value) => {
        const trimmed = String(value ?? '').trim()
        return trimmed ? trimmed : null
      }
      const payloadBody = {
        privilegeCode: form.privilegeCode,
        privilegeNameTh: form.privilegeNameTh,
        privilegeNameEn: trimOrNull(form.privilegeNameEn),
        descriptionTh: trimOrNull(form.descriptionTh),
        descriptionEn: trimOrNull(form.descriptionEn),
        privilegeType: form.privilegeType,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive === true,
        isPublished: form.isPublished === true,
      }
      const response = await fetch(apiUrl(editingId ? `/api/privileges/admin/templates/${editingId}` : '/api/privileges/admin/templates'), {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payloadBody),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'บันทึกข้อมูลไม่สำเร็จ')
      pushToast({ title: editingId ? 'อัปเดตสิทธิ์สำเร็จ' : 'สร้างสิทธิ์สำเร็จ' })
      setDrawerOpen(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await fetchData()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'บันทึกไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (template) => {
    try {
      const response = await fetch(apiUrl(`/api/privileges/admin/templates/${template.privilegeId}/publish`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: !template.isPublished }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'เผยแพร่ไม่สำเร็จ')
      pushToast({ title: template.isPublished ? 'ยกเลิกเผยแพร่แล้ว' : 'เผยแพร่แล้ว' })
      await fetchData()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'อัปเดตไม่สำเร็จ' })
    }
  }

  const confirmDeleteTemplate = async () => {
    if (!deleteTemplateCandidate?.privilegeId || deletingTemplateId) return
    const templateId = deleteTemplateCandidate.privilegeId
    try {
      setDeletingTemplateId(templateId)
      const response = await fetch(apiUrl(`/api/privileges/admin/templates/${templateId}`), { method: 'DELETE', credentials: 'include' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'ลบข้อมูลไม่สำเร็จ')
      if (editingId === templateId) {
        setDrawerOpen(false)
        setEditingId(null)
        setForm(EMPTY_FORM)
      }
      pushToast({ type: 'warning', title: 'ลบสิทธิ์แล้ว' })
      await fetchData()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'ลบไม่สำเร็จ' })
    } finally {
      setDeletingTemplateId(null)
      setDeleteTemplateCandidate(null)
    }
  }

  const selectedType = PRIVILEGE_TYPE_OPTIONS.find((option) => option.value === form.privilegeType)

  return (
    <div className="admin-ui-stack pm-page">
      <PageHeader
        title="จัดการสิทธิ์ / ของรางวัล"
        subtitle="สร้างและจัดการเทมเพลตสิทธิประโยชน์ที่จะแจกให้ทีมที่ยืนยันเข้าร่วม"
        actions={
          <div className="admin-ui-header-actions">
            <button type="button" className="admin-ui-btn" onClick={() => fetchData()}>
              <RefreshCw size={14} />
              รีเฟรช
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={openCreate}>
              <Plus size={15} />
              สร้างสิทธิ์ใหม่
            </button>
          </div>
        }
      />

      <AdminDataTable
        rows={templates.map((item) => ({ ...item, id: item.privilegeId }))}
        loading={loading}
        searchKeys={['privilegeCode', 'privilegeNameTh', 'privilegeNameEn', 'privilegeType']}
        searchPlaceholder="ค้นหาด้วยโค้ด หรือชื่อสิทธิ์"
        emptyMessage="ยังไม่มีสิทธิประโยชน์"
        filters={[
          { value: 'all', label: 'ทั้งหมด' },
          { value: 'published', label: 'เผยแพร่แล้ว', predicate: (row) => row.isPublished },
          { value: 'draft', label: 'ฉบับร่าง', predicate: (row) => !row.isPublished },
          { value: 'inactive', label: 'ปิดใช้งาน', predicate: (row) => !row.isActive },
        ]}
        columns={[
          { key: 'privilegeCode', label: 'โค้ด', render: (row) => <span className="pm-code">{row.privilegeCode}</span> },
          {
            key: 'privilegeNameTh',
            label: 'ชื่อสิทธิ์',
            render: (row) => (
              <div className="pm-name-cell">
                <span>{row.privilegeNameTh}</span>
                {row.privilegeNameEn ? <small>{row.privilegeNameEn}</small> : null}
              </div>
            ),
          },
          {
            key: 'privilegeType',
            label: 'ประเภท',
            render: (row) => {
              const meta = typeMeta(row.privilegeType)
              const TypeIcon = meta.Icon
              return (
                <span className={`pm-type-tag ${meta.accent}`}>
                  <TypeIcon size={13} />
                  {privilegeTypeLabel(row.privilegeType)}
                </span>
              )
            },
          },
          { key: 'isActive', label: 'การใช้งาน', render: (row) => <span className={`admin-ui-status ${row.isActive ? 'admin-ui-status-success' : 'admin-ui-status-danger'}`}>{row.isActive ? 'ใช้งาน' : 'ปิด'}</span> },
          { key: 'isPublished', label: 'เผยแพร่', render: (row) => <span className={`admin-ui-status ${row.isPublished ? 'admin-ui-status-success' : 'admin-ui-status-neutral'}`}>{row.isPublished ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</span> },
          {
            key: 'actions',
            label: 'การจัดการ',
            render: (row) => (
              <div className="admin-ui-row-actions">
                <button type="button" title="แก้ไข" aria-label="แก้ไข" onClick={() => openEdit(row)}><Pencil size={14} /></button>
                <button type="button" title={row.isPublished ? 'ยกเลิกเผยแพร่' : 'เผยแพร่'} aria-label={row.isPublished ? 'ยกเลิกเผยแพร่' : 'เผยแพร่'} onClick={() => togglePublish(row)}>{row.isPublished ? <RotateCcw size={14} /> : <Check size={14} />}</button>
                <button type="button" title="ลบ" aria-label="ลบ" disabled={deletingTemplateId === row.privilegeId} onClick={() => setDeleteTemplateCandidate(row)}><Trash2 size={14} /></button>
              </div>
            ),
          },
        ]}
      />

      <DetailDrawer
        open={drawerOpen}
        title={editingId ? 'แก้ไขสิทธิประโยชน์' : 'สร้างสิทธิประโยชน์ใหม่'}
        subtitle={editingId ? 'ปรับรายละเอียดของสิทธิ์ที่เลือก' : 'กรอกข้อมูลเพื่อเพิ่มสิทธิ์/ของรางวัล'}
        onClose={closeDrawer}
      >
        <div className="pm-form">
          <div>
            <div className="pm-field-label">ประเภทสิทธิ์</div>
            <div className="pm-type-select">
              {PRIVILEGE_TYPE_OPTIONS.map((option) => {
                const meta = typeMeta(option.value)
                const OptIcon = meta.Icon
                const selected = form.privilegeType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`pm-type-option ${meta.accent} ${selected ? 'is-selected' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, privilegeType: option.value }))}
                    aria-pressed={selected}
                  >
                    <span className="pm-type-badge"><OptIcon size={18} /></span>
                    <span className="pm-type-option-text">
                      <strong>{option.label}</strong>
                      <span>{option.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="admin-ui-form pm-form-grid">
            <label className="pm-field-full">โค้ด
              <input
                value={form.privilegeCode}
                onChange={(event) => setForm((prev) => ({ ...prev, privilegeCode: event.target.value }))}
                placeholder="เช่น TSHIRT_2026"
              />
            </label>
            <label>ชื่อสิทธิ์ (TH)
              <input value={form.privilegeNameTh} onChange={(event) => setForm((prev) => ({ ...prev, privilegeNameTh: event.target.value }))} />
            </label>
            <label>ชื่อสิทธิ์ (EN)
              <input value={form.privilegeNameEn} onChange={(event) => setForm((prev) => ({ ...prev, privilegeNameEn: event.target.value }))} placeholder="ไม่บังคับ" />
            </label>
            <label className="pm-field-full">รายละเอียด (TH)
              <textarea rows={2} value={form.descriptionTh} onChange={(event) => setForm((prev) => ({ ...prev, descriptionTh: event.target.value }))} placeholder="ไม่บังคับ" />
            </label>
            <label className="pm-field-full">รายละเอียด (EN)
              <textarea rows={2} value={form.descriptionEn} onChange={(event) => setForm((prev) => ({ ...prev, descriptionEn: event.target.value }))} placeholder="ไม่บังคับ" />
            </label>
            <label>ลำดับการแสดง
              <input type="number" value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))} />
            </label>
          </div>

          <div className="pm-toggles">
            <label className="pm-toggle">
              <span className="pm-toggle-text">
                <strong>ใช้งาน</strong>
                <span>ปิดเพื่อพักสิทธิ์นี้ชั่วคราว</span>
              </span>
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
            </label>
            <label className="pm-toggle">
              <span className="pm-toggle-text">
                <strong>เผยแพร่</strong>
                <span>แจกให้ทีมที่ยืนยันแล้วทันที</span>
              </span>
              <input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((prev) => ({ ...prev, isPublished: event.target.checked }))} />
            </label>
          </div>

          {selectedType ? <p className="admin-ui-text-muted">{selectedType.hint}</p> : null}

          <div className="pm-drawer-foot">
            <button type="button" className="admin-ui-btn" onClick={closeDrawer} disabled={saving}>ยกเลิก</button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={submitTemplate} disabled={saving}>
              <Save size={14} />
              {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'สร้างสิทธิ์'}
            </button>
          </div>
        </div>
      </DetailDrawer>

      <AdminConfirmModal
        open={Boolean(deleteTemplateCandidate)}
        danger
        title={deleteTemplateCandidate ? `ลบ ${deleteTemplateCandidate.privilegeNameTh}?` : 'ลบสิทธิ์นี้?'}
        description="ระบบจะลบสิทธิประโยชน์นี้ออกจากรายการทันที"
        confirmLabel={deletingTemplateId ? 'กำลังลบ...' : 'ลบ'}
        cancelLabel="ยกเลิก"
        onCancel={() => {
          if (!deletingTemplateId) setDeleteTemplateCandidate(null)
        }}
        onConfirm={confirmDeleteTemplate}
      />
    </div>
  )
}
