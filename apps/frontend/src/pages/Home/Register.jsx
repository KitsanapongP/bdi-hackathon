import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Gamepad2,
    Loader2,
    Rocket,
    Eye,
    EyeOff,
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

function RegisterPage() {
    const navigate = useNavigate();
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPass, setLoginPass] = useState('');

    const [regUserName, setRegUserName] = useState('');
    const [regEmail, setRegEmail] = useState('');
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

    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [showLoginPass, setShowLoginPass] = useState(false);
    const [showRegPass, setShowRegPass] = useState(false);
    const [showRegConfirmPass, setShowRegConfirmPass] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('gt_user');
        if (saved) {
            navigate('/home', { replace: true });
        }
    }, [navigate]);

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
        } catch (err) {
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

        setIsLoading(true);

        try {
            const res = await fetch(apiUrl('/api/auth/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    userName: regUserName,
                    email: regEmail,
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
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setErrorMsg(data.message || 'ไม่สามารถสมัครสมาชิกได้');
                return;
            }

            saveUserAndRedirect(data.data);
        } catch (err) {
            setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="gr-page">
            <GameShapes sizeRange={[18, 40]} depthLayers={2} seed={99} />
            <div className="gr-login-wrap">
                <div className="gr-login-card">
                    <div className="gt-badge" style={{ marginBottom: 20 }}>
                        <Rocket size={16} /> Hackathon 2026
                    </div>
                    <h2 style={{ color: 'var(--gt-text)' }}>{isRegisterMode ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</h2>

                    {errorMsg && <div style={{ color: '#ef4444', textAlign: 'center', marginBottom: 16, fontSize: '0.9rem', background: '#fee2e2', padding: 8, borderRadius: 8 }}>{errorMsg}</div>}

                    {!isRegisterMode ? (
                        <form onSubmit={handleLogin} autoComplete="on">
                            <div className="gr-input-group"><label>อีเมล</label><input type="email" name="loginEmail" autoComplete="username" className="gr-input" placeholder="อีเมลของคุณ" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>รหัสผ่าน</label><div className="gr-password-wrap"><input type={showLoginPass ? 'text' : 'password'} name="loginPassword" autoComplete="current-password" className="gr-input" placeholder="รหัสผ่าน" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required disabled={isLoading} /><button type="button" className="gr-password-toggle" onClick={() => setShowLoginPass(!showLoginPass)} tabIndex={-1}>{showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                            <button type="submit" className="gt-btn gt-btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={isLoading}>{isLoading ? <><Loader2 size={18} className="spin" /> กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}</button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} autoComplete="off" data-lpignore="true">
                            <input type="text" name="registerFakeUsername" autoComplete="username" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }} />
                            <input type="password" name="registerFakePassword" autoComplete="current-password" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }} />
                            <div className="gr-input-group"><label>ชื่อ-นามสกุล (ภาษาไทย)</label><input type="text" name="registerFullNameTh" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="เช่น สมชาย ใจดี" value={regFullNameTh} onChange={(e) => setRegFullNameTh(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>ชื่อ-นามสกุล (ภาษาอังกฤษ)</label><input type="text" name="registerFullNameEn" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="e.g. Somchai Jaidee" value={regFullNameEn} onChange={(e) => setRegFullNameEn(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>เพศ (Gender)</label><select className="gr-input" value={regGender} onChange={(e) => setRegGender(e.target.value)} disabled={isLoading}>{GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
                            <div className="gr-input-group"><label>วันเดือนปีเกิด (Date of Birth)</label><input type="date" className="gr-input" value={regBirthDate} onChange={(e) => setRegBirthDate(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>ระดับการศึกษา (Education Level)</label><select className="gr-input" value={regEducationLevel} onChange={(e) => setRegEducationLevel(e.target.value)} disabled={isLoading}>{EDUCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                            <div className="gr-input-group"><label>ชื่อสถาบันศึกษา (ภาษาไทย)</label><input type="text" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="เช่น มหาวิทยาลัยขอนแก่น" value={regInstitutionNameTh} onChange={(e) => setRegInstitutionNameTh(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>ชื่อสถาบันศึกษา (ภาษาอังกฤษ)</label><input type="text" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="e.g. Khonkaen University" value={regInstitutionNameEn} onChange={(e) => setRegInstitutionNameEn(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>ภูมิลำเนา (Province)</label><input type="text" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="เช่น ขอนแก่น" value={regHomeProvince} onChange={(e) => setRegHomeProvince(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>ชื่อผู้ใช้ (Username)</label><input type="text" name="registerUsername" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="อย่างน้อย 3 ตัวอักษร" value={regUserName} onChange={(e) => setRegUserName(e.target.value)} required disabled={isLoading} minLength={3} maxLength={50} /></div>
                            <div className="gr-input-group"><label>อีเมล (Email)</label><input type="email" name="registerEmail" autoComplete="off" data-lpignore="true" className="gr-input" placeholder="somchai.jaidee@kku.ac.th" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>รหัสผ่าน (Password)</label><div className="gr-password-wrap"><input type={showRegPass ? 'text' : 'password'} name="registerPassword" autoComplete="new-password" data-lpignore="true" className="gr-input" placeholder="อย่างน้อย 6 ตัวอักษร" value={regPass} onChange={(e) => setRegPass(e.target.value)} required disabled={isLoading} minLength={6} /><button type="button" className="gr-password-toggle" onClick={() => setShowRegPass(!showRegPass)} tabIndex={-1}>{showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                            <div className="gr-input-group"><label>ยืนยันรหัสผ่าน (Confirm Password)</label><div className="gr-password-wrap"><input type={showRegConfirmPass ? 'text' : 'password'} name="registerConfirmPassword" autoComplete="new-password" data-lpignore="true" className="gr-input" placeholder="ยืนยันรหัสผ่านอีกครั้ง" value={regConfirmPass} onChange={(e) => setRegConfirmPass(e.target.value)} required disabled={isLoading} minLength={6} /><button type="button" className="gr-password-toggle" onClick={() => setShowRegConfirmPass(!showRegConfirmPass)} tabIndex={-1}>{showRegConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                            <button type="submit" className="gt-btn gt-btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={isLoading}>{isLoading ? <><Loader2 size={18} className="spin" /> กำลังสมัครสมาชิก...</> : 'สมัครสมาชิก'}</button>
                        </form>
                    )}

                    <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--gt-text-muted)' }}>
                        {isRegisterMode
                            ? <>มีบัญชีแล้ว? <a href="#" onClick={(e) => { e.preventDefault(); setErrorMsg(''); setIsRegisterMode(false); }} style={{ color: 'var(--gt-primary, #7c3aed)', fontWeight: 600 }}>เข้าสู่ระบบ</a></>
                            : <>ยังไม่มีบัญชี? <a href="#" onClick={(e) => { e.preventDefault(); setErrorMsg(''); setIsRegisterMode(true); }} style={{ color: 'var(--gt-primary, #7c3aed)', fontWeight: 600 }}>สมัครสมาชิก</a></>}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}><ThemeToggle /></div>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;
