-- Migration 061: allow team review links to be scoped to one submission track

ALTER TABLE `review_team_shares`
  ADD COLUMN `submission_track` enum('Phenome','Health','City') DEFAULT NULL COMMENT 'NULL means full-team review link' AFTER `team_id`,
  ADD KEY `idx_team_track_active` (`team_id`, `submission_track`, `revoked_at`);
