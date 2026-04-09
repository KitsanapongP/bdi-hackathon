-- Migration 045: move deadline source from team_submission_tasks to submission_tasks

ALTER TABLE `submission_tasks`
  ADD COLUMN `deadline_at` datetime DEFAULT NULL COMMENT 'Optional deadline for this submission task' AFTER `sort_order`;

UPDATE `submission_tasks` st
LEFT JOIN (
  SELECT
    submission_task_id,
    MAX(deadline_at) AS deadline_at
  FROM team_submission_tasks
  WHERE deleted_at IS NULL
    AND deadline_at IS NOT NULL
  GROUP BY submission_task_id
) td
  ON td.submission_task_id = st.submission_task_id
SET st.deadline_at = td.deadline_at
WHERE st.deadline_at IS NULL;