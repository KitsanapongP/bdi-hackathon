-- Migration 031: replace all submission tasks with Proposal only

DELETE FROM submission_tasks;

INSERT INTO submission_tasks
  (task_name, task_type, is_required, allowed_extensions, sort_order, is_enabled, is_default, created_by_user_id)
VALUES
  ('Proposal', 'file', 1, '.pdf,.csv', 1, 1, 1, NULL);

SET @proposal_task_id := LAST_INSERT_ID();

INSERT INTO team_submission_tasks
  (team_id, submission_task_id, assigned_by_user_id, assigned_source)
SELECT
  tt.team_id,
  @proposal_task_id,
  NULL,
  'system_backfill'
FROM team_teams tt
WHERE tt.deleted_at IS NULL
ON DUPLICATE KEY UPDATE
  deleted_at = NULL,
  updated_at = NOW();

UPDATE team_submission_tasks tst
JOIN team_teams tt
  ON tt.team_id = tst.team_id
 AND tt.deleted_at IS NULL
SET tst.is_submission_open = 0,
    tst.updated_at = NOW()
WHERE tst.submission_task_id = @proposal_task_id
  AND tst.deleted_at IS NULL
  AND tt.status IN ('submitted', 'passed', 'confirmed', 'failed', 'not_joined');
