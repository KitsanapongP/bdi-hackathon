-- Migration 013: Add privacy policy consent document

INSERT INTO user_consent_documents (
  doc_code,
  version,
  title_th,
  title_en,
  content_th,
  content_en,
  is_active,
  published_at,
  created_at,
  updated_at
)
VALUES (
  'PRIVACY',
  'v1',
  'นโยบายคุ้มครองข้อมูลส่วนบุคคล',
  'Privacy Policy',
  'เว็บไซต์นี้เก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลเท่าที่จำเป็นเพื่อการสมัคร การยืนยันตัวตน การติดต่อสื่อสาร และการดำเนินกิจกรรมตามวัตถุประสงค์ของโครงการ โดยมีมาตรการคุ้มครองข้อมูลตามกฎหมายที่เกี่ยวข้อง',
  'This website collects, uses, and discloses personal data only as necessary for registration, verification, communication, and event operations, with protection measures in compliance with applicable laws.',
  1,
  NOW(),
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  title_th = VALUES(title_th),
  title_en = VALUES(title_en),
  content_th = VALUES(content_th),
  content_en = VALUES(content_en),
  is_active = VALUES(is_active),
  updated_at = NOW();
