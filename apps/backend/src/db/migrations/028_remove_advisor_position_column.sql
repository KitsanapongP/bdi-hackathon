-- Migration 028: remove advisor academic position column

ALTER TABLE team_advisors
  DROP COLUMN position;
