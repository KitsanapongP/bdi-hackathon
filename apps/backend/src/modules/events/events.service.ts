import type { DB } from '../../config/db.js';
import * as repo from './events.repo.js';

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
