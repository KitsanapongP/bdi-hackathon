import { useCallback, useState } from 'react'
import { Download } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import { useAdminToast } from '../shared/adminContexts'
import './AdminExportsPage.css'

const statusMeta = {
  forming: { label: 'กำลังจัดทีม' },
  submitted: { label: 'ส่งโครงร่างแล้ว' },
  passed: { label: 'ผ่านการคัดเลือก' },
  failed: { label: 'ไม่ผ่านการคัดเลือก' },
  confirmed: { label: 'ยืนยันเข้าร่วม' },
  not_joined: { label: 'ไม่เข้าร่วม' },
  disbanded: { label: 'ยุบทีม' },
}

const reviewTrackOptions = ['Phenome', 'Health', 'City']
const reviewTrackExportStatuses = ['submitted', 'passed', 'confirmed']

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

export default function AdminExportsPage() {
  const { pushToast } = useAdminToast()
  const [exportingBundle, setExportingBundle] = useState(false)
  const [exportingSheet, setExportingSheet] = useState(false)
  const [exportingReviewSheet, setExportingReviewSheet] = useState(false)
  const [exportingReviewTrack, setExportingReviewTrack] = useState('')
  const [sheetStatuses, setSheetStatuses] = useState(['submitted', 'passed'])

  const toggleSheetStatus = useCallback((status) => {
    setSheetStatuses((prev) => {
      if (prev.includes(status)) return prev.filter((item) => item !== status)
      return [...prev, status]
    })
  }, [])

  const handleExportSubmittedTeams = useCallback(async () => {
    try {
      setExportingBundle(true)
      pushToast({
        variant: 'info',
        title: 'กำลังส่งออกข้อมูลทีม',
        description: 'กำลังเตรียมไฟล์ ZIP สำหรับทีมที่ส่งโครงร่างแล้ว',
        durationMs: 7000,
      })

      const response = await fetch(apiUrl('/api/admin/exports/submitted-verification-bundle'), {
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.message || 'ไม่สามารถ export ได้')
      }

      const fileName = await downloadResponseFile(response, `verification_export_${Date.now()}.zip`)
      pushToast({
        variant: 'success',
        title: 'ส่งออกข้อมูลทีมสำเร็จ',
        description: `ดาวน์โหลดไฟล์แล้ว: ${fileName}`,
        durationMs: 9000,
      })
    } catch (error) {
      pushToast({
        variant: 'danger',
        title: 'ส่งออกข้อมูลทีมไม่สำเร็จ',
        description: error?.message || 'ไม่สามารถ export ได้',
        durationMs: 10000,
      })
    } finally {
      setExportingBundle(false)
    }
  }, [pushToast])

  const handleExportSelectionSheet = useCallback(async () => {
    if (sheetStatuses.length === 0) {
      pushToast({ variant: 'warning', title: 'กรุณาเลือกสถานะทีมอย่างน้อย 1 สถานะ' })
      return
    }

    try {
      setExportingSheet(true)
      const query = new URLSearchParams({ statuses: sheetStatuses.join(',') })
      const response = await fetch(apiUrl(`/api/admin/exports/teams-selection-sheet?${query.toString()}`), {
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.message || 'ไม่สามารถ export ไฟล์คัดเลือกได้')
      }

      const fileName = await downloadResponseFile(response, `teams_selection_export_${Date.now()}.xlsx`)
      pushToast({
        variant: 'success',
        title: 'ส่งออกไฟล์คัดเลือกสำเร็จ',
        description: `ดาวน์โหลดไฟล์แล้ว: ${fileName}`,
      })
    } catch (error) {
      pushToast({
        variant: 'danger',
        title: 'ส่งออกไฟล์คัดเลือกไม่สำเร็จ',
        description: error?.message || 'ไม่สามารถ export ไฟล์คัดเลือกได้',
      })
    } finally {
      setExportingSheet(false)
    }
  }, [pushToast, sheetStatuses])

  const handleExportReviewSheet = useCallback(async () => {
    if (sheetStatuses.length === 0) {
      pushToast({ variant: 'warning', title: 'กรุณาเลือกสถานะทีมอย่างน้อย 1 สถานะ' })
      return
    }

    try {
      setExportingReviewSheet(true)
      const query = new URLSearchParams({ statuses: sheetStatuses.join(',') })
      const response = await fetch(apiUrl(`/api/admin/exports/teams-review-sheet?${query.toString()}`), {
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.message || 'Cannot export review links sheet')
      }

      const fileName = await downloadResponseFile(response, `teams_review_links_${Date.now()}.xlsx`)
      pushToast({
        variant: 'success',
        title: 'Export review links สำเร็จ',
        description: `ดาวน์โหลดไฟล์แล้ว: ${fileName}`,
      })
    } catch (error) {
      pushToast({
        variant: 'danger',
        title: 'Export review links ไม่สำเร็จ',
        description: error?.message || 'Cannot export review links sheet',
      })
    } finally {
      setExportingReviewSheet(false)
    }
  }, [pushToast, sheetStatuses])

  const handleExportReviewTrackSheet = useCallback(async (track) => {
    try {
      setExportingReviewTrack(track)
      const query = new URLSearchParams({ statuses: reviewTrackExportStatuses.join(','), track })
      const response = await fetch(apiUrl(`/api/admin/exports/teams-review-track-sheet?${query.toString()}`), {
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.message || `Cannot export ${track} review links sheet`)
      }

      const fileName = await downloadResponseFile(response, `teams_review_links_${track.toLowerCase()}_${Date.now()}.xlsx`)
      pushToast({
        variant: 'success',
        title: `Export ${track} review links สำเร็จ`,
        description: `ดาวน์โหลดไฟล์แล้ว: ${fileName}`,
      })
    } catch (error) {
      pushToast({
        variant: 'danger',
        title: `Export ${track} review links ไม่สำเร็จ`,
        description: error?.message || `Cannot export ${track} review links sheet`,
      })
    } finally {
      setExportingReviewTrack('')
    }
  }, [pushToast])

  return (
    <div className="admin-export-page">
      <section className="admin-export-panel">
        <header>
          <div>
            <h3>Team Export Files</h3>
            <p>ส่งออกไฟล์รวมและ Excel สำหรับการจัดการทีม โดยเลือกสถานะทีมที่ต้องการใช้กับ Excel ได้</p>
          </div>
        </header>

        <div className="admin-export-status-list">
          {Object.entries(statusMeta).map(([statusKey, meta]) => (
            <label key={statusKey}>
              <input
                type="checkbox"
                checked={sheetStatuses.includes(statusKey)}
                onChange={() => toggleSheetStatus(statusKey)}
              />
              <span>{meta.label}</span>
            </label>
          ))}
        </div>

        <div className="admin-export-actions">
          <button
            type="button"
            className="admin-export-btn admin-export-btn-primary"
            onClick={handleExportSubmittedTeams}
            disabled={exportingBundle}
          >
            <Download size={15} />
            {exportingBundle ? 'กำลังส่งออก...' : 'ส่งออกข้อมูลทีม (ZIP)'}
          </button>
          <button
            type="button"
            className="admin-export-btn"
            onClick={handleExportSelectionSheet}
            disabled={exportingSheet || sheetStatuses.length === 0}
          >
            <Download size={15} />
            {exportingSheet ? 'กำลังส่งออก...' : 'ส่งออกไฟล์คัดเลือก (XLSX)'}
          </button>
          <button
            type="button"
            className="admin-export-btn"
            onClick={handleExportReviewSheet}
            disabled={exportingReviewSheet || sheetStatuses.length === 0}
          >
            <Download size={15} />
            {exportingReviewSheet ? 'Exporting review links...' : 'Export Review Links (XLSX)'}
          </button>
        </div>
      </section>

      <section className="admin-export-panel">
        <header>
          <div>
            <h3>Review Links By Track</h3>
            <p>แยก Excel สำหรับกรรมการตามประเภทผลงาน โดยกรองจาก task “ส่งผลงานลำดับที่ 1” และ “ส่งผลงานลำดับที่ 2”</p>
          </div>
        </header>

        <div className="admin-export-track-actions">
          {reviewTrackOptions.map((track) => (
            <button
              key={track}
              type="button"
              className="admin-export-btn"
              onClick={() => handleExportReviewTrackSheet(track)}
              disabled={Boolean(exportingReviewTrack)}
            >
              <Download size={15} />
              {exportingReviewTrack === track ? `Exporting ${track}...` : `Export ${track} Review Links`}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
