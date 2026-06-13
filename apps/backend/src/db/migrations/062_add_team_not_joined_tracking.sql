ALTER TABLE team_teams
  ADD COLUMN not_joined_at datetime DEFAULT NULL COMMENT 'When the team became not_joined (leader declined / admin forfeited / confirmation expired)' AFTER confirmed_by_user_id,
  ADD COLUMN not_joined_reason enum('declined','forfeited','expired') DEFAULT NULL COMMENT 'Why the team became not_joined: declined=leader declined, forfeited=admin forfeited, expired=confirmation deadline passed' AFTER not_joined_at;
