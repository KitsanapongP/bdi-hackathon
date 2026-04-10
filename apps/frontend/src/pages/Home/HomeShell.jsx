import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Home,
    Users,
    User,
    Menu,
    X,
    MapPin,
    Phone,
    Mail,
    LogIn,
    LogOut,
    Facebook,
    ExternalLink,
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import GameShapes from '../../components/GameShapes';
import { apiUrl } from '../../lib/api';
import { getCachedCoOrganizerSponsors, setCachedCoOrganizerSponsors } from '../../lib/contentCache';
import { USER_MANUAL_PATH } from '../../lib/userManual';
import './Home.css';

function normalizeWebsiteUrl(url) {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

function HomeShell({ children }) {
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [navScrolled, setNavScrolled] = useState(false);
    const [coOrganizerSponsors, setCoOrganizerSponsors] = useState(() => getCachedCoOrganizerSponsors() || []);
    const [bannerMarquee, setBannerMarquee] = useState(false);
    const bannerRef = useRef(null);
    const bannerTrackRef = useRef(null);

    const navItems = [
        { key: 'home', label: 'หน้าแรก', onClick: () => navigate('/home') },
        { key: 'about', label: 'เกี่ยวกับ', onClick: () => navigate('/home/about') },
        { key: 'sponsors', label: 'ภาคีเครือข่าย', onClick: () => navigate('/home/partner') },
        { key: 'schedule', label: 'กำหนดการกิจกรรม', onClick: () => navigate('/home', { state: { scrollTo: 'schedule' } }) },
        { key: 'venues', label: 'สถานที่จัดงาน', onClick: () => navigate('/home/venues') },
        { key: 'datasets', label: 'ตัวอย่างชุดข้อมูล', onClick: () => navigate('/home/datasets') },
        { key: 'register', label: 'ลงทะเบียน', onClick: () => navigate('/home/register') },
    ];

    const handleNavClick = (item) => {
        setMobileOpen(false);

        if (item && typeof item.onClick === 'function') {
            item.onClick();
        }
    };

    const handleLogout = async () => {
        try {
            await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
        } catch {
            // ignore
        }
        localStorage.removeItem('gt_user');
        setUser(null);
        navigate('/home', { replace: true });
    };

    useEffect(() => {
        const saved = localStorage.getItem('gt_user');
        if (!saved) return;

        try {
            setUser(JSON.parse(saved));
        } catch {
            localStorage.removeItem('gt_user');
        }

        fetch(apiUrl('/api/auth/me'), { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                if (data.ok && data.data) {
                    const verifiedUser = {
                        userId: data.data.userId,
                        name: data.data.userName,
                        email: data.data.email,
                        accessRole: data.data.accessRole || null,
                        hasTeam: data.data.hasTeam || false,
                        teamId: data.data.teamId || null,
                        avatarUrl: data.data.avatarUrl || null,
                        avatar: data.data.userName?.charAt(0)?.toUpperCase() || 'U',
                        color: '#6366f1',
                    };
                    setUser(verifiedUser);
                    localStorage.setItem('gt_user', JSON.stringify(verifiedUser));
                } else if (data.message === 'ไม่มีสิทธิ์เข้าถึง' || data.message === 'กรุณาเข้าสู่ระบบ') {
                    localStorage.removeItem('gt_user');
                    setUser(null);
                }
            })
            .catch(() => {
                // ignore
            });
    }, []);

    useEffect(() => {
        const cached = getCachedCoOrganizerSponsors();
        if (cached && cached.length > 0) {
            setCoOrganizerSponsors(cached);
            return;
        }

        const fetchSponsors = async () => {
            try {
                const response = await fetch(apiUrl('/api/content/sponsors?tier=co_organizer'), {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error('ไม่สามารถโหลดข้อมูลภาคีเครือข่ายได้');
                }

                const payload = await response.json();
                const items = Array.isArray(payload?.data) ? payload.data : [];
                setCoOrganizerSponsors(items);
                setCachedCoOrganizerSponsors(items);
            } catch {
                setCoOrganizerSponsors([]);
                setCachedCoOrganizerSponsors([]);
            }
        };

        fetchSponsors();
    }, []);

    useEffect(() => {
        const banner = bannerRef.current;
        if (!banner) return;

        const observer = new IntersectionObserver(
            ([entry]) => setNavScrolled(!entry.isIntersecting),
            { threshold: 0, rootMargin: '-44px 0px 0px 0px' },
        );

        observer.observe(banner);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const banner = bannerRef.current;
        if (!banner) return;

        const check = () => {
            const track = bannerTrackRef.current;
            if (!track) return;

            const items = track.children;
            const originalCount = coOrganizerSponsors.length;
            let totalW = 0;

            for (let i = 0; i < Math.min(originalCount, items.length); i++) {
                totalW += items[i].offsetWidth;
            }

            totalW += Math.max(0, originalCount - 1) * 40;
            setBannerMarquee(totalW > banner.clientWidth);
        };

        check();
        const ro = new ResizeObserver(check);
        ro.observe(banner);
        return () => ro.disconnect();
    }, [coOrganizerSponsors]);

    return (
        <div className="gt-page">
            <GameShapes
                sizeRange={[22, 50]}
                depthLayers={3}
                interactionRadius={130}
                repelEnabled
                minDistance={65}
                seed={7}
            />

            <div className={`gt-banner ${bannerMarquee ? 'gt-banner-marquee' : ''}`} ref={bannerRef}>
                <div className="gt-banner-track" ref={bannerTrackRef}>
                    {(bannerMarquee ? [...coOrganizerSponsors, ...coOrganizerSponsors] : coOrganizerSponsors).map((item, i) => {
                        const websiteUrl = normalizeWebsiteUrl(item.websiteUrl);
                        const logo = (
                            <img src={apiUrl(item.logoUrl)} alt={item.nameEn || item.nameTh || `Co-Org ${i + 1}`} />
                        );

                        if (!websiteUrl) {
                            return (
                                <span key={`${item.id}-${i}`} className="gt-banner-logo-link">
                                    {logo}
                                </span>
                            );
                        }

                        return (
                            <a
                                key={`${item.id}-${i}`}
                                href={websiteUrl}
                                className="gt-banner-logo-link gt-banner-logo-link-clickable"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {logo}
                            </a>
                        );
                    })}
                </div>
            </div>

            <nav className={`gt-pill-nav ${navScrolled ? 'scrolled' : ''}`}>
                <div className="gt-pill-bar">
                    <a href="#" className="gt-pill-icon" onClick={(e) => { e.preventDefault(); navigate('/home'); }} aria-label="Home">
                        <Home size={20} />
                    </a>
                    <div className="gt-pill-links">
                        {navItems.map((item) => {
                            if (item.key === 'register' && user) return null;
                            return (
                                <button key={item.key} className="gt-pill-link" onClick={() => handleNavClick(item)}>
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="gt-pill-right">
                        {user ? (
                            <>
                                <button className="gt-pill-link gt-auth-btn gt-team-btn" onClick={() => navigate('/home', { state: { open: 'team' } })}>
                                    <Users size={15} /> ทีมของฉัน
                                </button>
                                <button className="gt-pill-link gt-auth-btn gt-login" onClick={() => navigate('/home', { state: { open: 'profile' } })}>
                                    <User size={15} /> โปรไฟล์
                                </button>
                                <button className="gt-pill-link gt-auth-btn gt-logout" onClick={handleLogout}>
                                    <LogOut size={15} /> ออกจากระบบ
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="gt-pill-link gt-auth-btn gt-login">
                                <LogIn size={15} /> เข้าสู่ระบบ
                            </Link>
                        )}
                        <ThemeToggle />
                        <button className="gt-pill-burger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="toggle menu">
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                <div className={`gt-pill-collapse ${mobileOpen ? 'open' : ''}`}>
                    <div className="gt-pill-collapse-inner">
                        {navItems.map((item) => {
                            const isRegister = item.key === 'register';
                            if (isRegister && user) {
                                return (
                                    <button key={item.key} className="gt-collapse-link" onClick={() => { setMobileOpen(false); navigate('/home', { state: { open: 'team' } }); }}>
                                        <Users size={16} /> ทีมของฉัน
                                    </button>
                                );
                            }
                            return (
                                <button key={item.key} className="gt-collapse-link" onClick={() => handleNavClick(item)}>
                                    {item.label}
                                </button>
                            );
                        })}
                        {user ? (
                            <>
                                <button className="gt-collapse-link" onClick={() => { setMobileOpen(false); navigate('/home', { state: { open: 'profile' } }); }}>
                                    <User size={16} /> โปรไฟล์
                                </button>
                                <div className="gt-collapse-divider" />
                                <button className="gt-collapse-link gt-collapse-logout" onClick={() => { setMobileOpen(false); handleLogout(); }}>
                                    <LogOut size={16} /> ออกจากระบบ
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="gt-collapse-link gt-collapse-login" onClick={() => setMobileOpen(false)}>
                                <LogIn size={16} /> เข้าสู่ระบบ
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            <div className="gt-page-content">
                {children}
            </div>

            <footer className="gt-footer">
                <div className="gt-container">
                    <div className="gt-footer-inner">
                        <div>
                            <div className="gt-logo" style={{ marginBottom: 14 }}>
                                <Home size={20} /> BDI Young Innovator Hackathon: Intelligent Living
                            </div>
                            <p className="gt-footer-contact" style={{ color: 'var(--gt-footer-text)', margin: 0, fontSize: '0.9rem', lineHeight: '1.6' }}>
                                <MapPin size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                                วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น<br />
                                123 อาคารวิทยวิภาส ถ.มิตรภาพ ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น 40002<br />
                                <Phone size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', marginTop: '8px' }} />
                                โทรศัพท์ 043 009 700 ต่อ 51018 (คุณแพรว)<br />
                                <Mail size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', marginTop: '8px' }} />
                                Email : computing.kku@kku.ac.th
                            </p>
                        </div>
                        <div className="gt-footer-cols">
                            <div className="gt-footer-col">
                                <h4>Quick Links</h4>
                                <Link to="/home" state={{ scrollTo: 'schedule' }}>กำหนดการ</Link>
                                <Link to="/home" state={{ scrollTo: 'prizes' }}>รางวัล</Link>
                                <Link to="/home/partner">ภาคีเครือข่าย</Link>
                            </div>
                            <div className="gt-footer-col">
                                <h4>Support</h4>
                                <Link to="/home/contact">ติดต่อสอบถาม</Link>
                                <Link to="/home/faqs">FAQs</Link>
                                <a href={USER_MANUAL_PATH} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    คู่มือการใช้งาน <ExternalLink size={14} />
                                </a>
                            </div>
                            <div className="gt-footer-col">
                                <h4>Follow us</h4>
                                <a href="https://www.facebook.com/hackathonthailand" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Facebook size={16} /> Facebook
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="gt-footer-copy">BDI Young Innovator Hackathon: Intelligent Living</div>
                </div>
            </footer>
        </div>
    );
}

export default HomeShell;
