import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
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
    User,
    Phone,
    MapPin,
    Mail,
    Facebook,
    Instagram
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import GameShapes from '../../components/GameShapes';
import TeamContent from './Team';
import ProfileContent from './Profile';
import './Home.css';
import { apiUrl } from '../../lib/api';
import { getCachedCoOrganizerSponsors, setCachedCoOrganizerSponsors } from '../../lib/contentCache';

/* Sponsor logos are loaded from content API */

/* ─── config (customizable per event) ─── */
const config = {
    theme: {
        primary: '#7c3aed',
    },
    locale: {
        nav: ['หน้าแรก', 'เกี่ยวกับ', 'ตารางกิจกรรม', 'ลงทะเบียน'],
        heroBadge: '🏆 Hackathon 2026',
        heroTitle: 'Khon Kaen Intelligent Living Hackathon 2026',
        heroSubtitle:
            'โครงการกิจกรรมส่งเสริมการพัฒนานวัตกรรมและทักษะด้านการประยุกต์ใช้เทคโนโลยี\nการวิเคราะห์ข้อมูลและปัญญาประดิษฐ์ ประจำปี 2569\nIntelligent Living เพื่อส่งเสริมสุขภาพและคุณภาพชีวิตอย่างยั่งยืน\nณ อุทยานวิทยาศาสตร์ ภาคตะวันออกเฉียงเหนือ มหาวิทยาลัยขอนแก่น',
        ctaPrimary: 'ลงทะเบียนเลย',
        ctaSecondary: 'ดูกำหนดการ',
        aboutTitle: 'ทำไมต้องร่วมกิจกรรมนี้?',
        aboutDesc: 'โอกาสที่จะพัฒนาตนเองและสร้างนวัตกรรมเพื่อสุขภาพของทุกคน',
        scheduleTitle: 'กำหนดการกิจกรรม',
        scheduleDesc: 'ตารางเวลาของกิจกรรมทั้งหมดตลอดทั้งงาน',
        footer: '© 2026 Khon Kaen Intelligent Living Hackathon 2026',
    },
};



/* ═══════════════════════ Component ═══════════════════════ */
function HomePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [showLobby, setShowLobby] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const bannerRef = useRef(null);
    const bannerTrackRef = useRef(null);
    const [navScrolled, setNavScrolled] = useState(false);
    const [bannerMarquee, setBannerMarquee] = useState(false);
    const [schedulesData, setSchedulesData] = useState(null);
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [scheduleError, setScheduleError] = useState(null);
    const [rewards, setRewards] = useState([]);
    const [rewardsLoading, setRewardsLoading] = useState(true);
    const [rewardsError, setRewardsError] = useState(null);
    const [coOrganizerSponsors, setCoOrganizerSponsors] = useState(() => getCachedCoOrganizerSponsors() || []);
    const [sponsors, setSponsors] = useState([]);
    const [sponsorsLoading, setSponsorsLoading] = useState(true);

    useEffect(() => {
        // Initialize from localStorage first for immediate render
        const saved = localStorage.getItem('gt_user');
        if (saved) {
            setUser(JSON.parse(saved));

            // Background fetch to ensure we have the most up-to-date team state
            fetch(apiUrl('/api/auth/me'), { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                    if (data.ok && data.data) {
                        const verifiedUser = {
                            userId: data.data.userId,
                            name: data.data.userName,
                            email: data.data.email,
                            accessRole: data.data.accessRole || null,
                            hasTeam: data.data.hasTeam || false,
                            teamId: data.data.teamId || null,
                            avatar: data.data.userName?.charAt(0)?.toUpperCase() || 'U',
                            color: '#6366f1',
                        };
                        setUser(verifiedUser);
                        localStorage.setItem('gt_user', JSON.stringify(verifiedUser));
                    } else if (data.message === 'กรุณาเข้าสู่ระบบ') {
                        // User session expired
                        localStorage.removeItem('gt_user');
                        setUser(null);
                    }
                })
                .catch(err => console.error('Failed to verify session', err));
        }

        const fetchSchedules = async () => {
            try {
                setScheduleLoading(true);
                setScheduleError(null);
                const response = await fetch(apiUrl('/api/events/schedules'), {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch schedules: ${response.status}`);
                }

                const payload = await response.json();
                if (!payload?.ok) {
                    throw new Error(payload?.message || 'Failed to fetch schedules');
                }

                setSchedulesData(payload.data);
                setScheduleLoading(false);
            } catch (err) {
                console.error('Failed to fetch schedules', err);
                setScheduleError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
                setSchedulesData(null);
                setScheduleLoading(false);
            }
        };

        const fetchRewards = async () => {
            try {
                setRewardsLoading(true);
                setRewardsError(null);
                const response = await fetch(apiUrl('/api/content/rewards'), {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch rewards: ${response.status}`);
                }

                const payload = await response.json();
                if (!payload?.ok || !Array.isArray(payload.data)) {
                    throw new Error(payload?.message || 'Failed to fetch rewards');
                }

                setRewards(payload.data);
                setRewardsLoading(false);
            } catch (err) {
                console.error('Failed to fetch rewards', err);
                setRewardsError('เกิดข้อผิดพลาดในการโหลดข้อมูลรางวัล');
                setRewards([]);
                setRewardsLoading(false);
            }
        };


        const fetchSponsors = async () => {
            try {
                setSponsorsLoading(true);
                const [coOrganizerResponse, sponsorResponse] = await Promise.all([
                    fetch(apiUrl('/api/content/sponsors?tier=co_organizer'), { credentials: 'include' }),
                    fetch(apiUrl('/api/content/sponsors?tier=sponsor'), { credentials: 'include' }),
                ]);

                if (!coOrganizerResponse.ok || !sponsorResponse.ok) {
                    throw new Error(`Failed to fetch sponsors: ${coOrganizerResponse.status}/${sponsorResponse.status}`);
                }

                const [coOrganizerPayload, sponsorPayload] = await Promise.all([
                    coOrganizerResponse.json(),
                    sponsorResponse.json(),
                ]);

                const coOrganizerItems = Array.isArray(coOrganizerPayload?.data) ? coOrganizerPayload.data : [];
                const sponsorItems = Array.isArray(sponsorPayload?.data) ? sponsorPayload.data : [];

                setCoOrganizerSponsors(coOrganizerItems);
                setCachedCoOrganizerSponsors(coOrganizerItems);
                setSponsors(sponsorItems.length ? sponsorItems : coOrganizerItems);
                setSponsorsLoading(false);
            } catch (err) {
                console.error('Failed to fetch sponsors', err);
                setCoOrganizerSponsors([]);
                setCachedCoOrganizerSponsors([]);
                setSponsors([]);
                setSponsorsLoading(false);
            }
        };
        fetchSchedules();
        fetchRewards();
        fetchSponsors();
    }, [location]);

    const formatPrizeAmount = (amount, currency) => {
        if (typeof amount !== 'number' || Number.isNaN(amount)) return null;
        const formatted = amount.toLocaleString('th-TH');
        return currency ? `${formatted} ${currency}` : formatted;
    };

    const displayRewards = (() => {
        if (rewards.length !== 3) return rewards;

        const championReward = rewards.find((reward) => reward.rank === '1');
        if (!championReward) return rewards;

        const otherRewards = rewards.filter((reward) => reward.id !== championReward.id);
        if (otherRewards.length !== 2) return rewards;

        return [otherRewards[0], championReward, otherRewards[1]];
    })();

    /* Observe banner — when it leaves the viewport the pill nav slides up */
    useEffect(() => {
        const banner = bannerRef.current;
        if (!banner) return;
        const obs = new IntersectionObserver(
            ([entry]) => setNavScrolled(!entry.isIntersecting),
            { threshold: 0, rootMargin: '-44px 0px 0px 0px' }
        );
        obs.observe(banner);
        return () => obs.disconnect();
    }, []);

    /* Detect if banner logos overflow — if so, enable marquee */
    useEffect(() => {
        const banner = bannerRef.current;
        if (!banner) return;
        const check = () => {
            const track = bannerTrackRef.current;
            if (!track) return;
            // Measure total width of only the original items (first half)
            const items = track.children;
            const originalCount = coOrganizerSponsors.length;
            let totalW = 0;
            for (let i = 0; i < Math.min(originalCount, items.length); i++) {
                totalW += items[i].offsetWidth;
            }
            // Add gaps: (originalCount - 1) * 40px gap
            totalW += Math.max(0, originalCount - 1) * 40;
            const containerW = banner.clientWidth;
            setBannerMarquee(totalW > containerW);
        };
        check();
        const ro = new ResizeObserver(check);
        ro.observe(banner);
        return () => ro.disconnect();
    }, [coOrganizerSponsors]);



    /* Scroll reveal */
    useEffect(() => {
        const obs = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('active'); }),
            { threshold: 0.1 },
        );
        document.querySelectorAll('.gt-reveal').forEach((el) => obs.observe(el));
        return () => obs.disconnect();
    }, [showLobby, showProfile]); // Re-run when view changes

    const handleLogout = async () => {
        try {
            await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
        } catch { /* ignore */ }
        localStorage.removeItem('gt_user');
        setUser(null);
        setShowLobby(false);
        setShowProfile(false);
        window.location.reload();
    };

    const scrollTo = (id) => {
        setMobileOpen(false); // Close mobile menu first

        if (showLobby || showProfile) {
            setShowLobby(false);
            setShowProfile(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
                sizeRange={[22, 50]}
                depthLayers={3}
                interactionRadius={130}
                repelEnabled
                minDistance={65}
                seed={7}
            />

            {/* Co-Organizer Banner */}
            <div className={`gt-banner ${bannerMarquee ? 'gt-banner-marquee' : ''}`} ref={bannerRef}>
                <div className="gt-banner-track" ref={bannerTrackRef}>
                    {(bannerMarquee ? [...coOrganizerSponsors, ...coOrganizerSponsors] : coOrganizerSponsors).map((item, i) => (
                        <img key={`${item.id}-${i}`} src={apiUrl(item.logoUrl)} alt={item.nameEn || item.nameTh || `Co-Org ${i + 1}`} />
                    ))}
                </div>
            </div>

            {/* Pill Navigation */}
            <nav className={`gt-pill-nav ${navScrolled ? 'scrolled' : ''}`}>
                <div className="gt-pill-bar">
                    <a href="#" className="gt-pill-icon" onClick={(e) => { e.preventDefault(); scrollTo('hero'); }} aria-label="Home">
                        <Rocket size={20} />
                    </a>
                    <div className="gt-pill-links">
                        {config.locale.nav.map((label, i) => {
                            if (i === 3 && user) return null; // hide ลงทะเบียน when logged in

                            const handleNavClick = () => {
                                if (i === 1) {
                                    navigate('/home/about');
                                    return;
                                }

                                scrollTo(sectionIds[i]);
                            };

                            return (
                                <button key={i} className="gt-pill-link" onClick={handleNavClick}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="gt-pill-right">
                        {user ? (
                            <>
                                <button
                                    className={`gt-pill-link gt-auth-btn gt-team-btn ${showLobby ? 'active' : ''}`}
                                    onClick={() => { setShowLobby(true); setShowProfile(false); window.scrollTo(0, 0); }}
                                >
                                    <Users size={15} /> ทีมของคุณ
                                </button>
                                <button
                                    className={`gt-pill-link gt-auth-btn gt-login ${showProfile ? 'active' : ''}`}
                                    onClick={() => { setShowProfile(true); setShowLobby(false); window.scrollTo(0, 0); }}
                                >
                                    <User size={15} /> โปรไฟล์
                                </button>
                                <button
                                    className="gt-pill-link gt-auth-btn gt-logout"
                                    onClick={handleLogout}
                                >
                                    <LogOut size={15} /> ออกจากระบบ
                                </button>
                            </>
                        ) : (
                            <Link to="/home/register" className="gt-pill-link gt-auth-btn gt-login">
                                <LogIn size={15} /> เข้าสู่ระบบ
                            </Link>
                        )}
                        <ThemeToggle />
                        <button className="gt-pill-burger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="toggle menu">
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Collapse Panel */}
                <div className={`gt-pill-collapse ${mobileOpen ? 'open' : ''}`}>
                    <div className="gt-pill-collapse-inner">
                        {config.locale.nav.map((label, i) => {
                            const isRegister = i === 3;
                            if (isRegister && user) {
                                return (
                                    <button key={i} className="gt-collapse-link" onClick={() => { setShowLobby(true); setShowProfile(false); setMobileOpen(false); window.scrollTo(0, 0); }}>
                                        <Users size={16} /> ทีมของคุณ
                                    </button>
                                );
                            }

                            const handleNavClick = () => {
                                if (i === 1) {
                                    navigate('/home/about');
                                    setMobileOpen(false);
                                    return;
                                }

                                scrollTo(sectionIds[i]);
                            };

                            return (
                                <button key={i} className="gt-collapse-link" onClick={handleNavClick}>
                                    {label}
                                </button>
                            );
                        })}
                        {user ? (
                            <>
                                <button className="gt-collapse-link" onClick={() => { setShowProfile(true); setShowLobby(false); setMobileOpen(false); window.scrollTo(0, 0); }}>
                                    <User size={16} /> โปรไฟล์
                                </button>
                                <div className="gt-collapse-divider" />
                                <button className="gt-collapse-link gt-collapse-logout" onClick={() => { handleLogout(); setMobileOpen(false); }}>
                                    <LogOut size={16} /> ออกจากระบบ
                                </button>
                            </>
                        ) : (
                            <Link to="/home/register" className="gt-collapse-link gt-collapse-login" onClick={() => setMobileOpen(false)}>
                                <LogIn size={16} /> เข้าสู่ระบบ
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* MAIN CONTENT AREA */}
            {(showLobby || showProfile) && user ? (
                    <div className="gt-subpage-wrap">
                        {showLobby && <TeamContent user={user} />}
                        {showProfile && <ProfileContent user={user} />}
                        <div style={{ textAlign: 'center', padding: 20, fontSize: '0.8rem', opacity: 0.6, marginTop: 'auto' }}>
                            © 2026 Khon Kaen Intelligent Living Hackathon 2026
                        </div>
                    </div>
            ) : (
                <>
                    {/* Hero */}
                    <section id="hero" className="gt-section gt-hero gt-container gt-reveal">
                        <div className="gt-badge">
                            <Rocket size={16} /> {config.locale.heroBadge}
                        </div>
                        <h1 style={{ whiteSpace: 'pre-line' }}>{config.locale.heroTitle}</h1>
                        {config.locale.heroSubtitle && <p className="gt-hero-sub" style={{ whiteSpace: 'pre-line' }}>{config.locale.heroSubtitle}</p>}
                        <div className="gt-hero-actions">
                            <Link to="/home/register" className="gt-btn gt-btn-primary">
                                {config.locale.ctaPrimary} <ArrowRight size={18} />
                            </Link>
                            <button className="gt-btn gt-btn-secondary" onClick={() => scrollTo('schedule')}>
                                {config.locale.ctaSecondary}
                            </button>
                        </div>
                    </section>

                    {/* Prize Highlights */}
                    <section id="prizes" className="gt-section gt-container">
                        <div className="gt-section-header gt-reveal">
                            <h2>รางวัลระดับประเทศ</h2>
                        </div>
                        <div className="gt-prizes gt-reveal">
                            {rewardsLoading ? (
                                <p className="gt-prize-status">กำลังโหลดข้อมูลรางวัล...</p>
                            ) : rewardsError ? (
                                <p className="gt-prize-status">{rewardsError}</p>
                            ) : displayRewards.length === 0 ? (
                                <p className="gt-prize-status">ยังไม่มีข้อมูลรางวัล</p>
                            ) : (
                                displayRewards.map((reward) => {
                                    const amountLabel = formatPrizeAmount(reward.amount, reward.currency);
                                    const isChampion = reward.rank === '1';
                                    const cardClass = isChampion ? 'champion' : 'runner-up';
                                    const iconSize = isChampion ? 48 : 32;

                                    return (
                                        <div key={reward.id} className={`gt-prize-card ${cardClass}`}>
                                            <div className="prize-icon"><Trophy size={iconSize} /></div>
                                            <h3>{reward.nameTh}</h3>
                                            {amountLabel && <div className="prize-amount">{amountLabel}</div>}
                                            {reward.prizeTextTh && <div className="prize-extra">{reward.prizeTextTh}</div>}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    {/* About */}
                    <section id="about" className="gt-section gt-container">
                        <div className="gt-section-header gt-reveal">
                            <h2>{config.locale.aboutTitle}</h2>
                            <p>{config.locale.aboutDesc}</p>
                        </div>
                        <div className="gt-bento">
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-purple"><Sparkles color="#fff" size={24} /></div>
                                <h3>นวัตกรรมสาธารณสุข</h3>
                                <p>สร้างสรรค์ผลงานที่ช่วยแก้ปัญหาสาธารณสุขและสิ่งแวดล้อมอย่างยั่งยืน</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-pink"><Users color="#fff" size={24} /></div>
                                <h3>ทีมข้ามศาสตร์</h3>
                                <p>ทำงานร่วมกับเพื่อนจากหลากหลายคณะและมหาวิทยาลัยทั่วประเทศ</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-blue"><Rocket color="#fff" size={24} /></div>
                                <h3>Workshop & Mentoring</h3>
                                <p>รับคำแนะนำจากการอบรมเข้มข้น มุ่งเป้าในการ Pitching ให้เข้าเป้ากระแทกใจ</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-orange"><Trophy color="#fff" size={24} /></div>
                                <h3>รางวัล 135,000 บาท + ถ้วยพระราชทาน</h3>
                                <p>ชิงเงินรางวัลรวมกว่า 135,000 บาท พร้อมถ้วยพระราชทาน</p>
                            </div>
                            <div className="gt-bento-card large gt-reveal">
                                <div className="gt-bento-icon gt-icon-teal"><Target color="#fff" size={24} /></div>
                                <h3>Theme: Climate Talent for Public Health Benefits</h3>
                                <p>
                                    ร่วมเป็นส่วนหนึ่งในการพัฒนาคนรุ่นใหม่ที่มีความรู้ความเข้าใจด้านการเปลี่ยนแปลงสภาพภูมิอากาศ
                                    เพื่อสร้างประโยชน์ต่อระบบสาธารณสุขไทย
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 3-Step Process */}
                    <section id="process" className="gt-section gt-container" style={{ paddingTop: '20px' }}>
                        <div className="gt-section-header gt-reveal">
                            <h2>ขั้นตอนการแข่งขัน</h2>
                            <p>เตรียมตัวเพื่อเป็นผู้ชนะใน Hackathon</p>
                        </div>
                        <div className="gt-process-steps gt-reveal">
                            <div className="gt-step">
                                <div className="step-num">01</div>
                                <h3>คัดกรองคุณสมบัติ</h3>
                                <p>ตรวจสอบคุณสมบัติและรับสมัคร</p>
                            </div>
                            <div className="gt-step-arrow"><ArrowRight size={24} /></div>
                            <div className="gt-step">
                                <div className="step-num">02</div>
                                <h3>พิจารณารอบคัดเลือก</h3>
                                <p>คัดเลือก 12 ทีม เข้าสู่รอบสุดท้าย</p>
                            </div>
                            <div className="gt-step-arrow"><ArrowRight size={24} /></div>
                            <div className="gt-step">
                                <div className="step-num">03</div>
                                <h3>ตัดสินรอบ Final</h3>
                                <p>แข่งขันและนำเสนอผลงาน (Pitching)</p>
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
                            {scheduleLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gt-text-muted)' }}>
                                    กำลังโหลดข้อมูล...
                                </div>
                            ) : scheduleError ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    {scheduleError}
                                </div>
                            ) : schedulesData && schedulesData.days && schedulesData.days.length > 0 ? (
                                schedulesData.days.map((day, dIdx) => (
                                    <div key={dIdx} className="gt-schedule-day-group" style={{ marginBottom: '30px' }}>
                                        {schedulesData.days.length > 1 && (
                                            <h3 style={{ marginBottom: '15px', color: 'var(--gt-text-primary)' }}>
                                                {day.day_name_th || day.day_date}
                                            </h3>
                                        )}
                                        {day.items.map((item, i) => (
                                            <div key={item.item_id} className="gt-schedule-card gt-reveal active" style={{ transitionDelay: `${i * 80}ms` }}>
                                                <div className="gt-time">
                                                    {item.start_time?.substring(0, 5)} - {item.end_time?.substring(0, 5)}
                                                </div>
                                                <div>
                                                    <h3>{item.title_th}</h3>
                                                    {item.description_th && <p>{item.description_th}</p>}
                                                    {(item.location_th || item.speaker_th) && (
                                                        <div className="gt-schedule-meta" style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--gt-text-muted)', display: 'flex', gap: '15px' }}>
                                                            {item.location_th && <span><Target size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {item.location_th}</span>}
                                                            {item.speaker_th && <span><Users size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {item.speaker_th}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gt-text-muted)' }}>
                                    ไม่มีกำหนดการ
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Register CTA */}
                    {!user && (
                        <section id="register" className="gt-section gt-container" style={{ textAlign: 'center', paddingBottom: 40 }}>
                            <div className="gt-reveal">
                                <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 16 }}>พร้อมเข้าร่วมแล้วหรือยัง?</h2>
                                <Link to="/home/register" className="gt-btn gt-btn-primary" style={{ fontSize: '1.05rem', padding: '15px 36px' }}>
                                    ลงทะเบียนเลย <ArrowRight size={20} />
                                </Link>
                            </div>
                        </section>
                    )}

                    {/* Sponsors Marquee — Moved to bottom */}
                    <div className="gt-sponsors-wrapper">
                        <div className="gt-container" style={{ textAlign: 'center', marginBottom: 24, color: 'var(--gt-text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                            ผู้สนับสนุนหลักอย่างเป็นทางการ
                        </div>
                        <div className="gt-marquee">
                            {(!sponsorsLoading ? [...sponsors, ...sponsors] : []).map((item, i) => (
                                <img
                                    key={`${item.id}-${i}`}
                                    src={apiUrl(item.logoUrl)}
                                    alt={item.nameEn || item.nameTh || `Sponsor ${i + 1}`}
                                    className="gt-sponsor-logo"
                                    loading="eager"
                                    decoding="async"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
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
                            <div className="gt-footer-copy">{config.locale.footer}</div>
                        </div>
                    </footer>
                </>
            )}
        </div>
    );
}

export default HomePage;
