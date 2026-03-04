import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    AlertTriangle,
    Award,
    BarChart3,
    BookOpen,
    Calendar,
    CheckCircle,
    ChevronLeft,
    Clock,
    Copy,
    Crown,
    FileText,
    Gamepad2,
    Globe,
    HelpCircle,
    Info,
    Lock,
    LogOut,
    Mail,
    Megaphone,
    MessageSquare,
    Plus,
    Save,
    Search,
    Settings,
    ShieldCheck,
    Trash2,
    Upload,
    User,
    UserPlus,
    Users,
    X,
    XCircle,
    AlertCircle,
    Loader2,
    Languages,
    GraduationCap,
    Eye,
    Download,
    Edit2,
} from 'lucide-react';
import { TEAM_STATUS_CONFIG } from './mockData';
import { apiUrl } from '../../lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import './Team.css';
import './Register.css';
import './Profile.css';

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

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (!dateStr.includes('T')) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isProfileComplete = (profile) => {
    if (!profile) return false;
    const requiredTextFields = [
        'userName',
        'firstNameTh',
        'lastNameTh',
        'firstNameEn',
        'lastNameEn',
        'institutionNameTh',
        'institutionNameEn',
        'homeProvince',
    ];
    const allTextFilled = requiredTextFields.every((key) => String(profile[key] || '').trim().length > 0);
    const phoneFilled = String(profile.phone || '').replace(/\D/g, '').length === 10;
    const hasBirthDate = String(profile.birthDate || '').trim().length > 0;
    const hasGender = String(profile.gender || '').trim().length > 0;
    const hasEducationLevel = String(profile.educationLevel || '').trim().length > 0;
    return allTextFilled && phoneFilled && hasBirthDate && hasGender && hasEducationLevel;
};

const getProfileMissingFields = (profile) => {
    if (!profile) return ['ยังโหลดข้อมูลโปรไฟล์ไม่สำเร็จ'];
    const missing = [];

    const requiredTextFields = [
        { key: 'userName', label: 'Username' },
        { key: 'firstNameTh', label: 'ชื่อ (TH)' },
        { key: 'lastNameTh', label: 'นามสกุล (TH)' },
        { key: 'firstNameEn', label: 'First Name (EN)' },
        { key: 'lastNameEn', label: 'Last Name (EN)' },
        { key: 'institutionNameTh', label: 'สถาบันศึกษา (TH)' },
        { key: 'institutionNameEn', label: 'Institution (EN)' },
        { key: 'homeProvince', label: 'ภูมิลำเนา (จังหวัด)' },
    ];

    requiredTextFields.forEach(({ key, label }) => {
        if (String(profile[key] || '').trim().length === 0) missing.push(label);
    });

    const phoneDigits = String(profile.phone || '').replace(/\D/g, '');
    if (phoneDigits.length !== 10) missing.push('เบอร์โทรศัพท์ (ต้องมี 10 หลัก)');
    if (String(profile.birthDate || '').trim().length === 0) missing.push('วันเดือนปีเกิด');
    if (String(profile.gender || '').trim().length === 0) missing.push('เพศ');
    if (String(profile.educationLevel || '').trim().length === 0) missing.push('ระดับการศึกษา');

    return missing;
};

const toVerificationProfilePayload = (profile) => ({
    firstNameTh: profile?.firstNameTh || '',
    lastNameTh: profile?.lastNameTh || '',
    firstNameEn: profile?.firstNameEn || '',
    lastNameEn: profile?.lastNameEn || '',
    phone: profile?.phone || '',
    institutionNameTh: profile?.institutionNameTh || '',
    institutionNameEn: profile?.institutionNameEn || '',
    gender: profile?.gender || '',
    birthDate: profile?.birthDate ? formatDate(profile.birthDate) : '',
    educationLevel: profile?.educationLevel || '',
    homeProvince: profile?.homeProvince || '',
    userName: profile?.userName || '',
});

export default function TeamContent({ user }) {
    const [team, setTeam] = useState(null);
    const [isLoadingTeam, setIsLoadingTeam] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [copied, setCopied] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', variant: 'danger', onConfirm: null, hideCancel: false, confirmLabel: 'ยืนยัน', cancelLabel: 'ยกเลิก' });
    const [renameState, setRenameState] = useState({ open: false, doc: null, value: '' });
    const [toast, setToast] = useState(null);
    const [toastExiting, setToastExiting] = useState(false);

    // โ”€โ”€ Verification state โ”€โ”€
    const [verifyData, setVerifyData] = useState(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [savedProfileData, setSavedProfileData] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [disbandReason, setDisbandReason] = useState('');

    // โ”€โ”€ Verification fetch (hook must be before ANY conditional returns) โ”€โ”€
    const fetchVerifyStatus = useCallback(async () => {
        if (!team?.id) return;
        setVerifyLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/verification/team/${team.id}/status`), { credentials: 'include' });
            const payload = await res.json();
            if (payload.ok) setVerifyData(payload.data);
        } catch (err) { console.error('failed to fetch verify status', err); }
        finally { setVerifyLoading(false); }
    }, [team?.id]);

    // Auto-fetch verify status when team loads
    useEffect(() => {
        if (team?.id) fetchVerifyStatus();
    }, [team?.id, fetchVerifyStatus]);

    const loadProfileForVerification = useCallback(async () => {
        setProfileLoading(true);
        try {
            const res = await fetch(apiUrl('/api/user/profile'), { credentials: 'include' });
            const payload = await res.json();
            if (payload.ok) {
                setProfileData(payload.data);
                setSavedProfileData(payload.data);
            }
        } catch (err) {
            console.error('failed to fetch profile for verification', err);
        } finally {
            setProfileLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedCard === 'verify') {
            loadProfileForVerification();
            fetchVerifyStatus();
        }
    }, [selectedCard, loadProfileForVerification, fetchVerifyStatus]);

    const openConfirm = (title, message, onConfirm, variant = 'danger') => {
        setConfirmState({ open: true, title, message, onConfirm, variant, hideCancel: false, confirmLabel: 'ยืนยัน', cancelLabel: 'ยกเลิก' });
    };
    const showToast = useCallback((message, type = 'success') => {
        setToastExiting(false);
        setToast({ message, type });
        setTimeout(() => {
            setToastExiting(true);
            setTimeout(() => { setToast(null); setToastExiting(false); }, 400);
        }, 2500);
    }, []);
    const getReadableErrorMessage = (err, fallback = 'เกิดข้อผิดพลาด') => {
        const msg = String(err?.message || '').trim();
        if (!msg) return fallback;
        const isMojibake = /�/.test(msg) || /(เธ.{0,2}){3,}/.test(msg) || /(เน.{0,2}){3,}/.test(msg);
        return isMojibake ? fallback : msg;
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

    const withAction = async (fn, opts = {}) => {
        try {
            setActionLoading(true);
            await fn();
        } catch (err) {
            const readableError = getReadableErrorMessage(err, opts.fallbackMessage || 'เกิดข้อผิดพลาด');
            if (opts.toastError) {
                showToast(readableError, 'error');
            } else {
                openAlert('เกิดข้อผิดพลาด', readableError, 'danger');
            }
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

                    {/* โ”€โ”€ Lobby Home (2x2 grid) โ”€โ”€ */}
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

                    {/* โ”€โ”€ Create Team View โ”€โ”€ */}
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

                    {/* โ”€โ”€ Join by Code View โ”€โ”€ */}
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

                    {/* โ”€โ”€ Browse Public Teams View โ”€โ”€ */}
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

                    {/* โ”€โ”€ Invitations View โ”€โ”€ */}
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
                {toast && (
                    <div className={`pf-toast show ${toast.type}${toastExiting ? ' exiting' : ''}`}>
                        {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {toast.message}
                        <div className="pf-toast-progress" />
                    </div>
                )}
            </div>
        );
    }

    if (!team) return <div className="gl-page-container"><div className="gl-frame gl-frame-center"><h3>กำลังโหลดข้อมูลทีม...</h3></div></div>;

    const statusInfo = TEAM_STATUS_CONFIG[team.status] || TEAM_STATUS_CONFIG.forming;
    const emptySlots = Math.max(0, MAX_MEMBERS - team.members.length);
    const teamInviteCode = team.inviteCode || '------';

    const handleUploadDocs = async (files) => {
        if (!team?.id || !files?.length) return;
        await withAction(async () => {
            const formData = new FormData();
            for (const f of files) formData.append('files', f);
            const res = await fetch(apiUrl(`/api/verification/team/${team.id}/documents`), {
                method: 'POST', credentials: 'include', body: formData,
            });
            const payload = await res.json();
            if (!payload.ok) throw new Error(payload.message || 'อัปโหลดไม่สำเร็จ');
            showToast(`อัปโหลดสำเร็จ ${payload.data.length} ไฟล์`, 'success');
            fetchVerifyStatus();
        }, { toastError: true });
    };

    const handleDeleteDoc = (docId, fileName) => {
        openConfirm('ลบเอกสาร', `ต้องการลบไฟล์ "${fileName}" หรือไม่?`, () => {
            closeConfirm();
            withAction(async () => {
                const res = await fetch(apiUrl(`/api/verification/team/${team.id}/documents/${docId}`), {
                    method: 'DELETE', credentials: 'include',
                });
                const payload = await res.json();
                if (!payload.ok) throw new Error(payload.message || 'ลบไม่สำเร็จ');
                fetchVerifyStatus();
                showToast('ลบเอกสารสำเร็จ', 'success');
            }, { toastError: true });
        }, 'danger');
    };

    const openDocumentPdf = (documentId) => {
        if (!team?.id) return;
        const url = apiUrl(`/api/verification/team/${team.id}/documents/${documentId}/file`);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const downloadDocumentPdf = (documentId) => {
        if (!team?.id) return;
        const url = apiUrl(`/api/verification/team/${team.id}/documents/${documentId}/file?download=1`);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleRenameDoc = (doc) => {
        if (!doc?.document_id) return;
        setRenameState({ open: true, doc, value: doc.file_original_name || '' });
    };

    const closeRenameModal = () => setRenameState({ open: false, doc: null, value: '' });

    const confirmRenameDoc = () => {
        if (!team?.id || !renameState.doc?.document_id) return;
        const trimmed = renameState.value.trim();
        const current = renameState.doc.file_original_name || '';
        if (!trimmed || trimmed === current) return;

        withAction(async () => {
            const res = await fetch(apiUrl(`/api/verification/team/${team.id}/documents/${renameState.doc.document_id}/name`), {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileOriginalName: trimmed }),
            });
            const payload = await res.json();
            if (!payload.ok) throw new Error(payload.message || 'แก้ไขชื่อไฟล์ไม่สำเร็จ');
            showToast('แก้ไขชื่อไฟล์สำเร็จ', 'success');
            closeRenameModal();
            fetchVerifyStatus();
        }, { toastError: true });
    };

    const handleSaveVerificationProfile = async () => {
        if (!profileData) return;
        setProfileSaving(true);
        try {
            const profilePayload = toVerificationProfilePayload(profileData);
            const res = await fetch(apiUrl('/api/user/profile'), {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profilePayload),
            });
            const payload = await res.json();
            if (!payload.ok) throw new Error(payload.message || 'บันทึกโปรไฟล์ไม่สำเร็จ');
            setProfileData(payload.data);
            setSavedProfileData(payload.data);
            showToast('บันทึกสำเร็จ', 'success');
        } catch (err) {
            showToast(getReadableErrorMessage(err, 'บันทึกโปรไฟล์ไม่สำเร็จ'), 'error');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleConfirmDocs = ({ hasDocs, profileComplete, missingFields, hasUnsavedProfileChanges }) => {
        if (hasUnsavedProfileChanges) {
            showToast('กรุณากดบันทึกข้อมูลส่วนตัวก่อนยืนยันเอกสาร', 'error');
            return;
        }
        if (!profileComplete) {
            const missingText = (missingFields || []).slice(0, 3).join(', ');
            showToast(`ข้อมูลส่วนตัวยังไม่ครบ: ${missingText || 'กรุณาตรวจสอบข้อมูล'}`, 'error');
            return;
        }
        if (!hasDocs) {
            showToast('กรุณาอัปโหลดเอกสารอย่างน้อย 1 ไฟล์', 'error');
            return;
        }

        openConfirm('ยืนยันเอกสารของฉัน', 'คุณแน่ใจหรือไม่ว่าต้องการยืนยันเอกสาร? สามารถยกเลิกการยืนยันได้ก่อนหัวหน้าทีมกดส่ง', () => {
            closeConfirm();
            withAction(async () => {
                const res = await fetch(apiUrl(`/api/verification/team/${team.id}/confirm`), {
                    method: 'POST', credentials: 'include',
                });
                const payload = await res.json();
                if (!payload.ok) throw new Error(payload.message || 'ยืนยันไม่สำเร็จ');
                showToast('ยืนยันเอกสารสำเร็จ', 'success');
                fetchVerifyStatus();
            }, { toastError: true });
        }, 'success');
    };

    const handleUnconfirmDocs = () => {
        openConfirm('ยกเลิกการยืนยัน', 'ต้องการยกเลิกการยืนยันเอกสารเพื่อแก้ไขหรือไม่?', () => {
            closeConfirm();
            withAction(async () => {
                const res = await fetch(apiUrl(`/api/verification/team/${team.id}/unconfirm`), {
                    method: 'POST', credentials: 'include',
                });
                const payload = await res.json();
                if (!payload.ok) throw new Error(payload.message || 'ยกเลิกไม่สำเร็จ');
                fetchVerifyStatus();
                showToast('ยกเลิกการยืนยันสำเร็จ', 'success');
            }, { toastError: true, fallbackMessage: 'ยังส่งเอกสารทั้งทีมไม่ได้ กรุณาตรวจสอบว่าทุกคนยืนยันเอกสารแล้ว' });
        }, 'warning');
    };

    const handleSubmitTeam = () => {
        openConfirm('ส่งเอกสารยืนยันตัวตนทั้งทีม', 'เมื่อส่งเอกสารยืนยันตัวตนทั้งทีมแล้ว จะไม่สามารถยกเลิกหรือแก้ไขได้', () => {
            closeConfirm();
            withAction(async () => {
                const statusRes = await fetch(apiUrl(`/api/verification/team/${team.id}/status`), { credentials: 'include' });
                const statusPayload = await statusRes.json();
                if (!statusPayload.ok) throw new Error(statusPayload.message || 'ไม่สามารถตรวจสอบสถานะทีมได้');
                const latestMembers = statusPayload?.data?.members || [];
                const pendingMembers = latestMembers.filter((m) => !m.is_member_confirmed);
                if (pendingMembers.length > 0) {
                    const names = pendingMembers
                        .map((m) => m.first_name_th || m.user_name || `user ${m.user_id}`)
                        .slice(0, 5)
                        .join(', ');
                    throw new Error(`สมาชิกที่ยังไม่ยืนยันเอกสาร: ${names}`);
                }

                const res = await fetch(apiUrl(`/api/verification/team/${team.id}/submit`), {
                    method: 'POST', credentials: 'include',
                });
                const payload = await res.json();
                if (!payload.ok) {
                    const serverMsg = String(payload?.message || '').trim();
                    const isReadable = serverMsg && !(/�/.test(serverMsg) || /(เธ.{0,2}){3,}/.test(serverMsg) || /(เน.{0,2}){3,}/.test(serverMsg));
                    if (isReadable) throw new Error(serverMsg);

                    // Secondary diagnosis when backend message is unreadable
                    const latestRes = await fetch(apiUrl(`/api/verification/team/${team.id}/status`), { credentials: 'include' });
                    const latestPayload = await latestRes.json();
                    if (latestPayload?.ok) {
                        const latestMembers2 = latestPayload?.data?.members || [];
                        const pending2 = latestMembers2.filter((m) => !m.is_member_confirmed);
                        if (pending2.length > 0) {
                            const names2 = pending2
                                .map((m) => m.first_name_th || m.user_name || `user ${m.user_id}`)
                                .slice(0, 5)
                                .join(', ');
                            throw new Error(`ยังมีสมาชิกที่ไม่ยืนยันเอกสาร: ${names2}`);
                        }
                        if (latestPayload?.data?.isTeamSubmitted) {
                            throw new Error('ทีมนี้ถูกส่งเอกสารแล้ว');
                        }
                    }
                    throw new Error('ระบบไม่อนุญาตให้ส่งเอกสารทีมในขณะนี้ กรุณารีเฟรชหน้าแล้วลองใหม่อีกครั้ง');
                }
                showToast('ส่งเอกสารยืนยันตัวตนทั้งทีมสำเร็จ', 'success');
                fetchVerifyStatus();
            }, { toastError: true, fallbackMessage: 'ยังส่งเอกสารทั้งทีมไม่ได้ กรุณาตรวจสอบข้อมูลทีมและการยืนยันของสมาชิก' });
        }, 'warning');
    };

    const handleDisbandTeam = () => {
        if (!disbandReason.trim()) {
            showToast('กรุณากรอกเหตุผลในการยุบทีมก่อนกดยืนยัน', 'error');
            return;
        }
        openConfirm('ยุบทีม', `ยืนยันการยุบทีม? เหตุผล: "${disbandReason}" — สมาชิกทุกคนจะถูกนำออกจากทีม`, () => {
            closeConfirm();
            withAction(async () => {
                const res = await fetch(apiUrl(`/api/verification/team/${team.id}/disband`), {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', body: JSON.stringify({ reason: disbandReason }),
                });
                const payload = await res.json();
                if (!payload.ok) throw new Error(payload.message || 'ยุบทีมไม่สำเร็จ');
                showToast('ยุบทีมสำเร็จ ระบบจะรีเฟรชหน้า', 'success');
                setTimeout(() => window.location.reload(), 1500);
            }, { toastError: true });
        }, 'danger');
    };

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
        verify: () => {
            if (!verifyData && !verifyLoading) fetchVerifyStatus();
            if (verifyLoading) return renderSimpleDetail('ยืนยันตัวตน', <ShieldCheck size={20} />, <div className="gl-empty-state"><ShieldCheck size={40} /><h3>กำลังโหลด...</h3></div>);

            const vd = verifyData;
            const myMember = vd?.members?.find(m => m.user_id === user?.userId);
            const myConfirmed = myMember?.is_member_confirmed;
            const allConfirmed = vd?.members?.every(m => m.is_member_confirmed);
            const memberCount = vd?.members?.length || team?.members?.length || 0;
            const isTeamSizeValid = memberCount >= 2 && memberCount <= MAX_MEMBERS;
            const isSubmitted = vd?.isTeamSubmitted;
            const myDocs = vd?.myDocuments || [];
            const profileComplete = isProfileComplete(profileData);
            const missingFields = getProfileMissingFields(profileData);
            const canEditGeneralInfo = !isSubmitted && !myConfirmed;
            const hasUnsavedProfileChanges = profileData
                ? JSON.stringify(toVerificationProfilePayload(profileData)) !== JSON.stringify(toVerificationProfilePayload(savedProfileData))
                : false;
            const profileReadyForConfirm = profileComplete && !hasUnsavedProfileChanges;

            return renderSimpleDetail('ยืนยันตัวตน', <ShieldCheck size={20} />, (
                <div>
                    {/* Info banner */}
                    <div className="vf-info-banner">
                        <Info size={16} />
                        <span>เมื่อยื่นเอกสารแล้วหากกดยืนยัน จะสามารถยกเลิกการยืนยันเพื่อกลับมาแก้ไขได้ แต่ถ้าหัวหน้าทีมกดส่งทีมแล้วจะไม่สามารถแก้ไขได้ กรุณาตรวจสอบความถูกต้อง และตั้งชื่อไฟล์ตามที่กำหนด</span>
                    </div>


                    {/* General info section */}
                    <div className="gl-team-info-card">
                        <span className="gl-team-info-label">
                            <User size={13} /> ข้อมูลส่วนตัว
                            <span className={`vf-profile-check ${profileReadyForConfirm ? 'ok' : 'bad'}`}>{profileReadyForConfirm ? '✓' : '✗'}</span>
                        </span>

                        {profileLoading && (
                            <div className="vf-empty-docs">
                                <Loader2 size={28} />
                                <span>กำลังโหลดข้อมูลโปรไฟล์...</span>
                            </div>
                        )}

                        {!profileLoading && !profileData && (
                            <div className="vf-empty-docs">
                                <XCircle size={28} />
                                <span>ไม่สามารถโหลดข้อมูลโปรไฟล์ได้</span>
                            </div>
                        )}

                        {!profileLoading && profileData && (
                            <div className="vf-profile-form-wrap">
                                <div className="gl-info-card">
                                    <h4><User size={16} /> ข้อมูลบัญชี</h4>
                                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                                        <div className="pf-field">
                                            <span className="pf-label">Username</span>
                                            <input className="pf-input" value={profileData.userName || ''} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, userName: e.target.value }))} placeholder="username" />
                                        </div>
                                        <div className="pf-field">
                                            <span className="pf-label">Email</span>
                                            <input className="pf-input" value={profileData.email || ''} disabled />
                                        </div>
                                    </div>
                                </div>

                                <div className="gl-info-card">
                                    <h4><Languages size={16} /> ข้อมูลภาษาไทย</h4>
                                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                                        <div className="pf-field">
                                            <span className="pf-label">ชื่อ (TH)</span>
                                            <input className="pf-input" value={profileData.firstNameTh || ''} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, firstNameTh: e.target.value }))} placeholder="ชื่อภาษาไทย" />
                                        </div>
                                        <div className="pf-field">
                                            <span className="pf-label">นามสกุล (TH)</span>
                                            <input className="pf-input" value={profileData.lastNameTh || ''} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, lastNameTh: e.target.value }))} placeholder="นามสกุลภาษาไทย" />
                                        </div>
                                    </div>
                                </div>

                                <div className="gl-info-card">
                                    <h4><Globe size={16} /> ข้อมูลภาษาอังกฤษ</h4>
                                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                                        <div className="pf-field">
                                            <span className="pf-label">First Name (EN)</span>
                                            <input className="pf-input" value={profileData.firstNameEn || ''} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, firstNameEn: e.target.value }))} placeholder="First name" />
                                        </div>
                                        <div className="pf-field">
                                            <span className="pf-label">Last Name (EN)</span>
                                            <input className="pf-input" value={profileData.lastNameEn || ''} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, lastNameEn: e.target.value }))} placeholder="Last name" />
                                        </div>
                                    </div>
                                </div>

                                <div className="gl-info-card">
                                    <h4><GraduationCap size={16} /> ข้อมูลการศึกษา</h4>
                                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                                        <div className="pf-field">
                                            <span className="pf-label">ระดับการศึกษา</span>
                                            <select className="pf-input" value={profileData.educationLevel || 'bachelor'} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, educationLevel: e.target.value }))}>
                                                <option value="secondary">ม.ต้น</option>
                                                <option value="high_school">ม.ปลาย</option>
                                                <option value="bachelor">ป.ตรี</option>
                                                <option value="master">ป.โท</option>
                                                <option value="doctorate">ป.เอก</option>
                                            </select>
                                        </div>
                                        <div className="pf-field">
                                            <span className="pf-label">เพศ</span>
                                            <select className="pf-input" value={profileData.gender || 'prefer_not_to_say'} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, gender: e.target.value }))}>
                                                <option value="male">ชาย</option>
                                                <option value="female">หญิง</option>
                                                <option value="other">อื่น ๆ</option>
                                                <option value="prefer_not_to_say">ไม่ระบุ</option>
                                            </select>
                                        </div>
                                        <div className="pf-field">
                                            <span className="pf-label">สถาบันศึกษา (TH)</span>
                                            <input className="pf-input" value={profileData.institutionNameTh || ''} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, institutionNameTh: e.target.value }))} placeholder="เช่น มหาวิทยาลัยขอนแก่น" />
                                        </div>
                                        <div className="pf-field">
                                            <span className="pf-label">Institution (EN)</span>
                                            <input className="pf-input" value={profileData.institutionNameEn || ''} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, institutionNameEn: e.target.value }))} placeholder="e.g. Khon Kaen University" />
                                        </div>
                                        <div className="pf-field">
                                            <span className="pf-label">วันเดือนปีเกิด</span>
                                            <input type="date" lang="en-GB" className="pf-input" value={formatDate(profileData.birthDate)} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, birthDate: e.target.value }))} />
                                        </div>
                                        <div className="pf-field">
                                            <span className="pf-label">ภูมิลำเนา (จังหวัด)</span>
                                            <input className="pf-input" value={profileData.homeProvince || ''} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, homeProvince: e.target.value }))} placeholder="เช่น ขอนแก่น" />
                                        </div>
                                        <div className="pf-field full">
                                            <span className="pf-label">เบอร์โทรศัพท์</span>
                                            <input className="pf-input" value={profileData.phone || ''} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setProfileData((d) => ({ ...d, phone: value }));
                                            }} placeholder="08x-xxx-xxxx" maxLength={10} />
                                        </div>
                                    </div>
                                </div>

                                {!profileComplete && (
                                    <>
                                        <p className="vf-hint">ข้อมูลส่วนตัวยังไม่ครบ กรุณาตรวจสอบรายการด้านล่าง</p>
                                        <ul className="vf-missing-list">
                                            {missingFields.map((field) => <li key={field}>{field}</li>)}
                                        </ul>
                                    </>
                                )}
                                {!canEditGeneralInfo && (
                                    <p className="vf-hint">ข้อมูลส่วนตัวถูกล็อกในสถานะปัจจุบัน</p>
                                )}
                                {canEditGeneralInfo && (
                                    <div className="pf-actions" style={{ marginTop: 12 }}>
                                        <button className="gl-action-btn gl-submit-btn" onClick={handleSaveVerificationProfile} disabled={profileSaving}>
                                            {profileSaving ? <Loader2 size={16} /> : <Save size={16} />}
                                            บันทึก
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* My documents section */}
                    <div className="gl-team-info-card">
                        <span className="gl-team-info-label"><FileText size={13} /> เอกสารของฉัน ({myDocs.length} ไฟล์)</span>

                        {myDocs.length === 0 && (
                            <div className="vf-empty-docs">
                                <Upload size={28} />
                                <span>ยังไม่มีเอกสาร กรุณาอัปโหลดไฟล์ PDF</span>
                            </div>
                        )}

                        {myDocs.map(doc => (
                            <div key={doc.document_id} className="vf-doc-row">
                                <div className="vf-doc-info">
                                    <FileText size={16} />
                                    <span className="vf-doc-name">{doc.file_original_name}</span>
                                    <span className="vf-doc-size">{(doc.file_size_bytes / 1024).toFixed(0)} KB</span>
                                </div>
                                <div className="vf-doc-actions">
                                    <button type="button" className="vf-doc-open" onClick={() => openDocumentPdf(doc.document_id)}>
                                        <Eye size={14} /> ดู
                                    </button>
                                    <button type="button" className="vf-doc-download" onClick={() => downloadDocumentPdf(doc.document_id)}>
                                        <Download size={14} /> ดาวน์โหลด
                                    </button>
                                    {!isSubmitted && !myConfirmed && (
                                        <button type="button" className="vf-doc-rename" onClick={() => handleRenameDoc(doc)}>
                                            <Edit2 size={14} /> เปลี่ยนชื่อ
                                        </button>
                                    )}
                                    {!isSubmitted && !myConfirmed && (
                                        <button className="vf-doc-delete" disabled={actionLoading} onClick={() => handleDeleteDoc(doc.document_id, doc.file_original_name)}>
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Upload button */}
                        {!isSubmitted && !myConfirmed && (
                            <label className="vf-upload-btn">
                                <Upload size={16} /> เลือกไฟล์ PDF
                                <input type="file" accept="application/pdf" multiple hidden
                                    onChange={(e) => { handleUploadDocs(Array.from(e.target.files)); e.target.value = ''; }}
                                />
                            </label>
                        )}
                    </div>

                    {/* Confirm / Unconfirm buttons */}
                    {!isSubmitted && (
                        <div className="gl-team-info-card">
                            <span className="gl-team-info-label"><ShieldCheck size={13} /> การยืนยัน</span>
                            {!myConfirmed ? (
                                <button
                                    className="vf-action-btn vf-btn-confirm"
                                    disabled={actionLoading || profileLoading || myDocs.length === 0 || !profileReadyForConfirm}
                                    onClick={() => handleConfirmDocs({ hasDocs: myDocs.length > 0, profileComplete, missingFields, hasUnsavedProfileChanges })}
                                >
                                    <CheckCircle size={16} /> ยืนยันเอกสารของฉัน
                                </button>
                            ) : (
                                <div>
                                    <div className="vf-confirmed-badge"><CheckCircle size={16} /> คุณยืนยันเอกสารแล้ว</div>
                                    <button className="vf-action-btn vf-btn-unconfirm" disabled={actionLoading} onClick={handleUnconfirmDocs}>
                                        <XCircle size={16} /> ยกเลิกการยืนยัน
                                    </button>
                                </div>
                            )}
                            {!myConfirmed && (!profileComplete || myDocs.length === 0) && (
                                <p className="vf-hint">ต้องกรอกข้อมูลส่วนตัวให้ครบ และแนบเอกสารก่อนจึงจะยืนยันได้</p>
                            )}
                            {!myConfirmed && hasUnsavedProfileChanges && (
                                <p className="vf-hint">คุณมีการแก้ไขข้อมูลส่วนตัวที่ยังไม่บันทึก กรุณากดปุ่มบันทึกก่อนยืนยันเอกสาร</p>
                            )}
                            {!myConfirmed && !profileComplete && (
                                <ul className="vf-missing-list">
                                    {missingFields.map((field) => <li key={`confirm-${field}`}>{field}</li>)}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Read-only notice after submission */}
                    {isSubmitted && (
                        <div className="vf-info-banner vf-submitted">
                            <Lock size={16} />
                            <span>ทีมส่งเอกสารยืนยันตัวตนแล้ว ไม่สามารถแก้ไขได้</span>
                        </div>
                    )}

                    {/* Leader: Submit team */}
                    {isLeader && !isSubmitted && (
                        <div className="gl-team-info-card">
                            <span className="gl-team-info-label"><ShieldCheck size={13} /> ส่งเอกสารทั้งทีม (หัวหน้าทีม)</span>
                            <div className="vf-info-banner vf-warning-small">
                                <AlertTriangle size={14} />
                                <span>เมื่อส่งเอกสารยืนยันตัวตนทั้งทีมแล้ว จะไม่สามารถยกเลิกหรือแก้ไขได้</span>
                            </div>
                            <button className="vf-action-btn vf-btn-submit" disabled={actionLoading || !allConfirmed || !isTeamSizeValid} onClick={handleSubmitTeam}>
                                <ShieldCheck size={16} /> ส่งเอกสารยืนยันตัวตนทั้งทีม
                            </button>
                            {!allConfirmed && <p className="vf-hint">สมาชิกทุกคนต้องยืนยันเอกสารก่อนส่ง</p>}
                            {!isTeamSizeValid && <p className="vf-hint">ทีมต้องมีสมาชิก 2-5 คนก่อนส่งเอกสารทั้งทีม (ตอนนี้ {memberCount} คน)</p>}
                        </div>
                    )}

                    {/* Leader: Disband team */}
                    {isLeader && isSubmitted && (
                        <div className="gl-team-info-card vf-disband-card">
                            <span className="gl-team-info-label"><AlertTriangle size={13} /> ยุบทีม (หัวหน้าทีม)</span>
                            <div className="vf-info-banner vf-warning-small">
                                <AlertTriangle size={14} />
                                <span>การยุบทีมควรทำเมื่อมีเหตุจำเป็นเท่านั้น เมื่อยุบแล้วทุกคนในทีมจะถูกนำออกจากทีม</span>
                            </div>
                            <div className="gl-form-field" style={{ marginBottom: 12 }}>
                                <label className="gl-form-label">เหตุผลในการยุบทีม</label>
                                <input className="gl-form-input" value={disbandReason} onChange={e => setDisbandReason(e.target.value)} placeholder="ระบุเหตุผล..." />
                            </div>
                            <button className="vf-action-btn vf-btn-disband" disabled={actionLoading || !disbandReason.trim()} onClick={handleDisbandTeam}>
                                <AlertTriangle size={16} /> ยุบทีม
                            </button>
                        </div>
                    )}
                </div>
            ));
        },
        status: renderStatus,
        rules: () => renderSimpleDetail('กติกา', <BookOpen size={20} />, <div className="gl-info-card"><p>แต่ละทีมต้องมีสมาชิก 2-5 คน</p></div>),
        schedule: () => renderSimpleDetail('กำหนดการ', <Calendar size={20} />, <div className="gl-info-card"><p>กำหนดการจะแจ้งโดยผู้จัดงาน</p></div>),
        manage: renderManage,
        contact: () => renderSimpleDetail('ติดต่อผู้จัด', <MessageSquare size={20} />, <div className="gl-info-card"><p>ติดต่อ: gameevent@university.ac.th</p></div>),
        help: () => renderSimpleDetail('ช่วยเหลือ', <HelpCircle size={20} />, <div className="gl-info-card"><p>คำถามที่พบบ่อยจะอัปเดตเร็ว ๆ นี้</p></div>),
    };

    return (
        <div className="gl-page-container">
            <div className="gl-frame">
                <aside className="gl-members-panel">
                    <div className="gl-members-header"><h3>สมาชิก {team.members.length}/{MAX_MEMBERS}</h3></div>
                    <div className="gl-team-badge"><span className="gl-team-badge-name"><Gamepad2 size={18} /> {team.name}</span><span className={`gl-status-dot ${team.status}`} /></div>
                    <div className="gl-member-list">
                        {sortedMembers.map((m) => {
                            const vm = verifyData?.members?.find(v => v.user_id === m.id);
                            return (
                                <div key={m.id} className={`gl-member-entry ${m.id === user?.userId ? 'gl-me' : ''}`}>
                                    <div className="gl-member-avatar" style={{ background: m.color }}>
                                        {m.name.charAt(0)}
                                        {m.leader && <span className="gl-crown-icon"><Crown size={14} color="#fbbf24" fill="#fbbf24" /></span>}
                                    </div>
                                    <div className="gl-member-info">
                                        <div className="gl-member-name-row">
                                            <span className="gl-member-name-text">{m.name}</span>
                                        </div>
                                        <span className="gl-member-role">
                                            {roleLabel(m.role)}{m.id === user?.userId ? ' (คุณ)' : ''}
                                        </span>
                                    </div>
                                    {vm && (
                                        <span className={`vf-member-icon ${vm.is_member_confirmed ? 'confirmed' : 'pending'}`}>
                                            {vm.is_member_confirmed ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
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
            <ConfirmModal
                open={renameState.open}
                title="เปลี่ยนชื่อไฟล์เอกสาร"
                message={renameState.doc?.file_original_name ? `ชื่อเดิม: ${renameState.doc.file_original_name}` : ''}
                variant="info"
                confirmLabel="บันทึก"
                cancelLabel="ยกเลิก"
                confirmDisabled={!renameState.value.trim() || renameState.value.trim() === (renameState.doc?.file_original_name || '') || actionLoading}
                onConfirm={confirmRenameDoc}
                onCancel={closeRenameModal}
            >
                <input
                    className="cm-input"
                    value={renameState.value}
                    onChange={(e) => setRenameState((s) => ({ ...s, value: e.target.value }))}
                    placeholder="กรอกชื่อไฟล์ใหม่"
                    maxLength={255}
                    autoFocus
                />
            </ConfirmModal>
            {toast && (
                <div className={`pf-toast show ${toast.type}${toastExiting ? ' exiting' : ''}`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                    <div className="pf-toast-progress" />
                </div>
            )}
        </div>
    );
}


