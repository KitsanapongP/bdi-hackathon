import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ExternalLink, FileDown, FileText, GraduationCap, Inbox, Printer, RefreshCw, Search, Users, X } from 'lucide-react'
import { apiUrl } from '../../../lib/api'
import PageHeader from '../shared/PageHeader'
import LoadingState from '../shared/LoadingState'
import EmptyState from '../shared/EmptyState'
import { useAdminToast } from '../shared/adminContexts'
import { formatDateTime } from '../utils/adminFormatters'
import './JudgingPage.css'

const STATUS_OPTIONS = [
  { value: 'passed', label: 'ผ่านคัดเลือก' },
  { value: 'confirmed', label: 'ยืนยันเข้าร่วมแล้ว' },
  { value: 'submitted', label: 'ส่งโครงร่างแล้ว' },
  { value: 'failed', label: 'ไม่ผ่านคัดเลือก' },
  { value: 'not_joined', label: 'ไม่เข้าร่วม' },
  { value: 'forming', label: 'กำลังจัดทีม' },
  { value: '', label: 'ทุกสถานะ' },
]
const STATUS_LABELS = {
  forming: 'กำลังจัดทีม',
  submitted: 'ส่งโครงร่างแล้ว',
  passed: 'ผ่านคัดเลือก',
  failed: 'ไม่ผ่านคัดเลือก',
  confirmed: 'ยืนยันเข้าร่วมแล้ว',
  not_joined: 'ไม่เข้าร่วม',
  disbanded: 'ยุบทีม',
}
const STATUS_BADGE = {
  passed: 'admin-log-badge-ok',
  confirmed: 'admin-log-badge-ok',
  submitted: 'admin-log-badge-info',
  failed: 'admin-log-badge-danger',
  not_joined: 'admin-log-badge-muted',
  forming: 'admin-log-badge-warn',
  disbanded: 'admin-log-badge-muted',
}
const GENDER_LABELS = { male: 'ชาย', female: 'หญิง', other: 'อื่น ๆ', prefer_not_to_say: 'ไม่ระบุ' }
const EDUCATION_LABELS = {
  secondary: 'มัธยมต้น',
  high_school: 'มัธยมปลาย/ปวช.',
  bachelor: 'ปริญญาตรี',
  master: 'ปริญญาโท',
  doctorate: 'ปริญญาเอก',
}
const STAGE_LABELS = { pre_selection: 'ก่อนคัดเลือก', training: 'อบรม', onsite: 'หน้างาน' }

function calcAge(birthDate) {
  if (!birthDate) return null
  const dob = new Date(birthDate)
  if (Number.isNaN(dob.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

function memberNameTh(m) {
  const th = [m.firstNameTh, m.lastNameTh].filter(Boolean).join(' ').trim()
  if (th) return th
  const en = [m.firstNameEn, m.lastNameEn].filter(Boolean).join(' ').trim()
  return en || m.userName || '-'
}

function memberNameEn(m) {
  return [m.firstNameEn, m.lastNameEn].filter(Boolean).join(' ').trim()
}

function advisorName(a) {
  if (!a) return '-'
  const parts = [a.prefix, a.firstNameTh, a.lastNameTh].filter(Boolean).join(' ').trim()
  if (parts) return parts
  return [a.firstNameEn, a.lastNameEn].filter(Boolean).join(' ').trim() || '-'
}

function CollapsibleSection({ icon, title, collapsed, onToggle, avoidBreak = true, children }) {
  return (
    <article className={`admin-ui-panel ${avoidBreak ? 'judging-section' : ''}`}>
      <button type="button" className="judging-section-head judging-no-print" onClick={onToggle} aria-expanded={!collapsed}>
        <span className="judging-section-title">{icon} {title}</span>
        <ChevronDown size={18} className={`judging-section-chevron ${collapsed ? '' : 'is-open'}`} />
      </button>
      <h3 className="judging-section-title judging-print-only">{icon} {title}</h3>
      <div className={`judging-section-body ${collapsed ? 'is-collapsed' : ''}`}>
        {children}
      </div>
    </article>
  )
}

export default function JudgingPage() {
  const { pushToast } = useAdminToast()
  const [statusFilter, setStatusFilter] = useState('passed')
  const [search, setSearch] = useState('')
  const [teams, setTeams] = useState([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [dossier, setDossier] = useState(null)
  const [dossierLoading, setDossierLoading] = useState(false)
  const [expandedCv, setExpandedCv] = useState({})
  const [collapsedSections, setCollapsedSections] = useState({})
  const toggleSection = (key) => setCollapsedSections((s) => ({ ...s, [key]: !s[key] }))

  const loadTeams = useCallback(async () => {
    try {
      setTeamsLoading(true)
      const res = await fetch(apiUrl('/api/admin/selection/teams'), { credentials: 'include' })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'โหลดรายชื่อทีมไม่สำเร็จ')
      const dedup = new Map()
      ;(payload.data || []).forEach((row) => {
        if (!row?.team_id || dedup.has(row.team_id)) return
        dedup.set(row.team_id, {
          teamId: row.team_id,
          teamCode: row.team_code,
          teamNameTh: row.team_name_th,
          status: row.status || '',
          memberCount: Number(row.member_count) || 0,
        })
      })
      setTeams(Array.from(dedup.values()))
    } catch (error) {
      pushToast({ variant: 'danger', title: error?.message || 'โหลดรายชื่อทีมไม่สำเร็จ' })
    } finally {
      setTeamsLoading(false)
    }
  }, [pushToast])

  useEffect(() => { loadTeams() }, [loadTeams])

  const visibleTeams = useMemo(() => {
    const q = search.trim().toLowerCase()
    return teams
      .filter((t) => (statusFilter ? t.status === statusFilter : true))
      .filter((t) => (q ? `${t.teamNameTh || ''} ${t.teamCode || ''}`.toLowerCase().includes(q) : true))
      .sort((a, b) => (a.teamNameTh || '').localeCompare(b.teamNameTh || '', 'th'))
  }, [teams, statusFilter, search])

  // เลือกทีมแรกอัตโนมัติเมื่อรายการเปลี่ยน และทีมที่เลือกไว้หลุดออกจาก list
  useEffect(() => {
    if (visibleTeams.length === 0) {
      setSelectedTeamId(null)
      return
    }
    if (!visibleTeams.some((t) => t.teamId === selectedTeamId)) {
      setSelectedTeamId(visibleTeams[0].teamId)
    }
  }, [visibleTeams, selectedTeamId])

  const loadDossier = useCallback(async (teamId) => {
    if (!teamId) { setDossier(null); return }
    try {
      setDossierLoading(true)
      const res = await fetch(apiUrl(`/api/admin/judging/teams/${teamId}/dossier`), { credentials: 'include' })
      const payload = await res.json()
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'โหลดข้อมูลทีมไม่สำเร็จ')
      setDossier(payload.data)
    } catch (error) {
      setDossier(null)
      pushToast({ variant: 'danger', title: error?.message || 'โหลดข้อมูลทีมไม่สำเร็จ' })
    } finally {
      setDossierLoading(false)
    }
  }, [pushToast])

  useEffect(() => { loadDossier(selectedTeamId) }, [selectedTeamId, loadDossier])

  // เปลี่ยนทีม -> รีเซ็ตการหุบ/กางทั้งหมดกลับเป็นค่าเริ่มต้น
  useEffect(() => { setExpandedCv({}); setCollapsedSections({}) }, [selectedTeamId])

  const openSubmission = (item) => {
    if (item.itemType === 'link') {
      window.open(item.linkUrl, '_blank', 'noopener')
    } else {
      window.open(apiUrl(`/api/admin/submissions/files/${item.itemId}/open`), '_blank', 'noopener')
    }
  }

  const teamTrack = useMemo(() => {
    const tracked = dossier?.submissions?.find((s) => s.track)
    return tracked?.track || null
  }, [dossier])

  const team = dossier?.team
  const members = dossier?.members || []
  const advisor = dossier?.advisor

  return (
    <div className="admin-ui-stack judging-page">
      <PageHeader
        title="กรรมการตัดสิน"
        actions={
          <div className="admin-ui-header-actions judging-no-print">
            <button type="button" className="admin-ui-btn" onClick={loadTeams}>
              <RefreshCw size={14} />
              รีเฟรช
            </button>
            <button
              type="button"
              className="admin-ui-btn admin-ui-btn-primary"
              disabled={!team}
              onClick={() => window.print()}
            >
              <Printer size={14} />
              พิมพ์ / บันทึก PDF
            </button>
          </div>
        }
      />

      <article className="admin-ui-panel judging-no-print" style={{ background: 'var(--admin-ui-surface-soft)' }}>
        <p className="admin-ui-text-muted" style={{ margin: 0 }}>
          เลือกทีมจากรายการด้านซ้ายเพื่อดูใบสรุปทีม: ผลงานที่ส่งคัดเลือก ประวัติผู้เข้าแข่งขัน (สถาบัน/ระดับการศึกษา/เพศ/จังหวัด/อายุ)
          และอาจารย์ที่ปรึกษา — กด “พิมพ์ / บันทึก PDF” เพื่อบันทึกใบสรุปทีมที่เลือกเป็น PDF
        </p>
      </article>

      <div className="judging-layout">
        {/* ===== Left rail ===== */}
        <aside className="admin-ui-panel judging-rail judging-no-print">
          <div className="judging-rail-filters">
            <label>
              สถานะทีม
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>
              ค้นหาทีม
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--admin-ui-muted)' }} />
                <input
                  style={{ paddingLeft: 30, paddingRight: search ? 30 : 10, width: '100%' }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="รหัสทีม / ชื่อทีม"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-ui-muted)' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </label>
            <span className="admin-ui-text-muted" style={{ fontSize: 12 }}>พบ {visibleTeams.length} ทีม</span>
          </div>

          <div className="judging-rail-list">
            {teamsLoading ? (
              <LoadingState compact label="กำลังโหลดรายชื่อทีม..." />
            ) : visibleTeams.length ? (
              visibleTeams.map((t) => (
                <button
                  key={t.teamId}
                  type="button"
                  className={`judging-team-item ${t.teamId === selectedTeamId ? 'is-active' : ''}`}
                  onClick={() => setSelectedTeamId(t.teamId)}
                >
                  <strong>{t.teamNameTh || '-'}</strong>
                  <span className="judging-team-item-meta">
                    <span>{t.teamCode}</span>
                    <span className={`admin-log-badge ${STATUS_BADGE[t.status] || 'admin-log-badge-muted'}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <EmptyState compact title="ไม่พบทีมตามเงื่อนไข" />
            )}
          </div>
        </aside>

        {/* ===== Dossier ===== */}
        <section className="judging-dossier">
          {dossierLoading ? (
            <article className="admin-ui-panel"><LoadingState label="กำลังโหลดข้อมูลทีม..." /></article>
          ) : !team ? (
            <article className="admin-ui-panel"><EmptyState title="เลือกทีมเพื่อดูข้อมูล" description="คลิกทีมจากรายการด้านซ้าย" /></article>
          ) : (
            <>
              {/* 1. Team head */}
              <article className="admin-ui-panel judging-section">
                <div className="judging-team-head">
                  <div className="judging-team-head-top">
                    <div>
                      <h2 className="judging-team-name">{team.teamNameTh || '-'}</h2>
                      {team.teamNameEn ? <p className="judging-team-name-en">{team.teamNameEn}</p> : null}
                    </div>
                    <span className={`admin-log-badge ${STATUS_BADGE[team.status] || 'admin-log-badge-muted'}`}>
                      {STATUS_LABELS[team.status] || team.status}
                    </span>
                  </div>
                  <div className="judging-meta-grid">
                    <div className="judging-meta-item">
                      <span className="judging-meta-label">รหัสทีม</span>
                      <span className="judging-meta-value">{team.teamCode || '-'}</span>
                    </div>
                    <div className="judging-meta-item">
                      <span className="judging-meta-label">หัวหน้าทีม</span>
                      <span className="judging-meta-value">{team.leaderName || '-'}</span>
                    </div>
                    <div className="judging-meta-item">
                      <span className="judging-meta-label">จำนวนสมาชิก</span>
                      <span className="judging-meta-value">{members.length} คน</span>
                    </div>
                    <div className="judging-meta-item">
                      <span className="judging-meta-label">Track</span>
                      <span className="judging-meta-value">{teamTrack || '-'}</span>
                    </div>
                  </div>
                  {team.description ? <p className="judging-team-desc">{team.description}</p> : null}
                </div>
              </article>

              {/* 2. Members (always open) */}
              <article className="admin-ui-panel judging-section">
                <h3 className="judging-section-title"><Users size={16} /> สมาชิกทีม &amp; ประวัติ</h3>
                {members.length ? (
                  <div className="admin-ui-table-wrap">
                    <table className="judging-members-table">
                      <thead>
                        <tr>
                          <th>ชื่อ-สกุล</th>
                          <th>บทบาท</th>
                          <th>สถาบัน</th>
                          <th>ระดับการศึกษา</th>
                          <th>เพศ</th>
                          <th>จังหวัด</th>
                          <th>อายุ</th>
                          <th>ติดต่อ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => {
                          const age = calcAge(m.birthDate)
                          const en = memberNameEn(m)
                          return (
                            <tr key={m.userId}>
                              <td className="judging-member-name">
                                <strong>{memberNameTh(m)}</strong>
                                {en ? <span>{en}</span> : null}
                              </td>
                              <td>{m.role === 'leader' ? 'หัวหน้าทีม' : 'สมาชิก'}</td>
                              <td>{m.institutionNameTh || m.institutionNameEn || '-'}</td>
                              <td>{EDUCATION_LABELS[m.educationLevel] || m.educationLevel || '-'}</td>
                              <td>{GENDER_LABELS[m.gender] || m.gender || '-'}</td>
                              <td>{m.homeProvince || '-'}</td>
                              <td>{age != null ? `${age} ปี` : '-'}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span>{m.email || '-'}</span>
                                  {m.phone ? <span>{m.phone}</span> : null}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="judging-empty-inline">— ไม่มีข้อมูลสมาชิก —</p>
                )}
              </article>

              {/* 3. Submissions (collapsible) */}
              <CollapsibleSection
                icon={<Inbox size={16} />}
                title="ผลงานที่ส่งคัดเลือก"
                collapsed={!!collapsedSections.submissions}
                onToggle={() => toggleSection('submissions')}
              >
                {dossier.submissions?.length ? (
                  <div className="judging-submission-list">
                    {dossier.submissions.map((item) => (
                      <div className="judging-submission" key={`${item.itemType}-${item.itemId}`}>
                        <div className="judging-submission-main">
                          <span className="judging-submission-title">{item.title || item.taskName || '-'}</span>
                          <span className="judging-submission-meta">
                            <span className={`admin-log-badge ${item.itemType === 'file' ? 'admin-log-badge-info' : 'admin-log-badge-warn'}`}>
                              {item.itemType === 'file' ? 'ไฟล์' : 'ลิงก์'}
                            </span>
                            <span>{item.taskName}</span>
                            {item.track ? <span>· {item.track}</span> : null}
                            {item.stage ? <span>· {STAGE_LABELS[item.stage] || item.stage}</span> : null}
                            <span>· ส่งเมื่อ {formatDateTime(item.submittedAt)}</span>
                          </span>
                          {item.itemType === 'link' && item.linkUrl ? (
                            <span className="judging-submission-meta judging-print-only">{item.linkUrl}</span>
                          ) : null}
                        </div>
                        <button type="button" className="admin-ui-mini-btn judging-no-print" onClick={() => openSubmission(item)}>
                          {item.itemType === 'file' ? <><FileDown size={13} /> เปิดไฟล์</> : <><ExternalLink size={13} /> เปิดลิงก์</>}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="judging-empty-inline">— ทีมนี้ยังไม่มีผลงานที่ส่งเข้ามา —</p>
                )}
              </CollapsibleSection>

              {/* 4. CV / ประวัติย่อ (collapsible) */}
              <CollapsibleSection
                icon={<FileText size={16} />}
                title="ประวัติย่อ (CV) ของสมาชิก"
                collapsed={!!collapsedSections.cv}
                onToggle={() => toggleSection('cv')}
                avoidBreak={false}
              >
                {members.some((m) => (m.cv || '').trim()) ? (
                  <div className="judging-cv-list">
                    {members.map((m) => {
                      const cv = (m.cv || '').trim()
                      if (!cv) return null
                      const expanded = !!expandedCv[m.userId]
                      const collapsible = cv.length > 160
                      return (
                        <div className="judging-cv-card" key={m.userId}>
                          <div className="judging-cv-card-name">
                            {memberNameTh(m)}
                            <span className="judging-cv-card-role">{m.role === 'leader' ? 'หัวหน้าทีม' : 'สมาชิก'}</span>
                          </div>
                          <p className={`judging-cv-text ${collapsible && !expanded ? 'is-clamped' : ''}`}>{cv}</p>
                          {collapsible ? (
                            <button
                              type="button"
                              className="judging-cv-toggle judging-no-print"
                              onClick={() => setExpandedCv((s) => ({ ...s, [m.userId]: !expanded }))}
                            >
                              {expanded ? 'ย่อ' : 'อ่านเพิ่มเติม'}
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="judging-empty-inline">— สมาชิกยังไม่ได้กรอกประวัติย่อ —</p>
                )}
              </CollapsibleSection>

              {/* 5. Advisor (collapsible) */}
              <CollapsibleSection
                icon={<GraduationCap size={16} />}
                title="อาจารย์ที่ปรึกษา"
                collapsed={!!collapsedSections.advisor}
                onToggle={() => toggleSection('advisor')}
              >
                {advisor ? (
                  <div className="judging-meta-grid">
                    <div className="judging-meta-item">
                      <span className="judging-meta-label">ชื่อ-สกุล</span>
                      <span className="judging-meta-value">{advisorName(advisor)}</span>
                    </div>
                    <div className="judging-meta-item">
                      <span className="judging-meta-label">สถาบัน</span>
                      <span className="judging-meta-value">{advisor.institutionNameTh || '-'}</span>
                    </div>
                    <div className="judging-meta-item">
                      <span className="judging-meta-label">อีเมล</span>
                      <span className="judging-meta-value">{advisor.email || '-'}</span>
                    </div>
                    <div className="judging-meta-item">
                      <span className="judging-meta-label">เบอร์โทร</span>
                      <span className="judging-meta-value">{advisor.phone || '-'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="judging-empty-inline">— ไม่มีอาจารย์ที่ปรึกษา —</p>
                )}
              </CollapsibleSection>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
