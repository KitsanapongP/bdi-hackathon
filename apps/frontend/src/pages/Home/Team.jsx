import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Megaphone,
    Award,
    ShieldCheck,
    BarChart3,
    BookOpen,
    Calendar,
    Crown,
    Copy,
    ChevronLeft,
    Gamepad2,
    Upload,
    Clock,
    CheckCircle,
    Users,
    Plus,
    UserPlus,
    Lock,
    Globe,
    Settings,
    MessageSquare,
    HelpCircle,
} from 'lucide-react';
import { MOCK_TEAMS, TEAM_STATUS_CONFIG } from './mockData';
import './Team.css';
import './Register.css';

const MAX_MEMBERS = 5;

/* ── Card definitions (3×3 grid like Gartic Phone) ── */
const CARDS = [
    { id: 'announce', icon: <Megaphone />, label: 'ประกาศ', color: '#f97316' },
    { id: 'works', icon: <Award />, label: 'ส่งผลงาน', color: '#eab308' },
    { id: 'verify', icon: <ShieldCheck />, label: 'ยืนยันตัวตน', color: '#14b8a6' },
    { id: 'status', icon: <BarChart3 />, label: 'สถานะทีม', color: '#3b82f6' },
    { id: 'rules', icon: <BookOpen />, label: 'กฎกติกา', color: '#ec4899' },
    { id: 'schedule', icon: <Calendar />, label: 'กำหนดการ', color: '#8b5cf6' },
    { id: 'manage', icon: <Settings />, label: 'จัดการทีม', color: '#6366f1' },
    { id: 'contact', icon: <MessageSquare />, label: 'ติดต่อผู้จัด', color: '#0ea5e9' },
    { id: 'help', icon: <HelpCircle />, label: 'ช่วยเหลือ', color: '#10b981' },
];

/* ═══════════════════════════════════════════════════════════════ */
function TeamContent({ user }) {
    const navigate = useNavigate();
    const [team, setTeam] = useState(null);
    const [selectedCard, setSelectedCard] = useState(null);
    const [copied, setCopied] = useState(false);

    /* No-team modal state */
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createPublic, setCreatePublic] = useState(true);
    const [joinCode, setJoinCode] = useState('');

    useEffect(() => {
        if (user?.hasTeam && user?.teamId) {
            setTeam(MOCK_TEAMS[user.teamId] || MOCK_TEAMS['TM001']);
        }
    }, [user]);

    const handleCreateTeam = () => {
        const saved = localStorage.getItem('gt_user');
        if (!saved) return;
        const u = JSON.parse(saved);
        const updatedUser = { ...u, hasTeam: true, teamId: 'TM001', role: 'leader' };
        localStorage.setItem('gt_user', JSON.stringify(updatedUser));
        window.location.reload();
    };

    const handleJoinTeam = () => {
        const saved = localStorage.getItem('gt_user');
        if (!saved) return;
        if (joinCode === 'TM001') {
            const u = JSON.parse(saved);
            const updatedUser = { ...u, hasTeam: true, teamId: joinCode, role: 'member' };
            localStorage.setItem('gt_user', JSON.stringify(updatedUser));
            window.location.reload();
        } else {
            alert('ไม่พบทีมที่มีรหัสนี้ (ลอง: TM001)');
        }
    };

    if (!user) return null;

    /* ── No Team State (inside Gartic Phone theme) ── */
    if (!team) {
        return (
            <div className="gl-page-container">
                <div className="gl-frame gl-frame-center">
                    <div className="gl-no-team">
                        <div className="gl-no-team-icon"><Users size={48} /></div>
                        <h3>คุณยังไม่มีทีม</h3>
                        <p>สร้างทีมใหม่เพื่อเป็นหัวหน้ากลุ่ม หรือเข้าร่วมทีมที่มีอยู่ด้วยรหัสเชิญ</p>
                        <div className="gl-no-team-actions">
                            <button className="gt-btn gt-btn-primary" onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} /> สร้างทีม
                            </button>
                            <button className="gt-btn gt-btn-secondary" onClick={() => setShowJoinModal(true)}>
                                <UserPlus size={18} /> เข้าร่วมทีม
                            </button>
                        </div>
                    </div>
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <div className="gr-modal-backdrop" onClick={() => setShowCreateModal(false)}>
                        <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
                            <h3>🎮 สร้างทีมใหม่</h3>
                            <div className="gr-input-group">
                                <label>ชื่อทีม</label>
                                <input className="gr-input" placeholder="เช่น Team Alpha" value={createName} onChange={(e) => setCreateName(e.target.value)} />
                            </div>
                            <div className="gr-toggle-row">
                                <span className="gr-toggle-label">
                                    {createPublic ? <><Globe size={16} /> Public — ทุกคนเห็นและขอเข้าร่วมได้</> : <><Lock size={16} /> Private — ใช้รหัสเชิญเท่านั้น</>}
                                </span>
                                <button type="button" className={`gr-toggle ${createPublic ? 'on' : ''}`} onClick={() => setCreatePublic(!createPublic)} />
                            </div>
                            <div className="gr-modal-actions">
                                <button className="gt-btn gt-btn-secondary" onClick={() => setShowCreateModal(false)}>ยกเลิก</button>
                                <button className="gt-btn gt-btn-primary" style={{ flex: 1 }} onClick={handleCreateTeam}>สร้างทีม</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Join Modal */}
                {showJoinModal && (
                    <div className="gr-modal-backdrop" onClick={() => setShowJoinModal(false)}>
                        <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
                            <h3>🔗 เข้าร่วมทีม</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--gt-text-muted)', margin: '0 0 16px' }}>
                                กรอกรหัสทีม 6 หลักที่ได้รับจากหัวหน้าทีม
                            </p>
                            <div className="gr-input-group">
                                <label>รหัสทีม</label>
                                <input
                                    className="gr-input"
                                    placeholder="เช่น TM001"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.15em' }}
                                />
                            </div>
                            <div className="gr-modal-actions">
                                <button className="gt-btn gt-btn-secondary" onClick={() => setShowJoinModal(false)}>ยกเลิก</button>
                                <button className="gt-btn gt-btn-primary" style={{ flex: 1 }} onClick={handleJoinTeam}>ขอเข้าร่วม</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const statusInfo = TEAM_STATUS_CONFIG[team.status] || TEAM_STATUS_CONFIG.pending;
    const emptySlots = Math.max(0, MAX_MEMBERS - team.members.length);

    const copyCode = () => {
        navigator.clipboard.writeText(team.code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    /* ── Detail renderers ── */

    const renderAnnounce = () => (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <button className="gl-back-btn" onClick={() => setSelectedCard(null)}>
                    <ChevronLeft size={16} /> กลับ
                </button>
                <h3 className="gl-detail-title"><Megaphone size={20} /> ประกาศ</h3>
            </div>
            <div className="gl-detail-body">
                {team.announcements.length === 0 ? (
                    <div className="gl-empty-state">
                        <Megaphone size={40} />
                        <h3>ยังไม่มีประกาศ</h3>
                        <p>ประกาศจากทีมงานจะแสดงที่นี่</p>
                    </div>
                ) : (
                    team.announcements.map((a, i) => (
                        <div key={i} className="gl-info-card">
                            <span className="gl-date">{a.date}</span>
                            <h4>{a.title}</h4>
                            <p>{a.body}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderWorks = () => (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <button className="gl-back-btn" onClick={() => setSelectedCard(null)}>
                    <ChevronLeft size={16} /> กลับ
                </button>
                <h3 className="gl-detail-title"><Award size={20} /> ส่งผลงาน</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-empty-state">
                    <Upload size={44} />
                    <h3>ยังไม่มีผลงาน</h3>
                    <p>อัปโหลดไฟล์ผลงานของคุณได้ที่นี่ (Zip, PDF)</p>
                    <button className="gl-upload-btn"><Plus size={16} /> อัปโหลดผลงาน</button>
                </div>
            </div>
        </div>
    );

    const renderVerify = () => (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <button className="gl-back-btn" onClick={() => setSelectedCard(null)}>
                    <ChevronLeft size={16} /> กลับ
                </button>
                <h3 className="gl-detail-title"><ShieldCheck size={20} /> ยืนยันตัวตน</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-info-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid var(--gl-border)' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: user.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.3rem', fontWeight: 800 }}>
                            {user.avatar || 'U'}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{user.name}</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--gl-text-dim)' }}>{user.email}</div>
                        </div>
                    </div>
                    <div className="gl-status-row">
                        <div>
                            <div className="gl-status-label">บัตรนักศึกษา / บัตรประชาชน</div>
                            <div className="gl-status-sub">เพื่อยืนยันสถานะการศึกษา</div>
                        </div>
                        <span className="gl-badge-ok"><CheckCircle size={13} /> อนุมัติแล้ว</span>
                    </div>
                    <div className="gl-status-row">
                        <div>
                            <div className="gl-status-label">หนังสือรับรอง (ถ้ามี)</div>
                            <div className="gl-status-sub">เอกสารเพิ่มเติมจากสถาบัน</div>
                        </div>
                        <button className="gl-upload-btn"><Upload size={14} /> อัปโหลด</button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStatus = () => (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <button className="gl-back-btn" onClick={() => setSelectedCard(null)}>
                    <ChevronLeft size={16} /> กลับ
                </button>
                <h3 className="gl-detail-title"><BarChart3 size={20} /> สถานะทีม</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-info-card">
                    <div className="gl-status-row">
                        <div><div className="gl-status-label">สถานะการสมัคร</div></div>
                        <span className="gl-badge-pending"><Clock size={13} /> {statusInfo.label}</span>
                    </div>
                    <div className="gl-status-row">
                        <div><div className="gl-status-label">สมาชิก</div></div>
                        <span style={{ fontWeight: 700 }}>{team.members.length} / {MAX_MEMBERS}</span>
                    </div>
                    <div className="gl-status-row">
                        <div><div className="gl-status-label">สมาชิกที่ยืนยันตัวตน</div></div>
                        <span style={{ fontWeight: 700 }}>{team.members.filter(m => m.verified).length} / {team.members.length}</span>
                    </div>
                    <div className="gl-status-row">
                        <div><div className="gl-status-label">ผลงานที่ส่ง</div></div>
                        <span style={{ fontWeight: 700 }}>{team.works?.length || 0} ไฟล์</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderRules = () => (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <button className="gl-back-btn" onClick={() => setSelectedCard(null)}>
                    <ChevronLeft size={16} /> กลับ
                </button>
                <h3 className="gl-detail-title"><BookOpen size={20} /> กฎกติกา</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-info-card">
                    <h4>📌 กฎกติกาการแข่งขัน</h4>
                    <p>1. แต่ละทีมต้องมีสมาชิก 2-5 คน</p>
                    <p>2. สมาชิกทุกคนต้องยืนยันตัวตนด้วยเอกสาร</p>
                    <p>3. ส่งผลงานภายในวันที่กำหนด</p>
                    <p>4. ผลงานต้องเป็นงานต้นฉบับ ไม่ลอกเลียนแบบ</p>
                    <p>5. การตัดสินของคณะกรรมการถือเป็นที่สิ้นสุด</p>
                </div>
                <div className="gl-info-card">
                    <h4>🏆 เกณฑ์การตัดสิน</h4>
                    <p>• ความคิดสร้างสรรค์ (30%)</p>
                    <p>• ความสมบูรณ์ของผลงาน (30%)</p>
                    <p>• ประสบการณ์ผู้ใช้ (20%)</p>
                    <p>• การนำเสนอ (20%)</p>
                </div>
            </div>
        </div>
    );

    const renderSchedule = () => (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <button className="gl-back-btn" onClick={() => setSelectedCard(null)}>
                    <ChevronLeft size={16} /> กลับ
                </button>
                <h3 className="gl-detail-title"><Calendar size={20} /> กำหนดการ</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-info-card">
                    <h4>📅 กำหนดการสำคัญ</h4>
                    <p style={{ marginTop: 8 }}>🔹 <strong>20 ก.พ.</strong> — ปิดรับสมัครทีม</p>
                    <p>🔹 <strong>22 ก.พ.</strong> — ประกาศทีมที่ผ่านการพิจารณา</p>
                    <p>🔹 <strong>25 ก.พ.</strong> — วันสุดท้ายสำหรับยืนยันตัวตน</p>
                    <p>🔹 <strong>1 มี.ค.</strong> — กิจกรรม Game Jam เริ่มขึ้น!</p>
                    <p>🔹 <strong>3 มี.ค.</strong> — Demo Day & ประกาศผล</p>
                </div>
            </div>
        </div>
    );

    const renderManage = () => (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <button className="gl-back-btn" onClick={() => setSelectedCard(null)}>
                    <ChevronLeft size={16} /> กลับ
                </button>
                <h3 className="gl-detail-title"><Settings size={20} /> จัดการทีม</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-info-card">
                    <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gl-text-dim)', marginBottom: 8, fontWeight: 700 }}>ชื่อทีม</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.1rem', fontWeight: 700 }}>
                        <Gamepad2 size={20} /> {team.name}
                    </div>
                </div>
                <div className="gl-info-card">
                    <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gl-text-dim)', marginBottom: 8, fontWeight: 700 }}>รหัสเข้าร่วมทีม</label>
                    <button className="gl-code-chip" onClick={copyCode}>
                        <Copy size={14} />
                        {team.code}
                        {copied && <span style={{ fontSize: '0.75rem', color: 'var(--gl-teal-light)', marginLeft: 6 }}>คัดลอกแล้ว!</span>}
                    </button>
                </div>
                <div className="gl-info-card">
                    <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gl-text-dim)', marginBottom: 8, fontWeight: 700 }}>สถานะทีม</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1rem', fontWeight: 700 }}>
                        <span className={`gl-status-dot ${team.status}`} />
                        {statusInfo.label}
                    </div>
                </div>
                <div className="gl-info-card">
                    <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gl-text-dim)', marginBottom: 8, fontWeight: 700 }}>จำนวนสมาชิก</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1rem', fontWeight: 700 }}>
                        <Users size={18} /> {team.members.length} / {MAX_MEMBERS} คน
                    </div>
                </div>
            </div>
        </div>
    );

    const renderContact = () => (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <button className="gl-back-btn" onClick={() => setSelectedCard(null)}>
                    <ChevronLeft size={16} /> กลับ
                </button>
                <h3 className="gl-detail-title"><MessageSquare size={20} /> ติดต่อผู้จัด</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-info-card">
                    <h4>📧 ช่องทางติดต่อ</h4>
                    <p style={{ marginTop: 8 }}>🔹 อีเมล: gameevent@university.ac.th</p>
                    <p>🔹 LINE Official: @gameevent2025</p>
                    <p>🔹 Facebook: Game Event 2025</p>
                    <p>🔹 Discord: discord.gg/gameevent</p>
                </div>
                <div className="gl-info-card">
                    <h4>🕐 เวลาทำการ</h4>
                    <p>จันทร์ – ศุกร์ 09:00 – 17:00 น.</p>
                    <p style={{ color: 'var(--gl-text-dim)', fontSize: '0.82rem', marginTop: 4 }}>ตอบกลับภายใน 24 ชั่วโมง</p>
                </div>
            </div>
        </div>
    );

    const renderHelp = () => (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <button className="gl-back-btn" onClick={() => setSelectedCard(null)}>
                    <ChevronLeft size={16} /> กลับ
                </button>
                <h3 className="gl-detail-title"><HelpCircle size={20} /> ช่วยเหลือ</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-info-card">
                    <h4>❓ คำถามที่พบบ่อย</h4>
                    <p style={{ marginTop: 8 }}><strong>Q: สมัครทีมได้สูงสุดกี่คน?</strong></p>
                    <p>A: สูงสุด 5 คนต่อทีม</p>
                    <p style={{ marginTop: 12 }}><strong>Q: ส่งผลงานได้ถึงเมื่อไหร่?</strong></p>
                    <p>A: ภายในวันที่ 1 มี.ค. 2025 เวลา 23:59 น.</p>
                    <p style={{ marginTop: 12 }}><strong>Q: เปลี่ยนสมาชิกในทีมได้ไหม?</strong></p>
                    <p>A: ได้ แต่ต้องแจ้งก่อนวันปิดรับสมัคร</p>
                    <p style={{ marginTop: 12 }}><strong>Q: ยืนยันตัวตนใช้เอกสารอะไร?</strong></p>
                    <p>A: บัตรนักศึกษาหรือบัตรประชาชน</p>
                </div>
            </div>
        </div>
    );

    const DETAIL_MAP = {
        announce: renderAnnounce,
        works: renderWorks,
        verify: renderVerify,
        status: renderStatus,
        rules: renderRules,
        schedule: renderSchedule,
        manage: renderManage,
        contact: renderContact,
        help: renderHelp,
    };

    /* ═══════════════════ RENDER ═══════════════════ */
    return (
        <div className="gl-page-container">
            <div className="gl-frame">

                {/* ── LEFT: Members Panel ── */}
                <aside className="gl-members-panel">
                    <div className="gl-members-header">
                        <h3>สมาชิก {team.members.length}/{MAX_MEMBERS}</h3>
                    </div>

                    <div className="gl-team-badge">
                        <span className="gl-team-badge-name">
                            <Gamepad2 size={18} /> {team.name}
                        </span>
                        <span className={`gl-status-dot ${team.status}`} />
                    </div>

                    <div className="gl-member-list">
                        {team.members.map((m) => (
                            <div key={m.id} className="gl-member-entry">
                                <div className="gl-member-avatar" style={{ background: m.color }}>
                                    {m.name.charAt(0)}
                                    {m.leader && (
                                        <span className="gl-crown-icon">
                                            <Crown size={14} color="#fbbf24" fill="#fbbf24" />
                                        </span>
                                    )}
                                </div>
                                <div className="gl-member-info">
                                    <span className="gl-member-name">{m.name}</span>
                                    <span className="gl-member-role">{m.role}</span>
                                </div>
                            </div>
                        ))}
                        {Array.from({ length: emptySlots }).map((_, i) => (
                            <div key={`empty-${i}`} className="gl-member-entry gl-empty">
                                <div className="gl-member-avatar gl-empty-avatar" />
                                <div className="gl-member-info">
                                    <span className="gl-member-name">ว่างเปล่า</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* ── RIGHT: Content Panel (no tabs, just grid or detail) ── */}
                <main className="gl-content-panel">
                    {selectedCard === null ? (
                        <div className="gl-card-grid">
                            {CARDS.map((card) => (
                                <button
                                    key={card.id}
                                    className="gl-mode-card"
                                    onClick={() => setSelectedCard(card.id)}
                                >
                                    {card.id === 'announce' && team.announcements.length > 0 && (
                                        <span className="gl-mode-badge">{team.announcements.length}</span>
                                    )}
                                    <div className="gl-mode-icon" style={{ background: card.color }}>
                                        {card.icon}
                                    </div>
                                    <span className="gl-mode-label">{card.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        DETAIL_MAP[selectedCard]?.() || null
                    )}
                </main>

            </div>
        </div>
    );
}

export default TeamContent;
