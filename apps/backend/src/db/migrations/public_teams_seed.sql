-- New Public Teams for Lobby
-- Add this to 002_seed.sql or run this script to inject dummy public teams

-- 1. Insert Users for Public Teams
INSERT INTO `user_users` (`user_id`, `user_name`, `email`, `phone`, `university_name_th`, `university_name_en`, `first_name_th`, `last_name_th`, `first_name_en`, `last_name_en`, `is_active`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1013, 'alice', 'alice@gmail.com', '0900000001', 'มหาวิทยาลัยเกษตรศาสตร์', 'Kasetsart University', 'อลิซ', 'เอ', 'Alice', 'A', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1014, 'bob', 'bob@gmail.com', '0900000002', 'มหาวิทยาลัยขอนแก่น', 'Khon Kaen University', 'บ๊อบ', 'บี', 'Bob', 'B', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1015, 'charlie', 'charlie@gmail.com', '0900000003', 'มหาวิทยาลัยธรรมศาสตร์', 'Thammasat University', 'ชาลี', 'ซี', 'Charlie', 'C', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL);

-- 2. Insert Teams (Visibility: Public)
INSERT INTO `team_teams` (`team_id`, `team_code`, `team_name_th`, `team_name_en`, `visibility`, `current_leader_user_id`, `status`, `approved_at`, `selected_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(2004, 'TM2004', 'ทีมแมวเหมียว', 'Meow Team', 'public', 1013, 'forming', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(2005, 'TM2005', 'ทีมสายฟ้า', 'Lightning', 'public', 1014, 'forming', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(2006, 'TM2006', 'ทีมนกฮูก', 'Owl Squad', 'public', 1015, 'forming', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL);

-- 3. Set Users as Leaders for Their Teams
INSERT INTO `team_members` (`team_member_id`, `team_id`, `user_id`, `role`, `member_status`, `joined_at`, `left_at`) VALUES
(80010, 2004, 1013, 'leader', 'active', '2026-02-20 17:50:25', NULL),
(80011, 2005, 1014, 'leader', 'active', '2026-02-20 17:50:25', NULL),
(80012, 2006, 1015, 'leader', 'active', '2026-02-20 17:50:25', NULL);

-- 4. Insert Test User Without A Team
INSERT INTO `user_users` (`user_id`, `user_name`, `email`, `phone`, `university_name_th`, `university_name_en`, `first_name_th`, `last_name_th`, `first_name_en`, `last_name_en`, `is_active`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1016, 'david', 'david@gmail.com', '0900000004', 'จุฬาลงกรณ์มหาวิทยาลัย', 'Chulalongkorn University', 'เดวิด', 'ดี', 'David', 'D', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL);
