import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    AlertTriangle,
    Award,
    CheckCircle,
    ChevronLeft,
    Clock,
    Copy,
    Crown,
    FileText,
    Gamepad2,
    Globe,
    Info,
    Lock,
    LogOut,
    Mail,
    Megaphone,
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
    Link,
    Paperclip,
    Phone,
    ExternalLink,
} from 'lucide-react';
import { apiUrl } from '../../lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import './Team.css';
import './Register.css';
import './Profile.css';

const MAX_MEMBERS = 5;
const MIN_SUBMIT_MEMBERS = 3;

const CARDS = [
    { id: 'announce', icon: <Megaphone />, label: 'ประกาศ', color: '#f97316' },
    { id: 'verify', icon: <ShieldCheck />, label: 'ยืนยันตัวตน', color: '#14b8a6' },
    { id: 'advisor', icon: <GraduationCap />, label: 'อาจารย์ที่ปรึกษา', color: '#6366f1' },
    { id: 'works', icon: <Award />, label: 'ส่งผลงาน', color: '#eab308' },
    { id: 'inbox', icon: <Mail />, label: 'กล่องข้อความ', color: '#0ea5e9' },
    { id: 'manage', icon: <Settings />, label: 'จัดการทีม', color: '#6366f1' },
];

const TEAM_STATUS_CONFIG = {
    forming: { label: 'กำลังก่อตั้งทีม', color: 'bg-cyan-100 text-cyan-800' },
    submitted: { label: 'ส่งตรวจแล้ว', color: 'bg-amber-100 text-amber-800' },
    passed: { label: 'ผ่านการคัดเลือก', color: 'bg-green-100 text-green-800' },
    confirmed: { label: 'ยืนยันการเข้าร่วมแล้ว', color: 'bg-emerald-100 text-emerald-800' },
    failed: { label: 'ไม่ผ่านการคัดเลือก', color: 'bg-red-100 text-red-800' },
    not_joined: { label: 'ไม่กดเข้าร่วมโครงการ', color: 'bg-orange-100 text-orange-800' },
    disbanded: { label: 'ยุบทีม', color: 'bg-zinc-100 text-zinc-800' },
};

const normalizeStatus = (raw) => {
    const key = String(raw || 'forming').toLowerCase();
    if (key === 'confirmed') return 'confirmed';
    return TEAM_STATUS_CONFIG[key] ? key : 'forming';
};

const roleLabel = (role) => (role === 'leader' ? 'หัวหน้า' : 'สมาชิก');

const SOCIAL_PLATFORM_LABELS = {
    github: 'GitHub',
    linkedin: 'LinkedIn',
    twitter: 'Twitter/X',
    facebook: 'Facebook',
    instagram: 'Instagram',
    discord: 'Discord',
    line: 'LINE',
    other: 'ลิงก์อื่น ๆ',
};

const getSocialPlatformLabel = (platformCode) => {
    const key = String(platformCode || '').toLowerCase();
    return SOCIAL_PLATFORM_LABELS[key] || platformCode || 'ลิงก์';
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (!dateStr.includes('T')) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const raw = String(dateStr).trim();
    // Normalize MySQL DATETIME (YYYY-MM-DD HH:mm:ss) to ISO-like format.
    const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const toDateMs = (dateStr) => {
    if (!dateStr) return null;
    const raw = String(dateStr).trim();
    const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return null;
    return d.getTime();
};

const formatCountdown = (ms) => {
    if (ms <= 0) return 'หมดเวลาแล้ว';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
        return `${days} วัน ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
    const [editingTeamName, setEditingTeamName] = useState(false);
    const [newTeamNameInput, setNewTeamNameInput] = useState('');

    // โ”€โ”€ Verification state โ”€โ”€
    const [verifyData, setVerifyData] = useState(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [savedProfileData, setSavedProfileData] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [disbandReason, setDisbandReason] = useState('');

    // ── Submission state ──
    const [submissionData, setSubmissionData] = useState(null);
    const [submissionLoading, setSubmissionLoading] = useState(false);
    const [videoLinkInput, setVideoLinkInput] = useState('');
    const [videoLinkSaving, setVideoLinkSaving] = useState(false);

    // ── Advisor state ──
    const [advisorForm, setAdvisorForm] = useState({ open: false, editId: null, prefix: '', firstNameTh: '', lastNameTh: '', firstNameEn: '', lastNameEn: '', email: '', phone: '', institutionNameTh: '', position: '' });
    const resetAdvisorForm = () => setAdvisorForm({ open: false, editId: null, prefix: '', firstNameTh: '', lastNameTh: '', firstNameEn: '', lastNameEn: '', email: '', phone: '', institutionNameTh: '', position: '' });

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

    // ── Submission fetch ──
    const fetchSubmissionData = useCallback(async () => {
        if (!team?.id) return;
        setSubmissionLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/submissions/team/${team.id}`), { credentials: 'include' });
            const payload = await res.json();
            if (payload.ok) {
                setSubmissionData(payload.data);
                setVideoLinkInput(payload.data.videoLink || '');
            }
        } catch (err) { console.error('failed to fetch submission data', err); }
        finally { setSubmissionLoading(false); }
    }, [team?.id]);

    useEffect(() => {
        if (selectedCard === 'works' || selectedCard === 'advisor' || selectedCard === 'verify') {
            fetchSubmissionData();
        }
    }, [selectedCard, fetchSubmissionData]);

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
    const [inboxItems, setInboxItems] = useState([]);
    const [inboxLoading, setInboxLoading] = useState(false);
    const [nowMs, setNowMs] = useState(Date.now());
    const [memberProfileLoading, setMemberProfileLoading] = useState(false);
    const [memberProfileData, setMemberProfileData] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const memberProfileReqIdRef = useRef(0);

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
                    visibility: dbTeam.visibility || 'private',
                    code: dbTeam.team_code || '------',
                    inviteCode: activeCode || '------',
                    leaderUserId: dbTeam.current_leader_user_id,
                    confirmationDeadlineAt: dbTeam.confirmation_deadline_at || null,
                    confirmedAt: dbTeam.confirmed_at || null,
                    confirmedByUserId: dbTeam.confirmed_by_user_id || null,
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

    const fetchInbox = useCallback(async () => {
        if (!team?.id) return;
        setInboxLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/teams/${team.id}/inbox`), { credentials: 'include' });
            const payload = await res.json();
            if (payload.ok && Array.isArray(payload.data)) {
                setInboxItems(payload.data);
            }
        } catch (err) {
            console.error('failed to fetch inbox', err);
        } finally {
            setInboxLoading(false);
        }
    }, [team?.id]);

    useEffect(() => {
        if (selectedCard === 'inbox') fetchInbox();
    }, [selectedCard, fetchInbox]);

    useEffect(() => {
        const shouldTick = team?.status === 'passed' && !team?.confirmedAt && !!team?.confirmationDeadlineAt;
        if (!shouldTick) return;
        const timer = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [team?.status, team?.confirmedAt, team?.confirmationDeadlineAt]);

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

    const closeMemberProfile = useCallback(() => {
        memberProfileReqIdRef.current += 1;
        setSelectedMember(null);
        setMemberProfileData(null);
        setMemberProfileLoading(false);
    }, []);

    const handleOpenMemberProfile = useCallback(async (member) => {
        if (!team?.id || !member?.id) return;

        const requestId = memberProfileReqIdRef.current + 1;
        memberProfileReqIdRef.current = requestId;

        setSelectedMember(member);
        setMemberProfileData(null);
        setMemberProfileLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/teams/${team.id}/members/${member.id}/profile`), {
                credentials: 'include',
            });
            const payload = await res.json();
            if (!payload.ok || !payload.data) {
                throw new Error(payload.message || 'ไม่สามารถโหลดโปรไฟล์สมาชิกได้');
            }
            if (requestId !== memberProfileReqIdRef.current) return;
            setMemberProfileData(payload.data);
        } catch (err) {
            if (requestId !== memberProfileReqIdRef.current) return;
            const message = getReadableErrorMessage(err, 'ไม่สามารถโหลดโปรไฟล์สมาชิกได้');
            setMemberProfileData({ errorMessage: message });
            showToast(message, 'error');
        } finally {
            if (requestId !== memberProfileReqIdRef.current) return;
            setMemberProfileLoading(false);
        }
    }, [team?.id, showToast, getReadableErrorMessage]);

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
        if (isTeamEditLocked) {
            throw new Error('ทีมถูกล็อกแล้ว ไม่สามารถจัดการคำขอเข้าร่วมได้');
        }
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
        if (isTeamEditLocked) {
            throw new Error('ทีมถูกล็อกแล้ว ไม่สามารถเชิญสมาชิกเพิ่มได้');
        }
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
        if (isTeamEditLocked) {
            showToast('ทีมถูกล็อกแล้ว ไม่สามารถเตะสมาชิกออกได้', 'error');
            return;
        }
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
        if (isTeamEditLocked) {
            showToast('ทีมถูกล็อกแล้ว ไม่สามารถออกจากทีมในตอนนี้ได้', 'error');
            return;
        }
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
        if (isTeamEditLocked) {
            showToast('ทีมถูกล็อกแล้ว ไม่สามารถโอนหัวหน้าทีมได้', 'error');
            return;
        }
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

    const handleUpdateVisibility = (visibility) => withAction(async () => {
        if (!team?.id) return;
        if (isTeamEditLocked) {
            throw new Error('ทีมถูกล็อกแล้ว ไม่สามารถเปลี่ยนการมองเห็นทีมได้');
        }
        const res = await fetch(apiUrl(`/api/teams/${team.id}/visibility`), {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visibility }),
        });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.message || 'อัปเดตสถานะทีมไม่สำเร็จ');
        setTeam((prev) => (prev ? { ...prev, visibility: payload?.data?.visibility || visibility } : prev));
        showToast(`เปลี่ยนทีมเป็น ${visibility === 'public' ? 'public' : 'private'} สำเร็จ`, 'success');
    }, { toastError: true });

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

    const statusInfo = team.status === 'confirmed'
        ? { label: 'ยืนยันการเข้าร่วมแล้ว', color: 'bg-emerald-100 text-emerald-800' }
        : (TEAM_STATUS_CONFIG[team.status] || TEAM_STATUS_CONFIG.forming);
    const emptySlots = Math.max(0, MAX_MEMBERS - team.members.length);
    const teamInviteCode = team.inviteCode || '------';
    const deadlineMs = toDateMs(team?.confirmationDeadlineAt);
    const countdownText = deadlineMs ? formatCountdown(deadlineMs - nowMs) : '-';
    const isTeamLocked = ['submitted', 'passed', 'confirmed', 'failed', 'not_joined', 'disbanded'].includes(String(team?.status || ''));
    const isSubmittedByVerify = Boolean(verifyData?.isTeamSubmitted);
    const isTeamEditLocked = isTeamLocked || isSubmittedByVerify;
    const isMyVerificationConfirmed = Boolean(verifyData?.members?.find((m) => m.user_id === user?.userId)?.is_member_confirmed);

    const verifyMembers = verifyData?.members || [];
    const memberCountForSubmit = verifyMembers.length || team.members.length;
    const allMembersConfirmed = verifyMembers.length > 0 && verifyMembers.every((m) => m.is_member_confirmed);
    const advisorCount = Array.isArray(submissionData?.advisors) ? submissionData.advisors.length : 0;
    const hasAdvisor = advisorCount > 0;
    const isMinMembersReady = memberCountForSubmit >= MIN_SUBMIT_MEMBERS;

    const submitReadinessRules = [
        { id: 'members-confirmed', ok: allMembersConfirmed, label: 'สมาชิกยังยืนยันตัวตนไม่ครบ' },
        { id: 'advisor', ok: hasAdvisor, label: 'มีอาจารย์ที่ปรึกษาอย่างน้อย 1 คน' },
        { id: 'min-members', ok: isMinMembersReady, label: `มีสมาชิกอย่างน้อย ${MIN_SUBMIT_MEMBERS} คน (ตอนนี้ ${memberCountForSubmit} คน)` },
    ];
    const submitMissing = submitReadinessRules.filter((item) => !item.ok).map((item) => item.label);
    const submitProgress = Math.round((submitReadinessRules.filter((item) => item.ok).length / submitReadinessRules.length) * 100);
    const canSubmitSelection = isLeader && !isTeamEditLocked && submitMissing.length === 0;

    const verifyNotify = allMembersConfirmed ? 'success' : 'danger';
    const advisorNotify = hasAdvisor ? 'success' : 'danger';
    const workNotify = 'optional';
    const cardNotifyById = {
        verify: verifyNotify,
        advisor: advisorNotify,
        works: workNotify,
        manage: hasPendingJoinRequests ? 'count' : null,
    };

    const handleUploadDocs = async (files) => {
        if (!team?.id || !files?.length) return;
        if (isTeamEditLocked || isMyVerificationConfirmed) {
            showToast('ทีมถูกล็อกแล้ว ไม่สามารถอัปโหลดเอกสารได้', 'error');
            return;
        }
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
        if (isTeamEditLocked || isMyVerificationConfirmed) {
            showToast('ทีมถูกล็อกแล้ว ไม่สามารถลบเอกสารได้', 'error');
            return;
        }
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
        if (isTeamEditLocked || isMyVerificationConfirmed) {
            showToast('ทีมถูกล็อกแล้ว ไม่สามารถแก้ไขชื่อเอกสารได้', 'error');
            return;
        }
        if (!doc?.document_id) return;
        setRenameState({ open: true, doc, value: doc.file_original_name || '' });
    };

    const closeRenameModal = () => setRenameState({ open: false, doc: null, value: '' });

    const confirmRenameDoc = () => {
        if (isTeamEditLocked || isMyVerificationConfirmed) {
            showToast('ทีมถูกล็อกแล้ว ไม่สามารถแก้ไขชื่อเอกสารได้', 'error');
            return;
        }
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
        if (isTeamEditLocked || isMyVerificationConfirmed) {
            showToast('ทีมถูกล็อกแล้ว ไม่สามารถบันทึกข้อมูลส่วนตัวได้', 'error');
            return;
        }
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
        if (isTeamEditLocked) {
            showToast('ทีมส่งเอกสารแล้ว ไม่สามารถยืนยันเอกสารเพิ่มได้', 'error');
            return;
        }
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

        openConfirm('ยืนยันเอกสารของฉัน', <>คุณแน่ใจหรือไม่ว่าต้องการยืนยันเอกสาร?<br />สามารถยกเลิกการยืนยันได้ก่อนหัวหน้าทีมกดส่ง</>, () => {
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
        if (isTeamEditLocked) {
            showToast('ทีมส่งเอกสารแล้ว ไม่สามารถยกเลิกการยืนยันได้', 'error');
            return;
        }
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
        if (submitMissing.length > 0) {
            showToast(`ยังยืนยันเข้าร่วมการคัดเลือกไม่ได้: ${submitMissing.join(', ')}`, 'error');
            return;
        }
        openConfirm('ยืนยันเข้าร่วมการคัดเลือก', 'เมื่อยืนยันเข้าร่วมการคัดเลือกแล้ว จะไม่สามารถยกเลิกหรือแก้ไขเอกสารได้', () => {
            closeConfirm();
            withAction(async () => {
                const statusRes = await fetch(apiUrl(`/api/verification/team/${team.id}/status`), { credentials: 'include' });
                const statusPayload = await statusRes.json();
                if (!statusPayload.ok) throw new Error(statusPayload.message || 'ไม่สามารถตรวจสอบสถานะทีมได้');
                const latestMembers = statusPayload?.data?.members || [];
                if (latestMembers.length < MIN_SUBMIT_MEMBERS) {
                    throw new Error(`ทีมต้องมีสมาชิกอย่างน้อย ${MIN_SUBMIT_MEMBERS} คน (ตอนนี้ ${latestMembers.length} คน)`);
                }
                const pendingMembers = latestMembers.filter((m) => !m.is_member_confirmed);
                if (pendingMembers.length > 0) {
                    const names = pendingMembers
                        .map((m) => m.first_name_th || m.user_name || `user ${m.user_id}`)
                        .slice(0, 5)
                        .join(', ');
                    throw new Error(`สมาชิกที่ยังไม่ยืนยันเอกสาร: ${names}`);
                }

                const submissionRes = await fetch(apiUrl(`/api/submissions/team/${team.id}`), { credentials: 'include' });
                const submissionPayload = await submissionRes.json();
                if (!submissionPayload.ok) throw new Error(submissionPayload.message || 'ไม่สามารถตรวจสอบข้อมูลส่งผลงานได้');
                const latestSubmission = submissionPayload?.data || {};
                const hasAdvisor = Array.isArray(latestSubmission.advisors) && latestSubmission.advisors.length > 0;
                if (!hasAdvisor) {
                    throw new Error('ทีมต้องมีอาจารย์ที่ปรึกษาอย่างน้อย 1 คนก่อนยืนยันเข้าร่วมการคัดเลือก');
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
                showToast('ยืนยันเข้าร่วมการคัดเลือกสำเร็จ', 'success');
                setTeam((prev) => (prev ? { ...prev, status: 'submitted' } : prev));
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

    const handleConfirmParticipation = () => {
        openConfirm('ยืนยันการเข้าร่วมโครงการ', 'ยืนยันการเข้าร่วมตามผลคัดเลือกใช่หรือไม่?', () => {
            closeConfirm();
            withAction(async () => {
                const res = await fetch(apiUrl(`/api/teams/${team.id}/confirm-participation`), {
                    method: 'POST',
                    credentials: 'include',
                });
                const payload = await res.json();
                if (!payload.ok) throw new Error(payload.message || 'ยืนยันการเข้าร่วมไม่สำเร็จ');
                showToast('ยืนยันการเข้าร่วมสำเร็จ', 'success');
                window.location.reload();
            }, { toastError: true });
        }, 'success');
    };

    const handleUpdateTeamName = () => {
        if (isTeamEditLocked) {
            showToast('ทีมถูกล็อกแล้ว ไม่สามารถเปลี่ยนชื่อทีมได้', 'error');
            return;
        }
        if (!newTeamNameInput.trim()) {
            showToast('กรุณากรอกชื่อทีม', 'error');
            return;
        }
        withAction(async () => {
            const res = await fetch(apiUrl(`/api/teams/${team.id}/name`), {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamNameTh: newTeamNameInput.trim() }),
            });
            const payload = await res.json();
            if (!payload.ok) throw new Error(payload.message || 'เปลี่ยนชื่อทีมไม่สำเร็จ');
            showToast('เปลี่ยนชื่อทีมสำเร็จ', 'success');
            setEditingTeamName(false);
            setTeam(prev => ({ ...prev, name: newTeamNameInput.trim() }));
        }, { toastError: true });
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

    const renderManage = () => renderSimpleDetail(
        'จัดการทีม',
        <Settings size={20} />,
        <div className="gl-manage-container">
            {/* ── Section 1: Team Settings ── */}
            <div className="gl-manage-section">
                <h4 className="gl-manage-section-title">ข้อมูลและการตั้งค่าทีม</h4>
                <div className="gl-manage-grid">
                    {/* 1. Team Name */}
                    <div className="gl-team-info-card gl-manage-glass-card gl-compact-card gl-team-name-card">
                        <div className="gl-info-header gl-team-name-header">
                            <span className="gl-team-info-label" style={{ marginBottom: 0 }}><Edit2 size={16} /> ชื่อทีม</span>
                        </div>

                        <div className="gl-team-name-body">
                            {!editingTeamName && (
                                <div className="gl-team-name-display">
                                    <div className="gl-bold-value gl-team-name-value">{team.name}</div>
                                    {isLeader && (
                                        <button
                                            className="gl-icon-btn gl-team-name-edit-trigger"
                                            disabled={actionLoading || isTeamEditLocked}
                                            onClick={() => { setEditingTeamName(true); setNewTeamNameInput(team.name); }}
                                            title="แก้ไขชื่อทีม"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {editingTeamName && (
                                <div className="gl-team-name-edit-panel">
                                    <input
                                        className="gr-input gl-team-name-input"
                                        value={newTeamNameInput}
                                        onChange={e => setNewTeamNameInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newTeamNameInput.trim() && !actionLoading) {
                                                handleUpdateTeamName();
                                            }
                                            if (e.key === 'Escape' && !actionLoading) {
                                                setEditingTeamName(false);
                                                setNewTeamNameInput(team.name);
                                            }
                                        }}
                                        placeholder="ระบุชื่อทีมใหม่"
                                        autoFocus
                                    />

                                    <button
                                        className="gl-team-name-action-btn gl-team-name-save-btn"
                                        disabled={actionLoading || !newTeamNameInput.trim()}
                                        onClick={handleUpdateTeamName}
                                        title="บันทึก"
                                    >
                                        <Save size={14} />
                                        <span>บันทึก</span>
                                    </button>

                                    <button
                                        className="gl-team-name-action-btn gl-team-name-cancel-btn"
                                        disabled={actionLoading}
                                        onClick={() => {
                                            setEditingTeamName(false);
                                            setNewTeamNameInput(team.name);
                                        }}
                                        title="ยกเลิก"
                                    >
                                        <X size={14} />
                                        <span>ยกเลิก</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Team Visibility */}
                    <div className="gl-team-info-card gl-manage-glass-card gl-compact-card">
                        <div className="gl-info-header" style={{ marginBottom: 4 }}>
                            <span className="gl-team-info-label" style={{ marginBottom: 0 }}><Globe size={16} /> การมองเห็นทีม</span>
                            {team.visibility === 'public' ? (
                                <span className="gl-badge gl-badge-success">สาธารณะ</span>
                            ) : (
                                <span className="gl-badge gl-badge-neutral">ส่วนตัว</span>
                            )}
                        </div>
                        <div className="gl-fancy-toggle-container" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
                            <span className={`gl-toggle-label ${team.visibility === 'private' ? 'active' : ''}`}>Private</span>
                            <button
                                className={`gl-fancy-toggle ${team.visibility === 'public' ? 'on' : 'off'}`}
                                disabled={!isLeader || actionLoading || isTeamEditLocked}
                                onClick={() => handleUpdateVisibility(team.visibility === 'public' ? 'private' : 'public')}
                                title={isTeamEditLocked ? 'ทีมถูกล็อกแล้ว ไม่สามารถเปลี่ยนสถานะได้' : 'สลับการมองเห็นทีม'}
                            >
                                <div className="gl-toggle-thumb">
                                    {team.visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                                </div>
                            </button>
                            <span className={`gl-toggle-label ${team.visibility === 'public' ? 'active' : ''}`}>Public</span>
                        </div>
                        {isTeamEditLocked && <p className="vf-hint mt-2">ทีมถูกล็อกแล้ว</p>}
                    </div>

                    {/* 3. Member Count */}
                    <div className="gl-team-info-card gl-manage-glass-card gl-compact-card">
                        <span className="gl-team-info-label" style={{ marginBottom: 0 }}><Users size={16} /> จำนวนสมาชิก</span>
                        <div className="gl-bold-value" style={{ marginTop: 'auto' }}>{team.members.length} <span className="gl-sub-value">/ {MAX_MEMBERS} คน</span></div>
                        <div className="gl-progress-mini">
                            <div className="gl-progress-mini-fill" style={{ width: `${(team.members.length / MAX_MEMBERS) * 100}%` }}></div>
                        </div>
                    </div>

                    {/* 4. Invite Code */}
                    <div className="gl-team-info-card gl-manage-glass-card gl-compact-card">
                        <span className="gl-team-info-label" style={{ marginBottom: 0 }}><Copy size={16} /> รหัสเชิญเข้าร่วมทีม</span>
                        <div className="gl-code-box" style={{ marginTop: 'auto' }}>
                            <span className="gl-code-text">{teamInviteCode}</span>
                            <button className="gl-icon-btn" onClick={() => navigator.clipboard.writeText(teamInviteCode).then(() => setCopied(true))} title="คัดลอกรหัส">
                                {copied ? <CheckCircle size={18} color="#34d399" /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isLeader && (
                <>
                    {/* ── Section 2: Invite & Requests ── */}
                    <div className="gl-manage-section">
                        <h4 className="gl-manage-section-title">เชิญชวน & คำขอเข้าร่วม</h4>
                        <div className="gl-manage-grid">
                            <div className="gl-team-info-card gl-manage-glass-card">
                                <span className="gl-team-info-label"><UserPlus size={16} /> เชิญสมาชิกใหม่</span>
                                <p className="gl-card-desc">เชิญผู้ใช้เข้าร่วมทีมด้วย Username</p>
                                <div className="gl-invite-input-group mt-3">
                                    <div className="gl-input-wrapper">
                                        <Search size={16} className="gl-input-icon" />
                                        <input
                                            className="gr-input gl-fancy-input"
                                            value={inviteUserNameInput}
                                            onChange={(e) => setInviteUserNameInput(e.target.value)}
                                            placeholder="กรอก Username เพื่อเชิญ"
                                        />
                                    </div>
                                    <button className="gt-btn gt-btn-primary gl-fancy-btn" disabled={actionLoading || isTeamEditLocked || !inviteUserNameInput.trim()} onClick={handleInviteMember}>
                                        <Mail size={16} /> ส่งคำเชิญ
                                    </button>
                                </div>
                                {isTeamEditLocked && <p className="vf-hint mt-2">ทีมถูกล็อกแล้ว ไม่สามารถเชิญสมาชิกเพิ่มได้</p>}
                            </div>

                            <div className="gl-team-info-card gl-manage-glass-card">
                                <div className="gl-info-header">
                                    <span className="gl-team-info-label"><Clock size={16} /> คำขอเข้าร่วมทีม</span>
                                    {pendingJoinRequests.length > 0 && <span className="gl-badge gl-badge-warning">{pendingJoinRequests.length}</span>}
                                </div>
                                <div className="gl-requests-list">
                                    {pendingJoinRequests.length === 0 ? (
                                        <div className="gl-empty-sm">
                                            <CheckCircle size={20} />
                                            <span>ไม่มีคำขอเข้าร่วมทีมใหม่</span>
                                        </div>
                                    ) : (
                                        pendingJoinRequests.map((req) => (
                                            <div key={req.join_request_id} className="gl-request-item">
                                                <div className="gl-req-user">
                                                    <div className="gl-req-avatar">{req.requester_user_name?.charAt(0) || 'U'}</div>
                                                    <span className="gl-req-name">{req.requester_user_name || `ผู้ใช้ ${req.requester_user_id}`}</span>
                                                </div>
                                                <div className="gl-req-actions">
                                                    <button className="gl-btn-icon-success" disabled={actionLoading || isTeamEditLocked} onClick={() => handleRespondJoinRequest(req.join_request_id, 'approved')} title="อนุมัติ">
                                                        <CheckCircle size={16} /> อนุมัติ
                                                    </button>
                                                    <button className="gl-btn-icon-danger" disabled={actionLoading || isTeamEditLocked} onClick={() => handleRespondJoinRequest(req.join_request_id, 'rejected')} title="ปฏิเสธ">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {isTeamEditLocked && pendingJoinRequests.length > 0 && <p className="vf-hint mt-2">ทีมถูกล็อกแล้ว จัดการคำขอไม่ได้</p>}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Section 3: Members & Critical Actions ── */}
            <div className="gl-manage-section">
                <h4 className="gl-manage-section-title">สมาชิกทีม</h4>
                <div className="gl-team-info-card gl-manage-glass-card gl-manage-span-full">
                    <div className="gl-manage-members-list">
                        {sortedMembers.map((m) => (
                            <div key={`manage-${m.id}`} className="gl-manage-member-row gl-fancy-row">
                                <div className="gl-manage-member-info">
                                    <div className="gl-manage-member-avatar" style={{ background: m.color, position: 'relative' }}>
                                        {m.leader && <Crown size={14} className="gl-crown-badge-inner" style={{ position: 'absolute', top: -5, right: -5, color: '#fbbf24', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />}
                                        {m.name.charAt(0)}
                                    </div>
                                    <div className="gl-member-text">
                                        <span className="gl-manage-member-name">{m.name}</span>
                                        {m.leader ? (
                                            <span className="gl-manage-role gl-role-leader"><Crown size={12} /> หัวหน้าทีม</span>
                                        ) : (
                                            <span className="gl-manage-role gl-role-member">สมาชิก</span>
                                        )}
                                    </div>
                                </div>
                                {isLeader && !m.leader && (
                                    <div className="gl-manage-actions">
                                        <button className="gl-btn-outline gl-btn-transfer" disabled={actionLoading || isTeamEditLocked} onClick={() => handleTransferLeader(m.id)}>
                                            <Award size={14} /> โอนหัวหน้า
                                        </button>
                                        <button className="gl-btn-outline gl-btn-kick" disabled={actionLoading || isTeamEditLocked} onClick={() => handleRemoveMember(m.id)}>
                                            <LogOut size={14} /> เตะออก
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {isTeamEditLocked && isLeader && <p className="vf-hint mt-3">ทีมถูกล็อกแล้ว ไม่สามารถโอนหัวหน้า/เตะสมาชิกได้</p>}
                </div>
            </div>

            <div className="gl-manage-section">
                <h4 className="gl-manage-section-title text-danger">การดำเนินการสำคัญ</h4>
                <div className="gl-team-info-card gl-manage-danger-card gl-manage-span-full">
                    <div className="gl-danger-content">
                        <div className="gl-danger-text">
                            <span className="gl-team-info-label"><LogOut size={16} /> ออกจากทีม</span>
                            <p className="gl-card-desc">หากคุณออกจากทีมแล้ว จะหมดสิทธิ์ในทีมนี้และต้องขอเข้าร่วมใหม่</p>
                            {isLeader && <p className="vf-hint text-warning mt-1">หัวหน้าทีมต้องโอนสิทธิ์ให้สมาชิกคนอื่นก่อน ถึงจะออกจากทีมได้</p>}
                        </div>
                        <button className="gl-btn-danger gl-btn-lg" disabled={actionLoading || isLeader || isTeamEditLocked} onClick={handleLeaveCurrentTeam}>
                            <LogOut size={16} /> ออกจากทีม
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMemberProfileDetail = () => {
        const profilePayload = memberProfileData && !memberProfileData.errorMessage ? memberProfileData : null;

        const visibleProfileItems = profilePayload
            ? [
                {
                    key: 'real-name',
                    label: 'ชื่อ-นามสกุล',
                    value: profilePayload?.profile?.realName,
                    icon: <User size={14} />,
                },
                {
                    key: 'email',
                    label: 'อีเมล',
                    value: profilePayload?.profile?.email,
                    icon: <Mail size={14} />,
                },
                {
                    key: 'phone',
                    label: 'เบอร์โทรศัพท์',
                    value: profilePayload?.profile?.phone,
                    icon: <Phone size={14} />,
                },
                {
                    key: 'university',
                    label: 'สถาบันการศึกษา',
                    value: profilePayload?.profile?.university,
                    icon: <GraduationCap size={14} />,
                },
            ].filter((item) => String(item.value || '').trim().length > 0)
            : [];

        const socialLinks = Array.isArray(profilePayload?.socialLinks) ? profilePayload.socialLinks : [];
        const hasPublicNotes = profilePayload && (
            String(profilePayload?.publicProfile?.bioTh || '').trim().length > 0 ||
            String(profilePayload?.publicProfile?.bioEn || '').trim().length > 0 ||
            String(profilePayload?.publicProfile?.contactNote || '').trim().length > 0
        );

        return (
            <div className="gl-detail-view gl-member-profile-view">
                <div className="gl-detail-top">
                    <button className="gl-back-btn" onClick={closeMemberProfile}><ChevronLeft size={16} /> ย้อนกลับ</button>
                    <h3 className="gl-detail-title"><User size={20} /> โปรไฟล์สมาชิกทีม</h3>
                </div>

                <div className="gl-detail-body">
                    {memberProfileLoading && (
                        <div className="gl-empty-state">
                            <Loader2 size={36} />
                            <h3>กำลังโหลดโปรไฟล์สมาชิก...</h3>
                        </div>
                    )}

                    {!memberProfileLoading && memberProfileData?.errorMessage && (
                        <div className="gl-empty-state">
                            <AlertCircle size={36} />
                            <h3>โหลดโปรไฟล์ไม่สำเร็จ</h3>
                            <p>{memberProfileData.errorMessage}</p>
                        </div>
                    )}

                    {!memberProfileLoading && profilePayload && (
                        <>
                            <div className="gl-info-card gl-member-profile-hero">
                                <div className="gl-member-profile-avatar" style={{ background: selectedMember?.color || '#7c3aed' }}>
                                    {(selectedMember?.name || profilePayload.displayName || 'U').charAt(0)}
                                    {selectedMember?.leader && <span className="gl-crown-icon"><Crown size={14} color="#fbbf24" fill="#fbbf24" /></span>}
                                </div>
                                <div className="gl-member-profile-hero-text">
                                    <div className="gl-member-profile-name">{profilePayload.displayName || selectedMember?.name || '-'}</div>
                                    <div className="gl-member-profile-meta-row">
                                        <span className="gl-member-profile-handle">@{profilePayload.userName || '-'}</span>
                                        <span className="gl-member-profile-dot">•</span>
                                        <span>{roleLabel(selectedMember?.role)}{selectedMember?.id === user?.userId ? ' (คุณ)' : ''}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="gl-info-card gl-member-profile-section">
                                <h4><ShieldCheck size={16} /> ข้อมูลส่วนตัว</h4>
                                <p className="gl-member-profile-note">สามารถตั้งค่าการแสดงผลได้ในโปรไฟล์ -&gt; ความเป็นส่วนตัว</p>
                                {visibleProfileItems.length === 0 ? (
                                    <p className="gl-member-profile-empty">ยังไม่มีข้อมูลส่วนตัวที่เปิดให้แสดง</p>
                                ) : (
                                    <div className="gl-member-profile-list">
                                        {visibleProfileItems.map((item) => (
                                            <div key={item.key} className="gl-member-profile-row">
                                                <span className="gl-member-profile-label">{item.icon} {item.label}</span>
                                                <span className="gl-member-profile-value">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="gl-info-card gl-member-profile-section">
                                <h4><Link size={16} /> ลิงก์โซเซียลมีเดีย</h4>
                                {socialLinks.length === 0 ? (
                                    <p className="gl-member-profile-empty">
                                        {profilePayload?.privacy?.showSocialLinks
                                            ? 'ยังไม่มีลิงก์โซเซียลมีเดียที่แสดงผล'
                                            : 'เจ้าของโปรไฟล์ปิดการแสดงลิงก์โซเซียลมีเดีย'}
                                    </p>
                                ) : (
                                    <div className="gl-member-social-list">
                                        {socialLinks.map((social) => (
                                            <a
                                                key={social.socialLinkId}
                                                href={social.profileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="gl-member-social-link"
                                            >
                                                <span className="gl-member-social-platform">{getSocialPlatformLabel(social.platformCode)}</span>
                                                <span className="gl-member-social-text">{social.displayText || social.profileUrl}</span>
                                                <ExternalLink size={14} />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {hasPublicNotes && (
                                <div className="gl-info-card gl-member-profile-section">
                                    <h4><Info size={16} /> โปรไฟล์สาธารณะ</h4>
                                    {profilePayload?.publicProfile?.bioTh && (
                                        <div className="gl-member-public-block">
                                            <span className="gl-member-public-label">Bio (TH)</span>
                                            <p>{profilePayload.publicProfile.bioTh}</p>
                                        </div>
                                    )}
                                    {profilePayload?.publicProfile?.bioEn && (
                                        <div className="gl-member-public-block">
                                            <span className="gl-member-public-label">Bio (EN)</span>
                                            <p>{profilePayload.publicProfile.bioEn}</p>
                                        </div>
                                    )}
                                    {profilePayload?.publicProfile?.contactNote && (
                                        <div className="gl-member-public-block">
                                            <span className="gl-member-public-label">Contact Note</span>
                                            <p>{profilePayload.publicProfile.contactNote}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    const DETAIL_MAP = {
        announce: () => renderSimpleDetail('ประกาศ', <Megaphone size={20} />, <div className="gl-empty-state"><Megaphone size={40} /><h3>ยังไม่มีประกาศ</h3></div>),
        inbox: () => renderSimpleDetail('กล่องข้อความ', <Mail size={20} />, (
            <div className="gl-info-card">
                {inboxLoading && <div className="gl-empty-state"><Loader2 size={40} /><h3>กำลังโหลด...</h3></div>}
                {!inboxLoading && inboxItems.length === 0 && <div className="gl-empty-state"><Mail size={36} /><h3>ยังไม่มีข้อความ</h3></div>}
                {!inboxLoading && inboxItems.map((item) => (
                    <div key={item.notificationLogId} className="sub-advisor-card">
                        <div className="sub-advisor-info">
                            <div className="sub-advisor-name">
                                {item.subject || item.eventCode}
                            </div>
                            <div className="sub-advisor-detail">{item.message || '-'}</div>
                            <div className="sub-advisor-detail">
                                ช่องทาง: {item.channel} | สถานะ: {item.status} | เวลา: {formatDateTime(item.createdAt)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )),
        works: () => {
            if (submissionLoading && !submissionData) return renderSimpleDetail('ส่งผลงาน', <Award size={20} />, <div className="gl-empty-state"><Loader2 size={40} /><h3>กำลังโหลด...</h3></div>);

            const files = submissionData?.files || [];
            const isWorksLocked = isTeamEditLocked;
            const handleSaveVideoLink = async () => {
                if (!team?.id) return;
                if (isWorksLocked) {
                    showToast('ทีมถูกล็อกแล้ว ไม่สามารถแก้ไขผลงานได้', 'error');
                    return;
                }
                setVideoLinkSaving(true);
                try {
                    const res = await fetch(apiUrl(`/api/submissions/team/${team.id}/video-link`), {
                        method: 'PUT', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ videoLink: videoLinkInput.trim() || null }),
                    });
                    const payload = await res.json();
                    if (!payload.ok) throw new Error(payload.message || 'บันทึกไม่สำเร็จ');
                    showToast('บันทึกลิงก์วิดีโอสำเร็จ', 'success');
                    fetchSubmissionData();
                } catch (err) { showToast(getReadableErrorMessage(err, 'บันทึกไม่สำเร็จ'), 'error'); }
                finally { setVideoLinkSaving(false); }
            };

            const handleUploadSubmissionFiles = async (fileList) => {
                if (!team?.id || !fileList?.length) return;
                if (isWorksLocked) {
                    showToast('ทีมถูกล็อกแล้ว ไม่สามารถอัปโหลดไฟล์ผลงานได้', 'error');
                    return;
                }
                await withAction(async () => {
                    const formData = new FormData();
                    for (const f of fileList) formData.append('files', f);
                    const res = await fetch(apiUrl(`/api/submissions/team/${team.id}/files`), {
                        method: 'POST', credentials: 'include', body: formData,
                    });
                    const payload = await res.json();
                    if (!payload.ok) throw new Error(payload.message || 'อัปโหลดไม่สำเร็จ');
                    showToast(`อัปโหลดสำเร็จ ${payload.data.length} ไฟล์`, 'success');
                    fetchSubmissionData();
                }, { toastError: true });
            };

            const handleDeleteSubmissionFile = (fileId, fileName) => {
                if (isWorksLocked) {
                    showToast('ทีมถูกล็อกแล้ว ไม่สามารถลบไฟล์ผลงานได้', 'error');
                    return;
                }
                openConfirm('ลบไฟล์', `ต้องการลบไฟล์ "${fileName}" หรือไม่?`, () => {
                    closeConfirm();
                    withAction(async () => {
                        const res = await fetch(apiUrl(`/api/submissions/team/${team.id}/files/${fileId}`), {
                            method: 'DELETE', credentials: 'include',
                        });
                        const payload = await res.json();
                        if (!payload.ok) throw new Error(payload.message || 'ลบไม่สำเร็จ');
                        showToast('ลบไฟล์สำเร็จ', 'success');
                        fetchSubmissionData();
                    }, { toastError: true });
                }, 'danger');
            };

            return renderSimpleDetail('ส่งผลงาน', <Award size={20} />, (
                <div>
                    <div className="vf-info-banner">
                        <Info size={16} />
                        <span>หัวหน้าทีมเท่านั้นที่สามารถส่งลิงก์วิดีโอและแนบไฟล์ผลงานได้</span>
                    </div>
                    {isWorksLocked && (
                        <div className="vf-info-banner vf-submitted">
                            <Lock size={16} />
                            <span>ทีมส่งเข้าคัดเลือกแล้ว ไม่สามารถแก้ไขข้อมูลส่งผลงานได้</span>
                        </div>
                    )}

                    {/* Video Link Section */}
                    <div className="gl-team-info-card">
                        <span className="gl-team-info-label"><Link size={13} /> ลิงก์วิดีโอ</span>
                        <p className="vf-hint" style={{ marginBottom: 8 }}>ระบุลิงก์ YouTube หรือ Google Drive เท่านั้น</p>
                        <div className="sub-video-input-row">
                            <input
                                className="pf-input"
                                value={videoLinkInput}
                                onChange={(e) => setVideoLinkInput(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=... หรือ https://drive.google.com/..."
                                disabled={!isLeader || videoLinkSaving || isWorksLocked}
                            />
                            {isLeader && (
                                <button className="gl-action-btn gl-submit-btn" onClick={handleSaveVideoLink} disabled={videoLinkSaving || isWorksLocked}>
                                    {videoLinkSaving ? <Loader2 size={16} /> : <Save size={16} />}
                                    บันทึก
                                </button>
                            )}
                        </div>
                        {submissionData?.videoLink && (
                            <a href={submissionData.videoLink} target="_blank" rel="noopener noreferrer" className="sub-video-link-preview">
                                <Link size={14} /> {submissionData.videoLink}
                            </a>
                        )}
                    </div>

                    {/* File Attachments Section */}
                    <div className="gl-team-info-card">
                        <span className="gl-team-info-label"><Paperclip size={13} /> ไฟล์แนบผลงาน ({files.length} ไฟล์)</span>
                        <p className="vf-hint" style={{ marginBottom: 8 }}>รองรับไฟล์ .pdf, .docx, .png, .pptx</p>

                        {files.length === 0 && (
                            <div className="vf-empty-docs">
                                <Upload size={28} />
                                <span>ยังไม่มีไฟล์แนบ</span>
                            </div>
                        )}

                        {files.map(f => (
                            <div key={f.file_id} className="vf-doc-row">
                                <div className="vf-doc-info">
                                    <FileText size={16} />
                                    <span className="vf-doc-name">{f.file_original_name}</span>
                                    <span className="vf-doc-size">{(f.file_size_bytes / 1024).toFixed(0)} KB</span>
                                </div>
                                <div className="vf-doc-actions">
                                    <a href={apiUrl(`/api/submissions/team/${team.id}/files/${f.file_id}/download`)} target="_blank" rel="noopener noreferrer" className="vf-doc-open">
                                        <Eye size={14} /> ดู
                                    </a>
                                    <a href={apiUrl(`/api/submissions/team/${team.id}/files/${f.file_id}/download?download=1`)} target="_blank" rel="noopener noreferrer" className="vf-doc-download">
                                        <Download size={14} /> ดาวน์โหลด
                                    </a>
                                    {isLeader && (
                                        <button className="vf-doc-delete" disabled={actionLoading || isWorksLocked} onClick={() => handleDeleteSubmissionFile(f.file_id, f.file_original_name)}>
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLeader && !isWorksLocked && (
                            <label className="vf-upload-btn">
                                <Upload size={16} /> เลือกไฟล์
                                <input type="file" accept=".pdf,.docx,.png,.pptx,.jpg,.jpeg" multiple hidden
                                    onChange={(e) => { handleUploadSubmissionFiles(Array.from(e.target.files)); e.target.value = ''; }}
                                />
                            </label>
                        )}
                        {isLeader && isWorksLocked && <p className="vf-hint">ทีมถูกล็อกแล้ว ไม่สามารถอัปโหลดไฟล์เพิ่มได้</p>}
                    </div>
                </div>
            ));
        },
        verify: () => {
            if (!verifyData && !verifyLoading) fetchVerifyStatus();
            if (verifyLoading) return renderSimpleDetail('ยืนยันตัวตน', <ShieldCheck size={20} />, <div className="gl-empty-state"><ShieldCheck size={40} /><h3>กำลังโหลด...</h3></div>);

            const vd = verifyData;
            const myMember = vd?.members?.find(m => m.user_id === user?.userId);
            const myConfirmed = myMember?.is_member_confirmed;
            const isSubmitted = Boolean(vd?.isTeamSubmitted || isTeamEditLocked);
            const myDocs = vd?.myDocuments || [];
            const profileComplete = isProfileComplete(profileData);
            const missingFields = getProfileMissingFields(profileData);
            const canEditGeneralInfo = !isSubmitted && !myConfirmed;
            const hasUnsavedProfileChanges = profileData
                ? JSON.stringify(toVerificationProfilePayload(profileData)) !== JSON.stringify(toVerificationProfilePayload(savedProfileData))
                : false;
            const profileReadyForConfirm = profileComplete && !hasUnsavedProfileChanges;
            const confirmationExpired = team?.confirmationDeadlineAt
                ? new Date(team.confirmationDeadlineAt).getTime() < Date.now()
                : false;

            return renderSimpleDetail('ยืนยันตัวตน', <ShieldCheck size={20} />, (
                <div>
                    {/* Info banner */}
                    <div className="vf-info-banner">
                        <Info size={16} />
                        <span>หากกดยืนยันแล้ว จะไม่สามารถแก้ไขได้ กรุณาตรวจสอบความถูกต้อง</span>
                    </div>

                    {isLeader && team.status === 'passed' && !team.confirmedAt && (
                        <div className="gl-team-info-card">
                            <span className="gl-team-info-label"><CheckCircle size={13} /> ยืนยันการเข้าร่วมโครงการ</span>
                            <div className="gl-status-row"><div className="gl-status-label">หมดเขตยืนยัน</div><span>{formatDateTime(team.confirmationDeadlineAt)}</span></div>
                            <div className="gl-status-row"><div className="gl-status-label"><Clock size={13} /> เวลาที่เหลือ</div><span>{countdownText}</span></div>
                            {confirmationExpired ? (
                                <p className="vf-hint">เลยเวลายืนยันแล้ว ระบบจะปรับสถานะเป็น "ไม่กดเข้าร่วมโครงการ" อัตโนมัติ</p>
                            ) : (
                                <button className="gl-action-btn gl-submit-btn" disabled={actionLoading} onClick={handleConfirmParticipation}>
                                    <CheckCircle size={16} /> ยืนยันการเข้าร่วมโครงการ
                                </button>
                            )}
                        </div>
                    )}
                    {!isLeader && team.status === 'passed' && !team.confirmedAt && (
                        <div className="gl-team-info-card">
                            <span className="gl-team-info-label"><Clock size={13} /> กำหนดเวลายืนยันของทีม</span>
                            <div className="gl-status-row"><div className="gl-status-label">หมดเขตยืนยัน</div><span>{formatDateTime(team.confirmationDeadlineAt)}</span></div>
                            <div className="gl-status-row"><div className="gl-status-label">เวลาที่เหลือ</div><span>{countdownText}</span></div>
                        </div>
                    )}


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
                                            <select className="pf-input" value={profileData.gender || 'other'} disabled={!canEditGeneralInfo || profileSaving} onChange={(e) => setProfileData((d) => ({ ...d, gender: e.target.value }))}>
                                                <option value="male">ชาย</option>
                                                <option value="female">หญิง</option>
                                                <option value="other">ไม่ระบุ / อื่น ๆ</option>
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
                                    <p className="vf-hint">ข้อมูลส่วนตัวไม่สามารถแก้ไขได้หากกดยืนยันแล้ว</p>
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
                                            <Edit2 size={14} /> แก้ไขชื่อเอกสาร
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

                    {/* Leader: Disband team */}
                    {isLeader && isSubmitted && (
                        <div className="gl-team-info-card vf-disband-card">
                            <span className="gl-team-info-label"><AlertTriangle size={13} /> ยุบทีม (หัวหน้าทีม)</span>
                            <div className="vf-info-banner vf-warning-small">
                                <AlertTriangle size={14} />
                                <span>การยุบทีมควรทำเมื่อมีเหตุจำเป็นเท่านั้น และหัวหน้าทีมควรแจ้งสมาชิกทุกคนก่อนทำการยุบทีม เมื่อยุบแล้วทุกคนในทีมจะถูกนำออกจากทีม</span>
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
        manage: renderManage,
        advisor: () => {
            if (submissionLoading && !submissionData) return renderSimpleDetail('อาจารย์ที่ปรึกษา', <GraduationCap size={20} />, <div className="gl-empty-state"><Loader2 size={40} /><h3>กำลังโหลด...</h3></div>);

            const advisors = submissionData?.advisors || [];
            const isAdvisorLocked = isTeamEditLocked;

            const handleSaveAdvisor = async () => {
                if (!team?.id) return;
                if (isAdvisorLocked) {
                    showToast('ทีมถูกล็อกแล้ว ไม่สามารถแก้ไขข้อมูลอาจารย์ที่ปรึกษาได้', 'error');
                    return;
                }
                const body = {
                    prefix: advisorForm.prefix || undefined,
                    firstNameTh: advisorForm.firstNameTh,
                    lastNameTh: advisorForm.lastNameTh,
                    firstNameEn: advisorForm.firstNameEn || undefined,
                    lastNameEn: advisorForm.lastNameEn || undefined,
                    email: advisorForm.email || undefined,
                    phone: advisorForm.phone || undefined,
                    institutionNameTh: advisorForm.institutionNameTh || undefined,
                    position: advisorForm.position || undefined,
                };
                if (!body.firstNameTh || !body.lastNameTh) {
                    showToast('กรุณากรอกชื่อและนามสกุล (ภาษาไทย)', 'error');
                    return;
                }
                await withAction(async () => {
                    const isEdit = !!advisorForm.editId;
                    const url = isEdit
                        ? apiUrl(`/api/submissions/team/${team.id}/advisors/${advisorForm.editId}`)
                        : apiUrl(`/api/submissions/team/${team.id}/advisors`);
                    const res = await fetch(url, {
                        method: isEdit ? 'PUT' : 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                    const payload = await res.json();
                    if (!payload.ok) throw new Error(payload.message || 'บันทึกไม่สำเร็จ');
                    showToast(isEdit ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มอาจารย์ที่ปรึกษาสำเร็จ', 'success');
                    resetAdvisorForm();
                    fetchSubmissionData();
                }, { toastError: true });
            };

            const handleDeleteAdvisor = (advisorId, name) => {
                if (isAdvisorLocked) {
                    showToast('ทีมถูกล็อกแล้ว ไม่สามารถลบอาจารย์ที่ปรึกษาได้', 'error');
                    return;
                }
                openConfirm('ลบอาจารย์ที่ปรึกษา', `ต้องการลบ "${name}" หรือไม่?`, () => {
                    closeConfirm();
                    withAction(async () => {
                        const res = await fetch(apiUrl(`/api/submissions/team/${team.id}/advisors/${advisorId}`), {
                            method: 'DELETE', credentials: 'include',
                        });
                        const payload = await res.json();
                        if (!payload.ok) throw new Error(payload.message);
                        showToast('ลบอาจารย์ที่ปรึกษาสำเร็จ', 'success');
                        fetchSubmissionData();
                    }, { toastError: true });
                }, 'danger');
            };

            const handleEditAdvisor = (adv) => {
                if (isAdvisorLocked) {
                    showToast('ทีมถูกล็อกแล้ว ไม่สามารถแก้ไขข้อมูลอาจารย์ที่ปรึกษาได้', 'error');
                    return;
                }
                setAdvisorForm({
                    open: true, editId: adv.advisor_id,
                    prefix: adv.prefix || '', firstNameTh: adv.first_name_th || '', lastNameTh: adv.last_name_th || '',
                    firstNameEn: adv.first_name_en || '', lastNameEn: adv.last_name_en || '',
                    email: adv.email || '', phone: adv.phone || '',
                    institutionNameTh: adv.institution_name_th || '', position: adv.position || '',
                });
            };

            return renderSimpleDetail('อาจารย์ที่ปรึกษา', <GraduationCap size={20} />, (
                <div>
                    <div className="vf-info-banner">
                        <Info size={16} />
                        <span>สามารถมีอาจารย์ที่ปรึกษาได้มากกว่าหนึ่งท่าน และอาจารย์ที่ปรึกษาไม่สามารถอยู่หลายทีมได้<br />มีหัวหน้าทีมเท่านั้นที่สามารถจัดการได้</span>
                    </div>
                    {isAdvisorLocked && (
                        <div className="vf-info-banner vf-submitted">
                            <Lock size={16} />
                            <span>ทีมส่งเข้าคัดเลือกแล้ว ไม่สามารถแก้ไขข้อมูลอาจารย์ที่ปรึกษาได้</span>
                        </div>
                    )}

                    {/* Advisor list */}
                    <div className="gl-team-info-card">
                        <span className="gl-team-info-label"><GraduationCap size={13} /> รายชื่ออาจารย์ที่ปรึกษา ({advisors.length} ท่าน)</span>

                        {advisors.length === 0 && (
                            <div className="vf-empty-docs">
                                <GraduationCap size={28} />
                                <span>ยังไม่มีอาจารย์ที่ปรึกษา</span>
                            </div>
                        )}

                        {advisors.map(adv => (
                            <div key={adv.advisor_id} className="sub-advisor-card">
                                <div className="sub-advisor-info">
                                    <div className="sub-advisor-name">
                                        {adv.prefix && <span>{adv.prefix}</span>}
                                        {adv.first_name_th} {adv.last_name_th}
                                        {adv.first_name_en && <span className="sub-advisor-en"> ({adv.first_name_en} {adv.last_name_en})</span>}
                                    </div>
                                    {adv.position && <div className="sub-advisor-detail">ตำแหน่ง: {adv.position}</div>}
                                    {adv.institution_name_th && <div className="sub-advisor-detail">สถาบัน: {adv.institution_name_th}</div>}
                                    {adv.email && <div className="sub-advisor-detail">Email: {adv.email}</div>}
                                    {adv.phone && <div className="sub-advisor-detail">โทร: {adv.phone}</div>}
                                </div>
                                {isLeader && (
                                    <div className="sub-advisor-actions">
                                        <button className="vf-doc-open" disabled={isAdvisorLocked} onClick={() => handleEditAdvisor(adv)}><Edit2 size={14} /> แก้ไข</button>
                                        <button className="vf-doc-delete" disabled={actionLoading || isAdvisorLocked} onClick={() => handleDeleteAdvisor(adv.advisor_id, `${adv.first_name_th} ${adv.last_name_th}`)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Add/Edit advisor form */}
                    {isLeader && (
                        <div className="gl-team-info-card">
                            <span className="gl-team-info-label"><Plus size={13} /> {advisorForm.editId ? 'แก้ไขอาจารย์ที่ปรึกษา' : 'เพิ่มอาจารย์ที่ปรึกษา'}</span>
                            <div className="pf-form-grid" style={{ marginTop: 8 }}>
                                <div className="pf-field">
                                    <span className="pf-label">คำนำหน้า</span>
                                    <input className="pf-input" disabled={isAdvisorLocked} value={advisorForm.prefix} onChange={e => setAdvisorForm(f => ({ ...f, prefix: e.target.value }))} placeholder="เช่น ผศ.ดร." />
                                </div>
                                <div className="pf-field">
                                    <span className="pf-label">ชื่อ (TH) *</span>
                                    <input className="pf-input" disabled={isAdvisorLocked} value={advisorForm.firstNameTh} onChange={e => setAdvisorForm(f => ({ ...f, firstNameTh: e.target.value }))} placeholder="ชื่อภาษาไทย" />
                                </div>
                                <div className="pf-field">
                                    <span className="pf-label">นามสกุล (TH) *</span>
                                    <input className="pf-input" disabled={isAdvisorLocked} value={advisorForm.lastNameTh} onChange={e => setAdvisorForm(f => ({ ...f, lastNameTh: e.target.value }))} placeholder="นามสกุลภาษาไทย" />
                                </div>
                                <div className="pf-field">
                                    <span className="pf-label">First Name (EN)</span>
                                    <input className="pf-input" disabled={isAdvisorLocked} value={advisorForm.firstNameEn} onChange={e => setAdvisorForm(f => ({ ...f, firstNameEn: e.target.value }))} placeholder="First name" />
                                </div>
                                <div className="pf-field">
                                    <span className="pf-label">Last Name (EN)</span>
                                    <input className="pf-input" disabled={isAdvisorLocked} value={advisorForm.lastNameEn} onChange={e => setAdvisorForm(f => ({ ...f, lastNameEn: e.target.value }))} placeholder="Last name" />
                                </div>
                                <div className="pf-field">
                                    <span className="pf-label">Email</span>
                                    <input className="pf-input" type="email" disabled={isAdvisorLocked} value={advisorForm.email} onChange={e => setAdvisorForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                                </div>
                                <div className="pf-field">
                                    <span className="pf-label">เบอร์โทร</span>
                                    <input className="pf-input" disabled={isAdvisorLocked} value={advisorForm.phone} onChange={e => setAdvisorForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="08x-xxx-xxxx" maxLength={10} />
                                </div>
                                <div className="pf-field">
                                    <span className="pf-label">สถาบัน</span>
                                    <input className="pf-input" disabled={isAdvisorLocked} value={advisorForm.institutionNameTh} onChange={e => setAdvisorForm(f => ({ ...f, institutionNameTh: e.target.value }))} placeholder="เช่น มหาวิทยาลัยขอนแก่น" />
                                </div>
                                <div className="pf-field full">
                                    <span className="pf-label">ตำแหน่งทางวิชาการ</span>
                                    <input className="pf-input" disabled={isAdvisorLocked} value={advisorForm.position} onChange={e => setAdvisorForm(f => ({ ...f, position: e.target.value }))} placeholder="เช่น ผู้ช่วยศาสตราจารย์" />
                                </div>
                            </div>
                            <div className="pf-actions" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                <button className="gl-action-btn gl-submit-btn" onClick={handleSaveAdvisor} disabled={actionLoading || isAdvisorLocked}>
                                    <Save size={16} /> {advisorForm.editId ? 'บันทึก' : 'เพิ่ม'}
                                </button>
                                {advisorForm.editId && (
                                    <button className="gt-btn" onClick={resetAdvisorForm}>ยกเลิก</button>
                                )}
                            </div>
                            {isAdvisorLocked && <p className="vf-hint mt-2">ทีมถูกล็อกแล้ว ไม่สามารถเพิ่มหรือแก้ไขอาจารย์ที่ปรึกษาได้</p>}
                        </div>
                    )}
                </div>
            ));
        },
    };

    return (
        <div className="gl-page-container">
            <div className="gl-frame">
                <aside className="gl-members-panel">
                    <div className="gl-members-header"><h3>สมาชิก {team.members.length}/{MAX_MEMBERS}</h3></div>
                    <div className="gl-member-list">
                        {sortedMembers.map((m) => {
                            const vm = verifyData?.members?.find(v => v.user_id === m.id);
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    className={`gl-member-entry gl-member-entry-btn ${m.id === user?.userId ? 'gl-me' : ''}`}
                                    onClick={() => handleOpenMemberProfile(m)}
                                    title="ดูโปรไฟล์สมาชิก"
                                >
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
                                </button>
                            );
                        })}
                        {Array.from({ length: emptySlots }).map((_, i) => <div key={`empty-${i}`} className="gl-member-entry gl-empty"><div className="gl-member-avatar gl-empty-avatar" /></div>)}
                    </div>
                </aside>

                <main className="gl-content-panel">
                    {selectedMember === null && selectedCard === null && (
                        <div className="gl-team-top-panel">
                            <div className="gl-top-main">
                                {/* Left: Team identity */}
                                <div className="gl-top-identity">
                                    <div className="gl-top-team-icon">
                                        <Gamepad2 size={22} />
                                    </div>
                                    <div className="gl-top-team-meta">
                                        <span className="gl-top-team-name">{team.name}</span>
                                        <span className={`gl-top-status-chip ${team.status}`}>
                                            <span className="gl-top-status-dot" />
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Center: Progress */}
                                <div className="gl-top-progress-section">
                                    <div className="gl-top-progress-label">ความพร้อมในการส่งทีมเข้าคัดเลือก</div>
                                    <div className="gl-top-progress-bar-wrap">
                                        <div className="gl-top-progress-track">
                                            <div className="gl-top-progress-fill" style={{ width: `${submitProgress}%` }} />
                                        </div>
                                        <span className="gl-top-progress-pct">{submitProgress}%</span>
                                    </div>
                                </div>

                                {/* Right: Action */}
                                <div className="gl-top-action-section">
                                    <button className="gl-top-submit-btn" disabled={!isLeader || actionLoading || isTeamEditLocked || submitMissing.length > 0} onClick={handleSubmitTeam}>
                                        <ShieldCheck size={18} />
                                        <span>ยืนยันส่งทีมเข้าคัดเลือก</span>
                                    </button>
                                </div>
                            </div>

                            {/* Hints row */}
                            {(submitMissing.length > 0 || !isLeader || isTeamEditLocked) && (
                                <div className="gl-top-hints">
                                    {!isLeader && <span className="gl-top-hint-item"><Lock size={12} /> เฉพาะหัวหน้าทีม</span>}
                                    {submitMissing.map((msg, i) => (
                                        <span key={i} className="gl-top-hint-item gl-top-hint-warn"><AlertTriangle size={12} /> {msg}</span>
                                    ))}
                                    {isTeamEditLocked && <span className="gl-top-hint-item"><Lock size={12} /> ทีมอยู่ในสถานะที่แก้ไขไม่ได้</span>}
                                </div>
                            )}
                        </div>
                    )}
                    {selectedMember ? (
                        renderMemberProfileDetail()
                    ) : selectedCard === null ? (
                        <div className="gl-card-grid">
                            {CARDS.map((card) => {
                                const notify = cardNotifyById[card.id];
                                const notifyConfig = {
                                    verify: { require: true, label: 'จำเป็น' },
                                    advisor: { require: true, label: 'จำเป็น' },
                                    works: { require: false, label: 'ไม่บังคับ' },
                                };
                                const cfg = notifyConfig[card.id];
                                return (
                                    <button key={card.id} className="gl-mode-card" onClick={() => setSelectedCard(card.id)}>
                                        {notify === 'count' && <span className="gl-mode-badge">{pendingJoinRequests.length}</span>}
                                        {cfg && notify === 'success' && (
                                            <span className="gl-notify-pill gl-notify-success">
                                                <CheckCircle size={12} /> {cfg.label}
                                            </span>
                                        )}
                                        {cfg && notify === 'danger' && (
                                            <span className="gl-notify-pill gl-notify-danger">
                                                <XCircle size={12} /> {cfg.label}
                                            </span>
                                        )}
                                        {cfg && notify === 'optional' && (
                                            <span className="gl-notify-pill gl-notify-optional">
                                                <Clock size={12} /> {cfg.label}
                                            </span>
                                        )}
                                        <div className="gl-mode-icon" style={{ background: card.color }}>{card.icon}</div>
                                        <span className="gl-mode-label">{card.label}</span>
                                    </button>
                                );
                            })}
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
                confirmDisabled={isTeamEditLocked || isMyVerificationConfirmed || !renameState.value.trim() || renameState.value.trim() === (renameState.doc?.file_original_name || '') || actionLoading}
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
