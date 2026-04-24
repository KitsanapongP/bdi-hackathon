import { useCallback, useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import SectionHeading from '../shared/SectionHeading'
import { useAdminToast } from '../shared/adminContexts'

export default function StaticAboutPage() {
  const { pushToast } = useAdminToast()
  const [contentTh, setContentTh] = useState('')
  const [contentEn, setContentEn] = useState('')
  const [tab, setTab] = useState('editor')
  const [lang, setLang] = useState('th')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  return (
    <div className="admin-ui-stack">
      <SectionHeading
        title="Static Content: About"
        description="HTML editor + Preview mode รองรับ TH/EN (เชื่อม API แล้ว)"
        right={
          <button
            type="button"
            className="admin-ui-btn admin-ui-btn-primary"
            onClick={saveAboutPage}
            disabled={loading || saving}
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save About'}
          </button>
        }
      />

      <div className="admin-ui-tab-row">
        <button type="button" className={tab === 'editor' ? 'active' : ''} onClick={() => setTab('editor')}>
          Editor
        </button>
        <button type="button" className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
          Preview
        </button>
      </div>

      <div className="admin-ui-tab-row">
        <button type="button" className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>
          ภาษาไทย
        </button>
        <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
          English
        </button>
      </div>

      {tab === 'editor' ? (
        <article className="admin-ui-panel">
          <label htmlFor="about-editor" className="admin-ui-label">
            HTML Content ({lang.toUpperCase()})
          </label>
          <textarea
            id="about-editor"
            rows={16}
            value={lang === 'th' ? contentTh : contentEn}
            onChange={(event) => (lang === 'th' ? setContentTh(event.target.value) : setContentEn(event.target.value))}
            disabled={loading}
          />
        </article>
      ) : (
        <article className="admin-ui-panel admin-ui-markdown-preview">
          {loading ? (
            <p>กำลังโหลดข้อมูล...</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: (lang === 'th' ? contentTh : contentEn) || '<p>-</p>' }} />
          )}
        </article>
      )}
    </div>
  )
}
