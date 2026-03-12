-- Migration 021: pending registration email verification

CREATE TABLE IF NOT EXISTS user_registration_verifications (
  registration_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of pending registration',
  email VARCHAR(255) NOT NULL COMMENT 'Email used for registration and verification',
  user_name VARCHAR(50) NOT NULL COMMENT 'Requested username (for duplicate checks)',
  verification_code_hash VARCHAR(128) NOT NULL COMMENT 'SHA-256 hash of one-time verification code',
  payload_json LONGTEXT NOT NULL COMMENT 'Serialized registration payload including password hash',
  expires_at DATETIME NOT NULL COMMENT 'Verification code expiration time',
  last_sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the latest verification email was sent',
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Number of failed verification attempts',
  consumed_at DATETIME DEFAULT NULL COMMENT 'When this pending registration was completed',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  PRIMARY KEY (registration_id),
  UNIQUE KEY uq_urv_email (email),
  KEY idx_urv_user_name (user_name),
  KEY idx_urv_expires (expires_at),
  KEY idx_urv_consumed (consumed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pending registrations waiting for email verification';
