-- Migration 017: Separate admin notification recipient preferences into notify-prefixed table

CREATE TABLE IF NOT EXISTS notify_admin_recipients (
  notify_admin_recipient_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this admin should receive notify emails',
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (notify_admin_recipient_id),
  UNIQUE KEY uq_notify_admin_recipients_user (user_id),
  KEY idx_notify_admin_recipients_enabled (is_enabled),
  KEY idx_notify_admin_recipients_updated_by (updated_by_user_id),
  CONSTRAINT fk_notify_admin_recipients_user
    FOREIGN KEY (user_id) REFERENCES user_users(user_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_notify_admin_recipients_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES user_users(user_id)
    ON UPDATE CASCADE ON DELETE SET NULL
);

-- Backfill from current active admin allowlist (default enabled)
INSERT INTO notify_admin_recipients (user_id, is_enabled, updated_by_user_id, created_at, updated_at)
SELECT
  u.user_id,
  1 AS is_enabled,
  NULL,
  NOW(),
  NOW()
FROM user_users u
JOIN access_allowlist a
  ON a.user_id = u.user_id
 AND a.access_role = 'admin'
 AND a.is_active = 1
WHERE u.is_active = 1
  AND u.deleted_at IS NULL
ON DUPLICATE KEY UPDATE
  is_enabled = VALUES(is_enabled),
  updated_at = NOW();
