-- Migration 015: confirmed status + custom notification content columns

ALTER TABLE team_teams
  MODIFY COLUMN status ENUM('forming','submitted','disbanded','passed','failed','confirmed')
  NOT NULL DEFAULT 'forming'
  COMMENT 'Team lifecycle status (selection-ready)';

ALTER TABLE admin_notification_settings
  ADD COLUMN IF NOT EXISTS custom_subject VARCHAR(255) NULL COMMENT 'Optional per-event email subject override' AFTER is_email_enabled,
  ADD COLUMN IF NOT EXISTS custom_message TEXT NULL COMMENT 'Optional per-event email body override' AFTER custom_subject;
