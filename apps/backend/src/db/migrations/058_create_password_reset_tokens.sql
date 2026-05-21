CREATE TABLE IF NOT EXISTS user_password_reset_tokens (
  reset_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of password reset request',
  user_id BIGINT(20) UNSIGNED NOT NULL COMMENT 'User requesting password reset',
  email VARCHAR(255) NOT NULL COMMENT 'Email used for password reset',
  token_hash VARCHAR(128) NOT NULL COMMENT 'SHA-256 hash of reset link token',
  expires_at DATETIME NOT NULL COMMENT 'Reset link expiration time',
  consumed_at DATETIME NULL COMMENT 'When this reset link was used',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  PRIMARY KEY (reset_id),
  UNIQUE KEY uq_uprt_token_hash (token_hash),
  KEY idx_uprt_user_created (user_id, created_at),
  KEY idx_uprt_email_created (email, created_at),
  KEY idx_uprt_expires_consumed (expires_at, consumed_at),
  CONSTRAINT fk_uprt_user
    FOREIGN KEY (user_id) REFERENCES user_users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='One-time password reset links';
