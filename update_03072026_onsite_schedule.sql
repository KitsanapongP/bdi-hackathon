START TRANSACTION;

SET @schedule_id := (
  SELECT schedule_id
  FROM event_schedules
  WHERE schedule_code = '2026_ONSITE_TABLE'
  LIMIT 1
);

SET @day_20260703 := (
  SELECT day_id
  FROM event_schedule_days
  WHERE schedule_id = @schedule_id
    AND day_date = '2026-07-03'
  LIMIT 1
);

SET @day_20260704 := (
  SELECT day_id
  FROM event_schedule_days
  WHERE schedule_id = @schedule_id
    AND day_date = '2026-07-04'
  LIMIT 1
);

-- ปรับเฉพาะวันศุกร์ที่ 3 ก.ค. 2569 ช่วงบ่าย ตั้งแต่ 12.00 น. เป็นต้นไป
DELETE FROM event_schedule_items
WHERE schedule_id = @schedule_id
  AND day_id = @day_20260703
  AND start_time >= '12:00:00';

-- ปรับเฉพาะวันเสาร์ที่ 4 ก.ค. 2569 ช่วงเช้า ถึง 13.00 น.
DELETE FROM event_schedule_items
WHERE schedule_id = @schedule_id
  AND day_id = @day_20260704
  AND start_time >= '09:00:00'
  AND start_time < '13:00:00';

INSERT INTO event_schedule_items
  (schedule_id, day_id, track_id, start_time, end_time, title_th, title_en, description_th, description_en, location_th, location_en, speaker_th, speaker_en, audience, is_highlight, sort_order, is_enabled, display_date_label_th, display_date_label_en, display_time_label_th, display_time_label_en)
VALUES
  (@schedule_id, @day_20260703, NULL, '12:00:00', '13:00:00', 'รับประทานอาหาร', 'Lunch', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 100, 1, NULL, NULL, '12.00 - 13.00 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '13:00:00', '14:45:00', 'เริ่มต้น Hack! (Kickoff): รับ Data จริง ทีมเริ่มลงมือพัฒนา', 'Hack kickoff: receive real data and start development', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 110, 1, NULL, NULL, '13.00 - 14.45 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '14:45:00', '15:30:00', 'Meet the Coach: พี่เลี้ยงพบ 4 ทีมที่ดูแล', 'Meet the Coach', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 120, 1, NULL, NULL, '14.45 - 15.30 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '15:30:00', '17:30:00', 'Domain and Technology Expert Consultation', 'Domain and Technology Expert Consultation', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 130, 1, NULL, NULL, '15.30 - 17.30 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '17:30:00', '17:45:00', 'Idea Development Checkpoint: ทบทวนเส้นทางไอเดีย + Overnight task brief · Feasibility × Impact', 'Idea Development Checkpoint: idea review and overnight task brief · Feasibility × Impact', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 140, 1, NULL, NULL, '17.30 - 17.45 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '17:45:00', '18:00:00', 'Pitching 101', 'Pitching 101', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 150, 1, NULL, NULL, '17.45 - 18.00 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '18:00:00', '21:00:00', 'รับประทานอาหารเย็น + Hack ต่อเนื่อง', 'Dinner and continued hacking', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 160, 1, NULL, NULL, 'หลังจาก 18.00 น.', NULL),

  (@schedule_id, @day_20260704, NULL, '09:00:00', '09:15:00', 'ลงทะเบียนเข้าร่วมงาน', 'Registration', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 210, 1, NULL, NULL, '09.00 - 09.15 น.', NULL),
  (@schedule_id, @day_20260704, NULL, '09:15:00', '10:00:00', 'Walk-in Session: Pre-pitch technology check', 'Walk-in Session: Pre-pitch technology check', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 220, 1, NULL, NULL, '09.15 - 10.00 น.', NULL),
  (@schedule_id, @day_20260704, NULL, '09:30:00', '12:00:00', 'Pre-pitch Progress Check พี่เลี้ยงพบทีม ตรวจสอบ pitch + ความพร้อมการนำเสนอ', 'Pre-pitch Progress Check: mentors review pitch and presentation readiness', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 230, 1, NULL, NULL, '09.30 - 12.00 น.', NULL),
  (@schedule_id, @day_20260704, NULL, '12:00:00', '13:00:00', 'รับประทานอาหารกลางวัน', 'Lunch', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 240, 1, NULL, NULL, '12.00 - 13.00 น.', NULL);

COMMIT;