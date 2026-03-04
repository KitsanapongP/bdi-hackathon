import type { DB } from '../../config/db.js';
import * as repo from './events.repo.js';
import { BadRequestError, NotFoundError } from '../../shared/errors.js';

type ScheduleAudience = 'public' | 'all_users' | 'approved_teams' | 'specific_teams';

function normalizeTimeValue(value: string): string {
    const raw = (value || '').trim();
    const matched = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!matched) {
        throw new BadRequestError('รูปแบบเวลาไม่ถูกต้อง (คาดหวัง HH:mm หรือ HH:mm:ss)');
    }

    const [, hh, mm, ss = '00'] = matched;
    const hour = Number(hh);
    const minute = Number(mm);
    const second = Number(ss);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        throw new BadRequestError('ช่วงเวลาไม่ถูกต้อง');
    }

    return `${hh}:${mm}:${ss}`;
}

function compareTime(left: string, right: string): number {
    if (left === right) return 0;
    return left < right ? -1 : 1;
}

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const normalized = value.trim();
    return normalized || null;
}

function toAdminScheduleItemResponse(row: {
    item_id: number;
    schedule_id: number;
    day_id: number;
    track_id: number | null;
    start_time: string;
    end_time: string;
    title_th: string;
    title_en: string;
    description_th: string | null;
    description_en: string | null;
    location_th: string | null;
    location_en: string | null;
    speaker_th: string | null;
    speaker_en: string | null;
    audience: ScheduleAudience;
    is_highlight: number;
    sort_order: number;
    is_enabled: number;
}) {
    return {
        id: row.item_id,
        scheduleId: row.schedule_id,
        dayId: row.day_id,
        trackId: row.track_id,
        startTime: row.start_time,
        endTime: row.end_time,
        titleTh: row.title_th,
        titleEn: row.title_en,
        descriptionTh: row.description_th,
        descriptionEn: row.description_en,
        locationTh: row.location_th,
        locationEn: row.location_en,
        speakerTh: row.speaker_th,
        speakerEn: row.speaker_en,
        audience: row.audience,
        isHighlight: row.is_highlight === 1,
        sortOrder: row.sort_order,
        isEnabled: row.is_enabled === 1,
    };
}

export async function getFullSchedule(db: DB) {
    // Assuming we just get the first published schedule for now
    const schedules = await repo.getPublishedSchedules(db);
    const [schedule] = schedules;
    if (!schedule) return null;

    const days = await repo.getScheduleDays(db, schedule.schedule_id);
    const tracks = await repo.getScheduleTracks(db, schedule.schedule_id);
    const items = await repo.getScheduleItems(db, schedule.schedule_id);

    return {
        ...schedule,
        days: days.map(day => ({
            ...day,
            items: items.filter(item => item.day_id === day.day_id)
        })),
        tracks
    };
}

export async function getScheduleAdminBundle(db: DB) {
    const [schedules, days, tracks, items] = await Promise.all([
        repo.getAllSchedulesAdmin(db),
        repo.getAllScheduleDaysAdmin(db),
        repo.getAllScheduleTracksAdmin(db),
        repo.getAllScheduleItemsAdmin(db),
    ]);

    return {
        schedules: schedules.map((item) => ({
            id: item.schedule_id,
            code: item.schedule_code,
            nameTh: item.schedule_name_th,
            nameEn: item.schedule_name_en,
            timezone: item.timezone,
            isPublished: item.is_published === 1,
        })),
        days: days.map((item) => ({
            id: item.day_id,
            scheduleId: item.schedule_id,
            dayDate: item.day_date,
            dayNameTh: item.day_name_th,
            dayNameEn: item.day_name_en,
            sortOrder: item.sort_order,
            isEnabled: item.is_enabled === 1,
        })),
        tracks: tracks.map((item) => ({
            id: item.track_id,
            scheduleId: item.schedule_id,
            trackCode: item.track_code,
            trackNameTh: item.track_name_th,
            trackNameEn: item.track_name_en,
            sortOrder: item.sort_order,
            isEnabled: item.is_enabled === 1,
        })),
        items: items.map(toAdminScheduleItemResponse),
    };
}

export async function createScheduleItemAdmin(
    db: DB,
    input: {
        dayId: number;
        trackId?: number | null | undefined;
        startTime: string;
        endTime: string;
        titleTh: string;
        titleEn: string;
        descriptionTh?: string | null | undefined;
        descriptionEn?: string | null | undefined;
        locationTh?: string | null | undefined;
        locationEn?: string | null | undefined;
        speakerTh?: string | null | undefined;
        speakerEn?: string | null | undefined;
        audience?: ScheduleAudience | undefined;
        isHighlight?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    }
) {
    const day = await repo.getScheduleDayByIdAdmin(db, input.dayId);
    if (!day) {
        throw new NotFoundError('ไม่พบวันกำหนดการที่เลือก');
    }

    const trackId = input.trackId ?? null;
    if (trackId !== null) {
        const track = await repo.getScheduleTrackByIdAdmin(db, trackId);
        if (!track) {
            throw new NotFoundError('ไม่พบ track ที่เลือก');
        }
        if (track.schedule_id !== day.schedule_id) {
            throw new BadRequestError('track ต้องอยู่ใน schedule เดียวกับ day');
        }
    }

    const startTime = normalizeTimeValue(input.startTime);
    const endTime = normalizeTimeValue(input.endTime);
    if (compareTime(startTime, endTime) >= 0) {
        throw new BadRequestError('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
    }

    const itemId = await repo.createScheduleItemAdmin(db, {
        scheduleId: day.schedule_id,
        dayId: day.day_id,
        trackId,
        startTime,
        endTime,
        titleTh: input.titleTh.trim(),
        titleEn: input.titleEn.trim(),
        descriptionTh: normalizeOptionalText(input.descriptionTh) ?? null,
        descriptionEn: normalizeOptionalText(input.descriptionEn) ?? null,
        locationTh: normalizeOptionalText(input.locationTh) ?? null,
        locationEn: normalizeOptionalText(input.locationEn) ?? null,
        speakerTh: normalizeOptionalText(input.speakerTh) ?? null,
        speakerEn: normalizeOptionalText(input.speakerEn) ?? null,
        audience: input.audience ?? 'public',
        isHighlight: Boolean(input.isHighlight),
        sortOrder: Number.isFinite(Number(input.sortOrder)) ? Math.trunc(Number(input.sortOrder)) : 0,
        isEnabled: input.isEnabled ?? true,
    });

    const created = await repo.getScheduleItemByIdAdmin(db, itemId);
    if (!created) {
        throw new NotFoundError('ไม่พบข้อมูลกำหนดการที่เพิ่งสร้าง');
    }
    return toAdminScheduleItemResponse(created);
}

export async function updateScheduleItemAdmin(
    db: DB,
    itemId: number,
    input: {
        dayId?: number | undefined;
        trackId?: number | null | undefined;
        startTime?: string | undefined;
        endTime?: string | undefined;
        titleTh?: string | undefined;
        titleEn?: string | undefined;
        descriptionTh?: string | null | undefined;
        descriptionEn?: string | null | undefined;
        locationTh?: string | null | undefined;
        locationEn?: string | null | undefined;
        speakerTh?: string | null | undefined;
        speakerEn?: string | null | undefined;
        audience?: ScheduleAudience | undefined;
        isHighlight?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    }
) {
    const existing = await repo.getScheduleItemByIdAdmin(db, itemId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลกำหนดการนี้');
    }

    const nextDay = input.dayId !== undefined
        ? await repo.getScheduleDayByIdAdmin(db, input.dayId)
        : await repo.getScheduleDayByIdAdmin(db, existing.day_id);
    if (!nextDay) {
        throw new NotFoundError('ไม่พบวันกำหนดการที่เลือก');
    }

    const resolvedTrackId = input.trackId === undefined ? existing.track_id : input.trackId;
    if (resolvedTrackId !== null) {
        const track = await repo.getScheduleTrackByIdAdmin(db, resolvedTrackId);
        if (!track) {
            throw new NotFoundError('ไม่พบ track ที่เลือก');
        }
        if (track.schedule_id !== nextDay.schedule_id) {
            throw new BadRequestError('track ต้องอยู่ใน schedule เดียวกับ day');
        }
    }

    const startTime = input.startTime !== undefined ? normalizeTimeValue(input.startTime) : existing.start_time;
    const endTime = input.endTime !== undefined ? normalizeTimeValue(input.endTime) : existing.end_time;
    if (compareTime(startTime, endTime) >= 0) {
        throw new BadRequestError('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
    }

    await repo.updateScheduleItemAdmin(db, itemId, {
        scheduleId: nextDay.schedule_id,
        dayId: nextDay.day_id,
        trackId: resolvedTrackId,
        startTime: input.startTime !== undefined ? startTime : undefined,
        endTime: input.endTime !== undefined ? endTime : undefined,
        titleTh: input.titleTh !== undefined ? input.titleTh.trim() : undefined,
        titleEn: input.titleEn !== undefined ? input.titleEn.trim() : undefined,
        descriptionTh: normalizeOptionalText(input.descriptionTh),
        descriptionEn: normalizeOptionalText(input.descriptionEn),
        locationTh: normalizeOptionalText(input.locationTh),
        locationEn: normalizeOptionalText(input.locationEn),
        speakerTh: normalizeOptionalText(input.speakerTh),
        speakerEn: normalizeOptionalText(input.speakerEn),
        audience: input.audience,
        isHighlight: input.isHighlight,
        sortOrder: input.sortOrder !== undefined ? Math.trunc(Number(input.sortOrder)) : undefined,
        isEnabled: input.isEnabled,
    });

    const updated = await repo.getScheduleItemByIdAdmin(db, itemId);
    if (!updated) {
        throw new NotFoundError('ไม่พบข้อมูลกำหนดการหลังการอัปเดต');
    }
    return toAdminScheduleItemResponse(updated);
}

export async function deleteScheduleItemAdmin(db: DB, itemId: number): Promise<void> {
    const existing = await repo.getScheduleItemByIdAdmin(db, itemId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลกำหนดการนี้');
    }
    await repo.deleteScheduleItemAdmin(db, itemId);
}
