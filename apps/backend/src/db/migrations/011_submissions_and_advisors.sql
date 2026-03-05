-- Migration 011: Submissions (video link, file attachments) & Advisors

-- 1. Add video_link column to team_teams
ALTER TABLE `team_teams`
  ADD COLUMN `video_link` VARCHAR(500) DEFAULT NULL COMMENT 'Video link (YouTube or Google Drive) for team submission';

-- 2. Create team_submission_files table
CREATE TABLE `team_submission_files` (
  `file_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of submission file',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams',
  `file_storage_key` varchar(500) NOT NULL COMMENT 'Storage path on disk',
  `file_original_name` varchar(255) NOT NULL COMMENT 'Original uploaded filename',
  `file_mime_type` varchar(100) DEFAULT NULL COMMENT 'MIME type of uploaded file',
  `file_size_bytes` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'File size in bytes',
  `uploaded_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who uploaded',
  `uploaded_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When file was uploaded',
  `deleted_at` datetime DEFAULT NULL COMMENT 'Soft delete timestamp',
  PRIMARY KEY (`file_id`),
  KEY `idx_submission_files_team` (`team_id`),
  KEY `idx_submission_files_uploader` (`uploaded_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Files attached to team submissions';

-- 3. Create team_advisors table
CREATE TABLE `team_advisors` (
  `advisor_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of advisor record',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams',
  `prefix` varchar(50) DEFAULT NULL COMMENT 'Title prefix (e.g. ผศ.ดร.)',
  `first_name_th` varchar(100) NOT NULL COMMENT 'First name (Thai)',
  `last_name_th` varchar(100) NOT NULL COMMENT 'Last name (Thai)',
  `first_name_en` varchar(100) DEFAULT NULL COMMENT 'First name (English)',
  `last_name_en` varchar(100) DEFAULT NULL COMMENT 'Last name (English)',
  `email` varchar(255) DEFAULT NULL COMMENT 'Advisor email (unique across all teams)',
  `phone` varchar(30) DEFAULT NULL COMMENT 'Advisor phone number',
  `institution_name_th` varchar(255) DEFAULT NULL COMMENT 'Institution name (Thai)',
  `position` varchar(255) DEFAULT NULL COMMENT 'Academic position',
  `added_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who added this advisor',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp',
  PRIMARY KEY (`advisor_id`),
  UNIQUE KEY `uq_advisor_email` (`email`),
  KEY `idx_advisors_team` (`team_id`),
  KEY `idx_advisors_added_by` (`added_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Team advisors (one advisor per team only)';
