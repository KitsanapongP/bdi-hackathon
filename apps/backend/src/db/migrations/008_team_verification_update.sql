ALTER TABLE verify_member_profiles
  ADD COLUMN is_member_confirmed TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Member pressed confirm for identity docs (can be unconfirmed before team submission)'
    AFTER is_profile_complete,
  ADD COLUMN member_confirmed_at DATETIME NULL
    COMMENT 'When member confirmed (nullable if never confirmed or later unconfirmed)'
    AFTER is_member_confirmed,
  ADD COLUMN member_unconfirmed_at DATETIME NULL
    COMMENT 'When member cancelled confirmation'
    AFTER member_confirmed_at;

ALTER TABLE team_teams
  MODIFY COLUMN status ENUM('draft','forming','ready','submitted','approved','returned','archived','disbanded')
    NOT NULL DEFAULT 'forming'
    COMMENT 'Team lifecycle status',
  ADD COLUMN disbanded_at DATETIME NULL
    COMMENT 'When team was disbanded'
    AFTER deleted_at,
  ADD COLUMN disbanded_by_user_id BIGINT(20) UNSIGNED NULL
    COMMENT 'FK to user_users who disbanded the team'
    AFTER disbanded_at,
  ADD COLUMN disband_reason VARCHAR(255) NULL
    COMMENT 'Reason for disbanding'
    AFTER disbanded_by_user_id;

ALTER TABLE verify_member_profiles ADD INDEX idx_vmp_team_user (team_id, user_id);
ALTER TABLE verify_member_documents ADD INDEX idx_vmd_team_user_req (team_id, user_id, requirement_id, is_current);
ALTER TABLE team_teams ADD INDEX idx_tt_status (status);
ALTER TABLE team_members ADD INDEX idx_tm_team_user (team_id, user_id);
