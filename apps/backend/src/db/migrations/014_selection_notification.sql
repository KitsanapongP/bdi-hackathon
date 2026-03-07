-- Migration 014: Notification system + selection/confirmation status model

-- 1) Normalize team status for selection flow
UPDATE team_teams
SET status = 'forming'
WHERE status IN ('draft', 'ready', 'approved', 'returned', 'archived', 'rejected');

ALTER TABLE team_teams
  MODIFY COLUMN status ENUM('forming','submitted','disbanded','passed','failed') NOT NULL DEFAULT 'forming' COMMENT 'Team lifecycle status (selection-ready)';

ALTER TABLE team_teams
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS rejected_at,
  DROP COLUMN IF EXISTS selected_at;

ALTER TABLE team_teams
  ADD COLUMN IF NOT EXISTS confirmation_deadline_at DATETIME NULL COMMENT 'Deadline for leader to confirm participation' AFTER status,
  ADD COLUMN IF NOT EXISTS confirmed_at DATETIME NULL COMMENT 'When team leader confirmed participation' AFTER confirmation_deadline_at,
  ADD COLUMN IF NOT EXISTS confirmed_by_user_id BIGINT(20) UNSIGNED NULL COMMENT 'Leader user id who confirmed participation' AFTER confirmed_at;

ALTER TABLE team_teams
  ADD KEY IF NOT EXISTS idx_team_teams_confirm_deadline (confirmation_deadline_at),
  ADD KEY IF NOT EXISTS idx_team_teams_confirmed_by (confirmed_by_user_id);

ALTER TABLE team_teams
  ADD CONSTRAINT fk_team_teams_confirmed_by
    FOREIGN KEY (confirmed_by_user_id)
    REFERENCES user_users(user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- 2) Notification log for inbox + audit
CREATE TABLE IF NOT EXISTS notification_logs (
  notification_log_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  event_code VARCHAR(100) NOT NULL COMMENT 'Event code, e.g. IDENTITY_SUBMITTED',
  channel ENUM('in_app','email') NOT NULL COMMENT 'Delivery channel',
  team_id BIGINT(20) UNSIGNED NULL COMMENT 'Team context if any',
  recipient_user_id BIGINT(20) UNSIGNED NOT NULL COMMENT 'Recipient user',
  actor_user_id BIGINT(20) UNSIGNED NULL COMMENT 'User who triggered event',
  template_code VARCHAR(100) NULL COMMENT 'Template code from notify_email_templates',
  subject_text VARCHAR(255) NULL COMMENT 'Resolved subject used for delivery',
  message_text TEXT NULL COMMENT 'Resolved body message used for delivery',
  status ENUM('sent','failed','skipped','read') NOT NULL DEFAULT 'sent' COMMENT 'Delivery state',
  provider_message_id VARCHAR(255) NULL COMMENT 'Provider message id for email delivery',
  error_message TEXT NULL COMMENT 'Error detail when failed',
  sent_at DATETIME NULL COMMENT 'When delivered/sent',
  read_at DATETIME NULL COMMENT 'When recipient viewed it',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  PRIMARY KEY (notification_log_id),
  KEY idx_notification_logs_team_created (team_id, created_at),
  KEY idx_notification_logs_recipient_created (recipient_user_id, created_at),
  KEY idx_notification_logs_event (event_code),
  CONSTRAINT fk_notification_logs_team
    FOREIGN KEY (team_id) REFERENCES team_teams(team_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notification_logs_recipient
    FOREIGN KEY (recipient_user_id) REFERENCES user_users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notification_logs_actor
    FOREIGN KEY (actor_user_id) REFERENCES user_users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inbox + email delivery history';

-- 3) Admin toggle for notification channels per event
CREATE TABLE IF NOT EXISTS admin_notification_settings (
  event_code VARCHAR(100) NOT NULL COMMENT 'Event code',
  is_in_app_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Enable in-app inbox delivery',
  is_email_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Enable email delivery',
  updated_by_user_id BIGINT(20) UNSIGNED NULL COMMENT 'Admin who updated this setting',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  PRIMARY KEY (event_code),
  KEY idx_admin_notification_settings_updated_by (updated_by_user_id),
  CONSTRAINT fk_admin_notification_settings_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES user_users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin channel toggles by event';

INSERT INTO admin_notification_settings (event_code, is_in_app_enabled, is_email_enabled)
VALUES
  ('IDENTITY_SUBMITTED', 1, 1),
  ('SELECTION_PASSED', 1, 1),
  ('SELECTION_FAILED', 1, 1),
  ('TEAM_CONFIRMED', 1, 1)
ON DUPLICATE KEY UPDATE
  is_in_app_enabled = VALUES(is_in_app_enabled),
  is_email_enabled = VALUES(is_email_enabled);
