CREATE TABLE IF NOT EXISTS auth_email_logs (
  auth_email_log_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  event_code VARCHAR(100) NOT NULL COMMENT 'Auth event code, e.g. REGISTER_OTP',
  channel ENUM('email') NOT NULL DEFAULT 'email' COMMENT 'Delivery channel',
  registration_id BIGINT(20) UNSIGNED NULL COMMENT 'FK to user_registration_verifications.registration_id',
  pending_user_id BIGINT(20) UNSIGNED NULL COMMENT 'FK to provisional user_users.user_id',
  recipient_email VARCHAR(255) NULL COMMENT 'Recipient email address',
  subject_text VARCHAR(255) NULL COMMENT 'Resolved subject used for delivery',
  message_text TEXT NULL COMMENT 'Resolved non-sensitive message text used for delivery',
  status ENUM('queued', 'sent', 'failed', 'skipped', 'read') NOT NULL DEFAULT 'sent' COMMENT 'Delivery state',
  provider_message_id VARCHAR(255) NULL COMMENT 'Provider message id for email delivery',
  error_message TEXT NULL COMMENT 'Error detail when failed/skipped',
  retry_after_at DATETIME NULL COMMENT 'Next retry timestamp when queued',
  retry_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Retry count when queued',
  sent_at DATETIME NULL COMMENT 'When delivered/sent',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  PRIMARY KEY (auth_email_log_id),
  KEY idx_auth_email_logs_status_retry (status, retry_after_at, created_at, auth_email_log_id),
  KEY idx_auth_email_logs_registration_created (registration_id, created_at),
  KEY idx_auth_email_logs_email_created (recipient_email, created_at),
  CONSTRAINT fk_auth_email_logs_registration
    FOREIGN KEY (registration_id) REFERENCES user_registration_verifications(registration_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_auth_email_logs_pending_user
    FOREIGN KEY (pending_user_id) REFERENCES user_users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Auth OTP email delivery history';
