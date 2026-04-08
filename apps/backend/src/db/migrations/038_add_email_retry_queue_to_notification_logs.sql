ALTER TABLE notification_logs
  MODIFY COLUMN status ENUM('queued', 'sent', 'failed', 'skipped', 'read') NOT NULL DEFAULT 'sent' COMMENT 'Delivery state',
  ADD COLUMN recipient_email VARCHAR(255) NULL AFTER status,
  ADD COLUMN email_html MEDIUMTEXT NULL AFTER recipient_email,
  ADD COLUMN retry_after_at DATETIME NULL AFTER email_html,
  ADD COLUMN retry_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER retry_after_at;

CREATE INDEX idx_notification_logs_retry_queue
  ON notification_logs (status, retry_after_at, created_at, notification_log_id);
