import { useCallback, useEffect, useRef, useState } from 'react'
import { Bold, Heading, Link2, List, Pilcrow, Save } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'

export default function StaticAboutPage() {
  const { pushToast } = useAdminToast()
  const [contentTh, setContentTh] = useState('')
  const [contentEn, setContentEn] = useState('')
  const [tab, setTab] = useState('editor')
  const [lang, setLang] = useState('th')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef(null)

  const fetchAboutPage = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/api/admin/pages/ABOUT'), { credentials: 'include' })
      const payload = await response.json()

      if (!payload?.ok || !payload?.data) {
        throw new Error(payload?.message || 'ไม่สามารถโหลด About content ได้')
      }

      setContentTh(payload.data.contentHtmlTh || '')
      setContentEn(payload.data.contentHtmlEn || '')
    } catch (error) {
      console.error('Failed to fetch ABOUT page:', error)
      pushToast({ type: 'error', title: error?.message || 'ไม่สามารถโหลด About content ได้' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchAboutPage()
  }, [fetchAboutPage])

  const saveAboutPage = useCallback(async () => {
    try {
      setSaving(true)
      const response = await fetch(apiUrl('/api/admin/pages/ABOUT'), {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentHtmlTh: contentTh,
          contentHtmlEn: contentEn,
        }),
      })

      const payload = await response.json()
      if (!payload?.ok) {
        throw new Error(payload?.message || 'บันทึก About content ไม่สำเร็จ')
      }

      pushToast({
        title: 'บันทึก About content แล้ว',
        description: 'ข้อมูลหน้า About ถูกอัปเดตลงฐานข้อมูลเรียบร้อย',
      })
    } catch (error) {
      console.error('Failed to save ABOUT page:', error)
      pushToast({ type: 'error', title: error?.message || 'บันทึก About content ไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }, [contentEn, contentTh, pushToast])

  const content = lang === 'th' ? contentTh : contentEn
  const setContent = (value) => (lang === 'th' ? setContentTh(value) : setContentEn(value))

  // ครอบข้อความที่เลือกใน textarea ด้วยแท็ก HTML เพื่อให้จัดรูปแบบง่ายขึ้นโดยไม่ต้องพิมพ์แท็กเอง
  const applyFormat = (kind) => {
    const textarea = editorRef.current
    if (!textarea) return
    const start = textarea.selectionStart ?? content.length
    const end = textarea.selectionEnd ?? content.length
    const selected = content.slice(start, end)
    const wrappers = {
      h2: (s) => `<h2>${s || 'หัวข้อ'}</h2>`,
      bold: (s) => `<strong>${s || 'ข้อความ'}</strong>`,
      link: (s) => `<a href="https://">${s || 'ลิงก์'}</a>`,
      list: (s) => `<ul>\n  <li>${s || 'รายการ'}</li>\n</ul>`,
      paragraph: (s) => `<p>${s || 'ย่อหน้า'}</p>`,
    }
    const inserted = (wrappers[kind] || wrappers.paragraph)(selected)
    const nextValue = content.slice(0, start) + inserted + content.slice(end)
    setContent(nextValue)
    // คืนโฟกัสและวางเคอร์เซอร์ต่อจากข้อความที่แทรก
    requestAnimationFrame(() => {
      textarea.focus()
      const caret = start + inserted.length
      textarea.setSelectionRange(caret, caret)
    })
  }

  const formatButtons = [
    { kind: 'h2', label: 'หัวข้อ', icon: Heading },
    { kind: 'bold', label: 'ตัวหนา', icon: Bold },
    { kind: 'link', label: 'ลิงก์', icon: Link2 },
    { kind: 'list', label: 'รายการ', icon: List },
    { kind: 'paragraph', label: 'ย่อหน้า', icon: Pilcrow },
  ]

  return (
    <div className="admin-ui-stack">
      <PageHeader
        title="เกี่ยวกับ"
        actions={
          <div className="admin-ui-header-actions">
            <button
              type="button"
              className="admin-ui-btn admin-ui-btn-primary"
              onClick={saveAboutPage}
              disabled={loading || saving}
            >
              <Save size={15} />
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>
        }
      />

      <div className="admin-ui-tab-row">
        <button type="button" className={tab === 'editor' ? 'active' : ''} onClick={() => setTab('editor')}>
          แก้ไข
        </button>
        <button type="button" className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
          ตัวอย่าง
        </button>
      </div>

      <div className="admin-ui-tab-row">
        <button type="button" className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>
          ภาษาไทย
        </button>
        <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
          ภาษาอังกฤษ
        </button>
      </div>

      {tab === 'editor' ? (
        <article className="admin-ui-panel">
          <label htmlFor="about-editor" className="admin-ui-label">
            เนื้อหา HTML ({lang.toUpperCase()})
          </label>
          <div className="admin-about-toolbar">
            {formatButtons.map((button) => (
              <button
                key={button.kind}
                type="button"
                className="admin-ui-mini-btn"
                disabled={loading}
                title={button.label}
                onClick={() => applyFormat(button.kind)}
              >
                <button.icon size={13} /> {button.label}
              </button>
            ))}
          </div>
          <textarea
            id="about-editor"
            ref={editorRef}
            rows={16}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={loading}
          />
          <div className="admin-about-live-preview">
            <span className="admin-ui-label">ตัวอย่างสด</span>
            <div className="admin-ui-markdown-preview" dangerouslySetInnerHTML={{ __html: content || '<p>-</p>' }} />
          </div>
        </article>
      ) : (
        <article className="admin-ui-panel admin-ui-markdown-preview">
          {loading ? (
            <p>กำลังโหลดข้อมูล...</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: content || '<p>-</p>' }} />
          )}
        </article>
      )}
    </div>
  )
}
