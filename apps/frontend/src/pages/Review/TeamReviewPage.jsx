import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, ExternalLink, FileArchive, FileText, Image as ImageIcon, Loader2, PlaySquare, Users } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { apiUrl } from '../../lib/api'
import './TeamReviewPage.css'

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
    return <iframe className="review-file-preview-pdf" src={file.url} title={file.fileName} />
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

  const groupedFiles = useMemo(() => {
    const groups = new Map()
    for (const file of payload?.submissionFiles || []) {
      const key = file.taskName || 'Untitled Task'
      const bucket = groups.get(key) || []
      bucket.push(file)
      groups.set(key, bucket)
    }
    return Array.from(groups.entries()).map(([taskName, files]) => ({ taskName, files }))
  }, [payload])

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
    } catch (err) {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadingKey('')
    }
  }

  return (
    <main className="team-review-page">
      <section className="team-review-hero">
        <div>
          <span>{team.teamCode || '-'}</span>
          <h1>{team.teamNameTh || team.teamNameEn || 'Team Review'}</h1>
          {team.teamNameEn ? <p>{team.teamNameEn}</p> : null}
        </div>
        <dl>
          <div>
            <dt>Status</dt>
            <dd>{team.status || '-'}</dd>
          </div>
          <div>
            <dt>Leader</dt>
            <dd>{team.leaderName || '-'}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDateTime(team.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="team-review-panel">
        <h2>Submission Links</h2>
        <div className="team-review-link-list">
          {(payload?.submissionLinks || []).length ? payload.submissionLinks.map((link, index) => (
            <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer">
              <span>{link.taskName}</span>
              <ExternalLink size={15} />
            </a>
          )) : <p className="team-review-muted">ไม่มีลิงก์ส่งงาน</p>}
        </div>
      </section>

      <section className="team-review-panel">
        <h2>Submission Files</h2>
        {groupedFiles.length ? (
          <div className="team-review-file-groups">
            {groupedFiles.map((group) => (
              <div key={group.taskName} className="team-review-file-group">
                <h3>{group.taskName}</h3>
                <div className="team-review-file-list">
                  {group.files.map((file, index) => {
                    const kind = fileKind(file)
                    return (
                      <article key={`${file.url}-${index}`} className="team-review-file-card">
                        <header>
                          <div>
                            {fileIcon(kind)}
                            <strong>{file.fileName}</strong>
                          </div>
                          <span>{formatDateTime(file.uploadedAt)}</span>
                        </header>
                        <FilePreview file={file} />
                        <footer>
                          <a href={file.url} target="_blank" rel="noreferrer">
                            <ExternalLink size={14} />
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => downloadFile(file)}
                            disabled={downloadingKey === (file.downloadUrl || file.url)}
                          >
                            <Download size={14} />
                            {downloadingKey === (file.downloadUrl || file.url) ? 'Downloading...' : 'Download'}
                          </button>
                        </footer>
                      </article>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="team-review-muted">ไม่มีไฟล์ส่งงาน</p>}
      </section>

      <section className="team-review-grid team-review-people-grid">
        <article className="team-review-panel team-review-panel-compact">
          <h2><Users size={16} /> Members</h2>
          <div className="team-review-member-list">
            {(payload?.members || []).map((member) => (
              <div key={member.userId} className="team-review-member">
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
                <p>{[member.email, member.phone, member.institution].filter(Boolean).join(' / ') || '-'}</p>
                <p>{[member.educationLevel, member.homeProvince].filter(Boolean).join(' / ') || '-'}</p>
                {member.documentUrl ? (
                  <a href={member.documentUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} />
                    Open ID Bundle ({member.documentCount})
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="team-review-panel team-review-panel-compact">
          <h2>Advisors</h2>
          <div className="team-review-advisor-list">
            {(payload?.advisors || []).length ? payload.advisors.map((advisor, index) => (
              <div key={`${advisor.name}-${index}`}>
                <strong>{advisor.name}</strong>
                <p>{[advisor.email, advisor.phone, advisor.institution].filter(Boolean).join(' / ') || '-'}</p>
              </div>
            )) : <p className="team-review-muted">ไม่มีข้อมูลที่ปรึกษา</p>}
          </div>
        </article>
      </section>
    </main>
  )
}
