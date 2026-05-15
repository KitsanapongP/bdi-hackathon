ALTER TABLE team_teams
  ADD COLUMN team_description TEXT DEFAULT NULL COMMENT 'Public team description shown in team browsing' AFTER team_name_en;
