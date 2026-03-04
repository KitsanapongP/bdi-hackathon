-- Migration 010: Identity Verification - Member Confirmation & Team Disband
-- Adds member confirmation fields to verify_member_profiles
-- Adds 'disbanded' status and disband fields to team_teams
-- Adds performance indexes

-- 1. Add member confirmation fields to verify_member_profiles
ALTER TABLE verify_member_profiles
  ADD COLUMN is_member_confirmed TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether member confirmed their identity documents' AFTER is_profile_complete,
  ADD COLUMN member_confirmed_at DATETIME NULL COMMENT 'When member confirmed their documents' AFTER is_member_confirmed,
  ADD COLUMN member_unconfirmed_at DATETIME NULL COMMENT 'When member last cancelled confirmation' AFTER member_confirmed_at;

-- 2. Extend team_teams.status enum to include 'disbanded' + add disband fields
ALTER TABLE team_teams
  MODIFY COLUMN `status` ENUM('draft','forming','ready','submitted','approved','returned','archived','disbanded') NOT NULL DEFAULT 'forming' COMMENT 'Team lifecycle status',
  ADD COLUMN disbanded_at DATETIME NULL COMMENT 'When team was disbanded' AFTER deleted_at,
  ADD COLUMN disbanded_by_user_id BIGINT(20) UNSIGNED NULL COMMENT 'FK to user_users who disbanded the team' AFTER disbanded_at,
  ADD COLUMN disband_reason VARCHAR(255) NULL COMMENT 'Reason for disbanding' AFTER disbanded_by_user_id;

-- 3. Add indexes for verification queries
ALTER TABLE verify_member_profiles ADD INDEX idx_vmp_team_user (team_id, user_id);
ALTER TABLE verify_member_documents ADD INDEX idx_vmd_team_user_req (team_id, user_id, requirement_id, is_current);
ALTER TABLE team_teams ADD INDEX idx_tt_status (status);
ALTER TABLE team_members ADD INDEX idx_tm_team_user (team_id, user_id);
