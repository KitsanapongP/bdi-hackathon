-- Migration 016: Backfill default custom subject/message from current behavior
-- Goal: make admin_notification_settings editable from DB immediately

INSERT INTO admin_notification_settings (
  event_code,
  is_in_app_enabled,
  is_email_enabled,
  custom_subject,
  custom_message,
  updated_at
)
VALUES
  (
    'IDENTITY_SUBMITTED',
    0,
    1,
    'ทีมส่งเอกสารยืนยันตัวตนแล้ว',
    'ทีม {{team_name}} ส่งเอกสารยืนยันตัวตนเรียบร้อยแล้ว',
    NOW()
  ),
  (
    'SELECTION_PASSED',
    0,
    1,
    'ประกาศผลคัดเลือก: ผ่าน',
    'ทีม {{team_name}} ผ่านการคัดเลือก กรุณายืนยันเข้าร่วมภายในกำหนดเวลา',
    NOW()
  ),
  (
    'SELECTION_FAILED',
    0,
    1,
    'ประกาศผลคัดเลือก: ไม่ผ่าน',
    'ทีม {{team_name}} ไม่ผ่านการคัดเลือกในรอบนี้',
    NOW()
  ),
  (
    'TEAM_CONFIRMED',
    0,
    1,
    'ทีมยืนยันเข้าร่วมโครงการแล้ว',
    'ทีม {{team_name}} ยืนยันเข้าร่วมโครงการเรียบร้อยแล้ว โดย {{actor_name}}',
    NOW()
  )
ON DUPLICATE KEY UPDATE
  custom_subject = IFNULL(custom_subject, VALUES(custom_subject)),
  custom_message = IFNULL(custom_message, VALUES(custom_message)),
  updated_at = NOW();
