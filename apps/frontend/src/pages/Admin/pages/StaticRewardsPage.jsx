import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import DetailDrawer from '../shared/DetailDrawer'
import SectionHeading from '../shared/SectionHeading'
import StatusBadge from '../shared/StatusBadge'
import { useAdminToast } from '../shared/adminContexts'

export default function StaticRewardsPage() {
  const { pushToast } = useAdminToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    rank: 1,
    title: '',
    titleTh: '',
    amount: '',
    currency: 'THB',
    prizeTextTh: '',
    prizeTextEn: '',
    descriptionTh: '',
    descriptionEn: '',
    isActive: true,
  })
  const [errors, setErrors] = useState({})

  const fetchRewards = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/rewards'), { credentials: 'include' })
      const data = await response.json()
      if (data.ok) {
        setItems(
          data.data.map((item) => ({
            id: item.id,
            rank: item.rank,
            title: item.title,
            titleTh: item.titleTh,
            amount: item.amount,
            currency: item.currency,
            prizeTextTh: item.prizeTextTh,
            prizeTextEn: item.prizeTextEn,
            descriptionTh: item.descriptionTh,
            descriptionEn: item.descriptionEn,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          })),
        )
      }
    } catch (error) {
      console.error('Failed to fetch rewards:', error)
      pushToast({ type: 'error', title: 'ไม่สามารถโหลดข้อมูลรางวัลได้' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchRewards()
  }, [fetchRewards])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      rank: items.length + 1,
      title: '',
      titleTh: '',
      amount: '',
      currency: 'THB',
      prizeTextTh: '',
      prizeTextEn: '',
      descriptionTh: '',
      descriptionEn: '',
      isActive: true,
    })
    setErrors({})
    setDrawerOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({
      rank: item.rank,
      title: item.title,
      titleTh: item.titleTh || '',
      amount: item.amount ?? '',
      currency: item.currency ?? 'THB',
      prizeTextTh: item.prizeTextTh || '',
      prizeTextEn: item.prizeTextEn || '',
      descriptionTh: item.descriptionTh || '',
      descriptionEn: item.descriptionEn || '',
      isActive: item.isActive,
    })
    setErrors({})
    setDrawerOpen(true)
  }

  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'กรุณากรอกหัวข้อรางวัล'
    if (Number(form.amount) <= 0) next.amount = 'จำนวนเงินต้องมากกว่า 0'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!validate()) return

    const payload = {
      rank: String(form.rank),
      title: form.title.trim(),
      titleTh: form.titleTh.trim() || form.title.trim(),
      amount: form.amount ? Number(form.amount) : null,
      currency: form.currency.trim() || null,
      prizeTextTh: form.prizeTextTh.trim() || null,
      prizeTextEn: form.prizeTextEn.trim() || null,
      descriptionTh: form.descriptionTh.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
      isActive: form.isActive,
    }

    try {
      const url = editingId ? apiUrl(`/api/admin/rewards/${editingId}`) : apiUrl('/api/admin/rewards')
      const method = editingId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (data.ok) {
        pushToast({ title: editingId ? 'อัปเดตรางวัลสำเร็จ' : 'เพิ่มรางวัลสำเร็จ' })
        await fetchRewards()
      } else {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
      }
    } catch (error) {
      console.error('Failed to save reward:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึก' })
    }
    setDrawerOpen(false)
  }

  const remove = async (id) => {
    try {
      const response = await fetch(apiUrl(`/api/admin/rewards/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (data.ok) {
        pushToast({ type: 'warning', title: 'ลบรางวัลแล้ว' })
        await fetchRewards()
      } else {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาด' })
      }
    } catch (error) {
      console.error('Failed to delete reward:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบ' })
    }
  }

  const moveItem = async (id, direction) => {
    const sorted = [...items].sort((a, b) => (a.sortOrder || a.rank) - (b.sortOrder || b.rank))
    const index = sorted.findIndex((item) => item.id === id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return

    const itemA = sorted[index]
    const itemB = sorted[swapIndex]

    try {
      await Promise.all([
        fetch(apiUrl(`/api/admin/rewards/${itemA.id}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sortOrder: itemB.sortOrder || itemB.rank }),
        }),
        fetch(apiUrl(`/api/admin/rewards/${itemB.id}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sortOrder: itemA.sortOrder || itemA.rank }),
        }),
      ])
      await fetchRewards()
    } catch (error) {
      console.error('Failed to reorder rewards:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการเรียงลำดับ' })
    }
  }

  return (
    <div className="admin-ui-stack">
      <SectionHeading
        title="Static Content: Rewards"
        description=""
        right={
          <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={openCreate}>
            <Plus size={15} />
            Add Reward
          </button>
        }
      />

      <AdminDataTable
        rows={[...items].sort((a, b) => (a.sortOrder || a.rank) - (b.sortOrder || b.rank))}
        searchKeys={['title', 'titleTh', 'descriptionTh', 'descriptionEn']}
        searchPlaceholder="ค้นหา reward title / description"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'Enabled', value: 'active', predicate: (row) => row.isActive },
          { label: 'Disabled', value: 'inactive', predicate: (row) => !row.isActive },
        ]}
        loading={loading}
        columns={[
          { key: 'rank', label: 'Rank' },
          {
            key: 'title',
            label: 'Title',
            render: (row) => (
              <div>
                <div>{row.titleTh || row.title}</div>
                {row.titleTh && row.title ? <div className="admin-ui-text-muted">{row.title}</div> : null}
              </div>
            ),
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => (row.amount ? Number(row.amount).toLocaleString('th-TH') : '-'),
          },
          {
            key: 'currency',
            label: 'Currency',
            render: (row) => row.currency || '-',
          },
          {
            key: 'sortOrder',
            label: 'Order',
          },
          {
            key: 'isActive',
            label: 'Status',
            render: (row) => <StatusBadge status={row.isActive ? 'ENABLED' : 'DISABLED'} />,
          },
          {
            key: 'actions',
            label: '',
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
        title={editingId ? 'Edit Reward' : 'Create Reward'}
        subtitle="ฟอร์มมี required validation และคง format ที่พร้อมต่อ API"
      >
        <div className="admin-ui-form">
          <label htmlFor="reward-rank">
            Rank
            <input
              id="reward-rank"
              type="number"
              min={1}
              value={form.rank}
              onChange={(event) => setForm((prev) => ({ ...prev, rank: event.target.value }))}
            />
          </label>
          <label htmlFor="reward-title">
            Title (English) *
            <input
              id="reward-title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            {errors.title ? <small>{errors.title}</small> : null}
          </label>
          <label htmlFor="reward-title-th">
            Title (Thai)
            <input
              id="reward-title-th"
              value={form.titleTh}
              onChange={(event) => setForm((prev) => ({ ...prev, titleTh: event.target.value }))}
            />
          </label>
          <label htmlFor="reward-amount">
            Amount *
            <input
              id="reward-amount"
              type="number"
              min={0}
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
            {errors.amount ? <small>{errors.amount}</small> : null}
          </label>
          <label htmlFor="reward-currency">
            Currency
            <input
              id="reward-currency"
              value={form.currency}
              onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
            />
          </label>
          <label htmlFor="reward-prize-text-th">
            Prize Text (Thai)
            <input
              id="reward-prize-text-th"
              value={form.prizeTextTh}
              placeholder="เช่น พร้อมถ้วย, โล่ + ของรางวัล"
              onChange={(event) => setForm((prev) => ({ ...prev, prizeTextTh: event.target.value }))}
            />
          </label>
          <label htmlFor="reward-prize-text-en">
            Prize Text (English)
            <input
              id="reward-prize-text-en"
              value={form.prizeTextEn}
              placeholder="e.g. with trophy, shield + prize"
              onChange={(event) => setForm((prev) => ({ ...prev, prizeTextEn: event.target.value }))}
            />
          </label>
          <label htmlFor="reward-description-th">
            Description (Thai)
            <textarea
              id="reward-description-th"
              rows={3}
              value={form.descriptionTh}
              onChange={(event) => setForm((prev) => ({ ...prev, descriptionTh: event.target.value }))}
            />
          </label>
          <label htmlFor="reward-description-en">
            Description (English)
            <textarea
              id="reward-description-en"
              rows={3}
              value={form.descriptionEn}
              onChange={(event) => setForm((prev) => ({ ...prev, descriptionEn: event.target.value }))}
            />
          </label>
          <div className="admin-ui-toggle-row">
            <label htmlFor="reward-active" className="admin-ui-toggle-label">
              Status
            </label>
            <label className="admin-ui-toggle">
              <input
                id="reward-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              <span className="admin-ui-toggle-switch"></span>
              <span className="admin-ui-toggle-text">{form.isActive ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <div className="admin-ui-form-actions">
            <button type="button" className="admin-ui-btn" onClick={() => setDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={save}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}
