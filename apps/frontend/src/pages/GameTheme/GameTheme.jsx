import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Gamepad2,
    Sparkles,
    Users,
    Trophy,
    Target,
    Rocket,
    Calendar,
    Menu,
    X,
    ArrowRight,
    LogIn,
    LogOut,
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import GameShapes from '../../components/GameShapes';
import GameLobbyContent from './GameLobby';
import './GameTheme.css';

// Sponsor logos (reuse from SmartLife)
import chatgptLogo from '../../assets/sponsors/ChatGPT.png';
import claudeLogo from '../../assets/sponsors/Claude Ai.png';
import geminiLogo from '../../assets/sponsors/Google Ai Gemini.png';
import grabfoodLogo from '../../assets/sponsors/GrabFood.png';
import laravelLogo from '../../assets/sponsors/Laravel.png';
import linemanLogo from '../../assets/sponsors/Line Man.png';
import pepsiLogo from '../../assets/sponsors/Pepsi.png';
import shopeeLogo from '../../assets/sponsors/Shopee.png';

const sponsors = [
    chatgptLogo, claudeLogo, geminiLogo, grabfoodLogo,
    laravelLogo, linemanLogo, pepsiLogo, shopeeLogo,
];

/* ─── config (customizable per event) ─── */
const config = {
    theme: {
        primary: '#7c3aed',
    },
    locale: {
        nav: ['หน้าแรก', 'เกี่ยวกับ', 'ตารางกิจกรรม', 'ลงทะเบียน'],
        heroBadge: '🎮 Game Event 2025',
        heroTitle: 'ปลดปล่อยพลัง สร้างสรรค์เกมของคุณ',
        heroSubtitle:
            'มาร่วมเป็นส่วนหนึ่งของกิจกรรมสุดยิ่งใหญ่แห่งปี รวมทีมสร้างเกม แข่งขัน และเรียนรู้จากผู้เชี่ยวชาญระดับประเทศ ชิงเงินรางวัลรวมกว่า 100,000 บาท',
        ctaPrimary: 'ลงทะเบียนเลย',
        ctaSecondary: 'ดูตารางงาน',
        aboutTitle: 'ทำไมต้องร่วมกิจกรรมนี้?',
        aboutDesc: 'โอกาสที่จะเปลี่ยนแปลงอนาคตของคุณ',
        scheduleTitle: 'กำหนดการกิจกรรม',
        scheduleDesc: 'ตารางเวลาของกิจกรรมทั้งหมดตลอดทั้งงาน',
        footer: '© 2025 Game Event. All rights reserved.',
    },
};

const schedules = [
    { time: '09:00 - 10:00', title: 'Registration & Welcome', desc: 'ลงทะเบียนรับป้ายชื่อและของที่ระลึก' },
    { time: '10:00 - 12:00', title: 'Keynote: Game Dev in 2025', desc: 'โดย CTO จาก Game Studio ชั้นนำ' },
    { time: '13:00 - 17:00', title: 'Team Hacking Begins', desc: 'เริ่มพัฒนาเกม พร้อม Mentor ให้คำปรึกษา' },
    { time: '17:30 - 19:00', title: 'Demo & Pitching', desc: 'นำเสนอผลงานรอบคัดเลือก 10 ทีมสุดท้าย' },
];

/* ═══════════════════════ Component ═══════════════════════ */
function GameThemePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [showLobby, setShowLobby] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('gt_user');
        if (saved) setUser(JSON.parse(saved));

        // Check for navigation state from Register page
        if (location.state?.showLobby) {
            setShowLobby(true);
        }
    }, [location]);

    /* Body scroll lock when mobile menu open */
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    /* Scroll reveal */
    useEffect(() => {
        const obs = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('active'); }),
            { threshold: 0.1 },
        );
        document.querySelectorAll('.gt-reveal').forEach((el) => obs.observe(el));
        return () => obs.disconnect();
    }, [showLobby]); // Re-run when view changes

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch { /* ignore */ }
        localStorage.removeItem('gt_user');
        setUser(null);
        setShowLobby(false);
    };

    const scrollTo = (id) => {
        setMobileOpen(false); // Close mobile menu first

        if (showLobby) {
            setShowLobby(false);
            // Wait for render then scroll
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            return;
        }

        const el = document.getElementById(id);
        if (!el) return;

        // Custom smooth scroll logic ...
        const navH = 80;
        const targetY = el.getBoundingClientRect().top + window.scrollY - navH;
        const startY = window.scrollY;
        const diff = targetY - startY;
        const duration = Math.min(1200, Math.max(400, Math.abs(diff) * 0.6));
        let startTime = null;

        const ease = (t) => t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic

        const step = (time) => {
            if (!startTime) startTime = time;
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            window.scrollTo(0, startY + diff * ease(progress));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    const sectionIds = ['hero', 'about', 'schedule', 'register'];

    return (
        <div className="gt-page">
            {/* Background shapes */}
            <GameShapes
                shapeCount={45}
                sizeRange={[22, 50]}
                depthLayers={3}
                interactionRadius={130}
                repelEnabled
                minDistance={65}
                seed={7}
            />

            {/* Co-Organizer Banner */}
            <div className="gt-banner">
                {sponsors.map((logo, i) => (
                    <img key={i} src={logo} alt={`Co-Org ${i + 1}`} />
                ))}
            </div>

            {/* Pill Navigation */}
            <nav className="gt-pill-nav">
                <div className="gt-pill-bar">
                    <a href="#" className="gt-pill-icon" onClick={(e) => { e.preventDefault(); scrollTo('hero'); }} aria-label="Home">
                        <Gamepad2 size={20} />
                    </a>
                    <div className="gt-pill-links">
                        {config.locale.nav.map((label, i) => {
                            const isRegister = i === 3;
                            if (isRegister && user) {
                                return (
                                    <button
                                        key={i}
                                        className={`gt-pill-link ${showLobby ? 'active' : ''}`}
                                        style={{ color: 'var(--gt-primary)', fontWeight: 600 }}
                                        onClick={() => setShowLobby(true)}
                                    >
                                        ทีมของคุณ
                                    </button>
                                );
                            }
                            return (
                                <button key={i} className="gt-pill-link" onClick={() => scrollTo(sectionIds[i])}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="gt-pill-right">
                        {user ? (
                            <button
                                className="gt-pill-link gt-auth-btn gt-logout"
                                onClick={handleLogout}
                            >
                                <LogOut size={15} /> ออกจากระบบ
                            </button>
                        ) : (
                            <Link to="/gametheme/register" className="gt-pill-link gt-auth-btn gt-login">
                                <LogIn size={15} /> เข้าสู่ระบบ
                            </Link>
                        )}
                        <ThemeToggle />
                        <button className="gt-pill-burger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="toggle menu">
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Drawer */}
            <div className={`gt-mobile-backdrop ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />
            <div className={`gt-mobile-drawer ${mobileOpen ? 'open' : ''}`}>
                {config.locale.nav.map((label, i) => {
                    const isRegister = i === 3;
                    if (isRegister && user) {
                        return (
                            <button key={i} className="gt-mobile-link" onClick={() => { setShowLobby(true); setMobileOpen(false); }} style={{ color: 'var(--gt-primary)' }}>
                                ทีมของคุณ
                            </button>
                        );
                    }
                    return (
                        <button key={i} className="gt-mobile-link" onClick={() => scrollTo(sectionIds[i])}>
                            {label}
                        </button>
                    );
                })}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ThemeToggle />
                    {user ? (
                        <button
                            className="gt-mobile-link"
                            style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={() => { handleLogout(); setMobileOpen(false); }}
                        >
                            <LogOut size={16} /> ออกจากระบบ
                        </button>
                    ) : (
                        <Link
                            to="/gametheme/register"
                            className="gt-mobile-link"
                            style={{ color: 'var(--gt-primary)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                            onClick={() => setMobileOpen(false)}
                        >
                            <LogIn size={16} /> เข้าสู่ระบบ
                        </Link>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {showLobby && user ? (
                <div style={{ paddingTop: 80, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                    <GameLobbyContent user={user} />
                    {/* Footer for Lobby? maybe minimal */}
                    <div style={{ textAlign: 'center', padding: 20, fontSize: '0.8rem', opacity: 0.6, marginTop: 'auto' }}>
                        © 2025 Game Event System
                    </div>
                </div>
            ) : (
                <>
                    {/* Hero */}
                    <section id="hero" className="gt-section gt-hero gt-container gt-reveal">
                        <div className="gt-badge">
                            <Gamepad2 size={16} /> {config.locale.heroBadge}
                        </div>
                        <h1>{config.locale.heroTitle}</h1>
                        <p className="gt-hero-sub">{config.locale.heroSubtitle}</p>
                        <div className="gt-hero-actions">
                            <Link to="/gametheme/register" className="gt-btn gt-btn-primary">
                                {config.locale.ctaPrimary} <ArrowRight size={18} />
                            </Link>
                            <button className="gt-btn gt-btn-secondary" onClick={() => scrollTo('schedule')}>
                                {config.locale.ctaSecondary}
                            </button>
                        </div>
                    </section>

                    {/* Sponsors Marquee — above About */}
                    <div className="gt-sponsors-wrapper">
                        <div className="gt-container" style={{ textAlign: 'center', marginBottom: 24, color: 'var(--gt-text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                            ผู้สนับสนุนหลักอย่างเป็นทางการ
                        </div>
                        <div className="gt-marquee">
                            {[...sponsors, ...sponsors].map((logo, i) => (
                                <img key={i} src={logo} alt={`Sponsor ${i + 1}`} className="gt-sponsor-logo" />
                            ))}
                        </div>
                    </div>

                    {/* About */}
                    <section id="about" className="gt-section gt-container">
                        <div className="gt-section-header gt-reveal">
                            <h2>{config.locale.aboutTitle}</h2>
                            <p>{config.locale.aboutDesc}</p>
                        </div>
                        <div className="gt-bento">
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-purple"><Sparkles color="#fff" size={24} /></div>
                                <h3>สร้างสรรค์เกมของคุณ</h3>
                                <p>พัฒนาทักษะการเขียนเกม ตั้งแต่ level design จนถึง game mechanics ที่สนุกและน่าสนใจ</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-pink"><Users color="#fff" size={24} /></div>
                                <h3>เครือข่าย Game Dev</h3>
                                <p>พบปะกับนักพัฒนาเกม ศิลปิน และผู้เชี่ยวชาญจากวงการเกมทั่วประเทศ</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-blue"><Rocket color="#fff" size={24} /></div>
                                <h3>Workshop จากมืออาชีพ</h3>
                                <p>เรียนรู้เทคนิคการทำเกมจากผู้เชี่ยวชาญระดับ Industry Leaders ที่พร้อมแชร์ประสบการณ์</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-orange"><Trophy color="#fff" size={24} /></div>
                                <h3>รางวัลรวม 100,000 บาท</h3>
                                <p>ชิงรางวัลใหญ่และโอกาสในการนำเสนอผลงานต่อ Publisher ชั้นนำ</p>
                            </div>
                            <div className="gt-bento-card large gt-reveal">
                                <div className="gt-bento-icon gt-icon-teal"><Target color="#fff" size={24} /></div>
                                <h3>Game Event Series: ชุดกิจกรรมที่ครบครัน</h3>
                                <p>
                                    ไม่ใช่แค่ Hackathon แต่เป็นชุดกิจกรรมต่อเนื่อง ตั้งแต่ Workshop, Game Jam,
                                    จนถึง Demo Day สำหรับนำเสนอเกมต่อ Publisher ชั้นนำของไทย
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Schedule */}
                    <section id="schedule" className="gt-section gt-container">
                        <div className="gt-section-header gt-reveal">
                            <h2>{config.locale.scheduleTitle}</h2>
                            <p>{config.locale.scheduleDesc}</p>
                        </div>
                        <div className="gt-schedule">
                            {schedules.map((item, i) => (
                                <div key={i} className="gt-schedule-card gt-reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                                    <div className="gt-time">{item.time}</div>
                                    <div>
                                        <h3>{item.title}</h3>
                                        <p>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Register CTA */}
                    <section id="register" className="gt-section gt-container" style={{ textAlign: 'center', paddingBottom: 40 }}>
                        <div className="gt-reveal">
                            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 16 }}>พร้อมเข้าร่วมแล้วหรือยัง?</h2>
                            <Link to="/gametheme/register" className="gt-btn gt-btn-primary" style={{ fontSize: '1.05rem', padding: '15px 36px' }}>
                                ลงทะเบียนเลย <ArrowRight size={20} />
                            </Link>
                        </div>
                    </section>

                    {/* Footer */}
                    <footer className="gt-footer">
                        <div className="gt-container">
                            <div className="gt-footer-inner">
                                <div>
                                    <div className="gt-logo" style={{ marginBottom: 14 }}>
                                        <Gamepad2 size={20} /> GameEvent
                                    </div>
                                    <p style={{ maxWidth: 300, color: 'var(--gt-footer-text)', margin: 0, fontSize: '0.9rem' }}>
                                        Building the future of gaming through innovation and friendly competition.
                                    </p>
                                </div>
                                <div className="gt-footer-cols">
                                    <div className="gt-footer-col">
                                        <h4>Event</h4>
                                        <a href="#">Schedule</a>
                                        <a href="#">Speakers</a>
                                        <a href="#">Sponsors</a>
                                    </div>
                                    <div className="gt-footer-col">
                                        <h4>Legal</h4>
                                        <a href="#">Privacy</a>
                                        <a href="#">Terms</a>
                                    </div>
                                </div>
                            </div>
                            <div className="gt-footer-copy">{config.locale.footer}</div>
                        </div>
                    </footer>
                </>
            )}
        </div>
    );
}

export default GameThemePage;
