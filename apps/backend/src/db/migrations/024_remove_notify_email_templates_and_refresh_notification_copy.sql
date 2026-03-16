-- Migration 024: remove notify_email_templates and standardize notification email copy

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
    1,
    1,
    'แจ้งการส่งเอกสารยืนยันตัวตนของทีม',
    'ทีม {{team_name}} ({{team_code}}) ได้ส่งเอกสารยืนยันตัวตน สำหรับการคัดเลือกทีมเรียบร้อยแล้ว',
    NOW()
  ),
  (
    'SELECTION_PASSED',
    1,
    1,
    'แจ้งผลการคัดเลือกทีม: ผ่านการคัดเลือก',
    'ทีม {{team_name}} ({{team_code}}) ผ่านการคัดเลือกแล้ว กรุณาดำเนินการยืนยันสิทธิ์เข้าร่วมภายในระยะเวลาที่กำหนด',
    NOW()
  ),
  (
    'SELECTION_FAILED',
    1,
    1,
    'แจ้งผลการคัดเลือกทีม: ไม่ผ่านการคัดเลือก',
    'ทีม {{team_name}} ({{team_code}}) ไม่ผ่านการคัดเลือกในรอบนี้ ขอขอบคุณสำหรับความตั้งใจและการเข้าร่วมโครงการ',
    NOW()
  ),
  (
    'TEAM_CONFIRMED',
    1,
    1,
    'แจ้งการยืนยันเข้าร่วมโครงการจากทีม',
    'ทีม {{team_name}} ({{team_code}}) ได้ยืนยันเข้าร่วมโครงการเรียบร้อยแล้ว โดย {{actor_name}}',
    NOW()
  )
ON DUPLICATE KEY UPDATE
  custom_subject = VALUES(custom_subject),
  custom_message = VALUES(custom_message),
  updated_at = NOW();

DROP TABLE IF EXISTS notify_email_templates;
