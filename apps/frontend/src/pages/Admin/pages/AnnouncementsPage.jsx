import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Megaphone } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import { splitMessageBlocks } from '../../../lib/richMessage'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'

const TEAM_STATUS_OPTIONS = [
  { value: 'forming', th: 'ยังไม่ได้ส่งโครงร่าง' },
  { value: 'submitted', th: 'ส่งโครงร่างแล้ว' },
  { value: 'passed', th: 'ผ่านการคัดเลือก' },
  { value: 'failed', th: 'ไม่ผ่านการคัดเลือก' },
  { value: 'confirmed', th: 'ยืนยันเข้าร่วม' },
  { value: 'not_joined', th: 'ไม่เข้าร่วม' },
  { value: 'disbanded', th: 'ยุบทีม' },
]

const TEAM_STATUS_TH = Object.fromEntries(TEAM_STATUS_OPTIONS.map((option) => [option.value, option.th]))

function getAttachmentFileName(disposition, fallback) {
  const encodedName = String(disposition || '').match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  return encodedName ? decodeURIComponent(encodedName) : fallback
}

async function downloadResponseFile(response, fallbackFileName) {
  const blob = await response.blob()
  const fileName = getAttachmentFileName(response.headers.get('content-disposition'), fallbackFileName)
  const downloadUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(downloadUrl)
  return fileName
}

// render **ตัวหนา** และลิงก์ http(s) แบบเดียวกับที่ผู้รับเห็น (ใช้ในพรีวิว)
function renderPreviewInline(text, keyPrefix) {
  return String(text || '').split(/(\*\*[^*\n]+\*\*|https?:\/\/[^\s]+)/g).map((part, index) => {
    if (/^\*\*[^*\n]+\*\*$/.test(part)) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>
    }
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return <a key={`${keyPrefix}-${index}`} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
    }
    return part
  })
}

// แปลงข้อความเป็น React node เหมือนที่ฝั่งผู้รับแสดง (ตาราง Tab-separated + ตัวหนา + ลิงก์)
function renderAnnouncementPreview(message) {
  if (!String(message || '').trim()) return null
  return splitMessageBlocks(message).map((block, blockIndex) => {
    if (block.type === 'table') {
      return (
        <table key={`table-${blockIndex}`} style={{ borderCollapse: 'collapse', margin: '8px 0', width: '100%' }}>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={{ border: '1px solid var(--admin-ui-border, #dbe3ef)', padding: '6px 10px' }}>
                    {renderPreviewInline(cell, `${blockIndex}-${rowIndex}-${cellIndex}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    return (
      <div key={`text-${blockIndex}`} style={{ whiteSpace: 'pre-line' }}>
        {renderPreviewInline(block.content, `text-${blockIndex}`)}
      </div>
    )
  })
}

// เตือนเมื่อแถวในตารางมีจำนวนคอลัมน์ไม่เท่ากัน (มักเกิดจากก็อปไม่ครบคอลัมน์)
function getTablePreviewWarnings(message) {
  const warnings = []
  splitMessageBlocks(message).forEach((block, index) => {
    if (block.type !== 'table') return
    const counts = block.rows.map((row) => row.length)
    const maxColumns = Math.max(...counts)
    if (counts.some((count) => count !== maxColumns)) {
      warnings.push(`ตารางที่ ${index + 1}: บางแถวมีจำนวนช่องไม่เท่ากัน (${counts.join(', ')} ช่อง) — ตรวจสอบว่าก็อปครบทุกคอลัมน์`)
    }
  })
  return warnings
}

export default function AnnouncementsPage() {
  const { pushToast } = useAdminToast()
  const [teamOptions, setTeamOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [form, setForm] = useState({
    target: 'status',
    teamStatuses: ['passed'],
    teamId: '',
    userTarget: 'selected',
    userIds: [],
    channels: { email: false, inApp: true },
    subject: '',
    message: '',
  })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [teamsRes, usersRes] = await Promise.all([
        fetch(apiUrl('/api/admin/selection/teams'), { credentials: 'include' }),
        fetch(apiUrl('/api/notifications/admin/users'), { credentials: 'include' }),
      ])
      const teamsPayload = await teamsRes.json()
      const usersPayload = await usersRes.json()
      if (!teamsRes.ok || !teamsPayload?.ok) throw new Error(teamsPayload?.message || 'โหลดรายชื่อทีมไม่สำเร็จ')
      if (!usersRes.ok || !usersPayload?.ok) throw new Error(usersPayload?.message || 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ')

      const dedup = new Map()
      ;(teamsPayload.data || []).forEach((row) => {
        if (!row?.team_id || dedup.has(row.team_id)) return
        dedup.set(row.team_id, {
          teamId: row.team_id,
          status: row.status || '',
          label: `${row.team_name_th || '-'} [${row.team_code}] (${row.status || '-'})`,
        })
      })
      setTeamOptions(Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label, 'th')))
      setUserOptions(usersPayload.data || [])
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'โหลดข้อมูลไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    load()
  }, [load])

  const statusTeamCounts = useMemo(() => teamOptions.reduce((acc, team) => {
    if (team.status) acc[team.status] = (acc[team.status] || 0) + 1
    return acc
  }, {}), [teamOptions])

  const selectedStatusTeamCount = form.teamStatuses.reduce((sum, status) => sum + (statusTeamCounts[status] || 0), 0)

  const previewNodes = useMemo(() => renderAnnouncementPreview(form.message), [form.message])
  const tablePreviewWarnings = useMemo(() => getTablePreviewWarnings(form.message), [form.message])

  const toggleChannel = (key) => {
    setForm((prev) => ({ ...prev, channels: { ...prev.channels, [key]: !prev.channels[key] } }))
  }

  const toggleStatus = (value) => {
    setForm((prev) => {
      const exists = prev.teamStatuses.includes(value)
      return {
        ...prev,
        teamStatuses: exists
          ? prev.teamStatuses.filter((item) => item !== value)
          : [...prev.teamStatuses, value],
      }
    })
  }

  const sendAnnouncement = async () => {
    const subject = form.subject.trim()
    const message = form.message.trim()
    if (!subject || !message) {
      pushToast({ variant: 'danger', title: 'กรุณากรอกหัวข้อและข้อความให้ครบ' })
      return
    }
    if (!form.channels.email && !form.channels.inApp) {
      pushToast({ variant: 'danger', title: 'กรุณาเลือกช่องทางส่งอย่างน้อยหนึ่งช่องทาง' })
      return
    }
    if (form.target === 'status' && form.teamStatuses.length === 0) {
      pushToast({ variant: 'danger', title: 'กรุณาเลือกสถานะทีมอย่างน้อยหนึ่งสถานะ' })
      return
    }
    if (form.target === 'team' && !form.teamId) {
      pushToast({ variant: 'danger', title: 'กรุณาเลือกทีม' })
      return
    }
    if (form.target === 'users' && form.userTarget === 'selected' && form.userIds.length === 0) {
      pushToast({ variant: 'danger', title: 'กรุณาเลือกผู้รับอย่างน้อยหนึ่งคน' })
      return
    }

    try {
      setSending(true)
      const body = {
        target: form.target,
        channels: form.channels,
        subject,
        message,
      }
      if (form.target === 'status') body.teamStatuses = form.teamStatuses
      if (form.target === 'team') body.teamId = Number(form.teamId)
      if (form.target === 'users') {
        body.userTarget = form.userTarget
        body.userIds = form.userIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
      }

      const res = await fetch(apiUrl('/api/notifications/admin/announcements'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'ส่งประกาศไม่สำเร็จ')
      const d = payload.data || {}
      const parts = []
      if (d.teamCount) parts.push(`teams=${d.teamCount}`)
      parts.push(`recipients=${d.totalRecipients || 0}`)
      if (form.channels.inApp) parts.push(`in-app=${d.inAppSent || 0}`)
      if (form.channels.email) parts.push(`email-sent=${d.sent || 0}, queued=${d.queued || 0}, failed=${d.failed || 0}, skipped=${d.skipped || 0}`)
      pushToast({ variant: 'success', title: 'ส่งประกาศสำเร็จ', description: parts.join(' | ') })
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'ส่งประกาศไม่สำเร็จ' })
    } finally {
      setSending(false)
    }
  }

  const exportContactSheet = async () => {
    const statuses = form.target === 'team'
      ? teamOptions.filter((team) => String(team.teamId) === String(form.teamId)).map((team) => team.status)
      : form.teamStatuses
    const uniqueStatuses = Array.from(new Set(statuses.filter(Boolean)))
    if (uniqueStatuses.length === 0) {
      pushToast({ variant: 'warning', title: 'กรุณาเลือกสถานะทีม (หรือเลือกทีม) ก่อน export' })
      return
    }

    try {
      setExporting(true)
      const query = new URLSearchParams({ statuses: uniqueStatuses.join(',') })
      const response = await fetch(apiUrl(`/api/admin/exports/teams-contact-sheet?${query.toString()}`), {
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.message || 'ไม่สามารถ export ข้อมูลทีมได้')
      }
      const fileName = await downloadResponseFile(response, `teams_contact_export_${Date.now()}.xlsx`)
      pushToast({ variant: 'success', title: 'Export ข้อมูลทีมสำเร็จ', description: `ดาวน์โหลดไฟล์แล้ว: ${fileName}` })
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'Export ข้อมูลทีมไม่สำเร็จ' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="admin-ui-stack">
      <PageHeader title="ประกาศผล / ส่งประกาศ" />

      <article className="admin-ui-panel" style={{ background: 'var(--admin-ui-surface-soft)' }}>
        <p className="admin-ui-text-muted" style={{ margin: 0 }}>
          ส่งประกาศหาทีม/รายบุคคล โดยเลือกกลุ่มผู้รับตามสถานะ และเลือกช่องทาง (อีเมลจริง และ/หรือ ข้อความในเว็บ).
          ข้อความในเว็บที่ส่งหาทีมจะแสดงทั้งที่กระดิ่งหน้า home และกล่องข้อความในหน้าทีมของฉัน.
          รองรับตัวแปร <code>{'{{team_name}}'}</code>, <code>{'{{team_code}}'}</code>, <code>{'{{member_names}}'}</code>, <code>{'{{member_count}}'}</code> (เฉพาะการส่งหาทีม).
          ทำ<strong>ตัวหนา</strong>ได้โดยครอบข้อความด้วย <code>**...**</code> เช่น <code>**สำคัญ**</code> (ใช้ได้ทั้งอีเมลและข้อความในเว็บ).
          หากต้องการส่งเป็น<strong>ตาราง</strong> ให้คัดลอกเซลล์จาก Excel/Google Sheets แล้ววางในช่องข้อความด้านล่างได้เลย ระบบจะแปลงเป็นตารางให้อัตโนมัติทั้งอีเมลและข้อความในเว็บ.
        </p>
      </article>

      <article className="admin-ui-panel">
        <h3>ส่งประกาศ</h3>
        <div className="admin-ui-form">
          <label>
            กลุ่มเป้าหมาย
            <select
              value={form.target}
              onChange={(event) => setForm((prev) => ({ ...prev, target: event.target.value }))}
            >
              <option value="status">ทีม - เลือกตามสถานะ</option>
              <option value="team">ทีม - เลือกทีมเดียว</option>
              <option value="users">รายบุคคล</option>
            </select>
          </label>

          {form.target === 'status' && (
            <div className="admin-ui-form-field">
              <div className="admin-ui-header-actions" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong>สถานะทีม (เลือกได้หลายสถานะ)</strong>
                <div className="admin-ui-header-actions">
                  <button
                    type="button"
                    className="admin-ui-mini-btn"
                    onClick={() => setForm((prev) => ({ ...prev, teamStatuses: TEAM_STATUS_OPTIONS.map((option) => option.value) }))}
                  >
                    เลือกทั้งหมด
                  </button>
                  <button
                    type="button"
                    className="admin-ui-mini-btn"
                    onClick={() => setForm((prev) => ({ ...prev, teamStatuses: [] }))}
                  >
                    ล้างทั้งหมด
                  </button>
                </div>
              </div>

              <div className="admin-ann-choice-grid">
                {TEAM_STATUS_OPTIONS.map((status) => {
                  const checked = form.teamStatuses.includes(status.value)
                  return (
                    <label key={status.value} className={`admin-ann-choice ${checked ? 'is-selected' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleStatus(status.value)} />
                      <span className="admin-ann-choice-text">
                        <span className="admin-ann-choice-title">{status.th}</span>
                        <span className="admin-ann-choice-count">{status.value} · {statusTeamCounts[status.value] || 0} ทีม</span>
                      </span>
                    </label>
                  )
                })}
              </div>

              <div className="admin-ann-summary" style={{ marginTop: 10 }}>
                {form.teamStatuses.length === 0 ? (
                  <span className="admin-ui-text-muted">ยังไม่ได้เลือกสถานะ — กรุณาเลือกอย่างน้อย 1 สถานะ</span>
                ) : (
                  <>
                    <strong style={{ fontSize: '0.82rem' }}>เลือกแล้ว {form.teamStatuses.length} สถานะ · ประมาณ {selectedStatusTeamCount} ทีม:</strong>
                    {form.teamStatuses.map((value) => (
                      <span key={value} className="admin-ann-chip">{TEAM_STATUS_TH[value] || value} ({statusTeamCounts[value] || 0})</span>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {form.target === 'team' && (
            <label>
              ทีม
              <select
                value={form.teamId}
                onChange={(event) => setForm((prev) => ({ ...prev, teamId: event.target.value }))}
              >
                <option value="">เลือกทีม</option>
                {teamOptions.map((item) => (
                  <option key={item.teamId} value={item.teamId}>{item.label}</option>
                ))}
              </select>
            </label>
          )}

          {form.target === 'users' && (
            <>
              <label>
                กลุ่มผู้รับ
                <select
                  value={form.userTarget}
                  onChange={(event) => setForm((prev) => ({ ...prev, userTarget: event.target.value, userIds: [] }))}
                >
                  <option value="all">ผู้ใช้ทั้งหมด ({userOptions.length} คน)</option>
                  <option value="selected">เลือกผู้ใช้บางคน</option>
                </select>
              </label>
              {form.userTarget === 'selected' && (
                <label>
                  ผู้รับ
                  <select
                    multiple
                    size={Math.min(10, Math.max(4, userOptions.length || 4))}
                    value={form.userIds.map(String)}
                    onChange={(event) => {
                      const values = Array.from(event.target.selectedOptions).map((option) => option.value)
                      setForm((prev) => ({ ...prev, userIds: values }))
                    }}
                  >
                    {userOptions.map((user) => (
                      <option key={user.userId} value={user.userId}>
                        {user.displayName || user.userName} ({user.userName}){user.email ? ` - ${user.email}` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="admin-ui-text-muted">เลือกแล้ว {form.userIds.length} คน</span>
                </label>
              )}
            </>
          )}

          <fieldset style={{ border: '1px solid var(--admin-ui-border, #dbe3ef)', borderRadius: 10, padding: '12px 14px' }}>
            <legend style={{ padding: '0 6px', fontWeight: 600 }}>ช่องทางส่ง</legend>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.channels.email} onChange={() => toggleChannel('email')} />
              <span>อีเมลจริง (SMTP)</span>
            </label>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.channels.inApp} onChange={() => toggleChannel('inApp')} />
              <span>ข้อความในเว็บ (กระดิ่ง + กล่องข้อความทีม)</span>
            </label>
          </fieldset>

          <label>
            หัวข้อ
            <input
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
              placeholder="หัวข้อประกาศ"
            />
          </label>
          <label>
            ข้อความ
            <textarea
              rows={6}
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="เนื้อความประกาศ (รองรับตัวแปร {{team_name}} ฯลฯ เมื่อส่งหาทีม)"
            />
          </label>

          {form.message.trim() && (
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

          <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={sending || loading} onClick={sendAnnouncement}>
            <Megaphone size={14} />
            {sending ? 'กำลังส่ง...' : 'ส่งประกาศ'}
          </button>
        </div>
      </article>

      <article className="admin-ui-panel">
        <h3>Export ข้อมูลทีม + อีเมลสมาชิก (สำหรับส่งเมล manual)</h3>
        <div className="admin-ui-form">
          <p className="admin-ui-text-muted" style={{ margin: 0 }}>
            ไฟล์ Excel จะอิงตามสถานะที่เลือกด้านบน (หรือสถานะของทีมที่เลือก) มี 2 ชีต: สรุปทีม (รวมจำนวน track ที่ส่ง และ track ลำดับ 1/2) และ รายชื่อสมาชิกพร้อมอีเมล
          </p>
          <button type="button" className="admin-ui-btn" disabled={exporting || loading} onClick={exportContactSheet}>
            <Download size={14} />
            {exporting ? 'กำลัง Export...' : 'Export Excel (.xlsx)'}
          </button>
        </div>
      </article>
    </div>
  )
}
