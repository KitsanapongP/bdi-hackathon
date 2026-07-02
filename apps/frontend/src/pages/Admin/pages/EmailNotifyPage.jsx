import { useMemo, useState } from 'react'
import { Mail, Search, Send } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import { renderAnnouncementPreview, getTablePreviewWarnings } from '../../../lib/announcementPreview'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'

// แยกอีเมลจากข้อความที่วางเข้ามา: ตัดด้วยขึ้นบรรทัดใหม่/จุลภาค/อัฒภาค/ช่องว่าง แล้ว trim + lowercase + dedupe
function parseEmails(raw) {
  const seen = new Set()
  const list = []
  String(raw || '')
    .split(/[\s,;]+/)
    .forEach((token) => {
      const email = token.trim().toLowerCase()
      if (!email || seen.has(email)) return
      seen.add(email)
      list.push(email)
    })
  return list
}

export default function EmailNotifyPage() {
  const { pushToast } = useAdminToast()
  const [rawEmails, setRawEmails] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [matchResult, setMatchResult] = useState(null)
  const [matchedRawSnapshot, setMatchedRawSnapshot] = useState('')
  const [checking, setChecking] = useState(false)
  const [sending, setSending] = useState(false)
  const [showUnmatched, setShowUnmatched] = useState(false)

  const parsedEmails = useMemo(() => parseEmails(rawEmails), [rawEmails])
  const previewNodes = useMemo(() => renderAnnouncementPreview(message), [message])
  const tablePreviewWarnings = useMemo(() => getTablePreviewWarnings(message), [message])

  // ผลตรวจสอบถือว่า stale ถ้าแก้รายชื่ออีเมลหลังกดตรวจสอบ (ต้องกดตรวจใหม่ก่อนส่ง)
  const matchStale = matchResult !== null && rawEmails !== matchedRawSnapshot
  const matchedUserIds = matchResult?.matched?.map((m) => m.userId) ?? []
  const canSend = !matchStale && matchedUserIds.length > 0 && subject.trim() && message.trim()

  const checkEmails = async () => {
    if (parsedEmails.length === 0) {
      pushToast({ variant: 'danger', title: 'กรุณากรอกอีเมลอย่างน้อยหนึ่งรายการ' })
      return
    }
    try {
      setChecking(true)
      const res = await fetch(apiUrl('/api/notifications/admin/match-emails'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: parsedEmails }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ตรวจสอบอีเมลไม่สำเร็จ')
      setMatchResult(payload.data)
      setMatchedRawSnapshot(rawEmails)
      setShowUnmatched(false)
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'ตรวจสอบอีเมลไม่สำเร็จ' })
    } finally {
      setChecking(false)
    }
  }

  const sendNotification = async () => {
    const trimmedSubject = subject.trim()
    const trimmedMessage = message.trim()
    if (!trimmedSubject || !trimmedMessage) {
      pushToast({ variant: 'danger', title: 'กรุณากรอกหัวข้อและข้อความให้ครบ' })
      return
    }
    if (matchStale) {
      pushToast({ variant: 'warning', title: 'รายชื่ออีเมลถูกแก้ไข กรุณากดตรวจสอบรายชื่อใหม่ก่อนส่ง' })
      return
    }
    if (matchedUserIds.length === 0) {
      pushToast({ variant: 'danger', title: 'ไม่มีผู้รับที่ตรงกับระบบ' })
      return
    }

    try {
      setSending(true)
      const res = await fetch(apiUrl('/api/notifications/admin/announcements'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'users',
          userTarget: 'selected',
          userIds: matchedUserIds,
          channels: { email: false, inApp: true },
          subject: trimmedSubject,
          message: trimmedMessage,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ส่งแจ้งเตือนไม่สำเร็จ')
      const d = payload.data || {}
      pushToast({
        variant: 'success',
        title: 'ส่งแจ้งเตือนในเว็บสำเร็จ',
        description: `in-app=${d.inAppSent || 0} | recipients=${d.totalRecipients || 0}`,
      })
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'ส่งแจ้งเตือนไม่สำเร็จ' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="admin-ui-stack">
      <PageHeader title="ส่งแจ้งเตือนตามรายชื่ออีเมล" />

      <article className="admin-ui-panel" style={{ background: 'var(--admin-ui-surface-soft)' }}>
        <p className="admin-ui-text-muted" style={{ margin: 0 }}>
          วางรายชื่ออีเมล (คั่นด้วยขึ้นบรรทัดใหม่ จุลภาค หรือช่องว่าง) ระบบจะจับคู่กับอีเมลโปรไฟล์ของผู้ใช้ในระบบ
          แล้วส่งเป็น<strong>ข้อความในเว็บ (กระดิ่งแจ้งเตือน)</strong> ให้ผู้รับที่จับคู่ได้ — <strong>ไม่ส่งอีเมลจริง (SMTP)</strong>.
          ทำ<strong>ตัวหนา</strong>ได้โดยครอบข้อความด้วย <code>**...**</code> ใส่ลิงก์ http(s) ได้ตรง ๆ
          และวางตารางจาก Excel/Google Sheets ในช่องข้อความได้ (ระบบแปลงเป็นตารางให้อัตโนมัติ).
        </p>
      </article>

      <article className="admin-ui-panel">
        <h3>1. รายชื่ออีเมลผู้รับ</h3>
        <div className="admin-ui-form">
          <label>
            อีเมล (วางได้พร้อมกันหลายรายการ)
            <textarea
              rows={8}
              value={rawEmails}
              onChange={(event) => setRawEmails(event.target.value)}
              placeholder={'name1@example.com\nname2@example.com, name3@example.com'}
            />
            <span className="admin-ui-text-muted">พบอีเมล {parsedEmails.length} รายการ (ไม่ซ้ำ)</span>
          </label>

          <button type="button" className="admin-ui-btn" disabled={checking || parsedEmails.length === 0} onClick={checkEmails}>
            <Search size={14} />
            {checking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบรายชื่อ'}
          </button>

          {matchResult && (
            <div className="admin-ui-form-field">
              {matchStale && (
                <p style={{ margin: '0 0 8px', color: '#b45309', fontSize: '0.82rem' }}>
                  ⚠️ รายชื่ออีเมลถูกแก้ไขหลังการตรวจสอบ — กรุณากดตรวจสอบรายชื่อใหม่ก่อนส่ง
                </p>
              )}
              <div className="admin-ann-summary">
                <span className="admin-ann-chip" style={{ background: 'color-mix(in srgb, #16a34a 15%, transparent)' }}>
                  ✅ ตรงกับระบบ {matchResult.counts.matched} คน
                </span>
                <span className="admin-ann-chip" style={{ background: 'color-mix(in srgb, #dc2626 12%, transparent)' }}>
                  ❌ ไม่พบในระบบ {matchResult.counts.unmatched}
                </span>
                {matchResult.counts.invalid > 0 && (
                  <span className="admin-ann-chip" style={{ background: 'color-mix(in srgb, #b45309 15%, transparent)' }}>
                    ⚠️ รูปแบบไม่ถูกต้อง {matchResult.counts.invalid}
                  </span>
                )}
                <span className="admin-ui-text-muted" style={{ fontSize: '0.82rem' }}>จากทั้งหมด {matchResult.counts.total} อีเมล</span>
              </div>

              {matchResult.matched.length > 0 && (
                <div style={{ marginTop: 12, maxHeight: 260, overflowY: 'auto', border: '1px solid var(--admin-ui-border, #dbe3ef)', borderRadius: 10 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--admin-ui-border, #dbe3ef)' }}>อีเมล</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--admin-ui-border, #dbe3ef)' }}>ชื่อผู้รับ</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--admin-ui-border, #dbe3ef)' }}>username</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchResult.matched.map((m) => (
                        <tr key={m.userId}>
                          <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--admin-ui-border, #eef2f8)' }}>{m.email}</td>
                          <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--admin-ui-border, #eef2f8)' }}>{m.displayName}</td>
                          <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--admin-ui-border, #eef2f8)' }}>{m.userName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(matchResult.unmatchedEmails.length > 0 || matchResult.invalidEmails.length > 0) && (
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="admin-ui-mini-btn" onClick={() => setShowUnmatched((prev) => !prev)}>
                    {showUnmatched ? 'ซ่อน' : 'ดู'}อีเมลที่ไม่พบ / รูปแบบไม่ถูกต้อง
                  </button>
                  {showUnmatched && (
                    <div style={{ marginTop: 8, fontSize: '0.82rem' }}>
                      {matchResult.unmatchedEmails.length > 0 && (
                        <p style={{ margin: '0 0 6px' }}>
                          <strong>ไม่พบในระบบ:</strong> {matchResult.unmatchedEmails.join(', ')}
                        </p>
                      )}
                      {matchResult.invalidEmails.length > 0 && (
                        <p style={{ margin: 0, color: '#b45309' }}>
                          <strong>รูปแบบไม่ถูกต้อง:</strong> {matchResult.invalidEmails.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      <article className="admin-ui-panel">
        <h3>2. เนื้อหาแจ้งเตือน</h3>
        <div className="admin-ui-form">
          <label>
            หัวข้อ
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="เช่น ลิงก์ดาวน์โหลดประกาศนียบัตร"
            />
          </label>
          <label>
            ข้อความ
            <textarea
              rows={6}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="เนื้อความแจ้งเตือน (รองรับ **ตัวหนา**, ลิงก์ และตารางจาก Excel)"
            />
          </label>

          {message.trim() && (
            <div className="admin-ui-form-field">
              <strong style={{ fontSize: '0.82rem' }}>ตัวอย่างที่ผู้รับจะเห็น</strong>
              <div
                style={{
                  marginTop: 8,
                  padding: '12px 14px',
                  border: '1px solid var(--admin-ui-border, #dbe3ef)',
                  borderRadius: 10,
                  background: 'var(--admin-ui-surface-soft)',
                  lineHeight: 1.6,
                }}
              >
                {previewNodes}
              </div>
              {tablePreviewWarnings.map((warning) => (
                <p key={warning} style={{ margin: '6px 0 0', color: '#b45309', fontSize: '0.82rem' }}>⚠️ {warning}</p>
              ))}
            </div>
          )}

          <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={sending || !canSend} onClick={sendNotification}>
            <Send size={14} />
            {sending ? 'กำลังส่ง...' : `ส่งแจ้งเตือน (${matchedUserIds.length} คน)`}
          </button>
          {!canSend && matchResult && !matchStale && matchedUserIds.length === 0 && (
            <span className="admin-ui-text-muted" style={{ fontSize: '0.82rem' }}>ไม่มีผู้รับที่ตรงกับระบบ — ตรวจสอบรายชื่ออีเมลอีกครั้ง</span>
          )}
          {!matchResult && (
            <span className="admin-ui-text-muted" style={{ fontSize: '0.82rem' }}>กรุณากด"ตรวจสอบรายชื่อ" ก่อนจึงจะส่งได้</span>
          )}
        </div>
      </article>
    </div>
  )
}
