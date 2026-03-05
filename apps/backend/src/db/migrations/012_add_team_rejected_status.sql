-- Migration 011: Add rejected team status for admin review dashboard

ALTER TABLE team_teams
  MODIFY COLUMN status ENUM('draft','forming','ready','submitted','approved','returned','rejected','archived','disbanded')
    NOT NULL DEFAULT 'forming'
    COMMENT 'Team lifecycle status',
  ADD COLUMN IF NOT EXISTS rejected_at DATETIME NULL
    COMMENT 'When team was rejected by admin'
    AFTER approved_at;
