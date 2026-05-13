-- team_name_th is the source of truth for team display names.
-- Keep team_name_en as a legacy mirror to avoid stale values in old consumers.
UPDATE team_teams
SET team_name_en = team_name_th
WHERE team_name_en <> team_name_th
   OR team_name_en IS NULL
   OR team_name_en = '';
