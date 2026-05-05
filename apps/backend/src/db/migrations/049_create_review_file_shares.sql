-- Migration 049: create share table for public review file links

CREATE TABLE IF NOT EXISTS `review_file_shares` (
  `review_file_share_id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `share_id` VARCHAR(64) NOT NULL,
  `file_storage_key` VARCHAR(1024) NOT NULL,
  `file_kind` ENUM('video','submission_file','member_document') NOT NULL,
  `file_original_name` VARCHAR(255) NULL,
  `revoked_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_file_share_id`),
  UNIQUE KEY `uq_share_id` (`share_id`),
  KEY `idx_storage_key_active` (`file_storage_key`(255), `revoked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
