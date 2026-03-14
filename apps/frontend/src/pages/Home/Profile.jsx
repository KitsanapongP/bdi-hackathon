import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Shield, Link2, Globe, FileText,
    ChevronLeft, Save, Plus, Edit2, Trash2, Upload,
    CheckCircle, Loader2, AlertCircle,
    Lock, PenLine, Handshake, MessageCircle, ClipboardList,
    GraduationCap, QrCode, RefreshCw, Ticket,
} from 'lucide-react';
import QRCode from 'qrcode';
import './Team.css';
import './Profile.css';
import { apiUrl } from '../../lib/api';

const BASE_MENU = [
    { id: 'profile', icon: <User size={18} />, label: 'โปรไฟล์', color: '#7c3aed' },
    { id: 'privacy', icon: <Shield size={18} />, label: 'ความเป็นส่วนตัว', color: '#3b82f6' },
    { id: 'social', icon: <Link2 size={18} />, label: 'ลิงก์โซเชียลมีเดีย', color: '#ec4899' },
    { id: 'public', icon: <Globe size={18} />, label: 'โปรไฟล์สาธารณะ', color: '#14b8a6' },
    { id: 'consent', icon: <FileText size={18} />, label: 'ข้อตกลง', color: '#f59e0b' },
];

/* ═══════════════════════════════════════════════════════════ */
function ProfileContent({ user }) {
    const navigate = useNavigate();
    const [tab, setTab] = useState('profile');
    const [toast, setToast] = useState(null);
    const [toastExiting, setToastExiting] = useState(false);
    const [canViewPrivileges, setCanViewPrivileges] = useState(false);

    const showToast = useCallback((message, type = 'success') => {
        setToastExiting(false);
        setToast({ message, type });
        setTimeout(() => {
            setToastExiting(true);
            setTimeout(() => { setToast(null); setToastExiting(false); }, 400);
        }, 2500);
    }, []);

    const apiFetch = useCallback(async (path, opts = {}) => {
        const headers = { ...opts.headers };
        const hasBody = opts.body !== undefined && opts.body !== null;
        const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData;
        if (hasBody && !isFormData && !('Content-Type' in headers) && !('content-type' in headers)) {
            headers['Content-Type'] = 'application/json';
        }

        const res = await fetch(apiUrl(`/api${path}`), {
            credentials: 'include',
            ...opts,
            headers,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'เกิดข้อผิดพลาด');
        return json;
    }, []);

    useEffect(() => {
        if (!user?.hasTeam || !user?.teamId) {
            setCanViewPrivileges(false);
            return;
        }
        apiFetch(`/teams/${user.teamId}`)
            .then((res) => setCanViewPrivileges(res?.data?.team?.status === 'confirmed'))
            .catch(() => setCanViewPrivileges(false));
    }, [apiFetch, user]);

    useEffect(() => {
        if (!canViewPrivileges && tab === 'privileges') {
            setTab('profile');
        }
    }, [canViewPrivileges, tab]);

    const menuItems = canViewPrivileges
        ? [...BASE_MENU.slice(0, 4), { id: 'privileges', icon: <Ticket size={18} />, label: 'สิทธิประโยชน์', color: '#0ea5e9' }, ...BASE_MENU.slice(4)]
        : BASE_MENU;

    if (!user) return null;

    return (
        <div className="gl-page-container">
            <div className="gl-frame">

                {/* ── LEFT: Menu Sidebar ── */}
                <aside className="gl-members-panel">
                    <div className="gl-members-header">
                        <h3>ตั้งค่าโปรไฟล์</h3>
                    </div>

                    <div className="gl-member-list">
                        {menuItems.map((m) => (
                            <button
                                key={m.id}
                                className={`pf-menu-item ${tab === m.id ? 'active' : ''}`}
                                onClick={() => setTab(m.id)}
                            >
                                <span className="pf-menu-icon" style={{ background: m.color }}>{m.icon}</span>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* ── RIGHT: Content Panel ── */}
                <main className="gl-content-panel" key={tab}>
                    {tab === 'profile' && <ProfileTab apiFetch={apiFetch} showToast={showToast} user={user} />}
                    {tab === 'privacy' && <PrivacyTab apiFetch={apiFetch} showToast={showToast} />}
                    {tab === 'social' && <SocialTab apiFetch={apiFetch} showToast={showToast} />}
                    {tab === 'public' && <PublicTab apiFetch={apiFetch} showToast={showToast} />}
                    {tab === 'privileges' && canViewPrivileges && <PrivilegesTab apiFetch={apiFetch} showToast={showToast} />}
                    {tab === 'consent' && <ConsentTab apiFetch={apiFetch} showToast={showToast} />}
                </main>

            </div>

            {/* Toast */}
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

function PrivilegesTab({ apiFetch, showToast }) {
    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState({ eligible: false, claims: [] });
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [qrImageFailed, setQrImageFailed] = useState(false);
    const [qrImageSrc, setQrImageSrc] = useState('');
    const [qrPreparing, setQrPreparing] = useState(false);
    const [refreshingClaimId, setRefreshingClaimId] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        apiFetch('/privileges/my')
            .then((res) => setPayload(res.data || { eligible: false, claims: [] }))
            .catch(() => showToast('โหลดข้อมูลสิทธิประโยชน์ไม่สำเร็จ', 'error'))
            .finally(() => setLoading(false));
    }, [apiFetch, showToast]);

    useEffect(() => { load(); }, [load]);

    const buildRemoteQrUrl = useCallback((token) => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(token)}`;
    }, []);

    useEffect(() => {
        setQrImageFailed(false);
        setQrImageSrc('');

        const token = selectedClaim?.qrToken;
        if (!token) {
            setQrPreparing(false);
            return;
        }

        let cancelled = false;
        setQrPreparing(true);

        QRCode.toDataURL(token, {
            width: 260,
            margin: 1,
            errorCorrectionLevel: 'M',
        })
            .then((src) => {
                if (cancelled) return;
                setQrImageSrc(src);
                setQrPreparing(false);
            })
            .catch(() => {
                if (cancelled) return;
                setQrImageSrc(buildRemoteQrUrl(token));
                setQrPreparing(false);
            });

        return () => {
            cancelled = true;
        };
    }, [buildRemoteQrUrl, selectedClaim?.claimId, selectedClaim?.qrToken]);

    const handleQrImageError = useCallback(() => {
        const token = selectedClaim?.qrToken;
        if (!token) {
            setQrImageFailed(true);
            return;
        }

        const remoteUrl = buildRemoteQrUrl(token);
        if (qrImageSrc && qrImageSrc !== remoteUrl) {
            setQrImageSrc(remoteUrl);
            return;
        }

        setQrImageFailed(true);
    }, [buildRemoteQrUrl, qrImageSrc, selectedClaim]);

    const copyToken = useCallback(async (token) => {
        const value = String(token || '').trim();
        if (!value) return false;

        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(value);
                return true;
            } catch {
                // fallback below
            }
        }

        try {
            const textarea = document.createElement('textarea');
            textarea.value = value;
            textarea.setAttribute('readonly', 'true');
            textarea.style.position = 'fixed';
            textarea.style.top = '-9999px';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const copied = document.execCommand('copy');
            document.body.removeChild(textarea);
            return copied;
        } catch {
            return false;
        }
    }, []);

    const handleRefreshQr = useCallback(async () => {
        if (!selectedClaim?.claimId) return;
        if (selectedClaim.claimStatus !== 'pending') {
            showToast('สิทธิ์นี้ถูกรับแล้ว ไม่สามารถรีเฟรช QR ได้', 'error');
            return;
        }

        setRefreshingClaimId(selectedClaim.claimId);
        try {
            const res = await apiFetch(`/privileges/my/${selectedClaim.claimId}/refresh-token`, {
                method: 'POST',
                body: JSON.stringify({}),
            });
            const updated = res?.data;
            if (!updated) throw new Error('refresh failed');

            setPayload((prev) => ({
                ...prev,
                claims: (prev.claims || []).map((claim) => (claim.claimId === updated.claimId ? updated : claim)),
            }));
            setSelectedClaim(updated);
            setQrImageFailed(false);
            showToast('รีเฟรช QR สำเร็จ');
        } catch (error) {
            showToast(error?.message || 'รีเฟรช QR ไม่สำเร็จ', 'error');
        } finally {
            setRefreshingClaimId(null);
        }
    }, [apiFetch, selectedClaim, showToast]);

    if (loading) return <div className="gl-empty-state"><Loader2 size={32} /></div>;

    const allClaims = payload.claims || [];
    const autoAdminClaims = allClaims.filter((claim) => claim.privilegeType === 'auto_admin');
    const qrClaims = allClaims.filter((claim) => claim.privilegeType !== 'auto_admin');

    if (!payload.eligible) {
        return (
            <div className="gl-detail-view">
                <div className="gl-detail-top">
                    <h3 className="gl-detail-title"><Ticket size={20} /> สิทธิประโยชน์</h3>
                </div>
                <div className="gl-detail-body">
                    <div className="gl-empty-state">
                        <Ticket size={44} />
                        <h3>ยังไม่มีสิทธิ์ที่สามารถใช้งานได้</h3>
                        <p>ฟีเจอร์นี้จะเปิดเมื่อทีมของคุณอยู่ในสถานะยืนยันเข้าร่วมแล้วเท่านั้น</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <h3 className="gl-detail-title"><Ticket size={20} /> สิทธิประโยชน์</h3>
            </div>
            <div className="gl-detail-body">
                {!allClaims.length ? (
                    <div className="gl-empty-state">
                        <QrCode size={44} />
                        <h3>ยังไม่มีสิทธิ์ที่เผยแพร่</h3>
                        <p>แอดมินยังไม่ได้เผยแพร่สิทธิ์สำหรับทีมที่ยืนยันเข้าร่วม</p>
                    </div>
                ) : (
                    <>
                        {autoAdminClaims.length > 0 && (
                            <div className="gl-info-card">
                                <h4><Ticket size={16} /> สิทธิ์การเข้าพักและทานอาหาร</h4>
                                {autoAdminClaims.map((claim) => (
                                    <div key={claim.claimId} className="pf-priv-item">
                                        <div>
                                            <div className="pf-priv-title">{claim.privilegeNameTh || claim.privilegeCode}</div>
                                        </div>
                                        <div className="pf-priv-right">
                                            <span className={`pf-priv-status ${claim.claimStatus === 'claimed' ? 'claimed' : 'pending'}`}>
                                                {claim.claimStatus === 'claimed' ? 'รับสิทธิ์แล้ว' : 'ยังไม่รับสิทธิ์'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {qrClaims.length > 0 && (
                            <div className="gl-info-card">
                                <h4><QrCode size={16} /> สิทธิ์การรับของที่ระลึก</h4>
                                {qrClaims.map((claim) => (
                                    <div key={claim.claimId} className="pf-priv-item">
                                        <div>
                                            <div className="pf-priv-title">{claim.privilegeNameTh || claim.privilegeCode}</div>
                                        </div>
                                        <div className="pf-priv-right">
                                            <span className={`pf-priv-status ${claim.claimStatus === 'claimed' ? 'claimed' : 'pending'}`}>
                                                {claim.claimStatus === 'claimed' ? 'รับสิทธิ์แล้ว' : 'ยังไม่รับสิทธิ์'}
                                            </span>
                                            <button className="gl-action-btn gl-submit-btn" style={{ padding: '8px 14px' }} onClick={() => setSelectedClaim(claim)}>
                                                <QrCode size={15} /> ดู QR
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedClaim && selectedClaim.privilegeType !== 'auto_admin' && (
                <div className="pf-modal-backdrop" onClick={() => setSelectedClaim(null)}>
                    <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
                        <h3><QrCode size={18} /> {selectedClaim.privilegeNameTh || selectedClaim.privilegeCode}</h3>
                        <div className="pf-qr-wrap">
                            {qrPreparing ? (
                                <div className="pf-qr-loading">
                                    <Loader2 size={26} />
                                    <p>กำลังสร้าง QR...</p>
                                </div>
                            ) : (!qrImageFailed && qrImageSrc) ? (
                                <img
                                    src={qrImageSrc}
                                    alt="Privilege QR"
                                    onError={handleQrImageError}
                                />
                            ) : (
                                <div className="pf-qr-fallback">
                                    <QrCode size={42} />
                                    <p>โหลดรูป QR ไม่สำเร็จบนอุปกรณ์นี้</p>
                                    <p>สามารถส่ง token ด้านล่างให้เจ้าหน้าที่กรอกแทนได้</p>
                                </div>
                            )}
                        </div>
                        <div className="pf-qr-token">{selectedClaim.qrToken}</div>
                        {selectedClaim.claimStatus === 'pending' ? (
                            <div className="pf-priv-sub">หากกังวลว่า QR ถูกแคปหน้าจอ สามารถกด Refresh QR เพื่อเปลี่ยน token ได้ทันที</div>
                        ) : (
                            <div className="pf-priv-sub">สิทธิ์นี้ถูกรับแล้ว จึงไม่สามารถรีเฟรช token ได้</div>
                        )}
                        <div className="pf-modal-actions">
                            <button className="gl-action-btn gl-invite-btn" onClick={() => setSelectedClaim(null)}>ปิด</button>
                            <button
                                className="gl-action-btn"
                                disabled={selectedClaim.claimStatus !== 'pending' || refreshingClaimId === selectedClaim.claimId}
                                onClick={handleRefreshQr}
                            >
                                {refreshingClaimId === selectedClaim.claimId ? <Loader2 size={15} /> : <RefreshCw size={15} />}
                                Refresh QR
                            </button>
                            <button
                                className="gl-action-btn gl-submit-btn"
                                style={{ flex: 1 }}
                                onClick={async () => {
                                    const copied = await copyToken(selectedClaim.qrToken);
                                    if (copied) {
                                        showToast('คัดลอก token แล้ว');
                                    } else {
                                        showToast('คัดลอก token ไม่สำเร็จ', 'error');
                                    }
                                }}
                            >
                                คัดลอก token
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Tab 1: Profile (1.6)
   ═══════════════════════════════════════════════════════════ */
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (!dateStr.includes('T')) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function ProfileTab({ apiFetch, showToast, user }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lockLoading, setLockLoading] = useState(false);
    const [profileLocked, setProfileLocked] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarDeleting, setAvatarDeleting] = useState(false);

    useEffect(() => {
        apiFetch('/user/profile')
            .then((r) => setData(r.data))
            .catch(() => showToast('โหลดข้อมูลไม่สำเร็จ', 'error'))
            .finally(() => setLoading(false));
    }, [apiFetch, showToast]);

    useEffect(() => {
        if (!user?.hasTeam || !user?.teamId || !user?.userId) {
            setProfileLocked(false);
            return;
        }
        setLockLoading(true);
        apiFetch(`/verification/team/${user.teamId}/status`)
            .then((r) => {
                const status = String(r.data?.teamStatus || '').toLowerCase();
                const lockedStatuses = ['submitted', 'passed', 'confirmed', 'failed', 'not_joined', 'disbanded'];
                setProfileLocked(lockedStatuses.includes(status));
            })
            .catch(() => setProfileLocked(false))
            .finally(() => setLockLoading(false));
    }, [apiFetch, user]);

    const syncLocalUserAvatar = useCallback((avatarUrl) => {
        try {
            const raw = localStorage.getItem('gt_user');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            localStorage.setItem('gt_user', JSON.stringify({ ...parsed, avatarUrl: avatarUrl || null }));
        } catch {
            // ignore localStorage parse error
        }
    }, []);

    const handleAvatarUpload = useCallback(async (file) => {
        if (!file) return;
        if (profileLocked) {
            showToast('ข้อมูลโปรไฟล์ถูกล็อกหลังยืนยันตัวตนแล้ว', 'error');
            return;
        }

        const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        if (!allowedMimeTypes.has(file.type)) {
            showToast('รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP', 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast('ขนาดไฟล์ต้องไม่เกิน 2MB', 'error');
            return;
        }

        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await apiFetch('/user/profile/avatar', {
                method: 'POST',
                body: formData,
            });
            const nextAvatarUrl = res?.data?.avatarUrl || null;
            setData((prev) => prev ? ({ ...prev, avatarUrl: nextAvatarUrl }) : prev);
            syncLocalUserAvatar(nextAvatarUrl);
            showToast('อัปโหลดรูปโปรไฟล์สำเร็จ');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setAvatarUploading(false);
        }
    }, [apiFetch, profileLocked, showToast, syncLocalUserAvatar]);

    const handleAvatarDelete = useCallback(async () => {
        if (profileLocked) {
            showToast('ข้อมูลโปรไฟล์ถูกล็อกหลังยืนยันตัวตนแล้ว', 'error');
            return;
        }
        if (!data?.avatarUrl) return;
        if (!confirm('ต้องการลบรูปโปรไฟล์หรือไม่?')) return;

        setAvatarDeleting(true);
        try {
            const res = await apiFetch('/user/profile/avatar', { method: 'DELETE' });
            const nextAvatarUrl = res?.data?.avatarUrl || null;
            setData((prev) => prev ? ({ ...prev, avatarUrl: nextAvatarUrl }) : prev);
            syncLocalUserAvatar(nextAvatarUrl);
            showToast('ลบรูปโปรไฟล์สำเร็จ');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setAvatarDeleting(false);
        }
    }, [apiFetch, data?.avatarUrl, profileLocked, showToast, syncLocalUserAvatar]);

    const handleSave = async () => {
        if (profileLocked) {
            showToast('ข้อมูลโปรไฟล์ถูกล็อกหลังยืนยันตัวตนแล้ว', 'error');
            return;
        }
        setSaving(true);
        try {
            const res = await apiFetch('/user/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    firstNameTh: data.firstNameTh || undefined,
                    lastNameTh: data.lastNameTh || undefined,
                    firstNameEn: data.firstNameEn || undefined,
                    lastNameEn: data.lastNameEn || undefined,
                    phone: data.phone || undefined,
                    institutionNameTh: data.institutionNameTh || undefined,
                    institutionNameEn: data.institutionNameEn || undefined,
                    gender: data.gender || undefined,
                    birthDate: data.birthDate ? formatDate(data.birthDate) : undefined,
                    educationLevel: data.educationLevel || undefined,
                    homeProvince: data.homeProvince || undefined,
                    userName: data.userName || undefined,
                }),
            });
            setData(res.data);
            showToast('บันทึกโปรไฟล์สำเร็จ');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading || lockLoading) return <div className="gl-empty-state"><Loader2 size={32} /></div>;
    if (!data) return null;

    const set = (key, val) => setData((d) => ({ ...d, [key]: val }));
    const avatarBusy = avatarUploading || avatarDeleting;
    const avatarInitial = (data.userName || user?.name || 'U').charAt(0).toUpperCase();

    return (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <h3 className="gl-detail-title"><User size={20} /> โปรไฟล์</h3>
            </div>
            <div className="gl-detail-body">
                {profileLocked && (
                    <div className="vf-info-banner vf-submitted">
                        <Lock size={16} />
                        <span>โปรไฟล์ถูกล็อกเพราะทีมส่งเอกสารยืนยันตัวตนแล้ว หากต้องการแก้ไขให้ติดต่อผู้จัดงาน</span>
                    </div>
                )}
                <fieldset disabled={profileLocked} className="pf-profile-form">
                {/* Account info (readonly) */}
                <div className="gl-info-card">
                    <h4><User size={16} /> ข้อมูลบัญชี</h4>
                    <div className="pf-avatar-section">
                        <div className="pf-avatar-preview" aria-label="Profile avatar preview">
                            {data.avatarUrl ? (
                                <img
                                    src={apiUrl(data.avatarUrl)}
                                    alt="รูปโปรไฟล์"
                                    className="pf-avatar-image"
                                />
                            ) : (
                                <span>{avatarInitial}</span>
                            )}
                        </div>
                        <div className="pf-avatar-controls">
                            <div className="pf-avatar-actions">
                                <label className={`gl-action-btn gl-submit-btn pf-avatar-upload-btn ${avatarBusy || profileLocked ? 'disabled' : ''}`}>
                                    {avatarUploading ? <Loader2 size={15} /> : <Upload size={15} />}
                                    {avatarUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปโปรไฟล์'}
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={avatarBusy || profileLocked}
                                        onChange={(e) => {
                                            const nextFile = e.target.files?.[0];
                                            if (nextFile) handleAvatarUpload(nextFile);
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                                <button
                                    className="gl-action-btn gl-invite-btn"
                                    type="button"
                                    onClick={handleAvatarDelete}
                                    disabled={avatarBusy || profileLocked || !data.avatarUrl}
                                >
                                    {avatarDeleting ? <Loader2 size={15} /> : <Trash2 size={15} />}
                                    ลบรูป
                                </button>
                            </div>
                            <p className="pf-avatar-hint">รองรับไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 2MB</p>
                        </div>
                    </div>
                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                        <div className="pf-field">
                            <span className="pf-label">Username</span>
                            <input className="pf-input" value={data.userName || ''} onChange={(e) => set('userName', e.target.value)} placeholder="username" />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">Email</span>
                            <input className="pf-input" value={data.email || ''} disabled />
                        </div>
                    </div>
                </div>

                <div className="gl-info-card">
                    <h4><User size={16} /> ข้อมูลส่วนตัว</h4>
                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                        <div className="pf-field">
                            <span className="pf-label">ชื่อ (TH)</span>
                            <input className="pf-input" value={data.firstNameTh || ''} onChange={(e) => set('firstNameTh', e.target.value)} placeholder="ชื่อภาษาไทย" />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">นามสกุล (TH)</span>
                            <input className="pf-input" value={data.lastNameTh || ''} onChange={(e) => set('lastNameTh', e.target.value)} placeholder="นามสกุลภาษาไทย" />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">First Name (EN)</span>
                            <input className="pf-input" value={data.firstNameEn || ''} onChange={(e) => set('firstNameEn', e.target.value)} placeholder="First name" />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">Last Name (EN)</span>
                            <input className="pf-input" value={data.lastNameEn || ''} onChange={(e) => set('lastNameEn', e.target.value)} placeholder="Last name" />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">วันเดือนปีเกิด</span>
                            <input type="date" lang="en-GB" className="pf-input" value={formatDate(data.birthDate)} onChange={(e) => set('birthDate', e.target.value)} />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">ภูมิลำเนา (จังหวัด)</span>
                            <input className="pf-input" value={data.homeProvince || ''} onChange={(e) => set('homeProvince', e.target.value)} placeholder="เช่น ขอนแก่น" />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">เพศ</span>
                            <select className="pf-input" value={data.gender || 'other'} onChange={(e) => set('gender', e.target.value)}>
                                <option value="male">ชาย</option>
                                <option value="female">หญิง</option>
                                <option value="other">ไม่ระบุ / อื่น ๆ</option>
                            </select>
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">เบอร์โทรศัพท์</span>
                            <input className="pf-input" value={data.phone || ''} onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                set('phone', value);
                            }} placeholder="08x-xxx-xxxx" maxLength={10} />
                        </div>
                    </div>
                </div>

                <div className="gl-info-card">
                    <h4><GraduationCap size={16} /> ข้อมูลการศึกษา</h4>
                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                        <div className="pf-field full">
                            <span className="pf-label">ระดับการศึกษา</span>
                            <select className="pf-input" value={data.educationLevel || 'bachelor'} onChange={(e) => set('educationLevel', e.target.value)}>
                                <option value="secondary">ม.ต้น</option>
                                <option value="high_school">ม.ปลาย</option>
                                <option value="bachelor">ป.ตรี</option>
                                <option value="master">ป.โท</option>
                                <option value="doctorate">ป.เอก</option>
                            </select>
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">สถาบันศึกษา (TH)</span>
                            <input className="pf-input" value={data.institutionNameTh || ''} onChange={(e) => set('institutionNameTh', e.target.value)} placeholder="เช่น มหาวิทยาลัยขอนแก่น" />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">Institution (EN)</span>
                            <input className="pf-input" value={data.institutionNameEn || ''} onChange={(e) => set('institutionNameEn', e.target.value)} placeholder="e.g. Khon Kaen University" />
                        </div>
                    </div>
                </div>

                <div className="pf-actions">
                    <button className="gl-action-btn gl-submit-btn" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 size={16} /> : <Save size={16} />}
                        บันทึก
                    </button>
                </div>
                </fieldset>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Tab 2: Privacy (1.7)
   ═══════════════════════════════════════════════════════════ */
function PrivacyTab({ apiFetch, showToast }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch('/user/privacy')
            .then((r) => setData(r.data))
            .catch(() => showToast('โหลดข้อมูลไม่สำเร็จ', 'error'))
            .finally(() => setLoading(false));
    }, [apiFetch, showToast]);

    const toggle = async (key) => {
        const newVal = !data[key];
        setData((d) => ({ ...d, [key]: newVal }));
        try {
            await apiFetch('/user/privacy', {
                method: 'PUT',
                body: JSON.stringify({ [key]: newVal }),
            });
            showToast('อัปเดตสำเร็จ');
        } catch (err) {
            setData((d) => ({ ...d, [key]: !newVal }));
            showToast(err.message, 'error');
        }
    };

    if (loading) return <div className="gl-empty-state"><Loader2 size={32} /></div>;
    if (!data) return null;

    const ITEMS = [
        { key: 'showEmail', label: 'แสดงอีเมล', desc: 'ให้คนอื่นเห็นอีเมลของคุณ' },
        { key: 'showPhone', label: 'แสดงเบอร์โทรศัพท์', desc: 'ให้คนอื่นเห็นเบอร์โทรของคุณ' },
        { key: 'showUniversity', label: 'แสดงมหาวิทยาลัย', desc: 'ให้คนอื่นเห็นสถาบันที่ศึกษา' },
        { key: 'showRealName', label: 'แสดงชื่อจริง', desc: 'ให้คนอื่นเห็นชื่อ-นามสกุลจริง' },
        { key: 'showSocialLinks', label: 'แสดงลิงก์โซเชียลมีเดีย', desc: 'ให้คนอื่นเห็นลิงก์โซเชียลมีเดีย' },
    ];

    return (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <h3 className="gl-detail-title"><Shield size={20} /> ความเป็นส่วนตัว</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-info-card">
                    <h4><Lock size={16} /> ควบคุมข้อมูลที่แสดงในโปรไฟล์สาธารณะ</h4>
                    {ITEMS.map((item) => (
                        <div key={item.key} className="gl-status-row">
                            <div>
                                <div className="gl-status-label">{item.label}</div>
                                <div className="gl-status-sub">{item.desc}</div>
                            </div>
                            <button className={`pf-toggle ${data[item.key] ? 'on' : ''}`} onClick={() => toggle(item.key)} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Tab 3: Social Links (1.8)
   ═══════════════════════════════════════════════════════════ */
function SocialTab({ apiFetch, showToast }) {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ platformCode: '', profileUrl: '', displayText: '' });
    const [editId, setEditId] = useState(null);

    const load = useCallback(() => {
        apiFetch('/user/social-links')
            .then((r) => setLinks(r.data || []))
            .catch(() => showToast('โหลดลิงก์โซเชียลมีเดียไม่สำเร็จ', 'error'))
            .finally(() => setLoading(false));
    }, [apiFetch, showToast]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        try {
            if (editId) {
                await apiFetch(`/user/social-links/${editId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ profileUrl: form.profileUrl, displayText: form.displayText || undefined }),
                });
                showToast('อัปเดตลิงก์โซเชียลมีเดียสำเร็จ');
            } else {
                await apiFetch('/user/social-links', {
                    method: 'POST',
                    body: JSON.stringify(form),
                });
                showToast('เพิ่มลิงก์โซเชียลมีเดียสำเร็จ');
            }
            setShowAdd(false);
            setEditId(null);
            setForm({ platformCode: '', profileUrl: '', displayText: '' });
            load();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('ต้องการลบลิงก์โซเชียลมีเดียนี้?')) return;
        try {
            await apiFetch(`/user/social-links/${id}`, { method: 'DELETE' });
            showToast('ลบลิงก์โซเชียลมีเดียสำเร็จ');
            load();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const openEdit = (link) => {
        setForm({ platformCode: link.platformCode, profileUrl: link.profileUrl, displayText: link.displayText || '' });
        setEditId(link.socialLinkId);
        setShowAdd(true);
    };

    const openAdd = () => {
        setEditId(null);
        setForm({ platformCode: '', profileUrl: '', displayText: '' });
        setShowAdd(true);
    };

    if (loading) return <div className="gl-empty-state"><Loader2 size={32} /></div>;

    const PLATFORMS = ['github', 'linkedin', 'twitter', 'facebook', 'instagram', 'discord', 'line', 'other'];

    return (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <h3 className="gl-detail-title"><Link2 size={20} /> ลิงก์โซเชียลมีเดีย</h3>
            </div>
            <div className="gl-detail-body">
                {links.length === 0 ? (
                    <div className="gl-empty-state">
                        <Link2 size={44} />
                        <h3>ยังไม่มีลิงก์โซเชียลมีเดีย</h3>
                        <p>เพิ่มลิงก์โซเชียลมีเดียเพื่อให้คนอื่นติดต่อคุณได้</p>
                        <button className="gl-action-btn gl-submit-btn" onClick={openAdd}>
                            <Plus size={16} /> เพิ่มลิงก์โซเชียลมีเดีย
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="gl-info-card">
                            <h4><Link2 size={16} /> ลิงก์ของคุณ</h4>
                            {links.map((link) => (
                                <div key={link.socialLinkId} className="pf-social-item">
                                    <span className="pf-social-platform">{link.platformCode}</span>
                                    <span className="pf-social-url">{link.displayText || link.profileUrl}</span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="pf-icon-btn" onClick={() => openEdit(link)} title="แก้ไข"><Edit2 size={14} /></button>
                                        <button className="pf-icon-btn danger" onClick={() => handleDelete(link.socialLinkId)} title="ลบ"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pf-actions">
                            <button className="gl-action-btn gl-invite-btn" onClick={openAdd}>
                                <Plus size={16} /> เพิ่มลิงก์โซเชียลมีเดีย
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Add / Edit Modal */}
            {showAdd && (
                <div className="pf-modal-backdrop" onClick={() => setShowAdd(false)}>
                    <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
                        <h3><Link2 size={18} /> {editId ? 'แก้ไข' : 'เพิ่ม'}ลิงก์โซเชียลมีเดีย</h3>
                        <div className="pf-field" style={{ marginBottom: 14 }}>
                            <span className="pf-label">Platform</span>
                            <select
                                className="pf-input"
                                value={form.platformCode}
                                onChange={(e) => setForm((f) => ({ ...f, platformCode: e.target.value }))}
                                disabled={!!editId}
                            >
                                <option value="">— เลือก —</option>
                                {PLATFORMS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="pf-field" style={{ marginBottom: 14 }}>
                            <span className="pf-label">URL</span>
                            <input className="pf-input" value={form.profileUrl} onChange={(e) => setForm((f) => ({ ...f, profileUrl: e.target.value }))} placeholder="https://..." />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">Display Text (ไม่บังคับ)</span>
                            <input className="pf-input" value={form.displayText} onChange={(e) => setForm((f) => ({ ...f, displayText: e.target.value }))} placeholder="เช่น @myhandle" />
                        </div>
                        <div className="pf-modal-actions">
                            <button className="gl-action-btn gl-invite-btn" onClick={() => setShowAdd(false)}>ยกเลิก</button>
                            <button className="gl-action-btn gl-submit-btn" style={{ flex: 1 }} onClick={handleSave} disabled={!form.platformCode || !form.profileUrl}>
                                <Save size={16} /> {editId ? 'บันทึก' : 'เพิ่ม'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Tab 4: Public Profile (1.9)
   ═══════════════════════════════════════════════════════════ */
function PublicTab({ apiFetch, showToast }) {
    const [data, setData] = useState({ bioTh: '', bioEn: '', lookingForTeam: false, contactNote: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiFetch('/user/public-profile')
            .then((r) => { if (r.data) setData(r.data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [apiFetch, showToast]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await apiFetch('/user/public-profile', {
                method: 'PUT',
                body: JSON.stringify({
                    bioTh: data.bioTh || null,
                    bioEn: data.bioEn || null,
                    lookingForTeam: data.lookingForTeam,
                    contactNote: data.contactNote || null,
                }),
            });
            setData(res.data);
            showToast('อัปเดตโปรไฟล์สาธารณะสำเร็จ');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="gl-empty-state"><Loader2 size={32} /></div>;

    const set = (key, val) => setData((d) => ({ ...d, [key]: val }));

    return (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <h3 className="gl-detail-title"><Globe size={20} /> โปรไฟล์สาธารณะ</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-info-card">
                    <h4><PenLine size={16} /> Bio</h4>
                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                        <div className="pf-field">
                            <span className="pf-label">Bio (TH)</span>
                            <textarea className="pf-input pf-textarea" value={data.bioTh || ''} onChange={(e) => set('bioTh', e.target.value)} placeholder="แนะนำตัวสั้นๆ ภาษาไทย..." />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">Bio (EN)</span>
                            <textarea className="pf-input pf-textarea" value={data.bioEn || ''} onChange={(e) => set('bioEn', e.target.value)} placeholder="A short introduction..." />
                        </div>
                    </div>
                </div>

                <div className="gl-info-card">
                    <h4><MessageCircle size={16} /> ช่องทางติดต่อ</h4>
                    <div className="pf-form-grid single" style={{ marginTop: 12 }}>
                        <div className="pf-field">
                            <span className="pf-label">Contact Note</span>
                            <input className="pf-input" value={data.contactNote || ''} onChange={(e) => set('contactNote', e.target.value)} placeholder="เช่น ติดต่อทาง LINE: @myline" />
                        </div>
                    </div>
                </div>

                <div className="pf-actions">
                    <button className="gl-action-btn gl-submit-btn" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 size={16} /> : <Save size={16} />}
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Tab 5: Consent (1.5)
   ═══════════════════════════════════════════════════════════ */
function ConsentTab({ apiFetch, showToast }) {
    const [docs, setDocs] = useState([]);
    const [myConsents, setMyConsents] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const [docsRes, myRes] = await Promise.all([
                apiFetch('/consent/documents'),
                apiFetch('/consent/me'),
            ]);
            setDocs(docsRes.data || []);
            setMyConsents(myRes.data || []);
        } catch {
            showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, showToast]);

    useEffect(() => { load(); }, [load]);

    const accept = async (consentDocId) => {
        try {
            await apiFetch('/consent/accept', {
                method: 'POST',
                body: JSON.stringify({ consentDocId }),
            });
            showToast('ยอมรับข้อตกลงสำเร็จ');
            load();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (loading) return <div className="gl-empty-state"><Loader2 size={32} /></div>;

    const isAccepted = (docId) => myConsents.some((c) => c.consentDocId === docId);

    return (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <h3 className="gl-detail-title"><FileText size={20} /> ข้อตกลงและเงื่อนไข</h3>
            </div>
            <div className="gl-detail-body">
                {docs.length === 0 ? (
                    <div className="gl-empty-state">
                        <FileText size={44} />
                        <h3>ไม่มีเอกสารข้อตกลง</h3>
                        <p>ยังไม่มีเอกสารข้อตกลงที่ต้องยอมรับในขณะนี้</p>
                    </div>
                ) : (
                    <div className="gl-info-card">
                        <h4><ClipboardList size={16} /> เอกสารข้อตกลง</h4>
                        {docs.map((doc) => (
                            <div key={doc.consentDocId} className="pf-consent-doc">
                                <div>
                                    <div className="pf-consent-title">{doc.titleTh || doc.titleEn}</div>
                                    <div className="pf-consent-version">{doc.version}</div>
                                </div>
                                {isAccepted(doc.consentDocId) ? (
                                    <span className="pf-consent-badge accepted"><CheckCircle size={14} /> ยอมรับแล้ว</span>
                                ) : (
                                    <button className="gl-action-btn gl-submit-btn" style={{ padding: '8px 18px', fontSize: '0.85rem' }} onClick={() => accept(doc.consentDocId)}>
                                        ยอมรับ
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProfileContent;
