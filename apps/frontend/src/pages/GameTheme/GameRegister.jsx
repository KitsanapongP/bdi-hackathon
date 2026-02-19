import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Gamepad2,
    ArrowLeft,
    Users,
    UserPlus,
    Plus,
    Lock,
    Globe,
    LogOut,
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import GameShapes from '../../components/GameShapes';
import { MOCK_USERS, MOCK_TEAMS } from './mockData';
import './GameTheme.css';
import './GameRegister.css'; // Reusing for login & modal styles

function GameRegisterPage() {
    const navigate = useNavigate();

    /* Auth state */
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    /* Modals */
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createPublic, setCreatePublic] = useState(true);
    const [joinCode, setJoinCode] = useState('');

    // Check if already logged in
    useEffect(() => {
        const saved = localStorage.getItem('gt_user');
        if (saved) {
            const user = JSON.parse(saved);
            if (user.hasTeam) {
                navigate('/gametheme', { state: { showLobby: true } });
            }
        }
    }, [navigate]);

    const handleLogin = (e) => {
        e.preventDefault();
        setErrorMsg('');

        // Mock Login Check
        const foundUser = MOCK_USERS.find(u => u.email === loginEmail && u.password === loginPass);

        if (foundUser) {
            localStorage.setItem('gt_user', JSON.stringify(foundUser));
            if (foundUser.hasTeam) {
                navigate('/gametheme', { state: { showLobby: true } });
            } else {
                // Force reload or state update to trigger No Team view
                window.location.reload();
            }
        } else {
            setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง (ลอง: leader@game.com / password)');
        }
    };

    const handleCreateTeam = () => {
        const saved = localStorage.getItem('gt_user');
        if (!saved) return;

        const user = JSON.parse(saved);
        const newTeamId = `TM${Math.floor(Math.random() * 9000) + 1000}`; // Random ID

        const updatedUser = {
            ...user,
            hasTeam: true,
            teamId: 'TM001', // Mock to TM001 for demo content
            role: 'leader'
        };

        localStorage.setItem('gt_user', JSON.stringify(updatedUser));
        navigate('/gametheme', { state: { showLobby: true } });
    };

    const handleJoinTeam = () => {
        const saved = localStorage.getItem('gt_user');
        if (!saved) return;

        if (MOCK_TEAMS[joinCode] || joinCode === 'TM001') {
            const user = JSON.parse(saved);
            const updatedUser = {
                ...user,
                hasTeam: true,
                teamId: joinCode === 'TM001' ? 'TM001' : joinCode,
                role: 'member'
            };
            localStorage.setItem('gt_user', JSON.stringify(updatedUser));
            navigate('/gametheme', { state: { showLobby: true } });
        } else {
            alert('ไม่พบทีมที่มีรหัสนี้ (ลอง: TM001)');
        }
    };

    const savedUser = localStorage.getItem('gt_user');
    const isLoggedIn = !!savedUser;

    /* ── Render Login State ── */
    if (!isLoggedIn) {
        return (
            <div className="gr-page">
                <GameShapes shapeCount={30} sizeRange={[18, 40]} depthLayers={2} interactionRadius={100} seed={99} />
                <div className="gr-login-wrap">
                    <div className="gr-login-card">
                        <div className="gt-badge" style={{ marginBottom: 20 }}>
                            <Gamepad2 size={16} /> Game Event 2025
                        </div>
                        <h2 style={{ color: 'var(--gt-text)' }}>เข้าสู่ระบบ</h2>
                        <p style={{ textAlign: 'center', color: 'var(--gt-text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
                            ลงชื่อเข้าใช้เพื่อจัดการทีมของคุณ<br />
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(ลอง: leader@game.com / password)</span>
                        </p>

                        {errorMsg && <div style={{ color: '#ef4444', textAlign: 'center', marginBottom: 16, fontSize: '0.9rem', background: '#fee2e2', padding: 8, borderRadius: 8 }}>{errorMsg}</div>}

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
                                />
                            </div>
                            <button type="submit" className="gt-btn gt-btn-primary" style={{ width: '100%', marginTop: 8 }}>
                                เข้าสู่ระบบ
                            </button>
                        </form>
                        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--gt-text-muted)' }}>
                            ยังไม่มีบัญชี? <a href="#" style={{ color: 'var(--gt-primary, #7c3aed)', fontWeight: 600 }}>สมัครสมาชิก</a>
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Render No Team State ── */
    const user = JSON.parse(savedUser);

    return (
        <div className="gr-page">
            <GameShapes shapeCount={30} sizeRange={[18, 40]} depthLayers={2} interactionRadius={100} seed={99} />

            {/* Top bar */}
            <div className="gr-topbar">
                <Link to="/gametheme" className="gr-topbar-logo"><ArrowLeft size={18} /> <Gamepad2 size={20} /> GameEvent</Link>
                <div className="gr-topbar-spacer" />
                <div className="gr-topbar-right">
                    <ThemeToggle />
                    <div className="gr-user-chip">
                        <div className="gr-user-avatar" style={{ background: user.color || '#6366f1' }}>{user.avatar || 'U'}</div>
                        {user.name}
                    </div>
                    <button
                        className="gt-btn gt-btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', gap: 4 }}
                        onClick={() => { localStorage.removeItem('gt_user'); window.location.reload(); }}
                    >
                        <LogOut size={14} /> ออก
                    </button>
                </div>
            </div>

            <div className="gr-no-team">
                <div className="gr-no-team-icon"><Users size={36} /></div>
                <h3>คุณยังไม่มีทีม</h3>
                <p>สร้างทีมใหม่เพื่อเป็นหัวหน้ากลุ่ม หรือเข้าร่วมทีมที่มีอยู่ด้วยรหัสเชิญ</p>
                <div className="gr-no-team-actions">
                    <button className="gt-btn gt-btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} /> สร้างทีม
                    </button>
                    <button className="gt-btn gt-btn-secondary" onClick={() => setShowJoinModal(true)}>
                        <UserPlus size={18} /> เข้าร่วมทีม
                    </button>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="gr-modal-backdrop" onClick={() => setShowCreateModal(false)}>
                    <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>🎮 สร้างทีมใหม่</h3>
                        <div className="gr-input-group">
                            <label>ชื่อทีม</label>
                            <input className="gr-input" placeholder="เช่น Team Alpha" value={createName} onChange={(e) => setCreateName(e.target.value)} />
                        </div>
                        <div className="gr-toggle-row">
                            <span className="gr-toggle-label">
                                {createPublic ? <><Globe size={16} /> Public — ทุกคนเห็นและขอเข้าร่วมได้</> : <><Lock size={16} /> Private — ใช้รหัสเชิญเท่านั้น</>}
                            </span>
                            <button type="button" className={`gr-toggle ${createPublic ? 'on' : ''}`} onClick={() => setCreatePublic(!createPublic)} />
                        </div>
                        <div className="gr-modal-actions">
                            <button className="gt-btn gt-btn-secondary" onClick={() => setShowCreateModal(false)}>ยกเลิก</button>
                            <button className="gt-btn gt-btn-primary" style={{ flex: 1 }} onClick={handleCreateTeam}>สร้างทีม</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Modal */}
            {showJoinModal && (
                <div className="gr-modal-backdrop" onClick={() => setShowJoinModal(false)}>
                    <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>🔗 เข้าร่วมทีม</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--gt-text-muted)', margin: '0 0 16px' }}>
                            กรอกรหัสทีม 6 หลักที่ได้รับจากหัวหน้าทีม
                        </p>
                        <div className="gr-input-group">
                            <label>รหัสทีม</label>
                            <input
                                className="gr-input"
                                placeholder="เช่น TM001"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.15em' }}
                            />
                        </div>
                        <div className="gr-modal-actions">
                            <button className="gt-btn gt-btn-secondary" onClick={() => setShowJoinModal(false)}>ยกเลิก</button>
                            <button className="gt-btn gt-btn-primary" style={{ flex: 1 }} onClick={handleJoinTeam}>ขอเข้าร่วม</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GameRegisterPage;
