import { useCallback, useEffect, useState } from 'react'
import { Mail, Save } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'

export default function NotificationSettingsPage() {
  const { pushToast } = useAdminToast()
  const [settings, setSettings] = useState([])
  const [recipients, setRecipients] = useState([])
  const [teamOptions, setTeamOptions] = useState([])
  const [eventDrafts, setEventDrafts] = useState({})
  const [customEmail, setCustomEmail] = useState({ teamId: '', subject: '', message: '' })
  const [burstTestRecipientEmail, setBurstTestRecipientEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendingBurstTest, setSendingBurstTest] = useState(false)
  const [updatingRecipientUserId, setUpdatingRecipientUserId] = useState(null)

  const loadSelectionTeamOptions = useCallback(async () => {
    const statuses = ['submitted', 'passed', 'failed', 'confirmed', 'not_joined']
    const responses = await Promise.all(
      statuses.map(async (status) => {
        const res = await fetch(apiUrl(`/api/admin/selection/teams?status=${status}`), { credentials: 'include' })
        const payload = await res.json()
        if (!res.ok || !payload?.ok) return []
        return payload.data || []
      }),
    )

    const dedup = new Map()
    responses.flat().forEach((row) => {
      if (!row?.team_id || dedup.has(row.team_id)) return
      dedup.set(row.team_id, {
        teamId: row.team_id,
        label: `${row.team_name_th || row.team_name_en} [${row.team_code}]`,
      })
    })

    setTeamOptions(Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label, 'th')))
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [settingsRes, recipientsRes] = await Promise.all([
        fetch(apiUrl('/api/notifications/admin/settings'), { credentials: 'include' }),
        fetch(apiUrl('/api/notifications/admin/recipients'), { credentials: 'include' }),
      ])
      const settingsPayload = await settingsRes.json()
      const recipientsPayload = await recipientsRes.json()
      if (!settingsRes.ok || !settingsPayload?.ok) throw new Error(settingsPayload?.message || 'โหลดการตั้งค่าไม่สำเร็จ')
      if (!recipientsRes.ok || !recipientsPayload?.ok) throw new Error(recipientsPayload?.message || 'โหลดรายชื่อผู้รับไม่สำเร็จ')

      const settingsRows = settingsPayload.data || []
      setSettings(settingsRows)
      setRecipients(recipientsPayload.data || [])
      setEventDrafts(
        settingsRows.reduce((acc, row) => {
          acc[row.eventCode] = {
            customSubject: row.customSubject || '',
            customMessage: row.customMessage || '',
          }
          return acc
        }, {}),
      )
      await loadSelectionTeamOptions()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'โหลด notification settings ไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [loadSelectionTeamOptions, pushToast])

  useEffect(() => {
    load()
  }, [load])

  const updateSetting = async (eventCode, patch, successTitle = 'บันทึกการตั้งค่าแจ้งเตือนสำเร็จ') => {
    try {
      const res = await fetch(apiUrl(`/api/notifications/admin/settings/${eventCode}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'อัปเดตข้อมูลไม่สำเร็จ')
      pushToast({ title: successTitle })
      load()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'บันทึกไม่สำเร็จ' })
    }
  }

  const toggleRecipient = async (recipient) => {
    try {
      setUpdatingRecipientUserId(recipient.userId)
      const res = await fetch(apiUrl(`/api/notifications/admin/recipients/${recipient.userId}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !recipient.enabled }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'อัปเดตรายชื่อผู้รับไม่สำเร็จ')
      setRecipients((prev) => prev.map((row) => (row.userId === recipient.userId ? payload.data : row)))
      pushToast({ title: 'อัปเดตรายชื่อผู้รับแจ้งเตือนสำเร็จ' })
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'อัปเดตผู้รับแจ้งเตือนไม่สำเร็จ' })
    } finally {
      setUpdatingRecipientUserId(null)
    }
  }

  const saveEventMessage = (eventCode) => {
    const draft = eventDrafts[eventCode] || { customSubject: '', customMessage: '' }
    updateSetting(
      eventCode,
      {
        customSubject: draft.customSubject?.trim() || null,
        customMessage: draft.customMessage?.trim() || null,
      },
      'บันทึกข้อความ template สำเร็จ',
    )
  }

  const sendCustomEmail = async () => {
    if (!customEmail.teamId || !customEmail.subject.trim() || !customEmail.message.trim()) {
      pushToast({ type: 'error', title: 'กรุณาเลือกทีม หัวข้อ และข้อความให้ครบ' })
      return
    }

    try {
      setSending(true)
      const res = await fetch(apiUrl('/api/notifications/admin/custom-email'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: Number(customEmail.teamId),
          subject: customEmail.subject,
          message: customEmail.message,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ส่งข้อมูลไม่สำเร็จ')
      pushToast({ title: `ส่งสำเร็จ (sent=${payload.data?.sent || 0}, failed=${payload.data?.failed || 0}, skipped=${payload.data?.skipped || 0})` })
      setCustomEmail({ teamId: '', subject: '', message: '' })
      load()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'ส่งอีเมลไม่สำเร็จ' })
    } finally {
      setSending(false)
    }
  }

  const sendBurstTestEmail = async () => {
    const email = burstTestRecipientEmail.trim()
    if (!email) {
      pushToast({ type: 'error', title: 'กรุณากรอกอีเมลปลายทางสำหรับทดสอบ' })
      return
    }

    try {
      setSendingBurstTest(true)
      const res = await fetch(apiUrl('/api/notifications/admin/test-burst-email'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: email }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ส่งอีเมลทดสอบแบบชุดไม่สำเร็จ')
      pushToast({
        title: `Burst test done (total=${payload.data?.total || 0}, sent=${payload.data?.sent || 0}, queued=${payload.data?.queued || 0}, failed=${payload.data?.failed || 0})`,
      })
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'ส่ง burst test ไม่สำเร็จ' })
    } finally {
      setSendingBurstTest(false)
    }
  }

  return (
    <div className="admin-ui-stack">
      <PageHeader title="การแจ้งเตือน" />

      <article className="admin-ui-panel">
        <h3>รายชื่อแอดมินที่รับแจ้งเตือน</h3>
        <AdminDataTable
          rows={recipients.map((recipient) => ({ ...recipient, id: recipient.userId }))}
          loading={loading}
          searchKeys={['displayName', 'userName', 'email']}
          searchPlaceholder="ค้นหา admin จากชื่อ/นามแฝง (Alias)/email"
          columns={[
            { key: 'displayName', label: 'ชื่อ' },
            { key: 'userName', label: 'นามแฝง (Alias)' },
            {
              key: 'email',
              label: 'อีเมล',
              render: (row) => row.email || '-',
            },
            {
              key: 'enabled',
              label: 'รับการแจ้งเตือน',
              render: (row) => String(row.enabled),
            },
            {
              key: 'actions',
              label: 'การจัดการ',
              render: (row) => (
                <button
                  type="button"
                  className="admin-ui-mini-btn"
                  disabled={updatingRecipientUserId === row.userId}
                  onClick={() => toggleRecipient(row)}
                >
                  {row.enabled ? 'ปิดรับ' : 'เปิดรับ'}
                </button>
              ),
            },
          ]}
        />
      </article>

      <AdminDataTable
        rows={settings.map((setting) => ({ ...setting, id: setting.eventCode }))}
        loading={loading}
        searchKeys={['eventCode']}
        searchPlaceholder="ค้นหา event code"
        columns={[
            { key: 'eventCode', label: 'เหตุการณ์' },
          {
            key: 'isEmailEnabled',
            label: 'ส่งอีเมล',
            render: (row) => String(row.isEmailEnabled),
          },
          {
            key: 'customSubject',
            label: 'หัวข้อกำหนดเอง',
            render: (row) => row.customSubject || '-',
          },
          {
            key: 'actions',
            label: 'การจัดการ',
            render: (row) => (
              <div className="admin-ui-inline-actions">
                <button type="button" className="admin-ui-mini-btn" onClick={() => updateSetting(row.eventCode, { isEmailEnabled: !row.isEmailEnabled })}>
                  เปิด/ปิดอีเมล
                </button>
              </div>
            ),
          },
        ]}
      />

      <article className="admin-ui-panel">
        <h3>ข้อความกำหนดเองรายเหตุการณ์</h3>
        <div className="admin-ui-form">
          {settings.map((row) => (
            <div key={row.eventCode} className="admin-ui-panel" style={{ marginBottom: 12 }}>
              <strong>{row.eventCode}</strong>
              <label>
                หัวข้อกำหนดเอง
                <input
                  value={eventDrafts[row.eventCode]?.customSubject || ''}
                  onChange={(event) =>
                    setEventDrafts((prev) => ({
                      ...prev,
                      [row.eventCode]: {
                        customSubject: event.target.value,
                        customMessage: prev[row.eventCode]?.customMessage || '',
                      },
                    }))
                  }
                  placeholder="ถ้าไม่กรอก จะใช้หัวข้อมาตรฐานของระบบ"
                />
              </label>
              <label>
                ข้อความกำหนดเอง
                <textarea
                  rows={3}
                  value={eventDrafts[row.eventCode]?.customMessage || ''}
                  onChange={(event) =>
                    setEventDrafts((prev) => ({
                      ...prev,
                      [row.eventCode]: {
                        customSubject: prev[row.eventCode]?.customSubject || '',
                        customMessage: event.target.value,
                      },
                    }))
                  }
                  placeholder="รองรับตัวแปร เช่น {{team_name}}, {{team_code}}, {{member_names}}, {{actor_name}}"
                />
              </label>
              <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={() => saveEventMessage(row.eventCode)}>
                <Save size={14} />
                บันทึกข้อความ
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="admin-ui-panel">
        <h3>ส่งอีเมลแบบกำหนดเองให้ทีม</h3>
        <div className="admin-ui-form">
          <label>
            ทีม
            <select
              value={customEmail.teamId}
              onChange={(event) => setCustomEmail((prev) => ({ ...prev, teamId: event.target.value }))}
            >
              <option value="">เลือกทีม</option>
              {teamOptions.map((item) => (
                <option key={item.teamId} value={item.teamId}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            หัวข้อ
            <input
              value={customEmail.subject}
              onChange={(event) => setCustomEmail((prev) => ({ ...prev, subject: event.target.value }))}
              placeholder="หัวข้ออีเมล"
            />
          </label>
          <label>
            ข้อความ
            <textarea
              rows={5}
              value={customEmail.message}
              onChange={(event) => setCustomEmail((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="เนื้อความที่จะส่งถึงสมาชิกทีมที่เลือก"
            />
          </label>
          <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={sending} onClick={sendCustomEmail}>
            <Mail size={14} />
            {sending ? 'กำลังส่ง...' : 'ส่งอีเมล'}
          </button>
        </div>
      </article>

      <article className="admin-ui-panel">
        <h3>ทดสอบส่งอีเมลแบบชุด (110 ฉบับ)</h3>
        <div className="admin-ui-form">
          <label>
            อีเมลผู้รับ
            <input
              type="email"
              value={burstTestRecipientEmail}
              onChange={(event) => setBurstTestRecipientEmail(event.target.value)}
              placeholder="example@domain.com"
            />
          </label>
          <button
            type="button"
            className="admin-ui-btn admin-ui-btn-primary"
            disabled={sendingBurstTest || !burstTestRecipientEmail.trim()}
            onClick={sendBurstTestEmail}
          >
            <Mail size={14} />
            {sendingBurstTest ? 'กำลังส่ง 110 ฉบับ...' : 'ส่งอีเมลทดสอบ 110 ฉบับ'}
          </button>
        </div>
      </article>
    </div>
  )
}
