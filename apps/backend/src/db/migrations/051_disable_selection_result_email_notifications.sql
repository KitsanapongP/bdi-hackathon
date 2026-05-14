-- Migration 051: disable selection result email notifications

UPDATE admin_notification_settings
SET is_email_enabled = 0,
    updated_at = NOW()
WHERE event_code IN ('SELECTION_PASSED', 'SELECTION_FAILED');

UPDATE notification_logs
SET status = 'skipped',
    retry_after_at = NULL,
    error_message = 'selection result email notifications disabled'
WHERE event_code IN ('SELECTION_PASSED', 'SELECTION_FAILED')
  AND channel = 'email'
  AND status = 'queued';
