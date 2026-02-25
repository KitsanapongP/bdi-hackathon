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
    ArrowLeft,
    Search,
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
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
    const [navScrolled, setNavScrolled] = useState(false);

    /* No-team view state: null (lobby), 'create', 'join', 'browse' */
    const [activeView, setActiveView] = useState(null);
    const [createName, setCreateName] = useState('');
    const [createPublic, setCreatePublic] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // In a real app, this would be fetched from the API
    // GET /api/teams?visibility=public
    const [publicTeams, setPublicTeams] = useState([
        { id: '2004', code: 'TM2004', name: 'ทีมแมวเหมียว', memberCount: 1 },
        { id: '2005', code: 'TM2005', name: 'ทีมสายฟ้า', memberCount: 1 },
        { id: '2006', code: 'TM2006', name: 'ทีมนกฮูก', memberCount: 1 }
    ]);

    useEffect(() => {
        if (user?.hasTeam && user?.teamId) {
            setTeam(MOCK_TEAMS[user.teamId] || MOCK_TEAMS['TM001']);
        }
    }, [user]);

    /* Scroll listener — slide pill nav up when scrolled past banner */
    useEffect(() => {
        const onScroll = () => setNavScrolled(window.scrollY > 64);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

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

                    {/* Main Lobby View */}
                    {activeView === null && (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="gl-no-team-header">
                                <h3>หาทีมเข้าแข่งขัน</h3>
                                <p>สร้างทีมใหม่เพื่อเป็นหัวหน้ากลุ่ม, เข้าร่วมทีมที่มีอยู่ด้วยรหัสเชิญ หรือค้นหาทีมที่เปิดรับสมาชิก!</p>
                            </div>

                            <div className="gl-lobby-cards">
                                <div className="gl-lobby-card create-card" onClick={() => setActiveView('create')}>
                                    <div className="gl-lobby-card-icon">
                                        <Plus size={36} />
                                    </div>
                                    <div>
                                        <h4>สร้างทีมใหม่</h4>
                                        <p>ตั้งชื่อทีม กำหนดความเป็นส่วนตัว และเป็นหัวหน้าทีม</p>
                                    </div>
                                </div>

                                <div className="gl-lobby-card join-card" onClick={() => setActiveView('join')}>
                                    <div className="gl-lobby-card-icon">
                                        <Lock size={36} />
                                    </div>
                                    <div>
                                        <h4>เข้าร่วมด้วยรหัส</h4>
                                        <p>กรอกรหัส 6 หลักที่ได้รับจากเพื่อนเพื่อขอเข้าร่วมทีม</p>
                                    </div>
                                </div>

                                <div className="gl-lobby-card browse-card" onClick={() => setActiveView('browse')}>
                                    <div className="gl-lobby-card-icon">
                                        <Globe size={36} />
                                    </div>
                                    <div>
                                        <h4>ค้นหาทีมสาธารณะ</h4>
                                        <p>ดูรายชื่อทีมที่เปิดรับสมาชิกใหม่และกดขอเข้าร่วมได้เลย</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Create Team View */}
                    {activeView === 'create' && (
                        <div style={{ width: '100%', maxWidth: '500px' }} className="gl-fade-in-up">
                            <button className="gl-back-btn" onClick={() => setActiveView(null)} style={{ marginBottom: 20 }}>
                                <ChevronLeft size={16} /> ย้อนกลับ
                            </button>
                            <div className="gl-info-card gl-form-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                                    <div className="gl-lobby-card-icon" style={{ width: 56, height: 56, background: '#ec4899', color: 'white', borderRadius: '50%', flexShrink: 0 }}>
                                        <Plus size={28} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>สร้างทีมใหม่</h3>
                                        <p style={{ margin: '4px 0 0', color: 'var(--gl-text-dim)', fontSize: '0.95rem' }}>เริ่มต้นทีมของคุณเองเพื่อเป็นหัวหน้า</p>
                                    </div>
                                </div>

                                <div className="gr-input-group">
                                    <label style={{ color: '#f8fafc' }}>ชื่อทีม</label>
                                    <input className="gr-input" placeholder="เช่น Team Alpha" value={createName} onChange={(e) => setCreateName(e.target.value)} />
                                </div>

                                <div className="gr-toggle-row" style={{ marginTop: 24, marginBottom: 36 }}>
                                    <span className="gr-toggle-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {createPublic ? <><Globe size={16} style={{ color: '#10b981' }} /> Public — ทุกคนเห็นและขอเข้าร่วมได้</> : <><Lock size={16} style={{ color: '#ec4899' }} /> Private — ใช้รหัสเชิญเท่านั้น</>}
                                    </span>
                                    <button type="button" className={`gr-toggle ${createPublic ? 'on' : ''}`} onClick={() => setCreatePublic(!createPublic)} style={{ background: createPublic ? '#10b981' : '#cbd5e1' }} />
                                </div>

                                <button className="gt-btn gt-btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.05rem', background: '#ec4899' }} onClick={handleCreateTeam}>
                                    ยืนยันการสร้างทีม
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Join Team View */}
                    {activeView === 'join' && (
                        <div style={{ width: '100%', maxWidth: '500px' }} className="gl-fade-in-up">
                            <button className="gl-back-btn" onClick={() => setActiveView(null)} style={{ marginBottom: 20 }}>
                                <ChevronLeft size={16} /> ย้อนกลับ
                            </button>
                            <div className="gl-info-card gl-form-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                                    <div className="gl-lobby-card-icon" style={{ width: 56, height: 56, background: '#3b82f6', color: 'white', borderRadius: '50%', flexShrink: 0 }}>
                                        <Lock size={28} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>เข้าร่วมด้วยรหัส</h3>
                                        <p style={{ margin: '4px 0 0', color: 'var(--gl-text-dim)', fontSize: '0.95rem', lineHeight: 1.4 }}>
                                            กรอกรหัสทีม 6 หลักที่ได้รับจากหัวหน้าทีม
                                        </p>
                                    </div>
                                </div>

                                <div className="gr-input-group" style={{ marginBottom: 36 }}>
                                    <input
                                        className="gr-input"
                                        placeholder="เช่น TM001"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.6rem', textAlign: 'center', letterSpacing: '0.25em', padding: '18px', fontWeight: 700 }}
                                    />
                                </div>

                                <button className="gt-btn gt-btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.05rem', background: '#3b82f6' }} onClick={handleJoinTeam}>
                                    ส่งคำขอเข้าร่วม
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Browse Public Teams View */}
                    {activeView === 'browse' && (
                        <div style={{ width: '100%', maxWidth: '640px' }} className="gl-fade-in-up">
                            <button className="gl-back-btn" onClick={() => setActiveView(null)} style={{ marginBottom: 20 }}>
                                <ChevronLeft size={16} /> ย้อนกลับ
                            </button>

                            <div className="gl-info-card gl-form-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                                    <div className="gl-lobby-card-icon" style={{ width: 56, height: 56, background: '#10b981', color: 'white', borderRadius: '50%', flexShrink: 0 }}>
                                        <Globe size={28} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>ค้นหาทีมสาธารณะ</h3>
                                        <p style={{ margin: '4px 0 0', color: 'var(--gl-text-dim)', fontSize: '0.95rem' }}>ค้นหาและขอเข้าร่วมทีมที่กำลังเปิดรับสมาชิกใหม่</p>
                                    </div>
                                </div>

                                <div className="gr-input-group" style={{ marginBottom: 24 }}>
                                    <label style={{ color: '#f8fafc' }}>ค้นหาชื่อทีม</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>
                                            <Search size={20} />
                                        </span>
                                        <input
                                            className="gr-input"
                                            placeholder="พิมพ์ชื่อทีมที่ต้องการค้นหา..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{ paddingLeft: 46, padding: '14px 14px 14px 46px', fontSize: '1.05rem', borderRadius: 'var(--gl-radius-lg)', border: '2px solid var(--gl-border)' }}
                                        />
                                    </div>
                                </div>

                                <div className="gl-browse-list" style={{ flex: 1, maxHeight: '350px', overflowY: 'auto', padding: '16px', background: 'rgba(0,0,0,0.15)', border: '2px solid rgba(255,255,255,0.05)', borderRadius: '16px', boxShadow: 'inset 0 6px 12px rgba(0,0,0,0.1)' }}>
                                    {publicTeams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                                        publicTeams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map(t => (
                                            <div key={t.id} className="gl-browse-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '2px solid var(--gl-border)', borderRadius: 'var(--gl-radius-lg)', marginBottom: '12px', background: 'var(--gl-bg-light)', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                                <div className="gl-browse-item-info" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <div className="gl-browse-item-avatar" style={{ width: 44, height: 44, fontSize: '1.3rem', border: 'none', background: '#e2e8f0', color: '#475569', borderRadius: 'var(--gl-radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                        {t.name.charAt(0)}
                                                    </div>
                                                    <div className="gl-browse-item-details">
                                                        <h4 className="gl-browse-item-name" style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 'bold' }}>{t.name}</h4>
                                                        <div className="gl-browse-item-meta" style={{ display: 'flex', gap: 10 }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600 }}>
                                                                <Users size={14} /> {t.memberCount}/{MAX_MEMBERS}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="gl-browse-item-action">
                                                    <button
                                                        className="gt-btn gt-btn-primary"
                                                        style={{ padding: '8px 20px', fontSize: '0.95rem', background: '#10b981', color: '#fff', borderRadius: 'var(--gl-radius-md)' }}
                                                        onClick={() => {
                                                            const p = prompt(`ส่งข้อความแนะนำตัวถึงหัวหน้า ${t.name} (ไม่บังคับ):`);
                                                            if (p !== null) {
                                                                alert(`ส่งคำขอเข้าร่วมทีม ${t.name} เรียบร้อยแล้ว! รบกวนรอการตอบรับ`);
                                                                setActiveView(null);
                                                            }
                                                        }}
                                                    >
                                                        ขอเข้าร่วม
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="gl-empty-state" style={{ padding: '48px 16px', border: '2px dashed var(--gl-border)', borderRadius: 'var(--gl-radius-lg)', textAlign: 'center' }}>
                                            <Globe size={48} style={{ opacity: 0.2, marginBottom: 16, color: 'var(--gl-text-dim)', margin: '0 auto 16px auto' }} />
                                            <h4 style={{ fontSize: '1.25rem', marginBottom: 8, color: 'var(--gl-text)' }}>ไม่พบทีมที่ค้นหา</h4>
                                            <p style={{ color: 'var(--gl-text-dim)', fontSize: '0.95rem', margin: 0 }}>ลองเปลี่ยนคำค้นหาใหม่ หรือลองสร้างทีมของคุณเองเลย!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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
            {/* Pill Navigation */}
            <nav className={`gt-pill-nav ${navScrolled ? 'scrolled' : ''}`}>
                <div className="gt-pill-bar">
                    <button className="gt-pill-icon" onClick={() => navigate('/home')} aria-label="Back to Home">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="gt-pill-right">
                        <ThemeToggle />
                    </div>
                </div>
            </nav>

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
