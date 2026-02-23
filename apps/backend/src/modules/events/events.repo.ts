import type { DB } from '../../config/db.js';
import type { RowDataPacket } from 'mysql2/promise';
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
