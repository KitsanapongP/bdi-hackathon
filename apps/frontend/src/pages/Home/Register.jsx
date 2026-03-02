import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Gamepad2,
    Loader2,
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import GameShapes from '../../components/GameShapes';
import './Home.css';
import './Register.css';
import { apiUrl } from '../../lib/api';

const EDUCATION_OPTIONS = [
    { value: 'secondary', label: 'ม.ต้น' },
    { value: 'high_school', label: 'ม.ปลาย' },
    { value: 'bachelor', label: 'ป.ตรี' },
    { value: 'master', label: 'ป.โท' },
    { value: 'doctorate', label: 'ป.เอก' },
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
    const [regFirstNameTh, setRegFirstNameTh] = useState('');
    const [regLastNameTh, setRegLastNameTh] = useState('');
    const [regFirstNameEn, setRegFirstNameEn] = useState('');
    const [regLastNameEn, setRegLastNameEn] = useState('');
    const [regGender, setRegGender] = useState('male');
    const [regBirthDate, setRegBirthDate] = useState('');
    const [regEducationLevel, setRegEducationLevel] = useState('bachelor');
    const [regInstitutionNameTh, setRegInstitutionNameTh] = useState('');
    const [regInstitutionNameEn, setRegInstitutionNameEn] = useState('');
    const [regHomeProvince, setRegHomeProvince] = useState('');

    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMsg('');

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
                    firstNameTh: regFirstNameTh,
                    lastNameTh: regLastNameTh,
                    firstNameEn: regFirstNameEn,
                    lastNameEn: regLastNameEn,
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
                        <Gamepad2 size={16} /> Game Event 2025
                    </div>
                    <h2 style={{ color: 'var(--gt-text)' }}>{isRegisterMode ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</h2>

                    {errorMsg && <div style={{ color: '#ef4444', textAlign: 'center', marginBottom: 16, fontSize: '0.9rem', background: '#fee2e2', padding: 8, borderRadius: 8 }}>{errorMsg}</div>}

                    {!isRegisterMode ? (
                        <form onSubmit={handleLogin}>
                            <div className="gr-input-group"><label>อีเมล</label><input type="email" className="gr-input" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>รหัสผ่าน</label><input type="password" className="gr-input" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required disabled={isLoading} /></div>
                            <button type="submit" className="gt-btn gt-btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={isLoading}>{isLoading ? <><Loader2 size={18} className="spin" /> กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}</button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister}>
                            <div className="gr-input-group"><label>ชื่อผู้ใช้ (Username)</label><input type="text" className="gr-input" value={regUserName} onChange={(e) => setRegUserName(e.target.value)} required disabled={isLoading} minLength={3} maxLength={50} /></div>
                            <div className="gr-input-group"><label>อีเมล</label><input type="email" className="gr-input" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>ชื่อไทย</label><input type="text" className="gr-input" value={regFirstNameTh} onChange={(e) => setRegFirstNameTh(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>นามสกุลไทย</label><input type="text" className="gr-input" value={regLastNameTh} onChange={(e) => setRegLastNameTh(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>ชื่ออังกฤษ</label><input type="text" className="gr-input" value={regFirstNameEn} onChange={(e) => setRegFirstNameEn(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>นามสกุลอังกฤษ</label><input type="text" className="gr-input" value={regLastNameEn} onChange={(e) => setRegLastNameEn(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>เพศ</label><select className="gr-input" value={regGender} onChange={(e) => setRegGender(e.target.value)} disabled={isLoading}>{GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
                            <div className="gr-input-group"><label>วันเดือนปีเกิด</label><input type="date" className="gr-input" value={regBirthDate} onChange={(e) => setRegBirthDate(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>ระดับการศึกษา</label><select className="gr-input" value={regEducationLevel} onChange={(e) => setRegEducationLevel(e.target.value)} disabled={isLoading}>{EDUCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                            <div className="gr-input-group"><label>สถาบันศึกษาไทย</label><input type="text" className="gr-input" value={regInstitutionNameTh} onChange={(e) => setRegInstitutionNameTh(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>สถาบันศึกษาอังกฤษ</label><input type="text" className="gr-input" value={regInstitutionNameEn} onChange={(e) => setRegInstitutionNameEn(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>ภูมิลำเนา (จังหวัด)</label><input type="text" className="gr-input" value={regHomeProvince} onChange={(e) => setRegHomeProvince(e.target.value)} required disabled={isLoading} /></div>
                            <div className="gr-input-group"><label>รหัสผ่าน</label><input type="password" className="gr-input" value={regPass} onChange={(e) => setRegPass(e.target.value)} required disabled={isLoading} minLength={6} /></div>
                            <div className="gr-input-group"><label>ยืนยันรหัสผ่าน</label><input type="password" className="gr-input" value={regConfirmPass} onChange={(e) => setRegConfirmPass(e.target.value)} required disabled={isLoading} minLength={6} /></div>
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
