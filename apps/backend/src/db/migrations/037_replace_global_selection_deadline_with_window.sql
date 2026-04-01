-- Migration 037: replace global selection confirm deadline with open/close window

INSERT INTO sys_configs (config_key, config_value, description_th, description_en, updated_at)
VALUES
  ('GLOBAL_SELECTION_CONFIRM_OPEN_AT', '2026-04-02 00:00:00', 'วันเวลาเปิดยืนยันการเข้าร่วมโครงการหลังผ่านการคัดเลือก', 'Global selection confirmation opening datetime', NOW()),
  ('GLOBAL_SELECTION_CONFIRM_CLOSE_AT', '2026-06-01 23:59:59', 'วันเวลาปิดยืนยันการเข้าร่วมโครงการหลังผ่านการคัดเลือก', 'Global selection confirmation closing datetime', NOW())
ON DUPLICATE KEY UPDATE
  config_value = VALUES(config_value),
  description_th = VALUES(description_th),
  description_en = VALUES(description_en),
  updated_at = NOW();

DELETE FROM sys_configs
WHERE config_key = 'GLOBAL_SELECTION_CONFIRM_DEADLINE_AT';
