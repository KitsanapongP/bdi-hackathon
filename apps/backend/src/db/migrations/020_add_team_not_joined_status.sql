-- Migration 020: add explicit status for teams that miss confirmation deadline

ALTER TABLE team_teams
  MODIFY COLUMN status ENUM('forming','submitted','disbanded','passed','failed','confirmed','not_joined')
  NOT NULL DEFAULT 'forming'
  COMMENT 'Team lifecycle status (selection-ready; includes not_joined when team misses confirmation deadline)';
