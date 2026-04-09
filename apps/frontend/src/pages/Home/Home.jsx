import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Activity,
    Sparkles,
    Users,
    Trophy,
    Target,
    BedDouble,
    Car,
    UtensilsCrossed,
    Gift,
    Rocket,
    Home,
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
        nav: ['หน้าแรก', 'เกี่ยวกับ', 'ภาคีเครือข่าย', 'กำหนดการกิจกรรม', 'สถานที่จัดงาน', 'ตัวอย่างชุดข้อมูล', 'ลงทะเบียน'],
        heroBadge: '🏆 Hackathon 2026',
        heroTitle: 'สถาบันข้อมูลขนาดใหญ่ (องค์การมหาชน) ร่วมกับวิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น\nขอเชิญนักเรียน นิสิต และนักศึกษา เข้าร่วมการแข่งขัน BDI Young Innovator Hackathon\nชิงถ้วยพระราชทาน สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดา ฯ สยามบรมราชกุมารี',
        ctaPrimary: 'ลงทะเบียนเลย',
        ctaSecondary: 'ดูกำหนดการ',
        aboutTitle: 'ทำไมคุณถึงไม่ควรพลาด "Intelligent Living Hackathon"',
        aboutDesc: 'นี่ไม่ใช่แค่การแข่งขัน แต่คือโอกาสครั้งสำคัญในการใช้เทคโนโลยีเปลี่ยนโลก!',
        scheduleTitle: 'กำหนดการกิจกรรม',
        scheduleDesc: 'ตารางเวลาของกิจกรรมทั้งหมดตลอดทั้งงาน',
        footer: 'BDI Young Innovator Hackathon: Intelligent Living',
    },
    process: {
        step4HighlightStartDate: import.meta.env.VITE_PROCESS_STEP4_HIGHLIGHT_START_DATE || '2026-06-21',
        step5HighlightStartDate: import.meta.env.VITE_PROCESS_STEP5_HIGHLIGHT_START_DATE || '2026-07-03',
    },
};

const competitionSteps = [
    {
        number: '01',
        date: '10 เมษายน 2569',
        title: 'ลงทะเบียน',
        items: [
            'ลงทะเบียนด้วยอีเมลจริง',
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
            'กรอกข้อมูลอาจารย์ที่ปรึกษา (ถ้ามี)',
        ],
    },
    {
        number: '03',
        date: '24 พฤษภาคม - 3 มิถุนายน 2569',
        title: 'ส่งทีมเข้าร่วมการพิจารณา',
        items: [
            'สมาชิกทุกคนตรวจสอบความถูกต้องของข้อมูลอีกครั้ง',
            'หัวหน้าทีมส่งรายชื่อสมาชิกเข้าร่วมการพิจารณา',
            'หลังจากส่งรายชื่อจะไม่สามารถแก้ไขข้อมูลได้',
            'ต้องส่งทีมเข้าร่วมการพิจารณาภายในวันที่ 3 มิถุนายน 2569 เท่านั้น',
        ],
    },
    {
        number: '04',
        date: '',
        title: 'การพิจารณาและประกาศผล',
        items: [
            'คณะกรรมการพิจารณาทีมที่ผ่านคุณสมบัติ',
            'ประกาศรายชื่อทีมที่ผ่านการพิจารณาในวันที่ 14 มิถุนายน 2569',
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

const REGISTRATION_PERIOD_START = '2026-04-01';
const REGISTRATION_PERIOD_END = '2026-05-31';

// ปรับวัน/เวลาสิ้นสุดของ Countdown ได้ที่ค่านี้ (รูปแบบ ISO 8601 + เวลาไทย)
const HERO_COUNTDOWN_TARGET_ISO = '2026-07-03T23:59:59+07:00';
const HERO_COUNTDOWN_TARGET_LABEL = '3 กรกฎาคม 2569';
const HERO_COUNTDOWN_TARGET_DATE = new Date(HERO_COUNTDOWN_TARGET_ISO);
const HERO_COUNTDOWN_UNITS = [
    { key: 'days', label: 'วัน' },
    { key: 'hours', label: 'ชั่วโมง' },
    { key: 'minutes', label: 'นาที' },
    { key: 'seconds', label: 'วินาที' },
];

const STATIC_PRIZES = [
    {
        id: 'prize-runner-up-1',
        rank: '2',
        title: 'รางวัลรองชนะเลิศอันดับ 1',
        amountLine: '30,000 บาท',
    },
    {
        id: 'prize-champion',
        rank: '1',
        title: 'รางวัลชนะเลิศ',
        trophyLine: 'ถ้วยพระราชทาน\nกรมสมเด็จพระเทพฯ',
        amountLine: 'พร้อมเงินรางวัลสูงสุด 50,000 บาท',
    },
    {
        id: 'prize-runner-up-2',
        rank: '3',
        title: 'รางวัลรองชนะเลิศอันดับ 2',
        amountLine: '20,000 บาท',
    },
];

const THAI_DATE_IN_TEXT_PATTERN = /(\d{1,2}(?:\s*-\s*\d{1,2})?\s+[ก-๙]+\s+25\d{2})/g;

function getHeroCountdown(targetDate, nowMs = Date.now()) {
    if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            expired: true,
        };
    }

    const diffMs = targetDate.getTime() - nowMs;
    if (diffMs <= 0) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            expired: true,
        };
    }

    const totalSeconds = Math.floor(diffMs / 1000);

    return {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
        expired: false,
    };
}

function formatHeroCountdownValue(unit, value) {
    const numeric = Math.max(0, Number(value) || 0);
    if (unit === 'days') return numeric.toLocaleString('th-TH');
    return String(numeric).padStart(2, '0');
}

function emphasizeThaiDateInText(text) {
    if (typeof text !== 'string') return text;
    const parts = text.split(THAI_DATE_IN_TEXT_PATTERN);
    if (parts.length === 1) return text;

    return parts.map((part, index) =>
        index % 2 === 1
            ? <strong key={`date-${index}`}>{part}</strong>
            : <React.Fragment key={`text-${index}`}>{part}</React.Fragment>
    );
}

function parseThaiDateOnly(raw) {
    if (!raw) return null;
    const parsed = new Date(`${raw}T00:00:00+07:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + days);
    return next;
}

function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatShortThaiDate(date) {
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
    });
}

function formatThaiDateRange(startDate, endDate) {
    if (startDate.getTime() === endDate.getTime()) {
        return formatShortThaiDate(startDate);
    }

    if (
        startDate.getMonth() === endDate.getMonth()
        && startDate.getFullYear() === endDate.getFullYear()
    ) {
        return `${startDate.toLocaleDateString('th-TH', { day: 'numeric' })}-${formatShortThaiDate(endDate)}`;
    }

    return `${formatShortThaiDate(startDate)}-${formatShortThaiDate(endDate)}`;
}

function formatCompactNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '-';
    return numeric.toLocaleString('th-TH');
}

function formatTrendPeriodLabel(periodStart, mode, chartStartDate, chartEndDate) {
    if (!periodStart) return '-';

    const parsed = parseThaiDateOnly(periodStart);
    if (!parsed) return String(periodStart);

    if (mode === 'monthly') {
        return parsed.toLocaleDateString('th-TH', {
            month: 'short',
            year: '2-digit',
        });
    }

    const naturalRangeStart = parsed;
    const naturalRangeEnd = addDays(parsed, 6);
    const effectiveStart = chartStartDate && naturalRangeStart < chartStartDate ? chartStartDate : naturalRangeStart;
    const effectiveEnd = chartEndDate && naturalRangeEnd > chartEndDate ? chartEndDate : naturalRangeEnd;

    return formatThaiDateRange(effectiveStart, effectiveEnd);
}

function normalizeWebsiteUrl(url) {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

function buildBarGeometry(values, width, height, paddingX, paddingY, maxValue, offsetX, barWidth, stepX) {
    const usableHeight = Math.max(1, height - (paddingY * 2));
    const safeMax = Math.max(1, maxValue);
    const baseline = height - paddingY;

    return values.map((value, index) => {
        const ratio = Math.max(0, Number(value)) / safeMax;
        const barHeight = ratio * usableHeight;
        const x = paddingX + (stepX * index) + offsetX;
        const y = baseline - barHeight;

        return {
            x,
            y,
            width: barWidth,
            height: barHeight,
        };
    });
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

    const usableWidth = Math.max(1, width - (paddingX * 2));
    const groupCount = Math.max(rows.length, 1);
    const stepX = usableWidth / groupCount;
    const innerGap = Math.max(1.5, stepX * 0.08);
    const barWidth = Math.min(14, Math.max(2, ((stepX - innerGap) * 0.42)));
    const groupWidth = (barWidth * 2) + innerGap;
    const startOffset = (stepX - groupWidth) / 2;

    const participantBars = buildBarGeometry(participantValues, width, height, paddingX, paddingY, maxValue, startOffset, barWidth, stepX);
    const teamBars = buildBarGeometry(teamValues, width, height, paddingX, paddingY, maxValue, startOffset + barWidth + innerGap, barWidth, stepX);

    const axisPaddingPercent = (paddingX / width) * 100;
    const chartStartDate = parseThaiDateOnly(REGISTRATION_PERIOD_START);
    const chartEndDate = parseThaiDateOnly(REGISTRATION_PERIOD_END);

    return (
        <div className="gt-participation-chart-shell">
            <svg className="gt-participation-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="กราฟแท่งผู้สมัครและทีม">
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

                <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(148, 163, 184, 0.42)" strokeWidth="1" />

                {participantBars.map((bar, index) => (
                    <rect key={`participants-${index}`} x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="2.8" fill="url(#gt-participation-users-fill)" stroke="rgba(124, 58, 237, 0.9)" strokeWidth="1" />
                ))}
                {teamBars.map((bar, index) => (
                    <rect key={`teams-${index}`} x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="2.8" fill="url(#gt-participation-teams-fill)" stroke="rgba(59, 130, 246, 0.9)" strokeWidth="1" />
                ))}
            </svg>
            <div
                className="gt-participation-axis gt-participation-axis-grid"
                style={{
                    gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`,
                    paddingLeft: `${axisPaddingPercent}%`,
                    paddingRight: `${axisPaddingPercent}%`,
                }}
            >
                {rows.map((row, index) => (
                    <span key={`${row.periodStart || 'period'}-${index}`}>
                        {formatTrendPeriodLabel(row.periodStart, mode, chartStartDate, chartEndDate)}
                    </span>
                ))}
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

function normalizeScheduleCollection(rawData) {
    if (!rawData) return [];

    const scheduleList = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData.schedules)
            ? rawData.schedules
            : Array.isArray(rawData.days)
                ? [rawData]
                : [];

    return scheduleList
        .filter((schedule) => schedule && typeof schedule === 'object')
        .map((schedule) => ({
            ...schedule,
            table_type: schedule?.table_type || schedule?.tableType || 'onsite_timetable',
            days: Array.isArray(schedule.days)
                ? schedule.days.map((day) => ({
                    ...day,
                    items: Array.isArray(day.items) ? day.items : [],
                }))
                : [],
        }));
}

function getScheduleItemName(item) {
    const fromRequestedField = typeof item?.event_schedule_items === 'string'
        ? item.event_schedule_items.trim()
        : '';
    if (fromRequestedField) return fromRequestedField;

    const titleTh = typeof item?.title_th === 'string' ? item.title_th.trim() : '';
    if (titleTh) return titleTh;

    const titleEn = typeof item?.title_en === 'string' ? item.title_en.trim() : '';
    if (titleEn) return titleEn;

    return '-';
}

function groupScheduleDaysByMonth(days) {
    if (!Array.isArray(days)) return [];

    const monthMap = new Map();

    days.forEach((day) => {
        const parsed = day?.day_date ? new Date(day.day_date) : null;
        const monthKey = parsed && !Number.isNaN(parsed.getTime())
            ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
            : 'unknown';
        const monthLabel = parsed && !Number.isNaN(parsed.getTime())
            ? parsed.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
            : 'กำหนดการ';

        if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, {
                key: monthKey,
                label: monthLabel,
                days: [],
            });
        }

        monthMap.get(monthKey).days.push(day);
    });

    return Array.from(monthMap.values());
}

function getScheduleTableType(schedule) {
    const raw = String(schedule?.table_type || schedule?.tableType || '').trim();
    if (raw === 'milestone' || raw === 'onsite_timetable') return raw;
    return 'onsite_timetable';
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
    const [schedulesData, setSchedulesData] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [scheduleError, setScheduleError] = useState(null);
    const [carouselSlides, setCarouselSlides] = useState(() => getCachedHomeCarouselSlides() || []);
    const [coOrganizerSponsors, setCoOrganizerSponsors] = useState(() => getCachedCoOrganizerSponsors() || []);
    const [sponsors, setSponsors] = useState([]);
    const [sponsorsLoading, setSponsorsLoading] = useState(true);
    const [participationOverview, setParticipationOverview] = useState(null);
    const [participationLoading, setParticipationLoading] = useState(true);
    const [participationError, setParticipationError] = useState(null);
    const [participationMode, setParticipationMode] = useState('weekly');
    const [heroCountdown, setHeroCountdown] = useState(() => getHeroCountdown(HERO_COUNTDOWN_TARGET_DATE));

    const processHighlightPhase = useMemo(() => {
        const step4Start = new Date(`${config.process.step4HighlightStartDate}T00:00:00+07:00`);
        const step5Start = new Date(`${config.process.step5HighlightStartDate}T00:00:00+07:00`);
        const now = new Date();

        const hasStep4Date = !Number.isNaN(step4Start.getTime());
        const hasStep5Date = !Number.isNaN(step5Start.getTime());

        if (!hasStep4Date) return 'early';
        if (hasStep5Date && now >= step5Start) return 'final';
        if (now >= step4Start) return 'review';
        return 'early';
    }, []);

    useEffect(() => {
        const tick = () => {
            setHeroCountdown(getHeroCountdown(HERO_COUNTDOWN_TARGET_DATE));
        };

        tick();
        const intervalId = window.setInterval(tick, 1000);

        return () => window.clearInterval(intervalId);
    }, []);

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
                            avatarUrl: data.data.avatarUrl || null,
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

                setSchedulesData(normalizeScheduleCollection(payload.data));
                setScheduleLoading(false);
            } catch (err) {
                console.error('Failed to fetch schedules', err);
                setScheduleError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
                setSchedulesData([]);
                setScheduleLoading(false);
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

    const participationTrendRows = useMemo(() => {
        const rows = participationOverview?.trend?.[participationMode];
        if (!Array.isArray(rows)) return [];

        const rangeStart = parseThaiDateOnly(REGISTRATION_PERIOD_START);
        const rangeEnd = parseThaiDateOnly(REGISTRATION_PERIOD_END);
        if (!rangeStart || !rangeEnd) return rows;

        return rows.filter((row) => {
            const rowStart = parseThaiDateOnly(row?.periodStart);
            if (!rowStart) return false;

            const rowEnd = participationMode === 'weekly' ? addDays(rowStart, 6) : endOfMonth(rowStart);
            return rowEnd >= rangeStart && rowStart <= rangeEnd;
        });
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

    const formatScheduleDateCell = (dayDate) => {
        if (!dayDate) return '-';
        const parsed = new Date(dayDate);
        if (Number.isNaN(parsed.getTime())) return dayDate;

        return parsed.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'long',
        });
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

    const handlePrimaryCta = () => {
        if (user) {
            setShowLobby(true);
            setShowProfile(false);
            setMobileOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        navigate('/login');
    };

    useEffect(() => {
        const targetId = location.state?.scrollTo;
        if (!targetId) return;

        const timer = setTimeout(() => {
            scrollTo(targetId);
        }, 0);

        return () => clearTimeout(timer);
    }, [location.state?.scrollTo]);

    const sectionIds = ['hero', 'about', null, 'schedule', null, null, 'register'];

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

            {/* Pill Navigation */}
            <nav className={`gt-pill-nav ${navScrolled ? 'scrolled' : ''}`}>
                <div className="gt-pill-bar">
                    <a href="#" className="gt-pill-icon" onClick={(e) => { e.preventDefault(); scrollTo('hero'); }} aria-label="Home">
                        <Home size={20} />
                    </a>
                    <div className="gt-pill-links">
                        {config.locale.nav.map((label, i) => {
                            if (i === 6 && user) return null; // hide ลงทะเบียน when logged in

                            const handleNavClick = () => {
                                if (i === 1) {
                                    navigate('/home/about');
                                    return;
                                }

                                if (i === 2) {
                                    navigate('/home/partner');
                                    return;
                                }

                                if (i === 4) {
                                    navigate('/home/venues');
                                    return;
                                }

                                if (i === 5) {
                                    navigate('/home/datasets');
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

                {/* Mobile Collapse Panel */}
                <div className={`gt-pill-collapse ${mobileOpen ? 'open' : ''}`}>
                    <div className="gt-pill-collapse-inner">
                        {config.locale.nav.map((label, i) => {
                            const isRegister = i === 6;
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

                                if (i === 2) {
                                    navigate('/home/partner');
                                    setMobileOpen(false);
                                    return;
                                }

                                if (i === 4) {
                                    navigate('/home/venues');
                                    setMobileOpen(false);
                                    return;
                                }

                                if (i === 5) {
                                    navigate('/home/datasets');
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
                            <Link to="/login" className="gt-collapse-link gt-collapse-login" onClick={() => setMobileOpen(false)}>
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
                        <HeroCarousel slides={carouselSlides} />
                        <h1 className="gt-hero-title" style={{ whiteSpace: 'pre-line' }}>{config.locale.heroTitle}</h1>
                        <div className={`gt-hero-countdown ${heroCountdown.expired ? 'is-expired' : ''}`} role="timer" aria-label={`นับถอยหลังสู่วันที่ ${HERO_COUNTDOWN_TARGET_LABEL}`}>
                            <div className="gt-hero-countdown-grid">
                                {HERO_COUNTDOWN_UNITS.map((unit) => (
                                    <div key={unit.key} className="gt-hero-countdown-item">
                                        <span className="gt-hero-countdown-value">{formatHeroCountdownValue(unit.key, heroCountdown[unit.key])}</span>
                                        <span className="gt-hero-countdown-unit">{unit.label}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="gt-hero-countdown-label">
                                <Calendar size={16} />
                                นับถอยหลังสู่วันที่ {HERO_COUNTDOWN_TARGET_LABEL}
                            </p>
                            {heroCountdown.expired ? <p className="gt-hero-countdown-status">ถึงวันสุดท้ายของกิจกรรมแล้ว</p> : null}
                        </div>
                        <div className="gt-hero-actions">
                            <button type="button" className="gt-btn gt-btn-primary" onClick={handlePrimaryCta}>
                                {user ? 'ไปยังทีมของฉัน' : config.locale.ctaPrimary} <ArrowRight size={18} />
                            </button>
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
                            {STATIC_PRIZES.map((reward) => {
                                const isChampion = reward.rank === '1';
                                const cardClass = isChampion ? 'champion' : 'runner-up';
                                const iconSize = isChampion ? 48 : 32;

                                return (
                                    <div key={reward.id} className={`gt-prize-card ${cardClass}`} data-rank={String(reward.rank || '')}>
                                        <div className="prize-icon"><Trophy size={iconSize} /></div>
                                        <h3>{reward.title}</h3>
                                        {isChampion ? (
                                            <>
                                                <div className="prize-trophy-line">{reward.trophyLine}</div>
                                                <div className="prize-amount-note">{reward.amountLine}</div>
                                            </>
                                        ) : (
                                            <div className="prize-amount">{reward.amountLine}</div>
                                        )}
                                    </div>
                                );
                            })}
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
                                <h3>เวทีเกียรติยศระดับประเทศ ชิงถ้วยพระราชทาน</h3>
                                <p>ก้าวสู่เวที Hackathon ที่ทรงคุณค่า พิสูจน์ความสามารถในการพัฒนาโซลูชัน AI และ Big Data ที่แก้ปัญหาสุขภาพและยกระดับคุณภาพชีวิตของคนในสังคมได้จริง พร้อมรับความภาคภูมิใจสูงสุดจากรางวัลถ้วยพระราชทาน</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-pink"><Users color="#fff" size={24} /></div>
                                <h3>ลงมือทำจริง แก้ปัญหาจาก "ข้อมูลจริง" (Real Data, Real Impact)</h3>
                                <p>เปลี่ยนไอเดียให้เป็นนวัตกรรมต้นแบบที่จับต้องได้! คุณจะได้ท้าทายฝีมือด้วย Dataset สำหรับการแข่งขันจากเจ้าของข้อมูลโดยตรงทั้ง 3 Track พร้อมรับฟังและวิเคราะห์ Pain Points เชิงลึกจากผู้เชี่ยวชาญถึง 3 สาย เพื่อออกแบบโซลูชันที่สามารถนำไปใช้และวัดผลกระทบได้จริง</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-blue"><Rocket color="#fff" size={24} /></div>
                                <h3>สานพลังข้ามศาสตร์ (Cross-disciplinary Synergy)</h3>
                                <p>เปิดรับประสบการณ์ใหม่ในการสร้างทีมแบบผสมผสาน (5 คน/ทีม) ทลายกรอบการทำงานแบบเดิมๆ ด้วยการรวมคนเก่งจากหลากสายวิชาชีพ ไม่ว่าจะเป็น สาย Tech (คอมพิวเตอร์, Data) สาย Health (แพทย์, พยาบาล, สาธารณสุข) และ คนในพื้นที่ (การบริหารกิจการสาธารณะ) เพื่อสร้างสรรค์มุมมองที่รอบด้าน</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-orange"><Trophy color="#fff" size={24} /></div>
                                <h3>อัปสกิลขั้นสุดแบบ Fast-Track (Exclusive Training &amp; Mentoring)</h3>
                                <p>หากคุณคือ 1 ใน 14 ทีมสุดยอด ที่ผ่านเข้าสู่รอบ Hackathon คุณจะได้รับการอบรมเข้มข้นตั้งแต่ Data Science, Big Learning ไปจนถึง Deep Tech จากวิทยากรผู้เชี่ยวชาญ พร้อมมีทีม Mentor ระดับท็อปคอยประกบในรอบ Walk-in Session เพื่อให้คำปรึกษาและ Feedback อย่างใกล้ชิดทั้งด้าน Technical, Domain และ Business ตลอดการแข่งขัน</p>
                            </div>
                            <div className="gt-bento-card gt-reveal">
                                <div className="gt-bento-icon gt-icon-teal"><Target color="#fff" size={24} /></div>
                                <h3>ร่วมขับเคลื่อน Intelligent Life Ecosystem</h3>
                                <p>โอกาสในการเป็นส่วนหนึ่งของผู้สร้างระบบนิเวศอัจฉริยะ นำขุมพลังแห่งปัญญาประดิษฐ์ (AI) มายกระดับการใช้ชีวิตให้สมาร์ท สุขภาพดี และยั่งยืนสำหรับทุกคน</p>
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
                            {competitionSteps.map((step) => {
                                const stepIndex = Number(step.number);
                                const isActive =
                                    processHighlightPhase === 'early'
                                        ? stepIndex <= 3
                                        : processHighlightPhase === 'review'
                                            ? stepIndex === 4
                                            : stepIndex === 5;
                                const isDim =
                                    processHighlightPhase === 'review'
                                        ? stepIndex <= 3
                                        : processHighlightPhase === 'final'
                                            ? stepIndex <= 4
                                            : false;
                                const stepStateClass = isActive ? 'is-active' : isDim ? 'is-dim' : 'is-normal';

                                return (
                                    <div key={step.number} className={`gt-step ${stepStateClass}`}>
                                        <div className={`gt-step-date${step.date ? '' : ' is-empty'}`} aria-hidden={!step.date}>{step.date || '\u00A0'}</div>
                                        <div className="step-num">{step.number}</div>
                                        <div className="gt-step-body">
                                            <h3>{step.title}</h3>
                                            <ul className="gt-step-list">
                                                {step.items.map((item, itemIndex) => (
                                                    <li key={`${step.number}-${itemIndex}`}>{emphasizeThaiDateInText(item)}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Eligibility */}
                    <section id="eligibility" className="gt-section gt-container">
                        <div className="gt-section-header gt-reveal">
                            <h2>คุณสมบัติผู้สมัคร</h2>
                            <p>ตรวจสอบคุณสมบัติเบื้องต้นก่อนสมัครเข้าร่วมการแข่งขัน</p>
                        </div>

                        <div className="gt-eligibility-wrap gt-reveal">
                            <ul className="gt-eligibility-list" aria-label="คุณสมบัติผู้สมัคร">
                                <li className="gt-eligibility-item">
                                    <span className="gt-eligibility-item-index">01</span>
                                    <span className="gt-eligibility-item-icon"><Users size={18} /></span>
                                    <div className="gt-eligibility-item-body">
                                        <h4>ขนาดทีม</h4>
                                        <p>สมาชิกในทีม<strong>จำนวน 5 คน</strong></p>
                                    </div>
                                </li>
                                <li className="gt-eligibility-item">
                                    <span className="gt-eligibility-item-index">02</span>
                                    <span className="gt-eligibility-item-icon"><Target size={18} /></span>
                                    <div className="gt-eligibility-item-body">
                                        <h4>การรวมทีม</h4>
                                        <p>สามารถรวมกลุ่มกันกับต่างโรงเรียน หรือต่างมหาวิทยาลัยได้</p>
                                    </div>
                                </li>
                                <li className="gt-eligibility-item">
                                    <span className="gt-eligibility-item-index">03</span>
                                    <span className="gt-eligibility-item-icon"><Activity size={18} /></span>
                                    <div className="gt-eligibility-item-body">
                                        <h4>สถานะผู้สมัคร</h4>
                                        <p>สมาชิกในทีมต้องเป็นนักเรียนระดับมัธยมศึกษา หรือนักศึกษาระดับอุดมศึกษาจากสถาบันการศึกษาในประเทศไทย</p>
                                    </div>
                                </li>
                                <li className="gt-eligibility-item">
                                    <span className="gt-eligibility-item-index">04</span>
                                    <span className="gt-eligibility-item-icon"><Sparkles size={18} /></span>
                                    <div className="gt-eligibility-item-body">
                                        <h4>ความพร้อมของทีม</h4>
                                        <p>มีความพร้อมในการสร้างสรรค์ไอเดียและนวัตกรรม</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Benefits */}
                    <section id="benefits" className="gt-section gt-container">
                        <div className="gt-section-header gt-reveal">
                            <h2>สิทธิประโยชน์ของผู้เข้าร่วมแข่งขัน (สำหรับ 14 ทีมที่ผ่านการคัดเลือก)</h2>
                            <p>ครอบคลุมทั้งที่พัก การเดินทาง และการสนับสนุนระหว่างการแข่งขัน</p>
                        </div>

                        <div className="gt-benefits-wrap gt-reveal">
                            <div className="gt-benefits-grid" aria-label="สิทธิประโยชน์ของผู้เข้าร่วมแข่งขัน">
                                <article className="gt-benefit-card">
                                    <div className="gt-benefit-card-head">
                                        <span className="gt-benefit-index">01</span>
                                        <span className="gt-benefit-icon"><BedDouble size={18} /></span>
                                    </div>
                                    <h3>ที่พัก</h3>
                                    <p>จำนวน 3 คืน (ห้องคู่)</p>
                                </article>

                                <article className="gt-benefit-card">
                                    <div className="gt-benefit-card-head">
                                        <span className="gt-benefit-index">02</span>
                                        <span className="gt-benefit-icon"><Car size={18} /></span>
                                    </div>
                                    <h3>ค่าเดินทาง</h3>
                                    <p>เหมาจ่ายทีมละไม่เกิน 5,000 บาท</p>
                                </article>

                                <article className="gt-benefit-card">
                                    <div className="gt-benefit-card-head">
                                        <span className="gt-benefit-index">03</span>
                                        <span className="gt-benefit-icon"><UtensilsCrossed size={18} /></span>
                                    </div>
                                    <h3>อาหารและเครื่องดื่ม</h3>
                                    <p>จัดเตรียมให้ตลอดการเข้าร่วมกิจกรรม</p>
                                </article>

                                <article className="gt-benefit-card">
                                    <div className="gt-benefit-card-head">
                                        <span className="gt-benefit-index">04</span>
                                        <span className="gt-benefit-icon"><Gift size={18} /></span>
                                    </div>
                                    <h3>ของที่ระลึก</h3>
                                    <p>สำหรับผู้เข้าร่วมแข่งขันที่ผ่านการคัดเลือก</p>
                                </article>

                                <article className="gt-benefit-card gt-benefit-card-featured">
                                    <div className="gt-benefit-card-head">
                                        <span className="gt-benefit-index">05</span>
                                        <span className="gt-benefit-icon"><Trophy size={18} /></span>
                                    </div>
                                    <h3>ชิงถ้วยพระราชทาน กรมสมเด็จพระเทพฯ พร้อมเงินรางวัล</h3>
                                    <p>เวทีสำคัญระดับประเทศ เพื่อสร้างผลงานที่สร้างผลกระทบจริง</p>
                                </article>
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
                            ) : schedulesData.length > 0 ? (
                                schedulesData.map((schedule, scheduleIdx) => {
                                    const scheduleTitleRaw = schedule?.schedule_name_th || schedule?.schedule_name_en;
                                    const scheduleTitle = typeof scheduleTitleRaw === 'string' && scheduleTitleRaw.trim()
                                        ? scheduleTitleRaw.trim()
                                        : `กำหนดการชุดที่ ${scheduleIdx + 1}`;
                                    const tableType = getScheduleTableType(schedule);
                                    const scheduleDays = Array.isArray(schedule?.days) ? schedule.days : [];
                                    const monthGroups = groupScheduleDaysByMonth(scheduleDays);

                                    return (
                                        <div key={schedule.schedule_id ?? `schedule-${scheduleIdx}`} className="gt-schedule-group">
                                            <div className="gt-schedule-group-title">
                                                <h3>{scheduleTitle}</h3>
                                            </div>

                                            {monthGroups.length > 0 ? (
                                                <div className="gt-schedule-table-wrap gt-reveal active">
                                                    <table className={`gt-schedule-table ${tableType === 'milestone' ? 'is-milestone' : 'is-onsite'}`}>
                                                        <colgroup>
                                                            <col className="gt-schedule-col-first" />
                                                            <col />
                                                        </colgroup>
                                                        <tbody>
                                                            {tableType === 'milestone' ? (
                                                                monthGroups.flatMap((monthGroup, monthIdx) => {
                                                                    const rows = [
                                                                        <tr key={`month-${scheduleIdx}-${monthGroup.key}-${monthIdx}`} className="gt-schedule-table-month-row">
                                                                            <th colSpan={2}>{monthGroup.label}</th>
                                                                        </tr>,
                                                                    ];

                                                                    monthGroup.days.forEach((day, dayIdx) => {
                                                                        const dayItems = Array.isArray(day?.items) ? day.items : [];
                                                                        const fallbackDateLabel = formatScheduleDateCell(day.day_date);

                                                                        if (dayItems.length === 0) {
                                                                            rows.push(
                                                                                <tr key={`milestone-empty-${scheduleIdx}-${monthGroup.key}-${day.day_id ?? dayIdx}`}>
                                                                                    <th className="gt-schedule-date-col">{fallbackDateLabel}</th>
                                                                                    <td className="gt-schedule-detail-cell">ไม่มีกิจกรรมในวันนี้</td>
                                                                                </tr>
                                                                            );
                                                                            return;
                                                                        }

                                                                        dayItems.forEach((item, itemIdx) => {
                                                                            const dateLabel = item?.display_date_label_th?.trim() || fallbackDateLabel;
                                                                            rows.push(
                                                                                <tr key={`milestone-row-${item.item_id ?? `${scheduleIdx}-${monthGroup.key}-${dayIdx}-${itemIdx}`}`}>
                                                                                    <th className="gt-schedule-date-col">{dateLabel}</th>
                                                                                    <td className="gt-schedule-detail-cell">{getScheduleItemName(item)}</td>
                                                                                </tr>
                                                                            );
                                                                        });
                                                                    });

                                                                    return rows;
                                                                })
                                                            ) : (
                                                                scheduleDays.flatMap((day, dayIdx) => {
                                                                    const dayItems = Array.isArray(day?.items) ? day.items : [];
                                                                    const dayTitle = day.day_name_th || day.day_name_en || 'วันกิจกรรม';
                                                                    const dayHeader = day.day_name_th
                                                                        ? day.day_name_th
                                                                        : `${dayTitle} (${formatScheduleDateLabel(day.day_date)})`;

                                                                    const rows = [
                                                                        <tr key={`onsite-day-${scheduleIdx}-${day.day_id ?? dayIdx}`} className="gt-schedule-table-day-row">
                                                                            <th colSpan={2}>{dayHeader}</th>
                                                                        </tr>,
                                                                        <tr key={`onsite-head-${scheduleIdx}-${day.day_id ?? dayIdx}`} className="gt-schedule-table-head-row">
                                                                            <th className="gt-schedule-time-col">เวลา</th>
                                                                            <th>หัวข้อ/กิจกรรม</th>
                                                                        </tr>,
                                                                    ];

                                                                    if (dayItems.length === 0) {
                                                                        rows.push(
                                                                            <tr key={`onsite-empty-${scheduleIdx}-${day.day_id ?? dayIdx}`}>
                                                                                <td className="gt-schedule-time-col">-</td>
                                                                                <td className="gt-schedule-detail-cell">ไม่มีกิจกรรมในวันนี้</td>
                                                                            </tr>
                                                                        );
                                                                        return rows;
                                                                    }

                                                                    dayItems.forEach((item, itemIdx) => {
                                                                        const timeLabel = item?.display_time_label_th?.trim() || formatScheduleTime(item.start_time, item.end_time);
                                                                        rows.push(
                                                                            <tr key={`onsite-item-${item.item_id ?? `${scheduleIdx}-${dayIdx}-${itemIdx}`}`}>
                                                                                <td className="gt-schedule-time-col">{timeLabel}</td>
                                                                                <td className="gt-schedule-detail-cell">{getScheduleItemName(item)}</td>
                                                                            </tr>
                                                                        );
                                                                    });

                                                                    return rows;
                                                                })
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="gt-schedule-empty-scope">ยังไม่มีรายการกำหนดการในหมวดนี้</div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gt-text-muted)' }}>
                                    ไม่มีกำหนดการ
                                </div>
                            )}
                        </div>
                        <p className="gt-schedule-note">
                            <span className="gt-schedule-note-label">หมายเหตุ :</span>
                            <span className="gt-schedule-note-line">- รับประทานอาหารว่างและเครื่องดื่ม ระหว่างการดำเนินกิจกรรม</span>
                            <span className="gt-schedule-note-line gt-schedule-note-alert">- กำหนดการอาจมีการเปลี่ยนแปลงได้ตามความเหมาะสม</span>
                        </p>
                    </section>

                    {/* Register CTA */}
                    {!user && (
                        <section id="register" className="gt-section gt-container" style={{ textAlign: 'center', paddingBottom: 40 }}>
                            <div className="gt-reveal">
                                <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 16 }}>พร้อมเข้าร่วมแล้วหรือยัง?</h2>
                                <Link to="/login" className="gt-btn gt-btn-primary" style={{ fontSize: '1.05rem', padding: '15px 36px' }}>
                                    ลงทะเบียนเลย <ArrowRight size={20} />
                                </Link>
                            </div>
                        </section>
                    )}

                    {/* Sponsors Marquee — Moved to bottom */}
                    <div className="gt-sponsors-wrapper">
                        <div className="gt-container" style={{ textAlign: 'center', marginBottom: 24, color: 'var(--gt-text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                            ภาคีเครือข่ายหลักอย่างเป็นทางการ
                        </div>
                        <div className="gt-marquee">
                            {(!sponsorsLoading ? [...sponsors, ...sponsors] : []).map((item, i) => (
                                <img
                                    key={`${item.id}-${i}`}
                                    src={apiUrl(item.logoUrl)}
                                    alt={item.nameEn || item.nameTh || `Partner ${i + 1}`}
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
                                        <Home size={20} /> BDI Hackathon 2026: Intelligent Living
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
                                        <Link to="/home/partner">ภาคีเครือข่าย</Link>
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
