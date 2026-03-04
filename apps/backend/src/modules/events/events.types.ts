export interface EventScheduleItemRow {
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
    audience: 'public' | 'all_users' | 'approved_teams' | 'specific_teams';
    is_highlight: number;
    sort_order: number;
    is_enabled: number;
}

export interface EventScheduleDayRow {
    day_id: number;
    schedule_id: number;
    day_date: string;
    day_name_th: string | null;
    day_name_en: string | null;
    sort_order: number;
    is_enabled: number;
}

export interface EventScheduleTrackRow {
    track_id: number;
    schedule_id: number;
    track_code: string;
    track_name_th: string;
    track_name_en: string;
    sort_order: number;
    is_enabled: number;
}

export interface EventScheduleRow {
    schedule_id: number;
    schedule_code: string;
    schedule_name_th: string;
    schedule_name_en: string;
    timezone: string;
    is_published: number;
}
