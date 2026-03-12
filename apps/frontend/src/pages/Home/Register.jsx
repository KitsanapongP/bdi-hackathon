import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { DatePicker } from 'antd';
import {
    Loader2,
    Rocket,
    Eye,
    EyeOff,
    FileText,
    X,
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import GameShapes from '../../components/GameShapes';
import './Home.css';
import './Register.css';
import { apiUrl } from '../../lib/api';

const EDUCATION_OPTIONS = [
    { value: 'secondary', label: 'มัธยมศึกษาตอนต้น' },
    { value: 'high_school', label: 'มัธยมศึกษาตอนปลาย' },
    { value: 'bachelor', label: 'ปริญญาตรี' },
    { value: 'master', label: 'ปริญญาโท' },
    { value: 'doctorate', label: 'ปริญญาเอก' },
];

const GENDER_OPTIONS = [
    { value: 'male', label: 'ชาย' },
    { value: 'female', label: 'หญิง' },
    { value: 'other', label: 'อื่น ๆ' },
    { value: 'prefer_not_to_say', label: 'ไม่ระบุ' },
];

const TERMS_DOC_CODES = ['TERMS'];
const PRIVACY_DOC_CODES = ['PRIVACY', 'PDPA'];

function RegisterPage() {
    const navigate = useNavigate();
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPass, setLoginPass] = useState('');

    const [regUserName, setRegUserName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regConfirmPass, setRegConfirmPass] = useState('');
    const [regFullNameTh, setRegFullNameTh] = useState('');
    const [regFullNameEn, setRegFullNameEn] = useState('');
    const [regGender, setRegGender] = useState('male');
    const [regBirthDate, setRegBirthDate] = useState('');
    const [regEducationLevel, setRegEducationLevel] = useState('bachelor');
    const [regInstitutionNameTh, setRegInstitutionNameTh] = useState('');
    const [regInstitutionNameEn, setRegInstitutionNameEn] = useState('');
    const [regHomeProvince, setRegHomeProvince] = useState('');

    const [registerStep, setRegisterStep] = useState('form');
    const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationExpiresAt, setVerificationExpiresAt] = useState('');
    const [verificationCountdown, setVerificationCountdown] = useState(0);

    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [showLoginPass, setShowLoginPass] = useState(false);
    const [showRegPass, setShowRegPass] = useState(false);
    const [showRegConfirmPass, setShowRegConfirmPass] = useState(false);

    const [consentDocs, setConsentDocs] = useState([]);
    const [hasAcceptedConsent, setHasAcceptedConsent] = useState(false);
    const [isConsentLoading, setIsConsentLoading] = useState(false);
    const [selectedConsentDoc, setSelectedConsentDoc] = useState(null);

    useEffect(() => {
        const saved = localStorage.getItem('gt_user');
        if (saved) {
            navigate('/home', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (!isRegisterMode) return;

        let cancelled = false;

        const loadConsentDocuments = async () => {
            setIsConsentLoading(true);
            try {
                const res = await fetch(apiUrl('/api/consent/documents'), {
                    credentials: 'include',
                });
                const data = await res.json();

                if (!res.ok || !data.ok) {
                    throw new Error(data.message || 'ไม่สามารถโหลดเอกสารข้อตกลงได้');
                }

                if (cancelled) return;

                const docs = Array.isArray(data.data) ? data.data : [];
                setConsentDocs(docs);
            } catch (err) {
                if (!cancelled) {
                    setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถโหลดเอกสารข้อตกลงได้');
                }
            } finally {
                if (!cancelled) setIsConsentLoading(false);
            }
        };

        loadConsentDocuments();

        return () => {
            cancelled = true;
        };
    }, [isRegisterMode]);

    useEffect(() => {
        if (!isRegisterMode || registerStep !== 'verify' || !verificationExpiresAt) {
            setVerificationCountdown(0);
            return;
        }

        const updateCountdown = () => {
            const remainingMs = new Date(verificationExpiresAt).getTime() - Date.now();
            const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
            setVerificationCountdown(remainingSec);
        };

        updateCountdown();
        const timer = window.setInterval(updateCountdown, 1000);
        return () => window.clearInterval(timer);
    }, [isRegisterMode, registerStep, verificationExpiresAt]);

    const resetVerificationState = () => {
        setRegisterStep('form');
        setPendingVerificationEmail('');
        setVerificationCode('');
        setVerificationExpiresAt('');
        setVerificationCountdown(0);
    };

    const formatVerificationCountdown = (seconds) => {
        const safeSeconds = Math.max(0, seconds);
        const mins = Math.floor(safeSeconds / 60);
        const secs = safeSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const saveUserAndRedirect = (user) => {
        const userInfo = {
            userId: user.userId,
            name: user.userName,
            email: user.email,
            accessRole: user.accessRole || null,
            hasTeam: user.hasTeam || false,
            teamId: user.teamId || null,
            avatar: user.userName?.charAt(0)?.toUpperCase() || 'U',
            color: '#6366f1',
        };
        localStorage.setItem('gt_user', JSON.stringify(userInfo));

        if (user.accessRole === 'admin') {
            navigate('/admin', { replace: true });
        } else {
            navigate('/home', { replace: true });
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setIsLoading(true);

        try {
            const res = await fetch(apiUrl('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: loginEmail, password: loginPass }),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setErrorMsg(data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
                return;
            }

            saveUserAndRedirect(data.data);
        } catch {
            setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    const splitName = (fullName) => {
        const trimmed = fullName.trim();
        const idx = trimmed.indexOf(' ');
        if (idx === -1) return { firstName: trimmed, lastName: '' };
        return { firstName: trimmed.substring(0, idx), lastName: trimmed.substring(idx + 1).trim() };
    };

    const findConsentDocByCodes = (codes) => {
        const normalizedCodes = codes.map((code) => code.toUpperCase());
        return consentDocs.find((doc) => normalizedCodes.includes((doc.docCode || '').toUpperCase()));
    };

    const termsDoc = findConsentDocByCodes(TERMS_DOC_CODES);
    const privacyDoc = findConsentDocByCodes(PRIVACY_DOC_CODES);

    const openConsentModalByCodes = (codes) => {
        const doc = findConsentDocByCodes(codes);
        if (!doc) {
            setErrorMsg('ไม่พบเอกสารข้อตกลงที่ต้องการ');
            return;
        }
        setErrorMsg('');
        setSelectedConsentDoc(doc);
    };

    const closeConsentModal = () => {
        setSelectedConsentDoc(null);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!regFullNameTh.trim().includes(' ')) {
            setErrorMsg('กรุณากรอกชื่อและนามสกุล (ภาษาไทย) โดยเว้นวรรคระหว่างชื่อกับนามสกุล');
            return;
        }
        if (!regFullNameEn.trim().includes(' ')) {
            setErrorMsg('กรุณากรอกชื่อและนามสกุล (ภาษาอังกฤษ) โดยเว้นวรรคระหว่างชื่อกับนามสกุล');
            return;
        }
        if (regUserName.length < 3) {
            setErrorMsg('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');
            return;
        }
        if (regPass !== regConfirmPass) {
            setErrorMsg('รหัสผ่านไม่ตรงกัน');
            return;
        }
        if (regPass.length < 6) {
            setErrorMsg('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }
        if (!regBirthDate) {
            setErrorMsg('กรุณาเลือกวันเดือนปีเกิด');
            return;
        }
        if (isConsentLoading) {
            setErrorMsg('กำลังโหลดเอกสารข้อตกลง กรุณารอสักครู่');
            return;
        }
        if (consentDocs.length === 0) {
            setErrorMsg('ไม่พบเอกสารข้อตกลงสำหรับการสมัครสมาชิก');
            return;
        }

        if (!termsDoc || !privacyDoc) {
            setErrorMsg('ไม่พบเอกสารข้อตกลงที่จำเป็นสำหรับการสมัครสมาชิก');
            return;
        }

        if (!hasAcceptedConsent) {
            setErrorMsg('กรุณายืนยันการยอมรับข้อกำหนดการใช้งานและนโยบายคุ้มครองข้อมูลส่วนบุคคล');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(apiUrl('/api/auth/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    userName: regUserName,
                    email: regEmail,
                    phone: regPhone,
                    password: regPass,
                    firstNameTh: splitName(regFullNameTh).firstName,
                    lastNameTh: splitName(regFullNameTh).lastName,
                    firstNameEn: splitName(regFullNameEn).firstName,
                    lastNameEn: splitName(regFullNameEn).lastName,
                    gender: regGender,
                    birthDate: regBirthDate,
                    educationLevel: regEducationLevel,
                    institutionNameTh: regInstitutionNameTh,
                    institutionNameEn: regInstitutionNameEn,
                    homeProvince: regHomeProvince,
                    acceptedConsentDocIds: [termsDoc.consentDocId, privacyDoc.consentDocId],
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setErrorMsg(data.message || 'ไม่สามารถสมัครสมาชิกได้');
                return;
            }

            const nextEmail = data?.data?.email || regEmail.trim();
            const nextExpiresAt = data?.data?.expiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString();

            setPendingVerificationEmail(nextEmail);
            setVerificationCode('');
            setVerificationExpiresAt(nextExpiresAt);
            setRegisterStep('verify');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyRegister = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        const normalizedCode = verificationCode.replace(/\D/g, '').slice(0, 6);
        if (!pendingVerificationEmail) {
            setErrorMsg('ไม่พบอีเมลสำหรับยืนยัน กรุณาสมัครใหม่อีกครั้ง');
            resetVerificationState();
            return;
        }
        if (normalizedCode.length !== 6) {
            setErrorMsg('กรุณากรอกรหัสยืนยัน 6 หลัก');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(apiUrl('/api/auth/register/verify'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: pendingVerificationEmail, code: normalizedCode }),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setErrorMsg(data.message || 'ไม่สามารถยืนยันรหัสได้');
                return;
            }

            saveUserAndRedirect(data.data);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setErrorMsg('');

        if (!pendingVerificationEmail) {
            setErrorMsg('ไม่พบอีเมลสำหรับยืนยัน กรุณาสมัครใหม่อีกครั้ง');
            resetVerificationState();
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(apiUrl('/api/auth/register/resend'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: pendingVerificationEmail }),
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                setErrorMsg(data.message || 'ไม่สามารถส่งรหัสใหม่ได้');
                return;
            }

            const nextExpiresAt = data?.data?.expiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString();
            setVerificationExpiresAt(nextExpiresAt);
            setVerificationCode('');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="gr-page">
            <GameShapes sizeRange={[18, 40]} depthLayers={2} seed={99} />
            <div className="gr-login-wrap">
                <div className={`gr-login-card ${isRegisterMode ? 'is-register' : ''}`}>
                    <div className="gt-badge" style={{ marginBottom: 20 }}>
                        <Rocket size={16} /> Hackathon 2026
                    </div>
                    <h2 style={{ color: 'var(--gt-text)' }}>
                        {isRegisterMode ? (registerStep === 'verify' ? 'ยืนยันอีเมล' : 'สมัครสมาชิก') : 'เข้าสู่ระบบ'}
                    </h2>

                    {errorMsg && <div style={{ color: '#ef4444', textAlign: 'center', marginBottom: 16, fontSize: '0.9rem', background: '#fee2e2', padding: 8, borderRadius: 8 }}>{errorMsg}</div>}

                    {!isRegisterMode ? (
                        <form onSubmit={handleLogin} autoComplete="on">
                            <div className="gr-input-group"><label>อีเมล</label><input type="email" name="loginEmail" autoComplete="username" className="gr-input" placeholder="อีเมลของคุณ" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>รหัสผ่าน</label><div className="gr-password-wrap"><input type={showLoginPass ? 'text' : 'password'} name="loginPassword" autoComplete="current-password" className="gr-input" placeholder="รหัสผ่าน" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required disabled={isLoading} /><button type="button" className="gr-password-toggle" onClick={() => setShowLoginPass(!showLoginPass)} tabIndex={-1}>{showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                            <button type="submit" className="gt-btn gt-btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={isLoading}>{isLoading ? <><Loader2 size={18} className="spin" /> กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}</button>
                        </form>
                    ) : registerStep === 'verify' ? (
                        <form onSubmit={handleVerifyRegister} autoComplete="off" data-lpignore="true" className="gr-verify-form">
                            <div className="gr-verify-panel">
                                <p className="gr-verify-text">
                                    เราได้ส่งรหัสยืนยัน 6 หลักไปที่อีเมล
                                    <br />
                                    <strong>{pendingVerificationEmail}</strong>
                                </p>
                                <p className="gr-verify-timer">
                                    หมดอายุใน <strong>{formatVerificationCountdown(verificationCountdown)}</strong>
                                </p>
                                <div className="gr-input-group" style={{ marginBottom: 10 }}>
                                    <label>รหัสยืนยัน (6 หลัก)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        className="gr-input gr-verify-code-input"
                                        placeholder="เช่น 123456"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                            setVerificationCode(value);
                                        }}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <button type="submit" className="gt-btn gt-btn-primary" style={{ width: '100%' }} disabled={isLoading}>
                                    {isLoading ? <><Loader2 size={18} className="spin" /> กำลังยืนยัน...</> : 'ยืนยันรหัส'}
                                </button>
                                <div className="gr-verify-actions">
                                    <button
                                        type="button"
                                        className="gt-btn gt-btn-secondary"
                                        onClick={handleResendVerification}
                                        disabled={isLoading}
                                        style={{ width: '100%' }}
                                    >
                                        ส่งรหัสใหม่
                                    </button>
                                    <button
                                        type="button"
                                        className="gt-btn"
                                        onClick={resetVerificationState}
                                        disabled={isLoading}
                                        style={{ width: '100%' }}
                                    >
                                        กลับไปแก้ข้อมูล
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} autoComplete="off" data-lpignore="true">
                            <input type="text" name="registerFakeUsername" autoComplete="username" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }} />
                            <input type="password" name="registerFakePassword" autoComplete="current-password" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }} />
                            <div className="gr-register-form">
                                <section className="gr-form-section">
                                    <h3>ข้อมูลส่วนตัว</h3>
                                    <div className="gr-form-grid gr-form-grid-2">
                                        <div className="gr-input-group"><label>ชื่อ-นามสกุล (ภาษาไทย)</label><input type="text" name="registerFullNameTh" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="เช่น สมชาย ใจดี" value={regFullNameTh} onChange={(e) => setRegFullNameTh(e.target.value)} required disabled={isLoading} /></div>
                                        <div className="gr-input-group"><label>ชื่อ-นามสกุล (ภาษาอังกฤษ)</label><input type="text" name="registerFullNameEn" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="e.g. Somchai Jaidee" value={regFullNameEn} onChange={(e) => setRegFullNameEn(e.target.value)} required disabled={isLoading} /></div>
                                        <div className="gr-input-group"><label>เพศ (Gender)</label><select className="gr-input" autoComplete="off" data-lpignore="true" value={regGender} onChange={(e) => setRegGender(e.target.value)} disabled={isLoading}>{GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
                                        <div className="gr-input-group">
                                            <label>วันเดือนปีเกิด (Date of Birth)</label>
                                            <DatePicker
                                                className="gr-date-picker"
                                                format="DD/MM/YYYY"
                                                placeholder="วัน/เดือน/ปี"
                                                value={regBirthDate ? dayjs(regBirthDate, 'YYYY-MM-DD') : null}
                                                onChange={(value) => setRegBirthDate(value ? value.format('YYYY-MM-DD') : '')}
                                                allowClear={false}
                                                disabled={isLoading}
                                                disabledDate={(current) => current && current > dayjs().endOf('day')}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="gr-form-section">
                                    <h3>ข้อมูลการศึกษา</h3>
                                    <div className="gr-form-grid gr-form-grid-2">
                                        <div className="gr-input-group"><label>ระดับการศึกษา (Education Level)</label><select className="gr-input" autoComplete="off" data-lpignore="true" value={regEducationLevel} onChange={(e) => setRegEducationLevel(e.target.value)} disabled={isLoading}>{EDUCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                                        <div className="gr-input-group"><label>ภูมิลำเนา (Province)</label><input type="text" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="เช่น ขอนแก่น" value={regHomeProvince} onChange={(e) => setRegHomeProvince(e.target.value)} required disabled={isLoading} /></div>
                                        <div className="gr-input-group"><label>ชื่อสถาบันศึกษา (ภาษาไทย)</label><input type="text" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="เช่น มหาวิทยาลัยขอนแก่น" value={regInstitutionNameTh} onChange={(e) => setRegInstitutionNameTh(e.target.value)} required disabled={isLoading} /></div>
                                        <div className="gr-input-group"><label>ชื่อสถาบันศึกษา (ภาษาอังกฤษ)</label><input type="text" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="e.g. Khon Kaen University" value={regInstitutionNameEn} onChange={(e) => setRegInstitutionNameEn(e.target.value)} required disabled={isLoading} /></div>
                                    </div>
                                </section>

                                <section className="gr-form-section">
                                    <h3>ข้อมูลบัญชีผู้ใช้</h3>
                                    <div className="gr-form-grid gr-form-grid-2">
                                        <div className="gr-input-group"><label>ชื่อผู้ใช้ (Username)</label><input type="text" name="registerUsername" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="อย่างน้อย 3 ตัวอักษร" value={regUserName} onChange={(e) => setRegUserName(e.target.value)} required disabled={isLoading} minLength={3} maxLength={50} /></div>
                                        <div className="gr-input-group"><label>เบอร์โทรศัพท์ (Phone Number)</label><input type="tel" name="registerPhone" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="เช่น 0812345678" value={regPhone} onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setRegPhone(value);
                                        }} required disabled={isLoading} minLength={9} maxLength={10} /></div>
                                        <div className="gr-input-group"><label>อีเมล (Email)</label><input type="email" name="registerEmail" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="somchai.jaidee@kku.ac.th" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required disabled={isLoading} /></div>
                                        <div className="gr-input-group"><label>รหัสผ่าน (Password)</label><div className="gr-password-wrap"><input type={showRegPass ? 'text' : 'password'} name="registerPassword" autoComplete="new-password" data-lpignore="true" className="gr-input" placeholder="อย่างน้อย 6 ตัวอักษร" value={regPass} onChange={(e) => setRegPass(e.target.value)} required disabled={isLoading} minLength={6} /><button type="button" className="gr-password-toggle" onClick={() => setShowRegPass(!showRegPass)} tabIndex={-1}>{showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                                        <div className="gr-input-group gr-grid-span-2"><label>ยืนยันรหัสผ่าน (Confirm Password)</label><div className="gr-password-wrap"><input type={showRegConfirmPass ? 'text' : 'password'} name="registerConfirmPassword" autoComplete="new-password" data-lpignore="true" className="gr-input" placeholder="ยืนยันรหัสผ่านอีกครั้ง" value={regConfirmPass} onChange={(e) => setRegConfirmPass(e.target.value)} required disabled={isLoading} minLength={6} /><button type="button" className="gr-password-toggle" onClick={() => setShowRegConfirmPass(!showRegConfirmPass)} tabIndex={-1}>{showRegConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                                    </div>
                                </section>
                            </div>

                            {isConsentLoading ? (
                                <div className="gr-consent-loading">
                                    <div className="gr-consent-loading-spinner"><Loader2 size={20} className="spin" /></div>
                                    <span>กำลังโหลดเอกสารข้อตกลง...</span>
                                </div>
                            ) : (
                                <div className="gr-consent-inline-wrap">
                                    <div className="gr-consent-checkbox-row">
                                        <input
                                            id="register-consent-checkbox"
                                            type="checkbox"
                                            className="gr-consent-checkbox"
                                            checked={hasAcceptedConsent}
                                            onChange={(e) => setHasAcceptedConsent(e.target.checked)}
                                            disabled={isLoading}
                                        />
                                        <p className="gr-consent-inline-text">
                                            ฉันได้อ่านและยอมรับ{' '}
                                            <button type="button" className="gr-consent-inline-link" onClick={() => openConsentModalByCodes(TERMS_DOC_CODES)} disabled={isLoading}>
                                                ข้อกำหนดการใช้งาน
                                            </button>{' '}
                                            และ{' '}
                                            <button type="button" className="gr-consent-inline-link" onClick={() => openConsentModalByCodes(PRIVACY_DOC_CODES)} disabled={isLoading}>
                                                นโยบายคุ้มครองข้อมูลส่วนบุคคล
                                            </button>{' '}
                                            ของเว็บไซต์นี้
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="gt-btn gt-btn-primary" style={{ width: '100%'}} disabled={isLoading}>{isLoading ? <><Loader2 size={18} className="spin" /> กำลังสมัครสมาชิก...</> : 'สมัครสมาชิก'}</button>
                        </form>
                    )}

                    <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--gt-text-muted)' }}>
                        {isRegisterMode
                            ? <>มีบัญชีแล้ว? <a href="#" onClick={(e) => { e.preventDefault(); setErrorMsg(''); resetVerificationState(); setIsRegisterMode(false); }} style={{ color: 'var(--gt-primary, #7c3aed)', fontWeight: 600 }}>เข้าสู่ระบบ</a></>
                            : <>ยังไม่มีบัญชี? <a href="#" onClick={(e) => { e.preventDefault(); setErrorMsg(''); resetVerificationState(); setIsRegisterMode(true); }} style={{ color: 'var(--gt-primary, #7c3aed)', fontWeight: 600 }}>สมัครสมาชิก</a></>}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}><ThemeToggle /></div>
                </div>
            </div>

            {selectedConsentDoc && (
                <div className="gr-consent-modal-backdrop" onClick={closeConsentModal}>
                    <div className="gr-consent-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="gr-consent-modal-header">
                            <div className="gr-consent-modal-header-left">
                                <div className="gr-consent-modal-icon">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3>{selectedConsentDoc.titleTh || selectedConsentDoc.titleEn || 'ข้อตกลงและเงื่อนไข'}</h3>
                                </div>
                            </div>
                            <button type="button" className="gr-consent-close-btn" onClick={closeConsentModal} aria-label="ปิด">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="gr-consent-content">
                            {(selectedConsentDoc.contentTh || selectedConsentDoc.contentEn || '').split('\n').map((line, idx) => (
                                <p key={`${selectedConsentDoc.consentDocId}-${idx}`}>{line || '\u00A0'}</p>
                            ))}
                        </div>

                        <div className="gr-consent-modal-footer">
                            <div className="gr-consent-actions">
                                <button type="button" className="gr-consent-btn-cancel" onClick={closeConsentModal}>ปิด</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RegisterPage;
