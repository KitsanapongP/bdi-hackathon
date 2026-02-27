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

function RegisterPage() {
    const navigate = useNavigate();

    /* Mode toggle: false = login, true = register */
    const [isRegisterMode, setIsRegisterMode] = useState(false);

    /* Login state */
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPass, setLoginPass] = useState('');

    /* Register state */
    const [regUserName, setRegUserName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regConfirmPass, setRegConfirmPass] = useState('');

    /* Shared state */
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // If already logged in, redirect to Home
    useEffect(() => {
        const saved = localStorage.getItem('gt_user');
        if (saved) {
            navigate('/home', { replace: true });
        }
    }, [navigate]);

    /** Save user info to localStorage and redirect */
    const saveUserAndRedirect = async (user) => {
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
        try {
            const accessRes = await fetch(apiUrl('/api/admin/me/access'), { credentials: 'include' });
            const access = await accessRes.json();
            if (access?.isAdmin) {
                navigate('/admin', { replace: true });
                return;
            }
        } catch (e) {
            // noop
        }
        navigate('/home', { replace: true });
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

            await saveUserAndRedirect(data.data);
        } catch (err) {
            setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        // Client-side validation
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
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setErrorMsg(data.message || 'ไม่สามารถสมัครสมาชิกได้');
                return;
            }

            await saveUserAndRedirect(data.data);
        } catch (err) {
            setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    const switchMode = (e) => {
        e.preventDefault();
        setErrorMsg('');
        setIsRegisterMode(!isRegisterMode);
    };

    return (
        <div className="gr-page">
            <GameShapes shapeCount={30} sizeRange={[18, 40]} depthLayers={2} interactionRadius={100} seed={99} />
            <div className="gr-login-wrap">
                <div className="gr-login-card">
                    <div className="gt-badge" style={{ marginBottom: 20 }}>
                        <Gamepad2 size={16} /> Game Event 2025
                    </div>
                    <h2 style={{ color: 'var(--gt-text)' }}>
                        {isRegisterMode ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                    </h2>
                    <p style={{ textAlign: 'center', color: 'var(--gt-text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
                        {isRegisterMode
                            ? 'สร้างบัญชีเพื่อเข้าร่วมกิจกรรม'
                            : 'ลงชื่อเข้าใช้เพื่อจัดการทีมของคุณ'}
                    </p>

                    {errorMsg && <div style={{ color: '#ef4444', textAlign: 'center', marginBottom: 16, fontSize: '0.9rem', background: '#fee2e2', padding: 8, borderRadius: 8 }}>{errorMsg}</div>}

                    {!isRegisterMode ? (
                        /* ─── Login Form ─── */
                        <form onSubmit={handleLogin}>
                            <div className="gr-input-group">
                                <label>อีเมล</label>
                                <input
                                    type="email"
                                    className="gr-input"
                                    placeholder="email@example.com"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="gr-input-group">
                                <label>รหัสผ่าน</label>
                                <input
                                    type="password"
                                    className="gr-input"
                                    placeholder="••••••••"
                                    value={loginPass}
                                    onChange={(e) => setLoginPass(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <button type="submit" className="gt-btn gt-btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={isLoading}>
                                {isLoading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Loader2 size={18} className="spin" /> กำลังเข้าสู่ระบบ...
                                    </span>
                                ) : 'เข้าสู่ระบบ'}
                            </button>
                        </form>
                    ) : (
                        /* ─── Register Form ─── */
                        <form onSubmit={handleRegister}>
                            <div className="gr-input-group">
                                <label>ชื่อผู้ใช้ (Username)</label>
                                <input
                                    type="text"
                                    className="gr-input"
                                    placeholder="เช่น neo, luna"
                                    value={regUserName}
                                    onChange={(e) => setRegUserName(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    minLength={3}
                                    maxLength={30}
                                />
                            </div>
                            <div className="gr-input-group">
                                <label>อีเมล</label>
                                <input
                                    type="email"
                                    className="gr-input"
                                    placeholder="email@example.com"
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="gr-input-group">
                                <label>รหัสผ่าน</label>
                                <input
                                    type="password"
                                    className="gr-input"
                                    placeholder="อย่างน้อย 6 ตัวอักษร"
                                    value={regPass}
                                    onChange={(e) => setRegPass(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    minLength={6}
                                />
                            </div>
                            <div className="gr-input-group">
                                <label>ยืนยันรหัสผ่าน</label>
                                <input
                                    type="password"
                                    className="gr-input"
                                    placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                                    value={regConfirmPass}
                                    onChange={(e) => setRegConfirmPass(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    minLength={6}
                                />
                            </div>
                            <button type="submit" className="gt-btn gt-btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={isLoading}>
                                {isLoading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Loader2 size={18} className="spin" /> กำลังสมัครสมาชิก...
                                    </span>
                                ) : 'สมัครสมาชิก'}
                            </button>
                        </form>
                    )}

                    <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--gt-text-muted)' }}>
                        {isRegisterMode ? (
                            <>มีบัญชีแล้ว? <a href="#" onClick={switchMode} style={{ color: 'var(--gt-primary, #7c3aed)', fontWeight: 600 }}>เข้าสู่ระบบ</a></>
                        ) : (
                            <>ยังไม่มีบัญชี? <a href="#" onClick={switchMode} style={{ color: 'var(--gt-primary, #7c3aed)', fontWeight: 600 }}>สมัครสมาชิก</a></>
                        )}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;
