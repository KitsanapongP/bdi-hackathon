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
    Megaphone,
    MessageSquare,
    Plus,
    Search,
    Settings,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { TEAM_STATUS_CONFIG } from './mockData';
import { apiUrl } from '../../lib/api';
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
    const [message, setMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

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
            setMessage('');
            await fn();
        } catch (err) {
            setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
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
        setMessage('ส่งคำขอเข้าร่วมทีมแล้ว กรุณารอหัวหน้าทีมอนุมัติ');
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
        setMessage('ส่งคำขอเข้าร่วมทีมสำเร็จ');
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
        setMessage('ส่งคำเชิญสำเร็จ');
    });

    const handleRemoveMember = (memberUserId) => withAction(async () => {
        if (!team?.id) return;
        if (!window.confirm('ยืนยันการเตะสมาชิกออกจากทีม?')) return;
        const res = await fetch(apiUrl(`/api/teams/${team.id}/members/${memberUserId}`), {
            method: 'DELETE',
            credentials: 'include',
        });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.message || 'ลบสมาชิกไม่สำเร็จ');
        setTeam((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.id !== memberUserId) } : prev);
        setMessage('ลบสมาชิกสำเร็จ');
    });

    const handleLeaveCurrentTeam = () => withAction(async () => {
        if (!team?.id || !user?.userId) return;
        if (!window.confirm('ยืนยันการออกจากทีม?')) return;
        const res = await fetch(apiUrl(`/api/teams/${team.id}/members/${user.userId}`), {
            method: 'DELETE',
            credentials: 'include',
        });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.message || 'ออกจากทีมไม่สำเร็จ');
        window.location.reload();
    });

    const handleTransferLeader = (newLeaderUserId) => withAction(async () => {
        if (!team?.id) return;
        if (!window.confirm('ยืนยันการโอนหัวหน้าทีม?')) return;
        const res = await fetch(apiUrl(`/api/teams/${team.id}/leader`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ newLeaderUserId }),
        });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.message || 'โอนหัวหน้าทีมไม่สำเร็จ');
        setMessage('โอนหัวหน้าทีมสำเร็จ');
        window.location.reload();
    });

    if (!user) return null;
    if (isLoadingTeam) return <div className="gl-page-container"><div className="gl-frame gl-frame-center"><h3>กำลังโหลดข้อมูลทีม...</h3></div></div>;

    if (!user.hasTeam) {
        const filteredTeams = publicTeams.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return (
            <div className="gl-page-container">
                <div className="gl-frame gl-frame-center">
                    {message && <div className="gl-info-card" style={{ width: '100%', marginBottom: 12 }}><p>{message}</p></div>}

                    {myInvitations.length > 0 && (
                        <div className="gl-info-card gl-invitations-card" style={{ width: '100%', marginBottom: 12 }}>
                            <h4>คำเชิญเข้าทีม</h4>
                            {myInvitations.map((inv) => (
                                <div key={inv.invitation_id} className="gl-invitation-item">
                                    <div className="gl-invitation-text">
                                        <strong>{inv.team_name_th || `ทีม #${inv.team_id}`}</strong>
                                        <span>ผู้เชิญ: {inv.invited_by_user_name || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button className="gt-btn gt-btn-primary" disabled={actionLoading} onClick={() => handleRespondInvitation(inv.invitation_id, 'accepted')}>ยอมรับ</button>
                                        <button className="gt-btn" disabled={actionLoading} onClick={() => handleRespondInvitation(inv.invitation_id, 'declined')}>ปฏิเสธ</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeView === null && (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="gl-lobby-cards">
                                <div className="gl-lobby-card create-card" onClick={() => setActiveView('create')}><Plus size={36} /><h4>สร้างทีม</h4></div>
                                <div className="gl-lobby-card join-card" onClick={() => setActiveView('join')}><Lock size={36} /><h4>เข้าทีมด้วยโค้ด</h4></div>
                                <div className="gl-lobby-card browse-card" onClick={() => setActiveView('browse')}><Globe size={36} /><h4>ค้นหาทีมสาธารณะ</h4></div>
                            </div>
                        </div>
                    )}

                    {activeView === 'create' && (
                        <div style={{ width: '100%', maxWidth: 500 }}>
                            <button className="gl-back-btn" onClick={() => setActiveView(null)}><ChevronLeft size={16} /> ย้อนกลับ</button>
                            <div className="gl-info-card gl-form-card">
                                <div className="gr-input-group"><label>ชื่อทีม</label><input className="gr-input" value={createName} onChange={(e) => setCreateName(e.target.value)} /></div>
                                <div className="gr-toggle-row"><span>{createPublic ? 'สาธารณะ' : 'ส่วนตัว'}</span><button type="button" className={`gr-toggle ${createPublic ? 'on' : ''}`} onClick={() => setCreatePublic((v) => !v)} /></div>
                                <button className="gt-btn gt-btn-primary" disabled={actionLoading} onClick={handleCreateTeam}>สร้างทีม</button>
                            </div>
                        </div>
                    )}

                    {activeView === 'join' && (
                        <div style={{ width: '100%', maxWidth: 500 }}>
                            <button className="gl-back-btn" onClick={() => setActiveView(null)}><ChevronLeft size={16} /> ย้อนกลับ</button>
                            <div className="gl-info-card gl-form-card">
                                <input className="gr-input" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="รหัสเชิญ" />
                                <button className="gt-btn gt-btn-primary" disabled={actionLoading} onClick={handleJoinByCode}>ส่งคำขอเข้าร่วม</button>
                            </div>
                        </div>
                    )}

                    {activeView === 'browse' && (
                        <div style={{ width: '100%', maxWidth: 640 }}>
                            <button className="gl-back-btn" onClick={() => setActiveView(null)}><ChevronLeft size={16} /> ย้อนกลับ</button>
                            <div className="gl-info-card gl-form-card">
                                <div style={{ position: 'relative', marginBottom: 12 }}>
                                    <Search size={18} style={{ position: 'absolute', left: 12, top: 12 }} />
                                    <input className="gr-input" style={{ paddingLeft: 36 }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหาทีม..." />
                                </div>
                                <div className="gl-browse-list" style={{ maxHeight: 360, overflowY: 'auto' }}>
                                    {filteredTeams.map((t) => (
                                        <div key={t.id} className="gl-browse-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <div><strong>{t.name}</strong><div><Users size={14} /> {t.memberCount}/{MAX_MEMBERS}</div></div>
                                            <button className="gt-btn gt-btn-primary" disabled={actionLoading} onClick={() => handleRequestPublicTeam(t.id)}>ขอเข้าร่วม</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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
            <div className="gl-info-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>รหัสเชิญเข้าทีม</span>
                    <button className="gl-code-chip" onClick={() => navigator.clipboard.writeText(teamInviteCode).then(() => setCopied(true))}>
                        <Copy size={14} /> {teamInviteCode} {copied ? 'คัดลอกแล้ว' : ''}
                    </button>
                </div>
            </div>

            {isLeader && (
                <>
                    <div className="gl-info-card">
                        <h4>เชิญสมาชิกเข้าทีม (ใส่ username)</h4>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input className="gr-input" value={inviteUserNameInput} onChange={(e) => setInviteUserNameInput(e.target.value)} placeholder="เช่น somchai01" />
                            <button className="gt-btn gt-btn-primary" disabled={actionLoading} onClick={handleInviteMember}>เชิญ</button>
                        </div>
                    </div>

                    <div className="gl-info-card">
                        <h4>คำขอเข้าร่วมทีมที่รอดำเนินการ</h4>
                        {pendingJoinRequests.length === 0 && <p>ยังไม่มีคำขอใหม่</p>}
                        {pendingJoinRequests.map((req) => (
                            <div key={req.join_request_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                                <span>ผู้ขอเข้าร่วม: {req.requester_user_name || `user_id: ${req.requester_user_id}`}</span>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button className="gt-btn gt-btn-primary" disabled={actionLoading} onClick={() => handleRespondJoinRequest(req.join_request_id, 'approved')}>อนุมัติ</button>
                                    <button className="gt-btn" disabled={actionLoading} onClick={() => handleRespondJoinRequest(req.join_request_id, 'rejected')}>ปฏิเสธ</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="gl-info-card">
                        <h4>จัดการสมาชิก</h4>
                        {sortedMembers.map((m) => (
                            <div key={`manage-${m.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span>{m.name} ({m.id}) {m.leader ? '• หัวหน้า' : ''}</span>
                                {!m.leader && (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button className="gt-btn" disabled={actionLoading} onClick={() => handleTransferLeader(m.id)}>โอนหัวหน้า</button>
                                        <button className="gt-btn" disabled={actionLoading} onClick={() => handleRemoveMember(m.id)}>เตะออก</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {isLeader && (
                <div className="gl-info-card">
                    <h4>ออกจากทีม</h4>
                    <p>หากเป็นหัวหน้าทีม ต้องโอนหัวหน้าให้สมาชิกคนอื่นก่อน จึงจะออกจากทีมได้</p>
                </div>
            )}

            {!isLeader && (
                <div className="gl-info-card">
                    <h4>ออกจากทีม</h4>
                    <button className="gt-btn" disabled={actionLoading} onClick={handleLeaveCurrentTeam}>ออกจากทีม</button>
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
                    {message && <div className="gl-info-card" style={{ marginBottom: 10 }}><p>{message}</p></div>}
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
        </div>
    );
}
