import { apiUrl } from './api';

export const SYSTEM_WINDOW_STATUS = {
    NOT_OPEN: 'not_open',
    OPEN: 'open',
    CLOSED: 'closed',
    UNKNOWN: 'unknown',
};

export const SYSTEM_WINDOW_CONFIG_KEYS = {
    REGISTRATION_OPEN_AT: 'REGISTRATION_OPEN_AT',
    REGISTRATION_CLOSE_AT: 'REGISTRATION_CLOSE_AT',
    TEAM_RECRUITMENT_OPEN_AT: 'TEAM_RECRUITMENT_OPEN_AT',
    TEAM_RECRUITMENT_CLOSE_AT: 'TEAM_RECRUITMENT_CLOSE_AT',
};

function parseConfigDateToMs(rawValue) {
    const raw = String(rawValue || '').trim();
    if (!raw) return null;

    const hasExplicitTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
    const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
    const withTimezone = hasExplicitTimezone ? normalized : `${normalized}+07:00`;
    const ms = new Date(withTimezone).getTime();
    return Number.isFinite(ms) ? ms : null;
}

function evaluateWindowStatus(openAtMs, closeAtMs, nowMs = Date.now()) {
    if (!Number.isFinite(openAtMs) || !Number.isFinite(closeAtMs)) {
        return SYSTEM_WINDOW_STATUS.UNKNOWN;
    }
    if (nowMs < openAtMs) return SYSTEM_WINDOW_STATUS.NOT_OPEN;
    if (nowMs > closeAtMs) return SYSTEM_WINDOW_STATUS.CLOSED;
    return SYSTEM_WINDOW_STATUS.OPEN;
}

export async function fetchSysConfigValue(configKey) {
    const res = await fetch(apiUrl(`/api/sys-config/${configKey}`), {
        credentials: 'include',
    });
    const payload = await res.json();
    if (!res.ok || !payload?.ok) {
        throw new Error(payload?.message || `โหลด config ไม่สำเร็จ: ${configKey}`);
    }
    return payload?.data?.configValue;
}

async function fetchWindow(openConfigKey, closeConfigKey) {
    const [openAtRaw, closeAtRaw] = await Promise.all([
        fetchSysConfigValue(openConfigKey),
        fetchSysConfigValue(closeConfigKey),
    ]);

    const openAtMs = parseConfigDateToMs(openAtRaw);
    const closeAtMs = parseConfigDateToMs(closeAtRaw);
    const status = evaluateWindowStatus(openAtMs, closeAtMs);

    return {
        status,
        openAtRaw,
        closeAtRaw,
        openAtMs,
        closeAtMs,
    };
}

export async function fetchRegistrationWindowStatus() {
    return fetchWindow(
        SYSTEM_WINDOW_CONFIG_KEYS.REGISTRATION_OPEN_AT,
        SYSTEM_WINDOW_CONFIG_KEYS.REGISTRATION_CLOSE_AT,
    );
}

export async function fetchTeamRecruitmentWindowStatus() {
    return fetchWindow(
        SYSTEM_WINDOW_CONFIG_KEYS.TEAM_RECRUITMENT_OPEN_AT,
        SYSTEM_WINDOW_CONFIG_KEYS.TEAM_RECRUITMENT_CLOSE_AT,
    );
}

export function formatThaiDate(ms) {
    if (!Number.isFinite(ms)) return '-';
    return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Bangkok',
    }).format(new Date(ms));
}
