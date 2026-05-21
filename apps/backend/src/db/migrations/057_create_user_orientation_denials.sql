-- Migration 057: track accounts denied Orientation Day/team access

CREATE TABLE IF NOT EXISTS user_orientation_denials (
  denial_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  reason_code VARCHAR(64) NOT NULL DEFAULT 'duplicate_th_name',
  reason_text VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (denial_id),
  UNIQUE KEY uq_user_orientation_denials_user (user_id),
  KEY idx_user_orientation_denials_reason (reason_code),
  CONSTRAINT fk_user_orientation_denials_user
    FOREIGN KEY (user_id) REFERENCES user_users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
