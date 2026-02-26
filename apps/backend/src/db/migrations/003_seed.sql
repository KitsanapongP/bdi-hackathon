-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 27, 2026 at 12:38 AM
-- Server version: 10.11.11-MariaDB-0+deb12u1-log
-- PHP Version: 8.4.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `drnadech_hackathon2026`
--

-- --------------------------------------------------------

--
-- Table structure for table `access_allowlist`
--

CREATE TABLE `access_allowlist` (
  `allow_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of allowlist record',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (user who receives special access)',
  `access_role` enum('admin','judge') NOT NULL COMMENT 'Access role: admin=admin UI, judge=judge/reviewer UI',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this allowlist entry is active (1=active,0=disabled)',
  `note` varchar(255) DEFAULT NULL COMMENT 'Optional note (e.g., reason, department)',
  `granted_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When access was granted',
  `granted_by_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to user_users who granted access (nullable if set directly in DB)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Allowlist granting admin/judge access to specific users';

--
-- Dumping data for table `access_allowlist`
--

INSERT INTO `access_allowlist` (`allow_id`, `user_id`, `access_role`, `is_active`, `note`, `granted_at`, `granted_by_user_id`) VALUES
(190001, 1001, 'admin', 1, 'System admin', '2026-02-20 17:50:25', NULL),
(190002, 1009, 'judge', 1, 'Judge 1', '2026-02-20 17:50:25', 1001),
(190003, 1010, 'judge', 1, 'Judge 2', '2026-02-20 17:50:25', 1001);

-- --------------------------------------------------------

--
-- Table structure for table `content_contacts`
--

CREATE TABLE `content_contacts` (
  `contact_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of contact record',
  `contact_name_th` varchar(255) NOT NULL COMMENT 'Contact name (Thai)',
  `contact_name_en` varchar(255) NOT NULL COMMENT 'Contact name (English)',
  `role_th` varchar(255) DEFAULT NULL COMMENT 'Role/title (Thai) (e.g., ผู้ประสานงาน)',
  `role_en` varchar(255) DEFAULT NULL COMMENT 'Role/title (English) (e.g., Coordinator)',
  `email` varchar(255) DEFAULT NULL COMMENT 'Contact email',
  `phone` varchar(50) DEFAULT NULL COMMENT 'Contact phone number',
  `line_id` varchar(100) DEFAULT NULL COMMENT 'LINE ID or contact',
  `facebook_url` varchar(500) DEFAULT NULL COMMENT 'Facebook page/profile URL',
  `other_url` varchar(500) DEFAULT NULL COMMENT 'Other contact URL (optional)',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Sort order for display (lower first)',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this contact is visible on website',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contact persons/channels shown on website';

-- --------------------------------------------------------

--
-- Table structure for table `content_pages`
--

CREATE TABLE `content_pages` (
  `page_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of content page',
  `page_code` varchar(50) NOT NULL COMMENT 'Stable page code (e.g., ABOUT, FAQ, RULES)',
  `title_th` varchar(255) NOT NULL COMMENT 'Page title (Thai)',
  `title_en` varchar(255) NOT NULL COMMENT 'Page title (English)',
  `content_html_th` longtext DEFAULT NULL COMMENT 'Page HTML content (Thai)',
  `content_html_en` longtext DEFAULT NULL COMMENT 'Page HTML content (English)',
  `is_published` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether page is published/visible',
  `published_at` datetime DEFAULT NULL COMMENT 'When page was published',
  `created_by_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to user_users (admin/editor who created/updated)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Static content pages (About/FAQ/Rules)';

--
-- Dumping data for table `content_pages`
--

INSERT INTO `content_pages` (`page_id`, `page_code`, `title_th`, `title_en`, `content_html_th`, `content_html_en`, `is_published`, `published_at`, `created_by_user_id`, `created_at`, `updated_at`) VALUES
(1, 'ABOUT', 'เกี่ยวกับกิจกรรม', 'About', '<p>รายละเอียดกิจกรรม (แก้ไขได้จากฐานข้อมูล)</p>', '<p>Event details (editable from database)</p>', 1, '2026-02-27 00:36:42', NULL, '2026-02-27 00:36:42', '2026-02-27 00:36:42'),
(2, 'CONTACT', 'ติดต่อ', 'Contact', '<p>ช่องทางติดต่อ (แก้ไขได้จากฐานข้อมูล)</p>', '<p>Contact info (editable from database)</p>', 1, '2026-02-27 00:36:42', NULL, '2026-02-27 00:36:42', '2026-02-27 00:36:42');

-- --------------------------------------------------------

--
-- Table structure for table `content_rewards`
--

CREATE TABLE `content_rewards` (
  `reward_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of reward',
  `reward_rank` varchar(50) NOT NULL COMMENT 'Reward rank/position label (e.g., 1, 2, 3, HM)',
  `reward_name_th` varchar(255) NOT NULL COMMENT 'Reward name/title (Thai)',
  `reward_name_en` varchar(255) NOT NULL COMMENT 'Reward name/title (English)',
  `prize_amount` decimal(12,2) DEFAULT NULL COMMENT 'Prize amount numeric (nullable if not a cash prize)',
  `prize_currency` varchar(10) DEFAULT NULL COMMENT 'Currency code (e.g., THB)',
  `prize_text_th` varchar(255) DEFAULT NULL COMMENT 'Prize text (Thai) (e.g., โล่ + ของรางวัล)',
  `prize_text_en` varchar(255) DEFAULT NULL COMMENT 'Prize text (English)',
  `description_th` text DEFAULT NULL COMMENT 'Reward description (Thai)',
  `description_en` text DEFAULT NULL COMMENT 'Reward description (English)',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Sort order for display (lower first)',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether reward is visible on website',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Rewards/prizes shown on website';

-- --------------------------------------------------------

--
-- Table structure for table `content_sponsors`
--

CREATE TABLE `content_sponsors` (
  `sponsor_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of sponsor',
  `sponsor_name_th` varchar(255) NOT NULL COMMENT 'Sponsor name (Thai)',
  `sponsor_name_en` varchar(255) NOT NULL COMMENT 'Sponsor name (English)',
  `logo_storage_key` varchar(500) NOT NULL COMMENT 'Storage key/path for sponsor logo image',
  `website_url` varchar(500) DEFAULT NULL COMMENT 'Sponsor website URL',
  `tier_code` varchar(50) DEFAULT NULL COMMENT 'Sponsor tier/level code (e.g., platinum, gold, silver)',
  `tier_name_th` varchar(255) DEFAULT NULL COMMENT 'Sponsor tier display name (Thai)',
  `tier_name_en` varchar(255) DEFAULT NULL COMMENT 'Sponsor tier display name (English)',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Sort order for display (lower first)',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether sponsor is visible on website',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sponsors shown on website';

-- --------------------------------------------------------

--
-- Table structure for table `drive_audit_logs`
--

CREATE TABLE `drive_audit_logs` (
  `drive_audit_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of drive audit log entry',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams',
  `actor_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who performed the action',
  `folder_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to drive_folders (if action relates to folder)',
  `file_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to drive_files (if action relates to file)',
  `action_code` varchar(100) NOT NULL COMMENT 'Action code (e.g., FOLDER_CREATED, FILE_UPLOADED, FILE_DELETED, FILE_REPLACED)',
  `action_detail` text DEFAULT NULL COMMENT 'Additional details as JSON/string for auditing',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When action occurred'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for team drive actions';

--
-- Dumping data for table `drive_audit_logs`
--

INSERT INTO `drive_audit_logs` (`drive_audit_id`, `team_id`, `actor_user_id`, `folder_id`, `file_id`, `action_code`, `action_detail`, `created_at`) VALUES
(180001, 2003, 1007, 160002, NULL, 'FOLDER_CREATED', NULL, '2026-02-20 17:50:25'),
(180002, 2003, 1007, 160002, 170001, 'FILE_UPLOADED', NULL, '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `drive_files`
--

CREATE TABLE `drive_files` (
  `file_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of file record',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (file belongs to a team)',
  `folder_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to drive_folders (parent folder)',
  `uploaded_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who uploaded',
  `file_name` varchar(255) NOT NULL COMMENT 'Display file name (can be original name)',
  `file_original_name` varchar(255) NOT NULL COMMENT 'Original uploaded file name',
  `file_storage_key` varchar(500) NOT NULL COMMENT 'Storage key/path (e.g., S3 key or local path reference)',
  `file_mime_type` varchar(100) DEFAULT NULL COMMENT 'MIME type of uploaded file',
  `file_size_bytes` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'File size in bytes',
  `file_checksum_sha256` varchar(128) DEFAULT NULL COMMENT 'SHA-256 checksum (optional for integrity/audit)',
  `is_current` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this is the current/latest version for this file logical group',
  `replaced_by_file_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'If replaced, points to the new file record',
  `uploaded_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When file was uploaded',
  `deleted_at` datetime DEFAULT NULL COMMENT 'Soft delete timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Team shared files (supports replace/version via replaced_by_file_id)';

--
-- Dumping data for table `drive_files`
--

INSERT INTO `drive_files` (`file_id`, `team_id`, `folder_id`, `uploaded_by_user_id`, `file_name`, `file_original_name`, `file_storage_key`, `file_mime_type`, `file_size_bytes`, `file_checksum_sha256`, `is_current`, `replaced_by_file_id`, `uploaded_at`, `deleted_at`) VALUES
(170001, 2003, 160002, 1007, 'pitch_deck_v1.pdf', 'pitch_deck.pdf', 'drive/2003/final/pitch_deck_v1.pdf', 'application/pdf', 345678, NULL, 1, NULL, '2026-02-20 17:50:25', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `drive_folders`
--

CREATE TABLE `drive_folders` (
  `folder_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of folder',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (folder belongs to a team)',
  `parent_folder_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to drive_folders (null = root folder)',
  `folder_name_th` varchar(255) NOT NULL COMMENT 'Folder name (Thai) for display',
  `folder_name_en` varchar(255) NOT NULL COMMENT 'Folder name (English) for display',
  `folder_path_cache` varchar(1024) DEFAULT NULL COMMENT 'Optional cached full path for faster listing (can be rebuilt)',
  `is_root` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this folder is the team root folder',
  `created_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who created the folder',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp',
  `deleted_at` datetime DEFAULT NULL COMMENT 'Soft delete timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Team shared folders (nested supported)';

--
-- Dumping data for table `drive_folders`
--

INSERT INTO `drive_folders` (`folder_id`, `team_id`, `parent_folder_id`, `folder_name_th`, `folder_name_en`, `folder_path_cache`, `is_root`, `created_by_user_id`, `created_at`, `updated_at`, `deleted_at`) VALUES
(160001, 2003, NULL, 'โฟลเดอร์หลัก', 'Root', '/2003', 1, 1007, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(160002, 2003, 160001, 'ไฟล์ส่งงาน', 'Final Submission', '/2003/final', 0, 1007, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `event_audit_logs`
--

CREATE TABLE `event_audit_logs` (
  `event_audit_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of event audit log entry',
  `participation_round_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to event_participation_rounds (nullable for generic events)',
  `team_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to team_teams (nullable)',
  `actor_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who performed the action',
  `action_code` varchar(100) NOT NULL COMMENT 'Action code (e.g., ROUND_OPENED, SLOT_OFFERED, MEMBER_CONFIRMED, TEAM_REPLACED)',
  `action_detail` text DEFAULT NULL COMMENT 'Additional details as JSON/string for auditing',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When action occurred'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for finalist participation workflow actions';

--
-- Dumping data for table `event_audit_logs`
--

INSERT INTO `event_audit_logs` (`event_audit_id`, `participation_round_id`, `team_id`, `actor_user_id`, `action_code`, `action_detail`, `created_at`) VALUES
(120001, 8001, 2003, 1007, 'MEMBER_CONFIRMED', '{\"user_id\":1007}', '2026-02-20 17:50:25'),
(120002, 8001, 2003, 1012, 'MEMBER_DECLINED', '{\"user_id\":1012}', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `event_member_confirmations`
--

CREATE TABLE `event_member_confirmations` (
  `member_confirmation_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of member attendance confirmation',
  `participation_round_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to event_participation_rounds',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (team being confirmed)',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (member confirming)',
  `status` enum('pending','confirmed','declined') NOT NULL DEFAULT 'pending' COMMENT 'Member confirmation status',
  `confirmed_at` datetime DEFAULT NULL COMMENT 'When member confirmed attendance',
  `declined_at` datetime DEFAULT NULL COMMENT 'When member declined attendance',
  `decline_reason` text DEFAULT NULL COMMENT 'Reason member declined (optional)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Member-level attendance confirmations for finalists';

--
-- Dumping data for table `event_member_confirmations`
--

INSERT INTO `event_member_confirmations` (`member_confirmation_id`, `participation_round_id`, `team_id`, `user_id`, `status`, `confirmed_at`, `declined_at`, `decline_reason`, `created_at`, `updated_at`) VALUES
(110001, 8001, 2003, 1007, 'confirmed', '2026-02-20 17:50:25', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(110002, 8001, 2003, 1008, 'confirmed', '2026-02-20 17:50:25', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(110003, 8001, 2003, 1011, 'pending', NULL, NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(110004, 8001, 2003, 1012, 'declined', NULL, '2026-02-20 17:50:25', 'ติดสอบ', '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `event_participation_rounds`
--

CREATE TABLE `event_participation_rounds` (
  `participation_round_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of participation round',
  `round_code` varchar(50) NOT NULL COMMENT 'Stable code for round (e.g., FINAL_DAY_2026)',
  `round_name_th` varchar(255) NOT NULL COMMENT 'Round display name (Thai)',
  `round_name_en` varchar(255) NOT NULL COMMENT 'Round display name (English)',
  `confirm_deadline_at` datetime NOT NULL COMMENT 'Deadline for members to confirm attendance',
  `max_finalist_teams` int(11) NOT NULL DEFAULT 10 COMMENT 'Target number of finalist teams (e.g., 10)',
  `status` enum('draft','open','closed','archived') NOT NULL DEFAULT 'draft' COMMENT 'Round status',
  `created_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (admin who created this round)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Participation rounds for finalists (attendance confirmation)';

--
-- Dumping data for table `event_participation_rounds`
--

INSERT INTO `event_participation_rounds` (`participation_round_id`, `round_code`, `round_name_th`, `round_name_en`, `confirm_deadline_at`, `max_finalist_teams`, `status`, `created_by_user_id`, `created_at`, `updated_at`) VALUES
(8001, 'FINALIST_CONFIRM_2026', 'ยืนยันเข้าร่วมรอบสุดท้าย', 'Finalist Confirmation', '2026-02-25 17:50:25', 10, 'open', 1001, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `event_schedules`
--

CREATE TABLE `event_schedules` (
  `schedule_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of schedule container',
  `schedule_code` varchar(50) NOT NULL COMMENT 'Stable code (e.g., HACKATHON_2026_MAIN)',
  `schedule_name_th` varchar(255) NOT NULL COMMENT 'Schedule name/title (Thai) for admin/UI',
  `schedule_name_en` varchar(255) NOT NULL COMMENT 'Schedule name/title (English) for admin/UI',
  `timezone` varchar(50) NOT NULL DEFAULT 'Asia/Bangkok' COMMENT 'IANA timezone for displaying times',
  `is_published` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether schedule is published/visible',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Schedule containers (a set of days/items)';

--
-- Dumping data for table `event_schedules`
--

INSERT INTO `event_schedules` (`schedule_id`, `schedule_code`, `schedule_name_th`, `schedule_name_en`, `timezone`, `is_published`, `created_at`, `updated_at`) VALUES
(1, 'HACKATHON_2026_MAIN', 'กำหนดการหลัก', 'Main Schedule', 'Asia/Bangkok', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `event_schedule_days`
--

CREATE TABLE `event_schedule_days` (
  `day_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of schedule day',
  `schedule_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to event_schedules',
  `day_date` date NOT NULL COMMENT 'Calendar date for this schedule day',
  `day_name_th` varchar(255) DEFAULT NULL COMMENT 'Optional day label (Thai) (e.g., วันแรก, วันที่ 1)',
  `day_name_en` varchar(255) DEFAULT NULL COMMENT 'Optional day label (English) (e.g., Day 1)',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Sorting order (if not strictly by date)',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this day is enabled/visible',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Schedule days';

--
-- Dumping data for table `event_schedule_days`
--

INSERT INTO `event_schedule_days` (`day_id`, `schedule_id`, `day_date`, `day_name_th`, `day_name_en`, `sort_order`, `is_enabled`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-02-20', 'วันงาน', 'Event Day', 0, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `event_schedule_items`
--

CREATE TABLE `event_schedule_items` (
  `item_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of schedule item',
  `schedule_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to event_schedules',
  `day_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to event_schedule_days',
  `track_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to event_schedule_tracks (null = default track)',
  `start_time` time NOT NULL COMMENT 'Start time (local timezone of schedule)',
  `end_time` time NOT NULL COMMENT 'End time (local timezone of schedule)',
  `title_th` varchar(255) NOT NULL COMMENT 'Item title (Thai)',
  `title_en` varchar(255) NOT NULL COMMENT 'Item title (English)',
  `description_th` text DEFAULT NULL COMMENT 'Item description (Thai)',
  `description_en` text DEFAULT NULL COMMENT 'Item description (English)',
  `location_th` varchar(255) DEFAULT NULL COMMENT 'Location/room (Thai)',
  `location_en` varchar(255) DEFAULT NULL COMMENT 'Location/room (English)',
  `speaker_th` varchar(255) DEFAULT NULL COMMENT 'Speaker/host name (Thai) (optional)',
  `speaker_en` varchar(255) DEFAULT NULL COMMENT 'Speaker/host name (English) (optional)',
  `audience` enum('public','all_users','approved_teams','specific_teams') NOT NULL DEFAULT 'public' COMMENT 'Who can see this item',
  `is_highlight` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Highlight flag for UI emphasis',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Ordering within the day (if needed beyond time sorting)',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether item is enabled/visible',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Schedule items (cards)';

--
-- Dumping data for table `event_schedule_items`
--

INSERT INTO `event_schedule_items` (`item_id`, `schedule_id`, `day_id`, `track_id`, `start_time`, `end_time`, `title_th`, `title_en`, `description_th`, `description_en`, `location_th`, `location_en`, `speaker_th`, `speaker_en`, `audience`, `is_highlight`, `sort_order`, `is_enabled`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, '09:00:00', '10:00:00', 'ลงทะเบียนและต้อนรับ', 'Registration & Welcome', 'ลงทะเบียนรับป้ายชื่อและของที่ระลึก', 'Check-in and get your badge', 'โถงรับรอง', 'Lobby', NULL, NULL, 'public', 1, 1, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(2, 1, 1, 1, '10:00:00', '12:00:00', 'Keynote: Game Dev in 2025', 'Keynote: Game Dev in 2025', 'โดย CTO จาก Game Studio ชั้นนำ', 'By CTO from a leading Game Studio', 'ห้องประชุมใหญ่', 'Main Hall', NULL, NULL, 'public', 0, 2, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(3, 1, 1, 1, '13:00:00', '17:00:00', 'เริ่มทำโปรเจกต์ (Team Hacking)', 'Team Hacking Begins', 'เริ่มพัฒนา พร้อม Mentor ให้คำปรึกษา', 'Start building with mentors', 'พื้นที่ทำงาน', 'Work Area', NULL, NULL, 'approved_teams', 1, 3, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(4, 1, 1, 1, '17:30:00', '19:00:00', 'นำเสนอผลงานรอบคัดเลือก', 'Demo & Pitching', 'นำเสนอผลงานรอบคัดเลือก 10 ทีมสุดท้าย', 'Pitch to select top 10', 'ห้องประชุมใหญ่', 'Main Hall', NULL, NULL, 'approved_teams', 1, 4, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `event_schedule_item_targets`
--

CREATE TABLE `event_schedule_item_targets` (
  `target_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of schedule item target',
  `item_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to event_schedule_items',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (target team)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Targets for schedule items when audience=specific_teams';

--
-- Dumping data for table `event_schedule_item_targets`
--

INSERT INTO `event_schedule_item_targets` (`target_id`, `item_id`, `team_id`, `created_at`) VALUES
(1, 3, 2003, '2026-02-20 17:50:25'),
(2, 4, 2003, '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `event_schedule_tracks`
--

CREATE TABLE `event_schedule_tracks` (
  `track_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of schedule track',
  `schedule_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to event_schedules',
  `track_code` varchar(50) NOT NULL COMMENT 'Track code (e.g., MAIN_STAGE, ROOM_A)',
  `track_name_th` varchar(255) NOT NULL COMMENT 'Track name (Thai)',
  `track_name_en` varchar(255) NOT NULL COMMENT 'Track name (English)',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Sorting order for track tabs/labels',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether track is enabled',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Optional tracks/rooms for parallel schedules';

--
-- Dumping data for table `event_schedule_tracks`
--

INSERT INTO `event_schedule_tracks` (`track_id`, `schedule_id`, `track_code`, `track_name_th`, `track_name_en`, `sort_order`, `is_enabled`, `created_at`, `updated_at`) VALUES
(1, 1, 'MAIN_STAGE', 'เวทีหลัก', 'Main Stage', 0, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `event_team_slots`
--

CREATE TABLE `event_team_slots` (
  `team_slot_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of team slot record',
  `participation_round_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to event_participation_rounds',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (approved team)',
  `slot_type` enum('finalist','reserve') NOT NULL DEFAULT 'finalist' COMMENT 'Slot type: finalist=main list, reserve=waiting list',
  `slot_rank` int(11) NOT NULL COMMENT 'Rank/order within slot type (1..N)',
  `slot_status` enum('offered','confirmed','declined','expired','replaced') NOT NULL DEFAULT 'offered' COMMENT 'Slot status lifecycle',
  `offered_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When slot was offered to the team',
  `decision_deadline_at` datetime DEFAULT NULL COMMENT 'Optional per-team deadline override (null = use round deadline)',
  `decided_at` datetime DEFAULT NULL COMMENT 'When team decision was finalized (confirmed/declined/expired)',
  `decided_by_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to user_users (admin who updated slot status or system actor recorded)',
  `replaced_by_team_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'If replaced, which team replaced this team in finalist list',
  `note` text DEFAULT NULL COMMENT 'Optional note about slot decision or replacement'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Slots for finalist/reserve teams per participation round';

--
-- Dumping data for table `event_team_slots`
--

INSERT INTO `event_team_slots` (`team_slot_id`, `participation_round_id`, `team_id`, `slot_type`, `slot_rank`, `slot_status`, `offered_at`, `decision_deadline_at`, `decided_at`, `decided_by_user_id`, `replaced_by_team_id`, `note`) VALUES
(100001, 8001, 2003, 'finalist', 1, 'confirmed', '2026-02-12 17:50:25', '2026-02-25 17:50:25', '2026-02-13 17:50:25', 1001, NULL, 'ทีมผ่านเข้ารอบ'),
(100002, 8001, 2002, 'reserve', 11, 'offered', '2026-02-20 17:50:25', '2026-02-25 17:50:25', NULL, NULL, NULL, 'ทีมสำรอง');

-- --------------------------------------------------------

--
-- Table structure for table `event_winners`
--

CREATE TABLE `event_winners` (
  `winner_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of winner record',
  `team_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to team_teams (nullable if winner is imported without existing team)',
  `placement` int(11) NOT NULL COMMENT 'Placement/rank number (1=winner,2=runner-up,...)',
  `award_name_th` varchar(255) DEFAULT NULL COMMENT 'Award name (Thai) (optional)',
  `award_name_en` varchar(255) DEFAULT NULL COMMENT 'Award name (English) (optional)',
  `project_title_th` varchar(255) NOT NULL COMMENT 'Project title (Thai)',
  `project_title_en` varchar(255) NOT NULL COMMENT 'Project title (English)',
  `project_description_th` text DEFAULT NULL COMMENT 'Project description (Thai)',
  `project_description_en` text DEFAULT NULL COMMENT 'Project description (English)',
  `prize_text_th` varchar(255) DEFAULT NULL COMMENT 'Prize text (Thai) (optional)',
  `prize_text_en` varchar(255) DEFAULT NULL COMMENT 'Prize text (English) (optional)',
  `prize_amount` decimal(12,2) DEFAULT NULL COMMENT 'Prize amount numeric (optional)',
  `prize_currency` varchar(10) DEFAULT NULL COMMENT 'Currency code (e.g., THB)',
  `links_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Links as JSON (e.g., {"demo":"...","video":"...","github":"..."})' CHECK (json_valid(`links_json`)),
  `is_published` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether winner info is published on website',
  `published_at` datetime DEFAULT NULL COMMENT 'When winner info was published',
  `created_by_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to user_users (admin/editor who created/updated)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Winners and projects shown after event';

-- --------------------------------------------------------

--
-- Table structure for table `notify_announcements`
--

CREATE TABLE `notify_announcements` (
  `announcement_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of announcement',
  `announcement_code` varchar(50) NOT NULL COMMENT 'Stable code for announcement (optional for reuse/linking)',
  `title_th` varchar(255) NOT NULL COMMENT 'Announcement title (Thai)',
  `title_en` varchar(255) NOT NULL COMMENT 'Announcement title (English)',
  `content_th` longtext NOT NULL COMMENT 'Announcement content (Thai)',
  `content_en` longtext NOT NULL COMMENT 'Announcement content (English)',
  `audience` enum('all_users','approved_teams','specific_teams') NOT NULL DEFAULT 'approved_teams' COMMENT 'Target audience scope',
  `channel_in_app` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether to show in-app after login (team announcement page)',
  `channel_email` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether to send via email',
  `email_subject_th` varchar(255) DEFAULT NULL COMMENT 'Email subject (Thai) if channel_email=1',
  `email_subject_en` varchar(255) DEFAULT NULL COMMENT 'Email subject (English) if channel_email=1',
  `publish_at` datetime DEFAULT NULL COMMENT 'Scheduled publish time (null = publish immediately when set to published)',
  `published_at` datetime DEFAULT NULL COMMENT 'Actual published time',
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'Announcement status',
  `created_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (admin who created)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Announcements that can be delivered by email and/or shown in-app';

--
-- Dumping data for table `notify_announcements`
--

INSERT INTO `notify_announcements` (`announcement_id`, `announcement_code`, `title_th`, `title_en`, `content_th`, `content_en`, `audience`, `channel_in_app`, `channel_email`, `email_subject_th`, `email_subject_en`, `publish_at`, `published_at`, `status`, `created_by_user_id`, `created_at`, `updated_at`) VALUES
(9001, 'APPROVED_WELCOME', 'ประกาศทีมที่ผ่าน', 'Approved Teams', 'ยินดีด้วย ทีมของคุณผ่านเข้ารอบ', 'Congrats, your team is approved', 'approved_teams', 1, 1, 'ยินดีด้วย', 'Congratulations', '2026-02-20 17:50:25', '2026-02-20 17:50:25', 'published', 1001, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(9002, 'CUSTOM_MEET', 'นัดหมายทีม', 'Team Meeting', 'ขอให้อยู่ใน Zoom 10:00', 'Please join Zoom at 10:00', 'specific_teams', 1, 1, 'นัดหมายทีม', 'Team meeting', '2026-02-20 17:50:25', '2026-02-20 17:50:25', 'published', 1001, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `notify_announcement_targets`
--

CREATE TABLE `notify_announcement_targets` (
  `target_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of announcement target',
  `announcement_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to notify_announcements',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (target team)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Targets for announcements when audience=specific_teams';

--
-- Dumping data for table `notify_announcement_targets`
--

INSERT INTO `notify_announcement_targets` (`target_id`, `announcement_id`, `team_id`, `created_at`) VALUES
(130001, 9002, 2003, '2026-02-20 17:50:25'),
(130002, 9002, 2002, '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `notify_audit_logs`
--

CREATE TABLE `notify_audit_logs` (
  `notify_audit_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of notify audit log entry',
  `announcement_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to notify_announcements (nullable for generic)',
  `actor_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who performed the action',
  `action_code` varchar(100) NOT NULL COMMENT 'Action code (e.g., ANNOUNCEMENT_CREATED, PUBLISHED, EMAIL_QUEUED)',
  `action_detail` text DEFAULT NULL COMMENT 'Additional details as JSON/string for auditing',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When action occurred'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for notification/announcement actions';

--
-- Dumping data for table `notify_audit_logs`
--

INSERT INTO `notify_audit_logs` (`notify_audit_id`, `announcement_id`, `actor_user_id`, `action_code`, `action_detail`, `created_at`) VALUES
(150001, 9001, 1001, 'PUBLISHED', NULL, '2026-02-20 17:50:25'),
(150002, 9002, 1001, 'TARGETED_TEAMS', '{\"teams\":[2003,2002]}', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `notify_deliveries`
--

CREATE TABLE `notify_deliveries` (
  `delivery_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of notification delivery',
  `announcement_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to notify_announcements',
  `channel` enum('email','in_app') NOT NULL COMMENT 'Delivery channel',
  `team_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to team_teams (nullable; set when delivery is team-scoped)',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (recipient user)',
  `recipient_email` varchar(255) DEFAULT NULL COMMENT 'Email used for delivery (snapshot; for audit)',
  `status` enum('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued' COMMENT 'Delivery status',
  `provider_message_id` varchar(255) DEFAULT NULL COMMENT 'Provider message id (SMTP/SendGrid/etc.)',
  `error_message` text DEFAULT NULL COMMENT 'Error message if failed',
  `queued_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When delivery was queued',
  `sent_at` datetime DEFAULT NULL COMMENT 'When delivery was sent successfully'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Delivery log per recipient per channel (email/in-app)';

--
-- Dumping data for table `notify_deliveries`
--

INSERT INTO `notify_deliveries` (`delivery_id`, `announcement_id`, `channel`, `team_id`, `user_id`, `recipient_email`, `status`, `provider_message_id`, `error_message`, `queued_at`, `sent_at`) VALUES
(140001, 9001, 'email', 2003, 1007, 'user1007@mail.test', 'sent', NULL, NULL, '2026-02-20 17:50:25', '2026-02-13 17:50:25'),
(140002, 9001, 'email', 2003, 1008, 'user1008@mail.test', 'sent', NULL, NULL, '2026-02-20 17:50:25', '2026-02-13 17:50:25'),
(140003, 9001, 'email', 2003, 1011, 'user1011@mail.test', 'sent', NULL, NULL, '2026-02-20 17:50:25', '2026-02-13 17:50:25'),
(140004, 9001, 'email', 2003, 1012, 'user1012@mail.test', 'sent', NULL, NULL, '2026-02-20 17:50:25', '2026-02-13 17:50:25'),
(140005, 9002, 'email', 2003, 1007, 'user1007@mail.test', 'sent', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(140006, 9002, 'in_app', 2003, 1007, NULL, 'sent', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `notify_email_templates`
--

CREATE TABLE `notify_email_templates` (
  `template_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of email template',
  `template_code` varchar(50) NOT NULL COMMENT 'Stable template code (e.g., FINALIST_SELECTED, EVENT_INFO, GENERIC)',
  `template_name_th` varchar(255) NOT NULL COMMENT 'Template name (Thai) for admin UI',
  `template_name_en` varchar(255) NOT NULL COMMENT 'Template name (English) for admin UI',
  `subject_th` varchar(255) NOT NULL COMMENT 'Email subject (Thai)',
  `subject_en` varchar(255) NOT NULL COMMENT 'Email subject (English)',
  `html_th` longtext NOT NULL COMMENT 'Email HTML body (Thai)',
  `html_en` longtext NOT NULL COMMENT 'Email HTML body (English)',
  `variables_hint` text DEFAULT NULL COMMENT 'Hint of variables supported (e.g., {{team_name}}, {{deadline}})',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether template is enabled for use',
  `created_by_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to user_users (admin/editor)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reusable HTML email templates';

--
-- Dumping data for table `notify_email_templates`
--

INSERT INTO `notify_email_templates` (`template_id`, `template_code`, `template_name_th`, `template_name_en`, `subject_th`, `subject_en`, `html_th`, `html_en`, `variables_hint`, `is_enabled`, `created_by_user_id`, `created_at`, `updated_at`) VALUES
(1, 'GENERIC', 'เทมเพลตทั่วไป', 'Generic Template', 'แจ้งเตือนจากกิจกรรม', 'Notification from the event', '<div style=\"font-family:Arial\"><h2>{{title}}</h2><div>{{content}}</div></div>', '<div style=\"font-family:Arial\"><h2>{{title}}</h2><div>{{content}}</div></div>', 'Variables: {{title}}, {{content}}', 1, NULL, '2026-02-27 00:36:42', '2026-02-27 00:36:42');

-- --------------------------------------------------------

--
-- Table structure for table `review_assignments`
--

CREATE TABLE `review_assignments` (
  `assignment_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of assignment',
  `submission_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to review_submissions',
  `reviewer_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (assigned reviewer/judge)',
  `reviewer_role_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to review_reviewer_roles (optional categorization)',
  `status` enum('assigned','accepted','in_progress','completed','reassigned','cancelled') NOT NULL DEFAULT 'assigned' COMMENT 'Assignment status',
  `assigned_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (admin who assigned)',
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When assignment was created',
  `accepted_at` datetime DEFAULT NULL COMMENT 'When reviewer accepted assignment',
  `started_at` datetime DEFAULT NULL COMMENT 'When reviewer started reviewing',
  `completed_at` datetime DEFAULT NULL COMMENT 'When reviewer completed reviewing',
  `note` text DEFAULT NULL COMMENT 'Optional note for reviewer/admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Assignments of submissions to reviewers';

--
-- Dumping data for table `review_assignments`
--

INSERT INTO `review_assignments` (`assignment_id`, `submission_id`, `reviewer_user_id`, `reviewer_role_id`, `status`, `assigned_by_user_id`, `assigned_at`, `accepted_at`, `started_at`, `completed_at`, `note`) VALUES
(99601, 7002, 1009, 99001, 'completed', 1001, '2026-02-18 17:50:25', '2026-02-18 17:50:25', '2026-02-18 17:50:25', '2026-02-19 17:50:25', 'ตรวจแล้ว'),
(99602, 7003, 1009, 99001, 'completed', 1001, '2026-02-11 17:50:25', '2026-02-11 17:50:25', '2026-02-11 17:50:25', '2026-02-12 17:50:25', 'ผ่าน'),
(99603, 7003, 1010, 99001, 'completed', 1001, '2026-02-11 17:50:25', '2026-02-11 17:50:25', '2026-02-11 17:50:25', '2026-02-12 17:50:25', 'ผ่าน');

-- --------------------------------------------------------

--
-- Table structure for table `review_audit_logs`
--

CREATE TABLE `review_audit_logs` (
  `review_audit_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of review audit log entry',
  `submission_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to review_submissions (nullable for generic events)',
  `team_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to team_teams (nullable for generic events)',
  `actor_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who performed the action',
  `action_code` varchar(100) NOT NULL COMMENT 'Action code (e.g., SUBMITTED, ASSIGNED, STARTED, RETURNED, APPROVED)',
  `action_detail` text DEFAULT NULL COMMENT 'Additional details as JSON/string for auditing',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When action occurred'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for review workflow actions';

--
-- Dumping data for table `review_audit_logs`
--

INSERT INTO `review_audit_logs` (`review_audit_id`, `submission_id`, `team_id`, `actor_user_id`, `action_code`, `action_detail`, `created_at`) VALUES
(99901, 7003, 2003, 1001, 'ASSIGNED', '{\"assignment_id\":99602}', '2026-02-11 17:50:25'),
(99902, 7003, 2003, 1009, 'APPROVED', NULL, '2026-02-12 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `review_comments`
--

CREATE TABLE `review_comments` (
  `comment_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of review comment',
  `submission_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to review_submissions',
  `author_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (comment author)',
  `author_role` enum('leader','member','reviewer','admin') NOT NULL COMMENT 'Role of author in context of this submission',
  `message` text NOT NULL COMMENT 'Comment message body',
  `is_internal` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Internal note visible only to reviewers/admin',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Discussion/comments for a submission';

--
-- Dumping data for table `review_comments`
--

INSERT INTO `review_comments` (`comment_id`, `submission_id`, `author_user_id`, `author_role`, `message`, `is_internal`, `created_at`) VALUES
(99801, 7002, 1009, 'reviewer', 'รูปบัตรไม่ชัด กรุณาอัปโหลดใหม่', 0, '2026-02-19 17:50:25'),
(99802, 7003, 1010, 'reviewer', 'ขอให้เตรียม pitch deck', 0, '2026-02-12 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `review_decisions`
--

CREATE TABLE `review_decisions` (
  `decision_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of review decision',
  `submission_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to review_submissions',
  `outcome` enum('approved','returned','rejected') NOT NULL COMMENT 'Final outcome for this submission',
  `summary_reason` text DEFAULT NULL COMMENT 'Summary reason for returned/rejected (team-level note)',
  `decided_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (admin/reviewer who finalized decision)',
  `decided_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When final decision was recorded',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Final decision per submission (team-level)';

--
-- Dumping data for table `review_decisions`
--

INSERT INTO `review_decisions` (`decision_id`, `submission_id`, `outcome`, `summary_reason`, `decided_by_user_id`, `decided_at`, `updated_at`) VALUES
(99701, 7002, 'returned', 'เอกสารสมาชิก 1 คนไม่ชัด', 1009, '2026-02-19 17:50:25', '2026-02-20 17:50:25'),
(99702, 7003, 'approved', 'ผ่านเข้ารอบ 10 ทีม', 1009, '2026-02-12 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `review_reviewer_roles`
--

CREATE TABLE `review_reviewer_roles` (
  `reviewer_role_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of reviewer role',
  `role_code` varchar(50) NOT NULL COMMENT 'Role code (e.g., JUDGE, ADMIN_REVIEWER)',
  `role_name_th` varchar(255) NOT NULL COMMENT 'Role name (Thai) for display',
  `role_name_en` varchar(255) NOT NULL COMMENT 'Role name (English) for display',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether role is enabled',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reviewer roles for organizing reviewers';

--
-- Dumping data for table `review_reviewer_roles`
--

INSERT INTO `review_reviewer_roles` (`reviewer_role_id`, `role_code`, `role_name_th`, `role_name_en`, `is_enabled`, `created_at`, `updated_at`) VALUES
(99001, 'JUDGE', 'กรรมการ', 'Judge', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(99002, 'ADMIN_REVIEWER', 'ผู้ตรวจสอบ', 'Admin Reviewer', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `review_submissions`
--

CREATE TABLE `review_submissions` (
  `submission_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of review submission',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (team being submitted)',
  `verify_round_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to verify_review_rounds (locked verification round used for this submission)',
  `submission_no` int(11) NOT NULL COMMENT 'Submission number per team (1,2,3...)',
  `submitted_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (leader who clicked submit)',
  `status` enum('submitted','under_review','returned','approved','rejected','cancelled') NOT NULL DEFAULT 'submitted' COMMENT 'Submission status',
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When leader submitted the team for review',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp',
  `team_note` text DEFAULT NULL COMMENT 'Optional note from leader to reviewers'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Team submissions to reviewers, bound to a verification round';

--
-- Dumping data for table `review_submissions`
--

INSERT INTO `review_submissions` (`submission_id`, `team_id`, `verify_round_id`, `submission_no`, `submitted_by_user_id`, `status`, `submitted_at`, `updated_at`, `team_note`) VALUES
(7001, 2001, 6001, 1, 1002, 'submitted', '2026-02-20 17:50:25', '2026-02-20 17:50:25', 'ส่งทดสอบ'),
(7002, 2002, 6002, 1, 1005, 'returned', '2026-02-18 17:50:25', '2026-02-20 17:50:25', 'ขอเข้าร่วม'),
(7003, 2003, 6003, 1, 1007, 'approved', '2026-02-11 17:50:25', '2026-02-20 17:50:25', 'พร้อมเข้าร่วม');

-- --------------------------------------------------------

--
-- Table structure for table `review_submission_members`
--

CREATE TABLE `review_submission_members` (
  `submission_member_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of submission member snapshot',
  `submission_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to review_submissions',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (denormalized)',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (member included in this submission)',
  `member_role` enum('leader','member') NOT NULL COMMENT 'Role at time of submission (snapshot)',
  `included_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When member was included in the snapshot'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Snapshot of team members included in a submission';

--
-- Dumping data for table `review_submission_members`
--

INSERT INTO `review_submission_members` (`submission_member_id`, `submission_id`, `team_id`, `user_id`, `member_role`, `included_at`) VALUES
(99501, 7001, 2001, 1002, 'leader', '2026-02-20 17:50:25'),
(99502, 7001, 2001, 1003, 'member', '2026-02-20 17:50:25'),
(99503, 7001, 2001, 1004, 'member', '2026-02-20 17:50:25'),
(99504, 7002, 2002, 1005, 'leader', '2026-02-20 17:50:25'),
(99505, 7002, 2002, 1006, 'member', '2026-02-20 17:50:25'),
(99506, 7003, 2003, 1007, 'leader', '2026-02-20 17:50:25'),
(99507, 7003, 2003, 1008, 'member', '2026-02-20 17:50:25'),
(99508, 7003, 2003, 1011, 'member', '2026-02-20 17:50:25'),
(99509, 7003, 2003, 1012, 'member', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `sys_configs`
--

CREATE TABLE `sys_configs` (
  `config_key` varchar(100) NOT NULL COMMENT 'Config key (e.g., TEAM_MEMBER_MIN, TEAM_MEMBER_MAX)',
  `config_value` varchar(255) NOT NULL COMMENT 'Config value stored as string (cast in app as needed)',
  `description_th` varchar(255) DEFAULT NULL COMMENT 'Thai description for admin UI',
  `description_en` varchar(255) DEFAULT NULL COMMENT 'English description for admin UI',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Last updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System-wide key-value configuration';

--
-- Dumping data for table `sys_configs`
--

INSERT INTO `sys_configs` (`config_key`, `config_value`, `description_th`, `description_en`, `updated_at`) VALUES
('TEAM_CODE_PREFIX', 'TM', 'คำนำหน้าโค้ดทีม', 'Team code prefix', '2026-02-20 17:50:25'),
('TEAM_MEMBER_MAX', '5', 'จำนวนสมาชิกสูงสุดต่อทีม', 'Maximum members per team', '2026-02-20 17:50:25'),
('TEAM_MEMBER_MIN', '3', 'จำนวนสมาชิกขั้นต่ำต่อทีม', 'Minimum members per team', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `team_audit_logs`
--

CREATE TABLE `team_audit_logs` (
  `team_audit_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of team audit log entry',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams',
  `actor_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who performed the action',
  `action_code` varchar(100) NOT NULL COMMENT 'Action code (e.g., TEAM_CREATED, JOIN_APPROVED, INVITE_SENT, INVITE_CANCELLED)',
  `action_detail` text DEFAULT NULL COMMENT 'Additional details as JSON/string for auditing',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When action occurred'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for team-related actions';

--
-- Dumping data for table `team_audit_logs`
--

INSERT INTO `team_audit_logs` (`team_audit_id`, `team_id`, `actor_user_id`, `action_code`, `action_detail`, `created_at`) VALUES
(93001, 2001, 1002, 'TEAM_CREATED', '{\"visibility\":\"public\"}', '2026-02-20 17:50:25'),
(93002, 2001, 1002, 'MEMBER_ADDED', '{\"user_id\":1003}', '2026-02-20 17:50:25'),
(93003, 2002, 1005, 'INVITE_SENT', '{\"invitation_id\":92001}', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `team_invitations`
--

CREATE TABLE `team_invitations` (
  `invitation_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of invitation',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams',
  `invited_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who is invited',
  `invited_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who sent invitation (leader)',
  `status` enum('pending','accepted','declined','cancelled','expired') NOT NULL DEFAULT 'pending' COMMENT 'Invitation status',
  `invite_message` text DEFAULT NULL COMMENT 'Optional message included with invitation',
  `expires_at` datetime DEFAULT NULL COMMENT 'Invitation expiry (null = never)',
  `responded_at` datetime DEFAULT NULL COMMENT 'When invitee accepted/declined',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Invitations sent by team leader (invitee must accept)';

--
-- Dumping data for table `team_invitations`
--

INSERT INTO `team_invitations` (`invitation_id`, `team_id`, `invited_user_id`, `invited_by_user_id`, `status`, `invite_message`, `expires_at`, `responded_at`, `created_at`, `updated_at`) VALUES
(92001, 2002, 1003, 1005, 'pending', 'มาร่วมทีม AI ไหม', '2026-02-27 17:50:25', NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(92002, 2001, 1011, 1002, 'declined', 'สนใจไหม', '2026-02-27 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `team_join_requests`
--

CREATE TABLE `team_join_requests` (
  `join_request_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of join request',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams',
  `requester_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who requests to join',
  `request_source` enum('public_listing','invite_code') NOT NULL COMMENT 'Source of request: from public listing or via invite code',
  `used_invite_code` varchar(20) DEFAULT NULL COMMENT 'Invite code used (if request_source=invite_code)',
  `status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending' COMMENT 'Request status',
  `leader_action_by_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to user_users (leader) who approved/rejected',
  `leader_action_at` datetime DEFAULT NULL COMMENT 'When leader approved/rejected',
  `leader_reason` text DEFAULT NULL COMMENT 'Reason for rejection (or note for approval)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Requests to join a team (leader must approve)';

--
-- Dumping data for table `team_join_requests`
--

INSERT INTO `team_join_requests` (`join_request_id`, `team_id`, `requester_user_id`, `request_source`, `used_invite_code`, `status`, `leader_action_by_user_id`, `leader_action_at`, `leader_reason`, `created_at`, `updated_at`) VALUES
(91001, 2001, 1006, '', NULL, 'pending', NULL, NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(91002, 2001, 1008, 'invite_code', 'A1B2C3', 'approved', 1002, '2026-02-20 17:50:25', 'ยินดีต้อนรับ', '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `team_members`
--

CREATE TABLE `team_members` (
  `team_member_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of team member record',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users',
  `role` enum('leader','member') NOT NULL DEFAULT 'member' COMMENT 'Role within team: leader/member',
  `member_status` enum('active','left','removed') NOT NULL DEFAULT 'active' COMMENT 'Member status within team',
  `joined_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When user became a team member',
  `left_at` datetime DEFAULT NULL COMMENT 'When user left/was removed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Team membership records';

--
-- Dumping data for table `team_members`
--

INSERT INTO `team_members` (`team_member_id`, `team_id`, `user_id`, `role`, `member_status`, `joined_at`, `left_at`) VALUES
(80001, 2001, 1002, 'leader', 'active', '2026-02-20 17:50:25', NULL),
(80002, 2001, 1003, 'member', 'active', '2026-02-20 17:50:25', NULL),
(80003, 2001, 1004, 'member', 'active', '2026-02-20 17:50:25', NULL),
(80004, 2002, 1005, 'leader', 'active', '2026-02-20 17:50:25', NULL),
(80005, 2002, 1006, 'member', 'active', '2026-02-20 17:50:25', NULL),
(80006, 2003, 1007, 'leader', 'active', '2026-02-20 17:50:25', NULL),
(80007, 2003, 1008, 'member', 'active', '2026-02-20 17:50:25', NULL),
(80008, 2003, 1011, 'member', 'active', '2026-02-20 17:50:25', NULL),
(80009, 2003, 1012, 'member', 'active', '2026-02-20 17:50:25', NULL),
(80010, 2004, 1013, 'leader', 'active', '2026-02-20 17:50:25', NULL),
(80011, 2005, 1014, 'leader', 'active', '2026-02-20 17:50:25', NULL),
(80012, 2006, 1015, 'leader', 'active', '2026-02-20 17:50:25', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `team_teams`
--

CREATE TABLE `team_teams` (
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of team',
  `team_code` varchar(20) NOT NULL COMMENT 'Human-friendly team/lobby code (e.g., TM0041)',
  `team_name_th` varchar(255) NOT NULL COMMENT 'Team name (Thai) for display',
  `team_name_en` varchar(255) NOT NULL COMMENT 'Team name (English) for display',
  `visibility` enum('public','private') NOT NULL DEFAULT 'private' COMMENT 'Team visibility: public means discoverable; private means invite-only',
  `current_leader_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users for current team leader',
  `status` enum('draft','forming','ready','submitted','approved','returned','archived') NOT NULL DEFAULT 'forming' COMMENT 'Team lifecycle status',
  `approved_at` datetime DEFAULT NULL COMMENT 'When team was approved/passed review (finalist selection time)',
  `selected_at` datetime DEFAULT NULL COMMENT 'When team was selected into event slots (can equal approved_at)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp',
  `deleted_at` datetime DEFAULT NULL COMMENT 'Soft delete timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Teams (lobbies)';

--
-- Dumping data for table `team_teams`
--

INSERT INTO `team_teams` (`team_id`, `team_code`, `team_name_th`, `team_name_en`, `visibility`, `current_leader_user_id`, `status`, `approved_at`, `selected_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(2001, 'TM2001', 'ทีมพัซเซิล', 'Puzzle Team', 'public', 1002, 'forming', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(2002, 'TM2002', 'ทีมเอไอ', 'AI Team', 'private', 1005, 'submitted', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(2003, 'TM2003', 'ทีมฟินอล', 'Finalist Team', 'private', 1007, 'approved', '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(2004, 'TM2004', 'ทีมแมวเหมียว', 'Meow Team', 'public', 1013, 'forming', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(2005, 'TM2005', 'ทีมสายฟ้า', 'Lightning', 'public', 1014, 'forming', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(2006, 'TM2006', 'ทีมนกฮูก', 'Owl Squad', 'public', 1015, 'forming', NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `team_team_codes`
--

CREATE TABLE `team_team_codes` (
  `team_code_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of team code record',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams',
  `invite_code` varchar(20) NOT NULL COMMENT 'Invite/join code (can match team_code or be rotated)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether code is currently active',
  `expires_at` datetime DEFAULT NULL COMMENT 'When code expires (null = never)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `created_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who generated this code (typically leader)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Team invite codes (rotatable)';

--
-- Dumping data for table `team_team_codes`
--

INSERT INTO `team_team_codes` (`team_code_id`, `team_id`, `invite_code`, `is_active`, `expires_at`, `created_at`, `created_by_user_id`) VALUES
(90001, 2001, 'A1B2C3', 1, '2026-03-22 17:50:25', '2026-02-20 17:50:25', 1002),
(90002, 2002, 'X9Y8Z7', 1, '2026-03-22 17:50:25', '2026-02-20 17:50:25', 1005),
(90003, 2003, 'F1N4L6', 1, '2026-03-22 17:50:25', '2026-02-20 17:50:25', 1007);

-- --------------------------------------------------------

--
-- Table structure for table `user_consents`
--

CREATE TABLE `user_consents` (
  `user_consent_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of user consent record',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users',
  `consent_doc_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_consent_documents (version accepted)',
  `accepted_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When user accepted the document',
  `accept_source` varchar(50) DEFAULT NULL COMMENT 'Where acceptance happened (e.g., signup, settings)',
  `accept_ip` varchar(45) DEFAULT NULL COMMENT 'IP address at acceptance time (IPv4/IPv6)',
  `user_agent` varchar(255) DEFAULT NULL COMMENT 'User agent string at acceptance time',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User acceptances for consent documents';

--
-- Dumping data for table `user_consents`
--

INSERT INTO `user_consents` (`user_consent_id`, `user_id`, `consent_doc_id`, `accepted_at`, `accept_source`, `accept_ip`, `user_agent`, `created_at`) VALUES
(70001, 1001, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70002, 1002, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70003, 1003, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70004, 1004, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70005, 1005, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70006, 1006, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70007, 1007, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70008, 1008, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70009, 1009, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70010, 1010, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70011, 1011, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25'),
(70012, 1012, 20001, '2026-02-20 17:50:25', 'web_form', '127.0.0.1', 'MockAgent/1.0', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `user_consent_documents`
--

CREATE TABLE `user_consent_documents` (
  `consent_doc_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of consent document version',
  `doc_code` varchar(50) NOT NULL COMMENT 'Document code (e.g., TERMS, PRIVACY, PDPA)',
  `version` varchar(50) NOT NULL COMMENT 'Document version string',
  `title_th` varchar(255) NOT NULL COMMENT 'Document title (Thai)',
  `title_en` varchar(255) NOT NULL COMMENT 'Document title (English)',
  `content_th` longtext DEFAULT NULL COMMENT 'Document content (Thai)',
  `content_en` longtext DEFAULT NULL COMMENT 'Document content (English)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this version is active for acceptance',
  `published_at` datetime DEFAULT NULL COMMENT 'Publish timestamp (when shown to users)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Consent/terms documents with versioning';

--
-- Dumping data for table `user_consent_documents`
--

INSERT INTO `user_consent_documents` (`consent_doc_id`, `doc_code`, `version`, `title_th`, `title_en`, `content_th`, `content_en`, `is_active`, `published_at`, `created_at`, `updated_at`) VALUES
(20001, 'TERMS', 'v1', 'ข้อตกลงการเข้าร่วม', 'Participation Terms', 'ยินยอมให้ใช้ข้อมูลเพื่อการจัดงาน', 'I consent to data usage for event operations', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `user_credentials_local`
--

CREATE TABLE `user_credentials_local` (
  `cred_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of local credentials record',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users',
  `login_email` varchar(255) NOT NULL COMMENT 'Email used for local login (can match user_users.email)',
  `password_hash` varchar(255) NOT NULL COMMENT 'Password hash (e.g., bcrypt/argon2 hash string)',
  `password_updated_at` datetime DEFAULT NULL COMMENT 'When password was last changed',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether local credential login is enabled',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Local email/password credentials';

--
-- Dumping data for table `user_credentials_local`
--

INSERT INTO `user_credentials_local` (`cred_id`, `user_id`, `login_email`, `password_hash`, `password_updated_at`, `is_enabled`, `created_at`, `updated_at`) VALUES
(40001, 1001, 'admin@hackathon.local', '$2b$10$JqKs9argptgGMr1RjkJOcuOhfAMkqYIddBnUGDqWQEbmXGjq139We', '2026-02-20 17:50:25', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(40002, 1002, 'neo@gmail.com', '$2b$10$JqKs9argptgGMr1RjkJOcuOhfAMkqYIddBnUGDqWQEbmXGjq139We', '2026-02-20 17:50:25', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(40003, 1003, 'mona@gmail.com', '$2b$10$ztCqGPsmzJld2gZcQftCreynqSBSa3yOJyU28Fg0KHUXAANb7FMnS', '2026-02-20 17:50:25', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(40004, 1004, 'palm@cmu.ac.th', '$2b$10$ztCqGPsmzJld2gZcQftCreynqSBSa3yOJyU28Fg0KHUXAANb7FMnS', '2026-02-20 17:50:25', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(40005, 1005, 'kaito@tu.ac.th', '$2b$10$ztCqGPsmzJld2gZcQftCreynqSBSa3yOJyU28Fg0KHUXAANb7FMnS', '2026-02-20 17:50:25', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(40006, 1006, 'rin@gmail.com', '$2b$10$ztCqGPsmzJld2gZcQftCreynqSBSa3yOJyU28Fg0KHUXAANb7FMnS', '2026-02-20 17:50:25', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(40007, 1007, 'luna@ku.ac.th', '$2b$10$ztCqGPsmzJld2gZcQftCreynqSBSa3yOJyU28Fg0KHUXAANb7FMnS', '2026-02-20 17:50:25', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(40008, 1008, 'max@gmail.com', '$2b$10$ztCqGPsmzJld2gZcQftCreynqSBSa3yOJyU28Fg0KHUXAANb7FMnS', '2026-02-20 17:50:25', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(40009, 1011, 'tony@gmail.com', '$2b$10$ztCqGPsmzJld2gZcQftCreynqSBSa3yOJyU28Fg0KHUXAANb7FMnS', '2026-02-20 17:50:25', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(40010, 1012, 'ivy@gmail.com', '$2b$10$ztCqGPsmzJld2gZcQftCreynqSBSa3yOJyU28Fg0KHUXAANb7FMnS', '2026-02-20 17:50:25', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(40011, 1010, 'judge2@org.local', '$2b$10$lD6KT63mtrQT/fEZyXJSeOaTiICuODWDzvi4EgKsXpjMwgquhYRh.', NULL, 1, '2026-02-25 20:48:32', '2026-02-25 20:48:32'),
(40012, 1017, 'davidd@gmail.com', '$2b$10$p7dCLLWggvmLbLMvBXL/EOzst2j8ebKpUb6nTJGxiFEHPmGz5AnNa', NULL, 1, '2026-02-26 19:36:51', '2026-02-26 19:36:51');

-- --------------------------------------------------------

--
-- Table structure for table `user_identities`
--

CREATE TABLE `user_identities` (
  `identity_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of identity record',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users',
  `identity_type` enum('local','email','sso') NOT NULL COMMENT 'Identity type: local/email/sso',
  `identifier` varchar(255) NOT NULL COMMENT 'Identifier value (e.g., email, SSO subject, provider user id)',
  `domain_rule` enum('any','ac_th_only') NOT NULL DEFAULT 'any' COMMENT 'Email domain rule requirement (used when identity_type=email)',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Verification flag for this identity',
  `verified_at` datetime DEFAULT NULL COMMENT 'When this identity was verified',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User identities for multiple login methods';

--
-- Dumping data for table `user_identities`
--

INSERT INTO `user_identities` (`identity_id`, `user_id`, `identity_type`, `identifier`, `domain_rule`, `is_verified`, `verified_at`, `created_at`, `updated_at`) VALUES
(50001, 1001, 'local', 'admin@hackathon.local', '', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(50002, 1002, 'local', 'neo@gmail.com', '', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(50003, 1003, 'local', 'mona@gmail.com', '', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(50004, 1004, 'email', 'palm@cmu.ac.th', 'ac_th_only', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(50005, 1005, 'email', 'kaito@tu.ac.th', 'ac_th_only', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(50006, 1006, 'local', 'rin@gmail.com', '', 0, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(50007, 1007, 'email', 'luna@ku.ac.th', 'ac_th_only', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(50008, 1008, 'local', 'max@gmail.com', '', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(50009, 1011, 'local', 'tony@gmail.com', '', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(50010, 1012, 'local', 'ivy@gmail.com', '', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(50011, 1017, 'local', 'davidd@gmail.com', 'any', 0, NULL, '2026-02-26 19:36:51', '2026-02-26 19:36:51');

-- --------------------------------------------------------

--
-- Table structure for table `user_privacy_settings`
--

CREATE TABLE `user_privacy_settings` (
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'PK/FK to user_users',
  `show_email` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether email is visible to other users',
  `show_phone` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether phone is visible to other users',
  `show_university` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether university is visible to other users',
  `show_real_name` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether real name is visible to other users',
  `show_social_links` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether social links are visible to other users',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Privacy/visibility settings per user';

--
-- Dumping data for table `user_privacy_settings`
--

INSERT INTO `user_privacy_settings` (`user_id`, `show_email`, `show_phone`, `show_university`, `show_real_name`, `show_social_links`, `updated_at`) VALUES
(1001, 1, 1, 1, 1, 1, '2026-02-20 17:50:25'),
(1002, 1, 0, 1, 1, 1, '2026-02-26 17:55:21'),
(1003, 1, 0, 1, 0, 1, '2026-02-20 17:50:25'),
(1004, 1, 0, 1, 0, 1, '2026-02-20 17:50:25'),
(1005, 1, 0, 1, 0, 1, '2026-02-20 17:50:25'),
(1006, 1, 0, 1, 0, 1, '2026-02-20 17:50:25'),
(1007, 1, 0, 1, 0, 1, '2026-02-20 17:50:25'),
(1008, 1, 0, 1, 0, 1, '2026-02-20 17:50:25'),
(1009, 1, 0, 1, 0, 1, '2026-02-20 17:50:25'),
(1010, 1, 0, 1, 0, 1, '2026-02-20 17:50:25'),
(1011, 1, 0, 1, 0, 1, '2026-02-20 17:50:25'),
(1012, 1, 0, 1, 0, 1, '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `user_public_profiles`
--

CREATE TABLE `user_public_profiles` (
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'PK/FK to user_users',
  `bio_th` text DEFAULT NULL COMMENT 'Public bio/intro (Thai) for team-finding',
  `bio_en` text DEFAULT NULL COMMENT 'Public bio/intro (English) for team-finding',
  `looking_for_team` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether user is currently looking for a team',
  `contact_note` text DEFAULT NULL COMMENT 'Optional contact note (e.g., preferred contact method) shown publicly',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Public profile information for team discovery';

--
-- Dumping data for table `user_public_profiles`
--

INSERT INTO `user_public_profiles` (`user_id`, `bio_th`, `bio_en`, `looking_for_team`, `contact_note`, `updated_at`) VALUES
(1002, 'สนใจทำเกมแนว puzzle', 'Interested in puzzle games', 1, 'ทักมาได้เลย', '2026-02-20 17:50:25'),
(1003, 'ถนัด UI/UX', 'UI/UX designer', 1, 'ว่างช่วงเย็น', '2026-02-20 17:50:25'),
(1004, 'ถนัด backend Go', 'Go backend dev', 0, 'มีทีมแล้ว', '2026-02-20 17:50:25'),
(1005, 'สาย AI/ML', 'AI/ML', 1, 'รับทีมที่สนใจ AI', '2026-02-20 17:50:25'),
(1007, 'หัวหน้าทีม finalist', 'Finalist leader', 0, '', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `user_social_links`
--

CREATE TABLE `user_social_links` (
  `social_link_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of social link record',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users',
  `platform_code` varchar(50) NOT NULL COMMENT 'Platform code (e.g., facebook, instagram, line, linkedin, github)',
  `profile_url` varchar(500) NOT NULL COMMENT 'Full URL to user social profile',
  `display_text` varchar(255) DEFAULT NULL COMMENT 'Optional display text/handle shown in UI',
  `is_visible` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Visibility flag for this specific link',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User social media links';

--
-- Dumping data for table `user_social_links`
--

INSERT INTO `user_social_links` (`social_link_id`, `user_id`, `platform_code`, `profile_url`, `display_text`, `is_visible`, `created_at`, `updated_at`) VALUES
(30001, 1002, 'facebook', 'https://facebook.com/neo.dev', 'Neo Dev', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(30002, 1003, 'instagram', 'https://instagram.com/mona.design', '@mona.design', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(30003, 1005, 'facebook', 'https://facebook.com/kaito.ai', 'Kaito AI', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `user_sso_accounts`
--

CREATE TABLE `user_sso_accounts` (
  `sso_account_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of SSO account mapping',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users',
  `provider_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_sso_providers',
  `provider_subject` varchar(255) NOT NULL COMMENT 'Unique subject/sub from provider (or NameID for SAML)',
  `provider_email` varchar(255) DEFAULT NULL COMMENT 'Email returned by provider (if any)',
  `last_login_at` datetime DEFAULT NULL COMMENT 'Last login timestamp via this SSO account',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mapping between system users and SSO provider accounts';

--
-- Dumping data for table `user_sso_accounts`
--

INSERT INTO `user_sso_accounts` (`sso_account_id`, `user_id`, `provider_id`, `provider_subject`, `provider_email`, `last_login_at`, `created_at`, `updated_at`) VALUES
(61001, 1009, 60001, 'sub-judge-001', 'judge1@kku.ac.th', '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `user_sso_providers`
--

CREATE TABLE `user_sso_providers` (
  `provider_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of SSO provider',
  `provider_code` varchar(50) NOT NULL COMMENT 'Stable code for provider (e.g., KKU_SSO, GOOGLE, AZURE_AD)',
  `provider_name_th` varchar(255) NOT NULL COMMENT 'Provider display name (Thai)',
  `provider_name_en` varchar(255) NOT NULL COMMENT 'Provider display name (English)',
  `protocol` enum('oidc','saml') NOT NULL DEFAULT 'oidc' COMMENT 'SSO protocol type',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether provider is enabled',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SSO providers master';

--
-- Dumping data for table `user_sso_providers`
--

INSERT INTO `user_sso_providers` (`provider_id`, `provider_code`, `provider_name_th`, `provider_name_en`, `protocol`, `is_enabled`, `created_at`, `updated_at`) VALUES
(60001, 'KKU_SSO', 'KKU SSO', 'KKU SSO', 'oidc', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `user_users`
--

CREATE TABLE `user_users` (
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of user',
  `user_name` varchar(50) NOT NULL COMMENT 'Display handle/username used within the system (not real name)',
  `email` varchar(255) DEFAULT NULL COMMENT 'Primary email for contacting user (may be null if SSO-only until first sync)',
  `phone` varchar(30) DEFAULT NULL COMMENT 'Phone number (user-provided)',
  `university_name_th` varchar(255) DEFAULT NULL COMMENT 'University name (Thai) for display/search',
  `university_name_en` varchar(255) DEFAULT NULL COMMENT 'University name (English) for display/search',
  `first_name_th` varchar(100) DEFAULT NULL COMMENT 'First name (Thai)',
  `last_name_th` varchar(100) DEFAULT NULL COMMENT 'Last name (Thai)',
  `first_name_en` varchar(100) DEFAULT NULL COMMENT 'First name (English)',
  `last_name_en` varchar(100) DEFAULT NULL COMMENT 'Last name (English)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Account active flag (0=disabled,1=active)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp',
  `deleted_at` datetime DEFAULT NULL COMMENT 'Soft delete timestamp (null = not deleted)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Users master profile';

--
-- Dumping data for table `user_users`
--

INSERT INTO `user_users` (`user_id`, `user_name`, `email`, `phone`, `university_name_th`, `university_name_en`, `first_name_th`, `last_name_th`, `first_name_en`, `last_name_en`, `is_active`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1001, 'admin_root', 'admin@hackathon.local', '0800000001', 'มหาวิทยาลัยขอนแก่น', 'Khon Kaen University', 'แอดมิน', 'หลัก', 'Admin', 'Root', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1002, 'Neo', 'neo@gmail.com', '0811111111', 'มหาวิทยาลัยขอนแก่น', 'Khon Kaen University', 'นีโอนีออน', 'เอ', 'Neo', 'A', 1, '2026-02-20 17:50:25', '2026-02-26 17:25:21', NULL),
(1003, 'mona', 'mona@gmail.com', '0822222222', 'มหาวิทยาลัยขอนแก่น', 'Khon Kaen University', 'โมนา', 'บี', 'Mona', 'B', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1004, 'palm', 'palm@cmu.ac.th', '0833333333', 'มหาวิทยาลัยเชียงใหม่', 'Chiang Mai University', 'ปาล์ม', 'ซี', 'Palm', 'C', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1005, 'kaito', 'kaito@tu.ac.th', '0844444444', 'มหาวิทยาลัยธรรมศาสตร์', 'Thammasat University', 'ไคโตะ', 'ดี', 'Kaito', 'D', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1006, 'rin', 'rin@gmail.com', '0855555555', 'มหาวิทยาลัยธรรมศาสตร์', 'Thammasat University', 'ริน', 'อี', 'Rin', 'E', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1007, 'luna', 'luna@ku.ac.th', '0866666666', 'มหาวิทยาลัยเกษตรศาสตร์', 'Kasetsart University', 'ลูน่า', 'เอฟ', 'Luna', 'F', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1008, 'max', 'max@gmail.com', '0877777777', 'มหาวิทยาลัยเกษตรศาสตร์', 'Kasetsart University', 'แม็กซ์', 'จี', 'Max', 'G', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1009, 'judge_k', 'judge1@org.local', NULL, NULL, NULL, NULL, NULL, 'Judge', 'K', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1010, 'judge_m', 'judge2@org.local', NULL, NULL, NULL, NULL, NULL, 'Judge', 'M', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1011, 'tony', 'tony@gmail.com', '0888888888', 'มหาวิทยาลัยเกษตรศาสตร์', 'Kasetsart University', 'โทนี่', 'เอช', 'Tony', 'H', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1012, 'ivy', 'ivy@gmail.com', '0899999999', 'มหาวิทยาลัยเกษตรศาสตร์', 'Kasetsart University', 'ไอวี่', 'ไอ', 'Ivy', 'I', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1013, 'alice', 'alice@gmail.com', '0900000001', 'มหาวิทยาลัยเกษตรศาสตร์', 'Kasetsart University', 'อลิซ', 'เอ', 'Alice', 'A', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1014, 'bob', 'bob@gmail.com', '0900000002', 'มหาวิทยาลัยขอนแก่น', 'Khon Kaen University', 'บ๊อบ', 'บี', 'Bob', 'B', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1015, 'charlie', 'charlie@gmail.com', '0900000003', 'มหาวิทยาลัยธรรมศาสตร์', 'Thammasat University', 'ชาลี', 'ซี', 'Charlie', 'C', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1016, 'david', 'david@gmail.com', '0900000004', 'จุฬาลงกรณ์มหาวิทยาลัย', 'Chulalongkorn University', 'เดวิด', 'ดี', 'David', 'D', 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25', NULL),
(1017, 'davidd', 'davidd@gmail.com', NULL, NULL, NULL, 'เดวิด', 'โจนส์', 'David', NULL, 1, '2026-02-26 19:36:51', '2026-02-26 19:38:21', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `verify_audit_logs`
--

CREATE TABLE `verify_audit_logs` (
  `verify_audit_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of verify audit log entry',
  `verify_round_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to verify_review_rounds (nullable for generic events)',
  `team_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to team_teams (nullable for generic events)',
  `actor_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who performed the action',
  `target_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to user_users affected by the action (e.g., member whose doc was checked)',
  `action_code` varchar(100) NOT NULL COMMENT 'Action code (e.g., PROFILE_SAVED, DOC_UPLOADED, ROUND_LOCKED, CHECK_FAILED)',
  `action_detail` text DEFAULT NULL COMMENT 'Additional details as JSON/string for auditing',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When action occurred'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for verification-related actions';

--
-- Dumping data for table `verify_audit_logs`
--

INSERT INTO `verify_audit_logs` (`verify_audit_id`, `verify_round_id`, `team_id`, `actor_user_id`, `target_user_id`, `action_code`, `action_detail`, `created_at`) VALUES
(98001, 6001, 2001, 1002, 1002, 'PROFILE_SAVED', NULL, '2026-02-20 17:50:25'),
(98002, 6002, 2002, 1001, 1006, 'CHECK_NEEDS_FIX', '{\"requirement\":\"STUDENT_ID\"}', '2026-02-19 17:50:25'),
(98003, 6003, 2003, 1001, NULL, 'ROUND_COMPLETED', NULL, '2026-02-12 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `verify_member_checks`
--

CREATE TABLE `verify_member_checks` (
  `check_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of verification check record',
  `verify_round_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to verify_review_rounds',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (denormalized for easier queries)',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (member being checked)',
  `requirement_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to verify_requirements (checked requirement)',
  `status` enum('pending','passed','failed','needs_fix') NOT NULL DEFAULT 'pending' COMMENT 'Check status result',
  `reason` text DEFAULT NULL COMMENT 'Reason/details when failed/needs_fix (shown to member/leader)',
  `reviewed_by_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to user_users (reviewer/admin who performed the check)',
  `reviewed_at` datetime DEFAULT NULL COMMENT 'When review decision was made',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Verification results per member per requirement per round';

--
-- Dumping data for table `verify_member_checks`
--

INSERT INTO `verify_member_checks` (`check_id`, `verify_round_id`, `team_id`, `user_id`, `requirement_id`, `status`, `reason`, `reviewed_by_user_id`, `reviewed_at`, `created_at`, `updated_at`) VALUES
(97001, 6001, 2001, 1002, 5001, 'passed', NULL, 1001, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97002, 6001, 2001, 1002, 5002, 'passed', NULL, 1001, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97003, 6001, 2001, 1003, 5001, 'passed', NULL, 1001, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97004, 6001, 2001, 1003, 5002, 'passed', NULL, 1001, '2026-02-20 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97005, 6001, 2001, 1004, 5001, 'pending', NULL, NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97006, 6001, 2001, 1004, 5002, 'pending', NULL, NULL, NULL, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97007, 6002, 2002, 1005, 5001, 'passed', NULL, 1001, '2026-02-19 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97008, 6002, 2002, 1005, 5002, 'passed', NULL, 1001, '2026-02-19 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97009, 6002, 2002, 1006, 5001, 'passed', NULL, 1001, '2026-02-19 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97010, 6002, 2002, 1006, 5002, 'needs_fix', 'รูปไม่ชัด/ข้อมูลไม่ครบ', 1001, '2026-02-19 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97011, 6003, 2003, 1007, 5001, 'passed', NULL, 1001, '2026-02-12 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97012, 6003, 2003, 1007, 5002, 'passed', NULL, 1001, '2026-02-12 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97013, 6003, 2003, 1008, 5001, 'passed', NULL, 1001, '2026-02-12 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97014, 6003, 2003, 1008, 5002, 'passed', NULL, 1001, '2026-02-12 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97015, 6003, 2003, 1011, 5001, 'passed', NULL, 1001, '2026-02-12 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97016, 6003, 2003, 1011, 5002, 'passed', NULL, 1001, '2026-02-12 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97017, 6003, 2003, 1012, 5001, 'passed', NULL, 1001, '2026-02-12 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(97018, 6003, 2003, 1012, 5002, 'passed', NULL, 1001, '2026-02-12 17:50:25', '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `verify_member_documents`
--

CREATE TABLE `verify_member_documents` (
  `document_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of uploaded document record',
  `verify_round_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to verify_review_rounds',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (denormalized for easier queries)',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (owner of document)',
  `requirement_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to verify_requirements (what requirement this document satisfies)',
  `file_storage_key` varchar(500) NOT NULL COMMENT 'Storage key/path (e.g., S3 key or local path reference)',
  `file_original_name` varchar(255) NOT NULL COMMENT 'Original uploaded filename',
  `file_mime_type` varchar(100) DEFAULT NULL COMMENT 'MIME type of uploaded file',
  `file_size_bytes` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'File size in bytes',
  `file_checksum_sha256` varchar(128) DEFAULT NULL COMMENT 'SHA-256 checksum (optional for integrity/audit)',
  `is_current` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this is the current/latest document for this requirement in this round',
  `replaced_by_document_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'If replaced, points to the new document record',
  `uploaded_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When document was uploaded',
  `uploaded_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who uploaded (should equal user_id; kept for audit)',
  `deleted_at` datetime DEFAULT NULL COMMENT 'Soft delete timestamp (if user deletes before lock)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Uploaded verification documents per member per requirement per round';

--
-- Dumping data for table `verify_member_documents`
--

INSERT INTO `verify_member_documents` (`document_id`, `verify_round_id`, `team_id`, `user_id`, `requirement_id`, `file_storage_key`, `file_original_name`, `file_mime_type`, `file_size_bytes`, `file_checksum_sha256`, `is_current`, `replaced_by_document_id`, `uploaded_at`, `uploaded_by_user_id`, `deleted_at`) VALUES
(96001, 6001, 2001, 1002, 5002, 'verify/2001/1002/student_id.pdf', 'student_id_neo.pdf', 'application/pdf', 123456, NULL, 1, NULL, '2026-02-20 17:50:25', 1002, NULL),
(96002, 6001, 2001, 1003, 5002, 'verify/2001/1003/student_id.pdf', 'student_id_mona.pdf', 'application/pdf', 234567, NULL, 1, NULL, '2026-02-20 17:50:25', 1003, NULL),
(96003, 6002, 2002, 1005, 5002, 'verify/2002/1005/student_id.pdf', 'student_id_kaito.pdf', 'application/pdf', 222222, NULL, 1, NULL, '2026-02-18 17:50:25', 1005, NULL),
(96004, 6002, 2002, 1006, 5002, 'verify/2002/1006/student_id_blurry.jpg', 'blurry.jpg', 'image/jpeg', 111111, NULL, 1, NULL, '2026-02-18 17:50:25', 1006, NULL),
(96005, 6003, 2003, 1007, 5002, 'verify/2003/1007/student_id.pdf', 'student_id_luna.pdf', 'application/pdf', 200000, NULL, 1, NULL, '2026-02-11 17:50:25', 1007, NULL),
(96006, 6003, 2003, 1008, 5002, 'verify/2003/1008/student_id.pdf', 'student_id_max.pdf', 'application/pdf', 200000, NULL, 1, NULL, '2026-02-11 17:50:25', 1008, NULL),
(96007, 6003, 2003, 1011, 5002, 'verify/2003/1011/student_id.pdf', 'student_id_tony.pdf', 'application/pdf', 200000, NULL, 1, NULL, '2026-02-11 17:50:25', 1011, NULL),
(96008, 6003, 2003, 1012, 5002, 'verify/2003/1012/student_id.pdf', 'student_id_ivy.pdf', 'application/pdf', 200000, NULL, 1, NULL, '2026-02-11 17:50:25', 1012, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `verify_member_profiles`
--

CREATE TABLE `verify_member_profiles` (
  `verify_profile_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of member verification profile',
  `verify_round_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to verify_review_rounds',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (denormalized for easier queries)',
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users (the member who fills their own profile)',
  `national_id_hash` varchar(255) DEFAULT NULL COMMENT 'Hashed national ID (store hash only if needed; do NOT store raw ID if avoidable)',
  `birth_date` date DEFAULT NULL COMMENT 'Birth date (if required for verification)',
  `address_text` text DEFAULT NULL COMMENT 'Address text (if required for verification)',
  `extra_data_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional profile fields as JSON (flexible schema)' CHECK (json_valid(`extra_data_json`)),
  `is_profile_complete` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether member marked profile as complete (client-side validation result)',
  `completed_at` datetime DEFAULT NULL COMMENT 'When member completed the profile section',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Self-filled verification profile per member per team per round';

--
-- Dumping data for table `verify_member_profiles`
--

INSERT INTO `verify_member_profiles` (`verify_profile_id`, `verify_round_id`, `team_id`, `user_id`, `national_id_hash`, `birth_date`, `address_text`, `extra_data_json`, `is_profile_complete`, `completed_at`, `updated_at`) VALUES
(95001, 6001, 2001, 1002, '45113466cdb929b4dbae968d47d9579e1d459bbb6365e1d17e340f5dd16f22a2', '2000-01-01', 'ขอนแก่น', NULL, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(95002, 6001, 2001, 1003, '337cb8d190711d959fc4de3b353d6d3dd11a317d94e450fe30966a7b0a09cda5', '2001-02-02', 'ขอนแก่น', NULL, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(95003, 6001, 2001, 1004, NULL, NULL, NULL, NULL, 0, NULL, '2026-02-20 17:50:25'),
(95004, 6002, 2002, 1005, 'f52c047a0e283e60332cc07e2155610bd1bd1e839d129c89024b7df6028827ee', '1999-03-03', 'กรุงเทพ', NULL, 1, '2026-02-18 17:50:25', '2026-02-20 17:50:25'),
(95005, 6002, 2002, 1006, '62a3caa122f66cdfd295dad375c85a0a86b9deccbbf1524de9ad0bb0077c5b3d', '1998-04-04', 'กรุงเทพ', NULL, 1, '2026-02-18 17:50:25', '2026-02-20 17:50:25'),
(95006, 6003, 2003, 1007, '305bd14835f0dad8df373a32682da99428810bb543c5ea31422d320966724440', '1997-05-05', 'กรุงเทพ', NULL, 1, '2026-02-11 17:50:25', '2026-02-20 17:50:25'),
(95007, 6003, 2003, 1008, '5784325b5d77345d34ddc41692bee76f64adf38f3f74345e9331882b7d7d5649', '1997-06-06', 'กรุงเทพ', NULL, 1, '2026-02-11 17:50:25', '2026-02-20 17:50:25'),
(95008, 6003, 2003, 1011, '50d8ebfcabf9e1bcaba348cb64aa2fff881c834a6c88861d5be99e0f7c703b5a', '1996-07-07', 'กรุงเทพ', NULL, 1, '2026-02-11 17:50:25', '2026-02-20 17:50:25'),
(95009, 6003, 2003, 1012, '358c66d95d637390c956cd6d317e5c411234fbf95cb46e0681c7523962034b67', '1996-08-08', 'กรุงเทพ', NULL, 1, '2026-02-11 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `verify_requirements`
--

CREATE TABLE `verify_requirements` (
  `requirement_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of verification requirement',
  `requirement_code` varchar(50) NOT NULL COMMENT 'Stable code for requirement (e.g., PROFILE_COMPLETE, ID_CARD, STUDENT_CARD)',
  `requirement_name_th` varchar(255) NOT NULL COMMENT 'Requirement name shown in UI (Thai)',
  `requirement_name_en` varchar(255) NOT NULL COMMENT 'Requirement name shown in UI (English)',
  `requirement_type` enum('profile','document') NOT NULL COMMENT 'Requirement type: profile=form fields, document=file upload',
  `is_required` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this requirement is mandatory for submission',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Sorting order for display (lower comes first)',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this requirement is currently enabled',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Master list of verification requirements';

--
-- Dumping data for table `verify_requirements`
--

INSERT INTO `verify_requirements` (`requirement_id`, `requirement_code`, `requirement_name_th`, `requirement_name_en`, `requirement_type`, `is_required`, `sort_order`, `is_enabled`, `created_at`, `updated_at`) VALUES
(5001, 'PROFILE', 'ข้อมูลส่วนตัว', 'Profile Info', 'profile', 1, 1, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(5002, 'STUDENT_ID', 'บัตรนักศึกษา/บุคลากร', 'Student/Staff ID', 'document', 1, 2, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25'),
(5003, 'CONSENT', 'หนังสือยินยอม', 'Consent Form', 'document', 0, 3, 1, '2026-02-20 17:50:25', '2026-02-20 17:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `verify_review_rounds`
--

CREATE TABLE `verify_review_rounds` (
  `verify_round_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of verification round',
  `team_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to team_teams (team that this verification round belongs to)',
  `round_no` int(11) NOT NULL COMMENT 'Round number (1,2,3...) increasing per team',
  `status` enum('draft','locked','submitted','returned','completed','cancelled') NOT NULL DEFAULT 'draft' COMMENT 'Round status lifecycle',
  `created_by_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to user_users who created the round (typically leader)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `locked_at` datetime DEFAULT NULL COMMENT 'When round was locked (no more edits) before submission',
  `submitted_at` datetime DEFAULT NULL COMMENT 'When leader submitted the team for review (will be used in review_* later)',
  `returned_at` datetime DEFAULT NULL COMMENT 'When round was returned for fixes',
  `completed_at` datetime DEFAULT NULL COMMENT 'When round was completed (all checks passed)',
  `note` text DEFAULT NULL COMMENT 'Optional note for this round (e.g., submission note from leader)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Verification rounds per team for resubmission tracking';

--
-- Dumping data for table `verify_review_rounds`
--

INSERT INTO `verify_review_rounds` (`verify_round_id`, `team_id`, `round_no`, `status`, `created_by_user_id`, `created_at`, `locked_at`, `submitted_at`, `returned_at`, `completed_at`, `note`) VALUES
(6001, 2001, 1, 'draft', 1002, '2026-02-20 17:50:25', NULL, NULL, NULL, NULL, 'กำลังกรอกข้อมูล'),
(6002, 2002, 1, 'returned', 1005, '2026-02-18 17:50:25', '2026-02-18 17:50:25', '2026-02-18 17:50:25', '2026-02-19 17:50:25', NULL, 'มีเอกสาร 1 คนไม่ถูกต้อง'),
(6003, 2003, 1, 'completed', 1007, '2026-02-10 17:50:25', '2026-02-11 17:50:25', '2026-02-11 17:50:25', NULL, '2026-02-12 17:50:25', 'ผ่านการตรวจแล้ว');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `access_allowlist`
--
ALTER TABLE `access_allowlist`
  ADD PRIMARY KEY (`allow_id`),
  ADD UNIQUE KEY `uq_access_allowlist_user_role` (`user_id`,`access_role`),
  ADD KEY `idx_access_allowlist_role_active` (`access_role`,`is_active`),
  ADD KEY `fk_access_allowlist_granted_by` (`granted_by_user_id`);

--
-- Indexes for table `content_contacts`
--
ALTER TABLE `content_contacts`
  ADD PRIMARY KEY (`contact_id`),
  ADD KEY `idx_content_contacts_enabled_sort` (`is_enabled`,`sort_order`);

--
-- Indexes for table `content_pages`
--
ALTER TABLE `content_pages`
  ADD PRIMARY KEY (`page_id`),
  ADD UNIQUE KEY `uq_content_pages_code` (`page_code`),
  ADD KEY `idx_content_pages_published` (`is_published`),
  ADD KEY `fk_content_pages_created_by` (`created_by_user_id`);

--
-- Indexes for table `content_rewards`
--
ALTER TABLE `content_rewards`
  ADD PRIMARY KEY (`reward_id`),
  ADD KEY `idx_content_rewards_enabled_sort` (`is_enabled`,`sort_order`),
  ADD KEY `idx_content_rewards_rank` (`reward_rank`);

--
-- Indexes for table `content_sponsors`
--
ALTER TABLE `content_sponsors`
  ADD PRIMARY KEY (`sponsor_id`),
  ADD KEY `idx_content_sponsors_enabled_sort` (`is_enabled`,`sort_order`),
  ADD KEY `idx_content_sponsors_tier` (`tier_code`);

--
-- Indexes for table `drive_audit_logs`
--
ALTER TABLE `drive_audit_logs`
  ADD PRIMARY KEY (`drive_audit_id`),
  ADD KEY `idx_drive_audit_logs_team` (`team_id`),
  ADD KEY `idx_drive_audit_logs_actor` (`actor_user_id`),
  ADD KEY `fk_drive_audit_logs_folder` (`folder_id`),
  ADD KEY `fk_drive_audit_logs_file` (`file_id`);

--
-- Indexes for table `drive_files`
--
ALTER TABLE `drive_files`
  ADD PRIMARY KEY (`file_id`),
  ADD KEY `idx_drive_files_team_folder` (`team_id`,`folder_id`),
  ADD KEY `idx_drive_files_uploaded_by` (`uploaded_by_user_id`),
  ADD KEY `fk_drive_files_replaced_by` (`replaced_by_file_id`),
  ADD KEY `idx_drive_files_folder_current` (`folder_id`,`is_current`);

--
-- Indexes for table `drive_folders`
--
ALTER TABLE `drive_folders`
  ADD PRIMARY KEY (`folder_id`),
  ADD KEY `idx_drive_folders_team` (`team_id`),
  ADD KEY `idx_drive_folders_parent` (`parent_folder_id`),
  ADD KEY `fk_drive_folders_created_by` (`created_by_user_id`),
  ADD KEY `idx_drive_folders_team_root` (`team_id`,`is_root`);

--
-- Indexes for table `event_audit_logs`
--
ALTER TABLE `event_audit_logs`
  ADD PRIMARY KEY (`event_audit_id`),
  ADD KEY `idx_event_audit_logs_round` (`participation_round_id`),
  ADD KEY `idx_event_audit_logs_team` (`team_id`),
  ADD KEY `idx_event_audit_logs_actor` (`actor_user_id`);

--
-- Indexes for table `event_member_confirmations`
--
ALTER TABLE `event_member_confirmations`
  ADD PRIMARY KEY (`member_confirmation_id`),
  ADD UNIQUE KEY `uq_event_member_confirmations_round_team_user` (`participation_round_id`,`team_id`,`user_id`),
  ADD KEY `idx_event_member_confirmations_team` (`team_id`),
  ADD KEY `idx_event_member_confirmations_status` (`participation_round_id`,`status`),
  ADD KEY `fk_event_member_confirmations_user` (`user_id`);

--
-- Indexes for table `event_participation_rounds`
--
ALTER TABLE `event_participation_rounds`
  ADD PRIMARY KEY (`participation_round_id`),
  ADD UNIQUE KEY `uq_event_participation_rounds_code` (`round_code`),
  ADD KEY `idx_event_participation_rounds_status` (`status`,`confirm_deadline_at`),
  ADD KEY `fk_event_participation_rounds_created_by` (`created_by_user_id`);

--
-- Indexes for table `event_schedules`
--
ALTER TABLE `event_schedules`
  ADD PRIMARY KEY (`schedule_id`),
  ADD UNIQUE KEY `uq_event_schedules_code` (`schedule_code`),
  ADD KEY `idx_event_schedules_published` (`is_published`);

--
-- Indexes for table `event_schedule_days`
--
ALTER TABLE `event_schedule_days`
  ADD PRIMARY KEY (`day_id`),
  ADD UNIQUE KEY `uq_event_schedule_days_schedule_date` (`schedule_id`,`day_date`),
  ADD KEY `idx_event_schedule_days_schedule` (`schedule_id`,`sort_order`,`day_date`);

--
-- Indexes for table `event_schedule_items`
--
ALTER TABLE `event_schedule_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `idx_event_schedule_items_day_time` (`day_id`,`start_time`,`end_time`),
  ADD KEY `idx_event_schedule_items_schedule` (`schedule_id`),
  ADD KEY `idx_event_schedule_items_track` (`track_id`),
  ADD KEY `idx_event_schedule_items_audience` (`audience`,`is_enabled`);

--
-- Indexes for table `event_schedule_item_targets`
--
ALTER TABLE `event_schedule_item_targets`
  ADD PRIMARY KEY (`target_id`),
  ADD UNIQUE KEY `uq_event_schedule_item_targets_item_team` (`item_id`,`team_id`),
  ADD KEY `idx_event_schedule_item_targets_team` (`team_id`);

--
-- Indexes for table `event_schedule_tracks`
--
ALTER TABLE `event_schedule_tracks`
  ADD PRIMARY KEY (`track_id`),
  ADD UNIQUE KEY `uq_event_schedule_tracks_schedule_code` (`schedule_id`,`track_code`),
  ADD KEY `idx_event_schedule_tracks_schedule` (`schedule_id`,`sort_order`);

--
-- Indexes for table `event_team_slots`
--
ALTER TABLE `event_team_slots`
  ADD PRIMARY KEY (`team_slot_id`),
  ADD UNIQUE KEY `uq_event_team_slots_round_team` (`participation_round_id`,`team_id`),
  ADD KEY `idx_event_team_slots_round_type_rank` (`participation_round_id`,`slot_type`,`slot_rank`),
  ADD KEY `idx_event_team_slots_status` (`participation_round_id`,`slot_status`),
  ADD KEY `fk_event_team_slots_team` (`team_id`),
  ADD KEY `fk_event_team_slots_decided_by` (`decided_by_user_id`),
  ADD KEY `fk_event_team_slots_replaced_by_team` (`replaced_by_team_id`);

--
-- Indexes for table `event_winners`
--
ALTER TABLE `event_winners`
  ADD PRIMARY KEY (`winner_id`),
  ADD KEY `idx_event_winners_team` (`team_id`),
  ADD KEY `idx_event_winners_published` (`is_published`,`placement`),
  ADD KEY `fk_event_winners_created_by` (`created_by_user_id`);

--
-- Indexes for table `notify_announcements`
--
ALTER TABLE `notify_announcements`
  ADD PRIMARY KEY (`announcement_id`),
  ADD UNIQUE KEY `uq_notify_announcements_code` (`announcement_code`),
  ADD KEY `idx_notify_announcements_status` (`status`,`publish_at`),
  ADD KEY `fk_notify_announcements_created_by` (`created_by_user_id`);

--
-- Indexes for table `notify_announcement_targets`
--
ALTER TABLE `notify_announcement_targets`
  ADD PRIMARY KEY (`target_id`),
  ADD UNIQUE KEY `uq_notify_announcement_targets_announcement_team` (`announcement_id`,`team_id`),
  ADD KEY `idx_notify_announcement_targets_team` (`team_id`),
  ADD KEY `idx_notify_announcement_targets_team_announcement` (`team_id`,`announcement_id`);

--
-- Indexes for table `notify_audit_logs`
--
ALTER TABLE `notify_audit_logs`
  ADD PRIMARY KEY (`notify_audit_id`),
  ADD KEY `idx_notify_audit_logs_announcement` (`announcement_id`),
  ADD KEY `idx_notify_audit_logs_actor` (`actor_user_id`);

--
-- Indexes for table `notify_deliveries`
--
ALTER TABLE `notify_deliveries`
  ADD PRIMARY KEY (`delivery_id`),
  ADD KEY `idx_notify_deliveries_announcement_channel` (`announcement_id`,`channel`),
  ADD KEY `idx_notify_deliveries_user_status` (`user_id`,`status`),
  ADD KEY `fk_notify_deliveries_team` (`team_id`);

--
-- Indexes for table `notify_email_templates`
--
ALTER TABLE `notify_email_templates`
  ADD PRIMARY KEY (`template_id`),
  ADD UNIQUE KEY `uq_notify_email_templates_code` (`template_code`),
  ADD KEY `idx_notify_email_templates_enabled` (`is_enabled`),
  ADD KEY `fk_notify_email_templates_created_by` (`created_by_user_id`);

--
-- Indexes for table `review_assignments`
--
ALTER TABLE `review_assignments`
  ADD PRIMARY KEY (`assignment_id`),
  ADD UNIQUE KEY `uq_review_assignments_submission_reviewer` (`submission_id`,`reviewer_user_id`),
  ADD KEY `idx_review_assignments_reviewer_status` (`reviewer_user_id`,`status`),
  ADD KEY `fk_review_assignments_role` (`reviewer_role_id`),
  ADD KEY `fk_review_assignments_assigned_by` (`assigned_by_user_id`),
  ADD KEY `idx_review_assignments_submission_status` (`submission_id`,`status`);

--
-- Indexes for table `review_audit_logs`
--
ALTER TABLE `review_audit_logs`
  ADD PRIMARY KEY (`review_audit_id`),
  ADD KEY `idx_review_audit_logs_submission` (`submission_id`),
  ADD KEY `idx_review_audit_logs_team` (`team_id`),
  ADD KEY `idx_review_audit_logs_actor` (`actor_user_id`);

--
-- Indexes for table `review_comments`
--
ALTER TABLE `review_comments`
  ADD PRIMARY KEY (`comment_id`),
  ADD KEY `idx_review_comments_submission` (`submission_id`,`created_at`),
  ADD KEY `fk_review_comments_author` (`author_user_id`);

--
-- Indexes for table `review_decisions`
--
ALTER TABLE `review_decisions`
  ADD PRIMARY KEY (`decision_id`),
  ADD UNIQUE KEY `uq_review_decisions_submission` (`submission_id`),
  ADD KEY `fk_review_decisions_decided_by` (`decided_by_user_id`);

--
-- Indexes for table `review_reviewer_roles`
--
ALTER TABLE `review_reviewer_roles`
  ADD PRIMARY KEY (`reviewer_role_id`),
  ADD UNIQUE KEY `uq_review_reviewer_roles_code` (`role_code`);

--
-- Indexes for table `review_submissions`
--
ALTER TABLE `review_submissions`
  ADD PRIMARY KEY (`submission_id`),
  ADD UNIQUE KEY `uq_review_submissions_team_no` (`team_id`,`submission_no`),
  ADD UNIQUE KEY `uq_review_submissions_verify_round` (`verify_round_id`),
  ADD KEY `idx_review_submissions_status` (`status`,`submitted_at`),
  ADD KEY `fk_review_submissions_submitted_by` (`submitted_by_user_id`),
  ADD KEY `idx_review_submissions_team_status` (`team_id`,`status`,`submitted_at`);

--
-- Indexes for table `review_submission_members`
--
ALTER TABLE `review_submission_members`
  ADD PRIMARY KEY (`submission_member_id`),
  ADD UNIQUE KEY `uq_review_submission_members_submission_user` (`submission_id`,`user_id`),
  ADD KEY `idx_review_submission_members_team` (`team_id`),
  ADD KEY `fk_review_submission_members_user` (`user_id`);

--
-- Indexes for table `sys_configs`
--
ALTER TABLE `sys_configs`
  ADD PRIMARY KEY (`config_key`);

--
-- Indexes for table `team_audit_logs`
--
ALTER TABLE `team_audit_logs`
  ADD PRIMARY KEY (`team_audit_id`),
  ADD KEY `idx_team_audit_logs_team` (`team_id`),
  ADD KEY `idx_team_audit_logs_actor` (`actor_user_id`);

--
-- Indexes for table `team_invitations`
--
ALTER TABLE `team_invitations`
  ADD PRIMARY KEY (`invitation_id`),
  ADD KEY `idx_team_invitations_team` (`team_id`),
  ADD KEY `idx_team_invitations_invited` (`invited_user_id`),
  ADD KEY `fk_team_invitations_invited_by_user` (`invited_by_user_id`);

--
-- Indexes for table `team_join_requests`
--
ALTER TABLE `team_join_requests`
  ADD PRIMARY KEY (`join_request_id`),
  ADD KEY `idx_team_join_requests_team` (`team_id`),
  ADD KEY `idx_team_join_requests_requester` (`requester_user_id`),
  ADD KEY `fk_team_join_requests_leader_action_by` (`leader_action_by_user_id`);

--
-- Indexes for table `team_members`
--
ALTER TABLE `team_members`
  ADD PRIMARY KEY (`team_member_id`),
  ADD UNIQUE KEY `uq_team_members_team_user` (`team_id`,`user_id`),
  ADD KEY `idx_team_members_user` (`user_id`);

--
-- Indexes for table `team_teams`
--
ALTER TABLE `team_teams`
  ADD PRIMARY KEY (`team_id`),
  ADD UNIQUE KEY `uq_team_teams_team_code` (`team_code`),
  ADD KEY `idx_team_teams_leader` (`current_leader_user_id`),
  ADD KEY `idx_team_teams_visibility` (`visibility`),
  ADD KEY `idx_team_teams_status` (`status`);

--
-- Indexes for table `team_team_codes`
--
ALTER TABLE `team_team_codes`
  ADD PRIMARY KEY (`team_code_id`),
  ADD UNIQUE KEY `uq_team_team_codes_invite_code` (`invite_code`),
  ADD KEY `idx_team_team_codes_team` (`team_id`),
  ADD KEY `fk_team_team_codes_created_by` (`created_by_user_id`);

--
-- Indexes for table `user_consents`
--
ALTER TABLE `user_consents`
  ADD PRIMARY KEY (`user_consent_id`),
  ADD UNIQUE KEY `uq_user_consents_user_doc` (`user_id`,`consent_doc_id`),
  ADD KEY `idx_user_consents_user_id` (`user_id`),
  ADD KEY `fk_user_consents_doc` (`consent_doc_id`);

--
-- Indexes for table `user_consent_documents`
--
ALTER TABLE `user_consent_documents`
  ADD PRIMARY KEY (`consent_doc_id`),
  ADD UNIQUE KEY `uq_user_consent_documents_code_version` (`doc_code`,`version`);

--
-- Indexes for table `user_credentials_local`
--
ALTER TABLE `user_credentials_local`
  ADD PRIMARY KEY (`cred_id`),
  ADD UNIQUE KEY `uq_user_credentials_local_login_email` (`login_email`),
  ADD KEY `idx_user_credentials_local_user_id` (`user_id`);

--
-- Indexes for table `user_identities`
--
ALTER TABLE `user_identities`
  ADD PRIMARY KEY (`identity_id`),
  ADD UNIQUE KEY `uq_user_identities_type_identifier` (`identity_type`,`identifier`),
  ADD KEY `idx_user_identities_user_id` (`user_id`);

--
-- Indexes for table `user_privacy_settings`
--
ALTER TABLE `user_privacy_settings`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `user_public_profiles`
--
ALTER TABLE `user_public_profiles`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `user_social_links`
--
ALTER TABLE `user_social_links`
  ADD PRIMARY KEY (`social_link_id`),
  ADD KEY `idx_user_social_links_user_id` (`user_id`);

--
-- Indexes for table `user_sso_accounts`
--
ALTER TABLE `user_sso_accounts`
  ADD PRIMARY KEY (`sso_account_id`),
  ADD UNIQUE KEY `uq_user_sso_accounts_provider_subject` (`provider_id`,`provider_subject`),
  ADD KEY `idx_user_sso_accounts_user_id` (`user_id`);

--
-- Indexes for table `user_sso_providers`
--
ALTER TABLE `user_sso_providers`
  ADD PRIMARY KEY (`provider_id`),
  ADD UNIQUE KEY `uq_user_sso_providers_code` (`provider_code`);

--
-- Indexes for table `user_users`
--
ALTER TABLE `user_users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `uq_user_users_user_name` (`user_name`),
  ADD UNIQUE KEY `uq_user_users_email` (`email`);

--
-- Indexes for table `verify_audit_logs`
--
ALTER TABLE `verify_audit_logs`
  ADD PRIMARY KEY (`verify_audit_id`),
  ADD KEY `idx_verify_audit_logs_round` (`verify_round_id`),
  ADD KEY `idx_verify_audit_logs_team` (`team_id`),
  ADD KEY `idx_verify_audit_logs_actor` (`actor_user_id`),
  ADD KEY `fk_verify_audit_logs_target_user` (`target_user_id`);

--
-- Indexes for table `verify_member_checks`
--
ALTER TABLE `verify_member_checks`
  ADD PRIMARY KEY (`check_id`),
  ADD UNIQUE KEY `uq_verify_member_checks_round_user_req` (`verify_round_id`,`user_id`,`requirement_id`),
  ADD KEY `idx_verify_member_checks_team` (`team_id`),
  ADD KEY `idx_verify_member_checks_status` (`verify_round_id`,`status`),
  ADD KEY `fk_verify_member_checks_user` (`user_id`),
  ADD KEY `fk_verify_member_checks_requirement` (`requirement_id`),
  ADD KEY `fk_verify_member_checks_reviewed_by` (`reviewed_by_user_id`),
  ADD KEY `idx_verify_member_checks_ready` (`team_id`,`verify_round_id`,`status`);

--
-- Indexes for table `verify_member_documents`
--
ALTER TABLE `verify_member_documents`
  ADD PRIMARY KEY (`document_id`),
  ADD KEY `idx_verify_member_documents_round_team_user` (`verify_round_id`,`team_id`,`user_id`),
  ADD KEY `idx_verify_member_documents_requirement` (`requirement_id`),
  ADD KEY `idx_verify_member_documents_current` (`verify_round_id`,`user_id`,`requirement_id`,`is_current`),
  ADD KEY `fk_verify_member_documents_team` (`team_id`),
  ADD KEY `fk_verify_member_documents_user` (`user_id`),
  ADD KEY `fk_verify_member_documents_uploaded_by` (`uploaded_by_user_id`),
  ADD KEY `fk_verify_member_documents_replaced_by` (`replaced_by_document_id`);

--
-- Indexes for table `verify_member_profiles`
--
ALTER TABLE `verify_member_profiles`
  ADD PRIMARY KEY (`verify_profile_id`),
  ADD UNIQUE KEY `uq_verify_member_profiles_round_team_user` (`verify_round_id`,`team_id`,`user_id`),
  ADD KEY `idx_verify_member_profiles_user` (`user_id`),
  ADD KEY `idx_verify_member_profiles_complete` (`team_id`,`verify_round_id`,`is_profile_complete`);

--
-- Indexes for table `verify_requirements`
--
ALTER TABLE `verify_requirements`
  ADD PRIMARY KEY (`requirement_id`),
  ADD UNIQUE KEY `uq_verify_requirements_code` (`requirement_code`),
  ADD KEY `idx_verify_requirements_enabled` (`is_enabled`,`sort_order`);

--
-- Indexes for table `verify_review_rounds`
--
ALTER TABLE `verify_review_rounds`
  ADD PRIMARY KEY (`verify_round_id`),
  ADD UNIQUE KEY `uq_verify_review_rounds_team_roundno` (`team_id`,`round_no`),
  ADD KEY `idx_verify_review_rounds_team_status` (`team_id`,`status`),
  ADD KEY `fk_verify_review_rounds_created_by` (`created_by_user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `access_allowlist`
--
ALTER TABLE `access_allowlist`
  MODIFY `allow_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of allowlist record', AUTO_INCREMENT=190004;

--
-- AUTO_INCREMENT for table `content_contacts`
--
ALTER TABLE `content_contacts`
  MODIFY `contact_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of contact record';

--
-- AUTO_INCREMENT for table `content_pages`
--
ALTER TABLE `content_pages`
  MODIFY `page_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of content page', AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `content_rewards`
--
ALTER TABLE `content_rewards`
  MODIFY `reward_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of reward';

--
-- AUTO_INCREMENT for table `content_sponsors`
--
ALTER TABLE `content_sponsors`
  MODIFY `sponsor_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of sponsor';

--
-- AUTO_INCREMENT for table `drive_audit_logs`
--
ALTER TABLE `drive_audit_logs`
  MODIFY `drive_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of drive audit log entry', AUTO_INCREMENT=180003;

--
-- AUTO_INCREMENT for table `drive_files`
--
ALTER TABLE `drive_files`
  MODIFY `file_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of file record', AUTO_INCREMENT=170002;

--
-- AUTO_INCREMENT for table `drive_folders`
--
ALTER TABLE `drive_folders`
  MODIFY `folder_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of folder', AUTO_INCREMENT=160003;

--
-- AUTO_INCREMENT for table `event_audit_logs`
--
ALTER TABLE `event_audit_logs`
  MODIFY `event_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of event audit log entry', AUTO_INCREMENT=120003;

--
-- AUTO_INCREMENT for table `event_member_confirmations`
--
ALTER TABLE `event_member_confirmations`
  MODIFY `member_confirmation_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of member attendance confirmation', AUTO_INCREMENT=110005;

--
-- AUTO_INCREMENT for table `event_participation_rounds`
--
ALTER TABLE `event_participation_rounds`
  MODIFY `participation_round_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of participation round', AUTO_INCREMENT=8002;

--
-- AUTO_INCREMENT for table `event_schedules`
--
ALTER TABLE `event_schedules`
  MODIFY `schedule_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of schedule container', AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `event_schedule_days`
--
ALTER TABLE `event_schedule_days`
  MODIFY `day_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of schedule day', AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `event_schedule_items`
--
ALTER TABLE `event_schedule_items`
  MODIFY `item_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of schedule item', AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `event_schedule_item_targets`
--
ALTER TABLE `event_schedule_item_targets`
  MODIFY `target_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of schedule item target', AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `event_schedule_tracks`
--
ALTER TABLE `event_schedule_tracks`
  MODIFY `track_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of schedule track', AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `event_team_slots`
--
ALTER TABLE `event_team_slots`
  MODIFY `team_slot_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team slot record', AUTO_INCREMENT=100003;

--
-- AUTO_INCREMENT for table `event_winners`
--
ALTER TABLE `event_winners`
  MODIFY `winner_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of winner record';

--
-- AUTO_INCREMENT for table `notify_announcements`
--
ALTER TABLE `notify_announcements`
  MODIFY `announcement_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of announcement', AUTO_INCREMENT=9003;

--
-- AUTO_INCREMENT for table `notify_announcement_targets`
--
ALTER TABLE `notify_announcement_targets`
  MODIFY `target_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of announcement target', AUTO_INCREMENT=130003;

--
-- AUTO_INCREMENT for table `notify_audit_logs`
--
ALTER TABLE `notify_audit_logs`
  MODIFY `notify_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of notify audit log entry', AUTO_INCREMENT=150003;

--
-- AUTO_INCREMENT for table `notify_deliveries`
--
ALTER TABLE `notify_deliveries`
  MODIFY `delivery_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of notification delivery', AUTO_INCREMENT=140007;

--
-- AUTO_INCREMENT for table `notify_email_templates`
--
ALTER TABLE `notify_email_templates`
  MODIFY `template_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of email template', AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `review_assignments`
--
ALTER TABLE `review_assignments`
  MODIFY `assignment_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of assignment', AUTO_INCREMENT=99604;

--
-- AUTO_INCREMENT for table `review_audit_logs`
--
ALTER TABLE `review_audit_logs`
  MODIFY `review_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of review audit log entry', AUTO_INCREMENT=99903;

--
-- AUTO_INCREMENT for table `review_comments`
--
ALTER TABLE `review_comments`
  MODIFY `comment_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of review comment', AUTO_INCREMENT=99803;

--
-- AUTO_INCREMENT for table `review_decisions`
--
ALTER TABLE `review_decisions`
  MODIFY `decision_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of review decision', AUTO_INCREMENT=99703;

--
-- AUTO_INCREMENT for table `review_reviewer_roles`
--
ALTER TABLE `review_reviewer_roles`
  MODIFY `reviewer_role_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of reviewer role', AUTO_INCREMENT=99003;

--
-- AUTO_INCREMENT for table `review_submissions`
--
ALTER TABLE `review_submissions`
  MODIFY `submission_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of review submission', AUTO_INCREMENT=7004;

--
-- AUTO_INCREMENT for table `review_submission_members`
--
ALTER TABLE `review_submission_members`
  MODIFY `submission_member_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of submission member snapshot', AUTO_INCREMENT=99510;

--
-- AUTO_INCREMENT for table `team_audit_logs`
--
ALTER TABLE `team_audit_logs`
  MODIFY `team_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team audit log entry', AUTO_INCREMENT=93004;

--
-- AUTO_INCREMENT for table `team_invitations`
--
ALTER TABLE `team_invitations`
  MODIFY `invitation_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of invitation', AUTO_INCREMENT=92003;

--
-- AUTO_INCREMENT for table `team_join_requests`
--
ALTER TABLE `team_join_requests`
  MODIFY `join_request_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of join request', AUTO_INCREMENT=91003;

--
-- AUTO_INCREMENT for table `team_members`
--
ALTER TABLE `team_members`
  MODIFY `team_member_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team member record', AUTO_INCREMENT=80013;

--
-- AUTO_INCREMENT for table `team_teams`
--
ALTER TABLE `team_teams`
  MODIFY `team_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team', AUTO_INCREMENT=2007;

--
-- AUTO_INCREMENT for table `team_team_codes`
--
ALTER TABLE `team_team_codes`
  MODIFY `team_code_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team code record', AUTO_INCREMENT=90004;

--
-- AUTO_INCREMENT for table `user_consents`
--
ALTER TABLE `user_consents`
  MODIFY `user_consent_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of user consent record', AUTO_INCREMENT=70013;

--
-- AUTO_INCREMENT for table `user_consent_documents`
--
ALTER TABLE `user_consent_documents`
  MODIFY `consent_doc_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of consent document version', AUTO_INCREMENT=20002;

--
-- AUTO_INCREMENT for table `user_credentials_local`
--
ALTER TABLE `user_credentials_local`
  MODIFY `cred_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of local credentials record', AUTO_INCREMENT=40013;

--
-- AUTO_INCREMENT for table `user_identities`
--
ALTER TABLE `user_identities`
  MODIFY `identity_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of identity record', AUTO_INCREMENT=50012;

--
-- AUTO_INCREMENT for table `user_social_links`
--
ALTER TABLE `user_social_links`
  MODIFY `social_link_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of social link record', AUTO_INCREMENT=30004;

--
-- AUTO_INCREMENT for table `user_sso_accounts`
--
ALTER TABLE `user_sso_accounts`
  MODIFY `sso_account_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of SSO account mapping', AUTO_INCREMENT=61002;

--
-- AUTO_INCREMENT for table `user_sso_providers`
--
ALTER TABLE `user_sso_providers`
  MODIFY `provider_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of SSO provider', AUTO_INCREMENT=60002;

--
-- AUTO_INCREMENT for table `user_users`
--
ALTER TABLE `user_users`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of user', AUTO_INCREMENT=1018;

--
-- AUTO_INCREMENT for table `verify_audit_logs`
--
ALTER TABLE `verify_audit_logs`
  MODIFY `verify_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of verify audit log entry', AUTO_INCREMENT=98004;

--
-- AUTO_INCREMENT for table `verify_member_checks`
--
ALTER TABLE `verify_member_checks`
  MODIFY `check_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of verification check record', AUTO_INCREMENT=97019;

--
-- AUTO_INCREMENT for table `verify_member_documents`
--
ALTER TABLE `verify_member_documents`
  MODIFY `document_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of uploaded document record', AUTO_INCREMENT=96009;

--
-- AUTO_INCREMENT for table `verify_member_profiles`
--
ALTER TABLE `verify_member_profiles`
  MODIFY `verify_profile_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of member verification profile', AUTO_INCREMENT=95010;

--
-- AUTO_INCREMENT for table `verify_requirements`
--
ALTER TABLE `verify_requirements`
  MODIFY `requirement_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of verification requirement', AUTO_INCREMENT=5004;

--
-- AUTO_INCREMENT for table `verify_review_rounds`
--
ALTER TABLE `verify_review_rounds`
  MODIFY `verify_round_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of verification round', AUTO_INCREMENT=6004;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `access_allowlist`
--
ALTER TABLE `access_allowlist`
  ADD CONSTRAINT `fk_access_allowlist_granted_by` FOREIGN KEY (`granted_by_user_id`) REFERENCES `user_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_access_allowlist_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `content_pages`
--
ALTER TABLE `content_pages`
  ADD CONSTRAINT `fk_content_pages_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `user_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `drive_audit_logs`
--
ALTER TABLE `drive_audit_logs`
  ADD CONSTRAINT `fk_drive_audit_logs_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_drive_audit_logs_file` FOREIGN KEY (`file_id`) REFERENCES `drive_files` (`file_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_drive_audit_logs_folder` FOREIGN KEY (`folder_id`) REFERENCES `drive_folders` (`folder_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_drive_audit_logs_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `drive_files`
--
ALTER TABLE `drive_files`
  ADD CONSTRAINT `fk_drive_files_folder` FOREIGN KEY (`folder_id`) REFERENCES `drive_folders` (`folder_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_drive_files_replaced_by` FOREIGN KEY (`replaced_by_file_id`) REFERENCES `drive_files` (`file_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_drive_files_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_drive_files_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `drive_folders`
--
ALTER TABLE `drive_folders`
  ADD CONSTRAINT `fk_drive_folders_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_drive_folders_parent` FOREIGN KEY (`parent_folder_id`) REFERENCES `drive_folders` (`folder_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_drive_folders_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `event_audit_logs`
--
ALTER TABLE `event_audit_logs`
  ADD CONSTRAINT `fk_event_audit_logs_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_audit_logs_round` FOREIGN KEY (`participation_round_id`) REFERENCES `event_participation_rounds` (`participation_round_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_audit_logs_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `event_member_confirmations`
--
ALTER TABLE `event_member_confirmations`
  ADD CONSTRAINT `fk_event_member_confirmations_round` FOREIGN KEY (`participation_round_id`) REFERENCES `event_participation_rounds` (`participation_round_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_member_confirmations_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_member_confirmations_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `event_participation_rounds`
--
ALTER TABLE `event_participation_rounds`
  ADD CONSTRAINT `fk_event_participation_rounds_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `event_schedule_days`
--
ALTER TABLE `event_schedule_days`
  ADD CONSTRAINT `fk_event_schedule_days_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `event_schedules` (`schedule_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `event_schedule_items`
--
ALTER TABLE `event_schedule_items`
  ADD CONSTRAINT `fk_event_schedule_items_day` FOREIGN KEY (`day_id`) REFERENCES `event_schedule_days` (`day_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_schedule_items_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `event_schedules` (`schedule_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_schedule_items_track` FOREIGN KEY (`track_id`) REFERENCES `event_schedule_tracks` (`track_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `event_schedule_item_targets`
--
ALTER TABLE `event_schedule_item_targets`
  ADD CONSTRAINT `fk_event_schedule_item_targets_item` FOREIGN KEY (`item_id`) REFERENCES `event_schedule_items` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_schedule_item_targets_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `event_schedule_tracks`
--
ALTER TABLE `event_schedule_tracks`
  ADD CONSTRAINT `fk_event_schedule_tracks_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `event_schedules` (`schedule_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `event_team_slots`
--
ALTER TABLE `event_team_slots`
  ADD CONSTRAINT `fk_event_team_slots_decided_by` FOREIGN KEY (`decided_by_user_id`) REFERENCES `user_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_team_slots_replaced_by_team` FOREIGN KEY (`replaced_by_team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_team_slots_round` FOREIGN KEY (`participation_round_id`) REFERENCES `event_participation_rounds` (`participation_round_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_team_slots_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `event_winners`
--
ALTER TABLE `event_winners`
  ADD CONSTRAINT `fk_event_winners_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `user_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_winners_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `notify_announcements`
--
ALTER TABLE `notify_announcements`
  ADD CONSTRAINT `fk_notify_announcements_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `notify_announcement_targets`
--
ALTER TABLE `notify_announcement_targets`
  ADD CONSTRAINT `fk_notify_announcement_targets_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `notify_announcements` (`announcement_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notify_announcement_targets_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notify_audit_logs`
--
ALTER TABLE `notify_audit_logs`
  ADD CONSTRAINT `fk_notify_audit_logs_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notify_audit_logs_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `notify_announcements` (`announcement_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `notify_deliveries`
--
ALTER TABLE `notify_deliveries`
  ADD CONSTRAINT `fk_notify_deliveries_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `notify_announcements` (`announcement_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notify_deliveries_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notify_deliveries_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `notify_email_templates`
--
ALTER TABLE `notify_email_templates`
  ADD CONSTRAINT `fk_notify_email_templates_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `user_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `review_assignments`
--
ALTER TABLE `review_assignments`
  ADD CONSTRAINT `fk_review_assignments_assigned_by` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_assignments_reviewer` FOREIGN KEY (`reviewer_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_assignments_role` FOREIGN KEY (`reviewer_role_id`) REFERENCES `review_reviewer_roles` (`reviewer_role_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_assignments_submission` FOREIGN KEY (`submission_id`) REFERENCES `review_submissions` (`submission_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `review_audit_logs`
--
ALTER TABLE `review_audit_logs`
  ADD CONSTRAINT `fk_review_audit_logs_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_audit_logs_submission` FOREIGN KEY (`submission_id`) REFERENCES `review_submissions` (`submission_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_audit_logs_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `review_comments`
--
ALTER TABLE `review_comments`
  ADD CONSTRAINT `fk_review_comments_author` FOREIGN KEY (`author_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_comments_submission` FOREIGN KEY (`submission_id`) REFERENCES `review_submissions` (`submission_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `review_decisions`
--
ALTER TABLE `review_decisions`
  ADD CONSTRAINT `fk_review_decisions_decided_by` FOREIGN KEY (`decided_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_decisions_submission` FOREIGN KEY (`submission_id`) REFERENCES `review_submissions` (`submission_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `review_submissions`
--
ALTER TABLE `review_submissions`
  ADD CONSTRAINT `fk_review_submissions_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_submissions_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_submissions_verify_round` FOREIGN KEY (`verify_round_id`) REFERENCES `verify_review_rounds` (`verify_round_id`) ON UPDATE CASCADE;

--
-- Constraints for table `review_submission_members`
--
ALTER TABLE `review_submission_members`
  ADD CONSTRAINT `fk_review_submission_members_submission` FOREIGN KEY (`submission_id`) REFERENCES `review_submissions` (`submission_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_submission_members_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_submission_members_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `team_audit_logs`
--
ALTER TABLE `team_audit_logs`
  ADD CONSTRAINT `fk_team_audit_logs_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_team_audit_logs_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `team_invitations`
--
ALTER TABLE `team_invitations`
  ADD CONSTRAINT `fk_team_invitations_invited_by_user` FOREIGN KEY (`invited_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_team_invitations_invited_user` FOREIGN KEY (`invited_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_team_invitations_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `team_join_requests`
--
ALTER TABLE `team_join_requests`
  ADD CONSTRAINT `fk_team_join_requests_leader_action_by` FOREIGN KEY (`leader_action_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_team_join_requests_requester` FOREIGN KEY (`requester_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_team_join_requests_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `team_members`
--
ALTER TABLE `team_members`
  ADD CONSTRAINT `fk_team_members_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_team_members_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `team_teams`
--
ALTER TABLE `team_teams`
  ADD CONSTRAINT `fk_team_teams_leader_user` FOREIGN KEY (`current_leader_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `team_team_codes`
--
ALTER TABLE `team_team_codes`
  ADD CONSTRAINT `fk_team_team_codes_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_team_team_codes_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_consents`
--
ALTER TABLE `user_consents`
  ADD CONSTRAINT `fk_user_consents_doc` FOREIGN KEY (`consent_doc_id`) REFERENCES `user_consent_documents` (`consent_doc_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_user_consents_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_credentials_local`
--
ALTER TABLE `user_credentials_local`
  ADD CONSTRAINT `fk_user_credentials_local_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_identities`
--
ALTER TABLE `user_identities`
  ADD CONSTRAINT `fk_user_identities_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_privacy_settings`
--
ALTER TABLE `user_privacy_settings`
  ADD CONSTRAINT `fk_user_privacy_settings_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_public_profiles`
--
ALTER TABLE `user_public_profiles`
  ADD CONSTRAINT `fk_user_public_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_social_links`
--
ALTER TABLE `user_social_links`
  ADD CONSTRAINT `fk_user_social_links_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_sso_accounts`
--
ALTER TABLE `user_sso_accounts`
  ADD CONSTRAINT `fk_user_sso_accounts_provider` FOREIGN KEY (`provider_id`) REFERENCES `user_sso_providers` (`provider_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_user_sso_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `verify_audit_logs`
--
ALTER TABLE `verify_audit_logs`
  ADD CONSTRAINT `fk_verify_audit_logs_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_audit_logs_round` FOREIGN KEY (`verify_round_id`) REFERENCES `verify_review_rounds` (`verify_round_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_audit_logs_target_user` FOREIGN KEY (`target_user_id`) REFERENCES `user_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_audit_logs_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `verify_member_checks`
--
ALTER TABLE `verify_member_checks`
  ADD CONSTRAINT `fk_verify_member_checks_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `verify_requirements` (`requirement_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_checks_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_checks_round` FOREIGN KEY (`verify_round_id`) REFERENCES `verify_review_rounds` (`verify_round_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_checks_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_checks_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `verify_member_documents`
--
ALTER TABLE `verify_member_documents`
  ADD CONSTRAINT `fk_verify_member_documents_replaced_by` FOREIGN KEY (`replaced_by_document_id`) REFERENCES `verify_member_documents` (`document_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_documents_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `verify_requirements` (`requirement_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_documents_round` FOREIGN KEY (`verify_round_id`) REFERENCES `verify_review_rounds` (`verify_round_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_documents_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_documents_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_documents_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `verify_member_profiles`
--
ALTER TABLE `verify_member_profiles`
  ADD CONSTRAINT `fk_verify_member_profiles_round` FOREIGN KEY (`verify_round_id`) REFERENCES `verify_review_rounds` (`verify_round_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_profiles_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_member_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `verify_review_rounds`
--
ALTER TABLE `verify_review_rounds`
  ADD CONSTRAINT `fk_verify_review_rounds_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `user_users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_verify_review_rounds_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
