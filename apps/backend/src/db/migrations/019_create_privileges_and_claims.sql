-- Migration 019: Privileges templates + per-user claims + claim logs

CREATE TABLE IF NOT EXISTS privileges (
  privilege_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of privilege template',
  privilege_code VARCHAR(100) NOT NULL COMMENT 'Unique privilege code used by admin and APIs',
  privilege_name_th VARCHAR(255) NOT NULL COMMENT 'Privilege display name in Thai',
  privilege_name_en VARCHAR(255) NULL COMMENT 'Privilege display name in English',
  description_th TEXT NULL COMMENT 'Privilege description in Thai',
  description_en TEXT NULL COMMENT 'Privilege description in English',
  privilege_type ENUM('auto_admin','souvenir_qr') NOT NULL COMMENT 'Claim behavior type',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this privilege template is currently active',
  is_published TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether this template has been published for assignment',
  sort_order INT(11) NOT NULL DEFAULT 0 COMMENT 'Display order in UI (ascending)',
  created_by_user_id BIGINT(20) UNSIGNED NULL COMMENT 'Admin user who created this template',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  deleted_at DATETIME NULL COMMENT 'Soft delete timestamp',
  PRIMARY KEY (privilege_id),
  UNIQUE KEY uq_privileges_code (privilege_code),
  KEY idx_privileges_active_published (is_active, is_published, sort_order),
  KEY idx_privileges_created_by (created_by_user_id),
  CONSTRAINT fk_privileges_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES user_users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Privilege templates configurable by admin';

CREATE TABLE IF NOT EXISTS user_privilege_claims (
  privilege_claim_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of user privilege claim',
  privilege_id BIGINT(20) UNSIGNED NOT NULL COMMENT 'FK to privileges',
  user_id BIGINT(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (claim owner)',
  team_id BIGINT(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams at assignment time',
  qr_token VARCHAR(128) NOT NULL COMMENT 'Unique token encoded into QR/barcode for claim check',
  token_version INT(11) UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Token version for future rotation support',
  claim_status ENUM('pending','claimed') NOT NULL DEFAULT 'pending' COMMENT 'Current claim status',
  claim_method ENUM('qr_scan','admin_manual','team_bulk') NULL COMMENT 'How this claim was set to claimed',
  claimed_at DATETIME NULL COMMENT 'When this claim was marked claimed',
  claimed_by_user_id BIGINT(20) UNSIGNED NULL COMMENT 'Admin who marked this claim as claimed',
  claim_note VARCHAR(500) NULL COMMENT 'Optional note for manual/bulk adjustment',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  PRIMARY KEY (privilege_claim_id),
  UNIQUE KEY uq_user_privilege_claim (privilege_id, user_id),
  UNIQUE KEY uq_user_privilege_claim_token (qr_token),
  KEY idx_user_privilege_claim_team_status (team_id, privilege_id, claim_status),
  KEY idx_user_privilege_claim_user_status (user_id, claim_status),
  KEY idx_user_privilege_claim_claimed_by (claimed_by_user_id),
  CONSTRAINT fk_user_privilege_claim_privilege
    FOREIGN KEY (privilege_id) REFERENCES privileges(privilege_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_user_privilege_claim_user
    FOREIGN KEY (user_id) REFERENCES user_users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_privilege_claim_team
    FOREIGN KEY (team_id) REFERENCES team_teams(team_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_privilege_claim_claimed_by
    FOREIGN KEY (claimed_by_user_id) REFERENCES user_users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Per-user privilege claim records with unique QR tokens';

CREATE TABLE IF NOT EXISTS user_privilege_claim_logs (
  claim_log_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of claim log',
  privilege_claim_id BIGINT(20) UNSIGNED NOT NULL COMMENT 'FK to user_privilege_claims',
  action_code VARCHAR(100) NOT NULL COMMENT 'Action code, e.g. CLAIM_REDEEMED_QR',
  action_detail TEXT NULL COMMENT 'Additional detail as JSON/text',
  actor_user_id BIGINT(20) UNSIGNED NULL COMMENT 'Admin/system actor who performed action',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  PRIMARY KEY (claim_log_id),
  KEY idx_privilege_claim_logs_claim (privilege_claim_id, created_at),
  KEY idx_privilege_claim_logs_actor (actor_user_id),
  CONSTRAINT fk_privilege_claim_logs_claim
    FOREIGN KEY (privilege_claim_id) REFERENCES user_privilege_claims(privilege_claim_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_privilege_claim_logs_actor
    FOREIGN KEY (actor_user_id) REFERENCES user_users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit log for privilege claim actions';
