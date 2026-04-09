-- Migration 046: remove per-team submission deadline column

ALTER TABLE `team_submission_tasks`
  DROP COLUMN IF EXISTS `deadline_at`;
