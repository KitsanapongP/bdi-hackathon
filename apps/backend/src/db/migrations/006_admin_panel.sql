CREATE TABLE IF NOT EXISTS `files` (
  `file_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `original_name` varchar(255) NOT NULL,
  `stored_name` varchar(255) NOT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `size_bytes` bigint unsigned DEFAULT NULL,
  `storage_path` varchar(1024) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`file_id`)
);

CREATE TABLE IF NOT EXISTS `static_sponsors` (
  `sponsor_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `logo_file_id` bigint unsigned DEFAULT NULL,
  `website_url` varchar(500) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`sponsor_id`),
  KEY `fk_static_sponsors_logo_file` (`logo_file_id`),
  CONSTRAINT `fk_static_sponsors_logo_file` FOREIGN KEY (`logo_file_id`) REFERENCES `files` (`file_id`) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `static_rewards` (
  `reward_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `amount` varchar(100) DEFAULT NULL,
  `rank_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`reward_id`)
);

CREATE TABLE IF NOT EXISTS `static_abouts` (
  `about_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content_html` longtext,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`about_id`)
);

CREATE TABLE IF NOT EXISTS `static_contacts` (
  `contact_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(255) NOT NULL,
  `value` varchar(500) NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`contact_id`)
);

CREATE TABLE IF NOT EXISTS `static_winners` (
  `winner_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `team_id` bigint unsigned DEFAULT NULL,
  `prize_label` varchar(255) NOT NULL,
  `project_title` varchar(255) NOT NULL,
  `project_summary` text,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`winner_id`),
  KEY `fk_static_winners_team` (`team_id`),
  CONSTRAINT `fk_static_winners_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `team_submissions` (
  `submission_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `team_id` bigint unsigned NOT NULL,
  `submitted_by_user_id` bigint unsigned NOT NULL,
  `status` enum('pending_review','approved','rejected') NOT NULL DEFAULT 'pending_review',
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by_user_id` bigint unsigned DEFAULT NULL,
  `review_comment` text,
  PRIMARY KEY (`submission_id`),
  KEY `idx_team_submissions_team` (`team_id`,`status`,`submitted_at`)
);

CREATE TABLE IF NOT EXISTS `team_submission_files` (
  `submission_file_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `submission_id` bigint unsigned NOT NULL,
  `file_id` bigint unsigned NOT NULL,
  `uploaded_by_user_id` bigint unsigned NOT NULL,
  `uploaded_at` datetime NOT NULL,
  PRIMARY KEY (`submission_file_id`),
  KEY `idx_team_submission_files_submission` (`submission_id`),
  CONSTRAINT `fk_team_submission_files_submission` FOREIGN KEY (`submission_id`) REFERENCES `team_submissions` (`submission_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_team_submission_files_file` FOREIGN KEY (`file_id`) REFERENCES `files` (`file_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `team_fix_items` (
  `fix_item_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `team_id` bigint unsigned NOT NULL,
  `submission_id` bigint unsigned NOT NULL,
  `member_user_id` bigint unsigned NOT NULL,
  `reason` text,
  `status` enum('open','resolved') NOT NULL DEFAULT 'open',
  `rejected_at` datetime NOT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by_user_id` bigint unsigned DEFAULT NULL,
  `resolution_note` text,
  PRIMARY KEY (`fix_item_id`),
  KEY `idx_team_fix_items_block` (`team_id`,`status`),
  KEY `idx_team_fix_items_member` (`member_user_id`,`status`),
  CONSTRAINT `fk_team_fix_items_submission` FOREIGN KEY (`submission_id`) REFERENCES `team_submissions` (`submission_id`) ON DELETE CASCADE ON UPDATE CASCADE
);
