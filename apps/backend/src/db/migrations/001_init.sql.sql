-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 19, 2026 at 11:47 PM
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
('EVENT_YEAR', '2026', 'ปีที่จัดงาน', 'Year of the event', '2026-02-19 17:06:12'),
('TEAM_MEMBER_MAX', '5', 'จำนวนสมาชิกสูงสุดต่อทีม', 'Maximum team members', '2026-02-19 04:18:59'),
('TEAM_MEMBER_MIN', '2', 'จำนวนสมาชิกขั้นต่ำต่อทีม', 'Minimum team members', '2026-02-19 04:18:59');

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
(1, 'PROFILE_COMPLETE', 'กรอกข้อมูลยืนยันตัวตนให้ครบ', 'Complete verification profile', 'profile', 1, 10, 1, '2026-02-19 04:19:13', '2026-02-19 04:19:13'),
(2, 'ID_CARD', 'แนบสำเนาบัตรประชาชน/บัตรที่ออกโดยรัฐ', 'Upload government-issued ID', 'document', 1, 20, 1, '2026-02-19 04:19:13', '2026-02-19 04:19:13'),
(3, 'STUDENT_CARD', 'แนบสำเนาบัตรนักศึกษา', 'Upload student card', 'document', 0, 30, 1, '2026-02-19 04:19:13', '2026-02-19 04:19:13');

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
-- Indexes for dumped tables
--

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
-- AUTO_INCREMENT for table `drive_audit_logs`
--
ALTER TABLE `drive_audit_logs`
  MODIFY `drive_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of drive audit log entry';

--
-- AUTO_INCREMENT for table `drive_files`
--
ALTER TABLE `drive_files`
  MODIFY `file_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of file record';

--
-- AUTO_INCREMENT for table `drive_folders`
--
ALTER TABLE `drive_folders`
  MODIFY `folder_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of folder';

--
-- AUTO_INCREMENT for table `event_audit_logs`
--
ALTER TABLE `event_audit_logs`
  MODIFY `event_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of event audit log entry';

--
-- AUTO_INCREMENT for table `event_member_confirmations`
--
ALTER TABLE `event_member_confirmations`
  MODIFY `member_confirmation_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of member attendance confirmation';

--
-- AUTO_INCREMENT for table `event_participation_rounds`
--
ALTER TABLE `event_participation_rounds`
  MODIFY `participation_round_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of participation round';

--
-- AUTO_INCREMENT for table `event_team_slots`
--
ALTER TABLE `event_team_slots`
  MODIFY `team_slot_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team slot record';

--
-- AUTO_INCREMENT for table `notify_announcements`
--
ALTER TABLE `notify_announcements`
  MODIFY `announcement_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of announcement';

--
-- AUTO_INCREMENT for table `notify_announcement_targets`
--
ALTER TABLE `notify_announcement_targets`
  MODIFY `target_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of announcement target';

--
-- AUTO_INCREMENT for table `notify_audit_logs`
--
ALTER TABLE `notify_audit_logs`
  MODIFY `notify_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of notify audit log entry';

--
-- AUTO_INCREMENT for table `notify_deliveries`
--
ALTER TABLE `notify_deliveries`
  MODIFY `delivery_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of notification delivery';

--
-- AUTO_INCREMENT for table `review_assignments`
--
ALTER TABLE `review_assignments`
  MODIFY `assignment_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of assignment';

--
-- AUTO_INCREMENT for table `review_audit_logs`
--
ALTER TABLE `review_audit_logs`
  MODIFY `review_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of review audit log entry';

--
-- AUTO_INCREMENT for table `review_comments`
--
ALTER TABLE `review_comments`
  MODIFY `comment_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of review comment';

--
-- AUTO_INCREMENT for table `review_decisions`
--
ALTER TABLE `review_decisions`
  MODIFY `decision_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of review decision';

--
-- AUTO_INCREMENT for table `review_reviewer_roles`
--
ALTER TABLE `review_reviewer_roles`
  MODIFY `reviewer_role_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of reviewer role';

--
-- AUTO_INCREMENT for table `review_submissions`
--
ALTER TABLE `review_submissions`
  MODIFY `submission_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of review submission';

--
-- AUTO_INCREMENT for table `review_submission_members`
--
ALTER TABLE `review_submission_members`
  MODIFY `submission_member_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of submission member snapshot';

--
-- AUTO_INCREMENT for table `team_audit_logs`
--
ALTER TABLE `team_audit_logs`
  MODIFY `team_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team audit log entry';

--
-- AUTO_INCREMENT for table `team_invitations`
--
ALTER TABLE `team_invitations`
  MODIFY `invitation_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of invitation';

--
-- AUTO_INCREMENT for table `team_join_requests`
--
ALTER TABLE `team_join_requests`
  MODIFY `join_request_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of join request';

--
-- AUTO_INCREMENT for table `team_members`
--
ALTER TABLE `team_members`
  MODIFY `team_member_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team member record';

--
-- AUTO_INCREMENT for table `team_teams`
--
ALTER TABLE `team_teams`
  MODIFY `team_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team';

--
-- AUTO_INCREMENT for table `team_team_codes`
--
ALTER TABLE `team_team_codes`
  MODIFY `team_code_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of team code record';

--
-- AUTO_INCREMENT for table `user_consents`
--
ALTER TABLE `user_consents`
  MODIFY `user_consent_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of user consent record';

--
-- AUTO_INCREMENT for table `user_consent_documents`
--
ALTER TABLE `user_consent_documents`
  MODIFY `consent_doc_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of consent document version';

--
-- AUTO_INCREMENT for table `user_credentials_local`
--
ALTER TABLE `user_credentials_local`
  MODIFY `cred_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of local credentials record';

--
-- AUTO_INCREMENT for table `user_identities`
--
ALTER TABLE `user_identities`
  MODIFY `identity_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of identity record';

--
-- AUTO_INCREMENT for table `user_social_links`
--
ALTER TABLE `user_social_links`
  MODIFY `social_link_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of social link record';

--
-- AUTO_INCREMENT for table `user_sso_accounts`
--
ALTER TABLE `user_sso_accounts`
  MODIFY `sso_account_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of SSO account mapping';

--
-- AUTO_INCREMENT for table `user_sso_providers`
--
ALTER TABLE `user_sso_providers`
  MODIFY `provider_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of SSO provider';

--
-- AUTO_INCREMENT for table `user_users`
--
ALTER TABLE `user_users`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of user';

--
-- AUTO_INCREMENT for table `verify_audit_logs`
--
ALTER TABLE `verify_audit_logs`
  MODIFY `verify_audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of verify audit log entry';

--
-- AUTO_INCREMENT for table `verify_member_checks`
--
ALTER TABLE `verify_member_checks`
  MODIFY `check_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of verification check record';

--
-- AUTO_INCREMENT for table `verify_member_documents`
--
ALTER TABLE `verify_member_documents`
  MODIFY `document_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of uploaded document record';

--
-- AUTO_INCREMENT for table `verify_member_profiles`
--
ALTER TABLE `verify_member_profiles`
  MODIFY `verify_profile_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of member verification profile';

--
-- AUTO_INCREMENT for table `verify_requirements`
--
ALTER TABLE `verify_requirements`
  MODIFY `requirement_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of verification requirement', AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `verify_review_rounds`
--
ALTER TABLE `verify_review_rounds`
  MODIFY `verify_round_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of verification round';

--
-- Constraints for dumped tables
--

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
-- Constraints for table `event_team_slots`
--
ALTER TABLE `event_team_slots`
  ADD CONSTRAINT `fk_event_team_slots_decided_by` FOREIGN KEY (`decided_by_user_id`) REFERENCES `user_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_team_slots_replaced_by_team` FOREIGN KEY (`replaced_by_team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_team_slots_round` FOREIGN KEY (`participation_round_id`) REFERENCES `event_participation_rounds` (`participation_round_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_team_slots_team` FOREIGN KEY (`team_id`) REFERENCES `team_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
