-- Migration 030: registration and team recruitment windows

INSERT INTO sys_configs (config_key, config_value, description_th, description_en, updated_at)
VALUES
  ('REGISTRATION_OPEN_AT', '2026-04-01 00:00:00', 'วันเวลาเปิดลงทะเบียน', 'Registration opening datetime', NOW()),
  ('REGISTRATION_CLOSE_AT', '2026-06-03 23:59:59', 'วันเวลาปิดลงทะเบียน', 'Registration closing datetime', NOW()),
  ('TEAM_RECRUITMENT_OPEN_AT', '2026-05-24 00:00:00', 'วันเวลาเปิดรับสมัครทีม', 'Team recruitment opening datetime', NOW()),
  ('TEAM_RECRUITMENT_CLOSE_AT', '2026-06-03 23:59:59', 'วันเวลาปิดรับสมัครทีม', 'Team recruitment closing datetime', NOW())
ON DUPLICATE KEY UPDATE
  config_value = VALUES(config_value),
  description_th = VALUES(description_th),
  description_en = VALUES(description_en),
  updated_at = NOW();
