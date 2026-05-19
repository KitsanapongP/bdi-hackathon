-- Migration 055: add submission track selection per submitted work

ALTER TABLE `team_submission_tasks`
  ADD COLUMN `submission_track` enum('Phenome','Health','City') DEFAULT NULL COMMENT 'Selected competition track for this submitted work' AFTER `link_url`,
  ADD KEY `idx_team_submission_tasks_track` (`submission_track`);
