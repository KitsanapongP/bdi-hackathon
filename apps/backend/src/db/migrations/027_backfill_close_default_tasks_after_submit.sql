-- Migration 027: close default submission tasks for teams already submitted/advanced

UPDATE team_submission_tasks tst
JOIN submission_tasks st
  ON st.submission_task_id = tst.submission_task_id
 AND st.deleted_at IS NULL
 AND st.is_default = 1
JOIN team_teams tt
  ON tt.team_id = tst.team_id
 AND tt.deleted_at IS NULL
SET tst.is_submission_open = 0,
    tst.updated_at = NOW()
WHERE tst.deleted_at IS NULL
  AND tt.status IN ('submitted', 'passed', 'confirmed', 'failed', 'not_joined');
