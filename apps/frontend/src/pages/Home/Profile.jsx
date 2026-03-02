import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Shield, Link2, Globe, FileText,
    ChevronLeft, Save, Plus, Edit2, Trash2,
    CheckCircle, Loader2, AlertCircle,
    Lock, PenLine, Handshake, MessageCircle, ClipboardList,
    Languages, GraduationCap,
} from 'lucide-react';
import './Team.css';
import './Profile.css';
import { apiUrl } from '../../lib/api';

const MENU = [
    { id: 'profile', icon: <User size={18} />, label: 'โปรไฟล์', color: '#7c3aed' },
    { id: 'privacy', icon: <Shield size={18} />, label: 'ความเป็นส่วนตัว', color: '#3b82f6' },
    { id: 'social', icon: <Link2 size={18} />, label: 'Social Links', color: '#ec4899' },
    { id: 'public', icon: <Globe size={18} />, label: 'Public Profile', color: '#14b8a6' },
    { id: 'consent', icon: <FileText size={18} />, label: 'ข้อตกลง', color: '#f59e0b' },
];

/* ═══════════════════════════════════════════════════════════ */
function ProfileContent({ user }) {
    const navigate = useNavigate();
    const [tab, setTab] = useState('profile');
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    }, []);

    const apiFetch = useCallback(async (path, opts = {}) => {
        const res = await fetch(apiUrl(`/api${path}`), {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...opts.headers },
            ...opts,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'เกิดข้อผิดพลาด');
        return json;
    }, []);

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
                        {MENU.map((m) => (
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
                    {tab === 'consent' && <ConsentTab apiFetch={apiFetch} showToast={showToast} />}
                </main>

            </div>

            {/* Toast */}
            {toast && (
                <div className={`pf-toast show ${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
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

    useEffect(() => {
        apiFetch('/user/profile')
            .then((r) => setData(r.data))
            .catch(() => showToast('โหลดข้อมูลไม่สำเร็จ', 'error'))
            .finally(() => setLoading(false));
    }, [apiFetch, showToast]);

    const handleSave = async () => {
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

    if (loading) return <div className="gl-empty-state"><Loader2 size={32} /></div>;
    if (!data) return null;

    const set = (key, val) => setData((d) => ({ ...d, [key]: val }));

    return (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <h3 className="gl-detail-title"><User size={20} /> โปรไฟล์</h3>
            </div>
            <div className="gl-detail-body">
                {/* Account info (readonly) */}
                <div className="gl-info-card">
                    <h4><User size={16} /> ข้อมูลบัญชี</h4>
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

                {/* Thai info */}
                <div className="gl-info-card">
                    <h4><Languages size={16} /> ข้อมูลภาษาไทย</h4>
                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                        <div className="pf-field">
                            <span className="pf-label">ชื่อ (TH)</span>
                            <input className="pf-input" value={data.firstNameTh || ''} onChange={(e) => set('firstNameTh', e.target.value)} placeholder="ชื่อภาษาไทย" />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">นามสกุล (TH)</span>
                            <input className="pf-input" value={data.lastNameTh || ''} onChange={(e) => set('lastNameTh', e.target.value)} placeholder="นามสกุลภาษาไทย" />
                        </div>
                    </div>
                </div>

                {/* English info */}
                <div className="gl-info-card">
                    <h4><Globe size={16} /> ข้อมูลภาษาอังกฤษ</h4>
                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                        <div className="pf-field">
                            <span className="pf-label">First Name (EN)</span>
                            <input className="pf-input" value={data.firstNameEn || ''} onChange={(e) => set('firstNameEn', e.target.value)} placeholder="First name" />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">Last Name (EN)</span>
                            <input className="pf-input" value={data.lastNameEn || ''} onChange={(e) => set('lastNameEn', e.target.value)} placeholder="Last name" />
                        </div>
                    </div>
                </div>

                <div className="gl-info-card">
                    <h4><GraduationCap size={16} /> ข้อมูลการศึกษา</h4>
                    <div className="pf-form-grid" style={{ marginTop: 12 }}>
                        <div className="pf-field">
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
                            <span className="pf-label">เพศ</span>
                            <select className="pf-input" value={data.gender || 'prefer_not_to_say'} onChange={(e) => set('gender', e.target.value)}>
                                <option value="male">ชาย</option>
                                <option value="female">หญิง</option>
                                <option value="other">อื่น ๆ</option>
                                <option value="prefer_not_to_say">ไม่ระบุ</option>
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
                        <div className="pf-field">
                            <span className="pf-label">วันเดือนปีเกิด</span>
                            <input type="date" lang="en-GB" className="pf-input" value={formatDate(data.birthDate)} onChange={(e) => set('birthDate', e.target.value)} />
                        </div>
                        <div className="pf-field">
                            <span className="pf-label">ภูมิลำเนา (จังหวัด)</span>
                            <input className="pf-input" value={data.homeProvince || ''} onChange={(e) => set('homeProvince', e.target.value)} placeholder="เช่น ขอนแก่น" />
                        </div>
                        <div className="pf-field full">
                            <span className="pf-label">เบอร์โทรศัพท์</span>
                            <input className="pf-input" value={data.phone || ''} onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                set('phone', value);
                            }} placeholder="08x-xxx-xxxx" maxLength={10} />
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
        { key: 'showSocialLinks', label: 'แสดง Social Links', desc: 'ให้คนอื่นเห็นลิงก์โซเชียลมีเดีย' },
    ];

    return (
        <div className="gl-detail-view">
            <div className="gl-detail-top">
                <h3 className="gl-detail-title"><Shield size={20} /> ความเป็นส่วนตัว</h3>
            </div>
            <div className="gl-detail-body">
                <div className="gl-info-card">
                    <h4><Lock size={16} /> ควบคุมข้อมูลที่แสดงใน Public Profile</h4>
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
            .catch(() => showToast('โหลด social links ไม่สำเร็จ', 'error'))
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
                showToast('อัปเดต social link สำเร็จ');
            } else {
                await apiFetch('/user/social-links', {
                    method: 'POST',
                    body: JSON.stringify(form),
                });
                showToast('เพิ่ม social link สำเร็จ');
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
        if (!confirm('ต้องการลบ social link นี้?')) return;
        try {
            await apiFetch(`/user/social-links/${id}`, { method: 'DELETE' });
            showToast('ลบ social link สำเร็จ');
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
                <h3 className="gl-detail-title"><Link2 size={20} /> Social Links</h3>
            </div>
            <div className="gl-detail-body">
                {links.length === 0 ? (
                    <div className="gl-empty-state">
                        <Link2 size={44} />
                        <h3>ยังไม่มี Social Links</h3>
                        <p>เพิ่มลิงก์โซเชียลมีเดียเพื่อให้คนอื่นติดต่อคุณได้</p>
                        <button className="gl-action-btn gl-submit-btn" onClick={openAdd}>
                            <Plus size={16} /> เพิ่ม Social Link
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
                                <Plus size={16} /> เพิ่ม Social Link
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Add / Edit Modal */}
            {showAdd && (
                <div className="pf-modal-backdrop" onClick={() => setShowAdd(false)}>
                    <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
                        <h3><Link2 size={18} /> {editId ? 'แก้ไข' : 'เพิ่ม'} Social Link</h3>
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
            showToast('อัปเดต Public Profile สำเร็จ');
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
                <h3 className="gl-detail-title"><Globe size={20} /> Public Profile</h3>
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
                    <h4><Handshake size={16} /> ค้นหาทีม</h4>
                    <div className="gl-status-row" style={{ borderBottom: 'none' }}>
                        <div>
                            <div className="gl-status-label">กำลังหาทีม</div>
                            <div className="gl-status-sub">แสดงในรายชื่อคนหาทีม ให้คนอื่นชวนเข้าร่วม</div>
                        </div>
                        <button className={`pf-toggle ${data.lookingForTeam ? 'on' : ''}`} onClick={() => set('lookingForTeam', !data.lookingForTeam)} />
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
                                    <div className="pf-consent-version">v{doc.version}</div>
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
