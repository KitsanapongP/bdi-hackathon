import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Download, ExternalLink, FileArchive, FileText, Image as ImageIcon, Loader2, Maximize2, Minimize2, PlaySquare } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { apiUrl } from '../../lib/api'
import './TeamReviewPage.css'

const EDUCATION_LABEL = {
  secondary: 'ม.ต้น',
  high_school: 'ม.ปลาย',
  bachelor: 'ป.ตรี',
  master: 'ป.โท',
  doctorate: 'ป.เอก',
}
const EDUCATION_ORDER = ['doctorate', 'master', 'bachelor', 'high_school', 'secondary']

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function fileKind(file) {
  const type = String(file?.contentType || '').toLowerCase()
  const name = String(file?.fileName || '').toLowerCase()
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (type.includes('zip') || name.endsWith('.zip')) return 'archive'
  return 'document'
}

function fileIcon(kind) {
  if (kind === 'image') return <ImageIcon size={18} />
  if (kind === 'video') return <PlaySquare size={18} />
  if (kind === 'archive') return <FileArchive size={18} />
  return <FileText size={18} />
}

function getDownloadFileName(file) {
  const name = String(file?.fileName || '').trim()
  return name || 'submission-file'
}

function FilePreview({ file }) {
  const kind = fileKind(file)
  if (kind === 'image') {
    return <img className="review-file-preview-image" src={file.url} alt={file.fileName} loading="lazy" />
  }
  if (kind === 'video') {
    return <video className="review-file-preview-video" src={file.url} controls preload="metadata" />
  }
  if (kind === 'pdf') {
    return <iframe className="review-file-preview-pdf" src={`${file.url}#toolbar=1&view=FitH`} title={file.fileName} />
  }
  return (
    <div className="review-file-fallback">
      {fileIcon(kind)}
      <span>ไฟล์ชนิดนี้ browser อาจไม่รองรับการ preview โดยตรง</span>
    </div>
  )
}

export default function TeamReviewPage() {
  const { shareId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState(null)
  const [downloadingKey, setDownloadingKey] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const proposalRef = useRef(null)

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = proposalRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else {
        setIsFullscreen((v) => !v)
      }
    } catch {
      setIsFullscreen((v) => !v)
    }
  }, [])

  const educationMix = useMemo(() => {
    const counts = {}
    for (const member of payload?.members || []) {
      const level = member?.educationLevel
      if (!level) continue
      counts[level] = (counts[level] || 0) + 1
    }
    return EDUCATION_ORDER
      .filter((level) => counts[level])
      .map((level) => ({ level, count: counts[level] }))
  }, [payload])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const response = await fetch(apiUrl(`/api/public-review/teams/${shareId}`))
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data?.ok) throw new Error(data?.message || 'ไม่สามารถโหลดข้อมูลรีวิวทีมได้')
        if (mounted) setPayload(data.data)
      } catch (err) {
        if (mounted) setError(err?.message || 'ไม่สามารถโหลดข้อมูลรีวิวทีมได้')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [shareId])

  if (loading) {
    return (
      <main className="team-review-page team-review-center">
        <Loader2 className="team-review-spin" size={28} />
        <p>กำลังโหลดข้อมูลรีวิวทีม...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="team-review-page team-review-center">
        <AlertTriangle size={30} />
        <h1>เปิดหน้ารีวิวไม่ได้</h1>
        <p>{error}</p>
      </main>
    )
  }

  const team = payload?.team || {}
  const reviewTrack = payload?.reviewScope?.track || ''
  const submissionFiles = payload?.submissionFiles || []
  const primaryFile = submissionFiles[0] || null
  const extraFiles = submissionFiles.slice(1)
  const submissionLinks = payload?.submissionLinks || []
  const memberCvs = payload?.memberCvs || []

  const downloadFile = async (file) => {
    const downloadUrl = file?.downloadUrl || file?.url
    if (!downloadUrl) return

    const key = downloadUrl
    try {
      setDownloadingKey(key)
      const response = await fetch(downloadUrl, { credentials: 'include' })
      if (!response.ok) throw new Error('download failed')

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = getDownloadFileName(file)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadingKey('')
    }
  }

  return (
    <main className="team-review-page">
      <section className="team-review-team-box" aria-label="ชื่อทีม">
        <div className="team-review-team-row">
          <span className="team-review-team-code">{team.teamCode || '-'}</span>
          {reviewTrack ? (
            <span className="team-review-track-chip" data-track={reviewTrack}>{reviewTrack} Track</span>
          ) : null}
        </div>
        <h1>{team.teamNameTh || 'Team Review'}</h1>
        {educationMix.length ? (
          <div className="team-review-edu-mix" aria-label="ระดับการศึกษาของสมาชิกในทีม">
            <span className="team-review-edu-label">ระดับการศึกษา</span>
            {educationMix.map(({ level, count }) => (
              <span key={level} className="team-review-edu-pill">
                <strong>{count}</strong> {EDUCATION_LABEL[level]}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="team-review-links-box" aria-label="ลิงก์ส่งงาน">
        <h2 className="team-review-eyebrow">Submission Links</h2>
        {submissionLinks.length ? (
          <div className="team-review-link-list">
            {submissionLinks.map((link, index) => (
              <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" title={link.taskName}>
                <span>{link.taskName}</span>
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
        ) : <p className="team-review-muted">ไม่มีลิงก์ส่งงาน</p>}
      </section>

      <section className="team-review-cv-box" aria-label="CV ของผู้ส่ง">
        <h2 className="team-review-eyebrow">CV</h2>
        <div className="team-review-cv-scroll">
          {memberCvs.length ? (
            <div className="team-review-cv-list">
              {memberCvs.map((cv, index) => (
                <article key={index} className="team-review-cv-card">
                  <header>
                    <span className="team-review-cv-num">{index + 1}</span>
                    <strong>คนที่ {index + 1}</strong>
                  </header>
                  <p>{cv}</p>
                </article>
              ))}
            </div>
          ) : <p className="team-review-muted">ไม่มีข้อมูล CV</p>}
        </div>
      </section>

      <section
        ref={proposalRef}
        className={`team-review-proposal-box${isFullscreen ? ' is-fullscreen' : ''}`}
        aria-label="Proposal"
      >
        {primaryFile ? (
          <>
            <header className="team-review-proposal-header">
              <div className="team-review-proposal-title">
                <span className="team-review-proposal-icon">
                  {fileIcon(fileKind(primaryFile))}
                </span>
                <div className="team-review-proposal-title-text">
                  <strong>{primaryFile.fileName}</strong>
                  <span className="team-review-proposal-title-meta">{primaryFile.taskName || 'Proposal'}</span>
                </div>
              </div>
              <div className="team-review-proposal-actions">
                <a href={primaryFile.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} />
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => downloadFile(primaryFile)}
                  disabled={downloadingKey === (primaryFile.downloadUrl || primaryFile.url)}
                >
                  <Download size={14} />
                  {downloadingKey === (primaryFile.downloadUrl || primaryFile.url) ? 'Downloading...' : 'Download'}
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="team-review-fullscreen-btn"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </header>

            {extraFiles.length ? (
              <div className="team-review-proposal-extras">
                <span>ไฟล์อื่น ๆ ในประเภทเดียวกัน:</span>
                {extraFiles.map((file, index) => (
                  <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer" title={file.fileName}>
                    {fileIcon(fileKind(file))}
                    <span>{file.fileName}</span>
                  </a>
                ))}
              </div>
            ) : null}

            <div className="team-review-proposal-preview">
              <FilePreview file={primaryFile} />
            </div>
          </>
        ) : (
          <div className="team-review-proposal-empty">
            <FileText size={28} />
            <p className="team-review-muted">ไม่มีไฟล์ Proposal</p>
          </div>
        )}
      </section>
    </main>
  )
}
