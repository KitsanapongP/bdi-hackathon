import type { DB } from '../../config/db.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { EventScheduleItemRow, EventScheduleDayRow, EventScheduleTrackRow, EventScheduleRow } from './events.types.js';

export async function getPublishedSchedules(db: DB): Promise<EventScheduleRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedules WHERE is_published = 1 ORDER BY created_at ASC`
    );
    return rows as EventScheduleRow[];
}

export async function getScheduleDays(db: DB, scheduleId: number): Promise<EventScheduleDayRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedule_days WHERE schedule_id = :scheduleId AND is_enabled = 1 ORDER BY day_date ASC, sort_order ASC`,
        { scheduleId }
    );
    return rows as EventScheduleDayRow[];
}

export async function getScheduleTracks(db: DB, scheduleId: number): Promise<EventScheduleTrackRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedule_tracks WHERE schedule_id = :scheduleId AND is_enabled = 1 ORDER BY sort_order ASC`,
        { scheduleId }
    );
    return rows as EventScheduleTrackRow[];
}

export async function getScheduleItems(db: DB, scheduleId: number): Promise<EventScheduleItemRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedule_items WHERE schedule_id = :scheduleId AND is_enabled = 1 ORDER BY start_time ASC, sort_order ASC`,
        { scheduleId }
    );
    return rows as EventScheduleItemRow[];
}

export async function getAllSchedulesAdmin(db: DB): Promise<EventScheduleRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedules ORDER BY is_published DESC, schedule_id ASC`
    );
    return rows as EventScheduleRow[];
}

export async function getAllScheduleDaysAdmin(db: DB): Promise<EventScheduleDayRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedule_days ORDER BY day_date ASC, sort_order ASC, day_id ASC`
    );
    return rows as EventScheduleDayRow[];
}

export async function getAllScheduleTracksAdmin(db: DB): Promise<EventScheduleTrackRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedule_tracks ORDER BY sort_order ASC, track_id ASC`
    );
    return rows as EventScheduleTrackRow[];
}

export async function getAllScheduleItemsAdmin(db: DB): Promise<EventScheduleItemRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedule_items ORDER BY day_id ASC, start_time ASC, sort_order ASC, item_id ASC`
    );
    return rows as EventScheduleItemRow[];
}

export async function getScheduleDayByIdAdmin(db: DB, dayId: number): Promise<EventScheduleDayRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedule_days WHERE day_id = :dayId LIMIT 1`,
        { dayId }
    );
    return (rows[0] as EventScheduleDayRow | undefined) ?? null;
}

export async function getScheduleTrackByIdAdmin(db: DB, trackId: number): Promise<EventScheduleTrackRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedule_tracks WHERE track_id = :trackId LIMIT 1`,
        { trackId }
    );
    return (rows[0] as EventScheduleTrackRow | undefined) ?? null;
}

export async function getScheduleItemByIdAdmin(db: DB, itemId: number): Promise<EventScheduleItemRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM event_schedule_items WHERE item_id = :itemId LIMIT 1`,
        { itemId }
    );
    return (rows[0] as EventScheduleItemRow | undefined) ?? null;
}

export async function createScheduleItemAdmin(
    db: DB,
    data: {
        scheduleId: number;
        dayId: number;
        trackId: number | null;
        startTime: string;
        endTime: string;
        titleTh: string;
        titleEn: string;
        descriptionTh: string | null;
        descriptionEn: string | null;
        locationTh: string | null;
        locationEn: string | null;
        speakerTh: string | null;
        speakerEn: string | null;
        audience: 'public' | 'all_users' | 'approved_teams' | 'specific_teams';
        isHighlight: boolean;
        sortOrder: number;
        isEnabled: boolean;
    }
): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO event_schedule_items (
            schedule_id,
            day_id,
            track_id,
            start_time,
            end_time,
            title_th,
            title_en,
            description_th,
            description_en,
            location_th,
            location_en,
            speaker_th,
            speaker_en,
            audience,
            is_highlight,
            sort_order,
            is_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.scheduleId,
            data.dayId,
            data.trackId,
            data.startTime,
            data.endTime,
            data.titleTh,
            data.titleEn,
            data.descriptionTh,
            data.descriptionEn,
            data.locationTh,
            data.locationEn,
            data.speakerTh,
            data.speakerEn,
            data.audience,
            data.isHighlight ? 1 : 0,
            data.sortOrder,
            data.isEnabled ? 1 : 0,
        ]
    );

    return result.insertId;
}

export async function updateScheduleItemAdmin(
    db: DB,
    itemId: number,
    data: {
        scheduleId?: number | undefined;
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
        audience?: 'public' | 'all_users' | 'approved_teams' | 'specific_teams' | undefined;
        isHighlight?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    }
): Promise<void> {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (data.scheduleId !== undefined) { fields.push('schedule_id = ?'); values.push(data.scheduleId); }
    if (data.dayId !== undefined) { fields.push('day_id = ?'); values.push(data.dayId); }
    if (data.trackId !== undefined) { fields.push('track_id = ?'); values.push(data.trackId); }
    if (data.startTime !== undefined) { fields.push('start_time = ?'); values.push(data.startTime); }
    if (data.endTime !== undefined) { fields.push('end_time = ?'); values.push(data.endTime); }
    if (data.titleTh !== undefined) { fields.push('title_th = ?'); values.push(data.titleTh); }
    if (data.titleEn !== undefined) { fields.push('title_en = ?'); values.push(data.titleEn); }
    if (data.descriptionTh !== undefined) { fields.push('description_th = ?'); values.push(data.descriptionTh); }
    if (data.descriptionEn !== undefined) { fields.push('description_en = ?'); values.push(data.descriptionEn); }
    if (data.locationTh !== undefined) { fields.push('location_th = ?'); values.push(data.locationTh); }
    if (data.locationEn !== undefined) { fields.push('location_en = ?'); values.push(data.locationEn); }
    if (data.speakerTh !== undefined) { fields.push('speaker_th = ?'); values.push(data.speakerTh); }
    if (data.speakerEn !== undefined) { fields.push('speaker_en = ?'); values.push(data.speakerEn); }
    if (data.audience !== undefined) { fields.push('audience = ?'); values.push(data.audience); }
    if (data.isHighlight !== undefined) { fields.push('is_highlight = ?'); values.push(data.isHighlight ? 1 : 0); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }
    if (data.isEnabled !== undefined) { fields.push('is_enabled = ?'); values.push(data.isEnabled ? 1 : 0); }

    if (!fields.length) return;

    values.push(itemId);
    await db.query(
        `UPDATE event_schedule_items
         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE item_id = ?`,
        values
    );
}

export async function deleteScheduleItemAdmin(db: DB, itemId: number): Promise<void> {
    await db.query(`DELETE FROM event_schedule_items WHERE item_id = ?`, [itemId]);
}
