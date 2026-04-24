import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Contact, Globe, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import DetailDrawer from '../shared/DetailDrawer'
import SectionHeading from '../shared/SectionHeading'
import StatusBadge from '../shared/StatusBadge'
import { useAdminToast } from '../shared/adminContexts'
import { formatDateInput, formatDateTime } from '../utils/adminFormatters'

export default function StaticContactsPage() {
  const { pushToast } = useAdminToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false)
  const [channelDrawerOpen, setChannelDrawerOpen] = useState(false)
  const [editingContactId, setEditingContactId] = useState(null)
  const [editingChannelId, setEditingChannelId] = useState(null)
  const [contactErrors, setContactErrors] = useState({})
  const [channelErrors, setChannelErrors] = useState({})
  const [contactForm, setContactForm] = useState({
    contactCategory: 'event_inquiry',
    displayNameTh: '',
    displayNameEn: '',
    roleTh: '',
    roleEn: '',
    organizationTh: '',
    organizationEn: '',
    departmentTh: '',
    departmentEn: '',
    bioTh: '',
    bioEn: '',
    avatarUrl: '',
    avatarAltTh: '',
    avatarAltEn: '',
    isFeatured: false,
    sortOrder: 1,
    isEnabled: true,
    publishedAt: '',
  })
  const [channelForm, setChannelForm] = useState({
    channelType: 'email',
    labelTh: '',
    labelEn: '',
    value: '',
    url: '',
    isPrimary: false,
    sortOrder: 10,
    isEnabled: true,
  })

  const sortedContacts = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [items],
  )

  const selectedContact = useMemo(
    () => sortedContacts.find((item) => item.id === selectedContactId) || null,
    [selectedContactId, sortedContacts],
  )

  const selectedChannels = useMemo(() => {
    if (!selectedContact) return []
    return [...(selectedContact.channels || [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
  }, [selectedContact])

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/contacts'), { credentials: 'include' })
      const data = await response.json()
      if (data.ok) {
        setItems(data.data || [])
      } else {
        pushToast({ type: 'error', title: data.message || 'ไม่สามารถโหลด contact ได้' })
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
      pushToast({ type: 'error', title: 'ไม่สามารถโหลด contact ได้' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const openCreateContact = () => {
    setEditingContactId(null)
    setContactErrors({})
    setContactForm({
      contactCategory: 'event_inquiry',
      displayNameTh: '',
      displayNameEn: '',
      roleTh: '',
      roleEn: '',
      organizationTh: '',
      organizationEn: '',
      departmentTh: '',
      departmentEn: '',
      bioTh: '',
      bioEn: '',
      avatarUrl: '',
      avatarAltTh: '',
      avatarAltEn: '',
      isFeatured: false,
      sortOrder: sortedContacts.length + 1,
      isEnabled: true,
      publishedAt: formatDateInput(new Date().toISOString()),
    })
    setContactDrawerOpen(true)
  }

  const openEditContact = (item) => {
    setEditingContactId(item.id)
    setContactErrors({})
    setContactForm({
      contactCategory: item.contactCategory || 'event_inquiry',
      displayNameTh: item.displayNameTh || '',
      displayNameEn: item.displayNameEn || '',
      roleTh: item.roleTh || '',
      roleEn: item.roleEn || '',
      organizationTh: item.organizationTh || '',
      organizationEn: item.organizationEn || '',
      departmentTh: item.departmentTh || '',
      departmentEn: item.departmentEn || '',
      bioTh: item.bioTh || '',
      bioEn: item.bioEn || '',
      avatarUrl: item.avatarUrl || '',
      avatarAltTh: item.avatarAltTh || '',
      avatarAltEn: item.avatarAltEn || '',
      isFeatured: Boolean(item.isFeatured),
      sortOrder: item.sortOrder || 1,
      isEnabled: Boolean(item.isEnabled),
      publishedAt: formatDateInput(item.publishedAt),
    })
    setContactDrawerOpen(true)
  }

  const validateContact = () => {
    const next = {}
    if (!contactForm.contactCategory.trim()) next.contactCategory = 'กรุณาเลือกประเภทผู้ติดต่อ'
    if (!contactForm.displayNameTh.trim()) next.displayNameTh = 'กรุณากรอก display_name_th'
    if (!contactForm.displayNameEn.trim()) next.displayNameEn = 'กรุณากรอก display_name_en'
    if (Number(contactForm.sortOrder) < 1) next.sortOrder = 'sort_order ต้องมากกว่าหรือเท่ากับ 1'
    setContactErrors(next)
    return Object.keys(next).length === 0
  }

  const saveContact = async () => {
    if (!validateContact()) return

    const payload = {
      contactCategory: contactForm.contactCategory.trim(),
      displayNameTh: contactForm.displayNameTh.trim(),
      displayNameEn: contactForm.displayNameEn.trim(),
      roleTh: contactForm.roleTh.trim() || null,
      roleEn: contactForm.roleEn.trim() || null,
      organizationTh: contactForm.organizationTh.trim() || null,
      organizationEn: contactForm.organizationEn.trim() || null,
      departmentTh: contactForm.departmentTh.trim() || null,
      departmentEn: contactForm.departmentEn.trim() || null,
      bioTh: contactForm.bioTh.trim() || null,
      bioEn: contactForm.bioEn.trim() || null,
      avatarUrl: contactForm.avatarUrl.trim() || null,
      avatarAltTh: contactForm.avatarAltTh.trim() || null,
      avatarAltEn: contactForm.avatarAltEn.trim() || null,
      isFeatured: contactForm.isFeatured,
      sortOrder: Number(contactForm.sortOrder),
      isEnabled: contactForm.isEnabled,
      publishedAt: contactForm.publishedAt ? new Date(contactForm.publishedAt).toISOString() : null,
    }

    try {
      const isEdit = Boolean(editingContactId)
      const response = await fetch(apiUrl(isEdit ? `/api/admin/contacts/${editingContactId}` : '/api/admin/contacts'), {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!data.ok) {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาดในการบันทึก contact' })
        return
      }

      if (!isEdit && data.data?.id) {
        setSelectedContactId(data.data.id)
      }
      pushToast({ title: isEdit ? 'อัปเดตข้อมูล contact สำเร็จ' : 'เพิ่ม contact สำเร็จ' })
      await fetchContacts()
      setContactDrawerOpen(false)
    } catch (error) {
      console.error('Failed to save contact:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึก contact' })
    }
  }

  const removeContact = async (id) => {
    const target = items.find((item) => item.id === id)
    try {
      const response = await fetch(apiUrl(`/api/admin/contacts/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!data.ok) {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาดในการลบ contact' })
        return
      }

      if (selectedContactId === id) {
        setSelectedContactId(null)
      }
      pushToast({ type: 'warning', title: 'ลบ contact แล้ว', description: target?.displayNameEn || '' })
      await fetchContacts()
    } catch (error) {
      console.error('Failed to delete contact:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบ contact' })
    }
  }

  const moveContact = async (id, direction) => {
    const index = sortedContacts.findIndex((item) => item.id === id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= sortedContacts.length) return

    const next = [...sortedContacts]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    const reordered = next.map((item, idx) => ({ ...item, sortOrder: idx + 1 }))
    setItems(reordered)

    try {
      const updates = reordered.map((item) => ({ id: item.id, sortOrder: item.sortOrder }))
      const response = await fetch(apiUrl('/api/admin/contacts/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.message || 'จัดลำดับข้อมูลไม่สำเร็จ')
      }
    } catch (error) {
      console.error('Failed to reorder contacts:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับ contact' })
      await fetchContacts()
    }
  }

  const openCreateChannel = () => {
    if (!selectedContact) return
    const nextSortOrder = selectedChannels.length ? selectedChannels[selectedChannels.length - 1].sortOrder + 10 : 10
    setEditingChannelId(null)
    setChannelErrors({})
    setChannelForm({
      channelType: 'email',
      labelTh: '',
      labelEn: '',
      value: '',
      url: '',
      isPrimary: false,
      sortOrder: nextSortOrder,
      isEnabled: true,
    })
    setChannelDrawerOpen(true)
  }

  const openEditChannel = (channel) => {
    if (!selectedContact) return
    setEditingChannelId(channel.id)
    setChannelErrors({})
    setChannelForm({
      channelType: channel.channelType,
      labelTh: channel.labelTh || '',
      labelEn: channel.labelEn || '',
      value: channel.value || '',
      url: channel.url || '',
      isPrimary: Boolean(channel.isPrimary),
      sortOrder: channel.sortOrder || 10,
      isEnabled: Boolean(channel.isEnabled),
    })
    setChannelDrawerOpen(true)
  }

  const validateChannel = () => {
    const next = {}
    if (!channelForm.channelType.trim()) next.channelType = 'กรุณาเลือก channel_type'
    if (!channelForm.value.trim()) next.value = 'กรุณากรอก value'
    if (Number(channelForm.sortOrder) < 0) next.sortOrder = 'sort_order ต้องมากกว่าหรือเท่ากับ 0'
    setChannelErrors(next)
    return Object.keys(next).length === 0
  }

  const saveChannel = async () => {
    if (!validateChannel()) return
    if (!selectedContact) return

    const payload = {
      channelType: channelForm.channelType.trim(),
      labelTh: channelForm.labelTh.trim() || null,
      labelEn: channelForm.labelEn.trim() || null,
      value: channelForm.value.trim(),
      url: channelForm.url.trim() || null,
      isPrimary: channelForm.isPrimary,
      sortOrder: Number(channelForm.sortOrder),
      isEnabled: channelForm.isEnabled,
    }

    try {
      const isEdit = Boolean(editingChannelId)
      const response = await fetch(
        apiUrl(
          isEdit
            ? `/api/admin/contacts/${selectedContact.id}/channels/${editingChannelId}`
            : `/api/admin/contacts/${selectedContact.id}/channels`,
        ),
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      )
      const data = await response.json()
      if (!data.ok) {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาดในการบันทึกช่องทาง' })
        return
      }

      pushToast({ title: isEdit ? 'อัปเดตช่องทางติดต่อสำเร็จ' : 'เพิ่มช่องทางติดต่อสำเร็จ' })
      await fetchContacts()
      setChannelDrawerOpen(false)
    } catch (error) {
      console.error('Failed to save channel:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการบันทึกช่องทาง' })
    }
  }

  const removeChannel = async (channelId) => {
    if (!selectedContact) return

    try {
      const response = await fetch(apiUrl(`/api/admin/contacts/${selectedContact.id}/channels/${channelId}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!data.ok) {
        pushToast({ type: 'error', title: data.message || 'เกิดข้อผิดพลาดในการลบช่องทาง' })
        return
      }

      pushToast({ type: 'warning', title: 'ลบช่องทางติดต่อแล้ว' })
      await fetchContacts()
    } catch (error) {
      console.error('Failed to delete channel:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการลบช่องทาง' })
    }
  }

  const moveChannel = async (channelId, direction) => {
    if (!selectedContact) return

    const index = selectedChannels.findIndex((item) => item.id === channelId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= selectedChannels.length) return

    const next = [...selectedChannels]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    const reordered = next.map((channel, idx) => ({ ...channel, sortOrder: (idx + 1) * 10 }))

    setItems((prev) =>
      prev.map((contact) =>
        contact.id === selectedContact.id
          ? {
              ...contact,
              channels: reordered,
            }
          : contact,
      ),
    )

    try {
      const updates = reordered.map((channel) => ({ id: channel.id, sortOrder: channel.sortOrder }))
      const response = await fetch(apiUrl(`/api/admin/contacts/${selectedContact.id}/channels/reorder`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      })
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.message || 'จัดลำดับช่องทางติดต่อไม่สำเร็จ')
      }
    } catch (error) {
      console.error('Failed to reorder channels:', error)
      pushToast({ type: 'error', title: 'เกิดข้อผิดพลาดในการจัดลำดับช่องทาง' })
      await fetchContacts()
    }
  }

  const channelTypeOptions = ['email', 'phone', 'line', 'facebook', 'instagram', 'linkedin', 'x', 'website', 'map', 'other']
  const contactCategoryOptions = [
    { value: 'event_inquiry', label: 'ติดต่อสอบถามรายละเอียดการจัดงาน' },
    { value: 'dataset_inquiry', label: 'ติดต่อสอบถามรายละเอียดชุดข้อมูล' },
    { value: 'tech_it', label: 'ฝ่ายเทคนิคและสารสนเทศ' },
    { value: 'facility', label: 'ฝ่ายอาคารสถานที่' },
  ]

  const getContactCategoryLabel = (category) => contactCategoryOptions.find((item) => item.value === category)?.label || '-'

  return (
    <div className="admin-ui-stack">
      <SectionHeading
        title="Static Content: Contacts"
        description="จัดการ content_contacts และ content_contact_channels ครบทุกคอลัมน์ พร้อมโฟลว์ที่แก้ไขง่าย"
        right={
          <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={openCreateContact}>
            <Plus size={15} />
            Add Contact
          </button>
        }
      />

      <AdminDataTable
        loading={loading}
        rows={sortedContacts}
        searchKeys={['contactCategory', 'displayNameTh', 'displayNameEn', 'roleTh', 'roleEn', 'organizationTh', 'organizationEn']}
        searchPlaceholder="ค้นหาประเภท / display name / role / organization"
        filters={[
          { label: 'ทั้งหมด', value: 'all', predicate: () => true },
          { label: 'Enabled', value: 'enabled', predicate: (row) => row.isEnabled },
          { label: 'Disabled', value: 'disabled', predicate: (row) => !row.isEnabled },
          { label: 'Featured', value: 'featured', predicate: (row) => row.isFeatured },
        ]}
        columns={[
          {
            key: 'displayName',
            label: 'Display Name / Role',
            render: (row) => (
              <div className="admin-ui-col-stack">
                <strong>{row.displayNameTh || '-'}</strong>
                <span>{row.displayNameEn || '-'}</span>
                <span>{row.roleTh || row.roleEn || '-'}</span>
              </div>
            ),
          },
          {
            key: 'contactCategory',
            label: 'Category',
            render: (row) => getContactCategoryLabel(row.contactCategory),
          },
          {
            key: 'organization',
            label: 'Organization / Department',
            render: (row) => (
              <div className="admin-ui-col-stack">
                <strong>{row.organizationTh || row.organizationEn || '-'}</strong>
                <span>{row.organizationEn || '-'}</span>
                <span>{row.departmentTh || row.departmentEn || '-'}</span>
              </div>
            ),
          },
          {
            key: 'channelsCount',
            label: 'Channels',
            render: (row) => (
              <span className="admin-ui-icon-text">
                <Contact size={13} />
                {(row.channels || []).length}
              </span>
            ),
          },
          {
            key: 'publishedAt',
            label: 'Published At',
            render: (row) => formatDateTime(row.publishedAt),
          },
          { key: 'sortOrder', label: 'Order' },
          {
            key: 'state',
            label: 'Flags',
            render: (row) => (
              <div className="admin-ui-col-stack">
                <StatusBadge status={row.isEnabled ? 'ENABLED' : 'DISABLED'} />
                {row.isFeatured ? <StatusBadge status="READY_TO_RESUBMIT" label="FEATURED" /> : <span className="admin-ui-text-muted">-</span>}
              </div>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="admin-ui-row-actions">
                <button type="button" onClick={() => moveContact(row.id, 'up')} aria-label="move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => moveContact(row.id, 'down')} aria-label="move down">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => openEditContact(row)} aria-label="edit">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => removeContact(row.id)} aria-label="delete">
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <article className="admin-ui-panel admin-ui-stack">
        <div className="admin-ui-section-head">
          <div>
            <h3>Step 1: Select Contact</h3>
            <p>เลือก contact ที่ต้องการ แล้วค่อยเพิ่มหรือแก้ไข channels ของ contact นั้น</p>
          </div>
        </div>
        <div className="admin-ui-contact-selector-row">
          <label htmlFor="channel-contact-select" className="admin-ui-label">
            Selected Contact
            <select
              id="channel-contact-select"
              value={selectedContact?.id || ''}
              onChange={(event) => setSelectedContactId(Number(event.target.value) || null)}
            >
              <option value="">เลือก contact</option>
              {sortedContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.id} - {contact.displayNameEn || contact.displayNameTh}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-ui-chip-row">
            {sortedContacts.map((contact) => (
              <button
                type="button"
                key={contact.id}
                className={`admin-ui-chip-btn ${selectedContact?.id === contact.id ? 'active' : ''}`}
                onClick={() => setSelectedContactId((prev) => (prev === contact.id ? null : contact.id))}
              >
                {contact.displayNameEn || contact.displayNameTh}
              </button>
            ))}
          </div>
        </div>
      </article>

      <article className="admin-ui-panel admin-ui-stack">
        <div className="admin-ui-section-head">
          <div>
            <h3>Contact Channels</h3>
            <p>
              {selectedContact
                ? `กำลังแก้ไขช่องทางของ ${selectedContact.displayNameTh || selectedContact.displayNameEn}`
                : 'เลือก contact เพื่อจัดการช่องทางการติดต่อ'}
            </p>
          </div>
          <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={openCreateChannel} disabled={!selectedContact}>
            <Plus size={15} />
            Add Channel
          </button>
        </div>

        {selectedContact ? (
          <AdminDataTable
            loading={loading}
            rows={selectedChannels.map((channel) => ({ ...channel, contactId: selectedContact.id }))}
            searchKeys={['channelType', 'labelTh', 'labelEn', 'value', 'url']}
            searchPlaceholder="ค้นหา channel type / label / value"
            filters={[
              { label: 'ทั้งหมด', value: 'all', predicate: () => true },
              { label: 'Enabled', value: 'enabled', predicate: (row) => row.isEnabled },
              { label: 'Disabled', value: 'disabled', predicate: (row) => !row.isEnabled },
              { label: 'Primary', value: 'primary', predicate: (row) => row.isPrimary },
            ]}
            columns={[
              {
                key: 'channelType',
                label: 'Type',
                render: (row) => <strong>{row.channelType}</strong>,
              },
              {
                key: 'labels',
                label: 'Label TH/EN',
                render: (row) => (
                  <div className="admin-ui-col-stack">
                    <span>{row.labelTh || '-'}</span>
                    <span>{row.labelEn || '-'}</span>
                  </div>
                ),
              },
              {
                key: 'value',
                label: 'Value / URL',
                render: (row) => (
                  <div className="admin-ui-col-stack">
                    <span>{row.value}</span>
                    {row.url ? (
                      <a className="admin-ui-link" href={row.url} target="_blank" rel="noreferrer">
                        <Globe size={13} />
                        {row.url}
                      </a>
                    ) : (
                      <span className="admin-ui-text-muted">-</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'flags',
                label: 'Flags',
                render: (row) => (
                  <div className="admin-ui-col-stack">
                    <StatusBadge status={row.isEnabled ? 'ENABLED' : 'DISABLED'} />
                    {row.isPrimary ? <StatusBadge status="APPROVED" label="PRIMARY" /> : <span className="admin-ui-text-muted">-</span>}
                  </div>
                ),
              },
              { key: 'sortOrder', label: 'Order' },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <div className="admin-ui-row-actions">
                    <button type="button" onClick={() => moveChannel(row.id, 'up')} aria-label="move up">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" onClick={() => moveChannel(row.id, 'down')} aria-label="move down">
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" onClick={() => openEditChannel(row)} aria-label="edit">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => removeChannel(row.id)} aria-label="delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <div className="admin-ui-table-empty">ยังไม่มี contact ให้กำหนดช่องทาง</div>
        )}
      </article>

      <DetailDrawer
        open={contactDrawerOpen}
        onClose={() => setContactDrawerOpen(false)}
        title={editingContactId ? 'Edit Contact' : 'Create Contact'}
        subtitle="ตั้งค่าทุกคอลัมน์ของ content_contacts"
      >
        <div className="admin-ui-form">
          <label htmlFor="contact-category">
            contact_category
            <select
              id="contact-category"
              value={contactForm.contactCategory}
              onChange={(event) => setContactForm((prev) => ({ ...prev, contactCategory: event.target.value }))}
            >
              {contactCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {contactErrors.contactCategory ? <small>{contactErrors.contactCategory}</small> : null}
          </label>

          <label htmlFor="contact-display-name-th">
            display_name_th *
            <input
              id="contact-display-name-th"
              value={contactForm.displayNameTh}
              onChange={(event) => setContactForm((prev) => ({ ...prev, displayNameTh: event.target.value }))}
            />
            {contactErrors.displayNameTh ? <small>{contactErrors.displayNameTh}</small> : null}
          </label>

          <label htmlFor="contact-display-name-en">
            display_name_en *
            <input
              id="contact-display-name-en"
              value={contactForm.displayNameEn}
              onChange={(event) => setContactForm((prev) => ({ ...prev, displayNameEn: event.target.value }))}
            />
            {contactErrors.displayNameEn ? <small>{contactErrors.displayNameEn}</small> : null}
          </label>

          <div className="admin-ui-two-col">
            <label htmlFor="contact-role-th">
              role_th
              <input
                id="contact-role-th"
                value={contactForm.roleTh}
                onChange={(event) => setContactForm((prev) => ({ ...prev, roleTh: event.target.value }))}
              />
            </label>
            <label htmlFor="contact-role-en">
              role_en
              <input
                id="contact-role-en"
                value={contactForm.roleEn}
                onChange={(event) => setContactForm((prev) => ({ ...prev, roleEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label htmlFor="contact-organization-th">
              organization_th
              <input
                id="contact-organization-th"
                value={contactForm.organizationTh}
                onChange={(event) => setContactForm((prev) => ({ ...prev, organizationTh: event.target.value }))}
              />
            </label>
            <label htmlFor="contact-organization-en">
              organization_en
              <input
                id="contact-organization-en"
                value={contactForm.organizationEn}
                onChange={(event) => setContactForm((prev) => ({ ...prev, organizationEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label htmlFor="contact-department-th">
              department_th
              <input
                id="contact-department-th"
                value={contactForm.departmentTh}
                onChange={(event) => setContactForm((prev) => ({ ...prev, departmentTh: event.target.value }))}
              />
            </label>
            <label htmlFor="contact-department-en">
              department_en
              <input
                id="contact-department-en"
                value={contactForm.departmentEn}
                onChange={(event) => setContactForm((prev) => ({ ...prev, departmentEn: event.target.value }))}
              />
            </label>
          </div>

          <label htmlFor="contact-bio-th">
            bio_th
            <textarea
              id="contact-bio-th"
              rows={3}
              value={contactForm.bioTh}
              onChange={(event) => setContactForm((prev) => ({ ...prev, bioTh: event.target.value }))}
            />
          </label>

          <label htmlFor="contact-bio-en">
            bio_en
            <textarea
              id="contact-bio-en"
              rows={3}
              value={contactForm.bioEn}
              onChange={(event) => setContactForm((prev) => ({ ...prev, bioEn: event.target.value }))}
            />
          </label>

          <label htmlFor="contact-avatar-url">
            avatar_url
            <input
              id="contact-avatar-url"
              value={contactForm.avatarUrl}
              onChange={(event) => setContactForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
            />
          </label>

          <div className="admin-ui-two-col">
            <label htmlFor="contact-avatar-alt-th">
              avatar_alt_th
              <input
                id="contact-avatar-alt-th"
                value={contactForm.avatarAltTh}
                onChange={(event) => setContactForm((prev) => ({ ...prev, avatarAltTh: event.target.value }))}
              />
            </label>
            <label htmlFor="contact-avatar-alt-en">
              avatar_alt_en
              <input
                id="contact-avatar-alt-en"
                value={contactForm.avatarAltEn}
                onChange={(event) => setContactForm((prev) => ({ ...prev, avatarAltEn: event.target.value }))}
              />
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label htmlFor="contact-sort-order">
              sort_order
              <input
                id="contact-sort-order"
                type="number"
                min={1}
                value={contactForm.sortOrder}
                onChange={(event) => setContactForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              />
              {contactErrors.sortOrder ? <small>{contactErrors.sortOrder}</small> : null}
            </label>
            <label htmlFor="contact-published-at">
              published_at
              <input
                id="contact-published-at"
                type="datetime-local"
                value={contactForm.publishedAt}
                onChange={(event) => setContactForm((prev) => ({ ...prev, publishedAt: event.target.value }))}
              />
            </label>
          </div>

          <div className="admin-ui-two-col">
            <label className="admin-ui-check">
              <input
                type="checkbox"
                checked={contactForm.isFeatured}
                onChange={(event) => setContactForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
              />
              <span>is_featured</span>
            </label>
            <label className="admin-ui-check">
              <input
                type="checkbox"
                checked={contactForm.isEnabled}
                onChange={(event) => setContactForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span>is_enabled</span>
            </label>
          </div>

          <div className="admin-ui-form-actions">
            <button type="button" className="admin-ui-btn" onClick={() => setContactDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={saveContact}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={channelDrawerOpen}
        onClose={() => setChannelDrawerOpen(false)}
        title={editingChannelId ? 'Edit Contact Channel' : 'Create Contact Channel'}
        subtitle={`ตั้งค่าช่องทางของ ${selectedContact?.displayNameEn || selectedContact?.displayNameTh || '-'}`}
      >
        <div className="admin-ui-form">
          <label htmlFor="channel-type">
            channel_type *
            <select
              id="channel-type"
              value={channelForm.channelType}
              onChange={(event) => setChannelForm((prev) => ({ ...prev, channelType: event.target.value }))}
            >
              {channelTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {channelErrors.channelType ? <small>{channelErrors.channelType}</small> : null}
          </label>

          <div className="admin-ui-two-col">
            <label htmlFor="channel-label-th">
              label_th
              <input
                id="channel-label-th"
                value={channelForm.labelTh}
                onChange={(event) => setChannelForm((prev) => ({ ...prev, labelTh: event.target.value }))}
              />
            </label>
            <label htmlFor="channel-label-en">
              label_en
              <input
                id="channel-label-en"
                value={channelForm.labelEn}
                onChange={(event) => setChannelForm((prev) => ({ ...prev, labelEn: event.target.value }))}
              />
            </label>
          </div>

          <label htmlFor="channel-value">
            value *
            <input
              id="channel-value"
              value={channelForm.value}
              onChange={(event) => setChannelForm((prev) => ({ ...prev, value: event.target.value }))}
            />
            {channelErrors.value ? <small>{channelErrors.value}</small> : null}
          </label>

          <label htmlFor="channel-url">
            url
            <input
              id="channel-url"
              value={channelForm.url}
              onChange={(event) => setChannelForm((prev) => ({ ...prev, url: event.target.value }))}
            />
          </label>

          <label htmlFor="channel-sort-order">
            sort_order
            <input
              id="channel-sort-order"
              type="number"
              min={0}
              value={channelForm.sortOrder}
              onChange={(event) => setChannelForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
            />
            {channelErrors.sortOrder ? <small>{channelErrors.sortOrder}</small> : null}
          </label>

          <div className="admin-ui-two-col">
            <label className="admin-ui-check">
              <input
                type="checkbox"
                checked={channelForm.isPrimary}
                onChange={(event) => setChannelForm((prev) => ({ ...prev, isPrimary: event.target.checked }))}
              />
              <span>is_primary</span>
            </label>
            <label className="admin-ui-check">
              <input
                type="checkbox"
                checked={channelForm.isEnabled}
                onChange={(event) => setChannelForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
              />
              <span>is_enabled</span>
            </label>
          </div>

          <div className="admin-ui-panel">
            <h3>Preview</h3>
            <p className="admin-ui-text-muted">{selectedContact?.displayNameEn || selectedContact?.displayNameTh || '-'}</p>
            <div className="admin-ui-col-stack">
              <span>{channelForm.channelType}</span>
              <span>{channelForm.value || '-'}</span>
              <span>{channelForm.url || '-'}</span>
            </div>
          </div>

          <div className="admin-ui-form-actions">
            <button type="button" className="admin-ui-btn" onClick={() => setChannelDrawerOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={saveChannel}>
              <Save size={14} />
              บันทึก
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}
