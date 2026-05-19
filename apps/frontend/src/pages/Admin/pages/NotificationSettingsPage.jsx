import { useCallback, useEffect, useState } from 'react'
import { Bell, Mail, Save } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'

export default function NotificationSettingsPage() {
  const { pushToast } = useAdminToast()
  const [settings, setSettings] = useState([])
  const [recipients, setRecipients] = useState([])
  const [teamOptions, setTeamOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const [eventDrafts, setEventDrafts] = useState({})
  const [customEmail, setCustomEmail] = useState({ teamId: '', subject: '', message: '' })
  const [inAppMessage, setInAppMessage] = useState({ target: 'all', userIds: [], subject: '', message: '' })
  const [orientationInApp, setOrientationInApp] = useState({
    target: 'selected',
    userIds: [],
    subject: 'แจ้งสิทธิ์เข้าร่วม Orientation Day (Online)',
    orientationLink: 'https://www.facebook.com/bdihackathon',
  })
  const [burstTestRecipientEmail, setBurstTestRecipientEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendingInApp, setSendingInApp] = useState(false)
  const [sendingOrientationInApp, setSendingOrientationInApp] = useState(false)
  const [sendingBurstTest, setSendingBurstTest] = useState(false)
  const [updatingRecipientUserId, setUpdatingRecipientUserId] = useState(null)

  const loadSelectionTeamOptions = useCallback(async () => {
    const dedup = new Map()
    const res = await fetch(apiUrl('/api/admin/selection/teams'), { credentials: 'include' })
    const payload = await res.json()
    if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'โหลดรายชื่อทีมไม่สำเร็จ')

    ;(payload.data || []).forEach((row) => {
      if (!row?.team_id || dedup.has(row.team_id)) return
      dedup.set(row.team_id, {
        teamId: row.team_id,
        label: `${row.team_name_th || '-'} [${row.team_code}] (${row.status || '-'})`,
      })
    })

    setTeamOptions(Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label, 'th')))
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [settingsRes, recipientsRes, usersRes] = await Promise.all([
        fetch(apiUrl('/api/notifications/admin/settings'), { credentials: 'include' }),
        fetch(apiUrl('/api/notifications/admin/recipients'), { credentials: 'include' }),
        fetch(apiUrl('/api/notifications/admin/users'), { credentials: 'include' }),
      ])
      const settingsPayload = await settingsRes.json()
      const recipientsPayload = await recipientsRes.json()
      const usersPayload = await usersRes.json()
      if (!settingsRes.ok || !settingsPayload?.ok) throw new Error(settingsPayload?.message || 'โหลดการตั้งค่าไม่สำเร็จ')
      if (!recipientsRes.ok || !recipientsPayload?.ok) throw new Error(recipientsPayload?.message || 'โหลดรายชื่อผู้รับไม่สำเร็จ')
      if (!usersRes.ok || !usersPayload?.ok) throw new Error(usersPayload?.message || 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ')

      const settingsRows = settingsPayload.data || []
      setSettings(settingsRows)
      setRecipients(recipientsPayload.data || [])
      setUserOptions(usersPayload.data || [])
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

  const sendInAppNotification = async () => {
    const subject = inAppMessage.subject.trim()
    const message = inAppMessage.message.trim()
    if (!subject || !message) {
      pushToast({ type: 'error', title: 'กรุณากรอกหัวข้อและข้อความให้ครบ' })
      return
    }
    if (inAppMessage.target === 'selected' && inAppMessage.userIds.length === 0) {
      pushToast({ type: 'error', title: 'กรุณาเลือกผู้รับอย่างน้อยหนึ่งคน' })
      return
    }

    try {
      setSendingInApp(true)
      const res = await fetch(apiUrl('/api/notifications/admin/in-app'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: inAppMessage.target,
          userIds: inAppMessage.userIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0),
          subject,
          message,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ส่งการแจ้งเตือนในเว็บไม่สำเร็จ')
      pushToast({ title: `ส่งการแจ้งเตือนในเว็บสำเร็จ (${payload.data?.totalRecipients || 0} คน)` })
      setInAppMessage({ target: 'all', userIds: [], subject: '', message: '' })
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'ส่งการแจ้งเตือนในเว็บไม่สำเร็จ' })
    } finally {
      setSendingInApp(false)
    }
  }

  const sendOrientationInApp = async () => {
    const subject = orientationInApp.subject.trim()
    const orientationLink = orientationInApp.orientationLink.trim()
    if (!subject || !orientationLink) {
      pushToast({ type: 'error', title: 'กรุณากรอกหัวข้อและลิงก์ Orientation Day' })
      return
    }
    if (orientationInApp.target === 'selected' && orientationInApp.userIds.length === 0) {
      pushToast({ type: 'error', title: 'กรุณาเลือกผู้รับอย่างน้อยหนึ่งคน' })
      return
    }

    try {
      setSendingOrientationInApp(true)
      const res = await fetch(apiUrl('/api/notifications/admin/orientation-in-app'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: orientationInApp.target,
          userIds: orientationInApp.userIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0),
          subject,
          orientationLink,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ส่งการแจ้งเตือน Orientation Day ไม่สำเร็จ')
      pushToast({ title: `ส่งการแจ้งเตือน Orientation Day สำเร็จ (${payload.data?.totalRecipients || 0} คน)` })
      setOrientationInApp((prev) => ({ ...prev, userIds: [] }))
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'ส่งการแจ้งเตือน Orientation Day ไม่สำเร็จ' })
    } finally {
      setSendingOrientationInApp(false)
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
        <h3>ส่งการแจ้งเตือนในเว็บ (Custom In-App Notifications)</h3>
        <div className="admin-ui-form">
          <label>
            กลุ่มผู้รับ
            <select
              value={inAppMessage.target}
              onChange={(event) => setInAppMessage((prev) => ({ ...prev, target: event.target.value, userIds: [] }))}
            >
              <option value="all">ผู้ใช้ทั้งหมด ({userOptions.length} คน)</option>
              <option value="selected">เลือกผู้ใช้บางคน</option>
            </select>
          </label>
          {inAppMessage.target === 'selected' && (
            <label>
              ผู้รับ
              <select
                multiple
                size={Math.min(10, Math.max(4, userOptions.length || 4))}
                value={inAppMessage.userIds.map(String)}
                onChange={(event) => {
                  const values = Array.from(event.target.selectedOptions).map((option) => option.value)
                  setInAppMessage((prev) => ({ ...prev, userIds: values }))
                }}
              >
                {userOptions.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.displayName || user.userName} ({user.userName}){user.email ? ` - ${user.email}` : ''}
                  </option>
                ))}
              </select>
              <span className="admin-ui-text-muted">เลือกแล้ว {inAppMessage.userIds.length} คน</span>
            </label>
          )}
          <label>
            หัวข้อ
            <input
              value={inAppMessage.subject}
              onChange={(event) => setInAppMessage((prev) => ({ ...prev, subject: event.target.value }))}
              placeholder="หัวข้อที่จะแสดงใน Notification Center"
            />
          </label>
          <label>
            ข้อความ
            <textarea
              rows={5}
              value={inAppMessage.message}
              onChange={(event) => setInAppMessage((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="ข้อความที่จะส่งเป็น in-app notification"
            />
          </label>
          <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={sendingInApp} onClick={sendInAppNotification}>
            <Bell size={14} />
            {sendingInApp ? 'กำลังส่ง...' : 'ส่งการแจ้งเตือนในเว็บ'}
          </button>
        </div>
      </article>

      <article className="admin-ui-panel">
        <h3>ส่งการแจ้งเตือน Orientation Day (Online) ส่งเฉพาะ In-App Notifications</h3>
        <div className="admin-ui-form">
          <label>
            กลุ่มผู้รับ
            <select
              value={orientationInApp.target}
              onChange={(event) => setOrientationInApp((prev) => ({ ...prev, target: event.target.value, userIds: [] }))}
            >
              <option value="all">ผู้ใช้ทั้งหมด ({userOptions.length} คน)</option>
              <option value="selected">เลือกผู้ใช้บางคน</option>
            </select>
          </label>
          {orientationInApp.target === 'selected' && (
            <label>
              ผู้รับ
              <select
                multiple
                size={Math.min(10, Math.max(4, userOptions.length || 4))}
                value={orientationInApp.userIds.map(String)}
                onChange={(event) => {
                  const values = Array.from(event.target.selectedOptions).map((option) => option.value)
                  setOrientationInApp((prev) => ({ ...prev, userIds: values }))
                }}
              >
                {userOptions.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.displayName || user.userName} ({user.userName}){user.email ? ` - ${user.email}` : ''}
                  </option>
                ))}
              </select>
              <span className="admin-ui-text-muted">เลือกแล้ว {orientationInApp.userIds.length} คน</span>
            </label>
          )}
          <label>
            หัวข้อ
            <input
              value={orientationInApp.subject}
              onChange={(event) => setOrientationInApp((prev) => ({ ...prev, subject: event.target.value }))}
              placeholder="หัวข้อที่จะแสดงใน Notification Center"
            />
          </label>
          <label>
            ลิงก์ Orientation Day
            <input
              value={orientationInApp.orientationLink}
              onChange={(event) => setOrientationInApp((prev) => ({ ...prev, orientationLink: event.target.value }))}
              placeholder="https://www.facebook.com/bdihackathon"
            />
          </label>
          <div className="admin-ui-panel" style={{ marginBottom: 0 }}>
            <strong>Template ที่จะส่ง</strong>
            <p className="admin-ui-text-muted">
              ระบบจะแทนชื่อผู้รับในรูปแบบ “เรียนคุณ {'{{first_name}}'} {'{{last_name}}'}” และสร้างเป็น in-app notification เท่านั้น
            </p>
          </div>
          <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={sendingOrientationInApp} onClick={sendOrientationInApp}>
            <Bell size={14} />
            {sendingOrientationInApp ? 'กำลังส่ง...' : 'ส่งการแจ้งเตือน Orientation Day'}
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
