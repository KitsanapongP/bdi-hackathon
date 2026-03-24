-- Migration 029: remove in-app toggle, refresh bracket style, add TEAM_DISBANDED notification

ALTER TABLE admin_notification_settings
  DROP COLUMN IF EXISTS is_in_app_enabled;

UPDATE admin_notification_settings
SET custom_message = CASE
  WHEN event_code = 'IDENTITY_SUBMITTED' AND custom_message IN (
    'ทีม {{team_name}} ({{team_code}}) ได้ส่งเอกสารยืนยันตัวตนเรียบร้อยแล้ว กรุณาตรวจสอบข้อมูลในระบบผู้ดูแล',
    'ทีม {{team_name}} ({{team_code}}) ได้ส่งเอกสารยืนยันตัวตน สำหรับการคัดเลือกทีมเรียบร้อยแล้ว'
  ) THEN 'ทีม {{team_name}} [{{team_code}}] ได้ส่งเอกสารยืนยันตัวตนเรียบร้อยแล้ว กรุณาตรวจสอบข้อมูลในระบบผู้ดูแล'
  WHEN event_code = 'SELECTION_PASSED' AND custom_message IN (
    'ทีม {{team_name}} ({{team_code}}) ผ่านการคัดเลือกแล้ว กรุณาดำเนินการยืนยันสิทธิ์เข้าร่วมภายในกำหนดเวลา {{confirmation_deadline_at}}',
    'ทีม {{team_name}} ({{team_code}}) ผ่านการคัดเลือกแล้ว กรุณาดำเนินการยืนยันสิทธิ์เข้าร่วมภายในระยะเวลาที่กำหนด'
  ) THEN 'ทีม {{team_name}} [{{team_code}}] ผ่านการคัดเลือกแล้ว กรุณาดำเนินการยืนยันสิทธิ์เข้าร่วมภายในกำหนดเวลา {{confirmation_deadline_at}}'
  WHEN event_code = 'SELECTION_FAILED' AND custom_message IN (
    'ทีม {{team_name}} ({{team_code}}) ไม่ผ่านการคัดเลือกในรอบนี้ ขอขอบคุณที่เข้าร่วมโครงการ',
    'ทีม {{team_name}} ({{team_code}}) ไม่ผ่านการคัดเลือกในรอบนี้ ขอขอบคุณสำหรับความตั้งใจและการเข้าร่วมโครงการ'
  ) THEN 'ทีม {{team_name}} [{{team_code}}] ไม่ผ่านการคัดเลือกในรอบนี้ ขอขอบคุณที่เข้าร่วมโครงการ'
  WHEN event_code = 'TEAM_CONFIRMED' AND custom_message = 'ทีม {{team_name}} ({{team_code}}) ได้ยืนยันเข้าร่วมโครงการเรียบร้อยแล้ว โดย {{actor_name}}'
    THEN 'ทีม {{team_name}} [{{team_code}}] ได้ยืนยันเข้าร่วมโครงการเรียบร้อยแล้ว โดย {{actor_name}}'
  ELSE custom_message
END,
updated_at = NOW();

INSERT INTO admin_notification_settings (
  event_code,
  is_email_enabled,
  custom_subject,
  custom_message,
  updated_at
)
VALUES (
  'TEAM_DISBANDED',
  1,
  'แจ้งการยุบทีม',
  'ทีม {{team_name}} [{{team_code}}] ถูกยุบทีมเรียบร้อยแล้ว โดย {{actor_name}} เหตุผล: {{disband_reason}}',
  NOW()
)
ON DUPLICATE KEY UPDATE
  is_email_enabled = VALUES(is_email_enabled),
  custom_subject = IFNULL(custom_subject, VALUES(custom_subject)),
  custom_message = IFNULL(custom_message, VALUES(custom_message)),
  updated_at = NOW();
