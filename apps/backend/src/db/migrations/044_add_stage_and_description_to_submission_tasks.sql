-- Migration 044: add stage + description columns for submission tasks

ALTER TABLE `submission_tasks`
  ADD COLUMN `stage` enum('pre_selection','training','onsite') NOT NULL DEFAULT 'pre_selection' COMMENT 'Submission task stage' AFTER `task_type`,
  ADD COLUMN `description` text DEFAULT NULL COMMENT 'Submission task description' AFTER `task_name`;
