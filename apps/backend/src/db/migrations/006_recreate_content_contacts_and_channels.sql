-- 006_recreate_content_contacts_and_channels.sql
-- Purpose:
--   - DROP and recreate:
--       1) content_contacts
--       2) content_contact_channels
--   - Optional: migrate data from legacy table `content_contact` into the new tables.
--
-- Behavior:
--   - This script WILL DELETE (drop) existing new tables and all their data.
--   - It will NOT drop the legacy table `content_contact`.
--   - After recreating, it migrates from `content_contact` IF it exists.
--
-- Recommended usage:
--   - Run on dev/staging first.
--   - If running on production, ensure you have a DB backup.

START TRANSACTION;

-- Drop children first due to FK
DROP TABLE IF EXISTS content_contact_channels;
DROP TABLE IF EXISTS content_contacts;

-- ------------------------------------------------------------
-- 1) Create: content_contacts
-- ------------------------------------------------------------
CREATE TABLE content_contacts (
  contact_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of contact record',

  display_name_th VARCHAR(255) NOT NULL COMMENT 'Display name (Thai) shown on website',
  display_name_en VARCHAR(255) NOT NULL COMMENT 'Display name (English) shown on website',

  role_th VARCHAR(255) NULL COMMENT 'Role/title (Thai) (e.g., ผู้ประสานงาน)',
  role_en VARCHAR(255) NULL COMMENT 'Role/title (English) (e.g., Coordinator)',

  organization_th VARCHAR(255) NULL COMMENT 'Organization (Thai)',
  organization_en VARCHAR(255) NULL COMMENT 'Organization (English)',
  department_th VARCHAR(255) NULL COMMENT 'Department (Thai)',
  department_en VARCHAR(255) NULL COMMENT 'Department (English)',

  bio_th TEXT NULL COMMENT 'Short bio/notes (Thai) for contact block',
  bio_en TEXT NULL COMMENT 'Short bio/notes (English) for contact block',

  avatar_url VARCHAR(800) NULL COMMENT 'Public URL for avatar/profile image',
  avatar_alt_th VARCHAR(255) NULL COMMENT 'Avatar alt text (Thai)',
  avatar_alt_en VARCHAR(255) NULL COMMENT 'Avatar alt text (English)',

  is_featured TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Pin or highlight this contact',
  sort_order INT NOT NULL DEFAULT 0 COMMENT 'Sort order for display (lower first)',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this contact is visible on website',

  published_at DATETIME NULL COMMENT 'When this contact is published (optional scheduling)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  deleted_at DATETIME NULL COMMENT 'Soft delete timestamp (optional)',

  PRIMARY KEY (contact_id),
  KEY idx_content_contacts_enabled_sort (is_enabled, sort_order),
  KEY idx_content_contacts_featured (is_featured, sort_order),
  KEY idx_content_contacts_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Website contacts shown as blocks; admin-managed';

-- ------------------------------------------------------------
-- 2) Create: content_contact_channels
-- ------------------------------------------------------------
CREATE TABLE content_contact_channels (
  channel_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of contact channel',
  contact_id BIGINT UNSIGNED NOT NULL COMMENT 'FK to content_contacts.contact_id',

  channel_type VARCHAR(50) NOT NULL COMMENT 'Type: email|phone|line|facebook|instagram|linkedin|x|website|map|other',
  label_th VARCHAR(255) NULL COMMENT 'Label shown on UI (Thai)',
  label_en VARCHAR(255) NULL COMMENT 'Label shown on UI (English)',

  value VARCHAR(500) NOT NULL COMMENT 'Raw value เช่น email, phone number, line id',
  url VARCHAR(800) NULL COMMENT 'Clickable URL (mailto:, tel:, https://...)',

  is_primary TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Primary channel of this type',
  sort_order INT NOT NULL DEFAULT 0 COMMENT 'Order inside the contact block',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this channel is visible',

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',

  PRIMARY KEY (channel_id),
  KEY idx_contact_channels_contact (contact_id, is_enabled, sort_order),
  KEY idx_contact_channels_type (channel_type),
  CONSTRAINT fk_content_contact_channels_contact
    FOREIGN KEY (contact_id) REFERENCES content_contacts(contact_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Contact channels (flexible): email/phone/line/social links/etc.';

-- ------------------------------------------------------------
-- 3) Optional migration from legacy table: content_contact
-- ------------------------------------------------------------
SET @db := DATABASE();
SET @legacy_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='content_contact'
);

-- Migrate contacts (only if legacy exists)
SET @sql := IF(@legacy_exists=1, '
  INSERT INTO content_contacts (
    contact_id,
    display_name_th, display_name_en,
    role_th, role_en,
    sort_order, is_enabled,
    created_at, updated_at
  )
  SELECT
    contact_id,
    contact_name_th, contact_name_en,
    role_th, role_en,
    COALESCE(sort_order, 0), COALESCE(is_enabled, 1),
    COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(updated_at, CURRENT_TIMESTAMP)
  FROM content_contact;
', 'SELECT 1');

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Migrate channels
-- email
SET @sql := IF(@legacy_exists=1, '
  INSERT INTO content_contact_channels (contact_id, channel_type, label_th, label_en, value, url, sort_order, is_enabled)
  SELECT contact_id, ''email'', ''อีเมล'', ''Email'', email, CONCAT(''mailto:'', email), 10, COALESCE(is_enabled, 1)
  FROM content_contact
  WHERE email IS NOT NULL AND email <> '''';
', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- phone
SET @sql := IF(@legacy_exists=1, '
  INSERT INTO content_contact_channels (contact_id, channel_type, label_th, label_en, value, url, sort_order, is_enabled)
  SELECT contact_id, ''phone'', ''โทร'', ''Phone'', phone, CONCAT(''tel:'', phone), 20, COALESCE(is_enabled, 1)
  FROM content_contact
  WHERE phone IS NOT NULL AND phone <> '''';
', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- line
SET @sql := IF(@legacy_exists=1, '
  INSERT INTO content_contact_channels (contact_id, channel_type, label_th, label_en, value, url, sort_order, is_enabled)
  SELECT contact_id, ''line'', ''LINE'', ''LINE'', line_id, NULL, 30, COALESCE(is_enabled, 1)
  FROM content_contact
  WHERE line_id IS NOT NULL AND line_id <> '''';
', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- facebook
SET @sql := IF(@legacy_exists=1, '
  INSERT INTO content_contact_channels (contact_id, channel_type, label_th, label_en, value, url, sort_order, is_enabled)
  SELECT contact_id, ''facebook'', ''Facebook'', ''Facebook'', facebook_url, facebook_url, 40, COALESCE(is_enabled, 1)
  FROM content_contact
  WHERE facebook_url IS NOT NULL AND facebook_url <> '''';
', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- other_url
SET @sql := IF(@legacy_exists=1, '
  INSERT INTO content_contact_channels (contact_id, channel_type, label_th, label_en, value, url, sort_order, is_enabled)
  SELECT contact_id, ''other'', ''ลิงก์อื่น'', ''Other link'', other_url, other_url, 90, COALESCE(is_enabled, 1)
  FROM content_contact
  WHERE other_url IS NOT NULL AND other_url <> '''';
', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;
