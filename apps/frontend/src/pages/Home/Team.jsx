import React, { useEffect, useMemo, useState } from 'react';
import {
    Award,
    BarChart3,
    BookOpen,
    Calendar,
    CheckCircle,
    ChevronLeft,
    Clock,
    Copy,
    Crown,
    Gamepad2,
    Globe,
    HelpCircle,
    Lock,
    LogOut,
    Mail,
    Megaphone,
    MessageSquare,
    Plus,
    Search,
    Settings,
    ShieldCheck,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { TEAM_STATUS_CONFIG } from './mockData';
import { apiUrl } from '../../lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import './Team.css';
import './Register.css';

const MAX_MEMBERS = 5;

const CARDS = [
    { id: 'announce', icon: <Megaphone />, label: 'ประกาศ', color: '#f97316' },
    { id: 'works', icon: <Award />, label: 'ส่งผลงาน', color: '#eab308' },
    { id: 'verify', icon: <ShieldCheck />, label: 'ยืนยันตัวตน', color: '#14b8a6' },
    { id: 'status', icon: <BarChart3 />, label: 'สถานะทีม', color: '#3b82f6' },
    { id: 'rules', icon: <BookOpen />, label: 'กติกา', color: '#ec4899' },
    { id: 'schedule', icon: <Calendar />, label: 'กำหนดการ', color: '#8b5cf6' },
    { id: 'manage', icon: <Settings />, label: 'จัดการทีม', color: '#6366f1' },
    { id: 'contact', icon: <MessageSquare />, label: 'ติดต่อผู้จัด', color: '#0ea5e9' },
    { id: 'help', icon: <HelpCircle />, label: 'ช่วยเหลือ', color: '#10b981' },
];

const normalizeStatus = (raw) => {
    const key = String(raw || 'forming').toLowerCase();
    return TEAM_STATUS_CONFIG[key] ? key : 'forming';
};

const roleLabel = (role) => (role === 'leader' ? 'หัวหน้า' : 'สมาชิก');

export default function TeamContent({ user }) {
    const [team, setTeam] = useState(null);
    const [isLoadingTeam, setIsLoadingTeam] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [copied, setCopied] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', variant: 'danger', onConfirm: null, hideCancel: false, confirmLabel: 'ยืนยัน', cancelLabel: 'ยกเลิก' });

    const openConfirm = (title, message, onConfirm, variant = 'danger') => {
        setConfirmState({ open: true, title, message, onConfirm, variant, hideCancel: false, confirmLabel: 'ยืนยัน', cancelLabel: 'ยกเลิก' });
    };
    const openAlert = (title, message, variant = 'danger') => {
        setConfirmState({
            open: true,
            title,
            message,
            variant,
            hideCancel: true,
            confirmLabel: 'ตกลง',
            onConfirm: () => setConfirmState(s => ({ ...s, open: false })),
            onCancel: () => setConfirmState(s => ({ ...s, open: false }))
        });
    };
    const closeConfirm = () => setConfirmState((s) => ({ ...s, open: false }));

    const [activeView, setActiveView] = useState(null);
    const [createName, setCreateName] = useState('');
    const [createPublic, setCreatePublic] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [inviteUserNameInput, setInviteUserNameInput] = useState('');

    const [publicTeams, setPublicTeams] = useState([]);
    const [myInvitations, setMyInvitations] = useState([]);
    const [pendingJoinRequests, setPendingJoinRequests] = useState([]);

    const isLeader = useMemo(() => team?.leaderUserId === user?.userId, [team, user]);
    const hasPendingJoinRequests = pendingJoinRequests.length > 0;
    const sortedMembers = useMemo(() => {
        if (!team?.members) return [];
        return [...team.members].sort((a, b) => {
            if (a.leader && !b.leader) return -1;
            if (!a.leader && b.leader) return 1;
            return a.id - b.id;
        });
    }, [team]);

    useEffect(() => {
        if (!user?.hasTeam || !user?.teamId) return;
        setIsLoadingTeam(true);
        fetch(apiUrl(`/api/teams/${user.teamId}`), { credentials: 'include' })
            .then((res) => res.json())
            .then((payload) => {
                if (!payload.ok || !payload.data) return;
                const { team: dbTeam, members: dbMembers, activeCode } = payload.data;
                const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
                const mappedMembers = dbMembers.map((m, idx) => ({
                    id: m.user_id,
                    name: m.show_real_name && m.first_name_th ? m.first_name_th : (m.user_name || `ผู้ใช้ ${m.user_id}`),
                    role: m.role || 'member',
                    leader: dbTeam.current_leader_user_id === m.user_id,
                    color: colors[idx % colors.length],
                    verified: true,
                })).sort((a, b) => {
                    if (a.leader && !b.leader) return -1;
                    if (!a.leader && b.leader) return 1;
                    return a.id - b.id;
                });

                setTeam({
                    id: dbTeam.team_id,
                    name: dbTeam.team_name_th,
                    status: normalizeStatus(dbTeam.status),
                    code: dbTeam.team_code || '------',
                    inviteCode: activeCode || '------',
                    leaderUserId: dbTeam.current_leader_user_id,
                    members: mappedMembers,
                    announcements: [],
                    works: [],
                });
            })
            .catch((err) => console.error('failed to fetch team details', err))
            .finally(() => setIsLoadingTeam(false));
    }, [user]);

    useEffect(() => {
        if (activeView !== 'browse') return;
        fetch(apiUrl('/api/teams?visibility=public'), { credentials: 'include' })
            .then((res) => res.json())
            .then((payload) => {
                if (!payload.ok || !Array.isArray(payload.data)) return;
                setPublicTeams(payload.data.map((t) => ({
                    id: t.team_id,
                    name: t.team_name_th,
                    memberCount: t.member_count || 1,
                })));
            })
            .catch((err) => console.error('failed to fetch public teams', err));
    }, [activeView]);

    useEffect(() => {
        if (user?.hasTeam) {
            setMyInvitations([]);
            return;
        }
        fetch(apiUrl('/api/teams/my-invitations'), { credentials: 'include' })
            .then((res) => res.json())
            .then((payload) => {
                if (payload.ok && Array.isArray(payload.data)) setMyInvitations(payload.data);
            })
            .catch((err) => console.error('failed to fetch invitations', err));
    }, [user]);

    useEffect(() => {
        if (!user?.hasTeam || !user?.teamId || !isLeader) {
            setPendingJoinRequests([]);
            return;
        }
        fetch(apiUrl(`/api/teams/${user.teamId}/join-requests`), { credentials: 'include' })
            .then((res) => res.json())
            .then((payload) => {
                if (payload.ok && Array.isArray(payload.data)) setPendingJoinRequests(payload.data);
            })
            .catch((err) => console.error('failed to fetch join requests', err));
    }, [user, isLeader]);

    const withAction = async (fn) => {
        try {
            setActionLoading(true);
            await fn();
        } catch (err) {
            openAlert('เกิดข้อผิดพลาด', err.message, 'danger');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateTeam = () => withAction(async () => {
        if (!createName.trim()) return;
        const res = await fetch(apiUrl('/api/teams'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                teamNameTh: createName,
                teamNameEn: createName,
                visibility: createPublic ? 'public' : 'private',
            }),
        });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.message || 'สร้างทีมไม่สำเร็จ');
        window.location.reload();
    });

    const handleJoinByCode = () => withAction(async () => {
        if (!joinCode.trim()) return;
        const res = await fetch(apiUrl('/api/teams/join-by-code'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ inviteCode: joinCode }),
        });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.message || 'ส่งคำขอเข้าร่วมทีมไม่สำเร็จ');
        setJoinCode('');
        openAlert('สำเร็จ', 'ส่งคำขอเข้าร่วมทีมแล้ว กรุณารอหัวหน้าทีมอนุมัติ', 'success');
    });

    const handleRequestPublicTeam = (teamId) => withAction(async () => {
        const res = await fetch(apiUrl(`/api/teams/${teamId}/join-requests`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({}),
        });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.message || 'ส่งคำขอเข้าร่วมทีมไม่สำเร็จ');
        openAlert('สำเร็จ', 'ส่งคำขอเข้าร่วมทีมสำเร็จ', 'success');
        setActiveView(null);
    });

    const handleRespondInvitation = (invitationId, status) => withAction(async () => {
        const res = await fetch(apiUrl(`/api/teams/invitations/${invitationId}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status }),
        });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.message || 'ดำเนินการคำเชิญไม่สำเร็จ');
        setMyInvitations((prev) => prev.filter((item) => item.invitation_id !== invitationId));
        if (status === 'accepted') window.location.reload();
    });

    const handleRespondJoinRequest = (requestId, status) => withAction(async () => {
        const res = await fetch(apiUrl(`/api/teams/${team.id}/join-requests/${requestId}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status }),
        });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.message || 'ดำเนินการคำขอเข้าร่วมไม่สำเร็จ');
        setPendingJoinRequests((prev) => prev.filter((item) => item.join_request_id !== requestId));
        if (status === 'approved') window.location.reload();
    });

    const handleInviteMember = () => withAction(async () => {
        if (!team?.id) return;
        const inviteeUserName = inviteUserNameInput.trim();
        if (!inviteeUserName) {
            throw new Error('กรุณากรอก username ที่ต้องการเชิญ');
        }
        const res = await fetch(apiUrl(`/api/teams/${team.id}/invitations`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ inviteeUserName }),
        });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.message || 'ส่งคำเชิญไม่สำเร็จ');
        setInviteUserNameInput('');
        openAlert('สำเร็จ', 'ส่งคำเชิญสำเร็จ', 'success');
    });

    const handleRemoveMember = (memberUserId) => {
        openConfirm('เตะสมาชิกออกจากทีม', 'คุณแน่ใจหรือไม่ว่าต้องการเตะสมาชิกคนนี้ออกจากทีม?', () => {
            closeConfirm();
            withAction(async () => {
                if (!team?.id) return;
                const res = await fetch(apiUrl(`/api/teams/${team.id}/members/${memberUserId}`), {
                    method: 'DELETE',
                    credentials: 'include',
                });
                const payload = await res.json();
                if (!payload.ok) throw new Error(payload.message || 'ลบสมาชิกไม่สำเร็จ');
                setTeam((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.id !== memberUserId) } : prev);
                openAlert('สำเร็จ', 'ลบสมาชิกสำเร็จ', 'success');
            });
        }, 'danger');
    };

    const handleLeaveCurrentTeam = () => {
        openConfirm('ออกจากทีม', 'คุณแน่ใจหรือไม่ว่าต้องการออกจากทีมนี้?', () => {
            closeConfirm();
            withAction(async () => {
                if (!team?.id || !user?.userId) return;
                const res = await fetch(apiUrl(`/api/teams/${team.id}/members/${user.userId}`), {
                    method: 'DELETE',
                    credentials: 'include',
                });
                const payload = await res.json();
                if (!payload.ok) throw new Error(payload.message || 'ออกจากทีมไม่สำเร็จ');
                window.location.reload();
            });
        }, 'danger');
    };

    const handleTransferLeader = (newLeaderUserId) => {
        const targetMember = sortedMembers.find((m) => m.id === newLeaderUserId);
        openConfirm('โอนหัวหน้าทีม', `คุณแน่ใจหรือไม่ว่าต้องการโอนตำแหน่งหัวหน้าทีมให้ ${targetMember?.name || 'สมาชิกคนนี้'}?`, () => {
            closeConfirm();
            withAction(async () => {
                if (!team?.id) return;
                const res = await fetch(apiUrl(`/api/teams/${team.id}/leader`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ newLeaderUserId }),
                });
                const payload = await res.json();
                if (!payload.ok) throw new Error(payload.message || 'โอนหัวหน้าทีมไม่สำเร็จ');
                openAlert('สำเร็จ', 'โอนหัวหน้าทีมสำเร็จ', 'success');
                window.location.reload();
            });
        }, 'warning');
    };

    if (!user) return null;
    if (isLoadingTeam) return <div className="gl-page-container"><div className="gl-frame gl-frame-center"><h3>กำลังโหลดข้อมูลทีม...</h3></div></div>;

    if (!user.hasTeam) {
        const filteredTeams = publicTeams.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return (
            <div className="gl-page-container">
                <div className="gl-frame gl-frame-center">

                    {/* ── Lobby Home (2x2 grid) ── */}
                    {activeView === null && (
                        <div className="gl-lobby-home">
                            <div className="gl-lobby-welcome">
                                <div className="gl-lobby-welcome-icon">
                                    <Users size={32} />
                                </div>
                                <h2>ค้นหาทีมของคุณ</h2>
                                <p>เริ่มต้นการแข่งขันโดยสร้างทีมใหม่ หรือเข้าร่วมทีมที่มีอยู่แล้ว</p>
                            </div>
                            <div className="gl-lobby-cards gl-lobby-2x2">
                                <div className="gl-lobby-card create-card" onClick={() => setActiveView('create')}>
                                    <div className="gl-lobby-card-icon"><Plus size={28} /></div>
                                    <div className="gl-lobby-card-text">
                                        <h4>สร้างทีม</h4>
                                        <p>สร้างทีมใหม่และเชิญเพื่อนเข้าร่วม</p>
                                    </div>
                                </div>
                                <div className="gl-lobby-card join-card" onClick={() => setActiveView('join')}>
                                    <div className="gl-lobby-card-icon"><Lock size={28} /></div>
                                    <div className="gl-lobby-card-text">
                                        <h4>เข้าทีมด้วยโค้ด</h4>
                                        <p>ใช้รหัสเชิญเพื่อเข้าร่วมทีมส่วนตัว</p>
                                    </div>
                                </div>
                                <div className="gl-lobby-card browse-card" onClick={() => setActiveView('browse')}>
                                    <div className="gl-lobby-card-icon"><Globe size={28} /></div>
                                    <div className="gl-lobby-card-text">
                                        <h4>ค้นหาทีมสาธารณะ</h4>
                                        <p>ดูรายชื่อทีมที่เปิดรับสมาชิก</p>
                                    </div>
                                </div>
                                <div className="gl-lobby-card invite-card" onClick={() => setActiveView('invitations')}>
                                    {myInvitations.length > 0 && (
                                        <span className="gl-lobby-card-badge">{myInvitations.length}</span>
                                    )}
                                    <div className="gl-lobby-card-icon"><Mail size={28} /></div>
                                    <div className="gl-lobby-card-text">
                                        <h4>คำเชิญเข้าทีม</h4>
                                        <p>ดูคำเชิญที่ได้รับจากทีมอื่น</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Create Team View ── */}
                    {activeView === 'create' && (
                        <div className="gl-inner-view">
                            <div className="gl-inner-header">
                                <button className="gl-back-btn" onClick={() => setActiveView(null)}><ChevronLeft size={16} /> ย้อนกลับ</button>
                                <div className="gl-inner-header-icon create-icon"><Plus size={24} /></div>
                                <div>
                                    <h3>สร้างทีมใหม่</h3>
                                    <p>กรอกข้อมูลด้านล่างเพื่อสร้างทีมของคุณ</p>
                                </div>
                            </div>
                            <div className="gl-inner-form">
                                <div className="gl-form-field">
                                    <label className="gl-form-label">ชื่อทีม</label>
                                    <input className="gl-form-input" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="ตั้งชื่อทีมของคุณ" />
                                </div>
                                <div className="gl-form-toggle-row">
                                    <div className="gl-form-toggle-info">
                                        <span className="gl-form-toggle-label">{createPublic ? 'สาธารณะ' : 'ส่วนตัว'}</span>
                                        <span className="gl-form-toggle-desc">{createPublic ? 'ทุกคนสามารถค้นหาและขอเข้าร่วมทีมได้' : 'เข้าร่วมได้ด้วยรหัสเชิญเท่านั้น'}</span>
                                    </div>
                                    <button type="button" className={`gl-form-toggle ${createPublic ? 'on' : ''}`} onClick={() => setCreatePublic((v) => !v)} />
                                </div>
                                <button className="gl-form-submit gl-btn-pink" disabled={actionLoading || !createName.trim()} onClick={handleCreateTeam}>
                                    <Plus size={18} /> สร้างทีม
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Join by Code View ── */}
                    {activeView === 'join' && (
                        <div className="gl-inner-view">
                            <div className="gl-inner-header">
                                <button className="gl-back-btn" onClick={() => setActiveView(null)}><ChevronLeft size={16} /> ย้อนกลับ</button>
                                <div className="gl-inner-header-icon join-icon"><Lock size={24} /></div>
                                <div>
                                    <h3>เข้าทีมด้วยรหัสเชิญ</h3>
                                    <p>กรอกรหัสเชิญที่ได้รับจากหัวหน้าทีม</p>
                                </div>
                            </div>
                            <div className="gl-inner-form">
                                <div className="gl-form-field">
                                    <label className="gl-form-label">รหัสเชิญ</label>
                                    <input className="gl-form-input gl-form-code-input" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="เช่น ABC123" />
                                </div>
                                <button className="gl-form-submit gl-btn-blue" disabled={actionLoading || !joinCode.trim()} onClick={handleJoinByCode}>
                                    <UserPlus size={18} /> ส่งคำขอเข้าร่วม
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Browse Public Teams View ── */}
                    {activeView === 'browse' && (
                        <div className="gl-inner-view gl-inner-wide">
                            <div className="gl-inner-header">
                                <button className="gl-back-btn" onClick={() => setActiveView(null)}><ChevronLeft size={16} /> ย้อนกลับ</button>
                                <div className="gl-inner-header-icon browse-icon"><Globe size={24} /></div>
                                <div>
                                    <h3>ค้นหาทีมสาธารณะ</h3>
                                    <p>เลือกทีมที่คุณสนใจแล้วส่งคำขอเข้าร่วม</p>
                                </div>
                            </div>
                            <div className="gl-inner-form">
                                <div className="gl-search-wrap">
                                    <Search size={18} className="gl-search-icon" />
                                    <input className="gl-form-input gl-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหาทีม..." />
                                </div>
                                <div className="gl-browse-list">
                                    {filteredTeams.length === 0 && (
                                        <div className="gl-browse-empty">
                                            <Search size={32} />
                                            <span>ไม่พบทีมที่ค้นหา</span>
                                        </div>
                                    )}
                                    {filteredTeams.map((t) => (
                                        <div key={t.id} className="gl-browse-item">
                                            <div className="gl-browse-item-left">
                                                <div className="gl-browse-team-avatar">{t.name.charAt(0)}</div>
                                                <div className="gl-browse-team-info">
                                                    <span className="gl-browse-team-name">{t.name}</span>
                                                    <span className="gl-browse-team-meta"><Users size={13} /> {t.memberCount}/{MAX_MEMBERS} คน</span>
                                                </div>
                                            </div>
                                            <button className="gl-browse-join-btn gl-btn-green" disabled={actionLoading} onClick={() => handleRequestPublicTeam(t.id)}>
                                                <UserPlus size={15} /> ขอเข้าร่วม
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Invitations View ── */}
                    {activeView === 'invitations' && (
                        <div className="gl-inner-view gl-inner-wide">
                            <div className="gl-inner-header">
                                <button className="gl-back-btn" onClick={() => setActiveView(null)}><ChevronLeft size={16} /> ย้อนกลับ</button>
                                <div className="gl-inner-header-icon invite-icon-header"><Mail size={24} /></div>
                                <div>
                                    <h3>คำเชิญเข้าทีม</h3>
                                    <p>{myInvitations.length > 0 ? `คุณมี ${myInvitations.length} คำเชิญที่รอดำเนินการ` : 'ยังไม่มีคำเชิญในขณะนี้'}</p>
                                </div>
                            </div>
                            <div className="gl-inner-form">
                                {myInvitations.length === 0 && (
                                    <div className="gl-browse-empty">
                                        <Mail size={36} />
                                        <span>ยังไม่มีคำเชิญ</span>
                                        <p>เมื่อมีทีมเชิญคุณเข้าร่วม จะแสดงที่นี่</p>
                                    </div>
                                )}
                                <div className="gl-inv-list">
                                    {myInvitations.map((inv) => (
                                        <div key={inv.invitation_id} className="gl-inv-card">
                                            <div className="gl-inv-card-left">
                                                <div className="gl-inv-avatar">
                                                    {(inv.team_name_th || 'T').charAt(0)}
                                                </div>
                                                <div className="gl-inv-info">
                                                    <span className="gl-inv-team-name">{inv.team_name_th || `ทีม #${inv.team_id}`}</span>
                                                    <span className="gl-inv-from">เชิญโดย {inv.invited_by_user_name || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="gl-inv-actions">
                                                <button className="gl-inv-btn gl-inv-accept" disabled={actionLoading} onClick={() => handleRespondInvitation(inv.invitation_id, 'accepted')}>
                                                    <CheckCircle size={15} /> ยอมรับ
                                                </button>
                                                <button className="gl-inv-btn gl-inv-decline" disabled={actionLoading} onClick={() => handleRespondInvitation(inv.invitation_id, 'declined')}>
                                                    <X size={15} /> ปฏิเสธ
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <ConfirmModal
                    open={confirmState.open}
                    title={confirmState.title}
                    message={confirmState.message}
                    variant={confirmState.variant}
                    hideCancel={confirmState.hideCancel}
                    confirmLabel={confirmState.confirmLabel}
                    cancelLabel={confirmState.cancelLabel}
                    onConfirm={confirmState.onConfirm}
                    onCancel={closeConfirm}
                />
            </div>
        );
    }

    if (!team) return <div className="gl-page-container"><div className="gl-frame gl-frame-center"><h3>กำลังโหลดข้อมูลทีม...</h3></div></div>;

    const statusInfo = TEAM_STATUS_CONFIG[team.status] || TEAM_STATUS_CONFIG.forming;
    const emptySlots = Math.max(0, MAX_MEMBERS - team.members.length);
    const teamInviteCode = team.inviteCode || '------';

    const renderSimpleDetail = (title, icon, body) => (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <button className="gl-back-btn" onClick={() => setSelectedCard(null)}><ChevronLeft size={16} /> ย้อนกลับ</button>
                <h3 className="gl-detail-title">{icon} {title}</h3>
            </div>
            <div className="gl-detail-body">{body}</div>
        </div>
    );

    const renderStatus = () => renderSimpleDetail(
        'สถานะทีม',
        <BarChart3 size={20} />,
        <div className="gl-info-card">
            <div className="gl-status-row"><div className="gl-status-label">สถานะปัจจุบัน</div><span className="gl-badge-pending"><Clock size={13} /> {statusInfo.label}</span></div>
            <div className="gl-status-row"><div className="gl-status-label">สมาชิก</div><span>{team.members.length}/{MAX_MEMBERS}</span></div>
            <div className="gl-status-row"><div className="gl-status-label">สมาชิกที่ยืนยันตัวตน</div><span>{team.members.filter((m) => m.verified).length}/{team.members.length}</span></div>
            <div className="gl-status-row"><div className="gl-status-label">ผลงานที่ส่ง</div><span>{team.works.length}</span></div>
        </div>
    );

    const renderManage = () => renderSimpleDetail(
        'จัดการทีม',
        <Settings size={20} />,
        <div>
            {/* Team info cards */}
            <div className="gl-team-info-card">
                <span className="gl-team-info-label"><Gamepad2 size={13} /> ชื่อทีม</span>
                <div className="gl-team-info-value">{team.name}</div>
            </div>
            <div className="gl-team-info-card">
                <span className="gl-team-info-label"><Users size={13} /> รหัสทีม</span>
                <div className="gl-team-info-value">{team.code}</div>
            </div>
            <div className="gl-team-info-card">
                <span className="gl-team-info-label"><BarChart3 size={13} /> สถานะทีม</span>
                <div className="gl-team-info-value gl-team-info-status">
                    <span className={`gl-status-dot ${team.status}`} /> {statusInfo.label}
                </div>
            </div>
            <div className="gl-team-info-card">
                <span className="gl-team-info-label"><Users size={13} /> จำนวนสมาชิก</span>
                <div className="gl-team-info-value">{team.members.length} / {MAX_MEMBERS} คน</div>
            </div>

            {isLeader && (
                <>
                    <div className="gl-team-info-card">
                        <span className="gl-team-info-label"><Copy size={13} /> เชิญเข้าทีม</span>
                        <div className="gl-invite-row">
                            <button className="gl-code-chip" onClick={() => navigator.clipboard.writeText(teamInviteCode).then(() => setCopied(true))}>
                                <Copy size={14} /> {teamInviteCode}
                            </button>
                            {copied && <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>คัดลอกสำเร็จ</span>}
                            <div className="gl-invite-input-group">
                                <input className="gr-input" value={inviteUserNameInput} onChange={(e) => setInviteUserNameInput(e.target.value)} placeholder="ใส่ username เพื่อเชิญ" />
                                <button className="gt-btn gt-btn-primary" disabled={actionLoading} onClick={handleInviteMember}>เชิญ</button>
                            </div>
                        </div>
                    </div>

                    <div className="gl-team-info-card">
                        <span className="gl-team-info-label"><Clock size={13} /> คำขอเข้าร่วมทีมที่รอดำเนินการ</span>
                        {pendingJoinRequests.length === 0 && <div className="gl-team-info-value" style={{ color: 'var(--gl-text-dim)', fontWeight: 600, fontSize: '0.9rem' }}>ยังไม่มีคำขอใหม่</div>}
                        {pendingJoinRequests.map((req) => (
                            <div key={req.join_request_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>ผู้ขอเข้าร่วม: {req.requester_user_name || `user_id: ${req.requester_user_id}`}</span>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                                    <button className="gt-btn gt-btn-primary" disabled={actionLoading} onClick={() => handleRespondJoinRequest(req.join_request_id, 'approved')}>อนุมัติ</button>
                                    <button className="gt-btn" disabled={actionLoading} onClick={() => handleRespondJoinRequest(req.join_request_id, 'rejected')}>ปฏิเสธ</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="gl-team-info-card">
                        <span className="gl-team-info-label"><UserPlus size={13} /> จัดการสมาชิก</span>
                        {sortedMembers.map((m) => (
                            <div key={`manage-${m.id}`} className="gl-manage-member-row">
                                <div className="gl-manage-member-info">
                                    <div className="gl-manage-member-avatar" style={{ background: m.color }}>{m.name.charAt(0)}</div>
                                    <div>
                                        <span className="gl-manage-member-name">{m.name}</span>
                                        {m.leader && <span className="gl-manage-leader-tag">หัวหน้า</span>}
                                    </div>
                                </div>
                                {!m.leader && (
                                    <div className="gl-manage-actions">
                                        <button className="gl-btn-warning" disabled={actionLoading} onClick={() => handleTransferLeader(m.id)}>โอนหัวหน้า</button>
                                        <button className="gl-btn-danger" disabled={actionLoading} onClick={() => handleRemoveMember(m.id)}>เตะออก</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {isLeader && (
                <div className="gl-team-info-card">
                    <span className="gl-team-info-label"><LogOut size={13} /> ออกจากทีม</span>
                    <div className="gl-team-info-value" style={{ color: 'var(--gl-text-dim)', fontWeight: 600, fontSize: '0.9rem' }}>หากเป็นหัวหน้าทีม ต้องโอนหัวหน้าให้สมาชิกคนอื่นก่อน จึงจะออกจากทีมได้</div>
                </div>
            )}

            {!isLeader && (
                <div className="gl-team-info-card">
                    <span className="gl-team-info-label"><LogOut size={13} /> ออกจากทีม</span>
                    <div className="gl-team-info-value">
                        <button className="gl-btn-danger" disabled={actionLoading} onClick={handleLeaveCurrentTeam}>ออกจากทีม</button>
                    </div>
                </div>
            )}
        </div>
    );

    const DETAIL_MAP = {
        announce: () => renderSimpleDetail('ประกาศ', <Megaphone size={20} />, <div className="gl-empty-state"><Megaphone size={40} /><h3>ยังไม่มีประกาศ</h3></div>),
        works: () => renderSimpleDetail('ส่งผลงาน', <Award size={20} />, <div className="gl-empty-state"><Award size={40} /><h3>ยังไม่มีผลงานที่ส่ง</h3></div>),
        verify: () => renderSimpleDetail('ยืนยันตัวตน', <ShieldCheck size={20} />, <div className="gl-info-card"><div className="gl-status-row"><div className="gl-status-label">เอกสารยืนยันตัวตน</div><span className="gl-badge-ok"><CheckCircle size={13} /> พร้อมใช้งาน</span></div></div>),
        status: renderStatus,
        rules: () => renderSimpleDetail('กติกา', <BookOpen size={20} />, <div className="gl-info-card"><p>แต่ละทีมต้องมีสมาชิก 2-5 คน</p></div>),
        schedule: () => renderSimpleDetail('กำหนดการ', <Calendar size={20} />, <div className="gl-info-card"><p>กำหนดการจะแจ้งโดยผู้จัดงาน</p></div>),
        manage: renderManage,
        contact: () => renderSimpleDetail('ติดต่อผู้จัด', <MessageSquare size={20} />, <div className="gl-info-card"><p>ติดต่อ: gameevent@university.ac.th</p></div>),
        help: () => renderSimpleDetail('ช่วยเหลือ', <HelpCircle size={20} />, <div className="gl-info-card"><p>คำถามที่พบบ่อยจะอัปเดตเร็ว ๆ นี้</p></div>),
    };

    return (
        <div className="gl-page-container" style={{ paddingTop: '100px' }}>
            <div className="gl-frame">
                <aside className="gl-members-panel">
                    <div className="gl-members-header"><h3>สมาชิก {team.members.length}/{MAX_MEMBERS}</h3></div>
                    <div className="gl-team-badge"><span className="gl-team-badge-name"><Gamepad2 size={18} /> {team.name}</span><span className={`gl-status-dot ${team.status}`} /></div>
                    <div className="gl-member-list">
                        {sortedMembers.map((m) => (
                            <div key={m.id} className={`gl-member-entry ${m.id === user?.userId ? 'gl-me' : ''}`}>
                                <div className="gl-member-avatar" style={{ background: m.color }}>
                                    {m.name.charAt(0)}
                                    {m.leader && <span className="gl-crown-icon"><Crown size={14} color="#fbbf24" fill="#fbbf24" /></span>}
                                </div>
                                <div className="gl-member-info">
                                    <span className="gl-member-name">{m.name}{m.id === user?.userId && <span className="gl-me-badge">คุณ</span>}</span>
                                    <span className="gl-member-role">{roleLabel(m.role)}</span>
                                </div>
                            </div>
                        ))}
                        {Array.from({ length: emptySlots }).map((_, i) => <div key={`empty-${i}`} className="gl-member-entry gl-empty"><div className="gl-member-avatar gl-empty-avatar" /></div>)}
                    </div>
                </aside>

                <main className="gl-content-panel">
                    {selectedCard === null ? (
                        <div className="gl-card-grid">
                            {CARDS.map((card) => (
                                <button key={card.id} className="gl-mode-card" onClick={() => setSelectedCard(card.id)}>
                                    {card.id === 'manage' && hasPendingJoinRequests && <span className="gl-mode-badge">{pendingJoinRequests.length}</span>}
                                    <div className="gl-mode-icon" style={{ background: card.color }}>{card.icon}</div>
                                    <span className="gl-mode-label">{card.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        DETAIL_MAP[selectedCard]?.() || null
                    )}
                </main>
            </div>
            <ConfirmModal
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                hideCancel={confirmState.hideCancel}
                confirmLabel={confirmState.confirmLabel}
                cancelLabel={confirmState.cancelLabel}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
            />
        </div>
    );
}
