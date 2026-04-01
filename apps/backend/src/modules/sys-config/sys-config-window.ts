import type { DB } from '../../config/db.js';
import { AppError } from '../../shared/errors.js';
import { findByKey } from './sys-config.repo.js';

export const REGISTRATION_OPEN_AT_KEY = 'REGISTRATION_OPEN_AT';
export const REGISTRATION_CLOSE_AT_KEY = 'REGISTRATION_CLOSE_AT';
export const TEAM_RECRUITMENT_OPEN_AT_KEY = 'TEAM_RECRUITMENT_OPEN_AT';
export const TEAM_RECRUITMENT_CLOSE_AT_KEY = 'TEAM_RECRUITMENT_CLOSE_AT';
export const TEAM_SELECTION_SUBMISSION_OPEN_AT_KEY = 'TEAM_SELECTION_SUBMISSION_OPEN_AT';
export const TEAM_SELECTION_SUBMISSION_CLOSE_AT_KEY = 'TEAM_SELECTION_SUBMISSION_CLOSE_AT';
export const GLOBAL_SELECTION_CONFIRM_OPEN_AT_KEY = 'GLOBAL_SELECTION_CONFIRM_OPEN_AT';
export const GLOBAL_SELECTION_CONFIRM_CLOSE_AT_KEY = 'GLOBAL_SELECTION_CONFIRM_CLOSE_AT';
export const TEAM_MEMBER_MAX_KEY = 'TEAM_MEMBER_MAX';
export const TEAM_MEMBER_MIN_KEY = 'TEAM_MEMBER_MIN';

export type WindowStatus = 'not_open' | 'open' | 'closed';

export interface ConfigWindow {
    openAtRaw: string;
    closeAtRaw: string;
    openAtMs: number;
    closeAtMs: number;
}

function parseBangkokDateTimeToMs(rawValue: string, keyName: string): number {
    const raw = String(rawValue || '').trim();
    if (!raw) {
        throw new AppError(`ค่า config ${keyName} ว่างอยู่`, 500);
    }

    const hasExplicitTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
    const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
    const withTimezone = hasExplicitTimezone ? normalized : `${normalized}+07:00`;
    const ms = new Date(withTimezone).getTime();
    if (!Number.isFinite(ms)) {
        throw new AppError(`รูปแบบวันเวลาของ config ${keyName} ไม่ถูกต้อง`, 500);
    }
    return ms;
}

async function readRequiredConfigValue(db: DB, key: string): Promise<string> {
    const row = await findByKey(db, key);
    if (!row) {
        throw new AppError(`ไม่พบ config key: ${key}`, 500);
    }
    return row.config_value;
}

async function readWindowByKeys(db: DB, openKey: string, closeKey: string): Promise<ConfigWindow> {
    const [openAtRaw, closeAtRaw] = await Promise.all([
        readRequiredConfigValue(db, openKey),
        readRequiredConfigValue(db, closeKey),
    ]);

    const openAtMs = parseBangkokDateTimeToMs(openAtRaw, openKey);
    const closeAtMs = parseBangkokDateTimeToMs(closeAtRaw, closeKey);
    if (closeAtMs < openAtMs) {
        throw new AppError(`ช่วงเวลา config ไม่ถูกต้อง: ${openKey} มากกว่า ${closeKey}`, 500);
    }

    return {
        openAtRaw,
        closeAtRaw,
        openAtMs,
        closeAtMs,
    };
}

export async function getRegistrationWindow(db: DB): Promise<ConfigWindow> {
    return readWindowByKeys(db, REGISTRATION_OPEN_AT_KEY, REGISTRATION_CLOSE_AT_KEY);
}

export async function getTeamRecruitmentWindow(db: DB): Promise<ConfigWindow> {
    return readWindowByKeys(db, TEAM_RECRUITMENT_OPEN_AT_KEY, TEAM_RECRUITMENT_CLOSE_AT_KEY);
}

export async function getTeamSelectionSubmissionWindow(db: DB): Promise<ConfigWindow> {
    return readWindowByKeys(db, TEAM_SELECTION_SUBMISSION_OPEN_AT_KEY, TEAM_SELECTION_SUBMISSION_CLOSE_AT_KEY);
}

export async function getGlobalSelectionConfirmWindow(db: DB): Promise<ConfigWindow> {
    return readWindowByKeys(db, GLOBAL_SELECTION_CONFIRM_OPEN_AT_KEY, GLOBAL_SELECTION_CONFIRM_CLOSE_AT_KEY);
}

export function evaluateWindowStatus(windowConfig: ConfigWindow, nowMs: number = Date.now()): WindowStatus {
    if (nowMs < windowConfig.openAtMs) return 'not_open';
    if (nowMs > windowConfig.closeAtMs) return 'closed';
    return 'open';
}

export function formatThaiDate(ms: number): string {
    return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Bangkok',
    }).format(new Date(ms));
}

export async function getRequiredPositiveIntConfig(db: DB, key: string): Promise<number> {
    const rawValue = await readRequiredConfigValue(db, key);
    const parsed = Number.parseInt(String(rawValue || '').trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new AppError(`ค่า config ${key} ต้องเป็นจำนวนเต็มบวก`, 500);
    }
    return parsed;
}

export async function getTeamMemberMax(db: DB): Promise<number> {
    return getRequiredPositiveIntConfig(db, TEAM_MEMBER_MAX_KEY);
}

export async function getTeamMemberMin(db: DB): Promise<number> {
    return getRequiredPositiveIntConfig(db, TEAM_MEMBER_MIN_KEY);
}
