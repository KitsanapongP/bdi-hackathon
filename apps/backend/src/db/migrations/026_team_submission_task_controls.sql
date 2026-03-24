-- Migration 026: add deadline + open/close controls per assigned team task

ALTER TABLE `team_submission_tasks`
  ADD COLUMN `deadline_at` datetime DEFAULT NULL COMMENT 'Optional deadline for this task assignment' AFTER `link_url`,
  ADD COLUMN `is_submission_open` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether team can submit/update this task now' AFTER `deadline_at`;

ALTER TABLE `team_submission_tasks`
  ADD KEY `idx_team_submission_tasks_open_deadline` (`is_submission_open`, `deadline_at`);
