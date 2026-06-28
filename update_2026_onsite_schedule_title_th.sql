START TRANSACTION;

SET @schedule_id := (
  SELECT schedule_id
  FROM event_schedules
  WHERE schedule_code = '2026_ONSITE_TABLE'
  LIMIT 1
);

UPDATE event_schedules
SET
  schedule_name_th = 'กำหนดการวันงานจริง (Onsite) ณ อุทยานวิทยาศาสตร์ มหาวิทยาลัยขอนแก่น',
  schedule_name_en = 'Onsite Timetable',
  table_type = 'onsite_timetable',
  is_published = 1
WHERE schedule_id = @schedule_id;

INSERT INTO event_schedule_days
  (schedule_id, day_date, day_name_th, day_name_en, sort_order, is_enabled)
VALUES
  (@schedule_id, '2026-07-03', 'วันศุกร์ที่ 3 กรกฎาคม 2569 ณ อุทยานวิทยาศาสตร์ มหาวิทยาลัยขอนแก่น', 'Friday 3 July 2026', 10, 1),
  (@schedule_id, '2026-07-04', 'วันเสาร์ที่ 4 กรกฎาคม 2569 ณ อุทยานวิทยาศาสตร์ มหาวิทยาลัยขอนแก่น', 'Saturday 4 July 2026', 20, 1),
  (@schedule_id, '2026-07-05', 'วันอาทิตย์ที่ 5 กรกฎาคม 2569 ณ อุทยานวิทยาศาสตร์ มหาวิทยาลัยขอนแก่น', 'Sunday 5 July 2026', 30, 1)
ON DUPLICATE KEY UPDATE
  day_name_th = VALUES(day_name_th),
  day_name_en = VALUES(day_name_en),
  sort_order = VALUES(sort_order),
  is_enabled = VALUES(is_enabled);

SET @day_20260703 := (SELECT day_id FROM event_schedule_days WHERE schedule_id = @schedule_id AND day_date = '2026-07-03');
SET @day_20260704 := (SELECT day_id FROM event_schedule_days WHERE schedule_id = @schedule_id AND day_date = '2026-07-04');
SET @day_20260705 := (SELECT day_id FROM event_schedule_days WHERE schedule_id = @schedule_id AND day_date = '2026-07-05');

DELETE FROM event_schedule_items
WHERE schedule_id = @schedule_id;

INSERT INTO event_schedule_items
  (schedule_id, day_id, track_id, start_time, end_time, title_th, title_en, description_th, description_en, location_th, location_en, speaker_th, speaker_en, audience, is_highlight, sort_order, is_enabled, display_date_label_th, display_date_label_en, display_time_label_th, display_time_label_en)
VALUES
  (@schedule_id, @day_20260703, NULL, '09:00:00', '09:30:00', 'ลงทะเบียนเข้าร่วมงาน', 'Registration', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 10, 1, NULL, NULL, '09.00 - 09.30 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '09:30:00', '09:35:00', CONCAT('พิธีเปิดงาน ณ อุทยานวิทยาศาสตร์ มหาวิทยาลัยขอนแก่น', CHAR(10), 'กล่าวรายงานวัตถุประสงค์การจัดงานฯ', CHAR(10), 'โดย ดร.ฉัตรฉวี คงดี ผู้อำนวยการฝ่ายส่งเสริมนวัตกรรมและประสานเครือข่าย สถาบันข้อมูลขนาดใหญ่'), 'Opening ceremony and objective report', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 20, 1, NULL, NULL, '09.30 - 09.35 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '09:35:00', '09:45:00', CONCAT('กล่าวรายงานโครงการแข่งขัน BDI Young Innovator Hackathon ฯ', CHAR(10), 'โดย รองศาสตราจารย์สิริภัทร เชี่ยวชาญวัฒนา คณบดีวิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น'), 'BDI Young Innovator Hackathon project report', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 30, 1, NULL, NULL, '09.35 - 09.45 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '09:45:00', '10:00:00', CONCAT('กล่าวต้อนรับผู้เข้าร่วมงาน และภาคีเครือข่ายความร่วมมือ', CHAR(10), 'โดย รองศาสตราจารย์ภัทรวิทย์ พลพินิจ รองอธิการบดีฝ่ายทรัพยากรบุคคล มหาวิทยาลัยขอนแก่น'), 'Welcome remarks for participants and network partners', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 40, 1, NULL, NULL, '09.45 - 10.00 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '10:00:00', '10:20:00', CONCAT('กล่าวเปิดงานการแข่งขัน BDI Young Innovator Hackathon ฯ และงาน BDI Roadshow 2026', CHAR(10), 'จังหวัดขอนแก่น พร้อมบทบาทของ BDI สู่การสร้าง Data-driven Nation', CHAR(10), 'โดย ดร.สุนทรีย์ ส่งเสริม รองผู้อำนวยการสถาบันข้อมูลขนาดใหญ่'), 'Opening remarks for BDI Young Innovator Hackathon and BDI Roadshow 2026 Khon Kaen', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 50, 1, NULL, NULL, '10.00 - 10.20 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '10:20:00', '10:30:00', 'มอบโล่ให้กับภาคีเครือข่าย', 'Partner recognition plaque presentation', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 60, 1, NULL, NULL, '10.20 - 10.30 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '10:30:00', '10:40:00', 'ถ่ายภาพร่วมกัน และพักรับประทานอาหารว่าง', 'Group photo and coffee break', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 70, 1, NULL, NULL, '10.30 - 10.40 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '10:40:00', '11:10:00', CONCAT('บรรยายพิเศษ “เจาะลึกทิศทางตลาดแรงงาน สำรวจกลุ่มอาชีพดาวรุ่ง ในสายงาน AI และ Big Data”', CHAR(10), 'โดย คุณโอชวิน จิรโสตติกุล CEO และผู้ก่อตั้ง FutureSkill'), 'Special talk on labor market trends and rising careers in AI and Big Data', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 80, 1, NULL, NULL, '10.40 - 11.10 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '11:10:00', '12:00:00', CONCAT('เสวนา “Career Journey เส้นทางอาชีพ AI และ Big Data” และ Q&A โดย', CHAR(10), '• รองศาสตราจารย์สิริภัทร เชี่ยวชาญวัฒนา คณบดีวิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น', CHAR(10), '• คุณโอชวิน จิรโสตติกุล CEO และผู้ก่อตั้ง FutureSkill', CHAR(10), '• คุณปฏิภาณ ประเสริฐสม Expert Data Scientist, สถาบันข้อมูลขนาดใหญ่', CHAR(10), '• คุณชยสิน แซ่เตีย Senior Data Engineer, สถาบันข้อมูลขนาดใหญ่'), 'Panel discussion: Career Journey in AI and Big Data with Q&A', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 90, 1, NULL, NULL, '11.10 - 12.00 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '12:00:00', '13:00:00', 'รับประทานอาหารกลางวัน', 'Lunch', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 100, 1, NULL, NULL, '12.00 - 13.00 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '13:00:00', '14:30:00', 'Data Orientation Workshop: เสวนา Pain Points จากผู้เชี่ยวชาญ 3 สาย และเกณฑ์การพิจารณาผลงาน', 'Data Orientation Workshop', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 110, 1, NULL, NULL, '13.00 - 14.30 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '14:45:00', '15:15:00', 'Problem Framing Workshop: แต่ละทีมกำหนดปัญหาและขอบเขตโจทย์ (Problem Statement) พร้อมรับ Feedback จาก Mentor', 'Problem Framing Workshop', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 120, 1, NULL, NULL, '14.45 - 15.15 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '15:15:00', '15:20:00', 'พักรับประทานอาหารว่าง', 'Coffee break', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 130, 1, NULL, NULL, '15.15 - 15.20 น.', NULL),
  (@schedule_id, @day_20260703, NULL, '15:30:00', '21:00:00', CONCAT('- เริ่มต้น Hack! (Kickoff): ทีมเริ่มลงมือพัฒนา', CHAR(10), '- Mentor Walk-in Session #1 Mentor หมุนเวียนเยี่ยมแต่ละทีม ให้คำปรึกษาด้าน Technical / Domain / Business', CHAR(10), '- Hack Night Session: ช่วงพัฒนาต่อเนื่อง', CHAR(10), '- เทคนิคการนำเสนอ: Storytelling / Demo by Stellar ก่อนทานอาหารเย็น'), 'Hack kickoff, Mentor Walk-in Session #1, Hack Night Session and presentation technique', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 140, 1, NULL, NULL, '15.30 - 21.00 น.', NULL),

  (@schedule_id, @day_20260704, NULL, '09:00:00', '09:15:00', 'ลงทะเบียนเข้าร่วมงาน', 'Registration', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 210, 1, NULL, NULL, '09.00 - 09.15 น.', NULL),
  (@schedule_id, @day_20260704, NULL, '09:15:00', '12:00:00', 'Mentor Walk-in Session #2: พี่เลี้ยงช่วยดูแลแต่ละทีม', 'Mentor Walk-in Session #2', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 220, 1, NULL, NULL, '09.15 - 12.00 น.', NULL),
  (@schedule_id, @day_20260704, NULL, '12:00:00', '13:00:00', 'รับประทานอาหารกลางวัน', 'Lunch', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 230, 1, NULL, NULL, '12.00 - 13.00 น.', NULL),
  (@schedule_id, @day_20260704, NULL, '13:00:00', '13:30:00', 'ปิดรับผลงาน ทีมส่ง Repository / Demo Link / Slide', 'Submission deadline for Repository, Demo Link and Slide', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 240, 1, NULL, NULL, '11:00 - 13.30 น.', NULL),
  (@schedule_id, @day_20260704, NULL, '13:30:00', '17:30:00', 'Final Pitching: แต่ละทีมนำเสนอผลงาน 5 นาที + Q&A 5 นาที ต่อหน้าคณะกรรมการ', 'Final pitching', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 250, 1, NULL, NULL, '13.30 - 17.30 น.', NULL),
  (@schedule_id, @day_20260704, NULL, '17:30:00', '18:00:00', 'คณะกรรมการพิจารณาตัดสิน', 'Judging session', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 260, 1, NULL, NULL, '17.30 - 18.00 น.', NULL),
  (@schedule_id, @day_20260704, NULL, '18:00:00', '18:30:00', CONCAT('พิธีอัญเชิญถ้วยพระราชทานสมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ', CHAR(10), '- เชิญถ้วยพระราชทานผู้ชนะเลิศการแข่งขัน', CHAR(10), 'โดย ดร.สุนทรีย์ ส่งเสริม รองผู้อำนวยการสถาบันข้อมูลขนาดใหญ่', CHAR(10), '- เปิดกรวยดอกไม้ เบื้องหน้าพระบรมฉายาลักษณ์ สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ เจ้าฟ้ามหาจักรีสิรินธรฯ สยามบรมราชกุมารี', CHAR(10), 'โดย รองศาสตราจารย์ชาญชัย พานทองวิริยะกุล อธิการบดีมหาวิทยาลัยขอนแก่น'), 'Royal trophy procession and ceremonial offering', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 270, 1, NULL, NULL, '18.00 - 18.30 น.', NULL),
  (@schedule_id, @day_20260704, NULL, '18:30:00', '21:00:00', CONCAT('- พิธีมอบถ้วยพระราชทานแก่ผู้ชนะการแข่งขัน BDI Young Innovator Hackathon', CHAR(10), '1) ผู้ชนะเลิศการแข่งขัน รับถ้วยรางวัลพระราชทานและเงินรางวัล', CHAR(10), '   รับถ้วยรางวัลพระราชทานเบื้องหน้าพระบรมฉายาลักษณ์', CHAR(10), '2) รองชนะเลิศอันดับที่ 1 รับถ้วยรางวัลและเงินรางวัล', CHAR(10), '   มอบโดย รองศาสตราจารย์ชาญชัย พานทองวิริยะกุล อธิการบดีมหาวิทยาลัยขอนแก่น', CHAR(10), '3) รองชนะเลิศอันดับที่ 2 รับถ้วยรางวัลและเงินรางวัล', CHAR(10), '   มอบโดย ดร.สุนทรีย์ ส่งเสริม รองผู้อำนวยการสถาบันข้อมูลขนาดใหญ่', CHAR(10), '- พิธีปิดโครงการ', CHAR(10), '- รับประทานอาหารเย็นร่วมกัน'), 'Award ceremony, closing ceremony and dinner', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 280, 1, NULL, NULL, '18.30 - 21.00 น.', NULL),

  (@schedule_id, @day_20260705, NULL, '08:00:00', '08:30:00', 'ลงทะเบียนเข้าร่วมงาน', 'Registration', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 310, 1, NULL, NULL, '08.00 - 08.30 น.', NULL),
  (@schedule_id, @day_20260705, NULL, '08:30:00', '12:00:00', 'กิจกรรม Learning City Tour พิพิธภัณฑ์ธนารักษ์ จังหวัดขอนแก่น และอาคารแก่น', 'Learning City Tour', NULL, NULL, NULL, NULL, NULL, NULL, 'public', 0, 320, 1, NULL, NULL, '08.30 - 12.00 น.', NULL);

COMMIT;
