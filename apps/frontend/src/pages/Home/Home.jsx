import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Activity,
    Sparkles,
    Users,
    Trophy,
    Target,
    Rocket,
    Calendar,
    Menu,
    X,
    ChevronDown,
    ArrowRight,
    LogIn,
    LogOut,
    User,
    Phone,
    MapPin,
    Mail,
    Facebook
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import GameShapes from '../../components/GameShapes';
import HeroCarousel from './HeroCarousel';
import TeamContent from './Team';
import ProfileContent from './Profile';
import './Home.css';
import { apiUrl } from '../../lib/api';
import {
    getCachedCoOrganizerSponsors,
    setCachedCoOrganizerSponsors,
    getCachedHomeCarouselSlides,
    setCachedHomeCarouselSlides,
} from '../../lib/contentCache';

/* Sponsor logos are loaded from content API */

/* ─── config (customizable per event) ─── */
const config = {
    theme: {
        primary: '#7c3aed',
    },
    locale: {
        nav: ['หน้าแรก', 'เกี่ยวกับ', 'กำหนดการกิจกรรม', 'ลงทะเบียน'],
        heroBadge: '🏆 Hackathon 2026',
        heroTitle: 'Intelligent Living Hackathon 2026',
        heroSubtitle:
            'โครงการกิจกรรมส่งเสริมการพัฒนานวัตกรรมและทักษะด้านการประยุกต์ใช้เทคโนโลยี\nการวิเคราะห์ข้อมูลและปัญญาประดิษฐ์ ประจำปี 2569\nIntelligent Living เพื่อส่งเสริมสุขภาพและคุณภาพชีวิตอย่างยั่งยืน\nณ อุทยานวิทยาศาสตร์ ภาคตะวันออกเฉียงเหนือ มหาวิทยาลัยขอนแก่น',
        ctaPrimary: 'ลงทะเบียนเลย',
        ctaSecondary: 'ดูกำหนดการ',
        aboutTitle: 'ทำไมต้องร่วมกิจกรรมนี้?',
        aboutDesc: 'Intelligent Living คือเวที Hackathon ที่ผสาน AI และ Big Data เพื่อส่งเสริมสุขภาพและคุณภาพชีวิตอย่างยั่งยืน',
        scheduleTitle: 'กำหนดการกิจกรรม',
        scheduleDesc: 'ตารางเวลาของกิจกรรมทั้งหมดตลอดทั้งงาน',
        footer: '© 2026 Intelligent Living Hackathon 2026',
    },
};

const competitionSteps = [
    {
        number: '01',
        date: '20 มีนาคม 2569',
        title: 'สมัครสมาชิก',
        items: [
            'สมัครสมาชิกด้วยอีเมลจริง',
            'กรอกข้อมูลพื้นฐานให้ครบถ้วน',
            'ยืนยันการสมัครผ่านอีเมล',
        ],
    },
    {
        number: '02',
        date: '',
        title: 'สร้างทีมและกรอกข้อมูลที่จำเป็น',
        items: [
            'สมาชิกทุกคนแนบเอกสารระบุตัวตน',
            'กรอกข้อมูลอาจารย์ที่ปรึกษา',
        ],
    },
    {
        number: '03',
        date: '20 มิถุนายน 2569',
        title: 'ส่งทีมเข้าร่วมการพิจารณา',
        items: [
            'สมาชิกทุกคนตรวจสอบความถูกต้องของข้อมูลอีกครั้ง',
            'หัวหน้าทีมส่งรายชื่อสมาชิกเข้าร่วมการพิจารณา',
            'หลังจากส่งรายชื่อจะไม่สามารถแก้ไขข้อมูลได้',
            'ต้องส่งทีมเข้าร่วมการพิจารณาภายในวันที่ 20 มิถุนายน 2569 เท่านั้น',
        ],
    },
    {
        number: '04',
        date: '',
        title: 'การพิจารณาและประกาศผล',
        items: [
            'คณะกรรมการพิจารณาทีมที่ผ่านคุณสมบัติ',
            'ประกาศรายชื่อทีมที่ผ่านการพิจารณาในวันที่ 30 มิถุนายน 2569',
        ],
    },
    {
        number: '05',
        date: '3 - 5 กรกฎาคม 2569',
        title: 'เข้าร่วมกิจกรรม',
        items: [
            'ทีมที่ผ่านการคัดเลือกเข้ารับการอบรมพื้นฐาน',
            'เข้าร่วมงานจริงวันที่ 3 - 5 กรกฎาคม 2569',
        ],
    },
];

function formatCompactNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '-';
    return numeric.toLocaleString('th-TH');
}

function formatTrendPeriodLabel(periodStart, mode) {
    if (!periodStart) return '-';

    const parsed = new Date(`${periodStart}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return String(periodStart);

    if (mode === 'monthly') {
        return parsed.toLocaleDateString('th-TH', {
            month: 'short',
            year: '2-digit',
        });
    }

    return parsed.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
    });
}

function buildLineGeometry(values, width, height, paddingX, paddingY, maxValue) {
    if (!values.length) {
        return { points: [], linePath: '', areaPath: '' };
    }

    const usableWidth = Math.max(1, width - (paddingX * 2));
    const usableHeight = Math.max(1, height - (paddingY * 2));
    const denominator = values.length > 1 ? values.length - 1 : 1;
    const safeMax = Math.max(1, maxValue);

    const points = values.map((value, index) => {
        const ratio = Math.max(0, Number(value)) / safeMax;
        const x = paddingX + (usableWidth * index) / denominator;
        const y = paddingY + usableHeight - (ratio * usableHeight);
        return { x, y };
    });

    const linePath = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ');

    const first = points[0];
    const last = points[points.length - 1];
    const baseline = height - paddingY;
    const areaPath = `${linePath} L ${last.x.toFixed(2)} ${baseline.toFixed(2)} L ${first.x.toFixed(2)} ${baseline.toFixed(2)} Z`;

    return { points, linePath, areaPath };
}

function ParticipationTrendChart({ rows, mode }) {
    if (!rows.length) {
        return <div className="gt-participation-chart-empty">ยังไม่มีข้อมูลแนวโน้ม</div>;
    }

    const width = 960;
    const height = 174;
    const paddingX = 20;
    const paddingY = 14;
    const participantValues = rows.map((row) => Number(row.interestedParticipants) || 0);
    const teamValues = rows.map((row) => Number(row.totalTeams) || 0);
    const maxValue = Math.max(...participantValues, ...teamValues, 1);

    const participantLine = buildLineGeometry(participantValues, width, height, paddingX, paddingY, maxValue);
    const teamLine = buildLineGeometry(teamValues, width, height, paddingX, paddingY, maxValue);

    const firstLabel = formatTrendPeriodLabel(rows[0]?.periodStart, mode);
    const lastLabel = formatTrendPeriodLabel(rows[rows.length - 1]?.periodStart, mode);

    return (
        <div className="gt-participation-chart-shell">
            <svg className="gt-participation-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="แนวโน้มผู้สมัครและทีม">
                <defs>
                    <linearGradient id="gt-participation-users-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(124, 58, 237, 0.34)" />
                        <stop offset="100%" stopColor="rgba(124, 58, 237, 0.02)" />
                    </linearGradient>
                    <linearGradient id="gt-participation-teams-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(59, 130, 246, 0.26)" />
                        <stop offset="100%" stopColor="rgba(59, 130, 246, 0.02)" />
                    </linearGradient>
                </defs>

                <path d={participantLine.areaPath} fill="url(#gt-participation-users-fill)" />
                <path d={teamLine.areaPath} fill="url(#gt-participation-teams-fill)" />

                <path d={participantLine.linePath} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d={teamLine.linePath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {participantLine.points.map((point, index) => (
                    <circle key={`participants-${index}`} cx={point.x} cy={point.y} r="2.7" fill="#7c3aed" />
                ))}
                {teamLine.points.map((point, index) => (
                    <circle key={`teams-${index}`} cx={point.x} cy={point.y} r="2.5" fill="#3b82f6" />
                ))}
            </svg>
            <div className="gt-participation-axis">
                <span>{firstLabel}</span>
                <span>{lastLabel}</span>
            </div>
        </div>
    );
}

function AnimatedCounter({ value, suffix }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const target = Math.max(0, Number(value) || 0);
        const startTime = performance.now();
        const durationMs = 900;
        let rafId = null;

        const tick = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const nextValue = Math.round(target * eased);
            setDisplayValue(nextValue);

            if (progress < 1) {
                rafId = requestAnimationFrame(tick);
            }
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [value]);

    return (
        <div className="gt-participation-stat-wrap">
            <span className="gt-participation-stat-number">{formatCompactNumber(displayValue)}</span>
            <span className="gt-participation-stat-unit">{suffix}</span>
        </div>
    );
}



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
    const [carouselSlides, setCarouselSlides] = useState(() => getCachedHomeCarouselSlides() || []);
    const [coOrganizerSponsors, setCoOrganizerSponsors] = useState(() => getCachedCoOrganizerSponsors() || []);
    const [sponsors, setSponsors] = useState([]);
    const [sponsorsLoading, setSponsorsLoading] = useState(true);
    const [participationOverview, setParticipationOverview] = useState(null);
    const [participationLoading, setParticipationLoading] = useState(true);
    const [participationError, setParticipationError] = useState(null);
    const [participationMode, setParticipationMode] = useState('weekly');
    const [isScheduleMobile, setIsScheduleMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(max-width: 768px)').matches;
    });
    const [openScheduleDay, setOpenScheduleDay] = useState(-1);

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

        const fetchCarousels = async () => {
            try {
                const response = await fetch(apiUrl('/api/content/carousels'), {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch carousels: ${response.status}`);
                }

                const payload = await response.json();
                const items = Array.isArray(payload?.data) ? payload.data : [];
                const normalized = items
                    .map((item, index) => {
                        const title = item.titleTh || item.titleEn || `Slide ${index + 1}`;
                        const imagePath = item.imageUrl || item.imageStorageKey || '';
                        return {
                            id: item.id ?? `slide-${index + 1}`,
                            title,
                            description: item.descriptionTh || item.descriptionEn || '',
                            imageUrl: imagePath ? apiUrl(imagePath) : '',
                            imageAlt: item.imageAltTh || item.imageAltEn || title,
                            targetUrl: item.targetUrl || '',
                            openInNewTab: item.openInNewTab !== false,
                        };
                    })
                    .filter((item) => item.imageUrl);

                setCarouselSlides(normalized);
                setCachedHomeCarouselSlides(normalized);
            } catch (err) {
                console.error('Failed to fetch carousels', err);
                setCarouselSlides(getCachedHomeCarouselSlides() || []);
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

        const fetchParticipationOverview = async () => {
            try {
                setParticipationLoading(true);
                setParticipationError(null);

                const response = await fetch(apiUrl('/api/content/participation-overview'), {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch participation overview: ${response.status}`);
                }

                const payload = await response.json();
                if (!payload?.ok || !payload?.data) {
                    throw new Error(payload?.message || 'Failed to fetch participation overview');
                }

                setParticipationOverview(payload.data);
                setParticipationLoading(false);
            } catch (err) {
                console.error('Failed to fetch participation overview', err);
                setParticipationOverview(null);
                setParticipationError('เกิดข้อผิดพลาดในการโหลดสถิติการเข้าร่วม');
                setParticipationLoading(false);
            }
        };

        fetchSchedules();
        fetchRewards();
        fetchCarousels();
        fetchSponsors();
        fetchParticipationOverview();
    }, [location]);

    useEffect(() => {
        if (!user) return;

        const open = location.state?.open;
        if (open === 'team') {
            setShowLobby(true);
            setShowProfile(false);
            window.scrollTo(0, 0);
            return;
        }

        if (open === 'profile') {
            setShowProfile(true);
            setShowLobby(false);
            window.scrollTo(0, 0);
        }
    }, [location.state, user]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const handleChange = (event) => setIsScheduleMobile(event.matches);

        setIsScheduleMobile(mediaQuery.matches);

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, []);

    useEffect(() => {
        const dayCount = schedulesData?.days?.length || 0;
        if (!isScheduleMobile || dayCount === 0) return;
        if (openScheduleDay < dayCount) return;
        setOpenScheduleDay(0);
    }, [isScheduleMobile, schedulesData, openScheduleDay]);

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

    const participationTrendRows = useMemo(() => {
        const rows = participationOverview?.trend?.[participationMode];
        if (!Array.isArray(rows)) return [];
        return rows;
    }, [participationMode, participationOverview]);

    const participationUpdatedAtLabel = useMemo(() => {
        const raw = participationOverview?.generatedAt;
        if (!raw) return '';
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return '';

        return parsed.toLocaleString('th-TH', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    }, [participationOverview]);

    const trendModeLabel = participationMode === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน';

    const formatScheduleDateLabel = (dayDate) => {
        if (!dayDate) return '-';
        const parsed = new Date(dayDate);
        if (Number.isNaN(parsed.getTime())) return dayDate;

        return parsed.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatScheduleTime = (startTime, endTime) => {
        const start = startTime?.substring(0, 5) || '--:--';
        const end = endTime?.substring(0, 5) || '--:--';
        return `${start} - ${end}`;
    };

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

    useEffect(() => {
        const targetId = location.state?.scrollTo;
        if (!targetId) return;

        const timer = setTimeout(() => {
            scrollTo(targetId);
        }, 0);

        return () => clearTimeout(timer);
    }, [location.state?.scrollTo]);

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
                                    <Users size={15} /> ทีมของฉัน
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
                                        <Users size={16} /> ทีมของฉัน
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
                        © 2026 Intelligent Living Hackathon 2026
                    </div>
                </div>
            ) : (
                <>
                    {/* Hero */}
                    <section id="hero" className="gt-section gt-hero gt-container gt-reveal">
                        <h1 style={{ whiteSpace: 'pre-line' }}>{config.locale.heroTitle}</h1>
                        <HeroCarousel slides={carouselSlides} />
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

                    {/* Participation Overview */}
                    <section id="participation" className="gt-section gt-container gt-participation-section">
                        <div className="gt-participation-wrap gt-reveal">
                            {participationError ? (
                                <p className="gt-participation-status">{participationError}</p>
                            ) : (
                                <>
                                    <article className="gt-participation-graph gt-participation-graph-users">
                                        <h3>
                                            <Users size={17} />
                                            จำนวนคนที่สนใจเข้าร่วม
                                        </h3>
                                        {participationLoading ? (
                                            <div className="gt-participation-stat-loading" />
                                        ) : (
                                            <AnimatedCounter
                                                value={participationOverview?.totals?.interestedParticipants ?? 0}
                                                suffix="คน"
                                            />
                                        )}
                                    </article>

                                    <article className="gt-participation-graph gt-participation-graph-teams">
                                        <h3>
                                            <Target size={17} />
                                            จำนวนทีมทั้งหมด
                                        </h3>
                                        {participationLoading ? (
                                            <div className="gt-participation-stat-loading" />
                                        ) : (
                                            <AnimatedCounter
                                                value={participationOverview?.totals?.totalTeams ?? 0}
                                                suffix="ทีม"
                                            />
                                        )}
                                    </article>

                                    <article className="gt-participation-graph gt-participation-graph-trend">
                                        <div className="gt-participation-trend-head">
                                            <h3>
                                                <Activity size={17} />
                                                จำนวนคนที่สมัคร และจำนวนทีมที่ถูกสร้างขึ้นมา ({trendModeLabel})
                                            </h3>
                                            <div className="gt-participation-mode" role="tablist" aria-label="โหมดการแสดงผลแนวโน้ม">
                                                {[
                                                    { value: 'weekly', label: 'รายสัปดาห์' },
                                                    { value: 'monthly', label: 'รายเดือน' },
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        className={participationMode === option.value ? 'active' : ''}
                                                        onClick={() => setParticipationMode(option.value)}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="gt-participation-legend">
                                            <span><i className="users-dot" /> ผู้สนใจเข้าร่วม</span>
                                            <span><i className="teams-dot" /> ทีมที่สร้างแล้ว</span>
                                        </div>

                                        {participationLoading ? (
                                            <div className="gt-participation-chart-empty">กำลังโหลดสถิติ...</div>
                                        ) : (
                                            <ParticipationTrendChart rows={participationTrendRows} mode={participationMode} />
                                        )}
                                    </article>
                                </>
                            )}

                            {!participationLoading && !participationError && participationUpdatedAtLabel ? (
                                <p className="gt-participation-updated">อัปเดตล่าสุด {participationUpdatedAtLabel}</p>
                            ) : null}
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
                                        <div key={reward.id} className={`gt-prize-card ${cardClass}`} data-rank={String(reward.rank || '')}>
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
                                <h3>AI &amp; Big Data เพื่อ Smart Life</h3>
                                <p>ฝึกใช้ข้อมูลขนาดใหญ่และปัญญาประดิษฐ์เพื่อวิเคราะห์ วางแผน และออกแบบโซลูชันที่ตอบโจทย์การใช้ชีวิตจริง</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-pink"><Users color="#fff" size={24} /></div>
                                <h3>เครือข่ายข้ามศาสตร์</h3>
                                <p>ร่วมทีมกับนักเรียน นักศึกษา อาจารย์ และผู้เชี่ยวชาญจากหลายสาขา เช่น คอมพิวเตอร์ แพทย์ พยาบาล สาธารณสุข และท้องถิ่น</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-blue"><Rocket color="#fff" size={24} /></div>
                                <h3>อบรมเข้มข้น + Mentoring</h3>
                                <p>เสริมพื้นฐานถึงขั้นสูงด้าน AI, Machine Learning และ Data Analytics พร้อมพี่เลี้ยงช่วยพัฒนาแนวคิดจนพร้อมนำเสนอ</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-orange"><Trophy color="#fff" size={24} /></div>
                                <h3>ต่อยอดสู่นวัตกรรมใช้งานจริง</h3>
                                <p>พัฒนาผลงานต้นแบบที่วัดผลกระทบต่อสุขภาพและคุณภาพชีวิตได้ และมีโอกาสต่อยอดเป็นโครงการวิจัยหรือขยายผลเชิงพื้นที่</p>
                            </div>
                            <div className="gt-bento-card large gt-reveal">
                                <div className="gt-bento-icon gt-icon-teal"><Target color="#fff" size={24} /></div>
                                <h3>Theme: Intelligent Living</h3>
                                <p>
                                    ขับเคลื่อนแนวคิด Smart Life Ecosystem ผ่าน Health Promotion, Preventive Approach,
                                    การพัฒนาทุนมนุษย์ดิจิทัล และการลดความเหลื่อมล้ำด้านคุณภาพชีวิต
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Competition Process */}
                    <section id="process" className="gt-section gt-container" style={{ paddingTop: '20px' }}>
                        <div className="gt-section-header gt-reveal">
                            <h2>ขั้นตอนการเข้าร่วมกิจกรรม</h2>
                            <p>5 ขั้นตอน สู่การเข้าร่วมกิจกรรม Hackathon</p>
                        </div>
                        <div className="gt-process-steps gt-reveal">
                            {competitionSteps.map((step) => (
                                <div key={step.number} className="gt-step">
                                    <div className={`gt-step-date${step.date ? '' : ' is-empty'}`} aria-hidden={!step.date}>{step.date || '\u00A0'}</div>
                                    <div className="step-num">{step.number}</div>
                                    <div className="gt-step-body">
                                        <h3>{step.title}</h3>
                                        <ul className="gt-step-list">
                                            {step.items.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
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
                                    <div
                                        key={dIdx}
                                        className={`gt-schedule-day-group gt-reveal active ${(!isScheduleMobile || openScheduleDay === dIdx) ? 'is-open' : 'is-collapsed'}`}
                                        style={{ transitionDelay: `${dIdx * 80}ms` }}
                                    >
                                        <div className="gt-schedule-day-content">
                                            <button
                                                type="button"
                                                className="gt-schedule-day-header"
                                                aria-expanded={!isScheduleMobile || openScheduleDay === dIdx}
                                                aria-controls={`gt-schedule-day-items-${dIdx}`}
                                                onClick={() => {
                                                    if (!isScheduleMobile) return;
                                                    setOpenScheduleDay((prev) => (prev === dIdx ? -1 : dIdx));
                                                }}
                                            >
                                                <span className="gt-schedule-day-header-main">
                                                    <Calendar size={18} />
                                                    <span>
                                                        <h3>{day.day_name_th || 'วันกิจกรรม'}</h3>
                                                        <span className="gt-schedule-day-date">{formatScheduleDateLabel(day.day_date)}</span>
                                                    </span>
                                                </span>
                                                <ChevronDown className="gt-schedule-day-chevron" size={18} />
                                            </button>

                                            {(!isScheduleMobile || openScheduleDay === dIdx) && (
                                                <div id={`gt-schedule-day-items-${dIdx}`} className="gt-schedule-day-items">
                                                    {day.items.map((item, i) => (
                                                        <div key={item.item_id} className="gt-schedule-card" style={{ transitionDelay: `${(dIdx + i) * 60}ms` }}>
                                                            <div className="gt-time">
                                                                {formatScheduleTime(item.start_time, item.end_time)}
                                                            </div>
                                                            <div>
                                                                <h3>{item.title_th}</h3>
                                                                {item.description_th && <p>{item.description_th}</p>}
                                                                {(item.location_th || item.speaker_th) && (
                                                                    <div className="gt-schedule-meta" style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--gt-text-muted)', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                                                        {item.location_th && <span><Target size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {item.location_th}</span>}
                                                                        {item.speaker_th && <span><Users size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {item.speaker_th}</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
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
                                        <Rocket size={20} /> Intelligent Living Hackathon 2026
                                    </div>
                                    <p className="gt-footer-contact" style={{ color: 'var(--gt-footer-text)', margin: 0, fontSize: '0.9rem', lineHeight: '1.6' }}>
                                        <MapPin size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                                        วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น<br />
                                        123 อาคารวิทยวิภาส ถ.มิตรภาพ ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น 40002<br />
                                        <Phone size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', marginTop: '8px' }} />
                                        โทรศัพท์ 043 009 700 ต่อ 44463, 50525<br />
                                        <Phone size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', marginTop: '8px' }} />
                                        Hotline : 089 710 2651, 089 710 2645<br />
                                        <Mail size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', marginTop: '8px' }} />
                                        Email : computing.kku@kku.ac.th
                                    </p>
                                </div>
                                <div className="gt-footer-cols">
                                    <div className="gt-footer-col">
                                        <h4>Quick Links</h4>
                                        <a href="#schedule" onClick={(e) => { e.preventDefault(); scrollTo('schedule'); }}>กำหนดการ</a>
                                        <a href="#prizes" onClick={(e) => { e.preventDefault(); scrollTo('prizes'); }}>รางวัล</a>
                                    </div>
                                    <div className="gt-footer-col">
                                        <h4>Support</h4>
                                        <Link to="/home/contact">ติดต่อสอบถาม</Link>
                                        <Link to="/home/faqs">FAQs</Link>
                                    </div>
                                    <div className="gt-footer-col">
                                        <h4>Follow us</h4>
                                        <a href="https://www.facebook.com/hackathonthailand" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Facebook size={16} /> Facebook
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
