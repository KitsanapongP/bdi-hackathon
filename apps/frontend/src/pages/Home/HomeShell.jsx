import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Rocket,
    Menu,
    X,
    MapPin,
    Phone,
    Mail,
    LogIn,
    Facebook,
    Instagram,
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import GameShapes from '../../components/GameShapes';
import { apiUrl } from '../../lib/api';
import { getCachedCoOrganizerSponsors, setCachedCoOrganizerSponsors } from '../../lib/contentCache';
import './Home.css';

function HomeShell({ children }) {
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [coOrganizerSponsors, setCoOrganizerSponsors] = useState(() => getCachedCoOrganizerSponsors() || []);
    const [bannerMarquee, setBannerMarquee] = useState(false);
    const bannerRef = useRef(null);
    const bannerTrackRef = useRef(null);

    const navItems = ['หน้าแรก', 'เกี่ยวกับ', 'ตารางกิจกรรม', 'ลงทะเบียน'];

    const handleNavClick = (index) => {
        setMobileOpen(false);

        if (index === 0) {
            navigate('/home');
            return;
        }

        if (index === 1) {
            navigate('/home/about');
            return;
        }

        if (index === 2) {
            navigate('/home#schedule');
            return;
        }

        navigate('/home/register');
    };

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
                    throw new Error(`Failed to fetch sponsors: ${response.status}`);
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
                    {(bannerMarquee ? [...coOrganizerSponsors, ...coOrganizerSponsors] : coOrganizerSponsors).map((item, i) => (
                        <img key={`${item.id}-${i}`} src={apiUrl(item.logoUrl)} alt={item.nameEn || item.nameTh || `Co-Org ${i + 1}`} />
                    ))}
                </div>
            </div>

            <nav className="gt-pill-nav">
                <div className="gt-pill-bar">
                    <a href="#" className="gt-pill-icon" onClick={(e) => { e.preventDefault(); navigate('/home'); }} aria-label="Home">
                        <Rocket size={20} />
                    </a>
                    <div className="gt-pill-links">
                        {navItems.map((label, i) => (
                            <button key={label} className="gt-pill-link" onClick={() => handleNavClick(i)}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="gt-pill-right">
                        <Link to="/home/register" className="gt-pill-link gt-auth-btn gt-login">
                            <LogIn size={15} /> เข้าสู่ระบบ
                        </Link>
                        <ThemeToggle />
                        <button className="gt-pill-burger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="toggle menu">
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                <div className={`gt-pill-collapse ${mobileOpen ? 'open' : ''}`}>
                    <div className="gt-pill-collapse-inner">
                        {navItems.map((label, i) => (
                            <button key={label} className="gt-collapse-link" onClick={() => handleNavClick(i)}>
                                {label}
                            </button>
                        ))}
                        <Link to="/home/register" className="gt-collapse-link gt-collapse-login" onClick={() => setMobileOpen(false)}>
                            <LogIn size={16} /> เข้าสู่ระบบ
                        </Link>
                    </div>
                </div>
            </nav>

            {children}

            <footer className="gt-footer">
                <div className="gt-container">
                    <div className="gt-footer-inner">
                        <div>
                            <div className="gt-logo" style={{ marginBottom: 14 }}>
                                <Rocket size={20} /> Khon Kaen Intelligent Living Hackathon 2026
                            </div>
                            <p style={{ maxWidth: 350, color: 'var(--gt-footer-text)', margin: 0, fontSize: '0.9rem', lineHeight: '1.6' }}>
                                <MapPin size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                                คณะสาธารณสุขศาสตร์ ม.ขอนแก่น<br />
                                <Phone size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', marginTop: '8px' }} />
                                08 1561 6471<br />
                                <Mail size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', marginTop: '8px' }} />
                                niphatthra.the@mahidol.ac.th
                            </p>
                        </div>
                        <div className="gt-footer-cols">
                            <div className="gt-footer-col">
                                <h4>Quick Links</h4>
                                <a href="#">คุณสมบัติ</a>
                                <a href="#">กำหนดการ</a>
                                <a href="#">รางวัล</a>
                            </div>
                            <div className="gt-footer-col">
                                <h4>Support</h4>
                                <Link to="/home/contact">ติดต่อสอบถาม</Link>
                                <a href="#">FAQs</a>
                            </div>
                            <div className="gt-footer-col">
                                <h4>Follow us</h4>
                                <a href="https://www.facebook.com/hackathonthailand" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Facebook size={16} /> Facebook
                                </a>
                                <a href="https://www.instagram.com/hackathonth" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Instagram size={16} /> Instagram
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="gt-footer-copy">© 2026 Khon Kaen Intelligent Living Hackathon 2026</div>
                </div>
            </footer>
        </div>
    );
}

export default HomeShell;
