-- Migration 036: team selection submission window

INSERT INTO sys_configs (config_key, config_value, description_th, description_en, updated_at)
VALUES
  ('TEAM_SELECTION_SUBMISSION_OPEN_AT', '2026-05-24 00:00:00', 'วันเวลาเปิดส่งทีมเข้าคัดเลือก', 'Team selection submission opening datetime', NOW()),
  ('TEAM_SELECTION_SUBMISSION_CLOSE_AT', '2026-06-03 23:59:59', 'วันเวลาปิดส่งทีมเข้าคัดเลือก', 'Team selection submission closing datetime', NOW())
ON DUPLICATE KEY UPDATE
  config_value = VALUES(config_value),
  description_th = VALUES(description_th),
  description_en = VALUES(description_en),
  updated_at = NOW();
