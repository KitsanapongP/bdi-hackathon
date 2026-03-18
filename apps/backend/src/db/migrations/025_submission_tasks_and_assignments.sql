-- Migration 025: submission tasks master + team assignment mapping

-- 1) Master tasks for submission requirements
CREATE TABLE `submission_tasks` (
  `submission_task_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of submission task',
  `task_name` varchar(255) NOT NULL COMMENT 'Task name shown in UI',
  `task_type` enum('link','file') NOT NULL COMMENT 'Task input type (link or file)',
  `is_required` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether task is required before submit',
  `allowed_extensions` varchar(255) DEFAULT NULL COMMENT 'Comma-separated allowed extensions for file task (e.g., .pdf,.docx)',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Display order (lower first)',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether task is active',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether task should auto-assign to new teams',
  `created_by_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Admin user who created this task',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp',
  `deleted_at` datetime DEFAULT NULL COMMENT 'Soft delete timestamp',
  PRIMARY KEY (`submission_task_id`),
  KEY `idx_submission_tasks_enabled_sort` (`is_enabled`,`sort_order`),
  KEY `idx_submission_tasks_default` (`is_default`,`is_enabled`),
  KEY `idx_submission_tasks_creator` (`created_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Master list of submission tasks';

-- 2) Team-task assignment mapping + team submitted values (link_url)
CREATE TABLE `team_submission_tasks` (
  `team_submission_task_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team submission task assignment',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams',
  `submission_task_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to submission_tasks',
  `link_url` varchar(500) DEFAULT NULL COMMENT 'Submitted URL for link-type task',
  `assigned_by_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Admin user who assigned this task to team',
  `assigned_source` enum('default','admin_team','admin_status','system_backfill') NOT NULL DEFAULT 'default' COMMENT 'How this assignment was created',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp',
  `deleted_at` datetime DEFAULT NULL COMMENT 'Soft delete timestamp',
  PRIMARY KEY (`team_submission_task_id`),
  UNIQUE KEY `uq_team_submission_task` (`team_id`,`submission_task_id`),
  KEY `idx_team_submission_tasks_task` (`submission_task_id`),
  KEY `idx_team_submission_tasks_assigned_by` (`assigned_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Assigned submission tasks per team';

-- 3) Add task reference to uploaded submission files
ALTER TABLE `team_submission_files`
  ADD COLUMN `team_submission_task_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to team_submission_tasks for file task context' AFTER `team_id`;

-- 4) Seed default tasks (both optional)
INSERT INTO `submission_tasks`
  (`task_name`, `task_type`, `is_required`, `allowed_extensions`, `sort_order`, `is_enabled`, `is_default`, `created_by_user_id`)
VALUES
  ('แนบลิงก์ผลงาน', 'link', 0, NULL, 1, 1, 1, NULL),
  ('แนบไฟล์ผลงาน', 'file', 0, '.pdf,.docx,.png,.pptx', 2, 1, 1, NULL);

-- 5) Backfill: assign default tasks to every existing team
INSERT INTO `team_submission_tasks`
  (`team_id`, `submission_task_id`, `assigned_by_user_id`, `assigned_source`)
SELECT
  t.team_id,
  st.submission_task_id,
  NULL,
  'system_backfill'
FROM `team_teams` t
JOIN `submission_tasks` st
  ON st.is_default = 1
 AND st.deleted_at IS NULL
WHERE t.deleted_at IS NULL;

-- 6) Backfill: move old team_teams.video_link into default link task row
UPDATE `team_submission_tasks` tst
JOIN `submission_tasks` st
  ON st.submission_task_id = tst.submission_task_id
 AND st.task_type = 'link'
 AND st.is_default = 1
JOIN `team_teams` t
  ON t.team_id = tst.team_id
SET tst.link_url = t.video_link
WHERE t.video_link IS NOT NULL
  AND t.video_link <> '';

-- 7) Backfill: connect old uploaded files to default file task row
UPDATE `team_submission_files` tsf
JOIN `team_submission_tasks` tst
  ON tst.team_id = tsf.team_id
 AND tst.deleted_at IS NULL
JOIN `submission_tasks` st
  ON st.submission_task_id = tst.submission_task_id
 AND st.task_type = 'file'
 AND st.is_default = 1
SET tsf.team_submission_task_id = tst.team_submission_task_id
WHERE tsf.team_submission_task_id IS NULL;

-- 8) Make task reference mandatory + indexes
ALTER TABLE `team_submission_files`
  MODIFY `team_submission_task_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_submission_tasks for file task context',
  ADD KEY `idx_submission_files_team_task` (`team_submission_task_id`);

-- 9) Foreign key constraints
ALTER TABLE `submission_tasks`
  ADD CONSTRAINT `fk_submission_tasks_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `user_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `team_submission_tasks`
  ADD CONSTRAINT `fk_team_submission_tasks_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_team_submission_tasks_task` FOREIGN KEY (`submission_task_id`) REFERENCES `submission_tasks` (`submission_task_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_team_submission_tasks_assigned_by` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `user_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `team_submission_files`
  ADD CONSTRAINT `fk_submission_files_team_task` FOREIGN KEY (`team_submission_task_id`) REFERENCES `team_submission_tasks` (`team_submission_task_id`) ON DELETE CASCADE ON UPDATE CASCADE;
