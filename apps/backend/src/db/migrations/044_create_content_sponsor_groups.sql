CREATE TABLE `content_sponsor_groups` (
  `sponsor_group_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Primary key of sponsor group',
  `group_code` varchar(80) NOT NULL COMMENT 'Stable group code',
  `group_name_th` varchar(255) NOT NULL COMMENT 'Group name (Thai)',
  `group_name_en` varchar(255) NOT NULL COMMENT 'Group name (English)',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Sort order for display (lower first)',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether group is visible on website',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Created timestamp',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Updated timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sponsor grouping for website display';

ALTER TABLE `content_sponsor_groups`
  ADD PRIMARY KEY (`sponsor_group_id`),
  ADD UNIQUE KEY `uk_content_sponsor_groups_code` (`group_code`),
  ADD KEY `idx_content_sponsor_groups_enabled_sort` (`is_enabled`,`sort_order`);

ALTER TABLE `content_sponsor_groups`
  MODIFY `sponsor_group_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

INSERT INTO `content_sponsor_groups` (`group_code`, `group_name_th`, `group_name_en`, `sort_order`, `is_enabled`)
VALUES
  ('technology_partner', 'ภาคีด้านเทคโนโลยีและนวัตกรรม', 'Technology Partner', 1, 1),
  ('mentorship_partner', 'ภาคีด้านการบ่มเพาะวิสาหกิจ', 'Mentorship Partner', 2, 1);

ALTER TABLE `content_sponsors`
  ADD COLUMN `sponsor_group_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to content_sponsor_groups' AFTER `tier_name_en`;

ALTER TABLE `content_sponsors`
  ADD KEY `idx_content_sponsors_group` (`sponsor_group_id`),
  ADD CONSTRAINT `fk_content_sponsors_group`
    FOREIGN KEY (`sponsor_group_id`) REFERENCES `content_sponsor_groups` (`sponsor_group_id`)
    ON UPDATE CASCADE ON DELETE SET NULL;

UPDATE `content_sponsors`
SET `sponsor_group_id` = (
  SELECT `sponsor_group_id`
  FROM `content_sponsor_groups`
  WHERE `group_code` = 'technology_partner'
  LIMIT 1
)
WHERE `sponsor_group_id` IS NULL;
