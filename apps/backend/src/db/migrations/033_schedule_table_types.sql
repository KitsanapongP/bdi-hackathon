ALTER TABLE event_schedules
    ADD COLUMN table_type ENUM('milestone', 'onsite_timetable') NOT NULL DEFAULT 'onsite_timetable' AFTER timezone;

ALTER TABLE event_schedule_items
    ADD COLUMN display_date_label_th VARCHAR(255) NULL AFTER is_enabled,
    ADD COLUMN display_date_label_en VARCHAR(255) NULL AFTER display_date_label_th,
    ADD COLUMN display_time_label_th VARCHAR(255) NULL AFTER display_date_label_en,
    ADD COLUMN display_time_label_en VARCHAR(255) NULL AFTER display_time_label_th;

UPDATE event_schedules
SET table_type = 'onsite_timetable'
WHERE table_type IS NULL OR table_type = '';
