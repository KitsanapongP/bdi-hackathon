-- dev seed for export test (20 submitted teams, 5 members/team, 3 tasks)
-- safe to run multiple times (will clear same ID range first)

START TRANSACTION;

SET @seed_admin_user_id := 1001;

-- ID ranges (reserved for this seed)
SET @u_start := 950001;   -- users 950001..950100 (100 users)
SET @t_start := 960001;   -- teams 960001..960020
SET @m_start := 970001;   -- team_members
SET @a_start := 980001;   -- team_advisors
SET @vr_start := 990001;  -- verify_review_rounds
SET @vp_start := 995001;  -- verify_member_profiles
SET @vd_start := 996001;  -- verify_member_documents
SET @tsf_start := 997001; -- team_submission_files
SET @tst_start := 998001; -- team_submission_tasks
SET @st1 := 949001;       -- submission_task_id #1
SET @st2 := 949002;       -- submission_task_id #2
SET @st3 := 949003;       -- submission_task_id #3

/*****************************
  0) cleanup old same-range
*****************************/
DELETE FROM team_submission_files
WHERE file_id BETWEEN @tsf_start AND (@tsf_start + 9999);

DELETE FROM verify_member_documents
WHERE document_id BETWEEN @vd_start AND (@vd_start + 9999);

DELETE FROM verify_member_profiles
WHERE verify_profile_id BETWEEN @vp_start AND (@vp_start + 9999);

DELETE FROM verify_review_rounds
WHERE verify_round_id BETWEEN @vr_start AND (@vr_start + 9999);

DELETE FROM team_advisors
WHERE advisor_id BETWEEN @a_start AND (@a_start + 9999);

DELETE FROM team_members
WHERE team_member_id BETWEEN @m_start AND (@m_start + 99999);

DELETE FROM team_submission_tasks
WHERE team_submission_task_id BETWEEN @tst_start AND (@tst_start + 99999);

DELETE FROM team_team_codes
WHERE team_code_id BETWEEN 969001 AND 969999;

DELETE FROM team_teams
WHERE team_id BETWEEN @t_start AND (@t_start + 9999);

DELETE FROM user_users
WHERE user_id BETWEEN @u_start AND (@u_start + 9999);

DELETE FROM submission_tasks
WHERE submission_task_id IN (@st1, @st2, @st3);

/*****************************
  1) submission tasks (3 tasks)
*****************************/
INSERT INTO submission_tasks
(
  submission_task_id,
  task_name,
  description,
  task_type,
  stage,
  is_required,
  allowed_extensions,
  sort_order,
  deadline_at,
  is_enabled,
  is_default,
  created_by_user_id,
  created_at,
  updated_at,
  deleted_at
)
VALUES
(
  @st1,
  'SEED_EXPORT_Task_01_Project_Proposal',
  'Proposal document for judge review',
  'file',
  'pre_selection',
  1,
  '.pdf,.docx',
  1,
  NULL,
  1,
  0,
  @seed_admin_user_id,
  NOW(),
  NOW(),
  NULL
),
(
  @st2,
  'SEED_EXPORT_Task_02_Slide_Deck',
  'Pitch deck slides',
  'file',
  'pre_selection',
  1,
  '.pdf,.ppt,.pptx',
  2,
  NULL,
  1,
  0,
  @seed_admin_user_id,
  NOW(),
  NOW(),
  NULL
),
(
  @st3,
  'SEED_EXPORT_Task_03_Demo_Asset',
  'Demo asset or appendix file',
  'file',
  'pre_selection',
  0,
  '.pdf,.zip,.mp4',
  3,
  NULL,
  1,
  0,
  @seed_admin_user_id,
  NOW(),
  NOW(),
  NULL
);

/*****************************
  1.5) temp sequence tables (MariaDB-safe)
*****************************/
DROP TEMPORARY TABLE IF EXISTS tmp_seq_100;
CREATE TEMPORARY TABLE tmp_seq_100 (
  n INT NOT NULL PRIMARY KEY
);

INSERT INTO tmp_seq_100 (n)
SELECT ones.n + tens.n * 10 + 1
FROM
  (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) ones
CROSS JOIN
  (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) tens
WHERE (ones.n + tens.n * 10) < 100
ORDER BY 1;

DROP TEMPORARY TABLE IF EXISTS tmp_team_20;
CREATE TEMPORARY TABLE tmp_team_20 (
  team_no INT NOT NULL PRIMARY KEY
);

INSERT INTO tmp_team_20 (team_no)
SELECT n FROM tmp_seq_100 WHERE n <= 20;

DROP TEMPORARY TABLE IF EXISTS tmp_team_member_100;
CREATE TEMPORARY TABLE tmp_team_member_100 (
  team_no INT NOT NULL,
  member_idx INT NOT NULL,
  PRIMARY KEY (team_no, member_idx)
);

INSERT INTO tmp_team_member_100 (team_no, member_idx)
SELECT
  FLOOR((n - 1) / 5) + 1 AS team_no,
  MOD((n - 1), 5) AS member_idx
FROM tmp_seq_100
ORDER BY n;

DROP TEMPORARY TABLE IF EXISTS tmp_team_task_60;
CREATE TEMPORARY TABLE tmp_team_task_60 (
  team_no INT NOT NULL,
  task_no INT NOT NULL,
  PRIMARY KEY (team_no, task_no)
);

INSERT INTO tmp_team_task_60 (team_no, task_no)
SELECT t.team_no, task_map.task_no
FROM tmp_team_20 t
CROSS JOIN (
  SELECT 1 AS task_no UNION ALL SELECT 2 UNION ALL SELECT 3
) task_map
ORDER BY t.team_no, task_map.task_no;

/*****************************
  2) create 100 users (for 20 teams x 5 members)
*****************************/
INSERT INTO user_users
(
  user_id,
  user_name,
  email,
  phone,
  institution_name_th,
  institution_name_en,
  first_name_th,
  last_name_th,
  first_name_en,
  last_name_en,
  gender,
  birth_date,
  education_level,
  home_province,
  is_active,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  (@u_start + n - 1) AS user_id,
  CONCAT('seed_export_user_', LPAD(n, 3, '0')) AS user_name,
  CONCAT('seed.export.user.', LPAD(n, 3, '0'), '@example.com') AS email,
  CONCAT('09', LPAD(n, 8, '0')) AS phone,
  CASE (n % 5)
    WHEN 0 THEN 'มหาวิทยาลัยขอนแก่น'
    WHEN 1 THEN 'จุฬาลงกรณ์มหาวิทยาลัย'
    WHEN 2 THEN 'มหาวิทยาลัยเชียงใหม่'
    WHEN 3 THEN 'มหาวิทยาลัยธรรมศาสตร์'
    ELSE 'มหาวิทยาลัยเกษตรศาสตร์'
  END AS institution_name_th,
  CASE (n % 5)
    WHEN 0 THEN 'Khon Kaen University'
    WHEN 1 THEN 'Chulalongkorn University'
    WHEN 2 THEN 'Chiang Mai University'
    WHEN 3 THEN 'Thammasat University'
    ELSE 'Kasetsart University'
  END AS institution_name_en,
  CONCAT('ชื่อ', LPAD(n, 3, '0')) AS first_name_th,
  CONCAT('ทดสอบ', LPAD(n, 3, '0')) AS last_name_th,
  CONCAT('SeedFirst', LPAD(n, 3, '0')) AS first_name_en,
  CONCAT('SeedLast', LPAD(n, 3, '0')) AS last_name_en,
  CASE (n % 3)
    WHEN 0 THEN 'male'
    WHEN 1 THEN 'female'
    ELSE 'other'
  END AS gender,
  DATE_ADD('2003-01-01', INTERVAL (n % 400) DAY) AS birth_date,
  CASE WHEN (n % 2)=0 THEN 'bachelor' ELSE 'high_school' END AS education_level,
  CASE (n % 6)
    WHEN 0 THEN 'ขอนแก่น'
    WHEN 1 THEN 'กรุงเทพมหานคร'
    WHEN 2 THEN 'เชียงใหม่'
    WHEN 3 THEN 'นครราชสีมา'
    WHEN 4 THEN 'อุบลราชธานี'
    ELSE 'สงขลา'
  END AS home_province,
  1 AS is_active,
  NOW(),
  NOW(),
  NULL
FROM tmp_seq_100;

/*****************************
  3) create 20 teams (all submitted) + meaningful video links
*****************************/
INSERT INTO team_teams
(
  team_id,
  team_code,
  team_name_th,
  team_name_en,
  visibility,
  current_leader_user_id,
  status,
  confirmation_deadline_at,
  confirmed_at,
  confirmed_by_user_id,
  created_at,
  updated_at,
  deleted_at,
  disbanded_at,
  disbanded_by_user_id,
  disband_reason,
  video_link
)
SELECT
  (@t_start + team_no - 1) AS team_id,
  CONCAT('SX', LPAD(team_no, 4, '0')) AS team_code,
  CONCAT('ทีมทดสอบส่งออก ', LPAD(team_no, 2, '0')) AS team_name_th,
  CONCAT('Export Test Team ', LPAD(team_no, 2, '0')) AS team_name_en,
  'private' AS visibility,
  (@u_start + ((team_no - 1) * 5)) AS current_leader_user_id,
  'submitted' AS status,
  NULL AS confirmation_deadline_at,
  NULL AS confirmed_at,
  NULL AS confirmed_by_user_id,
  DATE_SUB(NOW(), INTERVAL (30 - team_no) DAY) AS created_at,
  DATE_SUB(NOW(), INTERVAL (5 - (team_no % 5)) DAY) AS updated_at,
  NULL, NULL, NULL, NULL,
  CONCAT(
    'https://www.youtube.com/watch?v=seed_export_team_',
    LPAD(team_no, 2, '0'),
    '_smart-health-demo'
  ) AS video_link
FROM tmp_team_20;

/*****************************
  4) team codes
*****************************/
INSERT INTO team_team_codes
(
  team_code_id,
  team_id,
  invite_code,
  is_active,
  expires_at,
  created_at,
  created_by_user_id
)
SELECT
  (969000 + team_no) AS team_code_id,
  (@t_start + team_no - 1) AS team_id,
  CONCAT('SEED', LPAD(team_no, 2, '0')) AS invite_code,
  1,
  NULL,
  NOW(),
  (@u_start + ((team_no - 1) * 5)) AS created_by_user_id
FROM tmp_team_20;

/*****************************
  5) team members (20 teams x 5 = 100 rows)
*****************************/
INSERT INTO team_members
(
  team_member_id,
  team_id,
  user_id,
  role,
  member_status,
  joined_at,
  left_at
)
SELECT
  (@m_start + ((team_no - 1) * 5) + member_idx) AS team_member_id,
  (@t_start + team_no - 1) AS team_id,
  (@u_start + ((team_no - 1) * 5) + member_idx) AS user_id,
  CASE WHEN member_idx = 0 THEN 'leader' ELSE 'member' END AS role,
  'active' AS member_status,
  DATE_SUB(NOW(), INTERVAL (40 - team_no) DAY) AS joined_at,
  NULL AS left_at
FROM tmp_team_member_100;

/*****************************
  6) advisors (1 per team)
*****************************/
INSERT INTO team_advisors
(
  advisor_id,
  team_id,
  prefix,
  first_name_th,
  last_name_th,
  first_name_en,
  last_name_en,
  email,
  phone,
  institution_name_th,
  added_by_user_id,
  created_at,
  updated_at
)
SELECT
  (@a_start + team_no - 1) AS advisor_id,
  (@t_start + team_no - 1) AS team_id,
  'อ.',
  CONCAT('อาจารย์', LPAD(team_no, 2, '0')),
  'ที่ปรึกษา',
  CONCAT('Advisor', LPAD(team_no, 2, '0')),
  'Mentor',
  CONCAT('advisor.export.', LPAD(team_no, 2, '0'), '@example.com'),
  CONCAT('08123', LPAD(team_no, 5, '0')),
  'มหาวิทยาลัยขอนแก่น',
  (@u_start + ((team_no - 1) * 5)),
  NOW(),
  NOW()
FROM tmp_team_20;

/*****************************
  7) assign 3 tasks per team (60 rows)
*****************************/
INSERT INTO team_submission_tasks
(
  team_submission_task_id,
  team_id,
  submission_task_id,
  link_url,
  is_submission_open,
  assigned_by_user_id,
  assigned_source,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  (@tst_start + ((team_no - 1) * 3) + (task_no - 1)) AS team_submission_task_id,
  (@t_start + team_no - 1) AS team_id,
  CASE task_no
    WHEN 1 THEN @st1
    WHEN 2 THEN @st2
    ELSE @st3
  END AS submission_task_id,
  NULL AS link_url,
  1 AS is_submission_open,
  @seed_admin_user_id,
  'admin_status',
  NOW(),
  NOW(),
  NULL
FROM tmp_team_task_60;

/*****************************
  8) submission files (3 files/team => 60 rows)
*****************************/
INSERT INTO team_submission_files
(
  file_id,
  team_id,
  team_submission_task_id,
  file_storage_key,
  file_original_name,
  file_mime_type,
  file_size_bytes,
  uploaded_by_user_id,
  uploaded_at,
  deleted_at
)
SELECT
  (@tsf_start + ((team_no - 1) * 3) + (task_no - 1)) AS file_id,
  (@t_start + team_no - 1) AS team_id,
  (@tst_start + ((team_no - 1) * 3) + (task_no - 1)) AS team_submission_task_id,
  CONCAT(
    'uploads/verification/SEED_EXPORT_TEAM_',
    LPAD(team_no, 2, '0'),
    '/submission_files/task_',
    task_no,
    '_team_',
    LPAD(team_no, 2, '0'),
    '.pdf'
  ) AS file_storage_key,
  CASE task_no
    WHEN 1 THEN CONCAT('Project_Proposal_Team_', LPAD(team_no, 2, '0'), '.pdf')
    WHEN 2 THEN CONCAT('Pitch_Deck_Team_', LPAD(team_no, 2, '0'), '.pptx')
    ELSE CONCAT('Demo_Appendix_Team_', LPAD(team_no, 2, '0'), '.pdf')
  END AS file_original_name,
  CASE task_no
    WHEN 2 THEN 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ELSE 'application/pdf'
  END AS file_mime_type,
  CASE task_no WHEN 1 THEN 420000 WHEN 2 THEN 980000 ELSE 210000 END AS file_size_bytes,
  (@u_start + ((team_no - 1) * 5)) AS uploaded_by_user_id,
  DATE_SUB(NOW(), INTERVAL (20 - team_no) DAY) AS uploaded_at,
  NULL
FROM tmp_team_task_60;

/*****************************
  9) verification rounds (1 round/team)
*****************************/
INSERT INTO verify_review_rounds
(
  verify_round_id,
  team_id,
  round_no,
  status,
  created_by_user_id,
  created_at,
  locked_at,
  submitted_at,
  returned_at,
  completed_at,
  note
)
SELECT
  (@vr_start + team_no - 1) AS verify_round_id,
  (@t_start + team_no - 1) AS team_id,
  1 AS round_no,
  'submitted' AS status,
  (@u_start + ((team_no - 1) * 5)) AS created_by_user_id,
  DATE_SUB(NOW(), INTERVAL (22 - team_no) DAY) AS created_at,
  DATE_SUB(NOW(), INTERVAL (21 - team_no) DAY) AS locked_at,
  DATE_SUB(NOW(), INTERVAL (20 - team_no) DAY) AS submitted_at,
  NULL,
  NULL,
  'SEED export test round'
FROM tmp_team_20;

/*****************************
  10) verify member profiles (100 rows)
*****************************/
INSERT INTO verify_member_profiles
(
  verify_profile_id,
  verify_round_id,
  team_id,
  user_id,
  national_id_hash,
  birth_date,
  address_text,
  extra_data_json,
  is_profile_complete,
  is_member_confirmed,
  member_confirmed_at,
  member_unconfirmed_at,
  completed_at,
  updated_at
)
SELECT
  (@vp_start + ((team_no - 1) * 5) + member_idx) AS verify_profile_id,
  (@vr_start + team_no - 1) AS verify_round_id,
  (@t_start + team_no - 1) AS team_id,
  (@u_start + ((team_no - 1) * 5) + member_idx) AS user_id,
  NULL,
  DATE_ADD('2003-01-01', INTERVAL ((team_no * 7 + member_idx) % 400) DAY),
  CONCAT('SEED Address Team ', LPAD(team_no,2,'0'), ' Member ', member_idx + 1),
  NULL,
  1 AS is_profile_complete,
  1 AS is_member_confirmed,
  DATE_SUB(NOW(), INTERVAL (10 - (team_no % 5)) DAY),
  NULL,
  DATE_SUB(NOW(), INTERVAL (12 - (team_no % 5)) DAY),
  NOW()
FROM tmp_team_member_100;

/*****************************
  11) verify member documents (100 rows, 1 per member, requirement_id=5002)
*****************************/
INSERT INTO verify_member_documents
(
  document_id,
  verify_round_id,
  team_id,
  user_id,
  requirement_id,
  file_storage_key,
  file_original_name,
  file_mime_type,
  file_size_bytes,
  file_checksum_sha256,
  is_current,
  replaced_by_document_id,
  uploaded_at,
  uploaded_by_user_id,
  deleted_at
)
SELECT
  (@vd_start + ((team_no - 1) * 5) + member_idx) AS document_id,
  (@vr_start + team_no - 1) AS verify_round_id,
  (@t_start + team_no - 1) AS team_id,
  (@u_start + ((team_no - 1) * 5) + member_idx) AS user_id,
  5002 AS requirement_id,
  CONCAT(
    'verification/SEED_EXPORT_TEAM_',
    LPAD(team_no,2,'0'),
    '/member_',
    (member_idx + 1),
    '/student_id_team_',
    LPAD(team_no,2,'0'),
    '_member_',
    (member_idx + 1),
    '.pdf'
  ) AS file_storage_key,
  CONCAT(
    'Student_ID_Team_',
    LPAD(team_no,2,'0'),
    '_Member_',
    (member_idx + 1),
    '.pdf'
  ) AS file_original_name,
  'application/pdf' AS file_mime_type,
  180000 AS file_size_bytes,
  NULL AS file_checksum_sha256,
  1 AS is_current,
  NULL AS replaced_by_document_id,
  DATE_SUB(NOW(), INTERVAL (18 - team_no) DAY) AS uploaded_at,
  (@u_start + ((team_no - 1) * 5) + member_idx) AS uploaded_by_user_id,
  NULL AS deleted_at
FROM tmp_team_member_100;

DROP TEMPORARY TABLE IF EXISTS tmp_team_task_60;
DROP TEMPORARY TABLE IF EXISTS tmp_team_member_100;
DROP TEMPORARY TABLE IF EXISTS tmp_team_20;
DROP TEMPORARY TABLE IF EXISTS tmp_seq_100;

COMMIT;

-- quick checks
SELECT status, COUNT(*) AS team_count
FROM team_teams
WHERE team_id BETWEEN @t_start AND (@t_start + 19)
GROUP BY status;

SELECT team_id, COUNT(*) AS member_count
FROM team_members
WHERE team_id BETWEEN @t_start AND (@t_start + 19)
  AND member_status = 'active'
GROUP BY team_id
ORDER BY team_id;

SELECT COUNT(*) AS assigned_tasks
FROM team_submission_tasks
WHERE team_submission_task_id BETWEEN @tst_start AND (@tst_start + 99999);

SELECT COUNT(*) AS submission_files
FROM team_submission_files
WHERE file_id BETWEEN @tsf_start AND (@tsf_start + 9999);
