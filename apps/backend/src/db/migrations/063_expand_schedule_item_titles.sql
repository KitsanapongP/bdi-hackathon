ALTER TABLE event_schedule_items
  MODIFY title_th VARCHAR(512) NOT NULL COMMENT 'Item title (Thai)',
  MODIFY title_en VARCHAR(512) NOT NULL COMMENT 'Item title (English)';
