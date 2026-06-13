import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, ExternalLink, FileText, Loader2, ShieldCheck, UserRound } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { apiUrl } from '../../lib/api'
import './IdentityReviewPage.css'

const EDUCATION_LABEL = {
  secondary: 'ม.ต้น',
  high_school: 'ม.ปลาย',
  bachelor: 'ป.ตรี',
  master: 'ป.โท',
  doctorate: 'ป.เอก',
}

const ROLE_LABEL = {
  leader: 'หัวหน้าทีม',
  member: 'สมาชิก',
}

function getDownloadFileName(member) {
  const name = String(member?.name || '').trim() || `member-${member?.userId || ''}`
  return `identity_${name}.pdf`.replace(/\s+/g, '_')
}

function MemberDocCard({ member, index, downloadingKey, onDownload }) {
  const hasDoc = Boolean(member.documentUrl) && Number(member.documentCount) > 0
  const downloadUrl = member.documentUrl ? `${member.documentUrl}?download=1` : ''
  const eduLabel = EDUCATION_LABEL[member.educationLevel] || ''

  return (
    <article className="identity-review-card">
      <header className="identity-review-card-header">
        <div className="identity-review-card-identity">
          <span className="identity-review-card-num">{index + 1}</span>
          <div className="identity-review-card-title">
            <strong>{member.name || `สมาชิกคนที่ ${index + 1}`}</strong>
            <div className="identity-review-card-meta">
              <span className="identity-review-role-chip" data-role={member.role}>
                {ROLE_LABEL[member.role] || 'สมาชิก'}
              </span>
              {eduLabel ? <span className="identity-review-meta-pill">{eduLabel}</span> : null}
              {member.institution ? <span className="identity-review-meta-text">{member.institution}</span> : null}
            </div>
          </div>
        </div>
        {hasDoc ? (
          <div className="identity-review-card-actions">
            <a href={member.documentUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              Open
            </a>
            <button
              type="button"
              onClick={() => onDownload(member)}
              disabled={downloadingKey === downloadUrl}
            >
              <Download size={14} />
              {downloadingKey === downloadUrl ? 'Downloading...' : 'Download'}
            </button>
          </div>
        ) : null}
      </header>

      <div className="identity-review-card-preview">
        {hasDoc ? (
          <iframe
            className="identity-review-pdf"
            src={`${member.documentUrl}#toolbar=1&view=FitH`}
            title={`เอกสารยืนยันตัวตน - ${member.name || index + 1}`}
          />
        ) : (
          <div className="identity-review-empty-doc">
            <FileText size={26} />
            <span>ไม่มีเอกสารยืนยันตัวตน</span>
          </div>
        )}
      </div>
    </article>
  )
}

export default function IdentityReviewPage() {
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
        if (!response.ok || !data?.ok) throw new Error(data?.message || 'ไม่สามารถโหลดข้อมูลยืนยันตัวตนได้')
        if (mounted) setPayload(data.data)
      } catch (err) {
        if (mounted) setError(err?.message || 'ไม่สามารถโหลดข้อมูลยืนยันตัวตนได้')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [shareId])

  const members = useMemo(() => payload?.members || [], [payload])
  const membersWithDocs = useMemo(
    () => members.filter((member) => member.documentUrl && Number(member.documentCount) > 0).length,
    [members],
  )

  if (loading) {
    return (
      <main className="identity-review-page identity-review-center">
        <Loader2 className="identity-review-spin" size={28} />
        <p>กำลังโหลดข้อมูลยืนยันตัวตน...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="identity-review-page identity-review-center">
        <AlertTriangle size={30} />
        <h1>เปิดหน้าตรวจสอบตัวตนไม่ได้</h1>
        <p>{error}</p>
      </main>
    )
  }

  const team = payload?.team || {}
  const reviewTrack = payload?.reviewScope?.track || ''

  const downloadFile = async (member) => {
    const downloadUrl = member?.documentUrl ? `${member.documentUrl}?download=1` : ''
    if (!downloadUrl) return

    try {
      setDownloadingKey(downloadUrl)
      const response = await fetch(downloadUrl, { credentials: 'include' })
      if (!response.ok) throw new Error('download failed')

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = getDownloadFileName(member)
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
    <main className="identity-review-page">
      <header className="identity-review-topbar">
        <div className="identity-review-topbar-main">
          <span className="identity-review-eyebrow">
            <ShieldCheck size={14} />
            Identity Verification
          </span>
          <div className="identity-review-team-row">
            <span className="identity-review-team-code">{team.teamCode || '-'}</span>
            {reviewTrack ? (
              <span className="identity-review-track-chip" data-track={reviewTrack}>{reviewTrack} Track</span>
            ) : null}
          </div>
          <h1>{team.teamNameTh || 'Identity Review'}</h1>
        </div>
        <div className="identity-review-topbar-stat">
          <UserRound size={16} />
          <span>
            <strong>{membersWithDocs}</strong> / {members.length} คนมีเอกสาร
          </span>
        </div>
      </header>

      {members.length ? (
        <section className="identity-review-grid" aria-label="เอกสารยืนยันตัวตนของสมาชิก">
          {members.map((member, index) => (
            <MemberDocCard
              key={member.userId ?? index}
              member={member}
              index={index}
              downloadingKey={downloadingKey}
              onDownload={downloadFile}
            />
          ))}
        </section>
      ) : (
        <section className="identity-review-grid identity-review-empty-state">
          <FileText size={28} />
          <p className="identity-review-muted">ไม่มีข้อมูลสมาชิกในทีม</p>
        </section>
      )}
    </main>
  )
}
